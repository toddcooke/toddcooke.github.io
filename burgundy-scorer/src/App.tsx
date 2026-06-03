import { useState } from "react";

interface Player {
    id: string;
    name: string;
    boardVp: number;          // running VP track (already includes color bonuses)
    unsoldGoodsTiles: number; // 1 VP each
    silverCoins: number;      // 1 VP each
    workerChipsPair: number;  // 1 VP per pair
    goodsTypesSold: number;        // monastery #15: 2 VP per goods type sold
    buildingMonasteryMatches: number; // monastery #16-23/#29: 4 VP per matching building
    livestockTypes: number;        // monastery #24: 4 VP per distinct livestock type
    goodsSold: number;             // monastery #25: 1 VP per goods tile sold
    bonusTilesOwned: number;       // monastery #26: 3 VP per bonus tile owned
    // Tiebreakers (never scored): used only when totals are equal.
    emptyHexSpaces: number;        // fewer wins
    bridgePosition: number;        // higher = farther behind, wins
}

type NumericKey =
    | "boardVp"
    | "unsoldGoodsTiles"
    | "silverCoins"
    | "workerChipsPair"
    | "goodsTypesSold"
    | "buildingMonasteryMatches"
    | "livestockTypes"
    | "goodsSold"
    | "bonusTilesOwned";

// One entry per table row: a label, the Player field it edits, and VP per unit.
const SCORE_ROWS: { label: string; key: NumericKey; vpPerUnit: number }[] = [
    { label: "Board VP", key: "boardVp", vpPerUnit: 1 },
    { label: "Unsold goods tiles", key: "unsoldGoodsTiles", vpPerUnit: 1 },
    { label: "Silver coins", key: "silverCoins", vpPerUnit: 1 },
    { label: "Worker chips (pairs)", key: "workerChipsPair", vpPerUnit: 1 },
    // 2019-edition monastery tiles that score at end of game. Enter the count
    // only if you own that monastery; leave 0 otherwise.
    { label: "#15 Goods variety monastery (2 VP/type)", key: "goodsTypesSold", vpPerUnit: 2 },
    { label: "#16–23, #29 Building monastery (4 VP/building)", key: "buildingMonasteryMatches", vpPerUnit: 4 },
    { label: "#24 Livestock variety monastery (4 VP/type)", key: "livestockTypes", vpPerUnit: 4 },
    { label: "#25 Goods sold monastery (1 VP/tile)", key: "goodsSold", vpPerUnit: 1 },
    { label: "#26 Bonus-tile monastery (3 VP/tile)", key: "bonusTilesOwned", vpPerUnit: 3 },
];

function makePlayer(name: string): Player {
    return {
        id: crypto.randomUUID(),
        name,
        boardVp: 0,
        unsoldGoodsTiles: 0,
        silverCoins: 0,
        workerChipsPair: 0,
        goodsTypesSold: 0,
        buildingMonasteryMatches: 0,
        livestockTypes: 0,
        goodsSold: 0,
        bonusTilesOwned: 0,
        emptyHexSpaces: 0,
        bridgePosition: 0,
    };
}

// Total VP: each category's count multiplied by its VP-per-unit.
function playerTotal(p: Player): number {
    return SCORE_ROWS.reduce((sum, row) => sum + p[row.key] * row.vpPerUnit, 0);
}

// Tiebreaker-only fields (never added to the total).
type TiebreakerKey = "emptyHexSpaces" | "bridgePosition";
const TIEBREAKER_ROWS: { label: string; key: TiebreakerKey }[] = [
    { label: "Empty hex spaces (tiebreak: fewer wins)", key: "emptyHexSpaces" },
    { label: "Bridge position (tiebreak: higher = farther behind)", key: "bridgePosition" },
];

