// 投票页面逻辑
document.addEventListener('DOMContentLoaded', async () => {
  const loggedIn = await checkAuth();
  if (!loggedIn) {
    window.location.href = 'index.html';
    return;
  }

  displayUserInfo();
  await loadPolls();
  await loadGamesForOptions();

  // 绑定事件
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('create-poll-btn').addEventListener('click', showCreateModal);
  document.getElementById('cancel-poll-btn').addEventListener('click', hideCreateModal);
  document.getElementById('submit-poll-btn').addEventListener('click', createPoll);

  // 订阅实时更新
  subscribeToPollUpdates();
});

let allGames = [];

// 显示用户信息
function displayUserInfo() {
  if (currentProfile) {
    document.getElementById('user-avatar').textContent = currentProfile.avatar || '🐼';
    document.getElementById('user-name').textContent = currentProfile.nickname || '未知用户';
  }
}

// 加载投票列表
async function loadPolls() {
  const { data: polls, error } = await db
    .from('polls')
    .select(`
      *,
      creator:members(nickname, avatar),
      options:poll_options(
        id,
        game:games(id, name)
      ),
      votes:poll_votes(
        id,
        option_id,
        member_id
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('加载投票失败:', error);
    return;
  }

  const container = document.getElementById('polls-list');

  if (!polls || polls.length === 0) {
    container.innerHTML = '<p class="empty-text">暂无投票，发起一个吧！</p>';
    return;
  }

  container.innerHTML = polls.map(poll => renderPollCard(poll)).join('');

  // 绑定投票事件
  container.querySelectorAll('.poll-option').forEach(option => {
    option.addEventListener('click', () => handleVote(option));
  });
}

// 渲染投票卡片
function renderPollCard(poll) {
  const totalVotes = poll.votes?.length || 0;
  const isActive = poll.is_active;
  const myVote = poll.votes?.find(v => v.member_id === currentUser.id);

  // 检查是否过期
  const isExpired = poll.deadline && new Date(poll.deadline) < new Date();
  const showAsActive = isActive && !isExpired;

  // 计算每个选项的票数
  const optionsHtml = poll.options?.map(option => {
    const votesForOption = poll.votes?.filter(v => v.option_id === option.id).length || 0;
    const percentage = totalVotes > 0 ? (votesForOption / totalVotes * 100) : 0;
    const isMyVote = myVote && myVote.option_id === option.id;

    return `
      <div class="poll-option ${isMyVote ? 'voted' : ''}"
           data-poll-id="${poll.id}"
           data-option-id="${option.id}"
           ${!showAsActive ? 'style="pointer-events: none;"' : ''}>
        <div class="poll-option-info">
          <div class="poll-option-name">${option.game?.name || '未知游戏'}</div>
          <div class="poll-option-votes">${votesForOption} 票</div>
          <div class="poll-option-bar">
            <div class="poll-option-bar-fill" style="width: ${percentage}%"></div>
          </div>
        </div>
      </div>
    `;
  }).join('') || '<p class="empty-text">暂无选项</p>';

  return `
    <div class="poll-card">
      <div class="poll-card-header">
        <div>
          <div class="poll-card-question">${poll.question}</div>
          <div class="poll-creator">
            ${poll.creator?.avatar || '🐼'} ${poll.creator?.nickname || '未知'} · ${formatTime(poll.created_at)}
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <span class="poll-status ${showAsActive ? '' : 'ended'}">
            ${showAsActive ? '进行中' : '已结束'}
          </span>
          <button class="btn btn-danger btn-sm" onclick="deletePoll(${poll.id})">🗑️</button>
        </div>
      </div>
      <div class="poll-options">
        ${optionsHtml}
      </div>
      <div class="poll-vote-count">
        共 ${totalVotes} 人投票
      </div>
    </div>
  `;
}

// 加载游戏列表用于选项
async function loadGamesForOptions() {
  const { data, error } = await db
    .from('games')
    .select('*')
    .order('name');

  if (error) {
    console.error('加载游戏失败:', error);
    return;
  }

  allGames = data || [];
}

// 显示创建模态框
function showCreateModal() {
  const modal = document.getElementById('create-poll-modal');
  const optionsList = document.getElementById('poll-options-list');

  // 渲染游戏选项
  optionsList.innerHTML = allGames.map(game => `
    <label class="checkbox-option">
      <input type="checkbox" value="${game.id}" class="game-checkbox">
      <span>${game.name} (${game.platform || '未知平台'})</span>
    </label>
  `).join('') || '<p class="empty-text">游戏库为空，请先添加游戏</p>';

  modal.style.display = 'flex';
}

// 隐藏创建模态框
function hideCreateModal() {
  document.getElementById('create-poll-modal').style.display = 'none';
  document.getElementById('poll-question').value = '';
  document.getElementById('poll-deadline').value = '';
}

// 创建投票
async function createPoll() {
  const question = document.getElementById('poll-question').value.trim();
  const deadline = document.getElementById('poll-deadline').value;
  const selectedGames = Array.from(document.querySelectorAll('.game-checkbox:checked'))
    .map(cb => parseInt(cb.value));

  if (!question) {
    alert('请输入投票问题');
    return;
  }

  if (selectedGames.length < 2) {
    alert('请至少选择两个游戏选项');
    return;
  }

  // 创建投票
  const { data: poll, error: pollError } = await db
    .from('polls')
    .insert({
      creator_id: currentUser.id,
      question,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      is_active: true
    })
    .select()
    .single();

  if (pollError) {
    alert('创建投票失败：' + pollError.message);
    return;
  }

  // 创建选项
  const options = selectedGames.map(gameId => ({
    poll_id: poll.id,
    game_id: gameId
  }));

  const { error: optionsError } = await db
    .from('poll_options')
    .insert(options);

  if (optionsError) {
    alert('创建选项失败：' + optionsError.message);
    return;
  }

  // 给所有人发通知
  const { data: members } = await db.from('members').select('id');
  if (members) {
    const notifications = members
      .filter(m => m.id !== currentUser.id)
      .map(m => ({
        member_id: m.id,
        content: `${currentProfile.nickname} 发起了投票：${question}`,
        link: 'polls.html'
      }));

    if (notifications.length > 0) {
      await db.from('notifications').insert(notifications);
    }
  }

  hideCreateModal();
  await loadPolls();
}

// 投票
async function handleVote(element) {
  const pollId = element.dataset.pollId;
  const optionId = element.dataset.optionId;

  // 检查是否已经投过票
  const { data: existingVote } = await db
    .from('poll_votes')
    .select('*')
    .eq('poll_id', pollId)
    .eq('member_id', currentUser.id)
    .single();

  if (existingVote) {
    // 更新投票
    await db
      .from('poll_votes')
      .update({ option_id: optionId })
      .eq('id', existingVote.id);
  } else {
    // 新投票
    await db
      .from('poll_votes')
      .insert({
        poll_id: pollId,
        option_id: optionId,
        member_id: currentUser.id
      });
  }

  await loadPolls();
}

// 删除投票
async function deletePoll(pollId) {
  if (!confirm('确定要删除这个投票吗？')) return;

  try {
    console.log('删除投票:', pollId);

    const { error: e1 } = await db.from('poll_votes').delete().eq('poll_id', pollId);
    if (e1) console.error('删除投票记录失败:', e1);

    const { error: e2 } = await db.from('poll_options').delete().eq('poll_id', pollId);
    if (e2) console.error('删除投票选项失败:', e2);

    const { error: e3 } = await db.from('polls').delete().eq('id', pollId);
    if (e3) {
      console.error('删除投票失败:', e3);
      alert('删除失败：' + e3.message);
      return;
    }

    console.log('删除成功');
    window.location.reload();
  } catch (err) {
    console.error('删除异常:', err);
    alert('删除失败：' + err.message);
  }
}

// 订阅实时更新（仅用于新投票通知，不用于刷新列表）
function subscribeToPollUpdates() {
  // 不自动刷新，避免删除后又加载回来
}

// 格式化时间
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return date.toLocaleDateString('zh-CN');
}

// 退出登录
async function handleLogout() {
  await db.auth.signOut();
  window.location.href = 'index.html';
}
