/*
 * SonyTranslator - Vencord userplugin v0.9.5
 * Copyright (c) 2026 SonyDev
 * SPDX-License-Identifier: LicenseRef-SonyTranslator-Personal-Use-1.0
 *
 * Uses Vencord's built-in Translate plugin as the translation transport.
 * No user API key is required for the default Google Translate provider.
 */

import "./styles.css";

import slangDataset from "./slangDataset";
import { languageDisplayName, uiText, type UiKey } from "./localization";
import { googleSourceCode, runPreparedTranslation } from "./translationRunner";
import {
    canTranslate,
    createTranslationEngine,
    type ContextTurn,
    type TranslationContext,
    type TranslationParticipant,
} from "./translationCore";

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { definePluginSettings, Settings } from "@api/Settings";
import { Divider } from "@components/Divider";
import ErrorBoundary from "@components/ErrorBoundary";
import { FormSwitch } from "@components/FormSwitch";
import { Margins } from "@utils/margins";
import definePlugin, { IconComponent, OptionType } from "@utils/types";
import { Message, RenderModalProps } from "@vencord/discord-types";
import { findCssClassesLazy } from "@webpack";
import { GoogleLanguages } from "@plugins/translate/languages";
import { settings as coreTranslateSettings } from "@plugins/translate/settings";
import { translate as coreTranslate } from "@plugins/translate/utils";
import {
    Button,
    ChannelStore,
    Forms,
    GuildMemberStore,
    LocaleStore,
    Modal,
    MessageStore,
    openModal,
    Parser,
    SearchableSelect,
    showToast,
    TextInput,
    UserStore,
    useEffect,
    useMemo,
    useState,
    useStateFromStores,
} from "@webpack/common";

function useUi() {
    const locale = useStateFromStores([LocaleStore], () => LocaleStore.locale);
    return { locale, t: (key: UiKey) => uiText(locale, key) };
}

const MessageContentClasses = findCssClassesLazy("messageContent", "markupRtl");
const MarkupClasses = findCssClassesLazy("markup", "codeContainer");
const ReplyClasses = findCssClassesLazy("repliedMessage", "repliedTextPreview", "repliedTextContent");

const settings = definePluginSettings({
    incomingEnabled: {
        type: OptionType.BOOLEAN,
        description: "Automatically translate visible incoming messages",
        default: true,
        hidden: true,
    },
    outgoingEnabled: {
        type: OptionType.BOOLEAN,
        description: "Automatically translate your outgoing messages before sending",
        default: true,
        hidden: true,
    },
    incomingTarget: {
        type: OptionType.STRING,
        description: "Language you want to read",
        default: "ru",
        hidden: true,
    },
    incomingStyle: {
        type: OptionType.SELECT,
        description: "How strongly incoming chat slang should be adapted",
        options: [
            { label: "Clean", value: "clean" },
            { label: "Casual", value: "casual", default: true },
            { label: "Slang", value: "slang" },
            { label: "Heavy slang", value: "heavy" },
            { label: "Match source", value: "mirror" },
        ],
        hidden: true,
    },
    outgoingTarget: {
        type: OptionType.STRING,
        description: "Language your messages should be sent in",
        default: "en",
        hidden: true,
    },
    replaceIncoming: {
        type: OptionType.BOOLEAN,
        description: "Hide the original text after a translation is ready",
        default: true,
        hidden: true,
    },
    preserveStyle: {
        type: OptionType.BOOLEAN,
        description: "Preserve casing, punctuation and chat-like formatting where possible",
        default: true,
        hidden: true,
    },
    chatStyle: {
        type: OptionType.SELECT,
        description: "Outgoing chat style",
        options: [
            { label: "Clean", value: "clean" },
            { label: "Casual", value: "casual" },
            { label: "Slang", value: "slang" },
            { label: "Heavy slang", value: "heavy" },
            { label: "Match my typing", value: "mirror", default: true },
        ],
        hidden: true,
    },
    smartSourceSlang: {
        type: OptionType.BOOLEAN,
        description: "Normalize Russian/Ukrainian chat slang before translating so grammar does not break",
        default: true,
        hidden: true,
    },
    targetSlangPacks: {
        type: OptionType.BOOLEAN,
        description: "Apply target-language chat abbreviations/slang packs",
        default: true,
        hidden: true,
    },
    protectNames: {
        type: OptionType.BOOLEAN,
        description: "Keep game, software, product and intentionally typed English names unchanged",
        default: true,
        hidden: true,
    },
    preserveMixedEnglish: {
        type: OptionType.BOOLEAN,
        description: "Keep English words inside mixed-language messages",
        default: true,
        hidden: true,
    },
    customProtectedNames: {
        type: OptionType.STRING,
        description: "Comma-separated custom names that must never be translated",
        default: "",
        hidden: true,
    },
    dropEnglishApostrophes: {
        type: OptionType.BOOLEAN,
        description: "In casual/mirror English, write im/dont/cant instead of I'm/don't/can't",
        default: true,
        hidden: true,
    },
    softenAmbiguousProfanity: {
        type: OptionType.BOOLEAN,
        description: "Avoid translating ambiguous Russian profanity as a literal sexual/anatomical word when chat context is unclear",
        default: true,
        hidden: true,
    },
    onlyOutgoingCyrillic: {
        type: OptionType.BOOLEAN,
        description: "Legacy v0.7 setting retained for compatibility; outgoing translation now supports every language",
        default: false,
        hidden: true,
    },
    showTranslationBadge: {
        type: OptionType.BOOLEAN,
        description: "Show a tiny translated label next to translated incoming messages",
        default: false,
        hidden: true,
    },
});

type ChatStyle = "clean" | "casual" | "slang" | "heavy" | "mirror";
type StyleLevel = 0 | 1 | 2 | 3;

type ProtectedText = {
    text: string;
    restore: (translated: string) => string;
};

type TranslationStyle = {
    noCommas: boolean;
    noSentencePunctuation: boolean;
    allLowercase: boolean;
    allUppercase: boolean;
    startsLowercase: boolean;
    endingMarks: string;
    endingEllipsis: string;
    sourceSlangScore: number;
    sourceHadApostrophe: boolean;
};

type SourceHints = {
    tokens: Set<string>;
    confusionInterjection: boolean;
    laughter: boolean;
    profanity: boolean;
};

type Rule = readonly [RegExp, string];

type DatasetLanguage = {
    code: string;
    name: string;
    region: string;
    slang: any[];
    phrases: any[];
    reactions: any[];
    gaming: any[];
    profanity: any[];
};

const DATASET_LANGUAGES = slangDataset.languages as DatasetLanguage[];
const DATASET_LANGUAGE_MAP = new Map(DATASET_LANGUAGES.map(language => [language.code.toLocaleLowerCase(), language]));
const DATASET_PROTECTED_ENTITIES = slangDataset.protected_entities as any[];
const DATASET_TRANSLATION_MISTAKES = slangDataset.translation_mistakes as any[];
const translationEngine = createTranslationEngine(slangDataset);

const REGISTER_LEVEL: Record<string, StyleLevel> = {
    casual: 1,
    slang: 2,
    heavy: 3,
};

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeDatasetLanguageCode(language: string): string {
    const normalized = language.toLocaleLowerCase();
    if (normalized.startsWith("zh")) return normalized.includes("tw") || normalized.includes("hant") ? "zh-tw" : "zh-cn";
    if (normalized.startsWith("pt")) return "pt-br";
    if (normalized.startsWith("uk")) return "uk";
    return normalized.split("-")[0];
}

function getDatasetLanguage(language: string): DatasetLanguage | undefined {
    const code = normalizeDatasetLanguageCode(language);
    return DATASET_LANGUAGE_MAP.get(code) ?? DATASET_LANGUAGE_MAP.get(language.toLocaleLowerCase());
}

function phraseRegex(value: string, languageCode: string, flags = "giu"): RegExp {
    const escaped = escapeRegex(value).replace(/\\\s+/g, "\\s+");
    if (/^(?:zh|ja|ko)/i.test(languageCode)) return new RegExp(escaped, flags);
    return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, flags);
}

