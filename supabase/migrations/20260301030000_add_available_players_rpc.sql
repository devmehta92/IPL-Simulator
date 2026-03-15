-- Add is_unsold column to track depreciation status
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_unsold BOOLEAN DEFAULT false;

-- Create an efficient RPC to fetch available players for a session
-- "Available" = Not in any team's roster within the given session
CREATE OR REPLACE FUNCTION get_available_players(p_session_id UUID)
RETURNS SETOF players AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM players p
  WHERE p.id NOT IN (
    SELECT tr.player_id
    FROM team_rosters tr
    JOIN teams t ON tr.team_id = t.id
    WHERE t.session_id = p_session_id
  )
  ORDER BY p.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
