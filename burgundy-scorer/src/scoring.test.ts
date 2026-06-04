import { describe, it, expect } from "vitest";
import {
    type Player,
    makePlayer,
    playerTotal,
    neededTiebreakers,
    ranking,
} from "./scoring";

// Build a player with specific overrides on top of the zeroed defaults.
function player(overrides: Partial<Player>): Player {
    return { ...makePlayer("P"), ...overrides };
}

describe("playerTotal", () => {
    it("sums base categories plus monastery tiles at their rates", () => {
        // 10 board + #15 goods-variety 4×2 + #26 bonus-tiles 3×3 = 10 + 8 + 9
        const p = player({
            boardVp: 10,
            monasteries: [
                { tile: "15", count: 4 },
                { tile: "26", count: 3 },
            ],
        });
        expect(playerTotal(p)).toBe(27);
    });

    it("applies the building monastery 4× and livestock 4× multipliers", () => {
        const p = player({
            monasteries: [
                { tile: "17", count: 2 },
                { tile: "22", count: 1 },
                { tile: "24", count: 3 },
            ],
        });
        expect(playerTotal(p)).toBe(2 * 4 + 1 * 4 + 3 * 4);
    });

    it("ignores tiebreaker fields and unknown monastery tiles", () => {
        const p = player({
            boardVp: 5,
            emptyHexSpaces: 9,
            bridgePosition: 9,
            monasteries: [{ tile: "999", count: 5 }],
        });
        expect(playerTotal(p)).toBe(5);
    });

    it("adds shield VP by tier (#1-6=12, #7-12=8, #13-18=4)", () => {
        const p = player({ shields: [1, 7, 18] });
        expect(playerTotal(p)).toBe(12 + 8 + 4);
    });

    it("shield #10 doubles the player's monastery VP", () => {
        // #10 is worth 8; monastery #17 = 2×4 = 8, doubled to 16.
        const p = player({ shields: [10], monasteries: [{ tile: "17", count: 2 }] });
        expect(playerTotal(p)).toBe(8 + 16);
    });

    it("shield #13 doubles total shield VP (including itself)", () => {
        // #5 (12) + #13 (4) = 16, doubled = 32.
        const p = player({ shields: [5, 13] });
        expect(playerTotal(p)).toBe(32);
    });
});

describe("neededTiebreakers", () => {
    it("needs none for a single player", () => {
        expect(neededTiebreakers([player({})])).toEqual([]);
    });

    it("needs none when totals differ", () => {
        expect(neededTiebreakers([player({ boardVp: 10 }), player({ boardVp: 8 })])).toEqual([]);
    });

    it("needs empty-hex when totals tie but empty-hex differs", () => {
        const ps = [
            player({ boardVp: 10, emptyHexSpaces: 1 }),
            player({ boardVp: 10, emptyHexSpaces: 5 }),
        ];
        expect(neededTiebreakers(ps)).toEqual(["emptyHexSpaces"]);
    });

    it("needs both when totals and empty-hex tie", () => {
        const ps = [
            player({ boardVp: 10, emptyHexSpaces: 3 }),
            player({ boardVp: 10, emptyHexSpaces: 3 }),
        ];
        expect(neededTiebreakers(ps)).toEqual(["emptyHexSpaces", "bridgePosition"]);
    });
});

describe("ranking", () => {
    it("assigns places in tiebreaker order regardless of input order", () => {
        const a = player({ boardVp: 30 });
        const b = player({ boardVp: 20 });
        const c = player({ boardVp: 25 });
        const places = ranking([b, a, c]);
        expect(places.get(a.id)).toBe(1);
        expect(places.get(c.id)).toBe(2);
        expect(places.get(b.id)).toBe(3);
    });

    it("shares a place on a full tie and skips the next (1, 1, 3)", () => {
        const a = player({ boardVp: 30 });
        const b = player({ boardVp: 30 });
        const c = player({ boardVp: 10 });
        const places = ranking([a, b, c]);
        expect(places.get(a.id)).toBe(1);
        expect(places.get(b.id)).toBe(1);
        expect(places.get(c.id)).toBe(3);
    });
});
