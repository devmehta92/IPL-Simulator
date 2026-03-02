# IPL Tabletop League: Official Rules & Instructions

Welcome to the **IPL Tabletop League**, an interactive, multiplayer cricket auction and dice-simulation game designed to be played physically in a living room with friends!

Here is how the game works, from the opening auction bid to the final championship dice roll.

---

## 👥 1. Player Roles

### The Host (The Commissioner)
- **Device:** Ideally a Laptop connected to a large TV screen.
- **Responsibilities:** 
  - Creates the League Session on the Home Page and defines participating teams.
  - Shares the 6-character Room Code with friends.
  - Controls the tempo of the Auction (presenting players to the block, enforcing the hammer, marking SOLD/UNSOLD).
  - Handles the central Dice Rolling during Match phases.

### Participating Managers (The Players)
- **Device:** Mobile Phone or Tablet (The "Second Screen").
- **Responsibilities:**
  - Connect to their specific Team Dashboard using the Room Code.
  - Monitor their internal purse (₹150.0 Cr) and current squad layout.
  - Yell out bids physically in the room! (The Host handles the digital assignment).

---

## 🔨 2. The Mega Auction Phase

The game begins with the Mega Auction. The Host displays the `/auction/[sessionId]` dashboard on the TV for all to see.

### Mechanics & Rules:
1. **Starting Purse:** Every team starts with strictly **₹ 150.0 Cr**.
2. **Player Categories:** Players belong to 4 tiers, which heavily dictate their starting price increment ranges and Match Engine multipliers:
   - 🌟 **STAR:** Premium Match Multipliers (3x Base)
   - 🔷 **CONSISTENT:** Reliable Match Output (2x Base)
   - ⚡ **VOLATILE:** High Risk / High Reward (Special Dice Mechanics)
   - ⚪ **WEAK:** Base Stats, but necessary for squad padding.
3. **Bidding:** Players bid via their mobile devices in real-time. The server validates purse limits to prevent cheating.
4. **Unsold Players (Depreciation):** If a player passes unsold, their base price automatically depreciates by **20%** before returning to the auction pool later.
5. **Full Roster Requirements:** You must ensure you draft enough players to field a structurally valid 11-man starting squad. Your drafted roster *must* be capable of including:
   - `5 Batters`
   - `4 Bowlers`
   - `1 All-Rounder`
   - `1 Wicket Keeper`
   - *Note: Every team must also eventually acquire at least 3 players from the WEAK category to balance star-heavy teams!*

---

## 🏏 3. Match Phase: The 11-Ball Accumulator

Matches are not 20-over affairs; instead, we use a rapid **11-Ball Accumulator Format**. 

Instead of traditional cricket logic, the Match Engine simulates team strength mathematically.

### Match Rules:
1. **The Starting XI:** Managers pick exactly 11 players for their active match lineup on their phones.
2. **The 11 Balls:** An innings lasts exactly 11 "balls". Each player in your Starting XI steps up exactly *once* per innings.
3. **The Roll:** The Host clicks "Play Ball" on the TV scoreboard. This triggers a virtual RNG dice roll (1 to 6).
4. **Action Math:** 
   - A player's internal **Category Multiplier** (Star/Consistent/etc.) is multiplied by the raw Dice Roll.
   - The batter's resulting offensive stat is pitted directly against the bowler's defensive stat.
   - **Formula:** `Delivery Runs = (Batting Calculation - Bowling Calculation)`.
   - *Yes, negative delivery runs are mathematically possible during a dominating bowling spell!*
5. **Resolution:** There are NO wickets in this format format. The chase continues for exactly 11 balls regardless of the target. Both teams face 11 balls total.
6. **Spectators:** Players not participating in the current match can load up the Spectator View (`/spectator/[matchId]`) on their phones to watch the live simulation updates sync securely in read-only mode.

---

## 🏆 4. Tournament Standings & Victory

- Following a match, the League Server updates the Standings Table.
- **Match Points:** `WIN = +2 Points`, `TIE = +1 Point`, `LOSS = 0 Points`.
- **Net Run Rate (NRR):** Crucial for tie-breakers. NRR is purely calculated on the delta between total Runs Scored vs Total Runs Conceded across all Accumulators.
- The Host controls ad-hoc scheduling via the Standings TV Dashboard, pitting Team A vs Team B until the league table is finalized!
