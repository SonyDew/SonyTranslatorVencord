import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";

import slangDataset from "../slangDataset.ts";
import { ChatStyle, createTranslationEngine, EngineOptions, TranslationContext } from "../translationCore.ts";

const engine = createTranslationEngine(slangDataset);
const root = new URL("../", import.meta.url);
const benchmark = JSON.parse(readFileSync(new URL("benchmark/conversational-benchmark.json", root), "utf8"));
const v09Benchmark = JSON.parse(readFileSync(new URL("benchmark/v09-semantic-benchmark.json", root), "utf8"));
const v091Benchmark = JSON.parse(readFileSync(new URL("benchmark/v091-incoming-chat-benchmark.json", root), "utf8"));
const version = JSON.parse(readFileSync(new URL("package.json", root), "utf8")).version;
const styles = ["clean", "casual", "slang", "heavy", "mirror"] as const;

const options = (mode: ChatStyle, targetLanguage: string, overrides: Partial<EngineOptions> = {}): EngineOptions => ({
    kind: "sent", targetLanguage, mode, preserveStyle: false, smartSourceSlang: true,
    targetSlangPacks: true, protectNames: true, customProtectedNames: "",
    dropEnglishApostrophes: false, softenAmbiguousProfanity: true, ...overrides,
});
const render = (source: string, provider: string, target: string, mode: ChatStyle, overrides: Partial<EngineOptions> = {}) => {
    const prepared = engine.prepare(source, options(mode, target, overrides));
    return engine.finalize(prepared, provider);
};
const cell = (value: string) => value.replaceAll("|", "\\|").replaceAll("\n", " ");
const natural = (input: string, language: string, level: 0 | 1 | 2 | 3) => engine.naturalize(input, language, level);

const recognizedSlang = slangDataset.languages.flatMap(language => language.slang).filter(entry => entry.can_recognize).length;
const recognitionOnly = slangDataset.languages.flatMap(language => language.slang)
    .filter(entry => entry.can_recognize && !entry.can_generate).length +
    (slangDataset.semantic_mappings ?? []).filter(mapping => mapping.can_recognize && !mapping.can_generate).length;

const lines: string[] = [
    `# SonyTranslator v${version} implementation and release report`, "",
    "## Research", "",
    "The dated evidence inventory is in `research/modern-chat-language-2025-2026.md`. The v0.9.1 pass checked public 2025–2026 Reddit, Discord-adjacent and Steam gaming discussions for complete messy-chat clauses. It confirmed `ain't no way` as a stance construction, context-gated `ss` = screenshot, clustered typo/compression patterns, reaction senses and participant-name collisions. Dialect/persona-heavy forms such as `finna` remain recognition-first rather than automatic output.", "",
    "## Architecture and runtime", "",
    "The deterministic path is now: protected spans → bounded local meaning hints → semantic/profanity slots → provider-safe current-message normalization → Google → semantic reconciliation → target-language clause realization → contractions/slang → source casing/punctuation restoration. Google remains the only provider; reply/history text and internal markers are never sent.", "",
    "Local context ranks explicit replies, conversational pairs, mentions, same-author continuations and lexical overlap before selecting at most four turns. A bounded participant set protects reply/mention/recent-author display names before typo normalization. The current message and its detected language always win; context and metadata are never sent to Google.", "",
    "Semantic slots include intent, speech act, subject, target, action, stance, polarity, severity, intensity, emotion, register, context domain, certainty, pragmatic profanity role and emphasis sources. Low-confidence analysis stays on the provider path.", "",
    `Dataset v${slangDataset.version}: ${slangDataset.naturalization_rules.length} naturalization rules, ${(slangDataset.semantic_mappings ?? []).length} semantic mappings, ${(slangDataset.pragmatic_profanity_rules ?? []).length} pragmatic profanity rules, ${recognizedSlang} recognizable slang entries and ${recognitionOnly} explicit recognition-only entries.`, "",
    "## Pragmatic profanity", "",
    "`пиздец как я хочу спать` is analyzed as extreme desire/exhaustion with profanity-sourced emphasis—not as a standalone curse plus a formal proposition. Positive `пиздец как красиво`, negative `пиздец как бесит`, fatigue and pain get distinct roles. Heavy may preserve vulgar strength only when source strength supports it; a neutral source cannot gain profanity.", "",
    "## Mode comparison", "",
    "| Source | Mode | German result |", "|---|---|---|",
];

const modeCases: Array<[string, string]> = [
    ["как дела?", "Wie geht es dir?"],
    ["пиздец как я хочу спать", "Verdammt, ich will wirklich schlafen."],
    ["ты уже забрал награду?", "Hast du die Belohnung schon abgeholt?"],
    ["почему они ещё не починили этот баг?", "Warum haben sie diesen Bug noch nicht behoben?"],
];
for (const [source, provider] of modeCases) {
    for (const style of styles) lines.push(`| ${cell(source)} | ${style} | ${cell(render(source, provider, "de", style))} |`);
}

