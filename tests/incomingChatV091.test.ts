import assert from "node:assert/strict";
import { describe, test } from "node:test";

import slangDataset from "../slangDataset.ts";
import { ChatStyle, createTranslationEngine, EngineOptions, TranslationContext } from "../translationCore.ts";

const engine = createTranslationEngine(slangDataset);
const baseContext: TranslationContext = {
    domain: "chat",
    currentAuthorId: "current",
    participants: [
        { id: "mocha", username: "mocha", displayName: "Mocha", evidence: "recent_author" },
        { id: "rob", username: "rob", displayName: "Rob", evidence: "recent_author" },
    ],
};

function options(mode: ChatStyle, context: TranslationContext = baseContext): EngineOptions {
    return {
        kind: "received", targetLanguage: "ru", mode, preserveStyle: false,
        smartSourceSlang: true, targetSlangPacks: true, protectNames: true,
        customProtectedNames: "", dropEnglishApostrophes: false,
        softenAmbiguousProfanity: true, context,
    };
}

function translate(source: string, provider: string, mode: ChatStyle = "casual", context = baseContext) {
    const prepared = engine.prepare(source, options(mode, context));
    return { prepared, output: engine.finalize(prepared, provider) };
}

describe("v0.9.1 real incoming Discord regression family", () => {
    const cases: Array<[string, string, string]> = [
        ["Sup mocha dude", "Привет чувак-мокко", "greeting"],
        ["Aint no way you deleted them youre actually so weird 😭", "Ни за что ты их удалил, ты на самом деле такой странный 😭", "social_criticism"],
        ["Brb, gotta remind my gf to medicate", "Брб, должен напомнить моей гф лечиться", "temporary_absence"],
        ["The stuff theres already screenshots of that doesn't even make sense to delete", "Материал, уже есть скриншоты которого, даже не имеет смысла удалять", "argument"],
        ["sup", "поддержка", "greeting"],
        ["How's life", "Какова жизнь", "social_wellbeing_checkin"],
        ["Idk what you're accusing me off 💀", "Я не понимаю, в чём вы меня обвиняете off 💀", "deny_accusation"],
        ["Nah youre actually odd💀", "Нет, вы на самом деле нечётный 💀", "social_criticism"],
        ["Cool", "Прохладный", "approval"],
        ["why is rob so oddd", "почему грабить так нечётно", "social_judgment_question"],
        ["this chat so odd", "этот чат такой нечётный", "conversation_judgment"],
        ["Finna send the forbidden ss", "Финна отправляет запрещённый SS", "imminent_action"],
    ];

    for (const [source, provider, intent] of cases) {
        test(`${source} resolves ${intent}`, () => {
            const { prepared, output } = translate(source, provider);
            assert.ok(prepared.analysis.incomingChatMatches.some(match => match.slots.intent?.includes(intent) || match.ruleId.includes(intent.split("_")[0])), source);
            assert.notEqual(output, provider, source);
        });
    }

    test("Deleted what? uses only sufficiently relevant deletion context", () => {
        const related: TranslationContext = {
            ...baseContext,
            previousTurns: [{ content: "Aint no way you deleted them", authorId: "other", relevance: 5 }],
        };
        const matched = translate("Deleted what?", "Что удалено?", "casual", related);
        assert.equal(matched.output, "Что я удалил?");
        assert.equal(matched.prepared.analysis.incomingChatMatches[0]?.sense.includes("clarification"), true);

        const unrelated = translate("Deleted what?", "Что удалено?", "casual", {
            ...baseContext,
            previousTurns: [{ content: "someone posted a screenshot", authorId: "third", relevance: 1 }],
        });
        assert.equal(unrelated.prepared.analysis.incomingChatMatches.length, 0);
    });

    test("Mocha and Rob are canonical participant entities before normalization", () => {
        const mocha = translate("Sup mocha dude", "Привет чувак-мокко");
        assert.equal(mocha.output, "Привет, Mocha");
        assert.equal(mocha.prepared.analysis.recognizedEntities[0]?.canonical, "Mocha");
        assert.doesNotMatch(mocha.output, /мокко|чувак-мокко/iu);

        const rob = translate("why is rob so oddd", "почему грабить так нечётно");
        assert.match(rob.output, /Rob/u);
        assert.doesNotMatch(rob.output, /грабить|нечёт/iu);
        assert.ok(rob.prepared.analysis.normalizedTypos.some(change => change.source.toLowerCase().includes("oddd")) ||
            rob.prepared.analysis.selectedTransformations.some(change => change.includes("expressive")));
    });

    test("literal entity and polysemy cases remain on the provider path", () => {
        const mocha = translate("I ordered a mocha.", "Я заказал мокко.");
        assert.equal(mocha.output, "Я заказал мокко.");
        assert.equal(mocha.prepared.analysis.recognizedEntities.length, 0);

        assert.equal(translate("It's cool outside.", "На улице прохладно.").output, "На улице прохладно.");
        assert.equal(translate("She is sick.", "Она больна.").output, "Она больна.");
        assert.equal(translate("The pan is hot.", "Сковорода горячая.").output, "Сковорода горячая.");
        assert.equal(translate("He's taking a screenshot.", "Он делает скриншот.").output, "Он делает скриншот.");
    });

    test("Cool selects a reaction sense and never temperature", () => {
        for (const mode of ["clean", "casual", "slang", "heavy", "mirror"] as const) {
            const result = translate("Cool", "Прохладный", mode);
            assert.doesNotMatch(result.output, /прохлад|холод/iu, mode);
            assert.equal(result.prepared.analysis.selectedSenses[0]?.sense.includes("approval"), true);
        }
    });

    test("idk/off and finna/ss expose explainable normalization", () => {
        const accusation = translate("Idk what you're accusing me off 💀", "Я не понимаю, в чём вы меня обвиняете off 💀");
        assert.doesNotMatch(accusation.output, /\boff\b|\bвы\b|\bвас\b/iu);
        assert.match(accusation.output, /ты|тебя|тебе/iu);
        assert.match(accusation.output, /💀/u);
        assert.ok(accusation.prepared.analysis.normalizedTypos.some(change => change.source.toLowerCase().includes("accusing")));
        assert.ok(accusation.prepared.analysis.recognizedAbbreviations.some(change => change.form.toLowerCase() === "idk"));

        const screenshot = translate("Finna send the forbidden ss", "Финна отправляет запрещённый SS");
        assert.match(screenshot.output, /скрин/iu);
        assert.doesNotMatch(screenshot.output, /\bfinna\b|\bss\b/iu);
        assert.ok(screenshot.prepared.analysis.recognizedAbbreviations.some(change => /finna/i.test(change.form)));
        assert.ok(screenshot.prepared.analysis.recognizedAbbreviations.some(change => /^ss$/i.test(change.form)));
        assert.match(screenshot.prepared.analysis.providerSafeInput ?? "", /about to.*screenshot/iu);
    });
});
