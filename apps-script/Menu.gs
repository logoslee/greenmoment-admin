function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('재고분석')
    .addItem('초기 시트 생성', 'initializeWorkbook')
    .addSeparator()
    .addItem('지금 전체 수집 실행', 'runAllCollectors')
    .addItem('Gmail만 수집', 'collectFromGmail')
    .addItem('카카오톡 업로드 폴더만 수집', 'collectFromKakaoFolder')
    .addItem('발주플랫폼 업로드 폴더만 수집', 'collectFromPlatformFolder')
    .addSeparator()
    .addItem('택배양식 → 어드민양식 변환 실행', 'convertCourierFiles')
    .addItem('원본파일 → 관리자업로드양식 변환 실행', 'convertToPlatformUploadForm')
    .addSeparator()
    .addItem('오늘 근무자 추가 (인건비)', 'showAddWorkerDialog')
    .addSeparator()
    .addItem('자동 수집 트리거 설정', 'installTriggers')
    .addItem('자동 수집 트리거 해제', 'removeTriggers')
    .addToUi();
}

function runAllCollectors() {
  collectFromGmail();
  collectFromKakaoFolder();
  collectFromPlatformFolder();
  SpreadsheetApp.getActiveSpreadsheet().toast('수집이 완료되었습니다.', '재고분석', 5);
}