// Winner(s) by: highest total, then fewest empty hex spaces, then farthest
// behind on the bridge (highest bridgePosition). Returns >1 id only on a full tie.
function winningIds(players: Player[]): Set<string> {
    if (players.length === 0) return new Set();
    const best = [...players].sort(
        (a, b) =>
            playerTotal(b) - playerTotal(a) ||
            a.emptyHexSpaces - b.emptyHexSpaces ||
            b.bridgePosition - a.bridgePosition,
    )[0];
    return new Set(
        players
            .filter(
                p =>
                    playerTotal(p) === playerTotal(best) &&
                    p.emptyHexSpaces === best.emptyHexSpaces &&
                    p.bridgePosition === best.bridgePosition,
            )
            .map(p => p.id),
    );
}

// Which tiebreaker rows are actually needed, given current totals/values.
// [] = no tie; ["emptyHexSpaces"] = total tie; both = still tied after empty hexes.
function neededTiebreakers(players: Player[]): TiebreakerKey[] {
    if (players.length < 2) return [];
    const max = Math.max(...players.map(playerTotal));
    const tiedOnTotal = players.filter(p => playerTotal(p) === max);
    if (tiedOnTotal.length < 2) return [];
    const minEmpty = Math.min(...tiedOnTotal.map(p => p.emptyHexSpaces));
    const tiedOnEmpty = tiedOnTotal.filter(p => p.emptyHexSpaces === minEmpty);
    return tiedOnEmpty.length < 2 ? ["emptyHexSpaces"] : ["emptyHexSpaces", "bridgePosition"];
}

export default function App() {
    const [players, setPlayers] = useState<Player[]>([makePlayer("todd")]);

    // Immutably update one field of one player by id.
    function updateField<K extends keyof Player>(id: string, key: K, value: Player[K]) {
        setPlayers(prev => prev.map(p => (p.id === id ? { ...p, [key]: value } : p)));
    }

    const winners = winningIds(players);
    const tiebreakers = neededTiebreakers(players);

    return (
        <div>
            <h1>Castles of Burgundy Score Calculator</h1>

            <button
                onClick={() =>
                    setPlayers(prev => [...prev, makePlayer(`Player ${prev.length + 1}`)])
                }
            >
                Add player
            </button>

            <table>
                <thead>
                <tr>
                    <th scope="col">Category</th>
                    {players.map(player => (
                        <th key={player.id} scope="col">
                            <input
                                type="text"
                                value={player.name}
                                aria-label="Player name"
                                onChange={e => updateField(player.id, "name", e.target.value)}
                            />
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {SCORE_ROWS.map(row => (
                    <tr key={row.key}>
                        <th scope="row">{row.label}</th>
                        {players.map(player => (
                            <td key={player.id}>
                                <input
                                    type="number"
                                    min={0}
                                    inputMode="numeric"
                                    value={player[row.key]}
                                    aria-label={`${row.label} for ${player.name}`}
                                    onChange={e =>
                                        updateField(player.id, row.key, Number(e.target.value))
                                    }
                                />
                            </td>
                        ))}
                    </tr>
                ))}
                </tbody>
                <tfoot>
                <tr>
                    <th scope="row">Total</th>
                    {players.map(player => {
                        const isWinner = winners.has(player.id);
                        return (
                            <td
                                key={player.id}
                                className={isWinner ? "winner" : undefined}
                                aria-label={`Total ${playerTotal(player)} for ${player.name}${isWinner ? ", winner" : ""}`}
                            >
                                {isWinner ? "🏆 " : ""}{playerTotal(player)}
                            </td>
                        );
                    })}
                </tr>
                {TIEBREAKER_ROWS.filter(row => tiebreakers.includes(row.key)).map(row => (
                    <tr key={row.key}>
                        <th scope="row">{row.label}</th>
                        {players.map(player => (
                            <td key={player.id}>
                                <input
                                    type="number"
                                    min={0}
                                    inputMode="numeric"
                                    value={player[row.key]}
                                    aria-label={`${row.label} for ${player.name}`}
                                    onChange={e =>
                                        updateField(player.id, row.key, Number(e.target.value))
                                    }
                                />
                            </td>
                        ))}
                    </tr>
                ))}
                </tfoot>
            </table>
        </div>
    );
}
