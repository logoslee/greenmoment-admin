// 카카오톡 등에서 받은 원본 주문 파일을 그린모먼트 관리자페이지 업로드 양식(PLATFORM_UPLOAD_HEADERS)으로
// 변환해 업로드 폴더에 저장한다. 파일명이 "소스이름_아무거나.xlsx" 형식이면 그 소스의 매핑을 쓰고,
// 아니거나 매핑을 못 찾으면 설정 시트의 PLATFORM_UPLOAD_DEFAULT_SOURCE(기본값 "카카오톡")로 시도한다.
// 즉 소스가 하나뿐이면 파일명을 아무렇게나 지어도 된다.
function convertToPlatformUploadForm() {
  var sourceFolderId = getConfig_(CONFIG_KEYS.PLATFORM_UPLOAD_SOURCE_FOLDER_ID);
  var doneFolderId = getConfig_(CONFIG_KEYS.PLATFORM_UPLOAD_DONE_FOLDER_ID);
  var outputFolderId = getConfig_(CONFIG_KEYS.PLATFORM_UPLOAD_OUTPUT_FOLDER_ID);
  if (!extractFolderId_(sourceFolderId) || !extractFolderId_(outputFolderId)) {
    SpreadsheetApp.getUi().alert('설정 시트에 PLATFORM_UPLOAD_SOURCE_FOLDER_ID / PLATFORM_UPLOAD_OUTPUT_FOLDER_ID를 먼저 채워주세요.');
    return;
  }

  var sourceFolder = getFolderSafe_(sourceFolderId, 'PLATFORM_UPLOAD_SOURCE_FOLDER_ID');
  var doneFolder = doneFolderId ? getFolderSafe_(doneFolderId, 'PLATFORM_UPLOAD_DONE_FOLDER_ID') : null;
  var outputFolder = getFolderSafe_(outputFolderId, 'PLATFORM_UPLOAD_OUTPUT_FOLDER_ID');

  var files = sourceFolder.getFiles();
  var convertedCount = 0;
  var skipped = [];
  while (files.hasNext()) {
    var file = files.next();
    try {
      var resolved = resolveSourceAndMap_(file.getName(), SHEET.PLATFORM_UPLOAD_MAP, CONFIG_KEYS.PLATFORM_UPLOAD_DEFAULT_SOURCE);
      if (!resolved) {
        Logger.log('컬럼매핑을 찾지 못했습니다 (업로드양식매핑 시트 또는 PLATFORM_UPLOAD_DEFAULT_SOURCE 설정을 확인하세요): ' + file.getName());
        skipped.push(file.getName());
        continue;
      }

      var rows = readTabularFile_(file);
      var outputRows = mapRowsToHeaders_(rows, resolved.columnMap, PLATFORM_UPLOAD_HEADERS);
      if (outputRows.length === 0) {
        Logger.log('[' + resolved.source + '] 변환할 데이터가 없습니다: ' + file.getName());
        skipped.push(file.getName());
        continue;
      }

      var outputName = file.getName().replace(/\.[^.]+$/, '') + '_관리자업로드양식.xlsx';
      writeXlsxFile_(outputFolder, outputName, PLATFORM_UPLOAD_HEADERS, outputRows);
      convertedCount++;

      if (doneFolder) {
        doneFolder.addFile(file);
        sourceFolder.removeFile(file);
      }
    } catch (e) {
      Logger.log('관리자업로드양식 변환 실패 (' + file.getName() + '): ' + e.message);
      skipped.push(file.getName());
    }
  }

  var message = convertedCount + '개 파일을 관리자업로드양식으로 변환했습니다.';
  if (skipped.length > 0) message += ' (건너뜀 ' + skipped.length + '개: ' + skipped.join(', ') + ')';
  SpreadsheetApp.getActiveSpreadsheet().toast(message, '업로드양식 변환', 8);
}
