import assert from "node:assert/strict";
import { test } from "node:test";
import dataset from "../slangDataset.ts";
import { createTranslationEngine, type EngineOptions } from "../translationCore.ts";

const engine = createTranslationEngine(dataset);
const base: EngineOptions = { kind: "received", targetLanguage: "ru", mode: "mirror", preserveStyle: true,
    smartSourceSlang: true, targetSlangPacks: true, protectNames: true, customProtectedNames: "",
    dropEnglishApostrophes: false, softenAmbiguousProfanity: true };

for (const mode of ["clean", "casual", "slang", "heavy", "mirror"] as const) {
    test(`dictionary contextual meanings / ${mode}`, () => {
        const options = { ...base, mode, context: { replyMessage: "I only have one drop after 400 spins" } };
        const rip = engine.prepare("rip", options);
        assert.ok(rip.shortcut);
        assert.doesNotMatch(engine.finalize(rip, "рвать"), /рвать|умер|мертв/iu);
        const pity = engine.prepare("pities?", options);
        assert.match(engine.finalize(pity, "жалости?"), /гарант/iu);
        const terms = engine.prepare("add pities for race rerolls and the glory core system", options);
        assert.match(terms.restore(terms.text), /guaranteed drop systems/iu);
        assert.match(terms.restore(terms.text), /glory core/iu);
    });
}

for (const source of ["I feel pity for people after losing my gacha pulls", "What a pity, I wasted my spins", "Take pity on me", "self-pity", "pity people", "pity"])
    test(`literal pity not protected: ${source}`, () => {
        const p = engine.prepare(source, { ...base, context: { replyMessage: "gacha spins" } });
        if (source === "pity") {
            // Here nearby context DOES supply the gacha sense; absence of it must not.
            assert.doesNotMatch(engine.prepare(source, base).text, /SONYPROTECT/u);
        } else assert.doesNotMatch(p.restore(p.text), /гарант/u);
    });

test("reaction shortcuts require relevant context; literal, solemn and unrelated context blocks them", () => {
    for (const replyMessage of ["rip this paper", "rip a DVD", "my friend died", "my grandfather passed away", "routing protocol", "a sunny afternoon"]) {
        assert.equal(engine.prepare("rip", { ...base, context: { replyMessage } }).shortcut, null);
    }
    assert.equal(engine.prepare("rip", base).shortcut, null);
    assert.equal(engine.prepare("pities?", base).shortcut, null);
    assert.equal(engine.prepare("pities?", { ...base, context: { previousTurns: [{ content: "gacha spins", relevance: 0 }] } }).shortcut, null);
    assert.doesNotMatch(engine.prepare("pities?", { ...base, context: { previousTurns: [{ content: "gacha spins", relevance: 0 }] } }).text, /guaranteed/u);
});

test("counted reward attempts normalize without inferring ranks or altering quantities", () => {
    const p = engine.prepare("yeah im 400spins in total i think i have gotten a demon once", base);
    assert.match(p.text, /400 attempts to get random drops/u);
    for (const source of ["the centrifuge makes 400 spins", "400 spins at 800 rpm", "the bicycle wheel does 400 spins", "400 spins"]) {
        assert.doesNotMatch(engine.prepare(source, base).text, /attempts to get random drops/u);
    }
    const numbered = engine.prepare("I got lucifer 3 but havent gotten past demon 2", base);
    assert.doesNotMatch(numbered.text, /level|rank|copies/iu);
    assert.match(numbered.text, /3.*2/u);
});

test("inventory conjunction is scoped, never autocorrects a variable or participant", () => {
    assert.match(engine.prepare("shards n pities for race rerolls", base).text, /shards and/u);
    assert.doesNotMatch(engine.prepare("the variable shards n in this equation", base).text, /shards and/u);
    const name = engine.prepare("shards n pities for race rerolls", { ...base, customProtectedNames: "n" });
    assert.doesNotMatch(name.text, /shards and/u);
});

test("reroll exchange preserves which resource is paid without inventing a price", () => {
    const p = engine.prepare("add race rerolls for shards n pities", base);
    assert.match(p.text, /character's race in exchange for shards and guaranteed drop systems/u);
    assert.doesNotMatch(engine.prepare("a race for coins", base).text, /character's race/u);
    assert.doesNotMatch(engine.prepare("rerolls give shards", base).text, /in exchange for/u);
});

test("member names, code and filenames precede dictionary sense selection", () => {
    const options = { ...base, customProtectedNames: "Pity, Glory Core", context: { replyMessage: "gacha spins" } };
    const p = engine.prepare("Pity said `pities` in pities.txt https://example.com/pity", options);
    assert.match(p.restore(p.text), /Pity said `pities` in pities.txt https:\/\/example.com\/pity/u);
    assert.doesNotMatch(p.restore(p.text), /гарант/u);
    const exact = engine.prepare("Pity", options);
    assert.equal(exact.shortcut, null);
    assert.equal(exact.restore(exact.text), "Pity");
});

test("all language dictionaries keep unique forms per entry and consistent recognition/generation gates", () => {
    for (const language of dataset.languages) for (const entry of language.slang) {
        assert.equal(new Set(entry.forms).size, entry.forms.length, `${language.code}/${entry.id}`);
        if (entry.can_generate) {
            assert.equal(entry.can_recognize, true, entry.id);
            assert.notEqual(entry.current, false, entry.id);
            assert.notEqual(entry.outdated, true, entry.id);
        }
    }
});

test("gaming sense conditions are compilable and ambiguous terms have positive and negative evidence", () => {
    const entries = dataset.languages.flatMap(language => language.gaming);
    for (const id of ["game_pity_guarantee", "game_glory_core_label"]) {
        const entry = entries.find(entry => entry.id === id)!;
        assert.ok(entry.context_patterns?.length, id);
        assert.ok(entry.negative_patterns?.length, id);
    }
});
