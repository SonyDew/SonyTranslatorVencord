import assert from "node:assert/strict";
import { describe, test } from "node:test";

import slangDataset from "../slangDataset.ts";
import { ChatStyle, createTranslationEngine, EngineOptions } from "../translationCore.ts";

const engine = createTranslationEngine(slangDataset);

function options(mode: ChatStyle, targetLanguage = "de", overrides: Partial<EngineOptions> = {}): EngineOptions {
    return {
        kind: "sent",
        targetLanguage,
        mode,
        preserveStyle: false,
        smartSourceSlang: true,
        targetSlangPacks: true,
        protectNames: true,
        customProtectedNames: "",
        dropEnglishApostrophes: false,
        softenAmbiguousProfanity: true,
        ...overrides,
    };
}

function translate(source: string, provider: string, mode: ChatStyle, targetLanguage = "de", overrides: Partial<EngineOptions> = {}) {
    const prepared = engine.prepare(source, options(mode, targetLanguage, overrides));
    return { prepared, output: engine.finalize(prepared, provider) };
}

describe("v0.9 German conversational realization", () => {
    for (const source of ["как дела?", "як справи?", "how are you?"]) {
        test(`${source} has mode-specific German without formal Sie`, () => {
            const outputs = (["clean", "casual", "slang", "heavy"] as const)
                .map(mode => translate(source, "Wie geht es dir?", mode).output);
            assert.deepEqual(outputs, ["Wie geht's dir?", "Wie geht's?", "wie gehts?", "wie gehts"]);
            assert.equal(new Set(outputs).size, 4);
            for (const output of outputs) assert.doesNotMatch(output, /\bSie\b|Ihnen/);
        });
    }

    test("Mirror follows a plain lowercase source instead of escalating one short question", () => {
        const result = translate("как дела?", "Wie geht es dir?", "mirror", "de", { preserveStyle: true });
        assert.equal(result.prepared.level, 1);
        assert.equal(result.output, "wie geht's?");
    });

    test("reward and unresolved-bug clauses compress structurally", () => {
        const reward = (["clean", "casual", "slang", "heavy"] as const).map(mode =>
            translate("ты уже забрал награду?", "Hast du die Belohnung schon abgeholt?", mode).output);
        assert.equal(new Set(reward).size, 4);
        assert.deepEqual(reward, [
            "Hast du die Belohnung schon abgeholt?",
            "Hast du die Belohnung schon geholt?",
            "Belohnung schon geholt?",
            "Belohnung schon geholt",
        ]);

        const bug = (["clean", "casual", "slang", "heavy"] as const).map(mode =>
            translate("почему они ещё не починили этот баг?", "Warum haben sie diesen Bug noch nicht behoben?", mode).output);
        assert.equal(new Set(bug).size, 4);
        assert.deepEqual(bug, [
            "Warum haben sie diesen Bug noch nicht behoben?",
            "Warum haben die den Bug noch nicht gefixt?",
            "warum ist der Bug immer noch nicht gefixt?",
            "warum ist der Bug noch nicht gefixt",
        ]);
    });

    test("neutral source can compress in Heavy without gaining profanity or a vocative", () => {
        const output = translate("я очень хочу спать", "Ich will wirklich schlafen.", "heavy").output;
        assert.equal(output, "will nur pennen");
        assert.doesNotMatch(output, /(?:scheiße|verdammt|digga|brudi|alter)/iu);
    });

    test("common German chat clauses use structural compression instead of token decoration", () => {
        const rows: Array<[string, string, string, string]> = [
            ["ты уже проверил сервер?", "Hast du den Server bereits überprüft?", "Hast du den Server schon gecheckt?", "Server gecheckt?"],
            ["я сейчас зайду", "Ich werde jetzt beitreten.", "Ich komm gleich rein.", "gleich drin"],
            ["у тебя ещё есть хилки?", "Haben Sie noch Heilungen?", "Hast du noch Heals?", "Heals?"],
            ["мы уже закончили", "Wir haben bereits abgeschlossen.", "Wir sind schon fertig.", "schon fertig"],
            ["есть ещё место?", "Gibt es noch einen Platz?", "Gibt's noch einen Platz?", "gibts noch einen Platz"],
            ["я только что получил дроп", "Ich habe gerade den Drop bekommen.", "Ich hab gerade den Drop bekommen.", "grad den Drop bekommen."],
        ];
        for (const [source, provider, casual, heavy] of rows) {
            assert.equal(translate(source, provider, "casual").output, casual, source);
            assert.equal(translate(source, provider, "heavy").output, heavy, source);
        }
    });

    test("German compression guards formal/business clauses and unrelated predicates", () => {
        assert.equal(engine.naturalize("Ich habe gerade den Vertrag geprüft.", "de", 3), "Ich habe gerade den Vertrag geprüft.");
        assert.equal(engine.naturalize("Ich habe seit Jahren Erfahrung.", "de", 3), "Ich habe seit Jahren Erfahrung.");
        assert.equal(engine.naturalize("Wir haben bereits einen Vertrag.", "de", 3), "Wir haben bereits einen Vertrag.");
        assert.equal(engine.naturalize("Gibt es", "de", 3), "Gibt es");
    });
});

