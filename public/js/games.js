// 游戏库页面逻辑
document.addEventListener('DOMContentLoaded', async () => {
  const loggedIn = await checkAuth();
  if (!loggedIn) {
    window.location.href = 'index.html';
    return;
  }

  displayUserInfo();
  await loadGames();

  // 绑定事件
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('manual-add-btn').addEventListener('click', showAddModal);
  document.getElementById('cancel-game-btn').addEventListener('click', hideAddModal);
  document.getElementById('submit-game-btn').addEventListener('click', addGame);
  document.getElementById('steam-search-btn').addEventListener('click', doSteamSearch);
  document.getElementById('steam-search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') doSteamSearch();
  });

  // Steam 导入
  document.getElementById('steam-import-btn').addEventListener('click', showSteamImportModal);
  document.getElementById('cancel-import-btn').addEventListener('click', hideSteamImportModal);
  document.getElementById('start-import-btn').addEventListener('click', startSteamImport);

  // 编辑游戏
  document.getElementById('cancel-edit-btn').addEventListener('click', hideEditModal);
  document.getElementById('save-edit-btn').addEventListener('click', saveGameEdit);
});

let allMembers = [];
let searchTimeout = null;

// 显示用户信息
function displayUserInfo() {
  if (currentProfile) {
    document.getElementById('user-avatar').textContent = currentProfile.avatar || '🐼';
    document.getElementById('user-name').textContent = currentProfile.nickname || '未知用户';
  }
}

