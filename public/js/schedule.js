// 时间协调页面逻辑
document.addEventListener('DOMContentLoaded', async () => {
  const loggedIn = await checkAuth();
  if (!loggedIn) { window.location.href = 'index.html'; return; }

  displayUserInfo();
  initWeekSelector();
  await loadSchedule();
  await loadActivities();

  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('prev-week').addEventListener('click', () => changeWeek(-1));
  document.getElementById('next-week').addEventListener('click', () => changeWeek(1));
  document.getElementById('today-btn').addEventListener('click', goToToday);
  document.getElementById('create-activity-btn').addEventListener('click', createActivity);
});

// 全局状态
let currentWeekStart = getWeekStart(new Date());
let allAvailability = [];
let allMembers = [];
let allGames = [];
let selectedSlots = new Set();
let isDragging = false;
let saveTimeout = null;

function displayUserInfo() {
  if (currentProfile) {
    document.getElementById('user-avatar').textContent = currentProfile.avatar || '🐼';
    document.getElementById('user-name').textContent = currentProfile.nickname || '未知用户';
  }
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function initWeekSelector() {
  updateWeekLabel();
}

function updateWeekLabel() {
  const label = document.getElementById('week-label');
  const end = new Date(currentWeekStart);
  end.setDate(end.getDate() + 6);
  const isThisWeek = getWeekStart(new Date()).getTime() === currentWeekStart.getTime();
  label.textContent = isThisWeek ? '本周' : `${currentWeekStart.getMonth() + 1}月${currentWeekStart.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`;
}

function changeWeek(direction) {
  currentWeekStart.setDate(currentWeekStart.getDate() + direction * 7);
  updateWeekLabel();
  loadSchedule();
}

function goToToday() {
  currentWeekStart = getWeekStart(new Date());
  updateWeekLabel();
  loadSchedule();
}

// 加载时间表数据
async function loadSchedule() {
  try {
    // 并行加载
    const [availResult, membersResult, gamesResult] = await Promise.all([
      db.from('availability').select('*'),
      db.from('members').select('id, nickname, avatar'),
      db.from('games').select('*')
    ]);

    allAvailability = availResult.data || [];
    allMembers = membersResult.data || [];
    allGames = gamesResult.data || [];

    // 初始化 selectedSlots 为当前用户的已有选择
    selectedSlots = new Set();
    allAvailability
      .filter(a => a.member_id === currentUser.id)
      .forEach(a => selectedSlots.add(`${a.date}-${a.hour}`));

    renderSchedule();
    updateCommonFreeSummary();
  } catch (err) {
    console.error('加载时间表失败:', err);
  }
}

// 渲染时间表
function renderSchedule() {
  const grid = document.getElementById('schedule-grid');
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }

  let html = '<table class="schedule-table"><thead><tr><th class="time-col">时间</th>';
  dates.forEach((date, i) => {
    const isToday = date.toDateString() === new Date().toDateString();
    html += `<th class="day-col ${isToday ? 'today' : ''}">
      <div class="day-name">${days[i]}</div>
      <div class="day-date">${date.getMonth() + 1}/${date.getDate()}</div>
    </th>`;
  });
  html += '</tr></thead><tbody>';

  // 只显示 8:00 - 24:00（常用时间段）
  for (let hour = 8; hour < 24; hour++) {
    html += '<tr>';
    html += `<td class="time-cell">${hour.toString().padStart(2, '0')}:00</td>`;

    dates.forEach((date) => {
      const dateStr = date.toISOString().split('T')[0];
      const key = `${dateStr}-${hour}`;

      // 获取这个时间段有空的成员
      const availableHere = allAvailability.filter(a => a.date === dateStr && a.hour === hour);
      const isMySlot = selectedSlots.has(key);
      const memberCount = availableHere.length;
      const allFree = memberCount === allMembers.length && allMembers.length > 1;

      // 获取有空的成员名字
      const memberNames = availableHere.map(a => {
        const member = allMembers.find(m => m.id === a.member_id);
        return member ? member.nickname : '?';
      });

      let cellClass = 'schedule-cell';
      if (allFree) cellClass += ' all-free';
      else if (memberCount > 0) cellClass += ' some-free';
      if (isMySlot) cellClass += ' my-slot';

      html += `<td class="${cellClass}" data-date="${dateStr}" data-hour="${hour}" data-key="${key}">
        <div class="cell-content">
          ${memberCount > 0 ? `<span class="member-count">${memberCount}</span>` : ''}
          ${isMySlot ? '<span class="my-mark">✓</span>' : ''}
          ${memberNames.length > 0 ? `<span class="member-names" title="${memberNames.join(', ')}">${memberNames.map(n => n.charAt(0)).join('')}</span>` : ''}
        </div>
      </td>`;
    });

    html += '</tr>';
  }

  html += '</tbody></table>';
  grid.innerHTML = html;
  bindDragEvents();
}

