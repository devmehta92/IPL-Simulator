-- Add is_starting toggle to team_rosters to save 11-man lineups
ALTER TABLE team_rosters
ADD COLUMN IF NOT EXISTS is_starting BOOLEAN DEFAULT false;
