// 메뉴 "오늘 근무자 추가"로 열리는 체크박스 다이얼로그. 인력마스터에서 활성여부="Y"인
// 근무자 목록을 보여주고, 체크한 사람들을 골라 근무기록에 오늘(또는 지정한 날짜) 일당을 남긴다.
function showAddWorkerDialog() {
  var wsheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.WORKER_MASTER);
  var data = getDataRows_(wsheet, 3); // 이름, 기본일당, 활성여부
  var workers = data.filter(function (r) { return r[2] === 'Y' && r[0] !== ''; });

  if (workers.length === 0) {
    SpreadsheetApp.getUi().alert('인력마스터 시트에 활성여부를 "Y"로 등록한 근무자가 없습니다. 먼저 이름/기본일당/활성여부(Y)를 등록해주세요.');
    return;
  }

  var todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  var checkboxesHtml = workers.map(function (w) {
    var name = escapeHtml_(w[0]);
    var wage = Number(w[1]) || 0;
    return '<label style="display:block;margin:6px 0;">' +
      '<input type="checkbox" name="worker" value="' + name + '"> ' +
      name + ' (일당 ' + wage.toLocaleString() + '원)</label>';
  }).join('');

  var html =
    '<div style="font-family:sans-serif;padding:8px;">' +
    '<div style="margin-bottom:10px;">근무일자: <input type="date" id="workDate" value="' + todayStr + '"></div>' +
    '<div id="workerList">' + checkboxesHtml + '</div>' +
    '<div style="margin-top:14px;">' +
    '<button onclick="submitForm()">등록</button>' +
    '<span id="statusMsg" style="margin-left:10px;color:green;"></span>' +
    '</div>' +
    '<script>' +
    'function submitForm() {' +
    '  var date = document.getElementById("workDate").value;' +
    '  var boxes = document.querySelectorAll(\'input[name="worker"]:checked\');' +
    '  var names = Array.prototype.map.call(boxes, function(b){ return b.value; });' +
    '  if (names.length === 0) { alert("근무한 사람을 한 명 이상 체크해주세요."); return; }' +
    '  document.getElementById("statusMsg").innerText = "저장 중...";' +
    '  google.script.run.withSuccessHandler(function(msg){' +
    '    document.getElementById("statusMsg").innerText = msg;' +
    '  }).withFailureHandler(function(err){' +
    '    document.getElementById("statusMsg").innerText = "오류: " + err.message;' +
    '  }).recordAttendance(date, names);' +
    '}' +
    '</script>' +
    '</div>';

  var output = HtmlService.createHtmlOutput(html)
    .setWidth(340)
    .setHeight(Math.min(520, 150 + workers.length * 30));
  SpreadsheetApp.getUi().showModalDialog(output, '오늘 근무자 추가');
}

// 다이얼로그에서 google.script.run으로 호출되는 서버 함수. 이미 그 날짜+이름으로 등록된
// 근무기록이 있으면 중복 추가하지 않고 건너뛴다.
function recordAttendance(dateStr, names) {
  var wsheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.WORKER_MASTER);
  var wageByName = {};
  getDataRows_(wsheet, 2).forEach(function (r) { wageByName[r[0]] = r[1]; });

  var att = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.ATTENDANCE);
  var tz = Session.getScriptTimeZone();
  var existingKeys = getDataRows_(att, 3).map(function (r) {
    return Utilities.formatDate(new Date(r[1]), tz, 'yyyy-MM-dd') + '|' + r[2];
  });

  var now = new Date();
  var workDate = new Date(dateStr);
  var added = 0, skipped = 0;
  names.forEach(function (name) {
    var key = dateStr + '|' + name;
    if (existingKeys.indexOf(key) !== -1) { skipped++; return; }
    att.appendRow([now, workDate, name, wageByName[name] || 0, '']);
    added++;
  });

  return added + '명 등록 완료' + (skipped > 0 ? ' (' + skipped + '명은 이미 등록되어 있어 건너뜀)' : '');
}

function escapeHtml_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
