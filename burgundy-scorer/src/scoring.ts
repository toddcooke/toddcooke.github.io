// Pure scoring logic for the Castles of Burgundy (2019) calculator.
// Kept free of React/DOM so it can be unit-tested in isolation.

// A monastery tile a player owns, plus the relevant count (buildings, goods
// types, etc.). Each tile is unique, so it lives on exactly one player.
export interface MonasteryHolding {
    tile: string; // MonasteryTile id
    count: number;
}

export interface Player {
    id: string;
    name: string;
    boardVp: number;          // running VP track (already includes color bonuses)
    unsoldGoodsTiles: number; // 1 VP each
    silverCoins: number;      // 1 VP each
    workerChipsPair: number;  // 1 VP per pair
    monasteries: MonasteryHolding[];
    shields: number[]; // shield ids (1-18) the player holds
    // Tiebreakers (never scored): used only when totals are equal.
    emptyHexSpaces: number;   // fewer wins
    bridgePosition: number;   // higher = farther behind, wins
}

export type NumericKey = "boardVp" | "unsoldGoodsTiles" | "silverCoins" | "workerChipsPair";

// Base scoring rows (each worth 1 VP per unit), shown as the per-player grid.
export const SCORE_ROWS: { label: string; key: NumericKey }[] = [
    { label: "Board VP", key: "boardVp" },
    { label: "Unsold goods tiles", key: "unsoldGoodsTiles" },
    { label: "Silver coins", key: "silverCoins" },
    { label: "Worker chips (pairs)", key: "workerChipsPair" },
];

// 2019-edition monastery tiles that score at end of game. Each is a single
// unique tile; `count` is multiplied by `vpPerUnit`. `unitLabel` describes what
// the count means (for accessible labels).
export interface MonasteryTile {
    id: string;
    label: string;
    vpPerUnit: number;
    unitLabel: string;
}

export const MONASTERY_TILES: MonasteryTile[] = [
    { id: "15", label: "#15 Goods variety (2 VP / goods type sold)", vpPerUnit: 2, unitLabel: "goods types sold" },
    { id: "16", label: "#16 Warehouse (4 VP / warehouse)", vpPerUnit: 4, unitLabel: "warehouses" },
    { id: "17", label: "#17 Watchtower (4 VP / watchtower)", vpPerUnit: 4, unitLabel: "watchtowers" },
    { id: "18", label: "#18 Carpenter's workshop (4 VP / workshop)", vpPerUnit: 4, unitLabel: "carpenter's workshops" },
    { id: "19", label: "#19 Church (4 VP / church)", vpPerUnit: 4, unitLabel: "churches" },
    { id: "20", label: "#20 Market (4 VP / market)", vpPerUnit: 4, unitLabel: "markets" },
    { id: "21", label: "#21 Boarding house (4 VP / boarding house)", vpPerUnit: 4, unitLabel: "boarding houses" },
    { id: "22", label: "#22 Bank (4 VP / bank)", vpPerUnit: 4, unitLabel: "banks" },
    { id: "23", label: "#23 Town hall (4 VP / town hall)", vpPerUnit: 4, unitLabel: "town halls" },
    { id: "24", label: "#24 Livestock variety (4 VP / livestock type)", vpPerUnit: 4, unitLabel: "livestock types" },
    { id: "25", label: "#25 Goods sold (1 VP / goods tile sold)", vpPerUnit: 1, unitLabel: "goods sold" },
    { id: "26", label: "#26 Bonus tiles (3 VP / bonus tile owned)", vpPerUnit: 3, unitLabel: "bonus tiles owned" },
    { id: "29", label: "#29 White castle (4 VP / white castle)", vpPerUnit: 4, unitLabel: "white castles" },
];

const TILE_VP: Record<string, number> = Object.fromEntries(
    MONASTERY_TILES.map(t => [t.id, t.vpPerUnit]),
);

export function monasteryTile(id: string): MonasteryTile | undefined {
    return MONASTERY_TILES.find(t => t.id === id);
}

// "The Shields" expansion: 18 unique shields. Each awards a fixed VP at game end
// (#1-6 = 12, #7-12 = 8, #13-18 = 4) plus an ongoing in-game effect. A couple
// change final scoring: #10 doubles the holder's monastery VP, #13 doubles the
// holder's shield VP. (#6 copy-monasteries and #7 double-bonus-tiles aren't
// auto-applied — those stay in Board VP.)
export interface Shield {
    id: number;
    vp: number;
    effect: string;
}

