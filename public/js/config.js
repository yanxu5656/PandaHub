// Supabase 配置
const SUPABASE_URL = 'https://szeyuwcszeaxznldxddg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cy_hJVugRbd75ZmB0hT4yA_BrvvxRue';

// 初始化 Supabase 客户端
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 预设头像列表 - 扩展版
const AVATARS = [
  '🐼', '🐻', '🐨', '🦊', '🐱', '🐶', '🦁', '🐯',
  '🐸', '🐵', '🦄', '🐲', '🦅', '🐺', '🐗', '🐴',
  '🐧', '🐢', '🐙', '🦋', '🐝', '🐞', '🦀', '🐳',
  '🦉', '🦇', '🦈', '🐊', '🦩', '🦚', '🦜', '🦢',
  '🎮', '🎯', '🎲', '🎪', '🎨', '🎭', '🎪', '🎡',
  '🌟', '⭐', '🌙', '☀️', '🔥', '💧', '⚡', '❄️',
  '🎸', '🥁', '🎺', '🎻', '🎹', '🎷', '🎵', '🎶',
  '🚀', '✈️', '🚂', '🚗', '🏎️', '🛸', '⛵', '🚁'
];

// 当前用户
let currentUser = null;
let currentProfile = null;
let heartbeatInterval = null;

// 检查登录状态并确保用户资料存在
async function checkAuth() {
  try {
    const { data: { session }, error: sessionError } = await db.auth.getSession();

    if (sessionError || !session) {
      return false;
    }

    currentUser = session.user;

    const { data: profile, error: profileError } = await db
      .from('members')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (profileError || !profile) {
      const metadata = currentUser.user_metadata || {};
      const nickname = metadata.nickname || currentUser.email.split('@')[0];
      const avatar = metadata.avatar || '🐼';

      const { data: newProfile, error: createError } = await db
        .from('members')
        .insert({
          id: currentUser.id,
          nickname: nickname,
          avatar: avatar,
          is_admin: false
        })
        .select()
        .single();

      if (createError) {
        console.error('创建用户资料失败:', createError);
        currentProfile = {
          id: currentUser.id,
          nickname: nickname,
          avatar: avatar,
          is_admin: false
        };
      } else {
        currentProfile = newProfile;
      }
    } else {
      currentProfile = profile;
    }

    startHeartbeat();
    return true;
  } catch (err) {
    console.error('检查登录状态失败:', err);
    return false;
  }
}

// 启动心跳
function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  sendHeartbeat();
  heartbeatInterval = setInterval(sendHeartbeat, 30000);

  window.addEventListener('beforeunload', () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
  });
}

// 发送心跳
async function sendHeartbeat() {
  if (!currentUser) return;

  try {
    await db
      .from('members')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', currentUser.id);
  } catch (err) {
    console.error('心跳发送失败:', err);
  }
}

// 检查用户是否在线
function isUserOnline(lastSeen) {
  if (!lastSeen) return false;
  const lastSeenTime = new Date(lastSeen).getTime();
  const now = Date.now();
  const twoMinutes = 2 * 60 * 1000;
  return (now - lastSeenTime) < twoMinutes;
}

// 显示消息
function showMessage(text, type = 'error') {
  const msg = document.getElementById('message');
  if (msg) {
    msg.textContent = text;
    msg.className = `message ${type}`;
    setTimeout(() => {
      msg.className = 'message';
    }, 5000);
  }
}

// 显示用户信息
function displayUserInfo() {
  if (currentProfile) {
    const avatarEl = document.getElementById('user-avatar');
    const nameEl = document.getElementById('user-name');

    if (avatarEl) avatarEl.textContent = currentProfile.avatar || '🐼';
    if (nameEl) nameEl.textContent = currentProfile.nickname || '未知用户';
  }
}
