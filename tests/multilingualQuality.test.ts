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
    ["bora jogar amanhã", "vamos jogar amanhã", "Bora is my username", "pt-br"],
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
