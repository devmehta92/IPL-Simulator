import type * as Party from "partykit/server";

type AuctionState = {
    status: 'WAITING' | 'ACTIVE' | 'SOLD' | 'UNSOLD';
    currentPlayerId: string | null;
    currentBid: number;
    highestBidderTeamId: string | null;
    bidHistory: Array<{ teamId: string, amount: number }>;
    unsoldQueue: Array<{ playerId: string, depreciatedBasePrice: number }>;
};

export default class AuctionServer implements Party.Server {
    state: AuctionState = {
        status: 'WAITING',
        currentPlayerId: null,
        currentBid: 0,
        highestBidderTeamId: null,
        bidHistory: [],
        unsoldQueue: []
    };

    constructor(readonly room: Party.Room) { }

    onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
        // Send current state to new connection
        conn.send(JSON.stringify({ type: 'SYNC', state: this.state }));
    }

    onMessage(message: string, sender: Party.Connection) {
        const data = JSON.parse(message);

        // Host displays a new player on the board
        if (data.type === 'SHOW_PLAYER') {
            this.state.status = 'ACTIVE';
            this.state.currentPlayerId = data.playerId;
            this.state.currentBid = data.basePrice;
            this.state.bidHistory = [];
            this.state.highestBidderTeamId = null;
            this.broadcastSync();
        }

        // Host manually allocates the player after physical bidding concludes
        if (data.type === 'ALLOCATE_PLAYER' && this.state.status === 'ACTIVE') {
            this.state.currentBid = data.amount;
            this.state.highestBidderTeamId = data.teamId;
            this.state.status = 'SOLD';
            this.state.bidHistory.unshift({ teamId: data.teamId, amount: data.amount });
            this.broadcastSync();
        }

        // Host manually marks player unsold
        if (data.type === 'MARK_UNSOLD' && this.state.status === 'ACTIVE') {
            this.state.status = 'UNSOLD';
            // Apply 20% depreciation penalty
            const newBasePrice = Number((this.state.currentBid * 0.8).toFixed(2));
            this.state.unsoldQueue.push({
                playerId: this.state.currentPlayerId!,
                depreciatedBasePrice: Math.max(0.50, newBasePrice) // floor at robust 0.50 L
            });
            this.broadcastSync();
        }
    }

    broadcastSync() {
        this.room.broadcast(JSON.stringify({ type: 'SYNC', state: this.state }));
    }
}
