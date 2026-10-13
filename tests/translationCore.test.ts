import assert from "node:assert/strict";
import { describe, test } from "node:test";

import slangDataset from "../slangDataset.ts";
import { canTranslate, createTranslationEngine, type ChatStyle, type EngineOptions } from "../translationCore.ts";

const engine = createTranslationEngine(slangDataset);

function options(mode: ChatStyle, overrides: Partial<EngineOptions> = {}): EngineOptions {
    return {
        kind: "sent",
        targetLanguage: "en",
        mode,
        preserveStyle: true,
        smartSourceSlang: true,
        targetSlangPacks: true,
        protectNames: true,
        customProtectedNames: "",
        dropEnglishApostrophes: false,
        softenAmbiguousProfanity: true,
        ...overrides,
    };
}

function translate(input: string, providerOutput: string, mode: ChatStyle, overrides: Partial<EngineOptions> = {}) {
    const prepared = engine.prepare(input, options(mode, overrides));
    return { prepared, output: engine.finalize(prepared, providerOutput) };
}

describe("golden style modes", () => {
    const source = "Очень интересная картинка, однако, ты знал, что она нарушает наши Anti-Spam rules?";
    const raw = "A very interesting picture, however, did you know that it violates our Anti-Spam rules?";

    test("Clean preserves the accurate provider sentence", () => {
        assert.equal(translate(source, raw, "clean").output, raw);
    });

    test("Casual rewrites formal clause structure without forced abbreviations", () => {
        assert.equal(
            translate(source, raw, "casual").output,
            "A very interesting picture, but did you know that it breaks our Anti-Spam rules?",
        );
    });

    test("Slang performs clause rewriting before dataset abbreviations", () => {
        assert.equal(
            translate(source, raw, "slang").output,
            "very interesting pic tho, did u know that it breaks our Anti-Spam rules?",
        );
    });

    test("Heavy keeps the structural rewrite instead of degrading to word swaps", () => {
        const output = translate(source, raw, "heavy").output;
        assert.match(output, /^very interesting pic tho,/);
        assert.match(output, /did u know/);
        assert.doesNotMatch(output, /however|violates/iu);
    });

    test("naturalizer generalizes to other formal clause templates", () => {
        const source = "пожалуйста, учти это";
        const raw = "Please be aware that this image is in violation of the server rules.";
        const casual = translate(source, raw, "casual").output;
        const slang = translate(source, raw, "slang").output;
        assert.doesNotMatch(casual, /please be aware|in violation of/i);
        assert.match(casual, /just so you know/i);
        assert.match(casual, /breaks the server rules/i);
        assert.match(slang, /pic/);
    });

    test("Mirror uses dataset slang from English, not only the legacy Russian list", () => {
        const prepared = engine.prepare("idk tbh im busy rn", options("mirror"));
        assert.ok(prepared.analysis.matchedSlangIds.has("en_idk"));
        assert.ok(prepared.analysis.matchedSlangIds.has("en_tbh"));
        assert.ok(prepared.level >= 2);
    });

    test("the second clause is structurally naturalized and Heavy is distinct", () => {
        const source = "ты должен стыдиться себя за то, что скачал файлы, даже не проверив их";
        const raw = "you should be ashamed of yourself for downloading files without even checking if there is a virus in them...";
        assert.equal(
            translate(source, raw, "casual", { preserveStyle: false }).output,
            "you should be ashamed of yourself for downloading files without even checking whether they contain a virus...",
        );
        assert.equal(
            translate(source, raw, "slang", { preserveStyle: false }).output,
            "u should be ashamed of yourself for downloading files without even checking if they have a virus...",
        );
        assert.equal(
            translate(source, raw, "heavy", { preserveStyle: false }).output,
            "u should be ashamed of urself for downloading files w/o even checking if they have a virus...",
        );
    });
});

