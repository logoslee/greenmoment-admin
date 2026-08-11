// 전체 워크북을 처음 구성할 때 1회 실행 (메뉴: 재고분석 > 초기 시트 생성)
// 이미 만들어진 시트/헤더는 건드리지 않고, 없는 것만 채워 넣는 방식(멱등)으로 동작함
var MAX_ROWS = 5000;

function initializeWorkbook() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  ensureHeaderSheet_(ss, SHEET.CONFIG, CONFIG_HEADERS);
  seedConfigDefaults_(ss);

  ensureHeaderSheet_(ss, SHEET.COLUMN_MAP, COLUMN_MAP_HEADERS);
  seedColumnMapDefaults_(ss);

  ensureHeaderSheet_(ss, SHEET.COURIER_MAP, COURIER_MAP_HEADERS);
  seedCourierMapDefaults_(ss);

  ensureHeaderSheet_(ss, SHEET.PLATFORM_UPLOAD_MAP, PLATFORM_UPLOAD_MAP_HEADERS);
  seedPlatformUploadMapDefaults_(ss);

  ensureHeaderSheet_(ss, SHEET.ITEM_MASTER, ITEM_MASTER_HEADERS.concat(['매칭키']));
  seedItemMasterDefaults_(ss);
  setFormulaIfEmpty_(ss, SHEET.ITEM_MASTER, 'L2',
    '=ARRAYFORMULA(IF($B2:$B<>"", $B2:$B&"|"&$D2:$D, ))');

  ensureHeaderSheet_(ss, SHEET.REFUND_REASON, REFUND_REASON_HEADERS);
  ensureHeaderSheet_(ss, SHEET.INBOUND_RAW, INBOUND_RAW_HEADERS);
  ensureHeaderSheet_(ss, SHEET.INBOUND_BOX, INBOUND_BOX_HEADERS);
  ensureHeaderSheet_(ss, SHEET.BASELINE_RAW, BASELINE_RAW_HEADERS);
  ensureHeaderSheet_(ss, SHEET.BASELINE_BOX, BASELINE_BOX_HEADERS);

  ensureHeaderSheet_(ss, SHEET.ORDERS_GMAIL, ORDER_HEADERS);
  ensureHeaderSheet_(ss, SHEET.ORDERS_KAKAO, ORDER_HEADERS);
  ensureHeaderSheet_(ss, SHEET.ORDERS_PLATFORM, ORDER_HEADERS);

  ensureHeaderSheet_(ss, SHEET.ORDERS_ALL, ORDER_HEADERS);
  setFormulaIfEmpty_(ss, SHEET.ORDERS_ALL, 'A2',
    '=IFERROR(QUERY({' + SHEET.ORDERS_GMAIL + '!A2:M' + MAX_ROWS + ';' +
    SHEET.ORDERS_KAKAO + '!A2:M' + MAX_ROWS + ';' +
    SHEET.ORDERS_PLATFORM + '!A2:M' + MAX_ROWS +
    '},"select * where Col7 is not null",0),)');

  ensureHeaderSheet_(ss, SHEET.REFUNDS, REFUND_HEADERS.concat(['매칭키', '박스종류', '원물복구량', '박스복구량']));
  setFormulaIfEmpty_(ss, SHEET.REFUNDS, 'L2',
    '=ARRAYFORMULA(IF($D2:$D<>"", $D2:$D&"|"&$E2:$E, ))');
  setFormulaIfEmpty_(ss, SHEET.REFUNDS, 'M2',
    '=ARRAYFORMULA(IF($L2:$L<>"", IFERROR(INDEX(' + SHEET.ITEM_MASTER + '!$E$2:$E' + MAX_ROWS + ', MATCH($L2:$L, ' + SHEET.ITEM_MASTER + '!$L$2:$L' + MAX_ROWS + ', 0)), ), ))');
  setFormulaIfEmpty_(ss, SHEET.REFUNDS, 'N2',
    '=ARRAYFORMULA(IF($I2:$I="재사용", $F2:$F*IFERROR(INDEX(' + SHEET.ITEM_MASTER + '!$I$2:$I' + MAX_ROWS +
    ', MATCH($L2:$L, ' + SHEET.ITEM_MASTER + '!$L$2:$L' + MAX_ROWS + ', 0)), 0), 0))');
  setFormulaIfEmpty_(ss, SHEET.REFUNDS, 'O2',
    '=ARRAYFORMULA(IF($I2:$I="재사용", $F2:$F*IFERROR(INDEX(' + SHEET.ITEM_MASTER + '!$J$2:$J' + MAX_ROWS +
    ', MATCH($L2:$L, ' + SHEET.ITEM_MASTER + '!$L$2:$L' + MAX_ROWS + ', 0)), 0), 0))');

  ensureHeaderSheet_(ss, SHEET.ORDER_DETAIL_CALC,
    ORDER_HEADERS.concat(['매칭키', '박스종류', '원물사용량', '박스사용량', '매출액', '공급원가']));
  buildOrderDetailFormulas_(ss);

  ensureHeaderSheet_(ss, SHEET.STOCK_RAW, ['품목명', '기초재고량', '총입고량', '총판매사용량', '총CS환불원물복구량', '현재고']);
  buildRawStockFormulas_(ss);

  ensureHeaderSheet_(ss, SHEET.STOCK_BOX, ['박스종류', '기초재고량', '총입고량', '총판매사용량', '총CS환불박스복구량', '현재고']);
  buildBoxStockFormulas_(ss);

  ensureHeaderSheet_(ss, SHEET.PROFIT,
    ['품목명', '옵션명', '매칭키', '총판매수량', '총매출액', '총공급원가', 'CS환불비용', '순이익', '순이익률']);
  buildProfitFormulas_(ss);

  ensureHeaderSheet_(ss, SHEET.DASHBOARD, ['항목', '값']);

  ensureHeaderSheet_(ss, SHEET.WORKER_MASTER, WORKER_MASTER_HEADERS);
  ensureHeaderSheet_(ss, SHEET.ATTENDANCE, ATTENDANCE_HEADERS);
  buildLaborCalendarSheet_(ss);

  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert('초기 시트 생성이 완료되었습니다. 설정 시트와 품목마스터를 먼저 채워주세요.');
}

function ensureHeaderSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  var range = sheet.getRange(1, 1, 1, headers.length);
  var existing = range.getValues()[0];
  var isEmpty = existing.every(function (v) { return v === ''; });
  if (isEmpty) {
    range.setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

function setFormulaIfEmpty_(ss, sheetName, a1, formula) {
  var sheet = ss.getSheetByName(sheetName);
  var cell = sheet.getRange(a1);
  if (cell.getFormula() === '' && cell.getValue() === '') {
    cell.setFormula(formula);
  }
}

function seedConfigDefaults_(ss) {
  var sheet = ss.getSheetByName(SHEET.CONFIG);
  var existing = getDataRows_(sheet, 1).map(function (r) { return r[0]; });
  var defaults = [
    [CONFIG_KEYS.GMAIL_SEARCH_QUERY, 'label:발주 has:attachment newer_than:14d', 'Gmail에서 발주 메일을 찾는 검색어. Gmail 라벨/필터로 발주 메일에 "발주" 라벨을 걸어두는 것을 권장'],
    [CONFIG_KEYS.GMAIL_PROCESSED_LABEL, '발주처리완료', '한 번 처리한 메일에 붙여서 중복 수집을 막는 라벨명'],
    [CONFIG_KEYS.KAKAO_FOLDER_ID, '', '거래처 발주서 엑셀을 업로드할 구글드라이브 폴더 ID'],
    [CONFIG_KEYS.KAKAO_DONE_FOLDER_ID, '', '카카오톡 발주서 처리 완료 파일을 옮길 폴더 ID'],
    [CONFIG_KEYS.PLATFORM_FOLDER_ID, '', 'greenmoment에서 다운로드한 CSV/엑셀을 업로드할 폴더 ID'],
    [CONFIG_KEYS.PLATFORM_DONE_FOLDER_ID, '', '발주플랫폼 파일 처리 완료 후 옮길 폴더 ID'],
    [CONFIG_KEYS.REFRESH_INTERVAL_MINUTES, '15', '자동 수집 트리거 주기(분)'],
    [CONFIG_KEYS.COURIER_SOURCE_FOLDER_ID, '', '택배사별 원본 배송 파일을 올릴 폴더 ID (파일명 앞에 "택배사이름_"을 붙이면 그 택배사 매핑을 쓰고, 안 붙이면 COURIER_DEFAULT_SOURCE를 씀)'],
    [CONFIG_KEYS.COURIER_DONE_FOLDER_ID, '', '변환 완료된 원본 파일을 옮길 폴더 ID (선택)'],
    [CONFIG_KEYS.COURIER_OUTPUT_FOLDER_ID, '', '어드민 양식으로 변환된 결과 xlsx가 저장될 폴더 ID'],
    [CONFIG_KEYS.COURIER_DEFAULT_SOURCE, '예시택배사', '파일명에 "택배사이름_" 접두사가 없거나 못 찾을 때 대신 쓸 기본 택배사매핑 키'],
    [CONFIG_KEYS.PLATFORM_UPLOAD_SOURCE_FOLDER_ID, '', '관리자업로드양식으로 변환할 원본 파일을 올릴 폴더 ID (파일명 앞에 "소스이름_"을 붙이면 그 소스 매핑을 쓰고, 안 붙이면 PLATFORM_UPLOAD_DEFAULT_SOURCE를 씀)'],
    [CONFIG_KEYS.PLATFORM_UPLOAD_DONE_FOLDER_ID, '', '변환 완료된 원본 파일을 옮길 폴더 ID (선택)'],
    [CONFIG_KEYS.PLATFORM_UPLOAD_OUTPUT_FOLDER_ID, '', '관리자업로드양식으로 변환된 결과 xlsx가 저장될 폴더 ID'],
    [CONFIG_KEYS.PLATFORM_UPLOAD_DEFAULT_SOURCE, SOURCE.KAKAO, '파일명에 "소스이름_" 접두사가 없거나 못 찾을 때 대신 쓸 기본 업로드양식매핑 키']
  ];
  defaults.forEach(function (row) {
    if (existing.indexOf(row[0]) === -1) {
      sheet.appendRow(row);
    }
  });
}

// 실제 샘플 파일(카카오톡파일.xlsx, 메일발주.xlsx, 관리자페이지 파일.xlsx) 헤더를 근거로 채운 매핑.
// 세 파일 모두 "품목명" 칸에 옵션(중량/등급 등)이 함께 적혀있어 옵션명은 매핑하지 않고 품목명 전체를
// 그대로 키로 쓴다 - 품목마스터의 품목명도 반드시 이 전체 문자열과 똑같이 맞춰야 매칭된다.
// 주문 파일에 찍히는 "보내는사람/주문자" 등은 실제 매입 거래처와 다르다고 확인되어 거래처명으로
// 매핑하지 않고, 참고용으로 비고에만 남긴다. 거래처(매입처)는 품목마스터에서 품목 단위로 관리한다.
function seedColumnMapDefaults_(ss) {
  var sheet = ss.getSheetByName(SHEET.COLUMN_MAP);
  var existing = getDataRows_(sheet, 1).map(function (r) { return r[0]; });
  if (existing.length > 0) return;

  var rows = [
    [SOURCE.KAKAO, '주문번호', '주문번호'],
    [SOURCE.KAKAO, '상품명1', '품목명'],
    [SOURCE.KAKAO, '수량(소)', '수량'],
    [SOURCE.KAKAO, '받는사람', '비고'],
    [SOURCE.KAKAO, '보내는사람(지정)', '비고'],

    [SOURCE.GMAIL, '고객주문번호', '주문번호'],
    [SOURCE.GMAIL, '품목명', '품목명'],
    [SOURCE.GMAIL, '박스수량', '수량'],
    [SOURCE.GMAIL, '집하예정일', '주문일시'],
    [SOURCE.GMAIL, '받는분성명', '비고'],
    [SOURCE.GMAIL, '보내는분성명', '비고'],

    [SOURCE.PLATFORM, '상품주문번호', '주문번호'],
    [SOURCE.PLATFORM, '상품명', '품목명'],
    [SOURCE.PLATFORM, '수량', '수량'],
    [SOURCE.PLATFORM, '수령인', '비고'],
    [SOURCE.PLATFORM, '주문자', '비고']
  ];
  rows.forEach(function (row) { sheet.appendRow(row); });
}

// "상품공급가및매입가 (3).xlsx"(공급&매입가 시트, 764행)에 있던 실제 145개 품목을 미리 채워둔다.
// 그 시트는 품목마다 구분(매입가/기본공급가/그룹공급가/매출처별공급가) 여러 줄로 나뉘어 있는데,
// 판매단가는 매출처/그룹마다 다르게 책정돼 있어서(그룹공급가 290줄, 매출처별공급가 183줄) 여기서는
// 그룹/매출처 구분이 없는 "기본공급가"를 판매단가로 채택했다. 특정 매출처 마진을 정확히 보려면
// 나중에 주문 데이터에 매출처 정보가 있어야 그룹별/매출처별 공급가를 따로 반영할 수 있다.
// 품목코드로 이미 있는 행은 건너뛰어 재실행해도 중복 추가되지 않는다.
function seedItemMasterDefaults_(ss) {
  var sheet = ss.getSheetByName(SHEET.ITEM_MASTER);
  var existingCodes = getDataRows_(sheet, 1).map(function (r) { return String(r[0]); });

  // [품목코드, 품목명, 매입처명, 매입가(매입원가_단위당), 기본공급가(판매단가)]
  var items = [
    ['10000011', '강원도 감자 소+중 혼합 1KG', '평창유통', 3500, 4200],
    ['10000012', '강원도 감자 소+중 혼합 2KG', '평창유통', 4100, 4900],
    ['10000013', '강원도 감자 소+중 혼합 3KG', '평창유통', 4600, 5500],
    ['10000014', '강원도 감자 소+중 혼합 5KG', '평창유통', 5600, 6600],
    ['10000015', '강원도 감자 소+중 혼합 10KG', '평창유통', 8000, 9500],
    ['10000016', '강원도 감자_중 1KG', '평창유통', 3600, 4300],
    ['10000017', '강원도 감자_중 2KG', '평창유통', 4200, 5000],
    ['10000018', '강원도 감자_중 3KG', '평창유통', 5000, 5900],
    ['10000019', '강원도 감자_중 5KG', '평창유통', 6000, 7100],
    ['10000020', '강원도 감자_중 10KG', '평창유통', 9000, 10600],
    ['10000021', '강원도 감자_대 1KG', '평창유통', 4000, 4800],
    ['10000022', '강원도 감자_대 2KG', '평창유통', 4700, 5600],
    ['10000023', '강원도 감자_대 3KG', '평창유통', 5600, 6600],
    ['10000024', '강원도 감자_대 5KG', '평창유통', 7100, 8400],
    ['10000025', '강원도 감자_대 10KG', '평창유통', 11200, 13200],
    ['10000026', '강원도 감자_특 1KG', '평창유통', 4000, 4800],
    ['10000027', '강원도 감자_특 2KG', '평창유통', 5100, 6000],
    ['10000028', '강원도 감자_특 3KG', '평창유통', 6400, 7600],
    ['10000029', '강원도 감자_특 5KG', '평창유통', 8300, 9800],
    ['10000030', '강원도 감자_특 10KG', '평창유통', 13500, 15900],
    ['10000031', '강원도 감자_왕특 1KG', '평창유통', 4500, 5300],
    ['10000032', '강원도 감자_왕특 2KG', '평창유통', 6000, 7100],
    ['10000033', '강원도 감자_왕특 3KG', '평창유통', 7900, 9300],
    ['10000034', '강원도 감자_왕특 5KG', '평창유통', 10600, 12500],
    ['10000035', '강원도 감자_왕특 10KG', '평창유통', 18000, 21200],
    ['10000334', '★[고당도 가정용] 성주 참외 혼합 (랜덤) 1kg', '주식회사 팜월드', 4300, 4700],
    ['10000335', '★[고당도 가정용] 성주 참외 혼합 (랜덤) 2kg', '주식회사 팜월드', 4900, 5300],
    ['10000336', '★[고당도 가정용] 성주 참외 혼합 (랜덤) 3kg', '주식회사 팜월드', 5700, 6200],
    ['10000337', '★[고당도 가정용] 성주 참외 혼합 (랜덤) 5kg', '주식회사 팜월드', 7200, 7800],
    ['10000338', '★[고당도 가정용] 성주 참외 소과 (10-14과 내외) 2kg', '주식회사 팜월드', 5300, 5800],
    ['10000339', '★[고당도 가정용] 성주 참외 중소과 (7-10과 내외) 2kg', '주식회사 팜월드', 5600, 6100],
    ['10000340', '★[고당도 가정용] 성주 참외 중대과 (4-7과 내외) 2kg', '주식회사 팜월드', 5300, 5800],
    ['10000341', '★[고당도 가정용] 성주 참외 소과 (15-21과 내외) 3kg', '주식회사 팜월드', 6300, 6900],
    ['10000342', '★[고당도 가정용] 성주 참외 중소과 (10-15과 내외) 3kg', '주식회사 팜월드', 6600, 7200],
    ['10000343', '★[고당도 가정용] 성주 참외 중대과 (6-11과 내외) 3kg', '주식회사 팜월드', 6300, 6900],
    ['10000344', '★[고당도 가정용] 성주 참외 소과 (25-35과 내외) 5kg', '주식회사 팜월드', 8100, 8800],
    ['10000345', '★[고당도 가정용] 성주 참외 중소과 (18-25과 내외) 5kg', '주식회사 팜월드', 8700, 9500],
    ['10000346', '★[고당도 가정용] 성주 참외 중대과 (9-18과 내외) 5kg', '주식회사 팜월드', 8100, 8800],
    ['10000347', '★[고당도 정품] 성주 참외 중과 (9-12과 내외) 3kg (개별망)', '주식회사 팜월드', 9600, 10400],
    ['10000348', '★[고당도 정품] 성주 참외 대과 (6-9과 내외) 3kg (개별망)', '주식회사 팜월드', 8900, 9700],
    ['10000349', '★[고당도 정품] 성주 참외 중과 (15-20과 내외) 5kg (개별망)', '주식회사 팜월드', 13600, 14800],
    ['10000350', '★[고당도 정품] 성주 참외 대과 (9-15과 내외) 5kg (개별망)', '주식회사 팜월드', 12400, 13500],
    ['10000352', '★[고당도 정품] 성주 참외 대과 (21-30과 내외) 10kg (개별망)', '주식회사 팜월드', 21200, 23000],
    ['10000353', '★[고당도 정품] 성주 참외 중과 (31-41과 내외) 10kg (개별망)', '주식회사 팜월드', 23600, 25600],
    ['10000354', '★[고당도 가정용] 성주 참외 소과 (50-70과 내외) 10kg', '주식회사 팜월드', 12700, 13800],
    ['10000355', '★[고당도 가정용] 성주 참외 중소과 (36-50과 내외) 10kg', '주식회사 팜월드', 13800, 15000],
    ['10000356', '★[고당도 가정용] 성주 참외 중대과 (18-36과 내외) 10kg', '주식회사 팜월드', 12700, 13800],
    ['10000357', '★[고당도 가정용] 성주 참외 혼합 (랜덤) 10kg', '주식회사 팜월드', 10500, 11400],
    ['10000372', '★[고당도] 성주 참외 꼬마 (~10과) 1kg', '주식회사 팜월드', 4300, 4700],
    ['10000373', '★[고당도] 성주 참외 꼬마 (~20과) 2kg', '주식회사 팜월드', 4900, 5300],
    ['10000374', '★[고당도] 성주 참외 꼬마 (~30과) 3kg', '주식회사 팜월드', 5700, 6200],
    ['10000375', '★[고당도] 성주 참외 꼬마 (~50과) 5kg', '주식회사 팜월드', 7200, 7800],
    ['10000376', '★[고당도] 성주 참외 꼬마 (~100과) 10kg', '주식회사 팜월드', 10500, 11400],
    ['10000546', '레드 대추방울 토마토 500g(강원도)', '자체공급', 6500, 7000],
    ['10000547', '레드 대추 방울토마토 1kg(강원도)', '자체공급', 7000, 7700],
    ['10000548', '레드 대추 방울토마토 2kg(강원도)', '자체공급', 10000, 11000],
    ['10000607', '햇 홍감자 중_2KG', '농업회사법인 주식회사 그린모먼트', 4720, 5900],
    ['10000608', '햇 홍감자 중_3KG', '농업회사법인 주식회사 그린모먼트', 6020, 7500],
    ['10000609', '햇 홍감자 중_5KG', '농업회사법인 주식회사 그린모먼트', 8900, 10200],
    ['10000610', '햇 홍감자 중_10KG', '농업회사법인 주식회사 그린모먼트', 16100, 17100],
    ['10000612', '햇 홍감자 대_2KG', '농업회사법인 주식회사 그린모먼트', 4720, 6700],
    ['10000613', '햇 홍감자 대_3KG', '농업회사법인 주식회사 그린모먼트', 6020, 8700],
    ['10000614', '햇 홍감자 대_5KG', '농업회사법인 주식회사 그린모먼트', 8900, 12400],
    ['10000615', '햇 홍감자 대_10KG', '농업회사법인 주식회사 그린모먼트', 16100, 21600],
    ['10000617', '햇 홍감자 특_2KG', '농업회사법인 주식회사 그린모먼트', 4720, 8000],
    ['10000618', '햇 홍감자 특_3KG', '농업회사법인 주식회사 그린모먼트', 6020, 10700],
    ['10000619', '햇 홍감자 특_5KG', '농업회사법인 주식회사 그린모먼트', 8900, 15500],
    ['10000620', '햇 홍감자 특_10KG', '농업회사법인 주식회사 그린모먼트', 16100, 28400],
    ['10000622', '햇 홍감자 왕특_2KG', '농업회사법인 주식회사 그린모먼트', 4720, 8900],
    ['10000623', '햇 홍감자 왕특_3KG', '농업회사법인 주식회사 그린모먼트', 6020, 12100],
    ['10000624', '햇 홍감자 왕특_5KG', '농업회사법인 주식회사 그린모먼트', 8900, 18000],
    ['10000625', '햇 홍감자 왕특_10KG', '농업회사법인 주식회사 그린모먼트', 16100, 28400],
    ['10000723', '제주 미니 단호박 못난이 9kg', '마이제주', 15400, 16400],
    ['10000724', '제주 미니 단호박 못난이 5kg', '마이제주', 10000, 10900],
    ['10000725', '제주 미니 단호박 못난이 4.5kg', '마이제주', 9450, 10400],
    ['10000726', '제주 미니 단호박 못난이 3kg', '마이제주', 7800, 8500],
    ['10000727', '제주 미니 단호박 못난이 2.5kg', '마이제주', 7250, 8000],
    ['10000728', '제주 미니 단호박 못난이 1.5kg', '마이제주', 5850, 6600],
    ['10000741', '제주 미니 단호박 못난이 1kg', '마이제주', 5300, 5500],
    ['10000742', '제주 미니 단호박 9kg 15~40수', '마이제주', 19900, 19900],
    ['10000743', '제주 미니 단호박 5kg', '마이제주', 12500, 12500],
    ['10000744', '햇 홍감자 소_2kg', '농업회사법인 주식회사 그린모먼트', 5400, 5700],
    ['10000745', '햇 홍감자 소_3kg', '농업회사법인 주식회사 그린모먼트', 6900, 7300],
    ['10000746', '햇 홍감자 소_5kg', '농업회사법인 주식회사 그린모먼트', 9000, 9400],
    ['10000747', '햇 홍감자 소_10kg', '농업회사법인 주식회사 그린모먼트', 15300, 16100],
    ['10000764', '제주 미니 단호박 4.5kg 7~20수', '마이제주', 11700, 11700],
    ['10000765', '제주 미니 단호박 4kg', '마이제주', 10900, 10900],
    ['10000766', '제주 미니 단호박 3.5kg 6~14수', '마이제주', 10100, 10100],
    ['10000767', '제주 미니 단호박 3kg', '마이제주', 9300, 9300],
    ['10000768', '제주 미니 단호박 2.5kg 4~12수', '마이제주', 8500, 8500],
    ['10000769', '제주 미니 단호박 2kg', '마이제주', 7700, 7700],
    ['10000770', '제주 미니 단호박 1.5kg 3~8수', '마이제주', 6600, 6600],
    ['10000771', '제주 미니 단호박 1kg 2~4수', '마이제주', 5800, 5800],
    ['10000773', '유러피안 셀러드 1kg 3~4종', '자체공급', 6500, 7000],
    ['10000774', '유러피안 셀러드 2kg 3~4종', '자체공급', 13000, 14000],
    ['10000776', '농협 스테비아 방울토마토_ 500g', '자체공급', 5900, 6500],
    ['10000777', '농협 스테비아 방울토마토_ 1kg', '자체공급', 7300, 8200],
    ['10000778', '농협 스테비아 방울토마토_ 2kg', '자체공급', 11200, 12000],
    ['10000780', '리뷰용 택배', '자체공급', 1800, 1950],
    ['10000781', '강원도 미백 찰 옥수수 특_10개', '평창유통', 13500, 14500],
    ['10000782', '강원도 미백 찰 옥수수 특_20개', '평창유통', 23500, 23500],
    ['10000783', '강원도 미백 찰 옥수수 특_30개', '평창유통', 34000, 34000],
    ['10000784', '강원도 미백 찰 옥수수 특_50개', '평창유통', 55200, 55200],
    ['10000785', '강원도 미백 찰 옥수수 상_10개', '평창유통', 7500, 11000],
    ['10000786', '강원도 미백 찰 옥수수 상_20개', '평창유통', 11500, 18500],
    ['10000787', '강원도 미백 찰 옥수수 상_30개', '평창유통', 16000, 27000],
    ['10000788', '강원도 미백 찰 옥수수 상_50개', '평창유통', 25500, 42200],
    ['10000789', '강원도 흑찰옥수수 특_10개', '평창유통', 12500, 14000],
    ['10000790', '강원도 흑찰옥수수 특_20개', '평창유통', 21500, 23000],
    ['10000791', '강원도 흑찰옥수수 특_30개', '평창유통', 31000, 33000],
    ['10000792', '강원도 흑찰옥수수 특_50개', '평창유통', 50200, 53000],
    ['10000793', '강원도 흑찰옥수수 상_10개', '평창유통', 8500, 9500],
    ['10000794', '강원도 흑찰옥수수 상_20개', '평창유통', 13500, 14500],
    ['10000795', '강원도 흑찰옥수수 상_30개', '평창유통', 19000, 21000],
    ['10000796', '강원도 흑찰옥수수 상_50개', '평창유통', 30200, 33200],
    ['10000805', '딱딱이복숭아 2kg 소과 (12~13과내외)', '에이스팜 -복숭아', 8563, 9700],
    ['10000806', '딱딱이복숭아 2kg 중과 (10~11과내외)', '에이스팜 -복숭아', 9616, 11300],
    ['10000807', '딱딱이복숭아 2kg 대과 (6~9과내외)', '에이스팜 -복숭아', 11721, 14500],
    ['10000808', '딱딱이복숭아 4kg 소과 (24~26과내외)', '에이스팜 -복숭아', 15026, 16500],
    ['10000809', '딱딱이복숭아 4kg 중과 (20~22과내외)', '에이스팜 -복숭아', 17132, 19500],
    ['10000810', '딱딱이복숭아 4kg 대과 (12~18과내외)', '에이스팜 -복숭아', 21342, 23000],
    ['10000812', '활 흰다리새우 500g', '망고컴퍼니', 13200, 13200],
    ['10000813', '활 흰다리새우 1kg', '망고컴퍼니', 26700, 26700],
    ['10000815', '미백 찰옥수수 특품 5개입 (14cm 이상)', '아리한유통', 6300, 7000],
    ['10000816', '미백 찰옥수수 특품 10개입 (14cm 이상)', '아리한유통', 8800, 9800],
    ['10000817', '미백 찰옥수수 특품 15개입 (14cm 이상)', '아리한유통', 12000, 13200],
    ['10000818', '미백 찰옥수수 특품 20개입 (14cm 이상)', '아리한유통', 14800, 16500],
    ['10000829', '강원도 국내산 팥 1kg', '자체공급', 14800, 16000],
    ['10000830', '강원도 국내산 팥 2kg', '자체공급', 29600, 32000],
    ['10000832', '무농약 단호박 2.5kg(실중량)', '자체공급', 12000, 14500],
    ['10000833', '무농약 단호박 4.5kg(실중량)', '자체공급', 19100, 23000],
    ['10000834', '무농약 단호박 1.5kg(실중량)', '자체공급', 8000, 10000],
    ['10000836', '제주 은갈치 5마리 (소)(마리당 150~170g)', '자체공급', 14000, 15500],
    ['10000837', '제주 은갈치 5마리 (중)(마리당 230g내외)', '자체공급', 19000, 21000],
    ['10000838', '제주 은갈치 5마리 (대)(마리당 300g내외)', '자체공급', 35500, 36500],
    ['10000840', '가정용 수박 3kg', '윤이프레시', 9500, 9700],
    ['10000841', '가정용 수박 4~6kg', '윤이프레시', 10500, 11000],
    ['10000842', '가정용 수박 6~7kg', '윤이프레시', 12500, 13000],
    ['10000844', '한반도 농협 토마토 정품 M_5KG', '한반도 농협', 16800, 18800],
    ['10000845', '한반도 농협 토마토 정품 L~2L_5KG', '한반도 농협', 16800, 19000],
    ['10000846', '한반도 농협 토마토 주스용_M~3L_10KG', '한반도 농협', 14800, 16300],
    ['10000847', '한반도 농협 토마토 주스용_3S~S_10KG', '한반도 농협', 12800, 14300],
    ['10000849', '한돈돼지 등뼈 3kg', '자체공급', 8100, 8300],
    ['10000850', '한돈돼지 등뼈 6kg', '자체공급', 14100, 14500],
    ['10000851', '한돈 돼지 등뼈 8kg', '자체공급', 15500, 16000]
  ];

  items.forEach(function (item) {
    if (existingCodes.indexOf(item[0]) !== -1) return;
    // 품목코드, 품목명, 옵션코드, 옵션명, 박스종류, 매입처명, 판매단가, 매입원가_단위당, 원물환산계수, 박스환산계수, 활성여부
    sheet.appendRow([item[0], item[1], '', '', '', item[2], item[4], item[3], '', '', 'Y']);
  });
}

// "택배양식.xlsx" 샘플을 근거로 만든 예시 매핑 1세트. 실제 파일명 접두사(택배사이름)로 반드시
// 바꿔주고, 다른 택배사 파일이 있으면 같은 형식으로 행을 추가해야 한다.
function seedCourierMapDefaults_(ss) {
  var sheet = ss.getSheetByName(SHEET.COURIER_MAP);
  var existing = getDataRows_(sheet, 1).map(function (r) { return r[0]; });
  if (existing.indexOf('예시택배사') !== -1) return;

  var rows = [
    ['예시택배사', '보내는사람', '보내는사람'],
    ['예시택배사', '보내는분전화번호', '보내는분전화번호'],
    ['예시택배사', '받는고객', '받는고객'],
    ['예시택배사', '받는고객전체주소', '받는고객전체주소'],
    ['예시택배사', '우편번호', '우편번호'],
    ['예시택배사', '메모', '배송메세지'],
    ['예시택배사', '받는고객핸드폰번호', '받는고객핸드폰번호'],
    ['예시택배사', '박스수량', '박스수량'],
    ['예시택배사', '품명01', '품명01'],
    ['예시택배사', '운송장번호', '운송장번호'],
    ['예시택배사', '주문번호', '주문번호']
  ];
  rows.forEach(function (row) { sheet.appendRow(row); });
}

// "카카오톡파일.xlsx" 실제 샘플을 근거로 만든 매핑. 원본의 "보내는사람(지정)/전화번호1(지정)/주소(지정)"이
// 실제 발송 주체(주문자) 정보이고, "받는사람/전화번호1/전화번호2"가 최종 수령인 정보라는 걸 확인해서 반영했다.
// 택배사/운송장번호/상품주문번호는 원본에 없어서 비워두며, 업로드 후 채워지는 값으로 보인다.
function seedPlatformUploadMapDefaults_(ss) {
  var sheet = ss.getSheetByName(SHEET.PLATFORM_UPLOAD_MAP);
  var existing = getDataRows_(sheet, 1).map(function (r) { return r[0]; });
  if (existing.indexOf(SOURCE.KAKAO) !== -1) return;

  var rows = [
    [SOURCE.KAKAO, '보내는사람(지정)', '주문자'],
    [SOURCE.KAKAO, '전화번호1(지정)', '주문자연락처1'],
    [SOURCE.KAKAO, '주소(지정)', '주문자주소'],
    [SOURCE.KAKAO, '받는사람', '수령인'],
    [SOURCE.KAKAO, '주소', '주소'],
    [SOURCE.KAKAO, '우편번호', '우편번호'],
    [SOURCE.KAKAO, '전화번호1', '수령인연락처1'],
    [SOURCE.KAKAO, '전화번호2', '수령인연락처2'],
    [SOURCE.KAKAO, '수량(소)', '수량'],
    [SOURCE.KAKAO, '상품명1', '상품명'],
    [SOURCE.KAKAO, '배송메세지', '배송메모'],
    [SOURCE.KAKAO, '주문번호', '거래처주문번호']
  ];
  rows.forEach(function (row) { sheet.appendRow(row); });
}

function buildOrderDetailFormulas_(ss) {
  var sheet = ss.getSheetByName(SHEET.ORDER_DETAIL_CALC);
  var im = SHEET.ITEM_MASTER;
  setFormulaIfEmpty_(ss, SHEET.ORDER_DETAIL_CALC, 'A2',
    '=IFERROR(' + SHEET.ORDERS_ALL + '!A2:M' + MAX_ROWS + ',)');
  setFormulaIfEmpty_(ss, SHEET.ORDER_DETAIL_CALC, 'N2',
    '=ARRAYFORMULA(IF($G2:$G<>"", $G2:$G&"|"&$H2:$H, ))');
  setFormulaIfEmpty_(ss, SHEET.ORDER_DETAIL_CALC, 'O2',
    '=ARRAYFORMULA(IF($N2:$N<>"", IFERROR(INDEX(' + im + '!$E$2:$E' + MAX_ROWS + ', MATCH($N2:$N, ' + im + '!$L$2:$L' + MAX_ROWS + ', 0)), ), ))');
  setFormulaIfEmpty_(ss, SHEET.ORDER_DETAIL_CALC, 'P2',
    '=ARRAYFORMULA(IF($N2:$N<>"", $I2:$I*IFERROR(INDEX(' + im + '!$I$2:$I' + MAX_ROWS + ', MATCH($N2:$N, ' + im + '!$L$2:$L' + MAX_ROWS + ', 0)), 0), ))');
  setFormulaIfEmpty_(ss, SHEET.ORDER_DETAIL_CALC, 'Q2',
    '=ARRAYFORMULA(IF($N2:$N<>"", $I2:$I*IFERROR(INDEX(' + im + '!$J$2:$J' + MAX_ROWS + ', MATCH($N2:$N, ' + im + '!$L$2:$L' + MAX_ROWS + ', 0)), 0), ))');
  // 매출액: 세 채널 다 주문 파일 자체에는 가격이 없어서(택배 지시서 성격), 판매단가는 항상
  // 품목마스터에서 품목명으로 찾아온다. 주문 라인 자체의 판매단가(K열)는 값이 있을 때만 우선 사용.
  setFormulaIfEmpty_(ss, SHEET.ORDER_DETAIL_CALC, 'R2',
    '=ARRAYFORMULA(IF($N2:$N<>"", $I2:$I*IF($K2:$K<>"", $K2:$K, IFERROR(INDEX(' + im + '!$G$2:$G' + MAX_ROWS + ', MATCH($N2:$N, ' + im + '!$L$2:$L' + MAX_ROWS + ', 0)), 0)), ))');
  setFormulaIfEmpty_(ss, SHEET.ORDER_DETAIL_CALC, 'S2',
    '=ARRAYFORMULA(IF($N2:$N<>"", $I2:$I*IFERROR(INDEX(' + im + '!$H$2:$H' + MAX_ROWS + ', MATCH($N2:$N, ' + im + '!$L$2:$L' + MAX_ROWS + ', 0)), 0), ))');
}

function buildRawStockFormulas_(ss) {
  var odc = SHEET.ORDER_DETAIL_CALC;
  var refunds = SHEET.REFUNDS;
  setFormulaIfEmpty_(ss, SHEET.STOCK_RAW, 'A2',
    '=IFERROR(UNIQUE(FILTER(' + SHEET.ITEM_MASTER + '!$B$2:$B' + MAX_ROWS + ', ' + SHEET.ITEM_MASTER + '!$B$2:$B' + MAX_ROWS + '<>"")),)');
  setFormulaIfEmpty_(ss, SHEET.STOCK_RAW, 'B2',
    '=ARRAYFORMULA(IF($A2:$A<>"", IFERROR(VLOOKUP($A2:$A, ' + SHEET.BASELINE_RAW + '!$A$2:$C' + MAX_ROWS + ', 3, 0), 0), ))');
  setFormulaIfEmpty_(ss, SHEET.STOCK_RAW, 'C2',
    '=ARRAYFORMULA(IF($A2:$A<>"", IFERROR(SUMIF(' + SHEET.INBOUND_RAW + '!$B$2:$B' + MAX_ROWS + ', $A2:$A, ' + SHEET.INBOUND_RAW + '!$C$2:$C' + MAX_ROWS + '), 0), ))');
  setFormulaIfEmpty_(ss, SHEET.STOCK_RAW, 'D2',
    '=ARRAYFORMULA(IF($A2:$A<>"", IFERROR(SUMIF(' + odc + '!$G$2:$G' + MAX_ROWS + ', $A2:$A, ' + odc + '!$P$2:$P' + MAX_ROWS + '), 0), ))');
  setFormulaIfEmpty_(ss, SHEET.STOCK_RAW, 'E2',
    '=ARRAYFORMULA(IF($A2:$A<>"", IFERROR(SUMIF(' + refunds + '!$D$2:$D' + MAX_ROWS + ', $A2:$A, ' + refunds + '!$N$2:$N' + MAX_ROWS + '), 0), ))');
  setFormulaIfEmpty_(ss, SHEET.STOCK_RAW, 'F2',
    '=ARRAYFORMULA(IF($A2:$A<>"", $B2:$B+$C2:$C-$D2:$D+$E2:$E, ))');
}

function buildBoxStockFormulas_(ss) {
  var odc = SHEET.ORDER_DETAIL_CALC;
  var refunds = SHEET.REFUNDS;
  setFormulaIfEmpty_(ss, SHEET.STOCK_BOX, 'A2',
    '=IFERROR(UNIQUE(FILTER(' + SHEET.ITEM_MASTER + '!$E$2:$E' + MAX_ROWS + ', ' + SHEET.ITEM_MASTER + '!$E$2:$E' + MAX_ROWS + '<>"")),)');
  setFormulaIfEmpty_(ss, SHEET.STOCK_BOX, 'B2',
    '=ARRAYFORMULA(IF($A2:$A<>"", IFERROR(VLOOKUP($A2:$A, ' + SHEET.BASELINE_BOX + '!$A$2:$C' + MAX_ROWS + ', 3, 0), 0), ))');
  setFormulaIfEmpty_(ss, SHEET.STOCK_BOX, 'C2',
    '=ARRAYFORMULA(IF($A2:$A<>"", IFERROR(SUMIF(' + SHEET.INBOUND_BOX + '!$B$2:$B' + MAX_ROWS + ', $A2:$A, ' + SHEET.INBOUND_BOX + '!$C$2:$C' + MAX_ROWS + '), 0), ))');
  setFormulaIfEmpty_(ss, SHEET.STOCK_BOX, 'D2',
    '=ARRAYFORMULA(IF($A2:$A<>"", IFERROR(SUMIF(' + odc + '!$O$2:$O' + MAX_ROWS + ', $A2:$A, ' + odc + '!$Q$2:$Q' + MAX_ROWS + '), 0), ))');
  setFormulaIfEmpty_(ss, SHEET.STOCK_BOX, 'E2',
    '=ARRAYFORMULA(IF($A2:$A<>"", IFERROR(SUMIF(' + refunds + '!$M$2:$M' + MAX_ROWS + ', $A2:$A, ' + refunds + '!$O$2:$O' + MAX_ROWS + '), 0), ))');
  setFormulaIfEmpty_(ss, SHEET.STOCK_BOX, 'F2',
    '=ARRAYFORMULA(IF($A2:$A<>"", $B2:$B+$C2:$C-$D2:$D+$E2:$E, ))');
}

function buildProfitFormulas_(ss) {
  var im = SHEET.ITEM_MASTER;
  var odc = SHEET.ORDER_DETAIL_CALC;
  var refunds = SHEET.REFUNDS;
  setFormulaIfEmpty_(ss, SHEET.PROFIT, 'A2',
    '=IFERROR(FILTER({' + im + '!$B$2:$B' + MAX_ROWS + ', ' + im + '!$D$2:$D' + MAX_ROWS + ', ' + im + '!$L$2:$L' + MAX_ROWS + '}, ' + im + '!$B$2:$B' + MAX_ROWS + '<>""),)');
  setFormulaIfEmpty_(ss, SHEET.PROFIT, 'D2',
    '=ARRAYFORMULA(IF($C2:$C<>"", IFERROR(SUMIF(' + odc + '!$N$2:$N' + MAX_ROWS + ', $C2:$C, ' + odc + '!$I$2:$I' + MAX_ROWS + '), 0), ))');
  setFormulaIfEmpty_(ss, SHEET.PROFIT, 'E2',
    '=ARRAYFORMULA(IF($C2:$C<>"", IFERROR(SUMIF(' + odc + '!$N$2:$N' + MAX_ROWS + ', $C2:$C, ' + odc + '!$R$2:$R' + MAX_ROWS + '), 0), ))');
  setFormulaIfEmpty_(ss, SHEET.PROFIT, 'F2',
    '=ARRAYFORMULA(IF($C2:$C<>"", IFERROR(SUMIF(' + odc + '!$N$2:$N' + MAX_ROWS + ', $C2:$C, ' + odc + '!$S$2:$S' + MAX_ROWS + '), 0), ))');
  setFormulaIfEmpty_(ss, SHEET.PROFIT, 'G2',
    '=ARRAYFORMULA(IF($C2:$C<>"", IFERROR(SUMIF(' + refunds + '!$L$2:$L' + MAX_ROWS + ', $C2:$C, ' + refunds + '!$H$2:$H' + MAX_ROWS + '), 0), ))');
  setFormulaIfEmpty_(ss, SHEET.PROFIT, 'H2',
    '=ARRAYFORMULA(IF($C2:$C<>"", $E2:$E-$F2:$F-$G2:$G, ))');
  setFormulaIfEmpty_(ss, SHEET.PROFIT, 'I2',
    '=ARRAYFORMULA(IF($E2:$E>0, $H2:$H/$E2:$E, ))');
}

// 이모님 근무 캘린더: C1에 넣은 월의 1일~31일 x 인력마스터의 활성 근무자 그리드.
// 근무기록에 그 사람+그 날짜로 등록된 일당이 있으면 셀에 표시된다. A4부터는 활성 근무자 목록이
// 자동으로 채워지며(FILTER), 최대 LABOR_CALENDAR_MAX_WORKERS명까지 그리드를 만들어둔다.
function buildLaborCalendarSheet_(ss) {
  var sheet = ss.getSheetByName(SHEET.LABOR_CALENDAR);
  if (!sheet) sheet = ss.insertSheet(SHEET.LABOR_CALENDAR);
  if (sheet.getRange('A1').getValue() !== '') return;

  var wm = SHEET.WORKER_MASTER;
  var att = SHEET.ATTENDANCE;
  var lastWorkerRow = 3 + LABOR_CALENDAR_MAX_WORKERS;

  sheet.getRange('A1').setValue('기준월(매달 1일로 수정)');
  var firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  sheet.getRange('C1').setValue(firstOfMonth).setNumberFormat('yyyy-mm-dd');

  var headerRow = ['이름'];
  for (var d = 1; d <= 31; d++) headerRow.push(d);
  headerRow.push('근무일수', '합계금액');
  sheet.getRange(3, 1, 1, headerRow.length).setValues([headerRow]);
  sheet.getRange(3, 1, 1, headerRow.length).setFontWeight('bold');
  sheet.setFrozenRows(3);
  sheet.setFrozenColumns(1);

  sheet.getRange('A4').setFormula(
    '=IFERROR(FILTER(' + wm + '!$A$2:$A' + MAX_ROWS + ', ' + wm + '!$C$2:$C' + MAX_ROWS + '="Y"),)'
  );

  // ARRAYFORMULA(SUMIFS(...))처럼 조건 하나를 배열($A4:$A33)로 넘기면 모든 행에 같은 값이
  // 복제되는 구글시트의 알려진 동작이 있어서(SUMIFS는 배열 조건을 행별로 계산하지 못함),
  // 각 셀마다 자기 행을 직접 가리키는 개별 수식을 넣는다(SUMIF 계열을 ARRAYFORMULA로 감싸지 않음).
  var dayFormulas = [];
  for (var r = 0; r < LABOR_CALENDAR_MAX_WORKERS; r++) {
    var rowNum = 4 + r;
    var rowFormulas = [];
    for (var day = 1; day <= 31; day++) {
      rowFormulas.push(
        '=IF($A' + rowNum + '="","",IF(' + day + '>DAY(EOMONTH($C$1,0)),"",' +
        'IF(SUMIFS(' + att + '!$D$2:$D' + MAX_ROWS + ', ' + att + '!$C$2:$C' + MAX_ROWS + ', $A' + rowNum + ', ' +
        att + '!$B$2:$B' + MAX_ROWS + ', DATE(YEAR($C$1),MONTH($C$1),' + day + '))=0,"",' +
        'SUMIFS(' + att + '!$D$2:$D' + MAX_ROWS + ', ' + att + '!$C$2:$C' + MAX_ROWS + ', $A' + rowNum + ', ' +
        att + '!$B$2:$B' + MAX_ROWS + ', DATE(YEAR($C$1),MONTH($C$1),' + day + ')))))'
      );
    }
    dayFormulas.push(rowFormulas);
  }
  sheet.getRange(4, 2, LABOR_CALENDAR_MAX_WORKERS, 31).setFormulas(dayFormulas);

  var countCol = 2 + 31; // AG
  var sumCol = 3 + 31; // AH
  var summaryFormulas = [];
  for (var r2 = 0; r2 < LABOR_CALENDAR_MAX_WORKERS; r2++) {
    var rowNum2 = 4 + r2;
    summaryFormulas.push([
      '=IF($A' + rowNum2 + '="","",COUNTIFS(' + att + '!$C$2:$C' + MAX_ROWS + ', $A' + rowNum2 + ', ' +
      att + '!$B$2:$B' + MAX_ROWS + ', ">="&DATE(YEAR($C$1),MONTH($C$1),1), ' +
      att + '!$B$2:$B' + MAX_ROWS + ', "<"&EDATE(DATE(YEAR($C$1),MONTH($C$1),1),1)))',
      '=IF($A' + rowNum2 + '="","",SUMIFS(' + att + '!$D$2:$D' + MAX_ROWS + ', ' + att + '!$C$2:$C' + MAX_ROWS + ', $A' + rowNum2 + ', ' +
      att + '!$B$2:$B' + MAX_ROWS + ', ">="&DATE(YEAR($C$1),MONTH($C$1),1), ' +
      att + '!$B$2:$B' + MAX_ROWS + ', "<"&EDATE(DATE(YEAR($C$1),MONTH($C$1),1),1)))'
    ]);
  }
  sheet.getRange(4, countCol, LABOR_CALENDAR_MAX_WORKERS, 2).setFormulas(summaryFormulas);

  var sumColLetter = sheet.getRange(4, sumCol).getA1Notation().replace(/\d+$/, '');
  var totalRow = lastWorkerRow + 1;
  sheet.getRange(totalRow, 1).setValue('전체 합계');
  sheet.getRange(totalRow, sumCol).setFormula('=SUM(' + sumColLetter + '4:' + sumColLetter + lastWorkerRow + ')');
}
