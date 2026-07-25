# Steam 游戏库自动导入设置

## 1. 获取 Steam Web API Key

1. 访问 https://steamcommunity.com/dev/apikey
2. 登录你的 Steam 账号
3. 填写域名（可以填 `localhost`）
4. 点击"Register"获取 API Key

## 2. 部署 Supabase Edge Function

### 安装 Supabase CLI

```bash
# Windows
scoop install supabase

# 或者使用 npm
npm install -g supabase
```

### 登录 Supabase

```bash
supabase login
```

### 部署 Edge Function

```bash
cd D:\cs\CC_Program\Helper

# 设置 Steam API Key
supabase secrets set STEAM_API_KEY=你的API_KEY

# 部署函数
supabase functions deploy steam-library
```

## 3. 测试

1. 打开 http://localhost:8000/games.html
2. 点击"🎮 导入 Steam 游戏库"
3. 输入你的 Steam ID
4. 点击"开始导入"

## 注意事项

- Steam 个人资料需要设置为公开
- 游戏详情需要设置为公开
- Edge Function 有调用限制（免费版每月 500,000 次）