describe("dataset-driven multilingual naturalization", () => {
    const golden: Array<{
        language: string;
        input: string;
        casual: string;
        slang: string;
        heavy: string;
    }> = [
        {
            language: "en",
            input: "A very interesting picture, however, did you know that it violates our Anti-Spam rules?",
            casual: "A very interesting picture, but did you know that it breaks our Anti-Spam rules?",
            slang: "very interesting picture tho, did you know that it breaks our Anti-Spam rules?",
            heavy: "very interesting picture tho, did you know that it breaks our Anti-Spam rules?",
        },
        {
            language: "de",
            input: "Das Spiel ist jedoch nicht stabil.",
            casual: "Das Spiel ist aber nicht stabil.",
            slang: "Das Spiel ist aber nicht stabil.",
            heavy: "Das Spiel ist aber nicht stabil.",
        },
        {
            language: "ru",
            input: "В настоящее время необходимо осуществить обновление.",
            casual: "Сейчас нужно сделать обновление.",
            slang: "Сейчас надо сделать обновление.",
            heavy: "Сейчас надо сделать обновление.",
        },
        {
            language: "uk",
            input: "Наразі необхідно здійснити перевірку.",
            casual: "Зараз треба перевірити.",
            slang: "Зараз треба перевірити.",
            heavy: "Зараз треба глянути.",
        },
        {
            language: "zh-CN",
            input: "为什么他们还没有修复这个 bug？",
            casual: "这个 bug 怎么还没修？",
            slang: "这个 bug 怎么还没修？",
            heavy: "这个 bug 怎么还不修？",
        },
        {
            language: "zh-TW",
            input: "為什麼他們還沒有修復這個 bug？",
            casual: "這個 bug 怎麼還沒修？",
            slang: "這個 bug 到底怎麼還沒修？",
            heavy: "這個 bug 到底要拖多久？",
        },
        {
            language: "es",
            input: "Sin embargo, es necesario comprobar si viola las reglas.",
            casual: "Pero hay que comprobar si rompe las reglas.",
            slang: "Pero hay que comprobar si rompe las reglas.",
            heavy: "Pero hay que comprobar si rompe las reglas.",
        },
        {
            language: "fr",
            input: "Cependant, il est nécessaire de vérifier afin de continuer.",
            casual: "Mais il faut vérifier pour continuer.",
            slang: "Mais faut vérifier pour continuer.",
            heavy: "Mais faut vérifier pour continuer.",
        },
        {
            language: "pt-BR",
            input: "No entanto, é necessário verificar.",
            casual: "Mas tem que verificar.",
            slang: "Mas tem que verificar.",
            heavy: "Mas tem q verificar.",
        },
        {
            language: "pl",
            input: "Obecnie należy dokonać sprawdzenia, jednakże narusza zasady.",
            casual: "Teraz trzeba sprawdzić, ale łamie zasady.",
            slang: "Teraz trzeba sprawdzić, ale łamie zasady.",
            heavy: "Teraz trzeba ogarnąć, ale łamie zasady.",
        },
        {
            language: "ja",
            input: "なぜこのバグはまだ修正されていないのですか？",
            casual: "このバグ、まだ直ってないの？",
            slang: "このバグまだ直ってないの？",
            heavy: "なんでこのバグまだ直ってないんだよ",
        },
        {
            language: "ko",
            input: "이 게임은 그냥 천천히 플레이하면 됩니다.",
            casual: "이 게임은 그냥 천천히 플레이하면 돼",
            slang: "이 게임은 걍 천천히 플레이하면 됨",
            heavy: "이 겜은 걍 천천히 플레이하면 됨",
        },
    ];

    for (const row of golden) {
        test(`${row.language} keeps Clean and applies its own conversational grammar`, () => {
            assert.equal(engine.naturalize(row.input, row.language, 0), row.input);
            assert.equal(engine.naturalize(row.input, row.language, 1), row.casual);
            assert.equal(engine.naturalize(row.input, row.language, 2), row.slang);
            assert.equal(engine.naturalize(row.input, row.language, 3), row.heavy);
        });
    }

    test("English invitation rewriting keeps the game slot", () => {
        assert.equal(engine.naturalize("Would anyone like to play Valorant?", "en", 1), "Anyone want to play Valorant?");
        assert.equal(engine.naturalize("Would anyone like to play Valorant?", "en", 2), "Anyone wanna play Valorant?");
        assert.equal(engine.naturalize("Would anyone like to play Valorant?", "en", 3), "Valorant anyone?");
    });

    test("German and Brazilian invitations use local constructions", () => {
        assert.equal(engine.naturalize("Möchte jemand Minecraft spielen?", "de", 2), "Jemand Bock auf Minecraft?");
        assert.equal(engine.naturalize("Alguém quer jogar Roblox?", "pt-BR", 2), "bora jogar Roblox?");
    });
});

