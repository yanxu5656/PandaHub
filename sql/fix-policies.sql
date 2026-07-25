-- PandaHub 完整修复脚本
-- 在 Supabase SQL Editor 中执行

-- 1. 修复所有 RLS 策略
-- 成员表
DROP POLICY IF EXISTS "members_select" ON members;
CREATE POLICY "members_select" ON members FOR SELECT USING (true);

DROP POLICY IF EXISTS "members_insert" ON members;
CREATE POLICY "members_insert" ON members FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "members_update" ON members;
CREATE POLICY "members_update" ON members FOR UPDATE USING (true);

DROP POLICY IF EXISTS "members_delete" ON members;
CREATE POLICY "members_delete" ON members FOR DELETE USING (true);

-- 游戏库
DROP POLICY IF EXISTS "games_select" ON games;
CREATE POLICY "games_select" ON games FOR SELECT USING (true);

DROP POLICY IF EXISTS "games_insert" ON games;
CREATE POLICY "games_insert" ON games FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "games_update" ON games;
CREATE POLICY "games_update" ON games FOR UPDATE USING (true);

DROP POLICY IF EXISTS "games_delete" ON games;
CREATE POLICY "games_delete" ON games FOR DELETE USING (true);

-- 成员游戏关联
DROP POLICY IF EXISTS "member_games_select" ON member_games;
CREATE POLICY "member_games_select" ON member_games FOR SELECT USING (true);

DROP POLICY IF EXISTS "member_games_insert" ON member_games;
CREATE POLICY "member_games_insert" ON member_games FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "member_games_delete" ON member_games;
CREATE POLICY "member_games_delete" ON member_games FOR DELETE USING (true);

-- 可用时间
DROP POLICY IF EXISTS "availability_select" ON availability;
CREATE POLICY "availability_select" ON availability FOR SELECT USING (true);

DROP POLICY IF EXISTS "availability_insert" ON availability;
CREATE POLICY "availability_insert" ON availability FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "availability_delete" ON availability;
CREATE POLICY "availability_delete" ON availability FOR DELETE USING (true);

-- 投票
DROP POLICY IF EXISTS "polls_select" ON polls;
CREATE POLICY "polls_select" ON polls FOR SELECT USING (true);

DROP POLICY IF EXISTS "polls_insert" ON polls;
CREATE POLICY "polls_insert" ON polls FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "polls_update" ON polls;
CREATE POLICY "polls_update" ON polls FOR UPDATE USING (true);

DROP POLICY IF EXISTS "polls_delete" ON polls;
CREATE POLICY "polls_delete" ON polls FOR DELETE USING (true);

-- 投票选项
DROP POLICY IF EXISTS "poll_options_select" ON poll_options;
CREATE POLICY "poll_options_select" ON poll_options FOR SELECT USING (true);

DROP POLICY IF EXISTS "poll_options_insert" ON poll_options;
CREATE POLICY "poll_options_insert" ON poll_options FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "poll_options_delete" ON poll_options;
CREATE POLICY "poll_options_delete" ON poll_options FOR DELETE USING (true);

-- 投票记录
DROP POLICY IF EXISTS "poll_votes_select" ON poll_votes;
CREATE POLICY "poll_votes_select" ON poll_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "poll_votes_insert" ON poll_votes;
CREATE POLICY "poll_votes_insert" ON poll_votes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "poll_votes_delete" ON poll_votes;
CREATE POLICY "poll_votes_delete" ON poll_votes FOR DELETE USING (true);

-- 活动
DROP POLICY IF EXISTS "activities_select" ON activities;
CREATE POLICY "activities_select" ON activities FOR SELECT USING (true);

DROP POLICY IF EXISTS "activities_insert" ON activities;
CREATE POLICY "activities_insert" ON activities FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "activities_delete" ON activities;
CREATE POLICY "activities_delete" ON activities FOR DELETE USING (true);

-- 活动参与者
DROP POLICY IF EXISTS "activity_participants_select" ON activity_participants;
CREATE POLICY "activity_participants_select" ON activity_participants FOR SELECT USING (true);

DROP POLICY IF EXISTS "activity_participants_insert" ON activity_participants;
CREATE POLICY "activity_participants_insert" ON activity_participants FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "activity_participants_delete" ON activity_participants;
CREATE POLICY "activity_participants_delete" ON activity_participants FOR DELETE USING (true);

-- 通知
DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (true);

DROP POLICY IF EXISTS "notifications_delete" ON notifications;
CREATE POLICY "notifications_delete" ON notifications FOR DELETE USING (true);

-- 游戏房间
DROP POLICY IF EXISTS "game_rooms_select" ON game_rooms;
CREATE POLICY "game_rooms_select" ON game_rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS "game_rooms_insert" ON game_rooms;
CREATE POLICY "game_rooms_insert" ON game_rooms FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "game_rooms_update" ON game_rooms;
CREATE POLICY "game_rooms_update" ON game_rooms FOR UPDATE USING (true);

DROP POLICY IF EXISTS "game_rooms_delete" ON game_rooms;
CREATE POLICY "game_rooms_delete" ON game_rooms FOR DELETE USING (true);

-- 游戏房间玩家
DROP POLICY IF EXISTS "game_room_players_select" ON game_room_players;
CREATE POLICY "game_room_players_select" ON game_room_players FOR SELECT USING (true);

DROP POLICY IF EXISTS "game_room_players_insert" ON game_room_players;
CREATE POLICY "game_room_players_insert" ON game_room_players FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "game_room_players_delete" ON game_room_players;
CREATE POLICY "game_room_players_delete" ON game_room_players FOR DELETE USING (true);

-- 2. 确保 Realtime 启用
-- 注意：如果表已经在 publication 中，会报错，可以忽略
DO $$
BEGIN
  -- 尝试添加到 publication，如果已存在会报错，我们捕获并忽略
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE availability;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE game_room_players;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE polls;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE poll_votes;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE members;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE games;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE member_games;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE activities;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE activity_participants;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- 完成
SELECT 'PandaHub 修复完成！' as status;
