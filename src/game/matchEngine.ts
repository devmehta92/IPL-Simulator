export type PlayerRole = 'BAT' | 'BOWL' | 'AR' | 'WK';
export type PlayerCategory = 'STAR' | 'CONSISTENT' | 'VOLATILE' | 'WEAK';
export type BowlingTactic = 'DEFENSIVE' | 'BALANCED' | 'AGGRESSIVE';

export interface Cricketer {
    id: string;
    name: string;
    role: PlayerRole;
    category: PlayerCategory;
    basePower: number; // Maintained for tie breakers or base thresholds if needed
    batting_stat: number;
    bowling_stat: number;
    modifiers: Record<string, number>;
    traits: string[];
}

export interface MatchState {
    status: 'STRATEGY' | 'IN_PROGRESS' | 'INNINGS_BREAK' | 'FINISHED';
    battingTeamId: string;
    bowlingTeamId: string;
    bowlingTactic?: BowlingTactic;
    innings: 1 | 2;
    team1Score: { runs: number, wickets: number, balls: number };
    team2Score: { runs: number, wickets: number, balls: number };
    target: number | null;
    strikerId: string | null;
    nonStrikerId: string | null;
    bowlerId: string | null;
    lastRoll: DiceRollResult | null;
    activeModifiers: string[];
}

export interface DiceRollResult {
    battingRoll: number;
    bowlingRoll: number;
    batMultiplier: number;
    bowlMultiplier: number;
    batScore: number;
    bowlScore: number;
    runs: number;
    isWicket: boolean;
    isVolatile: boolean;
    eventDescription: string;
}

export class MatchEngine {

    private getCategoryMultiplier(category: PlayerCategory, roll: number): number {
        switch (category) {
            case 'STAR': return 3;
            case 'CONSISTENT': return 2;
            case 'WEAK': return 1;
            case 'VOLATILE': return (roll >= 4) ? 4 : 1;
            default: return 1;
        }
    }

    rollDice(batter: Cricketer, bowler: Cricketer, tactic: BowlingTactic = 'BALANCED'): DiceRollResult {
        // 1. Base 1d6 rolls
        let batRoll = Math.floor(Math.random() * 6) + 1;
        let bowlRoll = Math.floor(Math.random() * 6) + 1;

        // 2. Apply Tactical Stances
        let tacticBonusBowl = 0;
        let tacticBonusBat = 0;

        if (tactic === 'DEFENSIVE') {
            tacticBonusBowl = 1;
        } else if (tactic === 'AGGRESSIVE') {
            tacticBonusBowl = 2;
            tacticBonusBat = 1; // High risk: batter also gets a boost
        }

        // 3. Apply V2 Category Multipliers
        const batMultiplier = this.getCategoryMultiplier(batter.category, batRoll);
        const bowlMultiplier = this.getCategoryMultiplier(bowler.category, bowlRoll);

        // 4. Add small stat-based bonuses
        const batStatBonus = Math.floor(batter.batting_stat / 3);
        const bowlStatBonus = Math.floor(bowler.bowling_stat / 3);

        const batScore = (batRoll * batMultiplier) + batStatBonus + tacticBonusBat;
        const bowlScore = (bowlRoll * bowlMultiplier) + bowlStatBonus + tacticBonusBowl;

        // 5. Volatility Check (Rolling a 6)
        const isVolatile = batRoll === 6 || bowlRoll === 6;

        // 6. Net Result Calculation: Wicket Logic
        // If Batter Wins: Runs = diff
        // If Tie: 0 runs
        // If Bowler Wins: Wicket, 0 runs
        let runs = 0;
        let isWicket = false;

        if (batScore > bowlScore) {
            runs = batScore - bowlScore;
        } else if (bowlScore > batScore) {
            isWicket = true;
        }

        const tacticLabel = tactic !== 'BALANCED' ? ` [${tactic}]` : '';
        const outcomeLabel = isWicket ? 'OUT!' : runs > 0 ? `${runs} Runs` : 'Dot Ball';
        const eventDescription = `${batter.name} vs ${bowler.name}${tacticLabel}: ${outcomeLabel} (${batScore} vs ${bowlScore})`;

        return {
            battingRoll: batRoll,
            bowlingRoll: bowlRoll,
            batMultiplier,
            bowlMultiplier,
            batScore,
            bowlScore,
            runs,
            isWicket,
            isVolatile,
            eventDescription
        };
    }
}