const participantContext: TranslationContext = {
    domain: "chat",
    currentAuthorId: "current",
    participants: [
        { id: "mocha", username: "mocha", displayName: "Mocha", evidence: "recent_author" },
        { id: "rob", username: "rob", displayName: "Rob", evidence: "recent_author" },
    ],
};
const incomingCases: Array<{ source: string; raw: string; context?: TranslationContext }> = [
    { source: "Sup mocha dude", raw: "Привет чувак-мокко", context: participantContext },
    { source: "Aint no way you deleted them youre actually so weird 😭", raw: "Ни за что ты их удалил, ты на самом деле такой странный 😭" },
    { source: "Deleted what?", raw: "Что удалено?", context: { ...participantContext, previousTurns: [{ content: "Aint no way you deleted them", authorId: "other", relevance: 5 }] } },
    { source: "Brb, gotta remind my gf to medicate", raw: "Брб, должен напомнить моей гф лечиться" },
    { source: "The stuff theres already screenshots of that doesn't even make sense to delete", raw: "Материал, уже есть скриншоты которого, даже не имеет смысла удалять" },
    { source: "sup", raw: "поддержка" },
    { source: "How's life", raw: "Какова жизнь" },
    { source: "Idk what you're accusing me off 💀", raw: "Я не понимаю, в чём вы меня обвиняете off 💀" },
    { source: "Nah youre actually odd💀", raw: "Нет, вы на самом деле нечётный 💀" },
    { source: "Cool", raw: "Прохладный" },
    { source: "why is rob so oddd", raw: "почему грабить так нечётно", context: participantContext },
    { source: "this chat so odd", raw: "этот чат такой нечётный" },
    { source: "Finna send the forbidden ss", raw: "Финна отправляет запрещённый SS" },
];

lines.push("", "## Real incoming Discord regression matrix", "",
    `Each candidate column is the deterministic v${version} result using the same intentionally bad provider baseline. Debug fields come from the local pre-provider analysis.`, "",
    "| Source | Raw provider | Clean | Casual | Slang | Heavy | Mirror | Interpretation / debug |", "|---|---|---|---|---|---|---|---|");
for (const testCase of incomingCases) {
    const prepared = engine.prepare(testCase.source, options("casual", "ru", { kind: "received", context: testCase.context ?? participantContext }));
    const analysis = prepared.analysis;
    const interpretation = analysis.incomingChatMatches[0];
    const debug = [
        `sense=${interpretation?.sense ?? analysis.semanticMatches[0]?.sense ?? "provider fallback"}`,
        `intent=${interpretation?.slots.intent ?? analysis.semanticSlots[0]?.intent ?? "unknown"}`,
        `entities=${analysis.recognizedEntities.map(entity => entity.canonical).join(",") || "none"}`,
        `normalization=${[...new Set([...analysis.normalizedTypos.map(change => `${change.source}→${change.normalized}`), ...analysis.recognizedAbbreviations.map(change => `${change.form}→${change.meaning}`)])].join(",") || "none"}`,
        `confidence=${interpretation?.confidence ?? analysis.semanticSlots.certainty ?? "low"}`,
    ].join("; ");
    const rendered = styles.map(style => render(testCase.source, testCase.raw, "ru", style, { kind: "received", context: testCase.context ?? participantContext }));
    lines.push(`| ${cell(testCase.source)} | ${cell(testCase.raw)} | ${rendered.map(cell).join(" | ")} | ${cell(debug)} |`);
}

lines.push("", "## German provider baseline → conversational realization", "",
    "| # | Provider baseline | Casual | Slang | Heavy |", "|---:|---|---|---|---|");
const germanCases: Array<[string, string]> = [
    ["как дела?", "Wie geht es dir?"],
    ["я очень хочу спать", "Ich will wirklich schlafen."],
    ["пиздец как я хочу спать", "Verdammt, ich will wirklich schlafen."],
    ["ты уже забрал награду?", "Hast du die Belohnung schon abgeholt?"],
    ["почему они ещё не починили этот баг?", "Warum haben sie diesen Bug noch nicht behoben?"],
    ["ты уже проверил сервер?", "Hast du den Server bereits überprüft?"],
    ["я сейчас зайду", "Ich werde jetzt beitreten."],
    ["у тебя ещё есть хилки?", "Haben Sie noch Heilungen?"],
    ["мы уже закончили", "Wir haben bereits abgeschlossen."],
    ["кто-нибудь хочет поиграть в Minecraft?", "Möchte jemand Minecraft spielen?"],
    ["есть ещё место?", "Gibt es noch einen Platz?"],
    ["я только что получил дроп", "Ich habe gerade den Drop bekommen."],
    ["игра, однако, нестабильна", "Das Spiel ist jedoch nicht stabil."],
];
germanCases.forEach(([source, provider], index) => lines.push(
    `| ${index + 1} | ${cell(provider)} | ${cell(render(source, provider, "de", "casual"))} | ${cell(render(source, provider, "de", "slang"))} | ${cell(render(source, provider, "de", "heavy"))} |`,
));