describe("pragmatic profanity and semantic slots", () => {
    test("пиздец как я хочу спать is an extreme intensifier, not a standalone curse", () => {
        const prepared = engine.prepare("пиздец как я хочу спать", options("casual", "de"));
        const match = prepared.analysis.pragmaticProfanity[0];
        assert.equal(match?.role, "intensifier");
        assert.equal(match?.slots.intent, "desire");
        assert.equal(match?.slots.action, "sleep");
        assert.equal(match?.slots.intensity, "extreme");
        assert.equal(match?.slots.emotion, "exhaustion");
        assert.equal(match?.slots.pragmaticProfanityRole, "intensifier");
        assert.match(prepared.text, /очень сильно хочу спать/);
        assert.doesNotMatch(prepared.text, /пиздец|чёрт|проклят/iu);
    });

    test("sleep intensifier realizes meaning and strength in six requested targets", () => {
        const expected: Record<string, RegExp> = {
            de: /pennen|schlafen/iu,
            en: /sleep/iu,
            uk: /спати/iu,
            pl: /spa[ćc]/iu,
            fr: /dormir/iu,
            es: /dormir|sueño/iu,
        };
        for (const [language, pattern] of Object.entries(expected)) {
            const clean = translate("пиздец как я хочу спать", "literal provider failure", "clean", language).output;
            const heavy = translate("пиздец как я хочу спать", "literal provider failure", "heavy", language).output;
            assert.match(clean, pattern, `${language}/clean`);
            assert.match(heavy, pattern, `${language}/heavy`);
            assert.notEqual(clean, heavy, language);
        }
    });

    const analogous: Array<[string, string, string]> = [
        ["пиздец как холодно", "intensifier", "очень холодно"],
        ["пиздец как жарко", "intensifier", "очень жарко"],
        ["пиздец как красиво", "admiration", "невероятно красиво"],
        ["пиздец как долго", "frustration", "ужасно долго"],
        ["пиздец как бесит", "frustration", "ужасно бесит"],
        ["блять как я устал", "intensifier", "я очень сильно устал"],
        ["ебать тут красиво", "admiration", "невероятно красиво"],
        ["сука как больно", "intensifier", "очень больно"],
    ];
    for (const [source, role, normalized] of analogous) {
        test(`${source} keeps its pragmatic function`, () => {
            const prepared = engine.prepare(source, options("casual", "de"));
            assert.equal(prepared.analysis.pragmaticProfanity[0]?.role, role);
            assert.equal(prepared.analysis.pragmaticProfanity[0]?.slots.intensity, "extreme");
            assert.equal(prepared.text, normalized);
        });
    }

    test("positive admiration never becomes negative disaster", () => {
        const prepared = engine.prepare("пиздец как красиво", options("heavy", "de"));
        assert.equal(prepared.analysis.pragmaticProfanity[0]?.slots.polarity, "positive");
        assert.equal(prepared.analysis.pragmaticProfanity[0]?.slots.emotion, "admiration");
    });
});

describe("bounded local context and lightweight clause analysis", () => {
    test("a prior gaming message resolves real as agreement without entering provider text", () => {
        const context = { previousMessages: ["random older line", "this sword got nerfed again"] };
        const prepared = engine.prepare("real", options("casual", "de", { context }));
        assert.equal(prepared.analysis.semanticMatches[0]?.id, "contextual_agreement_reaction");
        assert.equal(prepared.analysis.semanticSlots[0]?.stance, "agreement");
        assert.ok(prepared.analysis.contextSignals.includes("context:gaming_cue"));
        assert.doesNotMatch(prepared.text, /sword|nerfed|older/iu);
    });

    test("real without related context remains conservative", () => {
        const prepared = engine.prepare("real", options("casual", "de"));
        assert.equal(prepared.analysis.semanticMatches.some(match => match.id === "contextual_agreement_reaction"), false);
    });

    test("context is bounded to four messages and current-message language wins", () => {
        const previousMessages = ["one", "two", "three", "four", "five", "this sword got nerfed"];
        const prepared = engine.prepare("это реально плохо", options("mirror", "de", { context: { previousMessages } }));
        assert.equal(prepared.sourceLanguage, "ru");
        assert.ok(prepared.analysis.contextSignals.includes("local_window:4"));
    });

    test("clause parser exposes question, negation, modal and connectors for debugging", () => {
        const analysis = engine.analyzeSource("However, can you check why they still haven't fixed this bug?");
        assert.equal(analysis.clauses.speechAct, "complaint");
        assert.equal(analysis.clauses.isQuestion, true);
        assert.equal(analysis.clauses.isComplaint, true);
        assert.equal(analysis.clauses.hasNegation, true);
        assert.equal(analysis.clauses.hasModal, true);
        assert.ok(analysis.clauses.discourseConnectors.includes("however"));
        assert.ok(Array.isArray(analysis.selectedTransformations));
    });
});