describe("naturalization negative guards", () => {
    test("English short forms are syntax- and cluster-gated", () => {
        assert.equal(engine.naturalize("without a doubt", "en", 3), "without a doubt");
        assert.equal(translate("будь собой", "be yourself", "heavy", { preserveStyle: false }).output, "be yourself");
        assert.equal(translate("сделай это сам", "you can do it yourself", "heavy", { preserveStyle: false }).output, "u can do it urself");
    });

    test("object em is recognized but is not generated without antecedent analysis", () => {
        const recognized = engine.prepare("block em", options("mirror"));
        assert.match(recognized.text, /block them/i);
        assert.equal(translate("заблокируй их", "block them", "heavy", { preserveStyle: false }).output, "block them");
    });

    test("Russian следовать is not confused with formal следует", () => {
        assert.equal(engine.naturalize("Он следует за игроком.", "ru", 3), "Он следует за игроком.");
    });

    test("Ukrainian noun слід is not changed into треба", () => {
        assert.equal(engine.naturalize("Слід на землі ще видно.", "uk", 3), "Слід на землі ще видно.");
    });

    test("Polish membership należy do is not changed into trzeba", () => {
        assert.equal(engine.naturalize("On należy do gildii.", "pl", 3), "On należy do gildii.");
    });

    test("Mainland and Taiwan rules never cross regions", () => {
        assert.equal(engine.naturalize("为什么他们还没有修复这个 bug？", "zh-TW", 2), "为什么他们还没有修复这个 bug？");
        assert.equal(engine.naturalize("為什麼他們還沒有修復這個 bug？", "zh-CN", 2), "為什麼他們還沒有修復這個 bug？");
    });

    test("Slang and Heavy never inject profanity into neutral text", () => {
        for (const level of [2, 3] as const) {
            assert.doesNotMatch(engine.naturalize("This game is very difficult.", "en", level), /fuck|shit|damn/i);
            assert.doesNotMatch(engine.naturalize("Ta gra jest bardzo trudna.", "pl", level), /kurw|pierdol/i);
            assert.doesNotMatch(engine.naturalize("이 게임은 매우 어렵습니다.", "ko", level), /씨발|존나|ㅅㅂ/u);
        }
    });

    test("recognition-only current forms are not generated", () => {
        assert.equal(translate("это лучший персонаж", "永远的神", "heavy", { targetLanguage: "zh-CN", preserveStyle: false }).output, "永远的神");
        assert.equal(translate("я не знаю", "nie wiem", "heavy", { targetLanguage: "pl", preserveStyle: false }).output, "nie wiem");
        assert.equal(translate("це що", "це що", "heavy", { targetLanguage: "uk", preserveStyle: false }).output, "це що");
    });
});

describe("Mirror signal dimensions", () => {
    test("one slang token cannot select Heavy", () => {
        for (const input of ["idk", "kp", "имба", "spoko", "ㅋㅋ"]) {
            assert.notEqual(engine.prepare(input, options("mirror")).level, 3, input);
        }
    });

    test("ordinary lowercase without punctuation remains Casual", () => {
        assert.equal(engine.prepare("this is a normal short message", options("mirror")).level, 1);
    });

    test("several lexical, compression and punctuation signals can select Heavy", () => {
        const prepared = engine.prepare("idk tbh busy rn!!!", options("mirror"));
        assert.equal(prepared.level, 3);
        assert.ok(prepared.analysis.style.slangDensity > 0.3);
        assert.ok(prepared.analysis.style.punctuationIntensity >= 1);
    });
});

describe("dataset semantics", () => {
    test("Clean translation mistakes never choose compressed slang", () => {
        const output = translate("хз", "I do not know", "clean").output;
        assert.notEqual(output.toLocaleLowerCase(), "idk");
        assert.match(output, /know/i);
    });

    test("Slang translation mistakes choose a chat-native candidate", () => {
        assert.equal(translate("хз", "I do not know", "slang").output, "idk");
    });

    test("can_generate=false forms are recognized but never emitted", () => {
        const recognized = engine.prepare("ive seen it b4", options("mirror"));
        assert.match(recognized.text, /before/i);

        for (const mode of ["slang", "heavy"] as const) {
            const output = translate("Я видел это раньше", "I have seen it before", mode).output;
            assert.doesNotMatch(output, /\bb4\b/i);
        }
    });

    test("dataset phrases select natural outputs by mode", () => {
        assert.equal(translate("чат умер", "The chat died", "casual").output, "chat is dead");
        assert.equal(translate("чат умер", "The chat died", "slang").output, "chat dead");
        assert.equal(translate("хз", "I do not know", "heavy").output, "idk");
    });

    test("gaming translations are style-aware", () => {
        assert.equal(translate("катка", "skating rink", "clean").output, "match");
        assert.equal(translate("skill issue", "проблема навыка", "casual", {
            kind: "received",
            targetLanguage: "ru",
        }).output, "проблема в скилле");
        assert.equal(translate("skill issue", "проблема навыка", "slang", {
            kind: "received",
            targetLanguage: "ru",
        }).output, "скилл ишью");
    });

    test("profanity uses pragmatic dataset meaning instead of anatomy", () => {
        assert.equal(translate("пизда", "pussy", "clean").output, "damn");
        assert.doesNotMatch(translate("пизда", "pussy", "heavy").output, /pussy/i);
    });

    test("exact reactions bypass provider text", () => {
        const result = translate("666", "six hundred sixty-six", "casual", {
            kind: "received",
            targetLanguage: "en",
        });
        assert.notEqual(result.prepared.shortcut, null);
        assert.doesNotMatch(result.output, /six hundred/i);
    });
});

