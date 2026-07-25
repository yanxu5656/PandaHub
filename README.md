# 🐼 PandaHub（胖达窝）

小圈子辅助应用 — 时间协调、投票、游戏库、联机小游戏

## 功能

- 👤 **成员系统** — 注册登录、头像、管理员
- 📅 **时间协调** — 拖拽选时间、共同空闲高亮
- 🗳️ **投票** — 决定今晚玩什么
- 📚 **游戏库** — 管理游戏、找共同游戏
- 🎯 **小游戏** — 你画我猜、五子棋、井字棋

## 快速开始

### 1. 创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com) 注册/登录
2. 创建新项目，记下 **Project URL** 和 **anon key**
3. 进入 SQL Editor，执行 `sql/tables.sql` 中的 SQL

### 2. 配置

编辑 `public/js/config.js`：

```javascript
const SUPABASE_URL = '你的项目URL';
const SUPABASE_ANON_KEY = '你的anon key';
```

### 3. 运行

用任意 HTTP 服务器打开 `public` 目录：

```bash
# 方法1: 使用 Python
cd public
python -m http.server 8000

# 方法2: 使用 Node.js
npx serve public

# 方法3: 使用 VS Code
# 安装 Live Server 扩展，右键 index.html -> Open with Live Server
```

然后打开浏览器访问 `http://localhost:8000`

## 项目结构

```
Helper/
├── README.md
├── sql/
│   └── tables.sql        # 数据库表结构（在 Supabase 执行）
└── public/
    ├── index.html         # 登录/注册
    ├── lobby.html         # 大厅
    ├── schedule.html      # 时间协调
    ├── polls.html         # 投票
    ├── games.html         # 游戏库
    ├── mini-games.html    # 小游戏入口
    ├── tictactoe.html     # 井字棋
    ├── gomoku.html        # 五子棋
    ├── draw.html          # 你画我猜
    ├── css/
    │   └── style.css      # 全局样式
    └── js/
        ├── config.js      # Supabase 配置
        ├── auth.js        # 认证逻辑
        ├── lobby.js       # 大厅逻辑
        ├── schedule.js    # 时间协调逻辑
        ├── polls.js       # 投票逻辑
        ├── games.js       # 游戏库逻辑
        └── mini-games.js  # 小游戏逻辑
```

## Supabase 配置

### 关闭邮箱验证（可选）

如果不想让用户验证邮箱：
1. 进入 Supabase Dashboard -> Authentication -> Providers
2. 找到 Email，关闭 "Confirm email"

### 启用 Realtime

确保以下表启用了 Realtime（在 SQL 中已配置）：
- game_rooms
- game_room_players
- notifications
- polls
- poll_votes

## 使用说明

1. **注册**：打开网页，注册账号
2. **分享**：把链接发给朋友，让他们也注册
3. **设置管理员**：在 Supabase 数据库中将某人的 `is_admin` 设为 `true`
4. **添加游戏**：在游戏库中添加大家常玩的游戏
5. **填写时间**：在时间协调页面拖拽选择有空的时间段
6. **发起投票**：选择游戏，发起"今晚玩什么"投票
7. **玩小游戏**：等人的时候来一局你画我猜或五子棋
