import assert from "node:assert/strict";
import { test } from "node:test";
import dataset from "../slangDataset.ts";
import { createTranslationEngine, type EngineOptions } from "../translationCore.ts";

const engine = createTranslationEngine(dataset);
const base: EngineOptions = { kind: "received", targetLanguage: "ru", mode: "mirror", preserveStyle: true,
    smartSourceSlang: true, targetSlangPacks: true, protectNames: true, customProtectedNames: "",
    dropEnglishApostrophes: false, softenAmbiguousProfanity: true };
for (const mode of ["clean", "casual", "slang", "heavy", "mirror"] as const)
    test(`crafting is not counterfeiting / ${mode}`, () => {
        const p = engine.prepare("i forged a TON. Only 3/4", { ...base, mode, context: { replyMessage: "4/4 stats on heavy gears" } });
        assert.match(p.text, /i crafted/iu);
        assert.equal(p.sourceLanguage, "en");
        assert.match(p.restore(p.text), /TON.*3\/4/u);
        assert.doesNotMatch(p.text, /kilogram|tonnes|tons of metal/iu);
    });

for (const source of ["I forged a passport", "I forged a signature on armor documents", "we forged an alliance", "they forged evidence", "I forged a TON"])
    test(`ambiguous or literal forge remains unchanged: ${source}`, () => {
        const context = source === "I forged a TON" ? undefined : { replyMessage: "crafting armor" };
        assert.doesNotMatch(engine.prepare(source, { ...base, context }).text, /crafted/iu);
    });

test("nearby unrelated crafting chatter cannot decide the meaning", () => {
    const p = engine.prepare("I forged a TON", { ...base, context: { previousTurns: [
        { content: "crafting armor", relevance: 0 }, { content: "an afternoon walk", relevance: 4 },
    ] } });
    assert.doesNotMatch(p.text, /crafted/iu);
    assert.equal(engine.detectSourceLanguage("ton armure est lourde", { replyMessage: "I forged armor" }), "fr");
    assert.equal(engine.detectSourceLanguage("я написал I forged armor", { replyMessage: "crafting" }), "ru");
    const code = engine.prepare("`I forged armor`", base);
    assert.equal(code.restore(code.text), "`I forged armor`");
});

test("ore quantities preserve value and require crafting evidence", () => {
    const options = { ...base, context: { replyMessage: "How does forge luck work with armor?" } };
    assert.match(engine.prepare("Under 1000 ores yes", options).text, /1000 units of ore/u);
    assert.match(engine.prepare("around 1k ores", options).text, /1 thousand units of ore/u);
    for (const source of ["1.5k ores", "15.5 ores", "1000 types of ores", "1000 ores of different types"])
        assert.doesNotMatch(engine.prepare(source, options).text, /units of ore/u);
    assert.doesNotMatch(engine.prepare("1000 ores", base).text, /units of ore/u);
});

test("crafting label does not invent luck mechanics and entity protection wins", () => {
    const options = { ...base, context: { replyMessage: "heavy armor stats and ores" } };
    const p = engine.prepare("For forge luck only, you get one at around 1k ores", options);
    assert.match(p.restore(p.text), /forge luck/iu);
    assert.doesNotMatch(p.text, /success rate|guaranteed|double|percent/iu);
    const named = engine.prepare("For Forge Luck", { ...options, customProtectedNames: "Forge Luck" });
    assert.match(named.restore(named.text), /Forge Luck/u);
    assert.doesNotMatch(engine.prepare("forge luck", base).text, /SONYPROTECT/u);
});

test("obtained-result ellipsis preserves unknown item and numbers", () => {
    const options = { ...base, context: { replyMessage: "I forged a lot of armor" } };
    const p = engine.prepare("yeah I pulled one. 93% masterwork", options);
    assert.match(p.text, /I got one/u);
    assert.match(p.text, /93%/u);
    assert.doesNotMatch(p.text, /sword|bow|helmet/u);
    for (const source of ["I pulled one tooth", "I pulled one muscle", "I pulled one of the levers"])
        assert.doesNotMatch(engine.prepare(source, options).text, /I got one/u);
    assert.doesNotMatch(engine.prepare("I pulled one", base).text, /I got one/u);
});
