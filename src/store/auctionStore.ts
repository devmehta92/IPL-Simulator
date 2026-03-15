import { create } from 'zustand';

type AuctionState = {
    status: 'WAITING' | 'ACTIVE' | 'SOLD' | 'UNSOLD';
    currentPlayerId: string | null;
    currentBid: number;
    highestBidderTeamId: string | null;
    bidHistory: Array<{ teamId: string, amount: number }>;
    unsoldQueue: Array<{ playerId: string, depreciatedBasePrice: number }>;
};

type AuctionStore = {
    state: AuctionState;
    updateState: (newState: Partial<AuctionState>) => void;
};

export const useAuctionStore = create<AuctionStore>((set) => ({
    state: {
        status: 'WAITING',
        currentPlayerId: null,
        currentBid: 0,
        highestBidderTeamId: null,
        bidHistory: [],
        unsoldQueue: []
    },
    updateState: (newState) => set((prev) => ({
        state: { ...prev.state, ...newState }
    })),
}));
