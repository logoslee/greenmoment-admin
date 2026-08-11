// rawRows: readTabularFile_() 결과 (rawRows[0]가 헤더 행)
// source: SOURCE.GMAIL / SOURCE.KAKAO / SOURCE.PLATFORM
// identifier: 원본식별자로 남길 값 (메일ID, 파일명 등)
// 반환값: 실제로 추가한 행 수
function normalizeAndAppendOrders_(source, identifier, rawRows) {
  if (!rawRows || rawRows.length < 2) return 0;

  var rawHeader = rawRows[0];
  var columnMap = getColumnMap_(source);
  var unmapped = [];

  // 표준필드명 -> 원본 컬럼 인덱스 배열. 여러 원본 컬럼이 같은 표준필드(예: 비고)로 매핑되면
  // 나중 값이 앞 값을 덮어쓰지 않도록 전부 모아뒀다가 " / "로 이어붙인다.
  var fieldIndexes = {};
  rawHeader.forEach(function (col, idx) {
    var key = String(col).trim();
    var standardField = columnMap[key];
    if (standardField) {
      if (!fieldIndexes[standardField]) fieldIndexes[standardField] = [];
      fieldIndexes[standardField].push(idx);
    } else if (key !== '') {
      unmapped.push(key);
    }
  });

  if (unmapped.length > 0) {
    Logger.log('[' + source + '] 컬럼매핑 시트에 등록되지 않은 컬럼(무시됨): ' + unmapped.join(', '));
  }

  var now = new Date();
  var outRows = [];
  for (var r = 1; r < rawRows.length; r++) {
    var row = rawRows[r];
    if (row.every(function (v) { return v === '' || v === null; })) continue;

    var record = {};
    ORDER_HEADERS.forEach(function (field) {
      record[field] = '';
    });
    record['수집일시'] = now;
    record['소스'] = source;
    record['원본식별자'] = identifier;

    Object.keys(fieldIndexes).forEach(function (field) {
      if (ORDER_HEADERS.indexOf(field) === -1) return;
      var values = fieldIndexes[field]
        .map(function (idx) { return row[idx]; })
        .filter(function (v) { return v !== '' && v !== null && v !== undefined; });
      record[field] = values.join(' / ');
    });

    outRows.push(ORDER_HEADERS.map(function (h) { return record[h]; }));
  }

  if (outRows.length === 0) return 0;

  var sheetName = source === SOURCE.GMAIL ? SHEET.ORDERS_GMAIL :
    source === SOURCE.KAKAO ? SHEET.ORDERS_KAKAO : SHEET.ORDERS_PLATFORM;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  sheet.getRange(sheet.getLastRow() + 1, 1, outRows.length, ORDER_HEADERS.length).setValues(outRows);
  return outRows.length;
}
