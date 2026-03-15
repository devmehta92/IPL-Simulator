-- Atomic function to lock a team lineup
-- This ensures that we don't end up with 0 starting players if a network error occurs between updates
CREATE OR REPLACE FUNCTION lock_team_lineup(
  p_team_id UUID,
  p_player_ids UUID[]
)
RETURNS VOID AS $$
BEGIN
  -- 1. Reset all players for this team to not starting
  UPDATE team_rosters
  SET is_starting = false
  WHERE team_id = p_team_id;

  -- 2. Set only the provided IDs to starting
  UPDATE team_rosters
  SET is_starting = true
  WHERE team_id = p_team_id
  AND player_id = ANY(p_player_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
