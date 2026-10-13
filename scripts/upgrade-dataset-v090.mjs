import { readFileSync, writeFileSync } from "node:fs";

const path = new URL("../slang-dataset.json", import.meta.url);
const dataset = JSON.parse(readFileSync(path, "utf8"));

dataset.version = "1.3";
dataset.generated_at = "2026-09-13";

const upsert = (array, value) => {
    const index = array.findIndex(candidate => candidate.id === value.id);
    if (index >= 0) array[index] = value;
    else array.push(value);
};

dataset.semantic_mappings ??= [];
upsert(dataset.semantic_mappings, {
    id: "social_wellbeing_checkin",
    category: "social_checkin",
    meaning: "a casual check-in asking how the other person is doing",
    current: true,
    can_recognize: true,
    can_generate: true,
    slots: {
        intent: "social_wellbeing_checkin",
        speechAct: "question",
        subject: "other",
        target: "conversation_partner",
        stance: "neutral",
        polarity: "neutral",
        intensity: "none",
        register: "informal",
        contextDomain: "chat",
        certainty: "high",
        emphasisSources: []
    },
    sources: {
        en: { forms: ["how are you", "how are you doing"], normalized: "how are you doing?", confidence: "high", exact_only: true },
        ru: { forms: ["как дела", "как ты"], normalized: "как у тебя дела?", confidence: "high", exact_only: true },
        uk: { forms: ["як справи", "як ти"], normalized: "як у тебе справи?", confidence: "high", exact_only: true }
    },
    outputs: {
        en: { clean: ["How are you?"], casual: ["How's it going?"], slang: ["hows it going?"], heavy: ["hows it going"] },
        de: { clean: ["Wie geht's dir?"], casual: ["Wie geht's?"], slang: ["wie gehts?"], heavy: ["wie gehts"] },
        ru: { clean: ["Как дела?"], casual: ["Как ты?"], slang: ["как оно?"], heavy: ["как ты"] },
        uk: { clean: ["Як справи?"], casual: ["Як ти?"], slang: ["як воно?"], heavy: ["як ти"] },
        "zh-CN": { clean: ["你怎么样？"], casual: ["最近怎么样？"], slang: ["咋样？"], heavy: ["咋样"] },
        "zh-TW": { clean: ["你最近好嗎？"], casual: ["最近怎樣？"], slang: ["最近怎樣"], heavy: ["怎樣"] },
        es: { clean: ["¿Cómo estás?"], casual: ["¿Qué tal?"], slang: ["qué tal?"], heavy: ["qué tal"] },
        fr: { clean: ["Comment vas-tu ?"], casual: ["Ça va ?"], slang: ["ça va ?"], heavy: ["ça va"] },
        "pt-BR": { clean: ["Como você está?"], casual: ["Tudo bem?"], slang: ["tudo certo?"], heavy: ["tudo bem"] },
        pl: { clean: ["Jak się masz?"], casual: ["Co tam?"], slang: ["co tam?"], heavy: ["co tam"] },
        ja: { clean: ["お元気ですか？"], casual: ["元気？"], slang: ["最近どう？"], heavy: ["どう？"] },
        ko: { clean: ["잘 지내세요?"], casual: ["잘 지내?"], slang: ["요즘 어때?"], heavy: ["어때"] }
    }
});

