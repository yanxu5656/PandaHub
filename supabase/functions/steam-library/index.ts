// Supabase Edge Function - 获取 Steam 游戏库
// 部署到 Supabase 后，前端调用此函数获取游戏列表

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const STEAM_API_KEY = Deno.env.get('STEAM_API_KEY') || '';

serve(async (req) => {
  // 处理 CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { steamId } = await req.json();

    if (!steamId) {
      return new Response(
        JSON.stringify({ error: '请输入 Steam ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 调用 Steam API
    const steamUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamId}&format=json&include_appinfo=1&include_played_free_games=1`;

    const response = await fetch(steamUrl);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'Steam API 请求失败' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    if (!data.response || !data.response.games) {
      return new Response(
        JSON.stringify({
          error: '无法获取游戏库，请确保 Steam 个人资料设置为公开'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 返回游戏列表
    return new Response(
      JSON.stringify({
        game_count: data.response.game_count,
        games: data.response.games.map((game: any) => ({
          steam_appid: game.appid,
          name: game.name,
          platform: 'Steam',
          playtime: game.playtime_forever,
          header_image: `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`
        }))
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
