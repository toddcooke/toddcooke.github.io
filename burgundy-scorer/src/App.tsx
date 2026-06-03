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
    { label: "Goods variety monastery (2 VP/type)", key: "goodsTypesSold", vpPerUnit: 2 },
    { label: "Building monastery (4 VP/building)", key: "buildingMonasteryMatches", vpPerUnit: 4 },
    { label: "Livestock variety monastery (4 VP/type)", key: "livestockTypes", vpPerUnit: 4 },
    { label: "Goods sold monastery (1 VP/tile)", key: "goodsSold", vpPerUnit: 1 },
    { label: "Bonus-tile monastery (3 VP/tile)", key: "bonusTilesOwned", vpPerUnit: 3 },
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
    };
}

// Total VP: each category's count multiplied by its VP-per-unit.
function playerTotal(p: Player): number {
    return SCORE_ROWS.reduce((sum, row) => sum + p[row.key] * row.vpPerUnit, 0);
}

export default function App() {
    const [players, setPlayers] = useState<Player[]>([makePlayer("todd")]);

    // Immutably update one field of one player by id.
    function updateField<K extends keyof Player>(id: string, key: K, value: Player[K]) {
        setPlayers(prev => prev.map(p => (p.id === id ? { ...p, [key]: value } : p)));
    }

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
                    {players.map(player => (
                        <td key={player.id}>{playerTotal(player)}</td>
                    ))}
                </tr>
                </tfoot>
            </table>
        </div>
    );
}
