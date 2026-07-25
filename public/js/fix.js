// 全面修复脚本
// 在每个页面加载时运行，确保所有功能正常

(function() {
  // 1. 确保 db 变量存在
  if (typeof db === 'undefined') {
    console.error('❌ Supabase 客户端未初始化');
    // 尝试重新初始化
    if (typeof window.supabase !== 'undefined') {
      const SUPABASE_URL = 'https://szeyuwcszeaxznldxddg.supabase.co';
      const SUPABASE_ANON_KEY = 'sb_publishable_cy_hJVugRbd75ZmB0hT4yA_BrvvxRue';
      window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('✅ 重新初始化 Supabase 客户端');
    }
  }

  // 2. 全局错误处理
  window.addEventListener('error', (event) => {
    console.error('页面错误:', event.error);
  });

  // 3. 未处理的 Promise 错误
  window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的 Promise 错误:', event.reason);
  });

  // 4. 检查登录状态
  async function checkLoginStatus() {
    if (typeof db === 'undefined') return false;

    try {
      const { data: { session }, error } = await db.auth.getSession();
      if (error) {
        console.error('认证错误:', error.message);
        return false;
      }
      return !!session;
    } catch (err) {
      console.error('认证异常:', err.message);
      return false;
    }
  }

  // 5. 显示用户信息
  function displayUserInfo() {
    if (typeof currentProfile !== 'undefined' && currentProfile) {
      const avatarEl = document.getElementById('user-avatar');
      const nameEl = document.getElementById('user-name');

      if (avatarEl) avatarEl.textContent = currentProfile.avatar || '🐼';
      if (nameEl) nameEl.textContent = currentProfile.nickname || '未知用户';
    }
  }

  // 6. 绑定退出登录
  function bindLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        if (typeof db !== 'undefined') {
          await db.auth.signOut();
        }
        window.location.href = 'index.html';
      });
    }
  }

  // 7. 初始化页面
  async function initPage() {
    console.log('🔧 fix.js 开始初始化');

    // 等待一下让其他脚本先运行
    await new Promise(resolve => setTimeout(resolve, 50));

    // 检查登录状态
    const isLoggedIn = await checkLoginStatus();
    console.log('🔧 登录状态:', isLoggedIn);

    // 如果不在登录页面且未登录，跳转到登录页面
    const isLoginPage = window.location.pathname.endsWith('index.html') ||
                        window.location.pathname.endsWith('/') ||
                        window.location.pathname === '';

    console.log('🔧 当前页面:', window.location.pathname, '是否登录页:', isLoginPage);

    if (!isLoggedIn && !isLoginPage) {
      console.log('🔧 未登录，跳转到登录页');
      window.location.href = 'index.html';
      return;
    }

    // 如果在登录页面且已登录，跳转到大厅
    if (isLoggedIn && isLoginPage) {
      console.log('🔧 已登录，跳转到大厅');
      window.location.href = 'lobby.html';
      return;
    }

    // 显示用户信息
    displayUserInfo();

    // 绑定退出登录
    bindLogout();

    console.log('✅ 页面初始化完成');
  }

  // 8. 页面加载后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
  } else {
    initPage();
  }
})();
