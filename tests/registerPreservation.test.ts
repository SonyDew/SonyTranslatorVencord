import assert from "node:assert/strict";
import { describe, test } from "node:test";

import slangDataset from "../slangDataset.ts";
import { ChatStyle, createTranslationEngine, EngineOptions } from "../translationCore.ts";

const engine = createTranslationEngine(slangDataset);

function options(mode: ChatStyle, targetLanguage: string, context?: EngineOptions["context"]): EngineOptions {
    return {
        kind: "sent", targetLanguage, mode, context,
        preserveStyle: false, smartSourceSlang: true, targetSlangPacks: true,
        protectNames: true, customProtectedNames: "", dropEnglishApostrophes: false,
        softenAmbiguousProfanity: true,
    };
}

function out(source: string, provider: string, target: string, mode: ChatStyle = "clean", context?: EngineOptions["context"]) {
    const prepared = engine.prepare(source, options(mode, target, context));
    return { prepared, output: engine.finalize(prepared, provider) };
}

describe("social register preservation", () => {
    const cases: Array<{ name: string; source: string; provider: string; target: string; expected: RegExp; mode?: ChatStyle; context?: EngineOptions["context"]; }> = [
        { name: "RU ты -> DE du", source: "ты можешь помочь?", provider: "Können Sie helfen?", target: "de", expected: /Kannst du helfen/ },
        { name: "RU тебе -> DE dir", source: "я отправлю тебе файл", provider: "Ich sende Ihnen die Datei", target: "de", expected: /dir/ },
        { name: "RU твой -> DE dein", source: "это твой сервер", provider: "Das ist Ihr Server", target: "de", expected: /dein Server/ },
        { name: "RU у тебя есть -> DE hast du", source: "у тебя есть хилки?", provider: "Haben Sie Heilungen?", target: "de", expected: /Hast du/ },
        { name: "RU можешь -> DE kannst du", source: "можешь зайти?", provider: "Können Sie beitreten?", target: "de", expected: /Kannst du/ },
        { name: "UA ти -> DE du", source: "ти можеш допомогти?", provider: "Können Sie helfen?", target: "de", expected: /Kannst du/ },
        { name: "UA тобі -> DE dir", source: "я дам тобі предмет", provider: "Ich gebe Ihnen den Gegenstand", target: "de", expected: /dir/ },
        { name: "DE du -> RU ты", source: "Kannst du helfen?", provider: "Вы можете помочь?", target: "ru", expected: /Ты можешь помочь/ },
        { name: "DE informal possession -> RU у тебя", source: "Hast du Heals?", provider: "У вас есть лечение?", target: "ru", expected: /У тебя есть/ },
        { name: "DE Sie -> RU вы", source: "Können Sie helfen?", provider: "Ты можешь помочь?", target: "ru", expected: /Вы можете помочь/ },
        { name: "formal RU -> DE Sie", source: "Вы можете войти?", provider: "Kannst du eintreten?", target: "de", expected: /Können Sie eintreten/ },
        { name: "plural RU -> DE ihr", source: "ребята, вы можете зайти?", provider: "Können Sie beitreten?", target: "de", expected: /Könnt ihr beitreten/ },
        { name: "EN gaming Casual -> DE du", source: "can you test this build?", provider: "Können Sie diesen Build testen?", target: "de", expected: /Kannst du/, mode: "casual", context: { domain: "gaming" } },
        { name: "EN business -> DE Sie", source: "can you review the contract?", provider: "Kannst du den Vertrag prüfen?", target: "de", expected: /Können Sie/, mode: "casual", context: { domain: "business" } },
        { name: "FR tu survives literal provider vous", source: "tu peux venir?", provider: "Vous pouvez venir ?", target: "fr", expected: /Tu peux venir/ },
        { name: "FR vous survives literal provider tu", source: "Vous pouvez confirmer ?", provider: "Tu peux confirmer ?", target: "fr", expected: /Vous pouvez confirmer/ },
        { name: "ES tú survives usted", source: "tú puedes entrar?", provider: "Usted puede entrar?", target: "es", expected: /Tú puedes entrar/ },
        { name: "PT você survives senhor", source: "você pode entrar?", provider: "O senhor pode entrar?", target: "pt-BR", expected: /Você pode entrar/ },
        { name: "PL ty survives Pan", source: "czy ty możesz wejść?", provider: "Czy Pan może wejść?", target: "pl", expected: /Czy możesz wejść/ },
        { name: "CN 你 survives 您", source: "你能来吗", provider: "您能来吗", target: "zh-CN", expected: /你能来吗/ },
    ];

    for (const row of cases) {
        test(row.name, () => {
            const result = out(row.source, row.provider, row.target, row.mode, row.context);
            assert.match(result.output, row.expected);
        });
    }

    test("all style modes preserve the same underlying informal relation", () => {
        for (const mode of ["clean", "casual", "slang", "heavy", "mirror"] as const) {
            const result = out("ты можешь помочь?", "Können Sie helfen?", "de", mode);
            assert.match(result.output, /Kannst du helfen/, mode);
            assert.doesNotMatch(result.output, /\bSie\b/, mode);
        }
    });

    test("formal Japanese and Korean are not demoted by conversational morphology", () => {
        assert.equal(engine.naturalize("これはゲームです", "ja", 3, "formal"), "これはゲームです");
        assert.match(engine.naturalize("이것은 게임입니다", "ko", 3, "formal"), /입니다$/u);
    });
});
