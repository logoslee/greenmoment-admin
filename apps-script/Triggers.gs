function installTriggers() {
  removeTriggers();
  var minutes = snapToAllowedInterval_(Number(getConfig_(CONFIG_KEYS.REFRESH_INTERVAL_MINUTES)) || 15);
  ScriptApp.newTrigger('runAllCollectors')
    .timeBased()
    .everyMinutes(minutes)
    .create();
  SpreadsheetApp.getUi().alert(minutes + '분 주기로 자동 수집 트리거가 설정되었습니다.');
}

function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'runAllCollectors') {
      ScriptApp.deleteTrigger(t);
    }
  });
}

// ScriptApp.everyMinutes()는 1, 5, 10, 15, 30만 허용하므로 가장 가까운 값으로 보정
function snapToAllowedInterval_(minutes) {
  var allowed = [1, 5, 10, 15, 30];
  var closest = allowed[0];
  allowed.forEach(function (a) {
    if (Math.abs(a - minutes) < Math.abs(closest - minutes)) closest = a;
  });
  return closest;
}
