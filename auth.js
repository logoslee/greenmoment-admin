// 로그인 여부 확인 + 로그아웃 공통 유틸. config.js/supabase-js 로드 뒤, db(createClient 결과) 생성 후에 사용.
async function requireAuth(db){
  const { data, error } = await db.auth.getSession();
  if(error || !data.session){
    const here = location.pathname.split('/').pop() || 'index.html';
    location.href = 'login.html?redirect=' + encodeURIComponent(here);
    return new Promise(() => {}); // 페이지 이동 중이므로 이후 코드가 실행되지 않게 영원히 대기
  }
  return data.session.user.user_metadata && data.session.user.user_metadata.role
    ? data.session.user.user_metadata.role
    : 'sub';
}

async function doLogout(db){
  await db.auth.signOut();
  location.href = 'login.html';
}