// 绑定拖拽选择
function bindDragEvents() {
  const cells = document.querySelectorAll('.schedule-cell');

  cells.forEach(cell => {
    cell.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isDragging = true;
      toggleCell(cell);
    });

    cell.addEventListener('mouseenter', () => {
      if (isDragging) toggleCell(cell);
    });

    cell.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        saveAvailability();
      }
    });
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      saveAvailability();
    }
  });
}

// 切换单元格
function toggleCell(cell) {
  const key = cell.dataset.key;

  if (selectedSlots.has(key)) {
    selectedSlots.delete(key);
    cell.classList.remove('my-slot');
  } else {
    selectedSlots.add(key);
    cell.classList.add('my-slot');
  }
}

// 保存可用时间
async function saveAvailability() {
  // 防抖：避免频繁保存
  if (saveTimeout) clearTimeout(saveTimeout);

  saveTimeout = setTimeout(async () => {
    try {
      // 1. 删除当前用户的所有可用时间
      const { error: deleteError } = await db
        .from('availability')
        .delete()
        .eq('member_id', currentUser.id);

      if (deleteError) {
        console.error('删除旧数据失败:', deleteError);
      }

      // 2. 插入新的可用时间
      if (selectedSlots.size > 0) {
        const records = Array.from(selectedSlots).map(key => {
          // key 格式: "YYYY-MM-DD-HH"
          const parts = key.split('-');
          const hour = parts.pop(); // 最后一个是小时
          const date = parts.join('-'); // 剩余的是日期
          return {
            member_id: currentUser.id,
            date: date,
            hour: parseInt(hour)
          };
        });

        const { error: insertError } = await db
          .from('availability')
          .insert(records);

        if (insertError) {
          console.error('保存失败:', insertError);
          alert('保存失败：' + insertError.message);
        }
      }

      // 3. 重新加载数据
      await loadSchedule();
    } catch (err) {
      console.error('保存异常:', err);
    }
  }, 300); // 300ms 防抖
}

// 更新共同空闲时间汇总
function updateCommonFreeSummary() {
  const summary = document.getElementById('common-free-summary');
  const createBtn = document.getElementById('create-activity-btn');

  const commonSlots = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];

    for (let hour = 8; hour < 24; hour++) {
      const available = allAvailability.filter(a => a.date === dateStr && a.hour === hour);
      if (available.length >= 2) {
        const isMeIncluded = available.some(a => a.member_id === currentUser.id);
        if (isMeIncluded) {
          const members = available.map(a => {
            const member = allMembers.find(m => m.id === a.member_id);
            return member ? `${member.avatar} ${member.nickname}` : '?';
          });

          commonSlots.push({ date: dateStr, hour, members, count: available.length });
        }
      }
    }
  }

  if (commonSlots.length === 0) {
    summary.innerHTML = '<p class="empty-text">本周还没有共同空闲时间，快去填写你的时间吧！</p>';
    createBtn.disabled = true;
    return;
  }

  commonSlots.sort((a, b) => b.count - a.count);

  const grouped = {};
  commonSlots.forEach(slot => {
    if (!grouped[slot.date]) grouped[slot.date] = [];
    grouped[slot.date].push(slot);
  });

  let html = '';
  Object.entries(grouped).forEach(([date, slots]) => {
    const d = new Date(date);
    const dayName = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];

    html += `<div class="common-day">
      <h4>${dayName} ${d.getMonth() + 1}月${d.getDate()}日</h4>
      <div class="common-slots">`;

    slots.forEach(slot => {
      html += `<div class="common-slot" data-date="${slot.date}" data-hour="${slot.hour}">
        <span class="slot-time">${slot.hour.toString().padStart(2, '0')}:00</span>
        <span class="slot-members">${slot.members.join(', ')}</span>
        <span class="slot-count">${slot.count}人有空</span>
      </div>`;
    });

    html += '</div></div>';
  });

  summary.innerHTML = html;
  createBtn.disabled = false;

  // 绑定点击选择
  summary.querySelectorAll('.common-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      summary.querySelectorAll('.common-slot').forEach(s => s.classList.remove('selected'));
      slot.classList.add('selected');
    });
  });
}

