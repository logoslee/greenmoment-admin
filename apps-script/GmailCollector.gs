function collectFromGmail() {
  var query = getConfig_(CONFIG_KEYS.GMAIL_SEARCH_QUERY);
  var labelName = getConfig_(CONFIG_KEYS.GMAIL_PROCESSED_LABEL) || '발주처리완료';
  if (!query) {
    Logger.log('설정 시트의 GMAIL_SEARCH_QUERY 값이 비어있어 Gmail 수집을 건너뜁니다.');
    return;
  }

  var label = GmailApp.getUserLabelByName(labelName) || GmailApp.createLabel(labelName);
  var fullQuery = query + ' -label:"' + labelName + '"';
  var threads = GmailApp.search(fullQuery, 0, 50);

  var totalAdded = 0;
  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (message) {
      message.getAttachments({ includeInlineImages: false, includeAttachments: true }).forEach(function (attachment) {
        var name = attachment.getName();
        if (!/\.(csv|xlsx|xls)$/i.test(name)) return;
        try {
          var rows = readTabularBlob_(attachment.copyBlob());
          var identifier = message.getId() + ':' + name;
          totalAdded += normalizeAndAppendOrders_(SOURCE.GMAIL, identifier, rows);
        } catch (e) {
          Logger.log('Gmail 첨부파일 처리 실패 (' + name + '): ' + e.message);
        }
      });
    });
    thread.addLabel(label);
  });

  setConfig_('GMAIL_LAST_RUN', new Date());
  Logger.log('Gmail 수집 완료: 쓰레드 ' + threads.length + '개, 주문행 ' + totalAdded + '건 추가');
}
