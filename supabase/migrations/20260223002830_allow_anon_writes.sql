-- Add INSERT and UPDATE policies for all game tables
-- As this is a local/private game room, we allow anonymous hosts to create and manage the game

DROP POLICY IF EXISTS "Allow public insert to sessions" ON league_sessions;
DROP POLICY IF EXISTS "Allow public update to sessions" ON league_sessions;
DROP POLICY IF EXISTS "Allow public insert to teams" ON teams;
DROP POLICY IF EXISTS "Allow public update to teams" ON teams;
DROP POLICY IF EXISTS "Allow public insert to rosters" ON team_rosters;
DROP POLICY IF EXISTS "Allow public update to rosters" ON team_rosters;
DROP POLICY IF EXISTS "Allow public insert to matches" ON matches;
DROP POLICY IF EXISTS "Allow public update to matches" ON matches;

CREATE POLICY "Allow public insert to sessions" ON league_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to sessions" ON league_sessions FOR UPDATE USING (true);

CREATE POLICY "Allow public insert to teams" ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to teams" ON teams FOR UPDATE USING (true);

CREATE POLICY "Allow public insert to rosters" ON team_rosters FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to rosters" ON team_rosters FOR UPDATE USING (true);

CREATE POLICY "Allow public insert to matches" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to matches" ON matches FOR UPDATE USING (true);
