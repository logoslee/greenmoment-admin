// 지정한 드라이브 폴더에 새로 들어온 파일을 읽어 표준 스키마로 변환 후 주문 시트에 추가하고,
// 처리 완료 폴더로 옮긴다. (카카오톡 발주서 업로드 / 발주플랫폼 다운로드 파일 공용)
function collectFromDriveFolder_(source, folderId, doneFolderId) {
  if (!extractFolderId_(folderId)) {
    Logger.log('[' + source + '] 업로드 폴더 ID가 설정되지 않아 건너뜁니다.');
    return 0;
  }
  var folder = getFolderSafe_(folderId, source + ' 업로드 폴더 ID');
  var doneFolder = doneFolderId ? getFolderSafe_(doneFolderId, source + ' 처리완료 폴더 ID') : null;

  var files = folder.getFiles();
  var totalAdded = 0;
  while (files.hasNext()) {
    var file = files.next();
    try {
      var rows = readTabularFile_(file);
      totalAdded += normalizeAndAppendOrders_(source, file.getName(), rows);
      if (doneFolder) {
        doneFolder.addFile(file);
        folder.removeFile(file);
      }
    } catch (e) {
      Logger.log('[' + source + '] 파일 처리 실패 (' + file.getName() + '): ' + e.message);
    }
  }
  Logger.log('[' + source + '] 수집 완료: ' + totalAdded + '건 추가');
  return totalAdded;
}

function collectFromKakaoFolder() {
  var added = collectFromDriveFolder_(
    SOURCE.KAKAO,
    getConfig_(CONFIG_KEYS.KAKAO_FOLDER_ID),
    getConfig_(CONFIG_KEYS.KAKAO_DONE_FOLDER_ID)
  );
  setConfig_('KAKAO_LAST_RUN', new Date());
  return added;
}

function collectFromPlatformFolder() {
  var added = collectFromDriveFolder_(
    SOURCE.PLATFORM,
    getConfig_(CONFIG_KEYS.PLATFORM_FOLDER_ID),
    getConfig_(CONFIG_KEYS.PLATFORM_DONE_FOLDER_ID)
  );
  setConfig_('PLATFORM_LAST_RUN', new Date());
  return added;
}