function normalizeComparable(value: string): string {
    return value
        .toLocaleLowerCase()
        .replace(/[“”"'’`]/g, "")
        .replace(/[.,!?！？。,:;，；：…]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function hasUnicodePhrase(input: string, phrase: string, languageCode: string): boolean {
    if (!phrase.trim()) return false;
    try {
        return phraseRegex(phrase, languageCode, "iu").test(input);
    } catch {
        return input.toLocaleLowerCase().includes(phrase.toLocaleLowerCase());
    }
}

function sourceLanguageFromScript(input: string): string | null {
    if (/[іїєґІЇЄҐ]/u.test(input)) return "uk";
    if (/[а-яёА-ЯЁ]/u.test(input)) return "ru";
    if (/[\u3040-\u30ff]/u.test(input)) return "ja";
    if (/[\uac00-\ud7af]/u.test(input)) return "ko";

    if (/[\u3400-\u9fff]/u.test(input)) {
        // A lightweight traditional-character signal. If none are present, Mainland is the safer default.
        if (/[這個們來為與說對謝網遊戲後裡麼還會時學長開關點現氣樣體國臺灣將無過從]/u.test(input)) return "zh-TW";
        return "zh-CN";
    }

    return null;
}

function detectDatasetSourceLanguage(input: string): string | null {
    const comparable = normalizeComparable(input);

    // Exact short slang/reaction matches are stronger than script heuristics. This matters for
    // shared Han characters such as Japanese "草", which would otherwise look Chinese.
    if (comparable) {
        const exactMatches = new Set<string>();
        for (const language of DATASET_LANGUAGES) {
            for (const entry of language.slang ?? []) {
                if (!entry?.can_recognize) continue;
                for (const form of entry.forms ?? []) {
                    if (typeof form === "string" && normalizeComparable(form) === comparable) exactMatches.add(language.code);
                }
            }
            for (const reaction of language.reactions ?? []) {
                if (typeof reaction?.form === "string" && normalizeComparable(reaction.form) === comparable) exactMatches.add(language.code);
            }
        }
        if (exactMatches.size === 1) return [...exactMatches][0];
    }

    const byScript = sourceLanguageFromScript(input);
    if (byScript) return byScript;

    const scores = new Map<string, number>();
    for (const language of DATASET_LANGUAGES) {
        let score = 0;

        for (const entry of language.slang ?? []) {
            if (!entry.can_recognize) continue;
            for (const form of entry.forms ?? []) {
                if (typeof form !== "string" || form.length < 2) continue;
                if (hasUnicodePhrase(input, form, language.code)) score += Math.min(4, Math.max(1, form.length / 2));
            }
        }

        for (const reaction of language.reactions ?? []) {
            const form = reaction.form;
            if (typeof form === "string" && form.length >= 2 && hasUnicodePhrase(input, form, language.code)) score += 3;
        }

        if (score > 0) scores.set(language.code, score);
    }

    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    if (!ranked.length) return null;
    if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) return null;
    return ranked[0][0];
}

function datasetRegisterAllowed(entry: any, level: StyleLevel): boolean {
    if (level === 0 || !entry?.current || entry?.outdated || !entry?.can_generate) return false;
    const registers = Array.isArray(entry.register) ? entry.register : [];
    if (!registers.length) return level >= 2;
    const minimum = Math.min(...registers.map((register: string) => REGISTER_LEVEL[register] ?? 3));
    return level >= minimum;
}

function chooseDatasetForm(entry: any, level: StyleLevel): string | null {
    const forms = (entry?.forms ?? []).filter((form: unknown): form is string => typeof form === "string" && !!form.trim());
    if (!forms.length) return null;

    // User preference: these compressed English spellings are intentionally available in strong chat styles.
    if (entry.id === "en_because") return level >= 3 ? "cuz" : level >= 2 ? "bcs" : "bc";
    if (entry.id === "en_and") return level >= 3 ? "nd" : null;
    if (entry.id === "en_are") return level >= 3 ? "ar" : null;

    const canonical = String(entry.canonical ?? "").toLocaleLowerCase();
    const alternatives = forms.filter(form => form.toLocaleLowerCase() !== canonical);
    const candidates = alternatives.length ? alternatives : forms;
    if (level >= 3) return [...candidates].sort((a, b) => a.length - b.length)[0];
    return candidates[0];
}

function applyDatasetGeneratedSlang(input: string, targetLanguage: string, level: StyleLevel): string {
    const language = getDatasetLanguage(targetLanguage);
    if (!language || level === 0) return input;

    let output = input;
    const entries = [...(language.slang ?? [])]
        .filter(entry => datasetRegisterAllowed(entry, level))
        .sort((a, b) => String(b.canonical ?? "").length - String(a.canonical ?? "").length);

    for (const entry of entries) {
        const canonical = typeof entry.canonical === "string" ? entry.canonical.trim() : "";
        const replacement = chooseDatasetForm(entry, level);
        if (!canonical || !replacement || canonical.includes(" / ") || canonical.includes(";")) continue;
        if (normalizeComparable(canonical) === normalizeComparable(replacement)) continue;

        try {
            output = output.replace(phraseRegex(canonical, language.code), replacement);
        } catch {
            // Ignore malformed research rows rather than breaking message sending.
        }
    }

    return output;
}

function safeRecognitionCanonical(entry: any): string | null {
    const canonical = typeof entry?.canonical === "string" ? entry.canonical.trim() : "";
    if (!canonical || canonical.includes(" / ") || canonical.includes(";")) return null;
    if (/\bdepending\b/i.test(String(entry?.meaning ?? ""))) return null;
    return canonical;
}

function applyDatasetRecognition(input: string, sourceLanguage: string | null): string {
    if (!sourceLanguage) return input;
    const language = getDatasetLanguage(sourceLanguage);
    if (!language) return input;

    let output = input;
    const entries = [...(language.slang ?? [])]
        .filter(entry => entry?.can_recognize)
        .sort((a, b) => Math.max(...(b.forms ?? []).map((x: string) => String(x).length), 0) - Math.max(...(a.forms ?? []).map((x: string) => String(x).length), 0));

    for (const entry of entries) {
        const canonical = safeRecognitionCanonical(entry);
        if (!canonical) continue;

        for (const form of [...(entry.forms ?? [])].sort((a: string, b: string) => String(b).length - String(a).length)) {
            if (typeof form !== "string" || !form.trim()) continue;
            if (normalizeComparable(form) === normalizeComparable(canonical)) continue;

            try {
                output = output.replace(phraseRegex(form, language.code), canonical);
            } catch {
                // A bad row should never block translation.
            }
        }
    }

    return output;
}

function targetReactionFromSource(original: string, sourceLanguage: string | null, targetLanguage: string): string | null {
    if (!sourceLanguage) return null;
    // "круто" can be praise, while "круто?" is a real question. Do not collapse questions into reactions.
    if (/[?？]\s*$/u.test(original)) return null;
    const target = getDatasetLanguage(targetLanguage);
    if (!target) return null;

    const sourceCode = getDatasetLanguage(sourceLanguage)?.code ?? sourceLanguage;
    const originalComparable = normalizeComparable(original);

    for (const reaction of target.reactions ?? []) {
        if (!reaction?.current || reaction?.outdated || typeof reaction.form !== "string") continue;
        const equivalents = reaction.equivalents?.[sourceCode] ?? reaction.equivalents?.[normalizeDatasetLanguageCode(sourceCode)] ?? [];
        for (const equivalent of equivalents) {
            if (typeof equivalent !== "string") continue;
            if (normalizeComparable(equivalent) === originalComparable) return reaction.form;
        }
    }

    return null;
}

function sourceReactionToTarget(original: string, sourceLanguage: string | null, targetLanguage: string): string | null {
    if (!sourceLanguage) return null;
    const source = getDatasetLanguage(sourceLanguage);
    if (!source) return null;

    const targetCode = getDatasetLanguage(targetLanguage)?.code ?? normalizeDatasetLanguageCode(targetLanguage);
    const originalComparable = normalizeComparable(original);

    for (const reaction of source.reactions ?? []) {
        if (typeof reaction.form !== "string" || normalizeComparable(reaction.form) !== originalComparable) continue;
        const equivalents = reaction.equivalents?.[targetCode] ?? reaction.equivalents?.[normalizeDatasetLanguageCode(targetCode)] ?? [];
        if (Array.isArray(equivalents) && typeof equivalents[0] === "string") return equivalents[0];
    }

    return null;
}

function applyDatasetTranslationMistakes(
    input: string,
    original: string,
    sourceLanguage: string | null,
    targetLanguage: string,
): string {
    if (!sourceLanguage) return input;

    const sourceCode = getDatasetLanguage(sourceLanguage)?.code ?? sourceLanguage;
    const targetCode = getDatasetLanguage(targetLanguage)?.code ?? normalizeDatasetLanguageCode(targetLanguage);
    let output = input;
    const originalComparable = normalizeComparable(original);

    for (const mistake of DATASET_TRANSLATION_MISTAKES) {
        if (mistake.source_language !== sourceCode || mistake.target_language !== targetCode) continue;
        const sourcePatterns = (mistake.source_patterns ?? []).filter((x: unknown): x is string => typeof x === "string");
        const matchedPattern = sourcePatterns.find(pattern => originalComparable === normalizeComparable(pattern));
        const preferred = (mistake.preferred_outputs ?? []).find((x: unknown): x is string => typeof x === "string");
        if (!preferred) continue;

        if (matchedPattern) {
            output = preferred;
            continue;
        }

        const occursInSource = sourcePatterns.some(pattern => hasUnicodePhrase(original, pattern, sourceCode));
        if (!occursInSource) continue;

        for (const bad of mistake.bad_outputs ?? []) {
            if (typeof bad !== "string" || !bad.trim()) continue;
            try {
                output = output.replace(phraseRegex(bad, targetCode), preferred);
            } catch {
                // Skip malformed pattern rows.
            }
        }
    }

    return output;
}

const MAX_CACHE = 1500;
const incomingCache = new Map<string, Promise<string | null>>();
const participantNameCache = new Map<string, TranslationParticipant>();
const MAX_PARTICIPANT_CACHE = 512;
let activeTranslations = 0;
const translationWaiters: Array<() => void> = [];
const MAX_CONCURRENT_TRANSLATIONS = 4;
let previousTranslateButtonState: boolean | undefined;
let previousCoreTranslateSettings: {
    service: typeof coreTranslateSettings.store.service;
    autoTranslate: typeof coreTranslateSettings.store.autoTranslate;
    receivedInput: typeof coreTranslateSettings.store.receivedInput;
    receivedOutput: typeof coreTranslateSettings.store.receivedOutput;
    sentInput: typeof coreTranslateSettings.store.sentInput;
    sentOutput: typeof coreTranslateSettings.store.sentOutput;
} | undefined;

function clearTranslationCache() {
    incomingCache.clear();
    participantNameCache.clear();
}

async function withTranslationLimit<T>(fn: () => Promise<T>): Promise<T> {
    if (activeTranslations >= MAX_CONCURRENT_TRANSLATIONS) {
        await new Promise<void>(resolve => translationWaiters.push(resolve));
    }

    activeTranslations++;
    try {
        return await fn();
    } finally {
        activeTranslations--;
        translationWaiters.shift()?.();
    }
}

function syncCoreTranslateSettings() {
    // Keep the transport deterministic. SonyTranslator owns auto-translation itself.
    coreTranslateSettings.store.service = "google";
    coreTranslateSettings.store.autoTranslate = false;

    coreTranslateSettings.store.receivedInput = "auto";
    coreTranslateSettings.store.receivedOutput = settings.store.incomingTarget;
    coreTranslateSettings.store.sentInput = "auto";
    coreTranslateSettings.store.sentOutput = settings.store.outgoingTarget;
}

function captureCoreTranslateSettings() {
    previousCoreTranslateSettings ??= {
        service: coreTranslateSettings.store.service,
        autoTranslate: coreTranslateSettings.store.autoTranslate,
        receivedInput: coreTranslateSettings.store.receivedInput,
        receivedOutput: coreTranslateSettings.store.receivedOutput,
        sentInput: coreTranslateSettings.store.sentInput,
        sentOutput: coreTranslateSettings.store.sentOutput,
    };
}

function restoreCoreTranslateSettings() {
    if (!previousCoreTranslateSettings) return;
    Object.assign(coreTranslateSettings.store, previousCoreTranslateSettings);
    previousCoreTranslateSettings = undefined;
}

const TranslateIcon: IconComponent = ({ width = 20, height = 20, className }) => (
    <svg
        className={className}
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
    >
        <path
            d="M4 5h9M8.5 3v2m-2.7 4.1c1.2 2.9 3.2 5.1 6.1 6.7M11.8 8.4c-1.1 3.5-3.9 6.7-7.8 8.6M14 21l3.6-9h1.8l3.6 9m-7.7-3h6.4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const PROTECTED_PATTERN = /```[\s\S]*?```|`[^`\n]+`|https?:\/\/[^\s<>]+|www\.[^\s<>]+|<@!?\d+>|<@&\d+>|<#\d+>|<a?:[A-Za-z0-9_]+:\d+>|<t:\d+(?::[tTdDfFR])?>|@[A-Za-z0-9_.-]+|#[\p{L}\p{N}_-]+/giu;
const TECHNICAL_PATTERN = /(?:[A-Za-z]:\\(?:[^\\\s]+\\)*[^\\\s]*|(?:\.{0,2}\/)+(?:[^\s/]+\/)*[^\s/]+|--?[A-Za-z][\w-]*|\bv?\d+(?:\.\d+){1,}(?:[-+._][A-Za-z0-9]+)*\b|\b[0-9a-f]{8,64}\b|\b(?:GG|GGWP|AFK|OP|FPS|DPS|PVP|PVE|NPC|CPU|GPU|RAM|API|SDK)\b)/giu;
const MIXED_CASE_NAME_PATTERN = /\b(?=[A-Za-z0-9.+#_-]*[A-Z])(?=[A-Za-z0-9.+#_-]*[a-z])[A-Za-z][A-Za-z0-9.+#_-]{2,}\b/g;
const TITLE_NAME_PATTERN = /\b[A-Z][A-Za-z0-9.+#'_-]*(?:\s+(?:[A-Z][A-Za-z0-9.+#'_-]*|\d+[A-Za-z0-9.+#'_-]*)){1,4}\b/g;
const MODEL_NAME_PATTERN = /\b(?:[A-Z]{2,}|[A-Z][a-z]+)\s+\d[A-Za-z0-9.-]*(?:\s+[A-Z0-9][A-Za-z0-9.-]*){0,3}\b/g;

function customProtectedNames(): string[] {
    return settings.store.customProtectedNames
        .split(/[,;\n]/g)
        .map(value => value.trim())
        .filter(Boolean);
}

function entityProtectedNames(): string[] {
    const names: string[] = [];
    for (const entity of DATASET_PROTECTED_ENTITIES) {
        if (!entity?.always_keep) continue;
        if (typeof entity.name === "string") names.push(entity.name);
        for (const alias of entity.aliases ?? []) if (typeof alias === "string") names.push(alias);
    }
    names.push(...customProtectedNames());
    return [...new Set(names)].sort((a, b) => b.length - a.length);
}

function protectDiscordSyntax(input: string): ProtectedText {
    const values: string[] = [];
    let text = input;

    const protectValue = (value: string) => {
        const index = values.push(value) - 1;
        return `SONYPROTECTTOKEN${index}END`;
    };

    const protectPattern = (pattern: RegExp) => {
        text = text.replace(pattern, value => value.includes("SONYPROTECTTOKEN") ? value : protectValue(value));
    };

    protectPattern(PROTECTED_PATTERN);
    protectPattern(TECHNICAL_PATTERN);

    if (settings.store.protectNames) {
        for (const name of entityProtectedNames()) {
            const escaped = escapeRegex(name).replace(/\\\s+/g, "\\s+");
            const isHanName = /[\u3400-\u9fff]/u.test(name);
            // Latin aliases use real token boundaries (including apostrophes) so a short alias such
            // as "ts" never matches the tail of "it's". Han names are unspaced, so boundary checks
            // would incorrectly miss normal text such as "在微信里".
            const regex = isHanName
                ? new RegExp(escaped, "gi")
                : new RegExp(`(?<![\p{L}\p{N}_'’])${escaped}(?![\p{L}\p{N}_'’])`, "giu");
            text = text.replace(regex, value => value.includes("SONYPROTECTTOKEN") ? value : protectValue(value));
        }

        // If the message itself is non-Latin, mixed-case / Title Case Latin spans are usually deliberate names.
        if (/[\p{Script=Cyrillic}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(input)) {
            protectPattern(TITLE_NAME_PATTERN);
            protectPattern(MIXED_CASE_NAME_PATTERN);
            protectPattern(MODEL_NAME_PATTERN);
        }
    }

    return {
        text,
        restore(translated: string) {
            let result = translated;
            values.forEach((value, index) => {
                const token = `SONYPROTECTTOKEN${index}END`;
                result = result.replace(new RegExp(token, "gi"), value);
            });
            return result;
        },
    };
}

const SOURCE_CHAT_TOKENS = [
    "хз", "мб", "кста", "кст", "спс", "пж", "пжлст", "плиз", "изи", "афк", "имба",
    "бро", "чел", "щас", "ща", "жиза", "сорян", "лан", "пон", "пох", "похуй", "бля",
    "блять", "пиздец", "реал", "рофл", "лол", "жесть", "капец", "го", "походу", "крч",
    "норм", "ваще", "чё", "че", "ток", "ясн", "ржу", "пизда", "гг", "дс", "акк",
    "тима", "катка", "лаги", "лаг", "фпс", "хп", "лвл", "скип", "репорт", "мут",
] as const;

const SOURCE_NORMALIZATION_RULES: Rule[] = [
    [/(?<![\p{L}\p{N}_])я\s+хз(?![\p{L}\p{N}_])/giu, "я не знаю"],
    [/(?<![\p{L}\p{N}_])хз(?![\p{L}\p{N}_])/giu, "не знаю"],
    [/(?<![\p{L}\p{N}_])мб(?![\p{L}\p{N}_])/giu, "может быть"],
    [/(?<![\p{L}\p{N}_])(?:кста(?:ти)?|кст)(?![\p{L}\p{N}_])/giu, "кстати"],
    [/(?<![\p{L}\p{N}_])спс(?![\p{L}\p{N}_])/giu, "спасибо"],
    [/(?<![\p{L}\p{N}_])(?:пжлст|пж|плиз)(?![\p{L}\p{N}_])/giu, "пожалуйста"],
    [/(?<![\p{L}\p{N}_])изи(?![\p{L}\p{N}_])/giu, "легко"],
    [/(?<![\p{L}\p{N}_])(?:щас|ща)(?![\p{L}\p{N}_])/giu, "сейчас"],
    [/(?<![\p{L}\p{N}_])сорян(?![\p{L}\p{N}_])/giu, "извини"],
    [/(?<![\p{L}\p{N}_])лан(?![\p{L}\p{N}_])/giu, "ладно"],
    [/(?<![\p{L}\p{N}_])пон(?![\p{L}\p{N}_])/giu, "понятно"],
    [/(?<![\p{L}\p{N}_])(?:похуй|пох)(?![\p{L}\p{N}_])/giu, "мне всё равно"],
    [/(?<![\p{L}\p{N}_])реал(?![\p{L}\p{N}_])/giu, "реально"],
    [/(?<![\p{L}\p{N}_])рофл(?![\p{L}\p{N}_])/giu, "шутка"],
    [/(?<![\p{L}\p{N}_])жесть(?![\p{L}\p{N}_])/giu, "это безумие"],
    [/(?<![\p{L}\p{N}_])капец(?![\p{L}\p{N}_])/giu, "это ужас"],
    [/(?<![\p{L}\p{N}_])го(?![\p{L}\p{N}_])/giu, "давай"],
    [/(?<![\p{L}\p{N}_])походу(?![\p{L}\p{N}_])/giu, "похоже"],
    [/(?<![\p{L}\p{N}_])крч(?![\p{L}\p{N}_])/giu, "короче"],
    [/(?<![\p{L}\p{N}_])норм(?![\p{L}\p{N}_])/giu, "нормально"],
    [/(?<![\p{L}\p{N}_])ваще(?![\p{L}\p{N}_])/giu, "вообще"],
    [/(?<![\p{L}\p{N}_])ч[её](?![\p{L}\p{N}_])/giu, "что"],
    [/(?<![\p{L}\p{N}_])ток(?![\p{L}\p{N}_])/giu, "только"],
    [/(?<![\p{L}\p{N}_])ясн(?![\p{L}\p{N}_])/giu, "ясно"],
    [/(?<![\p{L}\p{N}_])ржу(?![\p{L}\p{N}_])/giu, "смеюсь"],
    [/(?<![\p{L}\p{N}_])чел(?![\p{L}\p{N}_])/giu, "парень"],
    [/(?<![\p{L}\p{N}_])имба(?![\p{L}\p{N}_])/giu, "слишком сильное"],
    [/(?<![\p{L}\p{N}_])афк(?![\p{L}\p{N}_])/giu, "AFK"],
    [/(?<![\p{L}\p{N}_])жиза(?![\p{L}\p{N}_])/giu, "очень знакомо"],
];

function sourceHints(input: string): SourceHints {
    const lower = input.toLocaleLowerCase();
    const tokens = new Set<string>();

    for (const token of SOURCE_CHAT_TOKENS) {
        const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`, "iu").test(lower)) {
            tokens.add(token);
        }
    }

    return {
        tokens,
        confusionInterjection: /^\s*(?:ч[её]|что|а|эм|мм)\s*[?!]+\s*$/iu.test(input),
        laughter: /(?:ахах|хаха|хех|лол|lmao|lol|😂|🤣)/iu.test(input),
        profanity: /(?:бля|блять|пизда|пиздец|похуй|нахуй|еб|ёб|fuck|shit|wtf)/iu.test(input),
    };
}

function applyRules(input: string, rules: Rule[]): string {
    let output = input;
    for (const [pattern, replacement] of rules) output = output.replace(pattern, replacement);
    return output;
}

function normalizeSourceChat(input: string): string {
    return applyRules(input, SOURCE_NORMALIZATION_RULES);
}

function normalizeAmbiguousProfanity(input: string): string {
    return input
        .replace(/(?<![\p{L}\p{N}_])(нам|мне|тебе|ему|ей|им)\s+пизда(?![\p{L}\p{N}_])/giu, "$1 конец")
        .replace(/(?<![\p{L}\p{N}_])пизда(?![\p{L}\p{N}_])/giu, "чёрт");
}

function captureStyle(input: string, hints: SourceHints): TranslationStyle {
    const letters = input.match(/[\p{L}]/gu)?.join("") ?? "";
    const firstLetter = input.match(/[\p{L}]/u)?.[0] ?? "";

    let sourceSlangScore = hints.tokens.size * 2;
    if (hints.profanity) sourceSlangScore += 2;
    if (hints.laughter) sourceSlangScore += 1;
    if (letters && letters === letters.toLocaleLowerCase()) sourceSlangScore += 1;
    if (!/[.!?！？]/u.test(input)) sourceSlangScore += 1;
    if (/[!?！？]{3,}\s*$/u.test(input)) sourceSlangScore += 1;

    return {
        noCommas: !/[,;:，；：]/u.test(input),
        noSentencePunctuation: !/[.!?！？。]/u.test(input),
        allLowercase: letters.length > 0 && letters === letters.toLocaleLowerCase(),
        allUppercase: letters.length > 0 && letters === letters.toLocaleUpperCase() && letters !== letters.toLocaleLowerCase(),
        startsLowercase: !!firstLetter && firstLetter === firstLetter.toLocaleLowerCase(),
        endingMarks: input.match(/[!?！？]+\s*$/u)?.[0]?.trim() ?? "",
        endingEllipsis: input.match(/(?:\.{2,}|…+)\s*$/u)?.[0]?.trim() ?? "",
        sourceSlangScore,
        sourceHadApostrophe: /['’]/u.test(input),
    };
}

function levelForMode(mode: ChatStyle, style: TranslationStyle): StyleLevel {
    if (mode === "clean") return 0;
    if (mode === "casual") return 1;
    if (mode === "slang") return 2;
    if (mode === "heavy") return 3;

    // Mirror never forces the most aggressive abbreviations by itself.
    // Heavy is opt-in; Mirror mainly mirrors how casual/slangy the source already is.
    if (style.sourceSlangScore >= 3) return 2;
    return 1;
}

function languageBase(language: string): string {
    const normalized = language.toLocaleLowerCase();
    if (normalized.startsWith("zh")) return normalized.includes("tw") ? "zh-tw" : "zh-cn";
    return normalized.split("-")[0];
}

const EN_NATURAL_CHAT: Rule[] = [
    // Fix literal/machine-like chat phrasing before abbreviations are applied.
    // These only run in non-Clean outgoing styles.
    [/\b(?:the\s+)?chat\s+(?:has\s+)?died\b/gi, "chat dead"],
    [/\b(?:the\s+)?chat\s+is\s+dead\b/gi, "chat dead"],
    [/\bis\s+(?:the\s+)?chat\s+dead\b/gi, "chat dead"],
    [/\bdead\s+chat\s+here\b/gi, "dead chat"],
    [/\b(?:the\s+)?server\s+(?:has\s+)?died\b/gi, "server dead"],
    [/\b(?:the\s+)?server\s+is\s+dead\b/gi, "server dead"],
    [/\bis\s+(?:the\s+)?server\s+dead\b/gi, "server dead"],
    [/\b(?:the\s+)?game\s+(?:has\s+)?died\b/gi, "game dead"],
    [/\b(?:the\s+)?game\s+is\s+dead\b/gi, "game dead"],
    [/\bdiscord\s+(?:has\s+)?died\b/gi, "discord dead"],
    [/\bdiscord\s+is\s+dead\b/gi, "discord dead"],
    [/\bwhere\s+is\s+(?:everyone|everybody)\b/gi, "wheres everyone"],
    [/\bis\s+(?:anyone|anybody)\s+here\b/gi, "anyone here"],
    [/\b(?:everyone|everybody)\s+(?:is\s+dead|died)\b/gi, "everyone dead"],
    [/\bis\s+(?:everyone|everybody)\s+dead\b/gi, "everyone dead"],
    [/\bno\s+one\s+is\s+here\b/gi, "no ones here"],
    [/^well,\s+/i, ""],
];

const EN_CASUAL: Rule[] = [
    [/\bI am\b/gi, "I'm"],
    [/\bI have\b/gi, "I've"],
    [/\bI will\b/gi, "I'll"],
    [/\bI would\b/gi, "I'd"],
    [/\byou are\b/gi, "you're"],
    [/\bwe are\b/gi, "we're"],
    [/\bthey are\b/gi, "they're"],
    [/\bit is\b/gi, "it's"],
    [/\bthat is\b/gi, "that's"],
    [/\bdo not\b/gi, "don't"],
    [/\bdoes not\b/gi, "doesn't"],
    [/\bdid not\b/gi, "didn't"],
    [/\bcannot\b|\bcan not\b/gi, "can't"],
    [/\bwill not\b/gi, "won't"],
    [/\bis not\b/gi, "isn't"],
    [/\bare not\b/gi, "aren't"],
    [/\blet us\b/gi, "let's"],
    [/\bbecause\b/gi, "bc"],
];

const EN_SLANG: Rule[] = [
    // Whole phrases first, so later one-word shortening does not break them.
    [/\bwhat do you mean\b/gi, "wdym"],
    [/\bwhat are you doing\b/gi, "wyd"],
    [/\blet me know\b/gi, "lmk"],
    [/\bI (?:do not|don't) know\b/gi, "idk"],
    [/\bI (?:do not|don't) care\b/gi, "idc"],
    [/\bby the way\b/gi, "btw"],
    [/\bto be honest\b/gi, "tbh"],
    [/\bnot gonna lie\b/gi, "ngl"],
    [/\bfor real\b/gi, "fr"],
    [/\bfor sure\b/gi, "fs"],
    [/\bof course\b/gi, "ofc"],
    [/\bno clue\b/gi, "idk"],
    [/\bI can['’]t lie\b/gi, "icl"],
    [/\bif you know you know\b/gi, "iykyk"],
    [/\bright now\b/gi, "rn"],
    [/\bno problem\b/gi, "np"],
    [/\bnever mind\b/gi, "nvm"],
    [/\bas soon as possible\b/gi, "asap"],
    [/\bbe right back\b/gi, "brb"],
    [/\bgot to go\b|\bgotta go\b/gi, "gtg"],
    [/\bgood night\b/gi, "gn"],
    [/\bgood morning\b/gi, "gm"],
    [/\bsee you\b/gi, "cya"],
    [/\bI love you\b/gi, "ily"],
    [/\bI miss you\b/gi, "imy"],
    [/\boh my god\b/gi, "omg"],
    [/\bwhere are you\b/gi, "wya"],
    [/\bwhat['’]s up\b|\bwhat is up\b/gi, "wsp"],
    [/\bare you serious\b/gi, "u serious"],
    [/\bplease\b/gi, "pls"],
    [/\bthank you\b|\bthanks\b/gi, "thx"],
    [/\ball right\b|\balright\b/gi, "alr"],
    [/\byou['’]re\b/gi, "ur"],
    [/\byour\b/gi, "ur"],
    [/\byou\b/gi, "u"],
    [/\bbc\b/g, "bcs"],
    [/\bthough\b/gi, "tho"],
    [/\breally\b/gi, "rlly"],
    [/\bmessage\b/gi, "msg"],
];

const EN_HEAVY: Rule[] = [
    // Very compressed spellings are opt-in. The dataset marks these as recognize-only by default,
    // but Heavy explicitly opts into the user's preferred chat style.
    [/\band\b/gi, "nd"],
    [/\bare\b/gi, "ar"],
    [/\bbcs\b/g, "cuz"],
    [/\bwhat the fuck\b/gi, "wtf"],
    [/\bwhat the hell\b/gi, "wth"],
    [/\bI (?:do not|don't) give a fuck\b/gi, "idgaf"],
    [/\bmaybe\b/gi, "mb"],
    [/\bgoing to\b/gi, "gonna"],
    [/\bwant to\b/gi, "wanna"],
    [/\bgot to\b/gi, "gotta"],
    [/\bprobably\b/gi, "prolly"],
    [/\bpeople\b/gi, "ppl"],
    [/\bsomething\b/gi, "smth"],
    [/\bsomeone\b/gi, "sm1"],
    [/\bsorry\b/gi, "sry"],
    [/\bjust\b/gi, "js"],
    [/\btomorrow\b/gi, "tmr"],
    [/\btonight\b/gi, "tn"],
    [/\bwith\b/gi, "w/"],
    [/\bwithout\b/gi, "w/o"],
    [/\bbefore\b/gi, "b4"],
    [/\bokay\b|\bokey\b/gi, "ok"],
];

const DE_SLANG: Rule[] = [
    [/\bich weiß nicht\b|\bich weiss nicht\b|\bkeine ahnung\b/gi, "kp"],
    [/\bvielleicht\b/gi, "vllt"],
    [/\bjetzt\b/gi, "jz"],
    [/(?<![\p{L}\p{N}_])übrigens(?![\p{L}\p{N}_])/giu, "btw"],
    [/\bdanke\b/gi, "thx"],
    [/\bbitte\b/gi, "pls"],
];

const DE_HEAVY: Rule[] = [
    [/\bauf jeden fall\b/gi, "safe"],
    [/\bbruder\b/gi, "bro"],
];

const ES_SLANG: Rule[] = [
    [/\bpor favor\b/gi, "xfa"],
    [/(?<![\p{L}\p{N}_])(?:por\s+qu[eé]|porque)(?![\p{L}\p{N}_])/giu, "xq"],
    [/\btambi[eé]n\b/gi, "tmb"],
    [/(?<![\p{L}\p{N}_])no\s+s[eé](?![\p{L}\p{N}_])/giu, "ns"],
    [/\bgracias\b/gi, "grax"],
    [/\bme da igual\b/gi, "mdi"],
    [/\bno te preocupes\b/gi, "ntp"],
    [/\bte quiero mucho\b/gi, "tqm"],
];

const ES_HEAVY: Rule[] = [
    [/\bque\b/gi, "q"],
    [/\bbien\b/gi, "bn"],
];

const FR_SLANG: Rule[] = [
    [/\bje ne sais pas\b|\bje sais pas\b/gi, "jsp"],
    [/\bs['’]il te pla[iî]t\b/gi, "stp"],
    [/\bs['’]il vous pla[iî]t\b/gi, "svp"],
    [/\bmerci\b/gi, "mrc"],
    [/\bbeaucoup\b/gi, "bcp"],
    [/\bpourquoi\b/gi, "pk"],
    [/\btout de suite\b/gi, "tds"],
    [/\bsalut\b/gi, "slt"],
    [/\brendez-vous\b/gi, "rdv"],
    [/\btoujours\b/gi, "tjs"],
    [/\bne t['’]inqui[eè]te pas\b|\bt['’]inqui[eè]te\b/gi, "tkt"],
];

const PT_SLANG: Rule[] = [
    [/(?<![\p{L}\p{N}_])voc[eê](?![\p{L}\p{N}_])/giu, "vc"],
    [/\bpor que\b|\bporque\b/gi, "pq"],
    [/\btamb[eé]m\b/gi, "tbm"],
    [/\bobrigad[oa]\b/gi, "obg"],
    [/\bvaleu\b/gi, "vlw"],
    [/\bpor favor\b/gi, "pfv"],
    [/\bbeleza\b/gi, "blz"],
    [/\bverdade\b/gi, "vdd"],
    [/\bmuito\b/gi, "mto"],
    [/\bhoje\b/gi, "hj"],
    [/\bningu[eé]m\b/gi, "ngm"],
    [/\bcomigo\b/gi, "cmg"],
];

const PT_HEAVY: Rule[] = [
    [/\btudo\b/gi, "td"],
    [/\bn[aã]o\b/gi, "n"],
    [/\bsim\b/gi, "s"],
];

const PL_SLANG: Rule[] = [
    [/\bnie wiem\b/gi, "nwm"],
    [/\bw og[oó]le\b/gi, "wgl"],
    [/\bprosz[eę]\b/gi, "pls"],
    [/\bdzi[eę]ki\b/gi, "thx"],
];

const RU_SLANG: Rule[] = [
    [/(?<![\p{L}\p{N}_])(?:я\s+не\s+знаю|не\s+знаю)(?![\p{L}\p{N}_])/giu, "хз"],
    [/(?<![\p{L}\p{N}_])может\s+быть(?![\p{L}\p{N}_])/giu, "мб"],
    [/(?<![\p{L}\p{N}_])кстати(?![\p{L}\p{N}_])/giu, "кста"],
    [/(?<![\p{L}\p{N}_])спасибо(?![\p{L}\p{N}_])/giu, "спс"],
    [/(?<![\p{L}\p{N}_])пожалуйста(?![\p{L}\p{N}_])/giu, "пж"],
    [/(?<![\p{L}\p{N}_])сейчас(?![\p{L}\p{N}_])/giu, "щас"],
    [/(?<![\p{L}\p{N}_])ладно(?![\p{L}\p{N}_])/giu, "лан"],
    [/(?<![\p{L}\p{N}_])понятно(?![\p{L}\p{N}_])/giu, "пон"],
    [/(?<![\p{L}\p{N}_])короче(?![\p{L}\p{N}_])/giu, "крч"],
    [/(?<![\p{L}\p{N}_])вообще(?![\p{L}\p{N}_])/giu, "ваще"],
];

const RU_HEAVY: Rule[] = [
    [/(?<![\p{L}\p{N}_])мне\s+вс[её]\s+равно(?![\p{L}\p{N}_])/giu, "мне пох"],
];

const UK_SLANG: Rule[] = [
    [/(?<![\p{L}\p{N}_])(?:я\s+не\s+знаю|не\s+знаю)(?![\p{L}\p{N}_])/giu, "хз"],
    [/(?<![\p{L}\p{N}_])можливо(?![\p{L}\p{N}_])/giu, "мб"],
    [/(?<![\p{L}\p{N}_])до\s+речі(?![\p{L}\p{N}_])/giu, "кста"],
    [/(?<![\p{L}\p{N}_])будь\s+ласка(?![\p{L}\p{N}_])/giu, "пж"],
    [/(?<![\p{L}\p{N}_])зараз(?![\p{L}\p{N}_])/giu, "щас"],
];

const ZH_CN_SLANG: Rule[] = [
    [/笑死我了/g, "xswl"],
    [/哈哈哈哈+/g, "hhhh"],
    [/哈哈哈/g, "hhh"],
    [/有一说一|说实话|老实说/g, "u1s1"],
    [/你说得对|你说的对/g, "nsdd"],
    [/虽然但是/g, "srds"],
    [/不懂就问/g, "bdjw"],
    [/懂的都懂/g, "dddd"],
    [/不知道/g, "bzd"],
    [/对不起/g, "dbq"],
    [/不好意思/g, "bhys"],
    [/搞快点|快点儿|快点/g, "gkd"],
    [/太强了|太厉害了/g, "tql"],
    [/拜拜|再见/g, "88"],
    [/呜呜呜+|呜呜+/g, "555"],
];

const ZH_CN_HEAVY: Rule[] = [
    [/当然可以|没问题/g, "包的"],
    [/这合理吗|这合理么/g, "这河里吗"],
    [/太离谱了|太荒谬了/g, "抽象"],
    [/NPC|机器人/gi, "人机"],
    [/永远的神/g, "yyds"],
    [/啊我死了/g, "awsl"],
    [/气死我了/g, "qswl"],
    [/磕死我了/g, "kswl"],
    [/真情实感/g, "zqsg"],
    [/牛逼|牛掰/g, "nb"],
    [/卧槽|我操/g, "wc"],
    [/他妈的/g, "tmd"],
    [/傻逼/g, "sb"],
    [/漂亮妹妹/g, "plmm"],
    [/朋友圈/g, "pyq"],
    [/是真的/g, "szd"],
    [/神经病/g, "sjb"],
    [/生日快乐/g, "sk"],
    [/谢谢/g, "3q"],
    [/我爱你/g, "520"],
    [/一生一世/g, "1314"],
];

const ZH_TW_SLANG: Rule[] = [
    [/是不是/g, "484"],
    [/就是/g, "94"],
    [/哈哈哈哈+|哈哈哈/g, "ㄏㄏ"],
    [/謝謝|谢谢/g, "3Q"],
    [/再見|拜拜/g, "掰掰"],
];

const ZH_TW_HEAVY: Rule[] = [
    [/不行|不要這樣|不要这样/g, "母湯"],
    [/對不起|不好意思|对不起/g, "拍謝"],
    [/白痴/g, "87"],
    [/生氣|生气/g, "森77"],
];

const JA_SLANG: Rule[] = [
    [/ありがとうございます/g, "ありがと"],
    [/わかりました|分かりました|了解しました|了解/g, "りょ"],
    [/もちろん/g, "もち"],
];

const KO_SLANG: Rule[] = [
    [/알겠습니다|알겠어|오케이/g, "ㅇㅋ"],
    [/미안합니다|미안해|미안/g, "ㅈㅅ"],
    [/감사합니다|고마워요|고마워/g, "ㄱㅅ"],
    [/(?<![\p{L}\p{N}_])네(?![\p{L}\p{N}_])/gu, "ㅇㅇ"],
];

function applyTargetLanguagePack(
    input: string,
    targetLanguage: string,
    level: StyleLevel,
    hints: SourceHints,
    original: string,
): string {
    if (level === 0 || !settings.store.targetSlangPacks) return input;

    const lang = languageBase(targetLanguage);
    let output = input;

    switch (lang) {
        case "en":
            // First make Google-style literal phrasing sound like a real chat message.
            output = applyRules(output, EN_NATURAL_CHAT);
            output = applyRules(output, EN_CASUAL);
            if (level >= 2) output = applyRules(output, EN_SLANG);
            if (level >= 3) output = applyRules(output, EN_HEAVY);

            // Source-aware fixes: preserve intent without injecting English tokens before translation.
            if (level >= 2 && hints.tokens.has("имба")) output = output.replace(/\b(?:overpowered|too strong|very strong)\b/gi, "op");
            if (level >= 2 && hints.tokens.has("бро")) output = output.replace(/\b(?:brother|friend)\b/gi, "bro");
            if (level >= 2 && hints.tokens.has("чел")) output = output.replace(/\b(?:guy|person)\b/gi, "dude");
            if (level >= 2 && (hints.tokens.has("щас") || hints.tokens.has("ща"))) output = output.replace(/\b(?:right now|now)\b/gi, "rn");
            if (level >= 2 && hints.tokens.has("кста")) output = output.replace(/\bby the way\b/gi, "btw");
            if (level >= 2 && hints.tokens.has("спс")) output = output.replace(/\b(?:thank you|thanks)\b/gi, "thx");
            if (level >= 2 && ["пж", "пжлст", "плиз"].some(t => hints.tokens.has(t))) output = output.replace(/\bplease\b/gi, "pls");
            if (level >= 2 && hints.tokens.has("сорян")) output = output.replace(/\bsorry\b/gi, "sry");

            // Russian gaming/chat intent that Google often translates too literally.
            if (/^\s*чат\s+(?:умер|м[eё]ртв)(?:\s+гг)?\s*[.!?！？]*\s*$/iu.test(original)) {
                output = /(?:^|\s)гг(?:\s|$|[.!?！？])/iu.test(original) ? "chat dead gg" : "chat dead";
            } else if (/^\s*(?:где\s+все|все\s+где)\s*[.!?！？]*\s*$/iu.test(original)) {
                output = "wheres everyone";
            } else if (/^\s*(?:кто\s+тут|есть\s+кто|кто-нибудь\s+тут)\s*[.!?！？]*\s*$/iu.test(original)) {
                output = "anyone here";
            } else if (/^\s*(?:все\s+умерли|все\s+м[eё]ртвые)\s*[.!?！？]*\s*$/iu.test(original)) {
                output = "everyone dead";
            } else if (/^\s*(?:сервер|сервак)\s+(?:умер|л[eё]г|м[eё]ртв)\s*[.!?！？]*\s*$/iu.test(original)) {
                output = "server dead";
            } else if (/^\s*(?:дс|дискорд)\s+(?:умер|л[eё]г|м[eё]ртв)\s*[.!?！？]*\s*$/iu.test(original)) {
                output = "discord dead";
            } else if (/^\s*(?:игра|плейс)\s+(?:умерла|умер|м[eё]ртвая|м[eё]ртв)\s*[.!?！？]*\s*$/iu.test(original)) {
                output = "game dead";
            }

            // "го" is an invitation, not an imperative. Keep gaming invitations natural.
            if (hints.tokens.has("го")) {
                const later = /(?<![\p{L}\p{N}_])потом(?![\p{L}\p{N}_])/iu.test(original);
                const game = /(?<![\p{L}\p{N}_])(?:роблокс|roblox)(?![\p{L}\p{N}_])/iu.test(original) ? "roblox"
                    : /(?<![\p{L}\p{N}_])(?:майн|майнкрафт|minecraft)(?![\p{L}\p{N}_])/iu.test(original) ? "minecraft"
                        : /(?<![\p{L}\p{N}_])(?:кс2?|cs2?|counter[- ]?strike)(?![\p{L}\p{N}_])/iu.test(original) ? "cs2"
                            : /(?<![\p{L}\p{N}_])(?:валик|valorant)(?![\p{L}\p{N}_])/iu.test(original) ? "valorant"
                                : /(?<![\p{L}\p{N}_])(?:фортнайт|fortnite)(?![\p{L}\p{N}_])/iu.test(original) ? "fortnite"
                                    : null;

                if (game) {
                    // Keep any translated condition after the game name (e.g. "if ur free").
                    const condition = output.match(/\b(?:if|when)\b[\s\S]*$/i)?.[0];
                    output = `lets play ${game}${later ? " later" : ""}${condition ? ` ${condition}` : ""}`;
                }
            }

            if (settings.store.softenAmbiguousProfanity && hints.tokens.has("пизда")) {
                const isolated = /^\s*пизда\s*[.!?！？]*\s*$/iu.test(original);
                const doomed = /(?:^|\s)(?:нам|мне|тебе|ему|ей|им)\s+пизда(?:\s|$|[.!?！？])/iu.test(original);

                if (isolated) output = "damn";
                else if (doomed) {
                    const ruSubject = original.match(/(?:^|\s)(нам|мне|тебе|ему|ей|им)\s+пизда/iu)?.[1]?.toLocaleLowerCase();
                    const cooked: Record<string, string> = {
                        нам: "we're cooked",
                        мне: "I'm cooked",
                        тебе: "you're cooked",
                        ему: "he's cooked",
                        ей: "she's cooked",
                        им: "they're cooked",
                    };
                    if (ruSubject) output = cooked[ruSubject] ?? output;
                }

                // Never let ambiguous chat usage fall through to a literal sexual noun by accident.
                output = output.replace(/\bpussy\b/gi, "damn");
            }
            break;

        case "de":
            if (level >= 2) output = applyRules(output, DE_SLANG);
            if (level >= 3) output = applyRules(output, DE_HEAVY);
            if (level >= 2 && hints.tokens.has("бро")) output = output.replace(/\b(?:Bruder|Freund)\b/gi, "bro");
            if (hints.confusionInterjection || /^\s*(?:wie bitte|was)\s*[?!]*\s*$/iu.test(output)) {
                const marks = original.match(/[!?]+\s*$/u)?.[0]?.trim() || "?";
                output = `hä${marks}`;
            }
            break;

        case "es":
            if (level >= 2) output = applyRules(output, ES_SLANG);
            if (level >= 3) output = applyRules(output, ES_HEAVY);
            break;

        case "fr":
            if (level >= 2) output = applyRules(output, FR_SLANG);
            break;

        case "pt":
            if (level >= 2) output = applyRules(output, PT_SLANG);
            if (level >= 3) output = applyRules(output, PT_HEAVY);
            break;

        case "pl":
            if (level >= 2) output = applyRules(output, PL_SLANG);
            break;

        case "ru":
            if (level >= 2) output = applyRules(output, RU_SLANG);
            if (level >= 3) output = applyRules(output, RU_HEAVY);
            break;

        case "uk":
            if (level >= 2) output = applyRules(output, UK_SLANG);
            break;

        case "zh-cn":
            if (level >= 2) output = applyRules(output, ZH_CN_SLANG);
            if (level >= 3) output = applyRules(output, ZH_CN_HEAVY);

            // Source-aware chat reactions: prefer natural Mainland internet forms over textbook wording.
            if (hints.laughter) output = output.replace(/(?:哈哈哈哈+|哈哈哈|笑死我了)/g, level >= 3 ? "xswl" : "hhh");
            if (level >= 2 && hints.tokens.has("имба")) output = output.replace(/(?:太厉害了|太强了|很厉害|厉害)/g, "666");
            break;

        case "zh-tw":
            if (level >= 2) output = applyRules(output, ZH_TW_SLANG);
            if (level >= 3) output = applyRules(output, ZH_TW_HEAVY);
            if (hints.confusionInterjection) {
                const marks = original.match(/[!?！？]+\s*$/u)?.[0]?.trim() || "？";
                output = `是在哈囉${marks}`;
            }
            break;

        case "ja":
            if (level >= 2) output = applyRules(output, JA_SLANG);
            if (hints.laughter && level >= 3) output = output.replace(/[（(]?笑+[）)]?/g, "w");
            break;

        case "ko":
            if (level >= 2) output = applyRules(output, KO_SLANG);
            if (hints.laughter) output = output.replace(/(?:하하하+|ㅎㅎㅎ+)/g, level >= 3 ? "ㅋㅋㅋ" : "ㅋㅋ");
            break;
    }

    // Apply the researched dataset after the hand-tuned rules. This fills gaps across all
    // supported language packs while respecting current/outdated and can_generate gates.
    output = applyDatasetGeneratedSlang(output, targetLanguage, level);

    return output;
}

function stripEnglishChatApostrophes(input: string): string {
    return input.replace(/([A-Za-z])['’]([A-Za-z])/g, "$1$2");
}

function restoreStyle(
    input: string,
    style: TranslationStyle,
    targetLanguage: string,
    mode: ChatStyle,
    level: StyleLevel,
): string {
    let output = input.trim();

    if (settings.store.preserveStyle && mode !== "clean") {
        if (style.noCommas) {
            output = output.replace(/[,;:，；：]/g, "");
            output = output.replace(/[ \t]{2,}/g, " ");
        }

        if (style.noSentencePunctuation) {
            output = output.replace(/[.!?！？。]+\s*$/g, "");
        }

        if (style.endingEllipsis) {
            output = output.replace(/(?:\.{2,}|…+)\s*$/u, "").trimEnd() + style.endingEllipsis;
        } else if (style.endingMarks) {
            output = output.replace(/[!?！？]+\s*$/u, "").trimEnd() + style.endingMarks;
        }

        // Chatting in Spanish frequently omits opening ¿ / ¡. Mirror the source instead of adding them.
        if (!/^[¿¡]/u.test(style.endingMarks) && languageBase(targetLanguage) === "es") {
            output = output.replace(/^[¿¡]+/u, "");
        }

        if (style.allUppercase) output = output.toLocaleUpperCase();
        else if (style.allLowercase || style.startsLowercase) output = output.toLocaleLowerCase();
    }

    if (
        languageBase(targetLanguage) === "en" &&
        settings.store.dropEnglishApostrophes &&
        level >= 1 &&
        (mode !== "mirror" || style.allLowercase || style.startsLowercase || style.sourceSlangScore >= 2)
    ) {
        output = stripEnglishChatApostrophes(output);
    }

    return output.trim();
}

function hasTranslatableText(text: string) {
    return canTranslate(slangDataset, text);
}

async function translateStyled(kind: "received" | "sent", input: string, context?: TranslationContext): Promise<string | null> {
    if (!input.trim() || !hasTranslatableText(input)) return null;

    syncCoreTranslateSettings();
    const targetLanguage = kind === "sent" ? settings.store.outgoingTarget : settings.store.incomingTarget;
    const mode = (kind === "sent" ? settings.store.chatStyle : settings.store.incomingStyle) as ChatStyle;
    const prepared = translationEngine.prepare(input, {
        kind,
        targetLanguage,
        mode,
        preserveStyle: settings.store.preserveStyle,
        smartSourceSlang: settings.store.smartSourceSlang,
        targetSlangPacks: settings.store.targetSlangPacks,
        protectNames: settings.store.protectNames,
        preserveMixedEnglish: settings.store.preserveMixedEnglish,
        customProtectedNames: settings.store.customProtectedNames,
        dropEnglishApostrophes: settings.store.dropEnglishApostrophes,
        softenAmbiguousProfanity: settings.store.softenAmbiguousProfanity,
        context,
    });

    // Exact reactions, dataset phrases, profanity meanings and gaming terms already have a
    // target-language result. Avoid the latency and privacy cost of an unnecessary Google call.
    const finalized = (await runPreparedTranslation(translationEngine, prepared, async (text, sourceLanguage) => {
        const translated = await withTranslationLimit(() => {
            const inputKey = kind === "sent" ? "sentInput" : "receivedInput";
            const previous = coreTranslateSettings.store[inputKey];
            const sourceCode = googleSourceCode(sourceLanguage);
            coreTranslateSettings.store[inputKey] = sourceCode && sourceCode in GoogleLanguages
                ? sourceCode as keyof typeof GoogleLanguages : "auto";
            try {
                // coreTranslate reads settings synchronously before starting its request.
                return coreTranslate(kind, text);
            } finally {
                coreTranslateSettings.store[inputKey] = previous;
            }
        });
        return translated.text;
    })).trim();
    // Fail open: an empty/malformed provider result must never hide Discord's original body.
    return finalized || null;
}

function participantFor(user: Message["author"] | undefined, channelId: string, evidence: TranslationParticipant["evidence"]): TranslationParticipant | null {
    if (!user?.id) return null;
    const channel = ChannelStore.getChannel(channelId);
    const guildId = channel?.guild_id;
    const member = guildId ? GuildMemberStore.getMember(guildId, user.id) : undefined;
    const key = `${guildId ?? "dm"}:${user.id}:${member?.nick ?? ""}:${user.globalName ?? ""}:${user.username}`;
    const cached = participantNameCache.get(key);
    if (cached) return { ...cached, evidence };
    const participant: TranslationParticipant = {
        id: user.id,
        username: user.username,
        displayName: user.globalName || member?.nick || user.username,
        nickname: member?.nick || undefined,
        evidence,
    };
    participantNameCache.set(key, participant);
    if (participantNameCache.size > MAX_PARTICIPANT_CACHE) {
        const oldest = participantNameCache.keys().next().value;
        if (oldest) participantNameCache.delete(oldest);
    }
    return participant;
}

function lexicalContextOverlap(current: string, previous: string): number {
    const meaningful = (value: string) => new Set(
        (value.toLocaleLowerCase().match(/[\p{L}\p{N}_'-]{3,}/gu) ?? [])
            .filter(token => !["this", "that", "what", "with", "have", "your", "youre", "there", "just"].includes(token)),
    );
    const currentTokens = meaningful(current);
    const previousTokens = meaningful(previous);
    return [...currentTokens].some(token => previousTokens.has(token)) ? 1 : 0;
}

function conversationContext(
    channelId: string,
    reference?: Message["messageReference"],
    currentMessageId?: string,
    currentContent = "",
    currentAuthorId?: string,
    currentMentions: Message["mentions"] = [],
): TranslationContext | undefined {
    const replied = reference?.message_id
        ? MessageStore.getMessage(reference.channel_id || channelId, reference.message_id)
        : undefined;
    const collection = MessageStore.getMessages(channelId)?._array as Message[] | undefined;
    const currentIndex = currentMessageId ? collection?.findIndex(candidate => candidate.id === currentMessageId) ?? -1 : -1;
    const prior = currentIndex >= 0 ? collection!.slice(0, currentIndex) : collection ?? [];
    const candidates = prior.filter(candidate => candidate.id !== replied?.id && !!candidate.content?.trim()).slice(-12);
    const previousTurns: ContextTurn[] = candidates.map((candidate, index) => {
        const distance = candidates.length - index;
        const mentionedIds = candidate.mentions ?? [];
        let relevance = distance === 1 ? 3 : distance === 2 ? 2 : 1;
        if (candidate.author?.id === currentAuthorId) relevance += 2;
        if (currentAuthorId && mentionedIds.includes(currentAuthorId)) relevance += 2;
        if (candidate.author?.id === replied?.author?.id) relevance += 2;
        relevance += lexicalContextOverlap(currentContent, candidate.content);
        return {
            content: candidate.content.slice(0, 500),
            authorId: candidate.author?.id,
            replyToAuthorId: candidate.messageReference?.message_id
                ? MessageStore.getMessage(candidate.messageReference.channel_id || channelId, candidate.messageReference.message_id)?.author?.id
                : undefined,
            mentionedUserIds: mentionedIds,
            relevance,
        };
    }).sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0)).slice(0, 4);
    const previousMessages = previousTurns.map(turn => turn.content);
    const participants = new Map<string, TranslationParticipant>();
    const addParticipant = (participant: TranslationParticipant | null) => {
        if (participant?.id) participants.set(participant.id, participant);
    };
    addParticipant(participantFor(replied?.author, channelId, "reply"));
    for (const mentionId of currentMentions ?? []) addParticipant(participantFor(UserStore.getUser(mentionId), channelId, "mention"));
    for (const candidate of candidates.slice(-8)) addParticipant(participantFor(candidate.author, channelId, "recent_author"));
    addParticipant(participantFor(currentAuthorId ? UserStore.getUser(currentAuthorId) : undefined, channelId, "current_author"));
    const context: TranslationContext = {
        replyMessage: replied?.content?.slice(0, 500),
        previousMessages,
        previousTurns,
        currentAuthorId,
        replyAuthorId: replied?.author?.id,
        mentionedUserIds: currentMentions ?? [],
        participants: [...participants.values()].slice(0, 16),
    };
    return context.replyMessage || context.previousMessages?.length || context.participants?.length ? context : undefined;
}

function getIncomingCacheKey(message: Message, context?: TranslationContext) {
    return [
        message.id,
        message.content,
        settings.store.incomingTarget,
        settings.store.incomingStyle,
        settings.store.preserveStyle ? "style" : "plain",
        settings.store.smartSourceSlang ? "slang-recognition" : "literal-source",
        settings.store.targetSlangPacks ? "target-slang" : "no-target-slang",
        settings.store.protectNames ? "protect-names" : "translate-names",
        settings.store.preserveMixedEnglish ? "keep-mixed-english" : "translate-mixed-english",
        settings.store.customProtectedNames,
        settings.store.dropEnglishApostrophes ? "drop-apostrophes" : "keep-apostrophes",
        slangDataset.version,
        context?.replyMessage ?? "no-reply-context",
        context?.previousMessages?.join("\u241e") ?? "no-local-context",
        context?.participants?.map(participant =>
            `${participant.id ?? "?"}:${participant.displayName ?? participant.nickname ?? participant.username ?? ""}`,
        ).join("\u241f") ?? "no-participants",
    ].join("|");
}

function cachedIncomingTranslation(message: Message): Promise<string | null> {
    const context = conversationContext(
        message.channel_id,
        message.messageReference,
        message.id,
        message.content,
        message.author?.id,
        message.mentions,
    );
    const key = getIncomingCacheKey(message, context);
    const cached = incomingCache.get(key);
    if (cached) return cached;

    const promise = translateStyled("received", message.content, context).catch(() => {
        // Do not make a transient provider failure sticky for the lifetime of the cache.
        incomingCache.delete(key);
        return null;
    });

    incomingCache.set(key, promise);
    if (incomingCache.size > MAX_CACHE) {
        const oldest = incomingCache.keys().next().value;
        if (oldest) incomingCache.delete(oldest);
    }
    return promise;
}

function IncomingTranslation({ message }: { message: Message; }) {
    const { t } = useUi();
    const s = settings.use([
        "incomingEnabled",
        "incomingTarget",
        "incomingStyle",
        "replaceIncoming",
        "preserveStyle",
        "smartSourceSlang",
        "targetSlangPacks",
        "protectNames",
        "preserveMixedEnglish",
        "customProtectedNames",
        "dropEnglishApostrophes",
        "showTranslationBadge",
    ]);
    const [translated, setTranslated] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setTranslated(null);

        if (
            !s.incomingEnabled ||
            message.author?.id === UserStore.getCurrentUser()?.id ||
            !message.content?.trim() ||
            !hasTranslatableText(message.content)
        ) {
            return () => { cancelled = true; };
        }

        cachedIncomingTranslation(message).then(result => {
            if (!cancelled) setTranslated(result);
        });

        return () => { cancelled = true; };
    }, [
        message.id,
        message.content,
        message.author?.id,
        s.incomingEnabled,
        s.incomingTarget,
        s.incomingStyle,
        s.preserveStyle,
        s.smartSourceSlang,
        s.targetSlangPacks,
        s.protectNames,
        s.preserveMixedEnglish,
        s.customProtectedNames,
        s.dropEnglishApostrophes,
    ]);

    if (!s.incomingEnabled || !translated?.trim() || translated === message.content) return null;

    const accessoryId = `sony-translator-message-${message.id}`;
    // Scope replacement to this message's own content ID. A broad descendant selector also
    // matches Discord's quoted reply preview, which is why reply text used to disappear.
    const replacementStyle = s.replaceIncoming
        ? `li:has(#${accessoryId}) #message-content-${message.id}{display:none!important}`
        : "";

    return (
        <div id={accessoryId} className="sony-translator-result">
            {replacementStyle && <style>{replacementStyle}</style>}
            <div className={`${MessageContentClasses.messageContent} ${MarkupClasses.markup} sony-translator-text`}>
                {Parser.parse(translated)}
            </div>
            {s.showTranslationBadge && <span className="sony-translator-badge">{t("translated")}</span>}
        </div>
    );
}

const enum ReferencedMessageState {
    Loaded = 0,
}

type ReplyTranslationProps = {
    baseMessage: Message;
    referencedMessage: { state: number; message?: Message; };
};

function ReplyTranslation({ baseMessage, referencedMessage }: ReplyTranslationProps) {
    const s = settings.use(["incomingEnabled", "incomingTarget", "incomingStyle", "preserveStyle", "preserveMixedEnglish"]);
    const [translated, setTranslated] = useState<string | null>(null);
    const referenced = referencedMessage.state === ReferencedMessageState.Loaded ? referencedMessage.message : undefined;

    useEffect(() => {
        let cancelled = false;
        setTranslated(null);
        if (!s.incomingEnabled || !referenced?.content?.trim() || !hasTranslatableText(referenced.content)) {
            return () => { cancelled = true; };
        }
        cachedIncomingTranslation(referenced).then(result => {
            if (!cancelled) setTranslated(result);
        });
        return () => { cancelled = true; };
    }, [
        baseMessage.id,
        referenced?.id,
        referenced?.content,
        s.incomingEnabled,
        s.incomingTarget,
        s.incomingStyle,
        s.preserveStyle,
        s.preserveMixedEnglish,
    ]);

    if (!translated?.trim() || translated === referenced?.content) return null;
    const id = `sony-translator-reply-${baseMessage.id}`;
    const replacementStyle = `.${ReplyClasses.repliedMessage}:has(#${id}) .${ReplyClasses.repliedTextPreview}{display:none!important}`;
    return (
        <span id={id} className="sony-translator-reply-text">
            <style>{replacementStyle}</style>
            {Parser.parse(translated)}
        </span>
    );
}

const languageOptions = (locale: string) => Object.entries(GoogleLanguages)
    .filter(([value]) => value !== "auto")
    .map(([value, label]) => ({ value, label: languageDisplayName(value, locale, label) }));

function LanguageSelect({
    title,
    value,
    onChange,
}: {
    title: string;
    value: string;
    onChange: (value: string) => void;
}) {
    const { locale, t } = useUi();
    const options = useMemo(() => languageOptions(locale), [locale]);

    return (
        <section className={Margins.bottom16}>
            <Forms.FormTitle tag="h3">{title}</Forms.FormTitle>
            <SearchableSelect
                options={options}
                value={value}
                placeholder={t("selectLanguage")}
                maxVisibleItems={6}
                closeOnSelect
                onChange={onChange}
            />
        </section>
    );
}

function SonyTranslatorModal({ rootProps }: { rootProps: RenderModalProps; }) {
    const s = settings.use();
    const { t } = useUi();

    const styleOptions = [
        { label: `Mirror — ${t("mirror")}`, value: "mirror" },
        { label: `Clean — ${t("clean")}`, value: "clean" },
        { label: `Casual — ${t("casual")}`, value: "casual" },
        { label: `Slang — ${t("slang")}`, value: "slang" },
        { label: `Heavy — ${t("heavy")}`, value: "heavy" },
    ];

    const updateLanguage = (kind: "incoming" | "outgoing", value: string) => {
        if (kind === "incoming") settings.store.incomingTarget = value;
        else settings.store.outgoingTarget = value;
        clearTranslationCache();
        syncCoreTranslateSettings();
    };

    return (
        <Modal {...rootProps} title="Sony Translator">
            <div className="sony-translator-modal">
                <div className="sony-translator-hero">
                    <div className="sony-translator-hero-icon"><TranslateIcon width={24} height={24} /></div>
                    <div>
                        <div className="sony-translator-hero-title">SonyTranslator · v0.9.5</div>
                        <div className="sony-translator-hero-subtitle">{t("subtitle")}</div>
                    </div>
                </div>

                <FormSwitch
                    title={t("incoming")}
                    description={t("incomingHelp")}
                    value={s.incomingEnabled}
                    onChange={v => settings.store.incomingEnabled = v}
                    hideBorder
                />

                <FormSwitch
                    title={t("outgoing")}
                    description={t("outgoingHelp")}
                    value={s.outgoingEnabled}
                    onChange={v => settings.store.outgoingEnabled = v}
                    hideBorder
                />

                <Divider className={Margins.bottom16} />

                <LanguageSelect
                    title={t("readLanguage")}
                    value={s.incomingTarget}
                    onChange={v => updateLanguage("incoming", v)}
                />

                <LanguageSelect
                    title={t("sendLanguage")}
                    value={s.outgoingTarget}
                    onChange={v => updateLanguage("outgoing", v)}
                />

                <section className={Margins.bottom16}>
                    <Forms.FormTitle tag="h3">{t("incomingStyle")}</Forms.FormTitle>
                    <SearchableSelect
                        options={[
                            { label: `Clean — ${t("clean")}`, value: "clean" },
                            { label: `Casual — ${t("casual")}`, value: "casual" },
                            { label: `Slang — ${t("slang")}`, value: "slang" },
                            { label: `Heavy — ${t("heavy")}`, value: "heavy" },
                            { label: `Mirror — ${t("mirror")}`, value: "mirror" },
                        ]}
                        value={s.incomingStyle}
                        maxVisibleItems={5}
                        closeOnSelect
                        onChange={v => {
                            settings.store.incomingStyle = v as ChatStyle;
                            clearTranslationCache();
                        }}
                    />
                    <Forms.FormText className={Margins.top8}>
                        {t("incomingNote")}
                    </Forms.FormText>
                </section>

                <section className={Margins.bottom16}>
                    <Forms.FormTitle tag="h3">{t("outgoingStyle")}</Forms.FormTitle>
                    <SearchableSelect
                        options={styleOptions}
                        value={s.chatStyle}
                        maxVisibleItems={5}
                        closeOnSelect
                        onChange={v => settings.store.chatStyle = v as ChatStyle}
                    />
                    <Forms.FormText className={Margins.top8}>
                        {t("outgoingNote")}
                    </Forms.FormText>
                </section>

                <Divider className={Margins.bottom16} />

                <FormSwitch
                    title={t("replace")}
                    description={t("replaceHelp")}
                    value={s.replaceIncoming}
                    onChange={v => settings.store.replaceIncoming = v}
                    hideBorder
                />

                <FormSwitch
                    title={t("preserve")}
                    description={t("preserveHelp")}
                    value={s.preserveStyle}
                    onChange={v => {
                        settings.store.preserveStyle = v;
                        clearTranslationCache();
                    }}
                    hideBorder
                />

                <FormSwitch
                    title={t("recognize")}
                    description={t("recognizeHelp")}
                    value={s.smartSourceSlang}
                    onChange={v => {
                        settings.store.smartSourceSlang = v;
                        clearTranslationCache();
                    }}
                    hideBorder
                />

                <FormSwitch
                    title={t("targetSlang")}
                    description={t("targetSlangHelp")}
                    value={s.targetSlangPacks}
                    onChange={v => settings.store.targetSlangPacks = v}
                    hideBorder
                />

                <FormSwitch
                    title={t("mixedEnglish")}
                    description={t("mixedEnglishHelp")}
                    value={s.preserveMixedEnglish}
                    onChange={v => {
                        settings.store.preserveMixedEnglish = v;
                        clearTranslationCache();
                    }}
                    hideBorder
                />

                <FormSwitch
                    title={t("protect")}
                    description={t("protectHelp")}
                    value={s.protectNames}
                    onChange={v => {
                        settings.store.protectNames = v;
                        clearTranslationCache();
                    }}
                    hideBorder
                />

                <section className={Margins.bottom16}>
                    <Forms.FormTitle tag="h3">{t("names")}</Forms.FormTitle>
                    <TextInput
                        value={s.customProtectedNames}
                        placeholder="My Tool, Project Name, Game Name"
                        onChange={value => {
                            settings.store.customProtectedNames = value;
                            clearTranslationCache();
                        }}
                    />
                    <Forms.FormText className={Margins.top8}>
                        {t("namesHelp")}
                    </Forms.FormText>
                </section>

                <FormSwitch
                    title={t("apostrophes")}
                    description={t("apostrophesHelp")}
                    value={s.dropEnglishApostrophes}
                    onChange={v => settings.store.dropEnglishApostrophes = v}
                    hideBorder
                />

                <FormSwitch
                    title={t("profanity")}
                    description={t("profanityHelp")}
                    value={s.softenAmbiguousProfanity}
                    onChange={v => settings.store.softenAmbiguousProfanity = v}
                    hideBorder
                />

                <div className="sony-translator-pack-note">
                    <strong>{t("dataset")}:</strong> {t("datasetHelp")}
                </div>

                <FormSwitch
                    title={t("badge")}
                    description={t("badgeHelp")}
                    value={s.showTranslationBadge}
                    onChange={v => settings.store.showTranslationBadge = v}
                    hideBorder
                />

                <Divider className={Margins.bottom16} />

                <div className="sony-translator-actions">
                    <Button
                        color={Button.Colors.PRIMARY}
                        onClick={() => {
                            clearTranslationCache();
                            showToast(`SonyTranslator: ${t("cleared")}`, "success");
                        }}
                    >
                        {t("clear")}
                    </Button>
                </div>

                <Forms.FormText className={Margins.top16}>
                    {t("privacy")}
                </Forms.FormText>
            </div>
        </Modal>
    );
}

function openSonyTranslatorModal() {
    syncCoreTranslateSettings();
    openModal(props => <ErrorBoundary><SonyTranslatorModal rootProps={props} /></ErrorBoundary>);
}

const TranslateChatBarButton: ChatBarButtonFactory = ({ isAnyChat }) => {
    const s = settings.use(["incomingEnabled", "outgoingEnabled"]);
    const { t } = useUi();
    if (!isAnyChat) return null;

    const enabled = s.incomingEnabled || s.outgoingEnabled;
    return (
        <ChatBarButton
            tooltip={`SonyTranslator · ${t(enabled ? "on" : "off")}`}
            onClick={openSonyTranslatorModal}
        >
            <span className={enabled ? "sony-translator-chat-icon active" : "sony-translator-chat-icon"}>
                <TranslateIcon />
            </span>
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "SonyTranslator",
    description: "Automatic translation with typing-style preservation and multilingual chat slang.",
    authors: [{ name: "SonyDev", id: 0n }],
    enabledByDefault: true,
    tags: ["Chat", "Utility", "Customisation"],
    dependencies: ["Translate"],
    settings,

    patches: [
        {
            // Insert a translated replacement into Discord's native quoted-reply row.
            // The component hides only repliedTextPreview once a non-empty translation exists.
            find: "#{intl::REPLY_QUOTE_MESSAGE_NOT_LOADED}",
            replacement: {
                match: /\.onClickReply,.+?}\),(?=\i,\i,\i\])/, 
                replace: "$&$self.ReplyTranslation(arguments[0]),",
            },
        },
    ],

    ReplyTranslation: ErrorBoundary.wrap(ReplyTranslation, { noop: true }),

    chatBarButton: {
        icon: TranslateIcon,
        render: TranslateChatBarButton,
    },

    renderMessageAccessory: props => <IncomingTranslation message={props.message} />,

    async onBeforeMessageSend(channelId, message, sendOptions) {
        if (!settings.store.outgoingEnabled || !message.content?.trim()) return;

        try {
            const context = conversationContext(
                channelId,
                sendOptions?.messageReference,
                undefined,
                message.content,
                UserStore.getCurrentUser()?.id,
                [],
            );
            const translated = await translateStyled("sent", message.content, context);
            if (translated) message.content = translated;
        } catch (error) {
            console.error("[SonyTranslator] outgoing translation failed", error);
            showToast(`SonyTranslator: ${uiText(LocaleStore.locale, "sendFailed")}`, "failure");
        }
    },

    start() {
        captureCoreTranslateSettings();
        syncCoreTranslateSettings();

        // The built-in Translate plugin is a dependency, but SonyTranslator owns the composer button.
        previousTranslateButtonState = Settings.uiElements.chatBarButtons.Translate?.enabled;
        Settings.uiElements.chatBarButtons.Translate ??= { enabled: true };
        Settings.uiElements.chatBarButtons.Translate.enabled = false;
    },

    stop() {
        clearTranslationCache();
        restoreCoreTranslateSettings();

        if (previousTranslateButtonState === undefined) {
            delete Settings.uiElements.chatBarButtons.Translate;
        } else {
            Settings.uiElements.chatBarButtons.Translate ??= { enabled: previousTranslateButtonState };
            Settings.uiElements.chatBarButtons.Translate.enabled = previousTranslateButtonState;
        }
    },
});
