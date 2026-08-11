# 재고·순이익 관리 시스템 — 설정 가이드

매일 매출/원물입고/출하/폐기/박스입출고를 휴대폰 폼([input.html](input.html))으로 입력하면,
[index.html](index.html) 대시보드에서 자동으로 재고와 순이익을 시각화해서 보여줍니다.

데이터는 Supabase(무료 클라우드 DB)에 저장되고, 이 폴더 자체를 GitHub Pages로 올려서
휴대폰에서 URL로 바로 접속하는 구조입니다.

## 1. Supabase 프로젝트 만들기
1. [supabase.com](https://supabase.com) 에서 무료 계정을 만듭니다.
2. **New Project**로 새 프로젝트를 생성합니다 (이름은 아무거나, 예: `재고관리`). DB 비밀번호는 잘 보관하세요.
3. 왼쪽 메뉴 **SQL Editor** 클릭 → **New query** → 이 폴더의 [db/schema.sql](db/schema.sql) 내용 전체를
   복사해 붙여넣고 **Run** 버튼을 누릅니다. 에러 없이 끝나면 완료입니다.
4. 왼쪽 메뉴 **Project Settings > API**로 이동해서 다음 두 값을 확인합니다.
   - **Project URL**
   - **anon public** 키 (secret/service_role 키는 사용하지 않습니다)
5. 이 두 값을 저에게 알려주시면 [config.js](config.js)에 채워드립니다. (직접 채우셔도 됩니다 — 파일 열어서
   `YOUR_SUPABASE_PROJECT_URL`, `YOUR_SUPABASE_ANON_KEY` 부분만 바꾸면 됩니다.)

## 2. 품목 등록 (선택, 나중에 폼에서 추가해도 됨)
`items` 테이블에 자주 쓰는 원물/박스 품목을 미리 등록해두면 편합니다. Supabase 대시보드 **Table Editor >
items**에서 직접 행을 추가하거나, [input.html](input.html)에서 입력하다가 "+ 새 품목 추가"로 그때그때
추가해도 됩니다.

## 3. 휴대폰에서 쓸 수 있게 배포하기 (GitHub Pages)
1. [github.com](https://github.com) 에서 무료 계정을 만듭니다 (이미 있으면 생략).
2. 새 저장소(Repository)를 만듭니다 (Public 또는 Private 모두 가능, 이름은 아무거나, 예: `jaego`).
3. 이 폴더를 그 저장소에 push합니다. (git이 처음이시면 말씀해주시면 명령어를 대신 실행해드릴 수 있습니다.)
4. 저장소 **Settings > Pages**에서 **Source**를 `main` 브랜치, `/ (root)`로 설정하고 저장합니다.
5. 몇 분 뒤 `https://<계정이름>.github.io/<저장소이름>/` 형태의 URL이 생깁니다. 이 주소를 휴대폰 홈 화면에
   추가해두면 앱처럼 바로 열 수 있습니다. `input.html`이 매일 입력용, `index.html`이 대시보드입니다.

## 4. 사용법
- 매일 [input.html](input.html)을 열어 그날의 매출/원물입고/출하/폐기/박스입출고를 입력합니다. 항목별로
  각각 "저장" 버튼을 누르면 바로 반영됩니다. 여러 품목을 입력할 땐 같은 섹션에서 반복해서 저장하면 됩니다.
- [index.html](index.html) 대시보드에서 오늘 매출/순이익, 원물·박스 재고 현황, 최근 30일 추이, 최근 폐기
  내역을 확인합니다.

## 보안 참고
`config.js`의 anon key는 브라우저에 그대로 노출됩니다. Supabase에 RLS(행 단위 보안)를 켜두긴 했지만
지금은 "누구나 읽기/쓰기 허용" 정책이라, 이 URL을 아는 사람은 데이터를 보거나 바꿀 수 있습니다. 지금은
URL을 남에게 공유하지 않는 것으로 충분하지만, 나중에 더 안전하게 하고 싶으시면 Supabase Auth(이메일
로그인)를 추가할 수 있습니다 — 필요하시면 말씀해주세요.

## 다음 단계 (원하시면 진행)
- 지금은 매출/입고/출하/폐기를 휴대폰 폼으로 직접 입력합니다. 나중에 판매 플랫폼 다운로드 파일이나
  택배사 출고 데이터(CSV/엑셀) 실제 샘플을 주시면, 그 파일을 자동으로 읽어 `stock_movements`/
  `daily_revenue`에 채워 넣는 자동화를 추가로 만들 수 있습니다. (이 폴더의 예전 `SETUP.md`/`apps-script/`가
  Google Sheets 기준으로 비슷한 걸 시도했던 흔적입니다 — 참고할 수 있지만 이번 시스템과는 별개입니다.)
- 인건비 등 다른 비용을 순이익 계산에 포함시키고 싶으시면 말씀해주세요.
