-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types for strong typing
CREATE TYPE player_role AS ENUM ('BAT', 'BOWL', 'AR', 'WK');
CREATE TYPE player_category AS ENUM ('STAR', 'CONSISTENT', 'VOLATILE', 'WEAK');
CREATE TYPE match_status AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'FINISHED');
CREATE TYPE league_status AS ENUM ('LOBBY', 'AUCTION', 'STRATEGY', 'MATCHES', 'FINISHED');

-- Players Table
-- Central database of cricketer stats and attributes
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role player_role NOT NULL,
    category player_category NOT NULL DEFAULT 'CONSISTENT',
    base_price NUMERIC(10, 2) NOT NULL,
    nationality TEXT NOT NULL,
    base_power INTEGER NOT NULL DEFAULT 6,
    stats JSONB DEFAULT '{}'::JSONB,
    modifiers JSONB DEFAULT '{}'::JSONB,
    image_url TEXT,
    traits TEXT[] DEFAULT '{}'::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles / Users (Optional extension to Supabase Auth)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- League Sessions
-- A single multiplayer event container
CREATE TABLE league_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status league_status DEFAULT 'LOBBY',
    host_id UUID REFERENCES profiles(id),
    join_code TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams Table
-- A team owned by a user within a specific league session
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES league_sessions(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES profiles(id),
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    theme_color TEXT NOT NULL,
    purse NUMERIC(10, 2) DEFAULT 150.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team Rosters
-- Maps players to the teams that bought them in the auction
CREATE TABLE team_rosters (
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE RESTRICT,
    bought_for NUMERIC(10, 2) NOT NULL,
    is_starting_xi BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (team_id, player_id)
);

-- Matches
-- Head-to-head match records within a league session
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES league_sessions(id) ON DELETE CASCADE,
    team_a_id UUID REFERENCES teams(id),
    team_b_id UUID REFERENCES teams(id),
    status match_status DEFAULT 'SCHEDULED',
    result JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) Policies
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users for most game data
CREATE POLICY "Allow public read access to players" ON players FOR SELECT USING (true);
CREATE POLICY "Allow public read access to sessions" ON league_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public read access to teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Allow public read access to rosters" ON team_rosters FOR SELECT USING (true);
CREATE POLICY "Allow public read access to matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Allow public read access to profiles" ON profiles FOR SELECT USING (true);
