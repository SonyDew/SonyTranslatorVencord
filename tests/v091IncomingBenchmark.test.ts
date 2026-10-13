import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import slangDataset from "../slangDataset.ts";
import { createTranslationEngine, EngineOptions, TranslationContext } from "../translationCore.ts";

const engine = createTranslationEngine(slangDataset);
const rows = JSON.parse(readFileSync(new URL("../benchmark/v091-incoming-chat-benchmark.json", import.meta.url), "utf8"));
const categories = ["typos", "abbreviations", "short_reactions", "slang", "member_names", "reply_ellipsis",
    "malformed_grammar", "emoji", "expressive_spelling", "polysemy", "gaming", "moderation_mixed"];

function context(row: any): TranslationContext {
    return { domain: "chat", ...(row.context ?? {}), participants: row.participants ?? [] };
}

function options(row: any): EngineOptions {
    return {
        kind: "received", targetLanguage: "ru", mode: "casual", preserveStyle: false,
        smartSourceSlang: true, targetSlangPacks: true, protectNames: true,
        customProtectedNames: "", dropEnglishApostrophes: false,
        softenAmbiguousProfanity: true, context: context(row),
    };
}

describe("v0.9.1 120-case messy incoming benchmark", () => {
    test("covers twelve incoming-chat categories and at least twenty-five dictionary traps", () => {
        assert.equal(rows.length, 120);
        for (const category of categories) assert.equal(rows.filter((row: any) => row.category === category).length, 10, category);
        assert.ok(rows.filter((row: any) => row.dictionaryTranslationWrong).length >= 25);
    });

    test("contains every supplied real Discord regression", () => {
        const required = [
            "Sup mocha dude", "Aint no way you deleted them youre actually so weird 😭", "Deleted what?",
            "Brb, gotta remind my gf to medicate", "The stuff theres already screenshots of that doesn't even make sense to delete",
            "sup", "How's life", "Idk what you're accusing me off 💀", "Nah youre actually odd💀", "Cool",
            "why is rob so oddd", "this chat so odd", "Finna send the forbidden ss",
        ];
        for (const source of required) assert.ok(rows.some((row: any) => row.source === source), source);
    });

    test("all rows produce a bounded local debug trace without throwing", () => {
        for (const row of rows) {
            const prepared = engine.prepare(row.source, options(row));
            assert.ok(Array.isArray(prepared.analysis.recognizedEntities), row.id);
            assert.ok(Array.isArray(prepared.analysis.normalizedTypos), row.id);
            assert.ok(Array.isArray(prepared.analysis.recognizedAbbreviations), row.id);
            assert.ok(Array.isArray(prepared.analysis.selectedSenses), row.id);
            assert.ok(typeof prepared.analysis.providerSafeInput === "string", row.id);
            assert.equal((prepared.options.context?.previousTurns ?? []).length <= 4, true, row.id);
        }
    });

    test("shadow comparison fixes known raw/v0.9.0 failures", () => {
        const providers: Record<string, string> = {
            "Cool": "Прохладный",
            "Sup mocha dude": "Привет чувак-мокко",
            "why is rob so oddd": "почему грабить так нечётно",
            "Finna send the forbidden ss": "Финна отправляет запрещённый SS",
            "this chat so odd": "этот чат такой нечётный",
        };
        for (const [source, raw] of Object.entries(providers)) {
            const row = rows.find((candidate: any) => candidate.source === source);
            assert.ok(row, source);
            const prepared = engine.prepare(source, options(row));
            const candidate = engine.finalize(prepared, raw);
            assert.notEqual(candidate, raw, source);
            assert.doesNotMatch(candidate, /прохладный|мокко|грабить|нечётн|\bSS\b|\bФинна\b/iu, source);
        }
    });

    test("ambiguous-token coverage includes collisions and recognition-only forms", () => {
        const corpus = rows.map((row: any) => row.source.toLowerCase()).join("\n");
        for (const token of ["cool", "real", "fire", "sick", "hard", "dead", "mad", "ss", "af", "mb"])
            assert.match(corpus, new RegExp(`\\b${token}\\b`, "i"), token);
        const recognitionOnly = slangDataset.languages.flatMap(language => language.slang)
            .filter(entry => entry.can_recognize && !entry.can_generate);
        for (const token of ["finna", "boutta", "ss", "gf"])
            assert.ok(recognitionOnly.some(entry => entry.forms.includes(token)), token);
    });

    test("literal negatives do not select reaction or nickname senses", () => {
        const literal: Array<[string, string]> = [
            ["It's cool outside.", "На улице прохладно."], ["I ordered a mocha.", "Я заказал мокко."],
            ["He's taking a screenshot.", "Он делает скриншот."], ["She is sick.", "Она больна."],
            ["The pan is hot.", "Сковорода горячая."],
        ];
        const literalContext: TranslationContext = {
            domain: "chat",
            participants: [{ id: "mocha", username: "mocha", displayName: "Mocha", evidence: "recent_author" }],
        };
        for (const [source, provider] of literal) {
            const prepared = engine.prepare(source, { ...options({ participants: [] }), context: literalContext });
            assert.equal(prepared.analysis.incomingChatMatches.length, 0, source);
            assert.equal(engine.finalize(prepared, provider), provider, source);
        }
    });
});
