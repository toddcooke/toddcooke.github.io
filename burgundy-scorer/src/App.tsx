import { useEffect, useState } from "react";
import {
    type Player,
    SCORE_ROWS,
    TIEBREAKER_ROWS,
    makePlayer,
    playerTotal,
    ranking,
    neededTiebreakers,
} from "./scoring";

// "1ST", "2ND", "3RD", else "<n>TH" (player counts are small, so no 21ST edge cases).
function placeLabel(place: number): string {
    if (place === 1) return "1ST";
    if (place === 2) return "2ND";
    if (place === 3) return "3RD";
    return `${place}TH`;
}

const STORAGE_KEY = "burgundy-scorer:players";

// A fresh calculator: one blank player. Used on first load and on Clear.
function freshPlayers(): Player[] {
    return [makePlayer("Player 1")];
}

// Load saved players from localStorage, backfilling any missing fields so older
// saved data stays valid as the model grows. Falls back to a fresh calculator.
function loadPlayers(): Player[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return freshPlayers();
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) return freshPlayers();
        return parsed.map(p => ({ ...makePlayer(p?.name ?? "Player"), ...p }));
    } catch {
        return freshPlayers();
    }
}

export default function App() {
    const [players, setPlayers] = useState<Player[]>(loadPlayers);

    // Persist to localStorage whenever players change (ignore quota/private-mode errors).
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
        } catch {
            // Storage unavailable (private mode, quota) — keep working in-memory.
        }
    }, [players]);

    // Immutably update one field of one player by id.
    function updateField<K extends keyof Player>(id: string, key: K, value: Player[K]) {
        setPlayers(prev => prev.map(p => (p.id === id ? { ...p, [key]: value } : p)));
    }

    function removePlayer(id: string) {
        setPlayers(prev => prev.filter(p => p.id !== id));
    }

    const places = ranking(players);
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
            <button
                onClick={() => {
                    if (window.confirm("Clear all players and scores?")) {
                        setPlayers(freshPlayers());
                    }
                }}
            >
                Clear
            </button>

            <div className="table-scroll">
            <table>
                <caption>Castles of Burgundy — final scores</caption>
                <thead>
                <tr>
                    <th scope="col"></th>
                    {players.map((player, i) => (
                        <th key={player.id} scope="col">
                            <input
                                type="text"
                                value={player.name}
                                aria-label={`Player ${i + 1} name`}
                                onChange={e => updateField(player.id, "name", e.target.value)}
                            />
                            <button
                                type="button"
                                className="remove-player"
                                aria-label={`Remove ${player.name}`}
                                title={`Remove ${player.name}`}
                                onClick={() => removePlayer(player.id)}
                            >
                                ✕
                            </button>
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
                                    onFocus={e => e.target.select()}
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
                    <th scope="row">Place</th>
                    {players.map(player => {
                        const place = places.get(player.id) ?? players.length;
                        const rankClass = place <= 4 ? `rank-${place}` : "rank-other";
                        return (
                            <td key={player.id}>
                                <span
                                    className={`medal ${rankClass}`}
                                    aria-label={`${placeLabel(place)} place for ${player.name}`}
                                >
                                    {placeLabel(place)}
                                </span>
                            </td>
                        );
                    })}
                </tr>
                <tr>
                    <th scope="row">Total</th>
                    {players.map(player => (
                        <td
                            key={player.id}
                            aria-label={`Total ${playerTotal(player)} for ${player.name}`}
                        >
                            {playerTotal(player)}
                        </td>
                    ))}
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
                                    onFocus={e => e.target.select()}
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
        </div>
    );
}
