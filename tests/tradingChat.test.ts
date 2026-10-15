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

test("True is agreement with local context, not an adjective", async () => {
    for (const mode of modes) {
        const prepared = engine.prepare("True", { ...base, mode, context: { replyMessage: "Bow scrolls may improve after the update" } });
        const result = await runPreparedTranslation(engine, prepared, async () => { throw new Error("Shortcut expected"); });
        assert.match(result, /верно|согласен|точно/iu);
        assert.doesNotMatch(result, /истинный/iu);
    }
});
for (const source of ["True", "`True`", "true or false", "a true story"]) {
    test(`Boolean/literal true is not blanket agreement: ${source}`, () => {
        const prepared = engine.prepare(source, { ...base, context: { replyMessage: "a Python boolean literal" } });
        assert.equal(prepared.analysis.incomingChatMatches.some(match => match.ruleId === "en_true_agreement_reaction"), false);
    });
}
test("unrelated nearby messages do not authorize short agreement", () => {
    const prepared = engine.prepare("True", { ...base, context: { previousTurns: [{ content: "a weapon update", relevance: 0 }] } });
    assert.equal(prepared.shortcut, null);
});
for (const amount of ["5", "10", "28"]) {
    test(`k-something keeps thousand scale: ${amount}`, () => {
        for (const mode of modes) {
            const p = engine.prepare(`I bought it for ${amount}k something`, { ...base, mode });
            assert.match(p.text, new RegExp(`${amount} thousand and a bit`));
        }
    });
}
for (const source of ["I ran a 5k race", "5k something", "I bought `5k something`", "I bought item5k something"]) {
    test(`price normalization is bounded: ${source}`, () => {
        const p = engine.prepare(source, base);
        assert.doesNotMatch(p.text, /thousand and a bit/);
    });
}
test("stats are independent semantic slots and keep their adjacent numeric values", async () => {
    for (const mode of modes) {
        const p = engine.prepare("crit rate 14, crit dmg 19, skill dmg 22", { ...base, mode });
        const result = await runPreparedTranslation(engine, p, async text => text);
        assert.match(result, /шанс критического удара 14/u);
        assert.match(result, /критический урон 19/u);
        assert.match(result, /урон навыков 22/u);
        assert.doesNotMatch(result, /SONYPROTECT/);
    }
});
test("technical terms never take precedence over names, URLs or code", () => {
    const source = "`crit rate 14` https://example.com/crit-dmg <@123456> 💀";
    const p = engine.prepare(source, base);
    assert.equal(p.restore(p.text), source);
    const name = engine.prepare("Crit Rate", { ...base, customProtectedNames: "Crit Rate" });
    assert.equal(name.restore(name.text), "Crit Rate");
    const member = engine.prepare("hello Crit Rate", { ...base, context: { participants: [
        { displayName: "Crit Rate", evidence: "mention" },
    ] } });
    assert.equal(member.restore(member.text), "hello Crit Rate");
});
test("stat slots preserve ratios, percentages and zero values without adding units", async () => {
    const p = engine.prepare("4/4, crit rate 0%, crit dmg 19%, skill dmg 22", base);
    const result = await runPreparedTranslation(engine, p, async text => text);
    assert.match(result, /4\/4/);
    assert.match(result, /шанс критического удара 0%/);
    assert.match(result, /критический урон 19%/);
    assert.match(result, /урон навыков 22(?!%)/);
});
test("technical target slots are optional and have a conservative language fallback", () => {
    assert.match(engine.prepare("crit rate 14", { ...base, smartSourceSlang: false }).text, /crit rate/);
    const p = engine.prepare("crit rate 14", { ...base, targetLanguage: "fr" });
    assert.match(p.text, /critical hit chance/);
    assert.doesNotMatch(p.text, /шанс/);
});
test("mine stat ellipsis does not introduce a weapon type", () => {
    const p = engine.prepare("mine 25atk, 24 skill dmg and 21 crit dmg", base);
    assert.match(p.text, /^the one I have has 25atk/);
    assert.doesNotMatch(p.text, /sword|weapon|scroll/);
    assert.equal(engine.prepare("the coal mine is closed", base).text, "the coal mine is closed");
});
for (const source of ["I've run with you", "I ran with you", "we have run with you"]) {
    test(`run with a teammate means play, not code use: ${source}`, () => {
        const p = engine.prepare(source, { ...base, context: { replyMessage: "your raid build has enough crit rate" } });
        assert.match(p.text, /played together with you/);
        assert.doesNotMatch(p.text, /code/);
        const literal = engine.prepare(source, { ...base, context: { replyMessage: "our running club marathon" } });
        assert.doesNotMatch(literal.text, /played together/);
    });
}
test("buns quality comparison does not translate bread or invent profanity", () => {
    const p = engine.prepare("the scroll was still buns compared to that weapon", base);
    assert.match(p.text, /was still poor in quality compared to/);
    assert.doesNotMatch(p.text, /fuck|shit/);
    assert.equal(engine.prepare("the bakery buns were soft", base).text, "the bakery buns were soft");
});
test("captured mid-clause address is repaired without changing formal speech or word substrings", () => {
    const p = engine.prepare("I thought you needed crit rate", base);
    assert.match(engine.finalize(p, "Я думал вам нужен шанс критического удара"), /тебе нужен/);
    const formal = engine.prepare("Вы сказали, что вам нужен шанс крита", { ...base, kind: "sent" });
    assert.match(engine.finalize(formal, "Вам нужен шанс крита"), /Вам нужен/);
    const informal = engine.prepare("you like vampires", { ...base, mode: "clean" });
    assert.equal(engine.finalize(informal, "Вампир тебе нравится"), "Вампир тебе нравится");
});