upsert(dataset.semantic_mappings, {
    id: "contextual_agreement_reaction",
    category: "agreement_reaction",
    meaning: "a short reply agreeing with the directly related conversation",
    current: true,
    can_recognize: true,
    can_generate: false,
    slots: {
        intent: "agreement",
        speechAct: "reaction",
        subject: "self",
        stance: "agreement",
        polarity: "positive",
        intensity: "mild",
        register: "informal",
        contextDomain: "chat",
        certainty: "medium",
        emphasisSources: []
    },
    sources: {
        en: { forms: ["real", "same", "fr"], normalized: "I agree", confidence: "medium", exact_only: true, requires_context: true },
        de: { forms: ["echt", "genau"], normalized: "ich stimme zu", confidence: "medium", exact_only: true, requires_context: true },
        ru: { forms: ["жиза", "точно"], normalized: "согласен", confidence: "medium", exact_only: true, requires_context: true },
        uk: { forms: ["жиза", "точно"], normalized: "згоден", confidence: "medium", exact_only: true, requires_context: true }
    },
    outputs: {
        en: { clean: ["I agree."], casual: ["Yeah, exactly."], slang: ["true"], heavy: ["fr"] },
        de: { clean: ["Stimmt."], casual: ["Ja, echt so."], slang: ["true"], heavy: ["fr"] },
        ru: { clean: ["Согласен."], casual: ["Да, точно."], slang: ["жиза"], heavy: ["реал"] },
        uk: { clean: ["Згоден."], casual: ["Так, точно."], slang: ["жиза"], heavy: ["реал"] },
        "zh-CN": { clean: ["我同意。"], casual: ["确实。"], slang: ["真的"], heavy: ["确实"] },
        "zh-TW": { clean: ["我同意。"], casual: ["真的。"], slang: ["確實"], heavy: ["真的"] },
        es: { clean: ["Estoy de acuerdo."], casual: ["Sí, tal cual."], slang: ["literal"], heavy: ["real"] },
        fr: { clean: ["Je suis d'accord."], casual: ["Oui, carrément."], slang: ["grave"], heavy: ["réel"] },
        "pt-BR": { clean: ["Concordo."], casual: ["Pois é."], slang: ["real"], heavy: ["real"] },
        pl: { clean: ["Zgadzam się."], casual: ["No właśnie."], slang: ["rel"], heavy: ["rel"] },
        ja: { clean: ["同感です。"], casual: ["ほんとそれ。"], slang: ["それな"], heavy: ["それな"] },
        ko: { clean: ["동의해요."], casual: ["진짜 그래."], slang: ["ㄹㅇ"], heavy: ["ㄹㅇ"] }
    }
});

const sleepOutputs = {
    en: { clean: ["I desperately want to sleep."], casual: ["I seriously just want to sleep."], slang: ["i wanna sleep so bad"], heavy: ["i wanna fucking sleep so bad"] },
    de: { clean: ["Ich will unbedingt schlafen."], casual: ["Boah, ich will einfach nur pennen."], slang: ["ich will so krass pennen"], heavy: ["ich will verdammt nochmal pennen"] },
    ru: { clean: ["Я ужасно хочу спать."], casual: ["Я безумно хочу спать."], slang: ["я капец как хочу спать"], heavy: ["я пиздец как хочу спать"] },
    uk: { clean: ["Я страшенно хочу спати."], casual: ["Я неймовірно хочу спати."], slang: ["я капець як хочу спати"], heavy: ["я пиздець як хочу спати"] },
    "zh-CN": { clean: ["我特别想睡觉。"], casual: ["我真的好想睡觉。"], slang: ["我困死了，超想睡"], heavy: ["我他妈真的想睡觉"] },
    "zh-TW": { clean: ["我非常想睡覺。"], casual: ["我真的好想睡。"], slang: ["我快睏死了，超想睡"], heavy: ["我他媽真的超想睡"] },
    es: { clean: ["Tengo muchísimas ganas de dormir."], casual: ["Tengo unas ganas tremendas de dormir."], slang: ["me muero de sueño"], heavy: ["necesito dormir ya, joder"] },
    fr: { clean: ["J'ai terriblement envie de dormir."], casual: ["J'ai tellement envie de dormir."], slang: ["j'ai trop envie de dormir"], heavy: ["putain j'ai trop envie de dormir"] },
    "pt-BR": { clean: ["Estou morrendo de vontade de dormir."], casual: ["Tô com muita vontade de dormir."], slang: ["tô doido pra dormir"], heavy: ["caralho eu só quero dormir"] },
    pl: { clean: ["Strasznie chce mi się spać."], casual: ["Tak bardzo chce mi się spać."], slang: ["ale mi się chce spać"], heavy: ["kurwa jak ja chcę spać"] },
    ja: { clean: ["ものすごく眠りたい。"], casual: ["めちゃくちゃ寝たい。"], slang: ["マジで寝たい"], heavy: ["クソほど寝たい"] },
    ko: { clean: ["정말 너무 자고 싶어요."], casual: ["진짜 너무 자고 싶어."], slang: ["개같이 자고 싶다"], heavy: ["씨발 진짜 자고 싶다"] }
};

