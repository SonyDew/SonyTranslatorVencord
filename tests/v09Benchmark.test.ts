import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import slangDataset from "../slangDataset.ts";
import { ChatStyle, createTranslationEngine, EngineOptions } from "../translationCore.ts";

const engine = createTranslationEngine(slangDataset);
const benchmark = JSON.parse(readFileSync(new URL("../benchmark/v09-semantic-benchmark.json", import.meta.url), "utf8"));
const requiredGroups = [
    "german_conversational_compression", "pragmatic_profanity", "intensifiers", "mode_differentiation",
    "multi_message_context", "reply_context", "global_chat_expressions", "register_preservation",
];

function options(row: any, mode: ChatStyle = "casual"): EngineOptions {
    return {
        kind: "sent",
        targetLanguage: row.targetLanguage,
        mode,
        preserveStyle: false,
        smartSourceSlang: true,
        targetSlangPacks: true,
        protectNames: true,
        customProtectedNames: "",
        dropEnglishApostrophes: false,
        softenAmbiguousProfanity: true,
        context: row.context,
    };
}

describe("v0.9 semantic/context benchmark", () => {
    test("contains eighty cases across every requested regression group", () => {
        assert.equal(benchmark.length, 80);
        const groups = new Set(benchmark.map((row: any) => row.group));
        for (const group of requiredGroups) {
            assert.ok(groups.has(group), group);
            assert.equal(benchmark.filter((row: any) => row.group === group).length, 10, group);
        }
    });

    test("all rows carry semantic invariants and prepare without exceptions", () => {
        for (const row of benchmark) {
            assert.ok(row.expectedImportantMeanings?.length, row.id);
            assert.ok(row.forbiddenSemanticChanges?.includes("invented profanity"), row.id);
            assert.doesNotThrow(() => engine.prepare(row.source, options(row)), row.id);
        }
    });

    test("local context never gets appended to the provider source", () => {
        for (const row of benchmark.filter((candidate: any) => candidate.context)) {
            const prepared = engine.prepare(row.source, options(row));
            for (const contextText of [row.context.replyMessage, ...(row.context.previousMessages ?? [])].filter(Boolean)) {
                if (contextText === row.source) continue;
                assert.equal(prepared.text.includes(contextText), false, row.id);
            }
        }
    });

    test("high-confidence profanity templates expose intensity slots", () => {
        const rows = benchmark.filter((row: any) => /пиздец как|блять как|ебать тут|сука как/.test(row.source));
        assert.ok(rows.length >= 8);
        for (const row of rows) {
            const prepared = engine.prepare(row.source, options(row));
            assert.equal(prepared.analysis.pragmaticProfanity[0]?.slots.intensity, "extreme", row.id);
            assert.ok(prepared.analysis.pragmaticProfanity[0]?.slots.pragmaticProfanityRole, row.id);
        }
    });

    test("safe mode differentiation cases do not collapse to one provider sentence", () => {
        const providers: Record<string, string> = {
            "как дела?": "Wie geht es dir?",
            "я очень хочу спать": "Ich will wirklich schlafen.",
            "пиздец как я хочу спать": "Verdammt, ich will wirklich schlafen.",
            "ты уже забрал награду?": "Hast du die Belohnung schon abgeholt?",
            "почему они ещё не починили этот баг?": "Warum haben sie diesen Bug noch nicht behoben?",
        };
        for (const [source, provider] of Object.entries(providers)) {
            const row = benchmark.find((candidate: any) => candidate.source === source && candidate.group === "mode_differentiation");
            assert.ok(row, source);
            const outputs = (["clean", "casual", "slang", "heavy"] as const).map(mode => {
                const prepared = engine.prepare(source, options(row, mode));
                return engine.finalize(prepared, provider);
            });
            assert.ok(new Set(outputs).size >= 3, `${source}: ${outputs.join(" | ")}`);
        }
    });
});
