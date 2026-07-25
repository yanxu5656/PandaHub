-- PandaHub 数据库表结构
-- 在 Supabase SQL Editor 中执行

-- 成员表
CREATE TABLE members (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  avatar TEXT DEFAULT '🐼',
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 游戏库
CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT,
  max_players INTEGER,
  genre TEXT,
  added_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 成员拥有的游戏
CREATE TABLE member_games (
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  PRIMARY KEY (member_id, game_id)
);

-- 可用时间
CREATE TABLE availability (
  id SERIAL PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
  preferred_game_id INTEGER REFERENCES games(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, date, hour)
);

-- 投票
CREATE TABLE polls (
  id SERIAL PRIMARY KEY,
  creator_id UUID REFERENCES members(id),
  question TEXT NOT NULL,
  deadline TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 投票选项
CREATE TABLE poll_options (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER REFERENCES polls(id) ON DELETE CASCADE,
  game_id INTEGER REFERENCES games(id)
);

-- 投票记录
CREATE TABLE poll_votes (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER REFERENCES polls(id) ON DELETE CASCADE,
  option_id INTEGER REFERENCES poll_options(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, member_id)
);

-- 活动房间
CREATE TABLE activities (
  id SERIAL PRIMARY KEY,
  creator_id UUID REFERENCES members(id),
  game_id INTEGER REFERENCES games(id),
  date DATE NOT NULL,
  start_hour INTEGER NOT NULL,
  end_hour INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 活动参与者
CREATE TABLE activity_participants (
  activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (activity_id, member_id)
);

-- 通知
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 小游戏房间
CREATE TABLE game_rooms (
  id SERIAL PRIMARY KEY,
  game_type TEXT NOT NULL CHECK (game_type IN ('draw', 'gomoku', 'tictactoe')),
  host_id UUID REFERENCES members(id),
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  state JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 游戏房间玩家
CREATE TABLE game_room_players (
  room_id INTEGER REFERENCES game_rooms(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  PRIMARY KEY (room_id, member_id)
);

-- RLS 策略（行级安全）
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_room_players ENABLE ROW LEVEL SECURITY;

-- 成员表策略：所有人可读，本人可改
CREATE POLICY "members_select" ON members FOR SELECT USING (true);
CREATE POLICY "members_update" ON members FOR UPDATE USING (auth.uid() = id);

-- 游戏库策略：所有人可读，登录用户可添加
CREATE POLICY "games_select" ON games FOR SELECT USING (true);
CREATE POLICY "games_insert" ON games FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 成员游戏策略：所有人可读，本人可管理
CREATE POLICY "member_games_select" ON member_games FOR SELECT USING (true);
CREATE POLICY "member_games_insert" ON member_games FOR INSERT WITH CHECK (auth.uid() = member_id);
CREATE POLICY "member_games_delete" ON member_games FOR DELETE USING (auth.uid() = member_id);

-- 可用时间策略：所有人可读，本人可管理
CREATE POLICY "availability_select" ON availability FOR SELECT USING (true);
CREATE POLICY "availability_insert" ON availability FOR INSERT WITH CHECK (auth.uid() = member_id);
CREATE POLICY "availability_delete" ON availability FOR DELETE USING (auth.uid() = member_id);

-- 投票策略：所有人可读，登录用户可创建和投票
CREATE POLICY "polls_select" ON polls FOR SELECT USING (true);
CREATE POLICY "polls_insert" ON polls FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "polls_update" ON polls FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "poll_options_select" ON poll_options FOR SELECT USING (true);
CREATE POLICY "poll_options_insert" ON poll_options FOR INSERT WITH CHECK (true);

CREATE POLICY "poll_votes_select" ON poll_votes FOR SELECT USING (true);
CREATE POLICY "poll_votes_insert" ON poll_votes FOR INSERT WITH CHECK (auth.uid() = member_id);

-- 活动策略
CREATE POLICY "activities_select" ON activities FOR SELECT USING (true);
CREATE POLICY "activities_insert" ON activities FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "activity_participants_select" ON activity_participants FOR SELECT USING (true);
CREATE POLICY "activity_participants_insert" ON activity_participants FOR INSERT WITH CHECK (auth.uid() = member_id);
CREATE POLICY "activity_participants_delete" ON activity_participants FOR DELETE USING (auth.uid() = member_id);

-- 通知策略：只能看自己的通知
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (auth.uid() = member_id);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (auth.uid() = member_id);

-- 游戏房间策略
CREATE POLICY "game_rooms_select" ON game_rooms FOR SELECT USING (true);
CREATE POLICY "game_rooms_insert" ON game_rooms FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "game_rooms_update" ON game_rooms FOR UPDATE USING (true);

CREATE POLICY "game_room_players_select" ON game_room_players FOR SELECT USING (true);
CREATE POLICY "game_room_players_insert" ON game_room_players FOR INSERT WITH CHECK (auth.uid() = member_id);
CREATE POLICY "game_room_players_delete" ON game_room_players FOR DELETE USING (auth.uid() = member_id);

-- 启用 Realtime（用于实时同步）
ALTER PUBLICATION supabase_realtime ADD TABLE availability;
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE game_room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE polls;
ALTER PUBLICATION supabase_realtime ADD TABLE poll_votes;
