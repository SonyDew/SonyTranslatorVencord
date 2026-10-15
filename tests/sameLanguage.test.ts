import assert from "node:assert/strict";
import { test } from "node:test";
import dataset from "../slangDataset.ts";
import { createTranslationEngine, type EngineOptions } from "../translationCore.ts";
import { googleSourceCode, runPreparedTranslation } from "../translationRunner.ts";

const engine = createTranslationEngine(dataset);
const options: EngineOptions = {
    kind: "received", targetLanguage: "ru", mode: "mirror", preserveStyle: true,
    smartSourceSlang: true, targetSlangPacks: true, protectNames: true,
    customProtectedNames: "", dropEnglishApostrophes: true, softenAmbiguousProfanity: true,
    context: { domain: "chat", previousMessages: ["а там можно remap buttons", "хз как на русском"] },
};

for (const [targetLanguage, source] of [
    ["en", "this is your game"], ["de", "das ist nicht mein Spiel"], ["fr", "je ne sais pas"],
    ["es", "esto es para la partida"], ["pt-BR", "você não precisa disso"], ["pl", "nie wiem ale mam czas"],
    ["ja", "これはまだ直ってない"], ["ko", "이 게임은 아직 안 고쳤어"],
    ["zh-CN", "这个游戏还没有更新"], ["zh-TW", "這個遊戲還沒有更新"], ["uk", "я вже йду спати"],
]) test(`already ${targetLanguage} bypasses provider conservatively`, async () => {
    const prepared = engine.prepare(source, { ...options, targetLanguage, preserveMixedEnglish: true });
    assert.equal(prepared.preserveTargetText, true);
    assert.equal(await runPreparedTranslation(engine, prepared, async () => { throw new Error("No retranslating"); }), source);
});

test("same-language protection does not swallow ambiguous reactions or clearly foreign scripts", () => {
    assert.equal(engine.prepare("Cool", { ...options, targetLanguage: "en" }).preserveTargetText, false);
    assert.equal(engine.prepare("c'est un jeu", { ...options, targetLanguage: "de" }).preserveTargetText, false);
    assert.equal(engine.prepare("これはゲームです", { ...options, targetLanguage: "zh-TW" }).preserveTargetText, false);
});

for (const source of ["ладно", "все", "я спаит", "спатт", "гн", "и тебе", "норм?", "эт прикольно", "хз как на русском", "а да"]) {
    test(`already Russian stays exact without Google: ${source}`, async () => {
        for (const mode of ["clean", "casual", "slang", "heavy", "mirror"] as const) {
            const prepared = engine.prepare(source, { ...options, mode });
            const output = await runPreparedTranslation(engine, prepared, async () => { throw new Error("Provider must not run"); });
            assert.equal(output, source, mode);
        }
    });
}

test("foreign spans translate without rewriting surrounding Russian", async () => {
    const source = "а там можно remap buttons";
    const prepared = engine.prepare(source, options);
    assert.deepEqual(prepared.foreignSegments.map(segment => segment.text), ["remap buttons"]);
    assert.equal(await runPreparedTranslation(engine, prepared, async () => { throw new Error("Local shortcut expected"); }),
        "а там можно переназначить кнопки");
});

test("mixed-English preservation keeps intentional English while whole English still translates", async () => {
    const configured = { ...options, preserveMixedEnglish: true };
    const source = "а там можно remap buttons";
    const prepared = engine.prepare(source, configured);
    assert.equal(await runPreparedTranslation(engine, prepared, async () => { throw new Error("Must preserve intentional English"); }), source);
    const english = engine.prepare("hello there", configured);
    assert.equal(english.preserveTargetText, false);
    assert.equal(await runPreparedTranslation(engine, english, async () => "привет"), "привет");
});

test("key assignment typo uses controls context but does not force an unrelated sense", async () => {
    const prepared = engine.prepare("key assigment", options);
    assert.equal(prepared.sourceLanguage, "en");
    assert.match(await runPreparedTranslation(engine, prepared, async () => "ключевое задание"), /назначение клавиш/);
    const unrelated = engine.prepare("key assignment", { ...options, context: { previousMessages: ["this is a writing assignment"] } });
    assert.equal(unrelated.shortcut, null);
    assert.equal(engine.detectSourceLanguage("unfamiliar phrase", { previousMessages: ["я спаит"] }), null);
});

test("protected Discord syntax and names are excluded from mixed-span translation", async () => {
    const source = "ну Roblox `remap buttons` <@123456> https://example.com/a.txt 💀";
    const prepared = engine.prepare(source, options);
    assert.equal(prepared.foreignSegments.length, 0);
    assert.equal(await runPreparedTranslation(engine, prepared, async () => { throw new Error("Must stay local"); }), source);
});

test("only actual foreign spans reach Google and missing output fails open", async () => {
    const prepared = engine.prepare("я пишу hello there", options);
    const calls: Array<[string, string | null]> = [];
    const output = await runPreparedTranslation(engine, prepared, async (text, language) => {
        calls.push([text, language]); return "привет";
    });
    assert.equal(output, "я пишу привет");
    assert.deepEqual(calls, [["hello there", "en"]]);
    await assert.rejects(runPreparedTranslation(engine, prepared, async () => ""), /Empty foreign-span/);
});

test("cross-language incoming and outgoing requests carry detected source language", async () => {
    for (const kind of ["received", "sent"] as const) {
        const prepared = engine.prepare("ладно", { ...options, kind, targetLanguage: "en" });
        await runPreparedTranslation(engine, prepared, async (text, language) => {
            assert.equal(language, "ru"); assert.equal(text, "ладно"); return "okay";
        });
        assert.equal(prepared.preserveTargetText, false);
    }
    assert.equal(googleSourceCode("zh-cn"), "zh-CN");
    assert.equal(googleSourceCode("zh-tw"), "zh-TW");
    assert.equal(googleSourceCode("pt-BR"), "pt");
    assert.equal(googleSourceCode(null), null);
});
