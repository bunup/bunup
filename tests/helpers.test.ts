import { describe, expect, it } from "bun:test";
import {
    getEntryNameOnly,
    normalizeEntryToProcessableEntries,
} from "../src/helpers/entry";

describe("Helpers", () => {
    it("normalizes string entry", () => {
        const result = normalizeEntryToProcessableEntries("src/index.ts");
        expect(result).toEqual([{ name: "index", path: "src/index.ts" }]);
    });
    it("normalizes array entry", () => {
        const result = normalizeEntryToProcessableEntries([
            "src/index.ts",
            "src/utils.ts",
        ]);
        expect(result).toEqual([
            { name: "index", path: "src/index.ts" },
            { name: "utils", path: "src/utils.ts" },
        ]);
    });
    it("normalizes object entry", () => {
        const result = normalizeEntryToProcessableEntries({
            main: "src/index.ts",
        });
        expect(result).toEqual([{ name: "main", path: "src/index.ts" }]);
    });
    it("handles name conflicts", () => {
        const result = normalizeEntryToProcessableEntries(
            ["src/index.ts", "lib/index.ts"],
            {
                warnOnConflict: false,
            },
        );
        expect(result.length).toBe(2);
        expect(result[0].name).toBe("index");
        expect(result[1].name).toMatch(/^index_/);
    });
    it("getEntryNameOnly extracts name", () => {
        expect(getEntryNameOnly("src/index.ts")).toBe("index");
    });
});