dataset.pragmatic_profanity_rules = [
    {
        id: "ru_profanity_intensifier_sleep",
        language: "ru",
        pattern: "^\\s*(?:пиздец|бля(?:ть)?|ебать|сука)\\s*,?\\s+как\\s+(?:же\\s+)?я\\s+хочу\\s+спать\\s*[.!?…]*\\s*$",
        normalized: "я очень сильно хочу спать",
        role: "intensifier",
        confidence: "high",
        current: true,
        can_recognize: true,
        can_generate: true,
        slots: { intent: "desire", speechAct: "statement", subject: "self", action: "sleep", intensity: "extreme", emotion: "exhaustion", register: "vulgar_informal", certainty: "high", emphasisSources: ["profanity"] },
        outputs: sleepOutputs
    },
    {
        id: "ru_profanity_intensifier_temperature",
        language: "ru",
        pattern: "^\\s*пиздец\\s+как\\s+(?<state>холодно|жарко)\\s*[.!?…]*\\s*$",
        normalized: "очень $<state>",
        role: "intensifier",
        confidence: "high",
        current: true,
        can_recognize: true,
        can_generate: false,
        slots: { intent: "state_emphasis", speechAct: "statement", intensity: "extreme", emotion: "discomfort", register: "vulgar_informal", certainty: "high", emphasisSources: ["profanity"] }
    },
    {
        id: "ru_profanity_intensifier_admiration",
        language: "ru",
        pattern: "^\\s*(?:пиздец\\s+как|ебать(?:\\s+тут)?)\\s+(?<state>красиво|круто|шикарно)\\s*[.!?…]*\\s*$",
        normalized: "невероятно $<state>",
        role: "admiration",
        confidence: "high",
        current: true,
        can_recognize: true,
        can_generate: false,
        slots: { intent: "admiration", speechAct: "reaction", stance: "positive", polarity: "positive", intensity: "extreme", emotion: "admiration", register: "vulgar_informal", certainty: "high", emphasisSources: ["profanity"] }
    },
    {
        id: "ru_profanity_intensifier_duration_annoyance",
        language: "ru",
        pattern: "^\\s*пиздец\\s+как\\s+(?<state>долго|бесит)\\s*[.!?…]*\\s*$",
        normalized: "ужасно $<state>",
        role: "frustration",
        confidence: "high",
        current: true,
        can_recognize: true,
        can_generate: false,
        slots: { intent: "frustration", speechAct: "complaint", stance: "negative", polarity: "negative", intensity: "extreme", emotion: "annoyance", register: "vulgar_informal", certainty: "high", emphasisSources: ["profanity"] }
    },
    {
        id: "ru_profanity_intensifier_fatigue",
        language: "ru",
        pattern: "^\\s*бля(?:ть)?\\s+как\\s+я\\s+устал\\s*[.!?…]*\\s*$",
        normalized: "я очень сильно устал",
        role: "intensifier",
        confidence: "medium",
        current: true,
        can_recognize: true,
        can_generate: false,
        slots: { intent: "state_emphasis", speechAct: "complaint", intensity: "extreme", emotion: "distress", register: "vulgar_informal", certainty: "medium", emphasisSources: ["profanity"] }
    },
    {
        id: "ru_profanity_intensifier_pain",
        language: "ru",
        pattern: "^\\s*сука\\s+как\\s+больно\\s*[.!?…]*\\s*$",
        normalized: "очень больно",
        role: "intensifier",
        confidence: "medium",
        current: true,
        can_recognize: true,
        can_generate: false,
        slots: { intent: "state_emphasis", speechAct: "complaint", intensity: "extreme", emotion: "pain", register: "vulgar_informal", certainty: "medium", emphasisSources: ["profanity"] }
    },
    { id: "en_fucking_intensifier", language: "en", pattern: "^(?<before>.*?)\\bfucking\\s+(?<focus>cold|hot|beautiful|tired|long|annoying|painful)\\b(?<after>.*)$", normalized: "$<before>extremely $<focus>$<after>", role: "intensifier", confidence: "medium", current: true, can_recognize: true, can_generate: false, slots: { intensity: "extreme", register: "vulgar_informal", certainty: "medium", emphasisSources: ["profanity"] } },
    { id: "de_scheiss_intensifier", language: "de", pattern: "^(?<before>.*?)\\b(?:scheiß|scheisse|scheiße)\\s*(?<focus>kalt|heiß|müde|schön|langsam)\\b(?<after>.*)$", normalized: "$<before>extrem $<focus>$<after>", role: "intensifier", confidence: "medium", current: true, can_recognize: true, can_generate: false, slots: { intensity: "extreme", register: "vulgar_informal", certainty: "medium", emphasisSources: ["profanity"] } },
    { id: "fr_putain_intensifier", language: "fr", pattern: "^\\s*putain(?:,)?\\s+(?<body>.+)$", normalized: "vraiment $<body>", role: "intensifier", confidence: "low", current: true, can_recognize: true, can_generate: false, slots: { intensity: "strong", register: "vulgar_informal", certainty: "low", emphasisSources: ["profanity"] } },
    { id: "es_joder_intensifier", language: "es", pattern: "^\\s*(?:joder|puta)(?:,)?\\s+(?<body>.+)$", normalized: "realmente $<body>", role: "intensifier", confidence: "low", current: true, can_recognize: true, can_generate: false, slots: { intensity: "strong", register: "vulgar_informal", certainty: "low", emphasisSources: ["profanity"] } },
    { id: "pl_kurwa_intensifier", language: "pl", pattern: "^\\s*kurwa(?:,)?\\s+(?<body>.+)$", normalized: "naprawdę $<body>", role: "intensifier", confidence: "low", current: true, can_recognize: true, can_generate: false, slots: { intensity: "strong", register: "vulgar_informal", certainty: "low", emphasisSources: ["profanity"] } },
    { id: "ko_ssibal_intensifier", language: "ko", pattern: "^\\s*씨발(?:,)?\\s*(?<body>.+)$", normalized: "진짜 $<body>", role: "intensifier", confidence: "low", current: true, can_recognize: true, can_generate: false, slots: { intensity: "strong", register: "vulgar_informal", certainty: "low", emphasisSources: ["profanity"] } },
    { id: "zh_profanity_intensifier", language: "zh-CN", pattern: "^\\s*他妈的?(?<body>.+)$", normalized: "非常$<body>", role: "intensifier", confidence: "low", current: true, can_recognize: true, can_generate: false, slots: { intensity: "strong", register: "vulgar_informal", certainty: "low", emphasisSources: ["profanity"] } },
    { id: "zh_tw_profanity_intensifier", language: "zh-TW", pattern: "^\\s*(?:幹|他媽的?)(?<body>.+)$", normalized: "超級$<body>", role: "intensifier", confidence: "low", current: true, can_recognize: true, can_generate: false, slots: { intensity: "strong", register: "vulgar_informal", certainty: "low", emphasisSources: ["profanity"] } }
];

