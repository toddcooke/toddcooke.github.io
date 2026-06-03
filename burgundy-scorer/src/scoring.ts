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
    { id: "16", label: "#16 Building (4 VP / matching building)", vpPerUnit: 4, unitLabel: "matching buildings" },
    { id: "17", label: "#17 Building (4 VP / matching building)", vpPerUnit: 4, unitLabel: "matching buildings" },
    { id: "18", label: "#18 Building (4 VP / matching building)", vpPerUnit: 4, unitLabel: "matching buildings" },
    { id: "19", label: "#19 Building (4 VP / matching building)", vpPerUnit: 4, unitLabel: "matching buildings" },
    { id: "20", label: "#20 Building (4 VP / matching building)", vpPerUnit: 4, unitLabel: "matching buildings" },
    { id: "21", label: "#21 Building (4 VP / matching building)", vpPerUnit: 4, unitLabel: "matching buildings" },
    { id: "22", label: "#22 Building (4 VP / matching building)", vpPerUnit: 4, unitLabel: "matching buildings" },
    { id: "23", label: "#23 Building (4 VP / matching building)", vpPerUnit: 4, unitLabel: "matching buildings" },
    { id: "24", label: "#24 Livestock variety (4 VP / livestock type)", vpPerUnit: 4, unitLabel: "livestock types" },
    { id: "25", label: "#25 Goods sold (1 VP / goods tile sold)", vpPerUnit: 1, unitLabel: "goods sold" },
    { id: "26", label: "#26 Bonus tiles (3 VP / bonus tile owned)", vpPerUnit: 3, unitLabel: "bonus tiles owned" },
    { id: "29", label: "#29 Building (4 VP / matching building)", vpPerUnit: 4, unitLabel: "matching buildings" },
];

const TILE_VP: Record<string, number> = Object.fromEntries(
    MONASTERY_TILES.map(t => [t.id, t.vpPerUnit]),
);

export function monasteryTile(id: string): MonasteryTile | undefined {
    return MONASTERY_TILES.find(t => t.id === id);
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
        emptyHexSpaces: 0,
        bridgePosition: 0,
    };
}

// Total VP: base rows (1 VP per unit) + each owned monastery's count × its rate.
export function playerTotal(p: Player): number {
    const base = SCORE_ROWS.reduce((sum, row) => sum + p[row.key], 0);
    const monastery = p.monasteries.reduce(
        (sum, h) => sum + h.count * (TILE_VP[h.tile] ?? 0),
        0,
    );
    return base + monastery;
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
