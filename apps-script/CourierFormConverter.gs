// 택배사마다 다른 원본 엑셀을 "어드민 양식"(ADMIN_FORM_HEADERS)으로 변환해 업로드 폴더에 저장한다.
// 파일명이 "택배사이름_아무거나.xlsx" 형식이면 그 택배사 매핑을 쓰고, 아니거나 매핑을 못 찾으면
// 설정 시트의 COURIER_DEFAULT_SOURCE로 시도한다. 즉 택배사가 하나뿐이면 파일명을 아무렇게나 지어도 된다.
function convertCourierFiles() {
  var sourceFolderId = getConfig_(CONFIG_KEYS.COURIER_SOURCE_FOLDER_ID);
  var doneFolderId = getConfig_(CONFIG_KEYS.COURIER_DONE_FOLDER_ID);
  var outputFolderId = getConfig_(CONFIG_KEYS.COURIER_OUTPUT_FOLDER_ID);
  if (!extractFolderId_(sourceFolderId) || !extractFolderId_(outputFolderId)) {
    SpreadsheetApp.getUi().alert('설정 시트에 COURIER_SOURCE_FOLDER_ID / COURIER_OUTPUT_FOLDER_ID를 먼저 채워주세요.');
    return;
  }

  var sourceFolder = getFolderSafe_(sourceFolderId, 'COURIER_SOURCE_FOLDER_ID');
  var doneFolder = doneFolderId ? getFolderSafe_(doneFolderId, 'COURIER_DONE_FOLDER_ID') : null;
  var outputFolder = getFolderSafe_(outputFolderId, 'COURIER_OUTPUT_FOLDER_ID');

  var files = sourceFolder.getFiles();
  var convertedCount = 0;
  var skipped = [];
  while (files.hasNext()) {
    var file = files.next();
    try {
      var resolved = resolveSourceAndMap_(file.getName(), SHEET.COURIER_MAP, CONFIG_KEYS.COURIER_DEFAULT_SOURCE);
      if (!resolved) {
        Logger.log('컬럼매핑을 찾지 못했습니다 (택배사매핑 시트 또는 COURIER_DEFAULT_SOURCE 설정을 확인하세요): ' + file.getName());
        skipped.push(file.getName());
        continue;
      }

      var rows = readTabularFile_(file);
      var outputRows = mapRowsToHeaders_(rows, resolved.columnMap, ADMIN_FORM_HEADERS);
      if (outputRows.length === 0) {
        Logger.log('[' + resolved.source + '] 변환할 데이터가 없습니다: ' + file.getName());
        skipped.push(file.getName());
        continue;
      }

      var outputName = file.getName().replace(/\.[^.]+$/, '') + '_어드민양식.xlsx';
      writeXlsxFile_(outputFolder, outputName, ADMIN_FORM_HEADERS, outputRows);
      convertedCount++;

      if (doneFolder) {
        doneFolder.addFile(file);
        sourceFolder.removeFile(file);
      }
    } catch (e) {
      Logger.log('택배양식 변환 실패 (' + file.getName() + '): ' + e.message);
      skipped.push(file.getName());
    }
  }

  var message = convertedCount + '개 파일을 어드민 양식으로 변환했습니다.';
  if (skipped.length > 0) message += ' (건너뜀 ' + skipped.length + '개: ' + skipped.join(', ') + ')';
  SpreadsheetApp.getActiveSpreadsheet().toast(message, '택배양식 변환', 8);
}

// "키이름_아무거나.xlsx" 형식의 파일명에서 밑줄 앞부분(키)을 추출. 매핑 못 찾으면 null.
function extractPrefixKey_(fileName) {
  var base = fileName.replace(/\.[^.]+$/, '');
  var idx = base.indexOf('_');
  if (idx === -1) return null;
  return base.substring(0, idx).trim();
}
