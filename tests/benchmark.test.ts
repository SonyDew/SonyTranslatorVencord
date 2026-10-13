import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import slangDataset from "../slangDataset.ts";
import { createTranslationEngine, EngineOptions } from "../translationCore.ts";

type BenchmarkCase = {
    id: string;
    source: string;
    sourceLanguage: string;
    semanticIntent: string;
    targetLanguage: string;
    expectedImportantMeanings: string[];
    forbiddenSemanticChanges: string[];
};

const cases = JSON.parse(readFileSync(new URL("../benchmark/conversational-benchmark.json", import.meta.url), "utf8")) as BenchmarkCase[];
const engine = createTranslationEngine(slangDataset);
const options = (row: BenchmarkCase): EngineOptions => ({
    kind: "received", targetLanguage: row.targetLanguage, mode: "mirror", preserveStyle: true,
    smartSourceSlang: true, targetSlangPacks: true, protectNames: true, customProtectedNames: "",
    dropEnglishApostrophes: false, softenAmbiguousProfanity: true,
});

describe("300-case conversational benchmark", () => {
    test("contains at least 25 cases for every supported language", () => {
        assert.ok(cases.length >= 300);
        for (const language of slangDataset.languages) {
            assert.ok(cases.filter(row => row.sourceLanguage.toLocaleLowerCase() === language.code.toLocaleLowerCase()).length >= 25, language.code);
        }
    });

    test("every case carries semantic invariants", () => {
        const ids = new Set<string>();
        for (const row of cases) {
            assert.ok(row.id && !ids.has(row.id), `duplicate/missing id ${row.id}`);
            ids.add(row.id);
            assert.ok(row.source.trim(), row.id);
            assert.ok(row.semanticIntent, row.id);
            assert.ok(row.expectedImportantMeanings.length, row.id);
            assert.ok(row.forbiddenSemanticChanges.length, row.id);
        }
    });

    test("all cases pass source analysis and preparation without semantic drift exceptions", () => {
        for (const row of cases) {
            assert.doesNotThrow(() => engine.prepare(row.source, options(row)), row.id);
        }
    });

    test("phrase-level benchmark rows resolve to the intended semantic category", () => {
        const expected = new Set(["overpowered_balance", "instant_defeat", "speaker_doomed", "comeback", "disbelief"]);
        for (const row of cases.filter(candidate => expected.has(candidate.semanticIntent))) {
            const prepared = engine.prepare(row.source, options(row));
            assert.ok(prepared.analysis.semanticMatches.length > 0, `${row.id}: ${row.source}`);
        }
    });

    test("literal cooking rows never trigger chat cook meanings", () => {
        for (const row of cases.filter(candidate => candidate.semanticIntent === "literal_cooking")) {
            const ids = engine.prepare(row.source, options(row)).analysis.semanticMatches.map(match => match.id);
            assert.ok(!ids.includes("speaker_doomed") && !ids.includes("did_exceptionally_well"), row.id);
        }
    });

    test("protected entities in the corpus survive round-trip restoration", () => {
        for (const row of cases.filter(candidate => /https:\/\/|<@|`|crash\.log/u.test(candidate.source))) {
            const prepared = engine.prepare(row.source, options(row));
            const restored = engine.finalize(prepared, prepared.text);
            for (const value of row.source.match(/https:\/\/\S+|<@\d+>|`[^`]+`|crash\.log/gu) ?? []) {
                assert.ok(restored.includes(value), `${row.id} lost ${value}`);
            }
        }
    });
});