// 创建活动
async function createActivity() {
  const selectedCommon = document.querySelector('.common-slot.selected');
  if (!selectedCommon) {
    alert('请先点击一个共同空闲时间段');
    return;
  }

  const date = selectedCommon.dataset.date;
  const hour = parseInt(selectedCommon.dataset.hour);

  try {
    const { data, error } = await db
      .from('activities')
      .insert({ creator_id: currentUser.id, date, start_hour: hour, end_hour: hour + 1 })
      .select()
      .single();

    if (error) {
      alert('创建活动失败：' + error.message);
      return;
    }

    await db.from('activity_participants').insert({ activity_id: data.id, member_id: currentUser.id });

    // 通知其他人
    const availableMembers = allAvailability
      .filter(a => a.date === date && a.hour === hour)
      .map(a => a.member_id)
      .filter(id => id !== currentUser.id);

    if (availableMembers.length > 0) {
      const notifications = availableMembers.map(memberId => ({
        member_id: memberId,
        content: `${currentProfile.nickname} 创建了一个活动：${date} ${hour}:00`,
        link: 'lobby.html'
      }));
      await db.from('notifications').insert(notifications);
    }

    alert('活动创建成功！');
  } catch (err) {
    alert('创建失败：' + err.message);
  }
}

async function handleLogout() {
  await db.auth.signOut();
  window.location.href = 'index.html';
}

// 加载活动列表
async function loadActivities() {
  const container = document.getElementById('activities-list');
  if (!container) return;

  try {
    const { data: activities, error } = await db
      .from('activities')
      .select(`
        *,
        creator:members(nickname, avatar),
        participants:activity_participants(member_id, member:members(nickname, avatar))
      `)
      .order('date', { ascending: true });

    if (error) {
      console.error('加载活动失败:', error);
      return;
    }

    if (!activities || activities.length === 0) {
      container.innerHTML = '<p class="empty-text">暂无活动</p>';
      return;
    }

    container.innerHTML = activities.map(activity => {
      const isCreator = activity.creator_id === currentUser.id;
      const participantNames = activity.participants?.map(p =>
        p.member ? `${p.member.avatar} ${p.member.nickname}` : '?'
      ).join(', ') || '';

      return `
        <div class="activity-item">
          <div class="activity-info">
            <div class="activity-time">${activity.date} ${activity.start_hour}:00 - ${activity.end_hour}:00</div>
            <div class="activity-creator">${activity.creator?.avatar || '🐼'} ${activity.creator?.nickname || '未知'} 发起</div>
            <div class="activity-participants">参与：${participantNames || '暂无'}</div>
          </div>
          ${isCreator ? `<button class="btn btn-danger btn-sm" onclick="deleteActivity(${activity.id})">🗑️</button>` : ''}
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('加载活动异常:', err);
  }
}

// 删除活动
async function deleteActivity(activityId) {
  if (!confirm('确定要删除这个活动吗？')) return;

  try {
    await db.from('activity_participants').delete().eq('activity_id', activityId);
    await db.from('activities').delete().eq('id', activityId);
    await loadActivities();
    alert('活动已删除');
  } catch (err) {
    alert('删除失败：' + err.message);
  }
}
