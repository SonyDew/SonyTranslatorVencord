import assert from "node:assert/strict";
import { test } from "node:test";
import dataset from "../slangDataset.ts";
import { createTranslationEngine, type EngineOptions } from "../translationCore.ts";
import { runPreparedTranslation } from "../translationRunner.ts";
const engine = createTranslationEngine(dataset);
const base: EngineOptions = { kind: "received", targetLanguage: "ru", mode: "mirror", preserveStyle: true,
    smartSourceSlang: true, targetSlangPacks: true, protectNames: true, customProtectedNames: "",
    dropEnglishApostrophes: false, softenAmbiguousProfanity: true };
const modes = ["clean", "casual", "slang", "heavy", "mirror"] as const;
for (const [source, providerPrefix, expected] of [
    ["90% crit rate", "90% ", "90% шанса критического удара"],
    ["with 90% crit rate", "с 90% ", "с 90% шансом критического удара"],
    ["at 90% crit rate", "при 90% ", "при 90% шансе критического удара"],
    ["with double crit damage", "с ", "с двойным критическим уроном"],
    ["without crit rate", "без ", "без шанса критического удара"],
    ["I am talking about crit damage", "о ", "о критическом уроне"],
    ["I get a bonus to skill damage", "к ", "к урону навыков"],
] as const) test(`target term agreement: ${source}`, () => {
    for (const mode of modes) {
        const p = engine.prepare(source, { ...base, mode });
        const token = p.text.match(/SONYPROTECT\w+END/u)?.[0];
        assert.ok(token);
        assert.equal(p.restore(providerPrefix + token), expected);
    }
});
test("ordinary names and technical-slot fallback do not inflect", () => {
    const name = engine.prepare("Crit Rate", { ...base, customProtectedNames: "Crit Rate" });
    assert.equal(name.restore("с двойным " + name.text), "с двойным Crit Rate");
    const stat = engine.prepare("crit rate 14", base);
    assert.equal(stat.restore(stat.text), "шанс критического удара 14");
});
test("context selects weapon Bow, not a gesture, without inventing missing units", async () => {
    for (const mode of modes) {
        const p = engine.prepare("Bow?", { ...base, mode, context: { previousMessage: "What weapon is this for?" } });
        const out = await runPreparedTranslation(engine, p, async () => { throw new Error("Shortcut expected"); });
        assert.match(out, /^лук\?$/iu);
    }
    for (const replyMessage of ["a violin bow", "a ribbon bow tie", "the ship bow"]) {
        const p = engine.prepare("Bow?", { ...base, context: { replyMessage } });
        assert.equal(p.shortcut, null);
    }
    assert.equal(engine.prepare("Bow?", base).shortcut, null);
});
test("tag labels are preserved only with relevant tag context", async () => {
    for (const mode of modes) {
        const p = engine.prepare("weed", { ...base, mode, context: { replyMessage: "How did you get that tag?" } });
        assert.equal(await runPreparedTranslation(engine, p, async () => { throw new Error("No dictionary call expected"); }), "weed");
    }
    assert.equal(engine.prepare("weed", { ...base, context: { replyMessage: "the plant in my garden" } }).shortcut, null);
    assert.equal(engine.prepare("weed", { ...base, context: { previousTurns: [{ content: "tag", relevance: 0 }] } }).shortcut, null);
});
test("a reliable unrelated turn does not promote a low-relevance tag hint", () => {
    const p = engine.prepare("weed", { ...base, context: { previousTurns: [
        { content: "a football match", relevance: 4 }, { content: "guild tag", relevance: 0 },
    ] } });
    assert.equal(p.shortcut, null);
});
test("missing a little means a stat shortfall only with reliable evidence", () => {
    const source = "im missin a tiny bit, average damage drops at 90% crit rate";
    const p = engine.prepare(source, { ...base, context: { replyMessage: "Almost at 100" } });
    assert.match(p.text, /^I still need a little more/);
    const literal = engine.prepare("I'm missing a little bit of the story", { ...base, context: { replyMessage: "critical hit chance" } });
    assert.doesNotMatch(literal.text, /I still need/);
    assert.doesNotMatch(engine.prepare(source, base).text, /I still need/);
});
test("substat frame is not mistaken for a speaker or subscriber", () => {
    const p = engine.prepare("I want a new sub of crit rate", base);
    assert.match(p.restore(p.text), /дополнительный параметр шанса критического удара/);
    assert.doesNotMatch(engine.prepare("I bought a new subwoofer", base).restore("сабвуфер"), /дополнительный параметр/);
});
test("transport label artifact is removed only beside a semantic slot, not a real label", () => {
    const p = engine.prepare("with double crit damage", base);
    assert.equal(p.restore("с маркировкой " + p.text.match(/SONYPROTECT\w+END/u)![0]), "с двойным критическим уроном");
    const literal = engine.prepare("the label is crit damage", base);
    assert.match(literal.restore("с маркировкой " + literal.text.match(/SONYPROTECT\w+END/u)![0]), /с маркировкой/);
});
test("compact critical-damage spelling preserves percentage without inferring other units", () => {
    const p = engine.prepare("30%critdmg", base);
    assert.equal(p.restore(p.text), "30%критического урона");
});