// ===== Steam 搜索 =====
async function doSteamSearch() {
  const query = document.getElementById('steam-search-input').value.trim();
  if (!query) return;

  const resultsDiv = document.getElementById('search-results');
  resultsDiv.style.display = 'block';
  resultsDiv.innerHTML = '<div class="loading-spinner">搜索中...</div>';

  try {
    const games = await searchSteamGames(query);

    if (games.length === 0) {
      resultsDiv.innerHTML = '<p class="empty-text">没有找到游戏</p>';
      return;
    }

    resultsDiv.innerHTML = games.map(game => `
      <div class="steam-game-card" onclick='addSteamGame(${JSON.stringify(game).replace(/'/g, "\\'")})'>
        <img src="${game.header_image}" alt="${game.name}" loading="lazy">
        <div class="steam-game-info">
          <div class="steam-game-name">${game.name}</div>
          <div class="steam-game-price">${game.price === '0.00' || game.price === '免费' ? '免费' : '¥' + game.price}</div>
          <div class="steam-game-tags">
            ${game.genres.slice(0, 3).map(g => `<span class="steam-tag">${g}</span>`).join('')}
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    resultsDiv.innerHTML = '<p class="empty-text">搜索失败，请稍后重试</p>';
    console.error('Steam 搜索错误:', err);
  }
}

// 添加 Steam 游戏到库
async function addSteamGame(game) {
  // 检查是否已存在
  const { data: existing } = await db
    .from('games')
    .select('id')
    .eq('name', game.name)
    .eq('platform', 'Steam')
    .single();

  if (existing) {
    // 已存在，直接标记拥有
    const { data: owned } = await db
      .from('member_games')
      .select('id')
      .eq('member_id', currentUser.id)
      .eq('game_id', existing.id)
      .single();

    if (!owned) {
      await db.from('member_games').insert({
        member_id: currentUser.id,
        game_id: existing.id
      });
    }

    alert(`"${game.name}" 已在游戏库中，已标记为你拥有`);
  } else {
    // 添加新游戏
    const { data: newGame, error } = await db
      .from('games')
      .insert({
        name: game.name,
        platform: 'Steam',
        max_players: game.max_players || null,
        genre: game.genres[0] || '未分类',
        added_by: currentUser.id
      })
      .select()
      .single();

    if (error) {
      alert('添加失败：' + error.message);
      return;
    }

    // 标记拥有
    await db.from('member_games').insert({
      member_id: currentUser.id,
      game_id: newGame.id
    });

    alert(`已添加 "${game.name}" 到游戏库`);
  }

  // 清空搜索
  document.getElementById('steam-search-input').value = '';
  document.getElementById('search-results').style.display = 'none';

  await loadGames();
}

// ===== 加载游戏数据 =====
async function loadGames() {
  const [gamesResult, membersResult, memberGamesResult] = await Promise.all([
    db.from('games').select('*').order('name'),
    db.from('members').select('*'),
    db.from('member_games').select('*')
  ]);

  const games = gamesResult.data || [];
  allMembers = membersResult.data || [];
  const memberGames = memberGamesResult.data || [];

  const gamesWithOwners = games.map(game => {
    const owners = memberGames
      .filter(mg => mg.game_id === game.id)
      .map(mg => mg.member_id);
    return { ...game, owners, ownerCount: owners.length };
  });

  // 多人拥有（2人及以上）
  const sharedGames = gamesWithOwners.filter(g => g.ownerCount >= 2);

  renderSharedGames(sharedGames);
  renderAllGames(gamesWithOwners, memberGames);
}

// 渲染多人拥有的游戏
function renderSharedGames(games) {
  const container = document.getElementById('common-games');

  if (games.length === 0) {
    container.innerHTML = '<p class="empty-text">还没有多人拥有的游戏</p>';
    return;
  }

  container.innerHTML = games.map(game => renderGameCard(game, true)).join('');

  // 绑定事件
  container.querySelectorAll('.toggle-own-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleGameOwnership(btn));
  });
  container.querySelectorAll('.delete-game-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteGame(btn));
  });
  container.querySelectorAll('.edit-game-btn').forEach(btn => {
    btn.addEventListener('click', () => showEditModal(parseInt(btn.dataset.gameId)));
  });
}

// 渲染全部游戏（按类型分类）
function renderAllGames(games, memberGames) {
  const container = document.getElementById('all-games');

  if (games.length === 0) {
    container.innerHTML = '<p class="empty-text">游戏库为空，点击上方添加游戏吧！</p>';
    return;
  }

  // 按类型分类
  const grouped = {};
  games.forEach(game => {
    const genre = game.genre || '其他';
    if (!grouped[genre]) grouped[genre] = [];
    grouped[genre].push(game);
  });

  // 类型排序
  const genreOrder = ['FPS', 'RPG', 'MOBA', '合作', '竞技', '休闲', 'Steam', 'PC', '其他'];
  const sortedGenres = Object.keys(grouped).sort((a, b) => {
    const aIdx = genreOrder.indexOf(a);
    const bIdx = genreOrder.indexOf(b);
    if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  let html = '';
  sortedGenres.forEach(genre => {
    html += `<div class="platform-section">
      <h4 class="platform-title">${getGenreIcon(genre)} ${genre} (${grouped[genre].length})</h4>
      <div class="games-grid">`;

    grouped[genre].forEach(game => {
      const isOwned = memberGames.some(
        mg => mg.game_id === game.id && mg.member_id === currentUser.id
      );
      html += renderGameCard(game, false, isOwned);
    });

    html += '</div></div>';
  });

  container.innerHTML = html;

  // 绑定事件
  container.querySelectorAll('.toggle-own-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleGameOwnership(btn));
  });
  container.querySelectorAll('.delete-game-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteGame(btn));
  });
  container.querySelectorAll('.edit-game-btn').forEach(btn => {
    btn.addEventListener('click', () => showEditModal(parseInt(btn.dataset.gameId)));
  });
}

// 获取类型图标
function getGenreIcon(genre) {
  const icons = {
    'FPS': '🔫',
    'RPG': '⚔️',
    'MOBA': '🏟️',
    '合作': '🤝',
    '竞技': '🏆',
    '休闲': '🎯',
    'Steam': '🎮',
    'PC': '💻',
    '其他': '📦'
  };
  return icons[genre] || '🎮';
}

// 渲染游戏卡片
function renderGameCard(game, isCommon, isOwned = false) {
  const owners = game.owners || [];
  const ownerNames = owners.map(id => {
    const member = allMembers.find(m => m.id === id);
    return member ? `${member.avatar} ${member.nickname}` : '未知';
  });

  return `
    <div class="game-card">
      <div class="game-card-header">
        <div class="game-name">${escapeHtml(game.name)}</div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-sm btn-outline edit-game-btn" data-game-id="${game.id}" title="编辑">✏️</button>
          <button class="btn btn-sm btn-danger delete-game-btn" data-game-id="${game.id}" title="删除">🗑️</button>
        </div>
      </div>
      <div class="game-info">
        ${game.platform ? `<span>🖥️ ${escapeHtml(game.platform)}</span>` : ''}
        ${game.max_players ? `<span>👥 ${game.max_players}人</span>` : ''}
        ${game.genre ? `<span class="game-genre">${escapeHtml(game.genre)}</span>` : ''}
      </div>
      <div class="game-owners">
        ${isCommon ? '✅ 大家都有' : `${game.ownerCount || 0} 人拥有`}
        ${ownerNames.length > 0 ? `：${ownerNames.join(', ')}` : ''}
      </div>
      <div class="game-actions">
        <button class="btn btn-sm ${isOwned ? 'btn-outline' : 'btn-accent'} toggle-own-btn"
                data-game-id="${game.id}"
                data-owned="${isOwned}">
          ${isOwned ? '取消拥有' : '我也有'}
        </button>
      </div>
    </div>
  `;
}

// 彻底删除游戏
async function deleteGame(btn) {
  const gameId = parseInt(btn.dataset.gameId);
  console.log('删除游戏:', gameId);

  if (!confirm('确定要从游戏库中彻底删除这个游戏吗？')) return;

  try {
    // 1. 删除拥有记录
    const { error: e1 } = await db.from('member_games').delete().eq('game_id', gameId);
    if (e1) console.error('删除拥有记录失败:', e1);

    // 2. 删除投票选项
    const { error: e2 } = await db.from('poll_options').delete().eq('game_id', gameId);
    if (e2) console.error('删除投票选项失败:', e2);

    // 3. 删除游戏
    const { error: e3 } = await db.from('games').delete().eq('id', gameId);
    if (e3) {
      console.error('删除游戏失败:', e3);
      alert('删除游戏失败：' + e3.message);
      return;
    }

    console.log('删除成功，刷新页面');
    window.location.reload();
  } catch (err) {
    console.error('删除异常:', err);
    alert('删除失败：' + err.message);
  }
}

// 显示手动添加模态框
function showAddModal() {
  document.getElementById('add-game-modal').style.display = 'flex';
}

// 隐藏手动添加模态框
function hideAddModal() {
  document.getElementById('add-game-modal').style.display = 'none';
  document.getElementById('game-name').value = '';
  document.getElementById('game-max-players').value = '4';
}

// 显示编辑模态框
function showEditModal(gameId) {
  const game = allGames.find(g => g.id === gameId);
  if (!game) return;

  document.getElementById('edit-game-id').value = game.id;
  document.getElementById('edit-game-name').value = game.name || '';
  document.getElementById('edit-game-platform').value = game.platform || 'PC';
  document.getElementById('edit-game-max-players').value = game.max_players || 4;
  document.getElementById('edit-game-genre').value = game.genre || '其他';

  document.getElementById('edit-game-modal').style.display = 'flex';
}

// 隐藏编辑模态框
function hideEditModal() {
  document.getElementById('edit-game-modal').style.display = 'none';
}

// 保存编辑
async function saveGameEdit() {
  const gameId = parseInt(document.getElementById('edit-game-id').value);
  const name = document.getElementById('edit-game-name').value.trim();
  const platform = document.getElementById('edit-game-platform').value;
  const maxPlayers = parseInt(document.getElementById('edit-game-max-players').value);
  const genre = document.getElementById('edit-game-genre').value;

  if (!name) {
    alert('游戏名称不能为空');
    return;
  }

  try {
    const { error } = await db
      .from('games')
      .update({
        name,
        platform,
        max_players: maxPlayers,
        genre
      })
      .eq('id', gameId);

    if (error) {
      alert('保存失败：' + error.message);
      return;
    }

    hideEditModal();
    window.location.reload();
  } catch (err) {
    alert('保存失败：' + err.message);
  }
}

// 手动添加游戏
async function addGame() {
  const name = document.getElementById('game-name').value.trim();
  const platform = document.getElementById('game-platform').value;
  const maxPlayers = parseInt(document.getElementById('game-max-players').value);
  const genre = document.getElementById('game-genre').value;

  if (!name) {
    alert('请输入游戏名称');
    return;
  }

  const { data: game, error: gameError } = await db
    .from('games')
    .insert({
      name,
      platform,
      max_players: maxPlayers,
      genre,
      added_by: currentUser.id
    })
    .select()
    .single();

  if (gameError) {
    alert('添加游戏失败：' + gameError.message);
    return;
  }

  await db
    .from('member_games')
    .insert({
      member_id: currentUser.id,
      game_id: game.id
    });

  hideAddModal();
  await loadGames();
}

// 切换游戏拥有状态
async function toggleGameOwnership(btn) {
  const gameId = parseInt(btn.dataset.gameId);
  const isOwned = btn.dataset.owned === 'true';

  if (isOwned) {
    await db
      .from('member_games')
      .delete()
      .eq('member_id', currentUser.id)
      .eq('game_id', gameId);
  } else {
    await db
      .from('member_games')
      .insert({
        member_id: currentUser.id,
        game_id: gameId
      });
  }

  await loadGames();
}

// 退出登录
async function handleLogout() {
  await db.auth.signOut();
  window.location.href = 'index.html';
}

// ===== Steam 导入功能 =====
function showSteamImportModal() {
  document.getElementById('steam-import-modal').style.display = 'flex';
}

function hideSteamImportModal() {
  document.getElementById('steam-import-modal').style.display = 'none';
  document.getElementById('import-status').style.display = 'none';
}

async function startSteamImport() {
  const gameListText = document.getElementById('game-list-input').value.trim();
  const genre = document.getElementById('game-genre-select').value;
  const statusDiv = document.getElementById('import-status');

  if (!gameListText) {
    alert('请输入游戏名称');
    return;
  }

  const gameNames = gameListText.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (gameNames.length === 0) {
    alert('未找到有效的游戏名称');
    return;
  }

  statusDiv.style.display = 'block';
  statusDiv.innerHTML = `⏳ 正在添加 ${gameNames.length} 个游戏...`;
  document.getElementById('start-import-btn').disabled = true;

  try {
    let added = 0;
    let skipped = 0;

    for (const name of gameNames) {
      try {
        const { data: existing } = await db
          .from('games')
          .select('id')
          .eq('name', name)
          .single();

        let gameId;

        if (existing) {
          gameId = existing.id;
          skipped++;
        } else {
          const { data: newGame, error } = await db
            .from('games')
            .insert({
              name: name,
              platform: 'PC',
              genre: genre,
              added_by: currentUser.id
            })
            .select()
            .single();

          if (error) {
            console.error('添加失败:', name, error);
            continue;
          }

          gameId = newGame.id;
          added++;
        }

        const { data: owned } = await db
          .from('member_games')
          .select('id')
          .eq('member_id', currentUser.id)
          .eq('game_id', gameId)
          .single();

        if (!owned) {
          await db.from('member_games').insert({
            member_id: currentUser.id,
            game_id: gameId
          });
        }

        statusDiv.innerHTML = `⏳ 正在添加... ${added + skipped}/${gameNames.length}`;
      } catch (err) {
        console.error('添加异常:', name, err);
      }
    }

    statusDiv.innerHTML = `✅ 完成！新增 ${added} 个，跳过 ${skipped} 个`;

    await loadGames();

    setTimeout(() => {
      hideSteamImportModal();
      document.getElementById('game-list-input').value = '';
    }, 2000);

  } catch (err) {
    statusDiv.innerHTML = '❌ 失败：' + err.message;
  } finally {
    document.getElementById('start-import-btn').disabled = false;
  }
}
