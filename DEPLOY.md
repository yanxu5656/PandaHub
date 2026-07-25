# PandaHub 部署清单

## 项目结构
```
public/
├── index.html          # 登录/注册
├── lobby.html          # 大厅
├── schedule.html       # 时间协调
├── polls.html          # 投票
├── games.html          # 游戏库
├── mini-games.html     # 小游戏入口
├── tictactoe.html      # 井字棋
├── gomoku.html         # 五子棋
├── draw.html           # 你画我猜
├── admin.html          # 管理面板
├── css/
│   └── style.css       # 全局样式
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

## 功能列表
- [x] 用户注册/登录
- [x] 个人信息管理
- [x] 时间协调（拖拽选择）
- [x] 投票系统
- [x] 游戏库（分类、搜索、批量添加）
- [x] 小游戏（井字棋、五子棋、你画我猜）
- [x] AI 对手
- [x] 管理员面板
- [x] 站内通知

## Supabase 配置
1. 创建 Supabase 项目
2. 执行 `sql/tables.sql`
3. 执行 `sql/fix-policies.sql`
4. 关闭邮箱验证（可选）

## 部署选项

### 选项 1：GitHub Pages（推荐）
1. 创建 GitHub 仓库
2. 上传 `public/` 目录内容
3. 在 Settings > Pages 启用
4. 访问 `https://用户名.github.io/仓库名`

### 选项 2：Vercel
1. 连接 GitHub 仓库
2. 自动部署
3. 获得 `.vercel.app` 域名

### 选项 3：Netlify
1. 拖拽 `public/` 文件夹到 Netlify
2. 获得 `.netlify.app` 域名

## 测试清单
- [ ] 注册新用户
- [ ] 登录
- [ ] 编辑个人信息
- [ ] 填写时间协调
- [ ] 创建投票
- [ ] 投票
- [ ] 添加游戏
- [ ] 删除游戏
- [ ] 创建小游戏房间
- [ ] 添加 AI 对手
- [ ] 玩小游戏
- [ ] 管理员功能
