-- Add batting and bowling stats to players table
-- power_level is an alias/enhancement for base_power
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS batting_stat INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS bowling_stat INTEGER DEFAULT 5;

-- Update existing players with some random-ish base stats if they don't have them
UPDATE players SET batting_stat = 7, bowling_stat = 3 WHERE role = 'BAT';
UPDATE players SET batting_stat = 3, bowling_stat = 7 WHERE role = 'BOWL';
UPDATE players SET batting_stat = 6, bowling_stat = 6 WHERE role = 'AR';
UPDATE players SET batting_stat = 6, bowling_stat = 2 WHERE role = 'WK';
