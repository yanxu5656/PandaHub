// 认证逻辑
document.addEventListener('DOMContentLoaded', () => {
  // 检查是否已登录
  checkAuth().then(loggedIn => {
    if (loggedIn) {
      window.location.href = 'lobby.html';
    }
  });

  // 初始化头像选择器
  initAvatarPicker();

  // 绑定事件
  bindEvents();
});

// 初始化头像选择器
function initAvatarPicker() {
  const picker = document.getElementById('avatar-picker');
  if (!picker) return;

  AVATARS.forEach((avatar, index) => {
    const option = document.createElement('div');
    option.className = 'avatar-option';
    option.textContent = avatar;
    option.dataset.avatar = avatar;
    if (index === 0) option.classList.add('selected');
    option.addEventListener('click', () => {
      picker.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
    });
    picker.appendChild(option);
  });
}

// 绑定事件
function bindEvents() {
  // 切换表单
  const showRegister = document.getElementById('show-register');
  const showLogin = document.getElementById('show-login');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (showRegister) {
    showRegister.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.classList.remove('active');
      registerForm.classList.add('active');
    });
  }

  if (showLogin) {
    showLogin.addEventListener('click', (e) => {
      e.preventDefault();
      registerForm.classList.remove('active');
      loginForm.classList.add('active');
    });
  }

  // 登录
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
  }

  // 注册
  const registerBtn = document.getElementById('register-btn');
  if (registerBtn) {
    registerBtn.addEventListener('click', handleRegister);
  }

  // 回车提交
  document.querySelectorAll('input').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        if (loginForm.classList.contains('active')) {
          handleLogin();
        } else {
          handleRegister();
        }
      }
    });
  });
}

// 处理登录
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showMessage('请填写邮箱和密码');
    return;
  }

  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.textContent = '登录中...';

  try {
    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      showMessage(error.message === 'Invalid login credentials' ? '邮箱或密码错误' : error.message);
      return;
    }

    showMessage('登录成功！', 'success');
    setTimeout(() => {
      window.location.href = 'lobby.html';
    }, 500);
  } catch (err) {
    showMessage('登录失败，请重试');
  } finally {
    btn.disabled = false;
    btn.textContent = '登录';
  }
}

// 处理注册
async function handleRegister() {
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const nickname = document.getElementById('reg-nickname').value.trim();
  const selectedAvatar = document.querySelector('.avatar-option.selected');

  if (!email || !password || !nickname) {
    showMessage('请填写所有字段');
    return;
  }

  if (password.length < 6) {
    showMessage('密码至少需要6位');
    return;
  }

  const avatar = selectedAvatar ? selectedAvatar.dataset.avatar : '🐼';

  const btn = document.getElementById('register-btn');
  btn.disabled = true;
  btn.textContent = '注册中...';

  try {
    // 注册用户
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname,
          avatar
        }
      }
    });

    if (error) {
      showMessage(error.message);
      return;
    }

    // 创建用户资料
    if (data.user) {
      const { error: profileError } = await db
        .from('members')
        .insert({
          id: data.user.id,
          nickname,
          avatar,
          is_admin: false
        });

      if (profileError) {
        console.error('创建资料失败:', profileError);
      }
    }

    showMessage('注册成功！请查看邮箱确认（如果开启了邮箱验证）', 'success');

    // 如果不需要邮箱验证，直接跳转
    if (data.session) {
      setTimeout(() => {
        window.location.href = 'lobby.html';
      }, 1000);
    }
  } catch (err) {
    showMessage('注册失败，请重试');
  } finally {
    btn.disabled = false;
    btn.textContent = '注册';
  }
}
