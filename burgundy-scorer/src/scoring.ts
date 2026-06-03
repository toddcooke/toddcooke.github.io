// Pure scoring logic for the Castles of Burgundy (2019) calculator.
// Kept free of React/DOM so it can be unit-tested in isolation.

export interface Player {
    id: string;
    name: string;
    boardVp: number;          // running VP track (already includes color bonuses)
    unsoldGoodsTiles: number; // 1 VP each
    silverCoins: number;      // 1 VP each
    workerChipsPair: number;  // 1 VP per pair
    goodsTypesSold: number;        // monastery #15: 2 VP per goods type sold
    // monasteries #16-23 + #29: 4 VP per building of that tile's type (each a unique tile)
    building16: number;
    building17: number;
    building18: number;
    building19: number;
    building20: number;
    building21: number;
    building22: number;
    building23: number;
    building29: number;
    livestockTypes: number;        // monastery #24: 4 VP per distinct livestock type
    goodsSold: number;             // monastery #25: 1 VP per goods tile sold
    bonusTilesOwned: number;       // monastery #26: 3 VP per bonus tile owned
    // Tiebreakers (never scored): used only when totals are equal.
    emptyHexSpaces: number;        // fewer wins
    bridgePosition: number;        // higher = farther behind, wins
}

export type NumericKey =
    | "boardVp"
    | "unsoldGoodsTiles"
    | "silverCoins"
    | "workerChipsPair"
    | "goodsTypesSold"
    | "building16"
    | "building17"
    | "building18"
    | "building19"
    | "building20"
    | "building21"
    | "building22"
    | "building23"
    | "building29"
    | "livestockTypes"
    | "goodsSold"
    | "bonusTilesOwned";

// One entry per table row: a label, the Player field it edits, and VP per unit.
// `monastery` rows are unique tiles — at most one player can own each.
export const SCORE_ROWS: {
    label: string;
    key: NumericKey;
    vpPerUnit: number;
    monastery?: boolean;
}[] = [
    { label: "Board VP", key: "boardVp", vpPerUnit: 1 },
    { label: "Unsold goods tiles", key: "unsoldGoodsTiles", vpPerUnit: 1 },
    { label: "Silver coins", key: "silverCoins", vpPerUnit: 1 },
    { label: "Worker chips (pairs)", key: "workerChipsPair", vpPerUnit: 1 },
    // 2019-edition monastery tiles that score at end of game. Each is a single
    // unique tile, so only one player can own it (enforced in the UI).
    { label: "#15 Goods variety monastery (2 VP/type)", key: "goodsTypesSold", vpPerUnit: 2, monastery: true },
    { label: "#16 Building monastery (4 VP/building)", key: "building16", vpPerUnit: 4, monastery: true },
    { label: "#17 Building monastery (4 VP/building)", key: "building17", vpPerUnit: 4, monastery: true },
    { label: "#18 Building monastery (4 VP/building)", key: "building18", vpPerUnit: 4, monastery: true },
    { label: "#19 Building monastery (4 VP/building)", key: "building19", vpPerUnit: 4, monastery: true },
    { label: "#20 Building monastery (4 VP/building)", key: "building20", vpPerUnit: 4, monastery: true },
    { label: "#21 Building monastery (4 VP/building)", key: "building21", vpPerUnit: 4, monastery: true },
    { label: "#22 Building monastery (4 VP/building)", key: "building22", vpPerUnit: 4, monastery: true },
    { label: "#23 Building monastery (4 VP/building)", key: "building23", vpPerUnit: 4, monastery: true },
    { label: "#24 Livestock variety monastery (4 VP/type)", key: "livestockTypes", vpPerUnit: 4, monastery: true },
    { label: "#25 Goods sold monastery (1 VP/tile)", key: "goodsSold", vpPerUnit: 1, monastery: true },
    { label: "#26 Bonus-tile monastery (3 VP/tile)", key: "bonusTilesOwned", vpPerUnit: 3, monastery: true },
    { label: "#29 Building monastery (4 VP/building)", key: "building29", vpPerUnit: 4, monastery: true },
];

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
        goodsTypesSold: 0,
        building16: 0,
        building17: 0,
        building18: 0,
        building19: 0,
        building20: 0,
        building21: 0,
        building22: 0,
        building23: 0,
        building29: 0,
        livestockTypes: 0,
        goodsSold: 0,
        bonusTilesOwned: 0,
        emptyHexSpaces: 0,
        bridgePosition: 0,
    };
}

// Total VP: each category's count multiplied by its VP-per-unit.
export function playerTotal(p: Player): number {
    return SCORE_ROWS.reduce((sum, row) => sum + p[row.key] * row.vpPerUnit, 0);
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

// Winner(s): the top-ranked player(s). Returns >1 id only on a full tie.
export function winningIds(players: Player[]): Set<string> {
    if (players.length === 0) return new Set();
    const best = [...players].sort(compareForRank)[0];
    return new Set(players.filter(p => fullyTied(p, best)).map(p => p.id));
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
