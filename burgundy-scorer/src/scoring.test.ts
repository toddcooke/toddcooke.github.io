import { describe, it, expect } from "vitest";
import {
    type Player,
    makePlayer,
    playerTotal,
    winningIds,
    neededTiebreakers,
} from "./scoring";

// Build a player with specific overrides on top of the zeroed defaults.
function player(overrides: Partial<Player>): Player {
    return { ...makePlayer("P"), ...overrides };
}

describe("playerTotal", () => {
    it("sums numeric categories with their VP multipliers", () => {
        // 10 board + 4 goods-types ×2 + 3 bonus-tiles ×3 = 10 + 8 + 9
        const p = player({ boardVp: 10, goodsTypesSold: 4, bonusTilesOwned: 3 });
        expect(playerTotal(p)).toBe(27);
    });

    it("applies the building monastery 4× and livestock 4× multipliers", () => {
        const p = player({ buildingMonasteryMatches: 2, livestockTypes: 3 });
        expect(playerTotal(p)).toBe(2 * 4 + 3 * 4);
    });

    it("ignores tiebreaker-only fields", () => {
        const p = player({ boardVp: 5, emptyHexSpaces: 9, bridgePosition: 9 });
        expect(playerTotal(p)).toBe(5);
    });
});

describe("winningIds", () => {
    it("picks the highest total", () => {
        const a = player({ boardVp: 30 });
        const b = player({ boardVp: 20 });
        expect([...winningIds([a, b])]).toEqual([a.id]);
    });

    it("breaks a total tie by fewest empty hex spaces", () => {
        const a = player({ boardVp: 30, emptyHexSpaces: 5 });
        const b = player({ boardVp: 30, emptyHexSpaces: 2 });
        expect([...winningIds([a, b])]).toEqual([b.id]);
    });

    it("then breaks by highest bridge position (farthest behind)", () => {
        const a = player({ boardVp: 30, emptyHexSpaces: 3, bridgePosition: 2 });
        const b = player({ boardVp: 30, emptyHexSpaces: 3, bridgePosition: 7 });
        expect([...winningIds([a, b])]).toEqual([b.id]);
    });

    it("returns all players on a full tie", () => {
        const a = player({ boardVp: 30, emptyHexSpaces: 3, bridgePosition: 5 });
        const b = player({ boardVp: 30, emptyHexSpaces: 3, bridgePosition: 5 });
        expect(winningIds([a, b])).toEqual(new Set([a.id, b.id]));
    });

    it("is empty when there are no players", () => {
        expect(winningIds([])).toEqual(new Set());
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
