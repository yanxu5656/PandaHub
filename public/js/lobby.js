// 大厅页面逻辑
document.addEventListener('DOMContentLoaded', async () => {
  const loggedIn = await checkAuth();
  if (!loggedIn) {
    window.location.href = 'index.html';
    return;
  }

  displayUserInfo();
  loadMembers();
  loadNotifications();
  loadActivePolls();

  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('mark-all-read').addEventListener('click', markAllNotificationsRead);
  document.getElementById('edit-profile-btn').addEventListener('click', showProfileModal);
  document.getElementById('save-profile-btn').addEventListener('click', saveProfile);
  document.getElementById('cancel-profile-btn').addEventListener('click', hideProfileModal);

  subscribeToUpdates();
});

// 显示个人信息模态框
function showProfileModal() {
  const modal = document.getElementById('profile-modal');
  if (!modal) return;

  document.getElementById('profile-nickname').value = currentProfile.nickname || '';
  document.getElementById('profile-email').value = currentUser.email || '';

  const avatarOptions = modal.querySelectorAll('.avatar-option');
  avatarOptions.forEach(option => {
    option.classList.remove('selected');
    if (option.dataset.avatar === currentProfile.avatar) {
      option.classList.add('selected');
    }
  });

  modal.style.display = 'flex';
}

function hideProfileModal() {
  const modal = document.getElementById('profile-modal');
  if (modal) modal.style.display = 'none';
}

async function saveProfile() {
  const nickname = document.getElementById('profile-nickname').value.trim();
  const selectedAvatar = document.querySelector('#profile-modal .avatar-option.selected');

  if (!nickname) {
    alert('请输入昵称');
    return;
  }

  const avatar = selectedAvatar ? selectedAvatar.dataset.avatar : '🐼';

  try {
    const { error } = await db
      .from('members')
      .update({ nickname, avatar })
      .eq('id', currentUser.id);

    if (error) {
      alert('保存失败：' + error.message);
      return;
    }

    currentProfile.nickname = nickname;
    currentProfile.avatar = avatar;
    displayUserInfo();
    loadMembers();
    hideProfileModal();
    alert('个人信息已保存');
  } catch (err) {
    alert('保存失败，请重试');
  }
}

// 加载成员列表 - 显示在线状态
async function loadMembers() {
  const { data: members, error } = await db
    .from('members')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('加载成员失败:', error);
    return;
  }

  const list = document.getElementById('members-list');
  const count = document.getElementById('online-count');

  if (members.length === 0) {
    list.innerHTML = '<p class="empty-text">还没有成员</p>';
    return;
  }

  // 计算在线人数
  const onlineMembers = members.filter(m => isUserOnline(m.last_seen));
  count.textContent = `${onlineMembers.length} 在线 / ${members.length} 成员`;

  // 按在线状态排序，在线的排前面
  const sortedMembers = [...members].sort((a, b) => {
    const aOnline = isUserOnline(a.last_seen) ? 0 : 1;
    const bOnline = isUserOnline(b.last_seen) ? 0 : 1;
    return aOnline - bOnline;
  });

  list.innerHTML = sortedMembers.map(member => {
    const online = isUserOnline(member.last_seen);
    return `
      <div class="member-item">
        <span class="member-avatar">${escapeHtml(member.avatar || '🐼')}</span>
        <span class="member-name">${escapeHtml(member.nickname)}</span>
        ${member.is_admin ? '<span class="admin-badge">管理员</span>' : ''}
        <span class="${online ? 'online-dot' : 'offline-dot'}" title="${online ? '在线' : '离线'}"></span>
      </div>
    `;
  }).join('');
}

// 加载通知
async function loadNotifications() {
  const { data: notifications, error } = await db
    .from('notifications')
    .select('*')
    .eq('member_id', currentUser.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('加载通知失败:', error);
    return;
  }

  const list = document.getElementById('notifications-list');

  if (!notifications || notifications.length === 0) {
    list.innerHTML = '<p class="empty-text">暂无通知</p>';
    return;
  }

  list.innerHTML = notifications.map(notif => `
    <div class="notification-item ${notif.is_read ? '' : 'unread'}" data-id="${notif.id}">
      <p>${notif.content}</p>
      <span class="notif-time">${formatTime(notif.created_at)}</span>
    </div>
  `).join('');
}

// 加载进行中的投票
async function loadActivePolls() {
  const { data: polls, error } = await db
    .from('polls')
    .select(`
      *,
      creator:members(nickname, avatar),
      options:poll_options(id, game:games(name)),
      votes:poll_votes(count)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('加载投票失败:', error);
    return;
  }

  const container = document.getElementById('active-polls');

  if (!polls || polls.length === 0) {
    container.innerHTML = '<p class="empty-text">暂无进行中的投票</p>';
    return;
  }

  container.innerHTML = polls.map(poll => `
    <div class="poll-preview" onclick="window.location.href='polls.html'">
      <div class="poll-question">${poll.question}</div>
      <div class="poll-meta">
        <span>${poll.creator?.avatar || '🐼'} ${poll.creator?.nickname || '未知'}</span>
        <span>${poll.options?.length || 0} 个选项</span>
      </div>
    </div>
  `).join('');
}

async function markAllNotificationsRead() {
  const { error } = await db
    .from('notifications')
    .update({ is_read: true })
    .eq('member_id', currentUser.id)
    .eq('is_read', false);

  if (error) {
    console.error('标记已读失败:', error);
    return;
  }

  loadNotifications();
}

// 订阅实时更新
let channels = [];

function subscribeToUpdates() {
  channels.forEach(ch => db.removeChannel(ch));
  channels = [];

  const ch1 = db
    .channel('notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `member_id=eq.${currentUser.id}`
    }, () => loadNotifications())
    .subscribe();
  channels.push(ch1);

  const ch2 = db
    .channel('polls')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'polls'
    }, () => loadActivePolls())
    .subscribe();
  channels.push(ch2);

  const ch3 = db
    .channel('members')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'members'
    }, () => loadMembers())
    .subscribe();
  channels.push(ch3);

  window.addEventListener('beforeunload', () => {
    channels.forEach(ch => db.removeChannel(ch));
  });
}

async function handleLogout() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  await db.auth.signOut();
  window.location.href = 'index.html';
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return date.toLocaleDateString('zh-CN');
}
