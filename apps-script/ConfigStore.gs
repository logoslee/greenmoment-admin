// 시트에 헤더만 있고 데이터 행이 없을 때 getRange(2,1,0,...)로 예외가 나는 것을 막는 공용 헬퍼
function getDataRows_(sheet, numCols) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, numCols).getValues();
}

function getConfig_(key) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.CONFIG);
  var data = getDataRows_(sheet, 2);
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return '';
}

function setConfig_(key, value) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.CONFIG);
  var data = getDataRows_(sheet, 1);
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 2, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value, '']);
}

// 설정 시트에 폴더 ID 대신 전체 URL을 붙여넣은 경우까지 대비해서 ID만 뽑아낸다.
// "id?hl=ko"처럼 /folders/ 접두사 없이 쿼리스트링(?...)이나 해시(#...)만 딸려온 경우도 잘라낸다.
function extractFolderId_(raw) {
  var value = String(raw || '').trim();
  var m = value.match(/\/folders\/([a-zA-Z0-9_-]+)/) || value.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  var id = m ? m[1] : value;
  return id.split('?')[0].split('#')[0].trim();
}

// DriveApp.getFolderById가 잘못된/빈 ID에 대해 알아보기 힘든 에러를 던지는 것을 대비해
// 어느 설정값이 문제인지 알 수 있는 한국어 에러로 바꿔준다.
function getFolderSafe_(rawId, configKeyLabel) {
  var id = extractFolderId_(rawId);
  if (!id) return null;
  try {
    return DriveApp.getFolderById(id);
  } catch (e) {
    throw new Error(
      '설정 시트의 "' + configKeyLabel + '" 값(' + id + ')으로 드라이브 폴더를 열 수 없습니다. ' +
      '폴더 URL 전체가 아니라 " /folders/ " 뒤에 오는 ID만 들어있는지, 그 폴더에 접근 권한이 있는지 확인해주세요. (원본 오류: ' + e.message + ')'
    );
  }
}

// [키, 원본컬럼명, 대상컬럼명] 3열 구조의 매핑 시트에서 특정 키의 매핑만 객체로 반환.
// 컬럼매핑/택배사매핑/업로드양식매핑 시트가 전부 이 구조라 공용으로 쓴다.
function getKeyedColumnMap_(sheetName, key) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var data = getDataRows_(sheet, 3);
  var map = {};
  data.forEach(function (row) {
    if (row[0] === key && row[1] !== '') {
      map[String(row[1]).trim()] = String(row[2]).trim();
    }
  });
  return map;
}

// 컬럼매핑 시트에서 특정 소스의 "원본컬럼명 -> 표준필드명" 매핑을 객체로 반환
function getColumnMap_(source) {
  return getKeyedColumnMap_(SHEET.COLUMN_MAP, source);
}
