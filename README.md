# 🐼 PandaHub（胖达窝）

小圈子辅助应用 — 时间协调、投票、游戏库、联机小游戏

## 功能

- 👤 **成员系统** — 注册登录、头像、在线状态、个人信息管理
- 📅 **时间协调** — 拖拽选时间、显示谁有空、创建活动
- 🗳️ **投票系统** — 发起投票、投票、删除投票
- 📚 **游戏库** — 按类型分类、搜索、批量添加、删除
- 🎯 **小游戏** — 井字棋、五子棋、你画我猜（支持 AI 对手）
- ⚙️ **管理面板** — 成员管理、投票管理、游戏库管理
- 🔔 **站内通知** — 投票、活动提醒

## 技术栈

- 前端：HTML + CSS + JavaScript
- 后端/数据库：Supabase
- 部署：Cloudflare Pages

## 快速开始

### 1. 创建 Supabase 项目

1. 访问 https://supabase.com 注册/登录
2. 创建新项目
3. 进入 SQL Editor，执行 `sql/tables.sql`
4. 再执行 `sql/fix-policies.sql`

### 2. 配置

编辑 `public/js/config.js`：

```javascript
const SUPABASE_URL = '你的 Supabase 项目 URL';
const SUPABASE_ANON_KEY = '你的 anon key';
```

### 3. 部署

#### 方式一：Cloudflare Pages（推荐）

1. 上传代码到 GitHub
2. 登录 https://pages.cloudflare.com
3. 连接 GitHub 仓库
4. Root Directory 填 `public`
5. 部署完成

#### 方式二：本地运行

```bash
cd public
python -m http.server 8000
```

访问 http://localhost:8000

## 使用说明

### 注册/登录
1. 打开网页，注册账号
2. 选择头像、输入昵称
3. 登录后进入大厅

### 个人信息
- 点击左下角头像/昵称可编辑个人信息

### 时间协调
1. 进入"时间协调"页面
2. 鼠标拖拽选择你有空的时间段
3. 每个小格子会显示谁有空
4. 下方显示共同空闲时间
5. 点击共同空闲时间段可创建活动

### 投票
1. 点击"发起投票"
2. 输入问题、选择游戏选项
3. 其他人可以投票
4. 创建者可删除投票

### 游戏库
1. 点击"批量添加"一次添加多个游戏
2. 选择游戏类型（FPS/RPG/MOBA等）
3. 每个游戏卡片可删除
4. 点击"我也有"标记你拥有的游戏

### 小游戏
1. 点击游戏卡片创建房间
2. 点击"添加 AI 对手"立即开始
3. 或等待其他玩家加入

### 管理员
- 在 Supabase 中将用户设为管理员：
```sql
UPDATE members SET is_admin = true WHERE id = '用户ID';
```
- 管理员可访问"管理"页面，管理成员、投票、游戏库

## 项目结构

```
Helper/
├── README.md
├── sql/
│   ├── tables.sql         # 数据库表结构
│   └── fix-policies.sql   # 修复 RLS 策略
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
    ├── admin.html         # 管理面板
    ├── css/
    │   └── style.css      # 全局样式
    └── js/
        ├── supabase.min.js # Supabase 库
        ├── config.js       # 配置
        ├── fix.js          # 修复脚本
        ├── auth.js         # 认证
        ├── lobby.js        # 大厅
        ├── schedule.js     # 时间协调
        ├── polls.js        # 投票
        ├── games.js        # 游戏库
        ├── mini-games.js   # 小游戏
        └── steam.js        # Steam 集成
```

## 更新部署

```bash
# 修改代码后
git add .
git commit -m "说明改了什么"
git push
```

Cloudflare Pages 会自动重新部署。

## 注意事项

- 需要梯子才能正常使用（Supabase 服务器在海外）
- 关闭邮箱验证可直接登录，无需收邮件
- 管理员权限需要手动在数据库设置