dataset.naturalization_rules ??= [];
const rules = [
    { id: "de_wellbeing_question_compression", language: "de", stage: "clause", operation: "regex", pattern: "^Wie geht es dir\\??$", outputs: { casual: ["Wie geht's dir?"], slang: ["wie gehts?"], heavy: ["wie gehts"] }, contexts: ["chat", "discord"], region: "Germany / DACH", confidence: "high", current: true, can_generate: true, can_recognize: true, max_applications: 1, changes_register: false },
    { id: "de_neutral_sleep_desire", language: "de", stage: "clause", operation: "regex", pattern: "^Ich (?:möchte|will) (?:wirklich |sehr )?schlafen[.!]?$", outputs: { casual: ["Ich will einfach nur schlafen."], slang: ["ich will einfach nur pennen"], heavy: ["will nur pennen"] }, contexts: ["chat", "discord"], region: "Germany / DACH", confidence: "high", current: true, can_generate: true, can_recognize: true, max_applications: 1, changes_register: false },
    { id: "de_reward_question_compression", language: "de", stage: "clause", operation: "regex", pattern: "^Hast du (?:die )?(?<reward>Belohnung|Reward) (?:bereits|schon) (?:abgeholt|geholt|eingesammelt)\\??$", outputs: { casual: ["Hast du die $<reward> schon geholt?"], slang: ["$<reward> schon geholt?"], heavy: ["$<reward> schon geholt"] }, contexts: ["gaming", "discord"], region: "Germany / DACH", confidence: "high", current: true, can_generate: true, can_recognize: true, max_applications: 1, changes_register: false },
    { id: "de_bug_still_unfixed", language: "de", stage: "clause", operation: "regex", pattern: "^Warum haben (?:sie|die) (?:diesen|den) (?<bug>Bug|Fehler) (?:immer )?noch nicht (?:behoben|repariert|gefixt)\\??$", outputs: { casual: ["Warum haben die den $<bug> noch nicht gefixt?"], slang: ["warum ist der $<bug> immer noch nicht gefixt?"], heavy: ["warum ist der $<bug> noch nicht gefixt"] }, contexts: ["gaming", "discord", "chat"], region: "Germany / DACH", confidence: "high", current: true, can_generate: true, can_recognize: true, max_applications: 1, changes_register: false },
    { id: "de_server_check_compression", language: "de", stage: "clause", operation: "regex", pattern: "^Hast du (?:den )?(?<thing>Server|Build|Patch) (?:bereits|schon) (?:überprüft|geprüft|gecheckt)\\??$", outputs: { casual: ["Hast du den $<thing> schon gecheckt?"], slang: ["$<thing> schon gecheckt?"], heavy: ["$<thing> gecheckt?"] }, contexts: ["gaming", "technical", "discord"], region: "Germany / DACH", confidence: "high", current: true, can_generate: true, can_recognize: true, max_applications: 1, changes_register: false },
    { id: "de_join_now_compression", language: "de", stage: "clause", operation: "regex", pattern: "^Ich werde (?:jetzt|gleich) (?:beitreten|reinkommen|reingehen)[.!]?$", outputs: { casual: ["Ich komm gleich rein."], slang: ["komm gleich rein"], heavy: ["gleich drin"] }, contexts: ["gaming", "discord", "chat"], region: "Germany / DACH", confidence: "high", current: true, can_generate: true, can_recognize: true, max_applications: 1, changes_register: false },
    { id: "de_heals_question_compression", language: "de", stage: "clause", operation: "regex", pattern: "^(?:Hast du|Habt ihr) (?:noch )?(?<thing>Heilungen|Heiltränke|Heals)\\??$", outputs: { casual: ["Hast du noch Heals?"], slang: ["noch Heals?"], heavy: ["Heals?"] }, contexts: ["gaming", "discord"], context_patterns: ["Heilungen", "Heiltränke", "Heals"], region: "Germany / DACH", confidence: "high", current: true, can_generate: true, can_recognize: true, max_applications: 1, changes_register: false },
    { id: "de_finished_already_compression", language: "de", stage: "clause", operation: "regex", pattern: "^Wir haben (?:bereits|schon) (?:abgeschlossen|aufgehört|fertiggemacht)[.!]?$", outputs: { casual: ["Wir sind schon fertig."], slang: ["sind schon fertig"], heavy: ["schon fertig"] }, contexts: ["chat", "gaming", "discord"], region: "Germany / DACH", confidence: "high", current: true, can_generate: true, can_recognize: true, max_applications: 1, changes_register: false },
    { id: "de_gibt_es_question", language: "de", stage: "grammar", operation: "regex", pattern: "^Gibt es (?<thing>.+?)\\?$", outputs: { casual: ["Gibt's $<thing>?"], slang: ["gibts $<thing>?"], heavy: ["gibts $<thing>"] }, contexts: ["chat", "gaming", "discord"], region: "Germany / DACH", confidence: "high", current: true, can_generate: true, can_recognize: true, max_applications: 1, changes_register: false },
    { id: "de_habe_gerade_compression", language: "de", stage: "grammar", operation: "regex", pattern: "^Ich habe (?:gerade|soeben) (?<tail>.+)$", outputs: { casual: ["Ich hab gerade $<tail>"], slang: ["hab grad $<tail>"], heavy: ["grad $<tail>"] }, contexts: ["chat", "gaming", "discord"], negative_patterns: ["Vertrag", "Antrag", "Kündigung"], region: "Germany / DACH", confidence: "high", current: true, can_generate: true, can_recognize: true, max_applications: 1, changes_register: false },
    { id: "en_wellbeing_question_compression", language: "en", stage: "clause", operation: "regex", pattern: "^How are you(?: doing)?\\??$", outputs: { casual: ["How's it going?"], slang: ["hows it going?"], heavy: ["how u doing"] }, contexts: ["chat", "discord"], region: "global", confidence: "high", current: true, can_generate: true, can_recognize: true, max_applications: 1 },
    { id: "ru_bug_question_compression", language: "ru", stage: "clause", operation: "regex", pattern: "^Почему они (?:всё ещё|до сих пор) не (?:исправили|починили) этот баг\\??$", outputs: { casual: ["Почему они до сих пор не починили баг?"], slang: ["почему баг ещё не пофиксили?"], heavy: ["баг ещё не пофиксили?"] }, contexts: ["gaming", "discord"], region: "Russia / global Russian", confidence: "high", current: true, can_generate: true, can_recognize: true, max_applications: 1 },
    { id: "uk_bug_question_compression", language: "uk", stage: "clause", operation: "regex", pattern: "^Чому вони досі не (?:виправили|полагодили) цей баг\\??$", outputs: { casual: ["Чому вони досі не полагодили баг?"], slang: ["чого баг досі не пофіксили?"], heavy: ["баг досі не пофіксили?"] }, contexts: ["gaming", "discord"], region: "Ukraine", confidence: "high", current: true, can_generate: true, can_recognize: true, max_applications: 1 },
    { id: "zh_cn_bug_question_compression_v09", language: "zh-CN", stage: "clause", operation: "regex", pattern: "^为什么他们还没有修复这个 (?<bug>bug|漏洞)[？?]?$", outputs: { casual: ["这个 $<bug> 怎么还没修？"], slang: ["这 $<bug> 咋还没修？"], heavy: ["这 $<bug> 还不修？"] }, contexts: ["gaming", "chat"], region: "Mainland China", confidence: "high", current: true, can_generate: true, can_recognize: true, max_applications: 1 },
    { id: "zh_tw_bug_question_compression_v09", language: "zh-TW", stage: "clause", operation: "regex", pattern: "^為什麼他們還沒有修復這個 (?<bug>bug|漏洞)[？?]?$", outputs: { casual: ["這個 $<bug> 怎麼還沒修？"], slang: ["這 $<bug> 到底怎麼還沒修？"], heavy: ["這 $<bug> 到底要拖多久？"] }, contexts: ["gaming", "chat"], region: "Taiwan", confidence: "high", current: true, can_generate: true, can_recognize: true, max_applications: 1 },
    { id: "es_bug_question_compression_v09", language: "es", stage: "clause", operation: "regex", pattern: "^¿?Por qué todavía no han arreglado este (?<bug>bug|error)\\??$", outputs: { casual: ["¿Por qué aún no arreglaron el $<bug>?"], slang: ["por qué no arreglan el $<bug> todavía?"], heavy: ["el $<bug> sigue sin arreglar"] }, contexts: ["gaming", "chat"], region: "global / region-sensitive", confidence: "medium", current: true, can_generate: true, can_recognize: true, max_applications: 1 },
    { id: "fr_bug_question_compression_v09", language: "fr", stage: "clause", operation: "regex", pattern: "^Pourquoi n'ont-ils toujours pas corrigé ce (?<bug>bug|problème) ?\\??$", outputs: { casual: ["Pourquoi ils ont toujours pas corrigé ce $<bug> ?"], slang: ["pourquoi ce $<bug> est toujours pas fix ?"], heavy: ["ce $<bug> toujours pas fix"] }, contexts: ["gaming", "chat"], region: "France / global French", confidence: "medium", current: true, can_generate: true, can_recognize: true, max_applications: 1 },
    { id: "pt_br_bug_question_compression_v09", language: "pt-BR", stage: "clause", operation: "regex", pattern: "^Por que eles ainda não corrigiram (?:esse|este) (?<bug>bug|erro)\\??$", outputs: { casual: ["Por que ainda não corrigiram o $<bug>?"], slang: ["pq ainda não arrumaram o $<bug>?"], heavy: ["$<bug> ainda não arrumado"] }, contexts: ["gaming", "chat"], region: "Brazil", confidence: "medium", current: true, can_generate: true, can_recognize: true, max_applications: 1 },
    { id: "pl_bug_question_compression_v09", language: "pl", stage: "clause", operation: "regex", pattern: "^Dlaczego oni wciąż nie naprawili tego (?<bug>buga|błędu)\\??$", outputs: { casual: ["Czemu jeszcze nie naprawili tego $<bug>?"], slang: ["czemu $<bug> dalej nie naprawiony?"], heavy: ["$<bug> dalej nie naprawiony"] }, contexts: ["gaming", "chat"], region: "Poland", confidence: "medium", current: true, can_generate: true, can_recognize: true, max_applications: 1 },
    { id: "ja_bug_question_compression_v09", language: "ja", stage: "clause", operation: "regex", pattern: "^なぜこのバグはまだ修正されていないのですか[？?]?$", outputs: { casual: ["このバグ、まだ直ってないの？"], slang: ["このバグまだ直ってないの？"], heavy: ["なんでこのバグまだ直ってないんだよ"] }, contexts: ["gaming", "chat"], region: "Japan", confidence: "high", current: true, can_generate: true, can_recognize: true, max_applications: 1, changes_register: true },
    { id: "ko_bug_question_compression_v09", language: "ko", stage: "clause", operation: "regex", pattern: "^왜 아직도 이 버그를 고치지 않았(?:나요|습니까)[?？]?$", outputs: { casual: ["이 버그 왜 아직도 안 고쳤어?"], slang: ["이 버그 아직도 안 고침?"], heavy: ["이 버그 왜 아직도 안 고침"] }, contexts: ["gaming", "chat"], region: "South Korea", confidence: "high", current: true, can_generate: true, can_recognize: true, max_applications: 1, changes_register: true }
];
for (const rule of rules) upsert(dataset.naturalization_rules, rule);

writeFileSync(path, `${JSON.stringify(dataset, null, 2)}\n`);
console.log(`SonyTranslator dataset upgraded to ${dataset.version}: ${dataset.semantic_mappings.length} semantic mappings, ${dataset.pragmatic_profanity_rules.length} pragmatic profanity rules, ${dataset.naturalization_rules.length} naturalization rules.`);