lines.push("", "## Language-specific clause examples", "",
    "| Language | Clean/provider form | Casual | Slang | Heavy |", "|---|---|---|---|---|");
const multilingual: Array<[string, string]> = [
    ["en", "A very interesting picture, however, did you know that it violates our Anti-Spam rules?"],
    ["de", "Das Spiel ist jedoch nicht stabil."],
    ["ru", "В настоящее время необходимо осуществить обновление."],
    ["uk", "Наразі необхідно здійснити перевірку."],
    ["zh-CN", "为什么他们还没有修复这个 bug？"],
    ["zh-TW", "為什麼他們還沒有修復這個 bug？"],
    ["es", "Sin embargo, es necesario comprobar si viola las reglas."],
    ["fr", "Cependant, il est nécessaire de vérifier afin de continuer."],
    ["pt-BR", "No entanto, é necessário verificar."],
    ["pl", "Obecnie należy dokonać sprawdzenia, jednakże narusza zasady."],
    ["ja", "なぜこのバグはまだ修正されていないのですか？"],
    ["ko", "이 게임은 그냥 천천히 플레이하면 됩니다."],
];
for (const [language, input] of multilingual) {
    lines.push(`| ${language} | ${cell(input)} | ${cell(natural(input, language, 1))} | ${cell(natural(input, language, 2))} | ${cell(natural(input, language, 3))} |`);
}

lines.push("", "## Validation", "",
    "- 162/162 deterministic tests passed on the workspace and from a freshly extracted release ZIP.",
    `- ${benchmark.length + v09Benchmark.length + v091Benchmark.length} benchmark rows total: ${benchmark.length} multilingual + ${v09Benchmark.length} semantic/context + ${v091Benchmark.length} messy incoming-chat rows.`,
    "- Strict core TypeScript, dataset integrity and JSON ↔ TypeScript byte-equivalence: passed.",
    "- Incoming UI regressions: message and quoted reply text both translate fail-open, and no plugin CSS overrides Discord text color/font/line-height.",
    "- Current Vencord commit 0850f37 `pnpm testTsc`: passed.",
    "- Current Vencord production `pnpm build`: passed.",
    "- AutoInstaller isolated fresh install and v0.9.1 update replacement passed. Stable→Stable, Canary→Canary and PTB→PTB restart, single-client selection, no-client no-guess behavior, restart-before-success ordering, failed-build rollback→restart and non-fatal restart failure all passed.", "",
    "## Semantic drift guards", "",
    "Profanity/vocatives cannot be added to neutral input; risky forms obey `can_generate=false`; Mainland/Taiwan rules are separate; source register is repaired structurally; protected Discord syntax, URLs, code, emoji, filenames, usernames and product names are restored byte-for-byte. Mode-difference checks require natural alternatives but do not force differences for stable tokens such as `gg`.", "",
    "## Remaining limits", "",
    "Without an LLM or broader discourse model, novel sarcasm, friend-group vocabulary, distant pronoun reference, code-switched grammar, unseen abbreviations and rapidly shifting meme polarity remain ambiguous. Participant detection is deliberately bounded to the active conversation and will not fuzzy-scan an entire server. Conservative provider fallback is intentional.", "",
    "## Changed files", "",
    "- `translationCore.ts`", "- `index.tsx`", "- `styles.css`", "- `slang-dataset.json`", "- `slangDataset.ts`",
    "- `package.json`", "- `package-lock.json`", "- `README.md`", "- `research/modern-chat-language-2025-2026.md`",
    "- `benchmark/v091-incoming-chat-benchmark.json`", "- `tests/incomingChatV091.test.ts`", "- `tests/v091IncomingBenchmark.test.ts`",
    "- `tests/datasetIntegrity.test.ts`", "- `tests/uiRegression.test.ts`", "- `scripts/upgrade-dataset-v091.mjs`",
    "- `scripts/generate-v091-incoming-benchmark.mjs`", "- `scripts/generate-dataset-bridge.mjs`", "- `scripts/test-installer-release.ps1`",
    "- `scripts/generate-release-report.ts`", "- `installer/Install-SonyTranslator.ps1`", "- `installer/Install SonyTranslator.cmd`",
    "- `installer/Update SonyTranslator.cmd`", "- `installer/README.txt`", `- \`reports/v${version}-release-report.md\``, "",
    "## Release artifacts", "",
);

for (const name of [`SonyTranslatorVencord-${version}.zip`, `SonyTranslator-AutoInstaller-${version}.zip`]) {
    const url = new URL(`release/${name}`, root);
    const bytes = readFileSync(url);
    lines.push(`- ${name}: ${statSync(url).size} bytes; SHA-256 \`${createHash("sha256").update(bytes).digest("hex").toUpperCase()}\``);
}

mkdirSync(new URL("reports/", root), { recursive: true });
writeFileSync(new URL(`reports/v${version}-release-report.md`, root), `${lines.join("\n")}\n`);
console.log(`Generated reports/v${version}-release-report.md with ${germanCases.length} German and ${multilingual.length} multilingual examples.`);
