import { useEffect, useState } from "react";
import {
    type Player,
    SCORE_ROWS,
    TIEBREAKER_ROWS,
    MONASTERY_TILES,
    monasteryTile,
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
const MAX_PLAYERS = 4; // Castles of Burgundy supports up to 4 players.

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
        return parsed.slice(0, MAX_PLAYERS).map(p => ({ ...makePlayer(p?.name ?? "Player"), ...p }));
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

    // Immutably update one base field of one player by id.
    function updateField<K extends keyof Player>(id: string, key: K, value: Player[K]) {
        setPlayers(prev => prev.map(p => (p.id === id ? { ...p, [key]: value } : p)));
    }

    function removePlayer(id: string) {
        setPlayers(prev => prev.filter(p => p.id !== id));
    }

    function addMonastery(ownerId: string, tile: string) {
        setPlayers(prev =>
            prev.map(p =>
                p.id === ownerId ? { ...p, monasteries: [...p.monasteries, { tile, count: 1 }] } : p,
            ),
        );
    }

    function setMonasteryCount(ownerId: string, tile: string, count: number) {
        setPlayers(prev =>
            prev.map(p =>
                p.id === ownerId
                    ? { ...p, monasteries: p.monasteries.map(h => (h.tile === tile ? { ...h, count } : h)) }
                    : p,
            ),
        );
    }

    function removeMonastery(ownerId: string, tile: string) {
        setPlayers(prev =>
            prev.map(p =>
                p.id === ownerId ? { ...p, monasteries: p.monasteries.filter(h => h.tile !== tile) } : p,
            ),
        );
    }

    const places = ranking(players);
    const tiebreakers = neededTiebreakers(players);

    // Tiles already owned by someone, so each unique tile is offered only once.
    const ownedTileIds = new Set(players.flatMap(p => p.monasteries.map(h => h.tile)));
    const availableTiles = MONASTERY_TILES.filter(t => !ownedTileIds.has(t.id));

    return (
        <div>
            <h1>Castles of Burgundy Score Calculator</h1>

            <button
                disabled={players.length >= MAX_PLAYERS}
                onClick={() =>
                    setPlayers(prev =>
                        prev.length >= MAX_PLAYERS
                            ? prev
                            : [...prev, makePlayer(`Player ${prev.length + 1}`)],
                    )
                }
            >
                Add player
            </button>
            <button
                onClick={() => {
                    if (window.confirm("Reset all scores? Players are kept.")) {
                        // Zero every score but keep each player's id and name.
                        setPlayers(prev => prev.map(p => ({ ...makePlayer(p.name), id: p.id })));
                    }
                }}
            >
                Clear scores
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
                                disabled={players.length <= 1}
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
                <tr>
                    <th scope="row">Monasteries</th>
                    {players.map(player => (
                        <td key={player.id} className="monastery-cell">
                            {player.monasteries.length > 0 && (
                                <ul>
                                    {player.monasteries.map(h => {
                                        const tile = monasteryTile(h.tile);
                                        if (!tile) return null;
                                        return (
                                            <li key={h.tile}>
                                                <span className="m-name">Monastery {h.tile}</span>
                                                <span className="m-unit">{tile.unitLabel}:</span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    inputMode="numeric"
                                                    value={h.count}
                                                    aria-label={`${tile.unitLabel} for ${player.name} (Monastery ${h.tile})`}
                                                    onFocus={e => e.target.select()}
                                                    onChange={e =>
                                                        setMonasteryCount(
                                                            player.id,
                                                            h.tile,
                                                            Number(e.target.value),
                                                        )
                                                    }
                                                />
                                                <button
                                                    type="button"
                                                    className="m-remove"
                                                    aria-label={`Remove Monastery ${h.tile} from ${player.name}`}
                                                    title="Remove this monastery"
                                                    onClick={() => removeMonastery(player.id, h.tile)}
                                                >
                                                    ✕
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            {availableTiles.length > 0 && (
                                <select
                                    aria-label={`Add monastery for ${player.name}`}
                                    value=""
                                    onChange={e => {
                                        if (e.target.value) addMonastery(player.id, e.target.value);
                                    }}
                                >
                                    <option value="">+ Add monastery…</option>
                                    {availableTiles.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.label}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </td>
                    ))}
                </tr>
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
