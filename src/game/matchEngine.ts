export type PlayerRole = 'BAT' | 'BOWL' | 'AR' | 'WK';
export type PlayerCategory = 'STAR' | 'CONSISTENT' | 'VOLATILE' | 'WEAK';

export interface Cricketer {
    id: string;
    name: string;
    role: PlayerRole;
    category: PlayerCategory;
    basePower: number; // Maintained for tie breakers or base thresholds if needed
    modifiers: Record<string, number>;
    traits: string[];
}

export interface MatchState {
    status: 'STRATEGY' | 'IN_PROGRESS' | 'INNINGS_BREAK' | 'FINISHED';
    battingTeamId: string;
    bowlingTeamId: string;
    innings: 1 | 2;
    score: {
        runs: number;
        wickets: number;
        ballsbobled: number;
    };
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
    netResult: number; // positive = runs, negative = wicket risk or dots
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

    rollDice(batter: Cricketer, bowler: Cricketer): DiceRollResult {
        // 1. Base 1d6 rolls
        const batRoll = Math.floor(Math.random() * 6) + 1;
        const bowlRoll = Math.floor(Math.random() * 6) + 1;

        // 2. Apply V2 Category Multipliers
        const batMultiplier = this.getCategoryMultiplier(batter.category, batRoll);
        const bowlMultiplier = this.getCategoryMultiplier(bowler.category, bowlRoll);

        const batScore = batRoll * batMultiplier;
        const bowlScore = bowlRoll * bowlMultiplier;

        // 3. Volatility Check (Rolling a 6)
        const isVolatile = batRoll === 6 || bowlRoll === 6;

        // 4. Net Result Calculation: Straight Accumulator
        const netResult = batScore - bowlScore;
        const eventDescription = `${batter.name} (${batRoll}x${batMultiplier}=${batScore}) vs ${bowler.name} (${bowlRoll}x${bowlMultiplier}=${bowlScore})`;

        return {
            battingRoll: batRoll,
            bowlingRoll: bowlRoll,
            batMultiplier,
            bowlMultiplier,
            batScore,
            bowlScore,
            netResult,
            isVolatile,
            eventDescription
        };
    }
}
