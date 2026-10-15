import assert from "node:assert/strict";
import { test } from "node:test";
import dataset from "../slangDataset.ts";
import { createTranslationEngine, type EngineOptions, type TranslationContext } from "../translationCore.ts";
import { runPreparedTranslation } from "../translationRunner.ts";

const engine = createTranslationEngine(dataset);
const modes = ["clean", "casual", "slang", "heavy", "mirror"] as const;
const base: EngineOptions = { kind: "received", targetLanguage: "ru", mode: "mirror", preserveStyle: true,
    smartSourceSlang: true, targetSlangPacks: true, protectNames: true, customProtectedNames: "",
    dropEnglishApostrophes: false, softenAmbiguousProfanity: true };

for (const source of ["must be gifted", "it has to be gifted", "that needs to be gifted", "they have to be gifted"]) {
    test(`gift requirement uses item context, not talent: ${source}`, async () => {
        for (const mode of modes) {
            const prepared = engine.prepare(source, { ...base, mode, context: { replyMessage: "Does a Robux gift count?" } });
            const output = await runPreparedTranslation(engine, prepared, async () => { throw new Error("Local meaning required"); });
            assert.match(output, /подар/iu);
            assert.doesNotMatch(output, /одарён|одарен|талант/iu);
            assert.equal(prepared.analysis.incomingChatMatches[0]?.slots.action, "receive_gift");
            if (source.startsWith("they")) {
                assert.match(prepared.analysis.incomingChatMatches[0]?.normalized ?? "", /^They/);
                assert.match(output, /они|их/iu);
            }
        }
    });
}
for (const context of [undefined, { replyMessage: "She has a talent for mathematics" },
    { replyMessage: "This bee needs to be gifted for my hive" },
    { previousTurns: [{ content: "the Robux item", relevance: 0 }] }]) {
    test(`gift meaning does not leak into unknown, talent, Bee Swarm or unrelated context: ${JSON.stringify(context)}`, () => {
        const prepared = engine.prepare("must be gifted", { ...base, context });
        assert.equal(prepared.analysis.incomingChatMatches.some(match => match.ruleId === "en_gifted_item_requirement"), false);
        assert.equal(prepared.shortcut, null);
    });
}

for (const source of ["f2p is not spending robux thats basically it", "F2P means never spending Robux.", "f2p is not spending robux"]) {
    test(`nonspending definition keeps negation and player category: ${source}`, async () => {
        for (const mode of modes) {
            const prepared = engine.prepare(source, { ...base, mode });
            const output = await runPreparedTranslation(engine, prepared, async () => { throw new Error("Local meaning required"); });
            assert.match(output, /f2p/iu);
            assert.match(output, /не трат/iu);
            assert.match(output, /Robux/iu);
            assert.doesNotMatch(output, /бесплатн.{0,6}игр|трата.*это всё/iu);
        }
    });
}

for (const source of ["f2p is spending robux", "f2p is not earning robux", "P2W means spending Robux"]) {
    test(`definition rule never invents a negation or changes earning into spending: ${source}`, () => {
        const prepared = engine.prepare(source, base);
        assert.equal(prepared.analysis.incomingChatMatches.some(match => match.ruleId === "en_f2p_nonspending_definition"), false);
    });
}

for (const source of ["soft f2p", "Is this still an f2p?", "I play as a f2p player", "Robux are a game currency"]) {
    test(`borrowed player labels and currency survive provider placeholders: ${source}`, async () => {
        const prepared = engine.prepare(source, base);
        const output = await runPreparedTranslation(engine, prepared, async text => text);
        assert.match(output, /f2p|Robux/iu);
        assert.doesNotMatch(output, /SONYPROTECT/);
        if (source.includes("soft")) assert.equal(output, source);
    });
}

const raceContext: TranslationContext = { replyMessage: "A race reroll changes character stats and the luck bonus" };
test("character-race stat construction generalizes without choosing a particular race", () => {
    for (const stat of ["luck", "damage", "strength", "agility"]) {
        const prepared = engine.prepare(`you need a race w/ ${stat}`, { ...base, context: raceContext });
        assert.match(prepared.text, new RegExp(`character race with a bonus to ${stat}`));
        assert.doesNotMatch(prepared.text, /elf|demon/iu);
    }
});
for (const context of [undefined, { replyMessage: "a horse race with a luck bonus" },
    { replyMessage: "a car race in Sakura" },
    { previousTurns: [{ content: "race reroll", relevance: 0 }] }]) {
    test(`race remains ambiguous without reliable RPG evidence: ${JSON.stringify(context)}`, () => {
        const prepared = engine.prepare("you need a race w/ luck", { ...base, context });
        assert.doesNotMatch(prepared.text, /character race/iu);
    });
}
test("entities, code and URLs take priority over gaming constructions", () => {
    const source = "`race with luck` https://example.com/f2p <@123456> 💀";
    const prepared = engine.prepare(source, { ...base, context: raceContext });
    assert.equal(prepared.restore(prepared.text), source);
    const name = engine.prepare("Race with luck", { ...base, customProtectedNames: "Race with luck", context: raceContext });
    assert.doesNotMatch(name.text, /character race/iu);
});
