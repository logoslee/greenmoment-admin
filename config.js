// Supabase 프로젝트 설정
// Supabase 대시보드 > Project Settings > API 에서 확인 가능합니다.
//   - SUPABASE_URL: "Project URL"
//   - SUPABASE_ANON_KEY: "anon public" 키 (secret/service_role 키는 절대 여기 넣지 마세요)
window.SUPABASE_CONFIG = {
  url: "https://gfawlfkutyzevfkqgddd.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmYXdsZmt1dHl6ZXZma3FnZGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0MjA5NTUsImV4cCI6MjEwMTk5Njk1NX0.oEGkGAcd_C7VuxbnpyatgnL2aXktcZtftOPRjFWioR8",
};

// 구글시트 "지금 내보내기" 버튼용 설정 (index.html)
// Google Cloud Console에서 OAuth 클라이언트 ID를 만드는 법은 README.md 참고
window.GOOGLE_CONFIG = {
  clientId: "YOUR_GOOGLE_OAUTH_CLIENT_ID",
  spreadsheetId: "YOUR_GOOGLE_SPREADSHEET_ID",
};
