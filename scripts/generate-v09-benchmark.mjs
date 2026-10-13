import { mkdirSync, writeFileSync } from "node:fs";

const groups = {
    german_conversational_compression: [
        ["как дела?", "ru", "Wie geht es dir?"], ["як справи?", "uk", "Wie geht es dir?"], ["how are you?", "en", "Wie geht es dir?"],
        ["я очень хочу спать", "ru", "Ich will wirklich schlafen."], ["ты уже забрал награду?", "ru", "Hast du die Belohnung schon abgeholt?"],
        ["почему они ещё не починили этот баг?", "ru", "Warum haben sie diesen Bug noch nicht behoben?"],
        ["ты уже проверил сервер?", "ru", "Hast du den Server bereits überprüft?"], ["я сейчас зайду", "ru", "Ich werde jetzt beitreten."],
        ["у тебя ещё есть хилки?", "ru", "Haben Sie noch Heilungen?"], ["мы уже закончили", "ru", "Wir haben bereits abgeschlossen."],
    ],
    pragmatic_profanity: [
        ["пиздец", "ru", "disaster_or_doom"], ["это пиздец", "ru", "directed_situation"], ["ну пиздец...", "ru", "frustration"],
        ["пиздец как красиво", "ru", "admiration"], ["пиздец как бесит", "ru", "frustration"], ["блять как я устал", "ru", "intensifier"],
        ["ебать тут красиво", "ru", "admiration"], ["сука как больно", "ru", "intensifier"], ["it's fucking cold", "en", "intensifier"],
        ["scheiß kalt heute", "de", "intensifier"],
    ],
    intensifiers: [
        ["пиздец как я хочу спать", "ru", "extreme_desire"], ["пиздец как холодно", "ru", "extreme_cold"],
        ["пиздец как жарко", "ru", "extreme_heat"], ["пиздец как долго", "ru", "extreme_duration"],
        ["this is so incredibly good", "en", "strong_positive"], ["das ist so krass gut", "de", "strong_positive"],
        ["超好看", "zh-CN", "strong_positive"], ["超級好看", "zh-TW", "strong_positive"],
        ["めっちゃきれい", "ja", "strong_positive"], ["진짜 너무 예뻐", "ko", "strong_positive"],
    ],
    mode_differentiation: [
        ["как дела?", "ru", "social_checkin"], ["я очень хочу спать", "ru", "sleep_desire"],
        ["пиздец как я хочу спать", "ru", "vulgar_sleep_desire"], ["ты уже забрал награду?", "ru", "reward_question"],
        ["почему они ещё не починили этот баг?", "ru", "bug_complaint"], ["Would anyone like to play Valorant?", "en", "gaming_invitation"],
        ["なぜこのバグはまだ修正されていないのですか？", "ja", "bug_complaint"], ["왜 아직도 이 버그를 고치지 않았나요?", "ko", "bug_complaint"],
        ["为什么他们还没有修复这个 bug？", "zh-CN", "bug_complaint"], ["為什麼他們還沒有修復這個 bug？", "zh-TW", "bug_complaint"],
    ],
    multi_message_context: [
        ["real", "en", "agreement", ["this sword got nerfed again"]], ["same", "en", "shared_experience", ["the queue is taking forever"]],
        ["fr", "en", "agreement", ["this patch made the build useless"]], ["жиза", "ru", "shared_experience", ["опять всю ночь не спал"]],
        ["точно", "ru", "agreement", ["этот сервер опять лагает"]], ["echt", "de", "agreement", ["der Patch war echt schlecht"]],
        ["genau", "de", "agreement", ["der Build braucht einen Buff"]], ["real", "en", "agreement", ["old", "older", "the boss is overtuned"]],
        ["это реально плохо", "ru", "literal_adverb", ["this sword got nerfed"]], ["real", "en", "unknown_without_context", []],
    ],
    reply_context: [
        ["real", "en", "agreement", [], "this sword got nerfed again"], ["same", "en", "agreement", [], "I can barely stay awake"],
        ["жиза", "ru", "agreement", [], "опять не выспался"], ["точно", "ru", "agreement", [], "билд слишком сильный"],
        ["fr", "en", "agreement", [], "the server is lagging again"], ["да ну", "ru", "disbelief", [], "он выбил предмет с первого раза"],
        ["really?", "en", "question", [], "I got the rare drop"], ["マジ？", "ja", "question", [], "一回で出た"],
        ["진짜?", "ko", "question", [], "한 번에 나왔어"], ["真的假的", "zh-TW", "question", [], "第一次就掉了"],
    ],
    global_chat_expressions: [
        ["втф???", "ru", "wtf"], ["wtf", "en", "wtf"], ["лол", "ru", "lol"], ["lol", "de", "lol"],
        ["омг", "ru", "omg"], ["gg", "en", "gg"], ["wp", "en", "wp"], ["афк", "ru", "afk"],
        ["brb", "en", "brb"], ["gg wp", "de", "gg_wp"],
    ],
    register_preservation: [
        ["ты можешь помочь?", "ru", "informal"], ["Вы можете помочь?", "ru", "formal"], ["ребята, вы можете зайти?", "ru", "plural_informal"],
        ["ти можеш допомогти?", "uk", "informal"], ["Kannst du helfen?", "de", "informal"], ["Können Sie helfen?", "de", "formal"],
        ["tu peux venir ?", "fr", "informal"], ["Vous pouvez confirmer ?", "fr", "formal"], ["你能来吗", "zh-CN", "informal"],
        ["您能确认吗", "zh-CN", "formal"],
    ],
};

const rows = [];
for (const [group, cases] of Object.entries(groups)) {
    cases.forEach((entry, index) => {
        const [source, sourceLanguage, expectedMeaning, previousMessages = [], replyMessage] = entry;
        rows.push({
            id: `${group}-${String(index + 1).padStart(2, "0")}`,
            group,
            source,
            sourceLanguage,
            targetLanguage: group === "german_conversational_compression" || group === "mode_differentiation" ? "de" : "en",
            providerBaseline: group === "german_conversational_compression" ? expectedMeaning : undefined,
            context: previousMessages.length || replyMessage ? { previousMessages, replyMessage } : undefined,
            expectedImportantMeanings: [expectedMeaning],
            forbiddenSemanticChanges: ["invented addressee", "invented aggression", "invented profanity", "lost polarity", "context copied into output"],
        });
    });
}

mkdirSync(new URL("../benchmark/", import.meta.url), { recursive: true });
writeFileSync(new URL("../benchmark/v09-semantic-benchmark.json", import.meta.url), `${JSON.stringify(rows, null, 2)}\n`);
console.log(`Generated ${rows.length} v0.9 benchmark cases across ${Object.keys(groups).length} groups.`);
