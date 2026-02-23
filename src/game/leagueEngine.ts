export interface TeamStanding {
    teamId: string;
    matchesPlayed: number;
    wins: number;
    losses: number;
    ties: number;
    points: number;
    runsScored: number;
    oversFaced: number;
    runsConceded: number;
    oversBowled: number;
    netRunRate: number;
}

export class LeagueEngine {
    constructor(private teams: TeamStanding[]) { }

    public recordMatchResult(
        teamAId: string, teamAScore: number, teamAOversFaced: number,
        teamBId: string, teamBScore: number, teamBOversFaced: number,
        isTie: boolean
    ) {
        const teamAIndex = this.teams.findIndex(t => t.teamId === teamAId);
        const teamBIndex = this.teams.findIndex(t => t.teamId === teamBId);

        if (teamAIndex === -1 || teamBIndex === -1) return;

        const teamA = this.teams[teamAIndex];
        const teamB = this.teams[teamBIndex];

        // Win/Loss/Tie Points Logic
        if (isTie) {
            teamA.ties += 1;
            teamB.ties += 1;
            teamA.points += 1;
            teamB.points += 1;
        } else if (teamAScore > teamBScore) {
            teamA.wins += 1;
            teamA.points += 2;
            teamB.losses += 1;
        } else {
            teamB.wins += 1;
            teamB.points += 2;
            teamA.losses += 1;
        }

        teamA.matchesPlayed += 1;
        teamB.matchesPlayed += 1;

        // Run Rate Tracking
        teamA.runsScored += teamAScore;
        teamA.oversFaced += teamAOversFaced;
        teamA.runsConceded += teamBScore;
        teamA.oversBowled += teamBOversFaced;

        teamB.runsScored += teamBScore;
        teamB.oversFaced += teamBOversFaced;
        teamB.runsConceded += teamAScore;
        teamB.oversBowled += teamAOversFaced;

        this.recalculateNRR();
    }

    private recalculateNRR() {
        this.teams.forEach(team => {
            const runRateFor = team.oversFaced > 0 ? team.runsScored / team.oversFaced : 0;
            const runRateAgainst = team.oversBowled > 0 ? team.runsConceded / team.oversBowled : 0;
            team.netRunRate = parseFloat((runRateFor - runRateAgainst).toFixed(3));
        });
    }

    public getSortedStandings(): TeamStanding[] {
        return this.teams.sort((a, b) => {
            if (a.points !== b.points) {
                return b.points - a.points; // Descending by points
            }
            return b.netRunRate - a.netRunRate; // Tie-breaker by NRR
        });
    }
}
