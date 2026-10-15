import assert from "node:assert/strict";
import { test } from "node:test";
import dataset from "../slangDataset.ts";
import { createTranslationEngine, type EngineOptions } from "../translationCore.ts";
import { runPreparedTranslation } from "../translationRunner.ts";

const engine = createTranslationEngine(dataset);
const options: EngineOptions = {
    kind: "received", targetLanguage: "en", mode: "mirror", preserveStyle: true,
    smartSourceSlang: true, targetSlangPacks: true, protectNames: true,
    customProtectedNames: "", dropEnglishApostrophes: false, softenAmbiguousProfanity: true,
};

for (const [source, normalized, literal, language] of [
    ["ich bin komplett lost", "ich bin völlig verwirrt", "the lost item", "de"],
    ["tkt je gère", "ne t'inquiète pas, je gère", "TKT is a product code", "fr"],
    ["bora jogar amanhã", "que tal jogar amanhã", "Bora is my username", "pt-br"],
    ["nwm czy działa", "nie wiem czy działa", "NWM protocol version", "pl"],
    ["你484忘了", "你是不是忘了", "數量是484個", "zh-tw"],
    ["шо ти робиш", "що ти робиш", "Шо is a username", "uk"],
]) test(`bounded source understanding: ${language}`, () => {
    const prepared = engine.prepare(source, options);
    assert.equal(prepared.sourceLanguage, language);
    assert.equal(prepared.text, normalized);
    const negative = engine.prepare(literal, options);
    assert.doesNotMatch(negative.text, new RegExp(normalized));
    // Entity protection must precede recognition, even for an entire name.
    const entity = engine.prepare(source, { ...options, customProtectedNames: source });
    assert.doesNotMatch(entity.text, new RegExp(normalized));
});

const doom = ["im cooked", "ich bin geliefert", "мне конец", "мені кінець", "我寄了", "我沒救了",
    "estoy frito", "je suis foutu", "tô ferrado", "po mnie", "詰んだ", "망했다"];
for (const targetLanguage of ["en", "de", "ru", "uk", "zh-CN", "zh-TW", "es", "fr", "pt-BR", "pl", "ja", "ko"]) {
    test(`all-language final realization preserves doom intent without invented aggression: ${targetLanguage}`, async () => {
        for (const source of doom) for (const mode of ["clean", "casual", "slang", "heavy", "mirror"] as const) {
            const prepared = engine.prepare(source, { ...options, targetLanguage, mode });
            const output = await runPreparedTranslation(engine, prepared, async () => "INVALID_LITERAL_COOKING");
            assert.ok(output.trim(), `${source}/${mode}`);
            assert.doesNotMatch(output, /INVALID_LITERAL|пиздец|fuck|scheiß|kurwa|씨발/iu, `${source}/${mode}`);
            if (!prepared.preserveTargetText) assert.equal(prepared.analysis.semanticMatches[0]?.id, "speaker_doomed");
        }
    });
}

for (const source of ["數量是484個", "我有94個", "數量是87個", "数量是666个", "数量是233个"]) {
    test(`numeric slang never overwrites literal quantity: ${source}`, async () => {
        const prepared = engine.prepare(source, { ...options, targetLanguage: "ru" });
        assert.equal(prepared.analysis.providerSafeInput, source);
        const number = source.match(/\d+/)![0];
        assert.match(await runPreparedTranslation(engine, prepared, async () => `Количество: ${number}`), new RegExp(number));
    });
}

test("captured Google formality errors are repaired only for evidenced informal sources", () => {
    for (const mode of ["clean", "casual", "slang", "heavy", "mirror"] as const) {
        const french = engine.prepare("tkt je gère", { ...options, mode, targetLanguage: "ru" });
        assert.equal(french.analysis.register, "informal");
        assert.match(engine.finalize(french, "Не волнуйтесь, я справлюсь."), /не волнуйся/iu);
        const taiwan = engine.prepare("你484忘了", { ...options, mode, targetLanguage: "ru" });
        assert.match(engine.finalize(taiwan, "Вы забыли?"), /ты забыл/iu);
        assert.equal(engine.finalize(engine.prepare("ne vous inquiétez pas", { ...options, mode: "clean", targetLanguage: "ru" }),
            "Не волнуйтесь, я справлюсь."), "Не волнуйтесь, я справлюсь.");
        assert.equal(engine.finalize(engine.prepare("您是不是忘了", { ...options, mode: "clean", targetLanguage: "ru" }),
            "Вы забыли?"), "Вы забыли?");
    }
});

test("Brazilian play invitations do not normalize into an ambiguous future assertion", async () => {
    const prepared = engine.prepare("bora jogar amanhã", { ...options, targetLanguage: "ru" });
    assert.match(prepared.text, /^que tal jogar/);
    const output = await runPreparedTranslation(engine, prepared, async input => {
        assert.doesNotMatch(input, /^vamos jogar/);
        return "Как насчёт того, чтобы сыграть завтра?";
    });
    assert.match(output, /как насчёт.*сыграть завтра/iu);
    assert.doesNotMatch(output, /мы сыграем/iu);
});
