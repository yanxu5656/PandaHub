// Steam 游戏库集成

// Steam Store 搜索 API（无需代理）
const STEAM_STORE_SEARCH = 'https://store.steampowered.com/api/storesearch/';

// Supabase Edge Function URL（部署后替换）
const STEAM_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/steam-library`;

// 搜索 Steam 游戏（直接调用，无需代理）
async function searchSteamGames(query) {
  if (!query || query.length < 2) return [];

  try {
    const url = `${STEAM_STORE_SEARCH}?term=${encodeURIComponent(query)}&l=schinese&cc=CN`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    if (!data.items) return [];

    return data.items.map(item => ({
      steam_appid: item.id,
      name: item.name,
      platform: 'Steam',
      max_players: item.max_players || null,
      header_image: item.header_image || `https://cdn.akamai.steamstatic.com/steam/apps/${item.id}/header.jpg`,
      price: item.price ? (item.price.final / 100).toFixed(2) : '免费'
    }));
  } catch (err) {
    console.error('Steam 搜索失败:', err);
    return [];
  }
}

// 获取用户 Steam 游戏库（通过 Edge Function）
async function getSteamLibrary(steamId) {
  if (!steamId) {
    throw new Error('请输入 Steam ID');
  }

  try {
    const response = await fetch(STEAM_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ steamId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '获取游戏库失败');
    }

    const data = await response.json();

    if (!data.games || data.games.length === 0) {
      throw new Error('未找到游戏，请确保 Steam 个人资料设置为公开');
    }

    return {
      game_count: data.game_count,
      games: data.games
    };
  } catch (err) {
    throw new Error('获取游戏库失败：' + err.message);
  }
}

// 获取游戏详情
async function getSteamGameDetails(appid) {
  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&l=schinese&cc=CN`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data[appid] || !data[appid].success) return null;

    const game = data[appid].data;
    return {
      steam_appid: appid,
      name: game.name,
      description: game.short_description,
      platform: 'Steam',
      header_image: game.header_image,
      genres: game.genres?.map(g => g.description) || [],
      release_date: game.release_date?.date
    };
  } catch (err) {
    console.error('获取游戏详情失败:', err);
    return null;
  }
}
