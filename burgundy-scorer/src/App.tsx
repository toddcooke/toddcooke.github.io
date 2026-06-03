import { useState } from "react";

interface Player {
    id: string;
    name: string;
    boardVp: number;          // running VP track (already includes color bonuses)
    unsoldGoodsTiles: number; // 1 VP each
    silverCoins: number;      // 1 VP each
    workerChipsPair: number;  // 1 VP per pair
}

type NumericKey = "boardVp" | "unsoldGoodsTiles" | "silverCoins" | "workerChipsPair";

// One entry per table row: a label and which Player field it edits.
const SCORE_ROWS: { label: string; key: NumericKey }[] = [
    { label: "Board VP", key: "boardVp" },
    { label: "Unsold goods tiles", key: "unsoldGoodsTiles" },
    { label: "Silver coins", key: "silverCoins" },
    { label: "Worker chips (pairs)", key: "workerChipsPair" },
];

function makePlayer(name: string): Player {
    return {
        id: crypto.randomUUID(),
        name,
        boardVp: 0,
        unsoldGoodsTiles: 0,
        silverCoins: 0,
        workerChipsPair: 0,
    };
}

// Total VP: every category contributes 1 VP per unit.
function playerTotal(p: Player): number {
    return SCORE_ROWS.reduce((sum, row) => sum + p[row.key], 0);
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