describe("protected spans", () => {
    test("preserves Discord syntax, URLs, code, timestamps and filenames byte-for-byte", () => {
        const input = "проверь <@123> в #bugs: `npm test`, index.ts и https://example.com/a?q=1 <t:1700000000:R>";
        const prepared = engine.prepare(input, options("slang"));
        const provider = prepared.text.replace(/^.*?(?=SONYPROTECT)/, "check ");
        const output = engine.finalize(prepared, provider);
        for (const protectedValue of ["<@123>", "#bugs", "`npm test`", "index.ts", "https://example.com/a?q=1", "<t:1700000000:R>"]) {
            assert.ok(output.includes(protectedValue), `missing protected span: ${protectedValue}`);
        }
    });

    test("known and custom product names remain exact", () => {
        const input = "запусти Steam Tools и My Project";
        const prepared = engine.prepare(input, options("casual", { customProtectedNames: "My Project" }));
        const output = engine.finalize(prepared, prepared.text);
        assert.match(output, /Steam Tools/);
        assert.match(output, /My Project/);
    });

    test("Unicode emoji sequences keep their relative position", () => {
        const input = "привет 👋🏽 <@123> это смешно 😂";
        const prepared = engine.prepare(input, options("casual"));
        const output = engine.finalize(prepared, prepared.text);
        assert.ok(output.indexOf("👋🏽") < output.indexOf("<@123>"));
        assert.ok(output.indexOf("<@123>") < output.indexOf("😂"));
    });

    test("ambiguous lowercase entity words are not over-protected", () => {
        const prepared = engine.prepare("пар поднимается и люди реагируют", options("casual"));
        assert.doesNotMatch(prepared.text, /SONYPROTECT.*TOKEN/);
    });
});

describe("language detection and incoming adaptation", () => {
    test("detects ordinary Latin-script languages from words", () => {
        assert.equal(engine.detectSourceLanguage("however this picture is against the rules"), "en");
        assert.equal(engine.detectSourceLanguage("der chat ist aber nicht tot"), "de");
        assert.equal(engine.detectSourceLanguage("no sé por qué esto está muerto"), "es");
    });

    test("detects Ukrainian without requiring a distinctive letter", () => {
        assert.equal(engine.detectSourceLanguage("що це зараз і якщо можна"), "uk");
    });

    test("incoming Casual explains slang naturally while Slang adapts it", () => {
        const casual = translate("idk", "я не знаю", "casual", { kind: "received", targetLanguage: "ru" }).output;
        const slang = translate("idk", "я не знаю", "slang", { kind: "received", targetLanguage: "ru" }).output;
        assert.equal(casual, "я не знаю");
        assert.equal(slang, "хз");
    });

    test("target generation works across dataset language packs", () => {
        assert.equal(translate("пожалуйста", "por favor", "slang", { targetLanguage: "es" }).output, "xfa");
        assert.equal(translate("я не знаю", "je sais pas", "slang", { targetLanguage: "fr" }).output, "jsp");
        assert.equal(translate("я не знаю", "nie wiem", "slang", { targetLanguage: "pl" }).output, "nie wiem");
        assert.equal(translate("понятно", "了解", "slang", { targetLanguage: "ja" }).output, "りょ");
    });

    test("incoming Russian naturalizer removes common machine-register wording", () => {
        const output = translate("this must be done now", "В настоящее время необходимо осуществить обновление.", "casual", {
            kind: "received",
            targetLanguage: "ru",
        }).output;
        assert.match(output, /сейчас нужно сделать обновление/i);
        assert.doesNotMatch(output, /в настоящее время|необходимо|осуществить/i);
    });

    test("non-text Discord payloads are skipped", () => {
        assert.equal(canTranslate(slangDataset, "<@123> https://example.com"), false);
    });
});
