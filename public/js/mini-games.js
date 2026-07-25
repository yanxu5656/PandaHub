// 小游戏页面逻辑
document.addEventListener('DOMContentLoaded', async () => {
  const loggedIn = await checkAuth();
  if (!loggedIn) { window.location.href = 'index.html'; return; }
  displayUserInfo();
  await loadRooms();
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
});

function displayUserInfo() {
  if (currentProfile) {
    document.getElementById('user-avatar').textContent = currentProfile.avatar || '🐼';
    document.getElementById('user-name').textContent = currentProfile.nickname || '未知用户';
  }
}

// 加载房间列表 - 优化查询
async function loadRooms() {
  const container = document.getElementById('rooms-list');
  container.innerHTML = '<p class="empty-text">加载中...</p>';

  try {
    // 一次性获取所有房间
    const { data: rooms, error } = await db
      .from('game_rooms')
      .select('*')
      .in('status', ['waiting', 'playing'])
      .order('created_at', { ascending: false });

    if (error) {
      container.innerHTML = '<p class="empty-text">加载失败</p>';
      return;
    }

    if (!rooms || rooms.length === 0) {
      container.innerHTML = '<p class="empty-text">暂无游戏房间，点击上方卡片创建一个吧！</p>';
      return;
    }

    // 批量获取所有房间的玩家数量
    const roomIds = rooms.map(r => r.id);
    const { data: allPlayers } = await db
      .from('game_room_players')
      .select('room_id')
      .in('room_id', roomIds);

    // 统计每个房间的玩家数
    const playerCounts = {};
    if (allPlayers) {
      allPlayers.forEach(p => {
        playerCounts[p.room_id] = (playerCounts[p.room_id] || 0) + 1;
      });
    }

    // 批量获取房主信息
    const hostIds = [...new Set(rooms.map(r => r.host_id))];
    const { data: hosts } = await db
      .from('members')
      .select('id, nickname, avatar')
      .in('id', hostIds);

    const hostMap = {};
    if (hosts) hosts.forEach(h => hostMap[h.id] = h);

    // 渲染
    const gameNames = { 'draw': '🎨 你画我猜', 'gomoku': '⚫ 五子棋', 'tictactoe': '❌ 井字棋' };

    container.innerHTML = rooms.map(room => {
      const isHost = room.host_id === currentUser.id;
      const count = playerCounts[room.id] || 0;
      const host = hostMap[room.host_id];

      return `
        <div class="room-item">
          <div class="room-info">
            <div class="room-icon">${room.game_type === 'draw' ? '🎨' : room.game_type === 'gomoku' ? '⚫' : '❌'}</div>
            <div class="room-details">
              <h4>${gameNames[room.game_type] || room.game_type}</h4>
              <p>${host?.avatar || '🐼'} ${host?.nickname || '未知'} · ${count} 人</p>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span class="room-status ${room.status}">${room.status === 'waiting' ? '等待中' : '游戏中'}</span>
            <button class="btn btn-accent btn-sm" onclick="joinRoom(${room.id}, '${room.game_type}')">进入</button>
            ${isHost ? `<button class="btn btn-danger btn-sm" onclick="deleteRoom(${room.id})">删除</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = '<p class="empty-text">加载失败：' + err.message + '</p>';
  }
}

// 创建房间
async function createRoom(gameType) {
  try {
    const { data: room, error } = await db
      .from('game_rooms')
      .insert({ game_type: gameType, host_id: currentUser.id, status: 'waiting', state: {} })
      .select()
      .single();

    if (error) {
      alert('创建房间失败：' + error.message);
      return;
    }

    await db.from('game_room_players').insert({ room_id: room.id, member_id: currentUser.id, score: 0 });
    window.location.href = `${gameType}.html?room=${room.id}`;
  } catch (err) {
    alert('创建房间失败：' + err.message);
  }
}

// 加入房间
async function joinRoom(roomId, gameType) {
  try {
    const { data: existing } = await db
      .from('game_room_players')
      .select('*')
      .eq('room_id', roomId)
      .eq('member_id', currentUser.id)
      .single();

    if (!existing) {
      await db.from('game_room_players').insert({ room_id: roomId, member_id: currentUser.id, score: 0 });
    }

    window.location.href = `${gameType}.html?room=${roomId}`;
  } catch (err) {
    alert('加入房间失败：' + err.message);
  }
}

// 删除房间
async function deleteRoom(roomId) {
  if (!confirm('确定要删除这个房间吗？')) return;

  try {
    await db.from('game_room_players').delete().eq('room_id', roomId);
    await db.from('game_rooms').delete().eq('id', roomId);
    await loadRooms();
  } catch (err) {
    alert('删除失败：' + err.message);
  }
}

async function handleLogout() {
  await db.auth.signOut();
  window.location.href = 'index.html';
}
