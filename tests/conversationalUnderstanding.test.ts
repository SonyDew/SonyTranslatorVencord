import assert from "node:assert/strict";
import { describe, test } from "node:test";

import slangDataset from "../slangDataset.ts";
import { ChatStyle, createTranslationEngine, EngineOptions, TranslationContext } from "../translationCore.ts";

const engine = createTranslationEngine(slangDataset);

function options(mode: ChatStyle, overrides: Partial<EngineOptions> = {}): EngineOptions {
    return {
        kind: "received",
        targetLanguage: "ru",
        mode,
        preserveStyle: true,
        smartSourceSlang: true,
        targetSlangPacks: true,
        protectNames: true,
        customProtectedNames: "",
        dropEnglishApostrophes: false,
        softenAmbiguousProfanity: true,
        ...overrides,
    };
}

function translate(input: string, provider: string, mode: ChatStyle, overrides: Partial<EngineOptions> = {}) {
    const prepared = engine.prepare(input, options(mode, overrides));
    return { prepared, output: engine.finalize(prepared, provider) };
}

describe("incoming phrase-level semantic understanding", () => {
    test("understands doom slang even in Clean instead of trusting a literal provider output", () => {
        const result = translate("im cooked", "я приготовлен", "clean");
        assert.equal(result.prepared.analysis.semanticMatches[0]?.id, "speaker_doomed");
        assert.equal(result.output, "У меня серьёзные проблемы");
    });

    test("keeps positive and negative cook constructions separate", () => {
        const doomed = translate("i'm cooked", "я приготовлен", "casual");
        const praise = translate("he cooked", "он приготовил", "casual");
        const permission = translate("let him cook", "пусть он готовит", "casual");
        assert.equal(doomed.prepared.analysis.semanticMatches[0]?.id, "speaker_doomed");
        assert.equal(praise.prepared.analysis.semanticMatches[0]?.id, "did_exceptionally_well");
        assert.equal(permission.prepared.analysis.semanticMatches[0]?.id, "let_them_work");
        assert.notEqual(doomed.output, praise.output);
        assert.match(praise.output, /справился|разнёс/i);
        assert.match(permission.output, /пусть/i);
    });

    test("literal cooking is protected by negative context", () => {
        const prepared = engine.prepare("I cooked chicken for dinner", options("slang"));
        assert.equal(prepared.analysis.semanticMatches.length, 0);
        assert.equal(prepared.shortcut, null);
    });

    test("normalizes a risky phrase inside a longer provider request", () => {
        const prepared = engine.prepare("ngl im cooked after that match", options("clean"));
        assert.match(prepared.text, /I am in serious trouble/i);
        assert.doesNotMatch(prepared.text, /\bim cooked\b/i);
    });

    test("semantic mappings cover all twelve source-language packs", () => {
        const cases: Array<[string, string]> = [
            ["en", "im cooked"], ["de", "ich bin geliefert"], ["ru", "мне конец"], ["uk", "мені кінець"],
            ["zh-cn", "我寄了"], ["zh-tw", "我沒救了"], ["es", "estoy frito"], ["fr", "je suis foutu"],
            ["pt-br", "tô ferrado"], ["pl", "po mnie"], ["ja", "詰んだ"], ["ko", "망했다"],
        ];
        for (const [language, input] of cases) {
            const prepared = engine.prepare(input, options("clean", { targetLanguage: "en" }));
            assert.equal(prepared.sourceLanguage, language, input);
            assert.equal(prepared.analysis.semanticMatches[0]?.id, "speaker_doomed", input);
        }
    });

    test("emoji remains data, not a word to translate", () => {
        const result = translate("im cooked 💀", "я приготовлен", "slang");
        assert.match(result.output, /мне конец|я всё/i);
        assert.equal(result.output.match(/💀/gu)?.length, 1);
    });

    test("Heavy semantic output never invents profanity absent from source", () => {
        for (const targetLanguage of ["de", "ru", "pl"] as const) {
            const result = translate("im cooked", "literal failure", "heavy", { targetLanguage });
            assert.doesNotMatch(result.output, /arsch|пиздец|przejebane/iu, targetLanguage);
        }
    });

    test("recognition-only comeback is understood but not copied as forced meme slang", () => {
        const result = translate("we're so back", "мы так вернулись", "heavy");
        assert.equal(result.prepared.analysis.semanticMatches[0]?.id, "comeback_restored");
        assert.equal(result.output, "мы снова в игре");
    });

    test("balance and combat phrases translate their gaming function", () => {
        assert.equal(translate("this build is busted", "эта сборка разрушена", "clean").output, "Это слишком сильное и несбалансированное");
        assert.equal(translate("i got one tapped", "меня нажали один раз", "slang").output, "меня ваншотнули");
        assert.equal(translate("got nerfed into the ground", "был ослаблен в землю", "casual").output, "его сильно понерфили");
    });

    test("Cyrillic transliteration of a universal reaction stays chat-native", () => {
        for (const mode of ["clean", "casual", "slang", "heavy", "mirror"] as const) {
            const result = translate("втф???", "was zum Teufel???", mode, { kind: "sent", targetLanguage: "de" });
            assert.equal(result.output, "wtf???", mode);
        }
    });
});

describe("short messages, context and mixed language", () => {
    test("reply context disambiguates a short agreement without becoming mandatory", () => {
        const context: TranslationContext = { replyMessage: "this sword got nerfed hard" };
        const prepared = engine.prepare("fr", options("mirror", { context }));
        assert.equal(prepared.sourceLanguage, "en");
        assert.notEqual(prepared.level, 3);
        assert.equal(engine.prepare("fr", options("mirror")).level, prepared.level);
    });

    test("one short slang token cannot force Heavy", () => {
        for (const input of ["fr", "bet", "gg", "based", "wild"]) {
            assert.notEqual(engine.prepare(input, options("mirror")).level, 3, input);
        }
    });

    test("mixed-script input is reported and protected Discord spans survive", () => {
        const input = "бля this build is so ass <@123> `npm test` https://example.com/x 💀";
        const prepared = engine.prepare(input, options("slang", { targetLanguage: "en" }));
        assert.equal(prepared.analysis.mixedLanguage, true);
        const output = engine.finalize(prepared, prepared.text);
        for (const value of ["<@123>", "`npm test`", "https://example.com/x", "💀"]) assert.ok(output.includes(value));
    });

    test("low-context Japanese phrase is not rewritten inside a polite sentence", () => {
        const prepared = engine.prepare("もう無理ですか", options("clean", { targetLanguage: "en" }));
        assert.equal(prepared.analysis.semanticMatches.length, 0);
    });
});
