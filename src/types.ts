export interface TeamData {
    id: string;
    session_id: string;
    name: string;
    short_name: string;
    purse: number;
}

export interface PlayerData {
    id: string;
    name: string;
    role: string;
    nationality: string;
    category: string;
    base_price: number;
}

export interface RosterData {
    player_id: string;
    bought_for: number;
    is_starting?: boolean;
    players: PlayerData;
}

export interface MatchData {
    id: string;
    session_id: string;
    team_a_id: string;
    team_b_id: string;
    status: string;
    result?: Record<string, unknown>;
}

export interface LeagueSessionData {
    id: string;
    host_id: string;
    status: string;
}

export interface LogEntry {
    ball?: number;
    maxBalls?: number;
    msg: string;
    details?: {
        battingRoll: number;
        bowlingRoll: number;
        batMultiplier: number;
        bowlMultiplier: number;
        batScore: number;
        bowlScore: number;
        netResult: number;
        isVolatile: boolean;
        eventDescription: string;
    };
    isBreak: boolean;
}