export const SHIELDS: Shield[] = [
    { id: 1, vp: 12, effect: "All pastures count as one (more livestock VP)" },
    { id: 2, vp: 12, effect: "Gain a worker when another player does" },
    { id: 3, vp: 12, effect: "Pay shield tribute with workers" },
    { id: 4, vp: 12, effect: "Unlimited tile storage" },
    { id: 5, vp: 12, effect: "Extra goods of one type when placing a ship" },
    { id: 6, vp: 12, effect: "Copy a chosen player's monasteries" },
    { id: 7, vp: 8, effect: "Bonus tiles score double" },
    { id: 8, vp: 8, effect: "Double mine payout" },
    { id: 9, vp: 8, effect: "1 silver per goods tile sold" },
    { id: 10, vp: 8, effect: "Monastery VP score double" },
    { id: 11, vp: 8, effect: "Grab a shield when you place a castle" },
    { id: 12, vp: 8, effect: "Double VP per goods tile sold" },
    { id: 13, vp: 4, effect: "Double VP per shield you hold" },
    { id: 14, vp: 4, effect: "End of phase: take a hex from any depot" },
    { id: 15, vp: 4, effect: "End of phase: take a hex from the black depot" },
    { id: 16, vp: 4, effect: "Set one die to any number" },
    { id: 17, vp: 4, effect: "Completed areas score as the next size up" },
    { id: 18, vp: 4, effect: "Place hex tiles anywhere in your duchy" },
];

const SHIELD_VP: Record<number, number> = Object.fromEntries(SHIELDS.map(s => [s.id, s.vp]));

export function shieldById(id: number): Shield | undefined {
    return SHIELDS.find(s => s.id === id);
}

// Tiebreaker-only fields (never added to the total).
export type TiebreakerKey = "emptyHexSpaces" | "bridgePosition";
export const TIEBREAKER_ROWS: { label: string; key: TiebreakerKey }[] = [
    { label: "Empty hex spaces (tiebreak: fewer wins)", key: "emptyHexSpaces" },
    { label: "Bridge position (tiebreak: higher = farther behind)", key: "bridgePosition" },
];

export function makePlayer(name: string): Player {
    return {
        id: crypto.randomUUID(),
        name,
        boardVp: 0,
        unsoldGoodsTiles: 0,
        silverCoins: 0,
        workerChipsPair: 0,
        monasteries: [],
        shields: [],
        emptyHexSpaces: 0,
        bridgePosition: 0,
    };
}

// Total VP: base rows (1 VP per unit) + monastery VP + shield VP, applying the
// shield doublers (#10 doubles monastery VP, #13 doubles shield VP).
export function playerTotal(p: Player): number {
    const base = SCORE_ROWS.reduce((sum, row) => sum + p[row.key], 0);

    let monastery = p.monasteries.reduce(
        (sum, h) => sum + h.count * (TILE_VP[h.tile] ?? 0),
        0,
    );
    if (p.shields.includes(10)) monastery *= 2; // shield #10

    let shields = p.shields.reduce((sum, id) => sum + (SHIELD_VP[id] ?? 0), 0);
    if (p.shields.includes(13)) shields *= 2; // shield #13

    return base + monastery + shields;
}

// Ranking order: highest total, then fewest empty hex spaces, then farthest
// behind on the bridge (highest bridgePosition).
function compareForRank(a: Player, b: Player): number {
    return (
        playerTotal(b) - playerTotal(a) ||
        a.emptyHexSpaces - b.emptyHexSpaces ||
        b.bridgePosition - a.bridgePosition
    );
}

// Two players are tied when equal on every ranking criterion.
function fullyTied(a: Player, b: Player): boolean {
    return (
        playerTotal(a) === playerTotal(b) &&
        a.emptyHexSpaces === b.emptyHexSpaces &&
        a.bridgePosition === b.bridgePosition
    );
}

// Standard competition ranking (1, 2, 2, 4): map of player id -> place (1-based).
// Fully-tied players share a place and the next place skips accordingly.
export function ranking(players: Player[]): Map<string, number> {
    const sorted = [...players].sort(compareForRank);
    const places = new Map<string, number>();
    sorted.forEach((p, i) => {
        const place =
            i > 0 && fullyTied(sorted[i - 1], p) ? places.get(sorted[i - 1].id)! : i + 1;
        places.set(p.id, place);
    });
    return places;
}

// Which tiebreaker rows are actually needed, given current totals/values.
// [] = no tie; ["emptyHexSpaces"] = total tie; both = still tied after empty hexes.
export function neededTiebreakers(players: Player[]): TiebreakerKey[] {
    if (players.length < 2) return [];
    const max = Math.max(...players.map(playerTotal));
    const tiedOnTotal = players.filter(p => playerTotal(p) === max);
    if (tiedOnTotal.length < 2) return [];
    const minEmpty = Math.min(...tiedOnTotal.map(p => p.emptyHexSpaces));
    const tiedOnEmpty = tiedOnTotal.filter(p => p.emptyHexSpaces === minEmpty);
    return tiedOnEmpty.length < 2 ? ["emptyHexSpaces"] : ["emptyHexSpaces", "bridgePosition"];
}
