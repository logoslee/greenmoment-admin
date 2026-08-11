// 구글 드라이브 파일(csv 또는 구글시트로 변환된 엑셀)을 2차원 배열로 읽어온다.
// 원본 .xlsx가 그대로 업로드된 경우, 드라이브 설정에서
// "업로드한 파일을 Google 문서 편집기 형식으로 변환"을 켜두면 자동으로 구글시트로 저장되어 이 함수가 바로 처리 가능하다.
function readTabularFile_(file) {
  var mime = file.getMimeType();

  if (mime === MimeType.GOOGLE_SHEETS) {
    var ss = SpreadsheetApp.openById(file.getId());
    return ss.getSheets()[0].getDataRange().getValues();
  }

  if (mime === MimeType.CSV || mime === 'text/csv' || mime === 'text/plain') {
    var text = file.getBlob().getDataAsString('UTF-8');
    return Utilities.parseCsv(text);
  }

  throw new Error(
    '지원하지 않는 파일 형식입니다 (' + mime + ', 파일명: ' + file.getName() + '). ' +
    'CSV로 내려받거나, 드라이브 업로드 설정에서 엑셀을 자동으로 Google 시트로 변환하도록 설정해주세요.'
  );
}

// Gmail 첨부파일처럼 Drive에 아직 올라가지 않은 Blob을 읽을 때 사용.
// csv/텍스트는 바로 파싱하고, xlsx 등 바이너리는 임시로 Google 시트로 변환한 뒤 읽고 즉시 삭제한다.
// xlsx 변환에는 Apps Script 고급 서비스 "Drive API"(v2)를 켜두어야 한다 (SETUP.md 참고).
function readTabularBlob_(blob) {
  var contentType = blob.getContentType();

  if (contentType === 'text/csv' || contentType === 'text/plain') {
    return Utilities.parseCsv(blob.getDataAsString('UTF-8'));
  }

  var tempFile = Drive.Files.insert(
    { title: 'tmp_import_' + new Date().getTime(), mimeType: MimeType.GOOGLE_SHEETS },
    blob
  );
  try {
    var ss = SpreadsheetApp.openById(tempFile.id);
    return ss.getSheets()[0].getDataRange().getValues();
  } finally {
    DriveApp.getFileById(tempFile.id).setTrashed(true);
  }
}

// 파일명 접두사("소스이름_아무거나.xlsx")로 매핑을 찾되, 접두사가 없거나 매핑이 등록 안 된
// 이름이면 설정 시트에 지정한 기본 소스로 대신 시도한다. 소스가 하나뿐이면 파일명 규칙을
// 안 지켜도 되게 하기 위한 안전장치. 매핑을 하나도 못 찾으면 null을 반환한다.
function resolveSourceAndMap_(fileName, mapSheetName, defaultSourceConfigKey) {
  var candidates = [];
  var prefixKey = extractPrefixKey_(fileName);
  if (prefixKey) candidates.push(prefixKey);
  var defaultSource = getConfig_(defaultSourceConfigKey);
  if (defaultSource && candidates.indexOf(defaultSource) === -1) candidates.push(defaultSource);

  for (var i = 0; i < candidates.length; i++) {
    var map = getKeyedColumnMap_(mapSheetName, candidates[i]);
    if (Object.keys(map).length > 0) {
      return { source: candidates[i], columnMap: map };
    }
  }
  return null;
}

// rawRows(readTabularFile_ 결과)를 columnMap({원본컬럼명: 대상컬럼명})에 따라 targetHeaders
// 순서의 행들로 재배열한다. 매핑 안 된 대상 컬럼은 빈 값으로 채운다.
// 완전히 빈 원본 행은 건너뛴다. 카카오톡→관리자업로드양식, 택배사→어드민양식 변환에서 공용으로 쓴다.
function mapRowsToHeaders_(rawRows, columnMap, targetHeaders) {
  if (!rawRows || rawRows.length < 2) return [];

  var rawHeader = rawRows[0];
  var fieldIndex = {};
  rawHeader.forEach(function (col, idx) {
    var key = String(col).trim();
    var target = columnMap[key];
    if (target) fieldIndex[target] = idx;
  });

  var outRows = [];
  for (var r = 1; r < rawRows.length; r++) {
    var row = rawRows[r];
    if (row.every(function (v) { return v === '' || v === null; })) continue;
    outRows.push(targetHeaders.map(function (field) {
      return fieldIndex.hasOwnProperty(field) ? row[fieldIndex[field]] : '';
    }));
  }
  return outRows;
}

// headers+dataRows를 실제 .xlsx 파일로 만들어 지정 드라이브 폴더에 저장한다
// (임시 구글시트를 만들어 xlsx로 내보낸 뒤 그 임시 시트는 삭제).
function writeXlsxFile_(outputFolder, fileName, headers, dataRows) {
  var tempSs = SpreadsheetApp.create('tmp_' + fileName);
  try {
    var sheet = tempSs.getSheets()[0];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(2, 1, dataRows.length, headers.length).setValues(dataRows);
    SpreadsheetApp.flush();

    var url = 'https://docs.google.com/spreadsheets/d/' + tempSs.getId() + '/export?format=xlsx';
    var response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
    });
    var blob = response.getBlob().setName(fileName);
    outputFolder.createFile(blob);
  } finally {
    DriveApp.getFileById(tempSs.getId()).setTrashed(true);
  }
}
