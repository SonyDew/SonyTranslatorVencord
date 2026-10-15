/*
 * Pure translation pipeline for SonyTranslator.
 *
 * This module deliberately has no Vencord or React imports. The Discord plugin supplies
 * the machine-translation transport while tests can supply deterministic provider output.
 */

export type ChatStyle = "clean" | "casual" | "slang" | "heavy" | "mirror";
export type StyleLevel = 0 | 1 | 2 | 3;
export type SemanticConfidence = "high" | "medium" | "low";
export type SocialRegister = "informal" | "formal" | "plural_informal" | "neutral";
export type PragmaticProfanityRole = "standalone_exclamation" | "intensifier" | "frustration" | "surprise" |
    "admiration" | "doom" | "insult" | "filler" | "directed_person" | "directed_situation";
export type SemanticIntensity = "none" | "mild" | "strong" | "extreme";
export type SpeechAct = "statement" | "question" | "request" | "reaction" | "complaint";

export interface TranslationContext {
    /** Only a bounded local window is accepted; context is never appended to provider text. */
    previousMessage?: string;
    previousMessages?: string[];
    replyMessage?: string;
    domain?: "chat" | "gaming" | "moderation" | "business";
    currentAuthorId?: string;
    replyAuthorId?: string;
    mentionedUserIds?: string[];
    previousTurns?: ContextTurn[];
    participants?: TranslationParticipant[];
}

export interface ContextTurn {
    content: string;
    authorId?: string;
    replyToAuthorId?: string;
    mentionedUserIds?: string[];
    /** Locally computed relevance; never sent to the provider. */
    relevance?: number;
}

export interface TranslationParticipant {
    id?: string;
    username?: string;
    displayName?: string;
    nickname?: string;
    evidence: "reply" | "mention" | "recent_author" | "current_author";
}

export interface SemanticSlots {
    intent?: string;
    speechAct: SpeechAct;
    subject?: "self" | "other" | "group" | "unknown";
    target?: string;
    action?: string;
    stance?: "positive" | "negative" | "neutral" | "agreement" | "disagreement";
    polarity?: "positive" | "negative" | "neutral";
    severity?: SemanticIntensity;
    intensity: SemanticIntensity;
    emotion?: string;
    register: string;
    contextDomain: "chat" | "gaming" | "moderation" | "business";
    certainty: SemanticConfidence;
    pragmaticProfanityRole?: PragmaticProfanityRole;
    emphasisSources: Array<"lexical" | "profanity" | "repetition" | "punctuation" | "caps" | "emoji">;
}

export interface ClauseAnalysis {
    clauses: string[];
    speechAct: SpeechAct;
    isQuestion: boolean;
    isComplaint: boolean;
    hasNegation: boolean;
    hasModal: boolean;
    discourseConnectors: string[];
    subject: SemanticSlots["subject"];
}

export interface SlangEntry {
    id: string;
    canonical: string;
    forms: string[];
    meaning?: string;
    register?: string[];
    contexts?: string[];
    current?: boolean;
    outdated?: boolean;
    region?: string;
    case_sensitive?: boolean;
    whole_word?: boolean;
    can_generate?: boolean;
    can_recognize?: boolean;
    avoid?: string[];
    examples?: Array<{ normal?: string; chat?: string; }>;
    /** Canonical target-language phrases that may safely be compressed to a slang form. */
    generation_sources?: string[];
    /** Other generatable entries that must also match this sentence before this form is emitted. */
    requires_generation_ids?: string[];
}

export interface PhraseEntry {
    id: string;
    source_examples?: string[];
    natural_outputs?: Partial<Record<"casual" | "slang" | "heavy", string[]>>;
    target_language?: string;
    contexts?: string[];
}

export interface ReactionEntry {
    id: string;
    form: string;
    equivalents?: Record<string, string[]>;
    contexts?: string[];
    current?: boolean;
    outdated?: boolean;
}

export interface GamingEntry {
    id: string;
    canonical?: string;
    forms?: string[];
    meaning?: string;
    keep_untranslated?: boolean;
    /** Protect an unambiguous technical term with its target-language value. */
    protect_translation?: boolean;
    translation_inflections?: Record<string, Partial<Record<"genitive" | "instrumental" | "prepositional" | "dative", string>>>;
    contexts?: string[];
    translations?: Record<string, string[]>;
    context_patterns?: string[];
    negative_patterns?: string[];
    requires_context?: boolean;
}

export interface ProfanityMeaning {
    context: string;
    natural: string[] | string;
    literal_allowed?: boolean;
}

export interface ProfanityEntry {
    id: string;
    source: string;
    language: string;
    meanings?: ProfanityMeaning[];
    notes?: string;
}

export interface DatasetLanguage {
    code: string;
    name: string;
    region: string;
    slang: SlangEntry[];
    phrases: PhraseEntry[];
    reactions: ReactionEntry[];
    gaming: GamingEntry[];
    profanity: ProfanityEntry[];
}

export interface ProtectedEntity {
    name: string;
    aliases?: string[];
    always_keep?: boolean;
    /** False for ambiguous ordinary words such as "steam" or "react". */
    protect_lowercase?: boolean;
}

export interface TranslationMistake {
    id: string;
    source_language: string;
    target_language: string;
    source_patterns?: string[];
    bad_outputs?: string[];
    preferred_outputs?: string[];
}

export interface CrossLanguageRule {
    id: string;
    description?: string;
    rule?: string;
}

export type NaturalizationStage = "formality" | "clause" | "grammar" | "compression";
export type NaturalizationOperation = "replace" | "regex" | "contrast";

export interface NaturalizationRule {
    id: string;
    language: string;
    stage: NaturalizationStage;
    operation: NaturalizationOperation;
    source_patterns?: string[];
    /** A reusable clause pattern. Named captures may be referenced from output templates. */
    pattern?: string;
    outputs: Partial<Record<"casual" | "slang" | "heavy", string[]>>;
    contexts?: string[];
    context_patterns?: string[];
    negative_patterns?: string[];
    region?: string;
    confidence: "high" | "medium" | "low";
    current: boolean;
    can_generate: boolean;
    can_recognize: boolean;
    whole_word?: boolean;
    case_sensitive?: boolean;
    max_applications?: number;
    /** True when applying the rule changes T/V or honorific politeness. */
    changes_register?: boolean;
}

export interface SemanticSourceSpec {
    forms: string[];
    /** Conservative same-language paraphrase sent to the provider. */
    normalized: string;
    confidence: SemanticConfidence;
    contexts?: string[];
    context_patterns?: string[];
    negative_patterns?: string[];
    exact_only?: boolean;
    /** Exact short reactions such as "real" may still require a related-message cue. */
    requires_context?: boolean;
    whole_word?: boolean;
    case_sensitive?: boolean;
}

export interface SemanticOutputs {
    clean: string[];
    casual: string[];
    slang: string[];
    heavy: string[];
}

export interface SemanticMapping {
    id: string;
    category: string;
    meaning: string;
    current: boolean;
    can_recognize: boolean;
    can_generate: boolean;
    sources: Record<string, SemanticSourceSpec>;
    outputs: Record<string, SemanticOutputs>;
    /** Known literal provider failures; used only after a high-confidence source match. */
    literal_failures?: Record<string, string[]>;
    profanity_strength?: 0 | 1 | 2 | 3;
    slots?: Partial<SemanticSlots>;
}

export interface PragmaticProfanityRule {
    id: string;
    language: string;
    pattern: string;
    normalized: string;
    role: PragmaticProfanityRole;
    confidence: SemanticConfidence;
    current: boolean;
    can_recognize: boolean;
    can_generate: boolean;
    slots?: Partial<SemanticSlots>;
    outputs?: Record<string, SemanticOutputs>;
    negative_patterns?: string[];
}

export interface IncomingChatRule {
    id: string;
    language: string;
    pattern: string;
    normalized: string;
    sense: string;
    confidence: SemanticConfidence;
    current: boolean;
    can_recognize: boolean;
    can_generate: boolean;
    requires_context?: boolean;
    context_patterns?: string[];
    negative_patterns?: string[];
    required_entity_capture?: string;
    abbreviations?: Record<string, string>;
    typos?: Record<string, string>;
    slots?: Partial<SemanticSlots>;
    outputs?: Record<string, SemanticOutputs>;
}

export interface SourceNormalizationRule {
    id: string;
    language: string;
    pattern: string;
    replacement: string;
    kind: "typo" | "abbreviation" | "expressive" | "grammar";
    meaning?: string;
    /** Full grammatical source constructions may disambiguate weak lexical detection. */
    language_hint?: boolean;
    confidence: SemanticConfidence;
    current: boolean;
    can_recognize: boolean;
    context_patterns?: string[];
    negative_patterns?: string[];
    requires_context?: boolean;
}

export interface RegisterMarker {
    id: string;
    language: string;
    register: Exclude<SocialRegister, "neutral">;
    patterns: string[];
    confidence: SemanticConfidence;
    contexts?: string[];
    context_patterns?: string[];
    negative_patterns?: string[];
    case_sensitive?: boolean;
    whole_word?: boolean;
}

export interface RegisterRepair {
    id: string;
    target_language: string;
    register: Exclude<SocialRegister, "neutral">;
    pattern: string;
    replacement: string;
    confidence: SemanticConfidence;
    contexts?: string[];
    case_sensitive?: boolean;
}

export interface SlangDataset {
    version: string;
    generated_at: string;
    naturalization_rules: NaturalizationRule[];
    languages: DatasetLanguage[];
    protected_entities: ProtectedEntity[];
    cross_language_rules: CrossLanguageRule[];
    translation_mistakes: TranslationMistake[];
    semantic_mappings?: SemanticMapping[];
    register_markers?: RegisterMarker[];
    register_repairs?: RegisterRepair[];
    pragmatic_profanity_rules?: PragmaticProfanityRule[];
    incoming_chat_rules?: IncomingChatRule[];
    source_normalization_rules?: SourceNormalizationRule[];
}

export interface EngineOptions {
    preserveMixedEnglish?: boolean;
    kind: "received" | "sent";
    targetLanguage: string;
    mode: ChatStyle;
    preserveStyle: boolean;
    smartSourceSlang: boolean;
    targetSlangPacks: boolean;
    protectNames: boolean;
    customProtectedNames: string;
    dropEnglishApostrophes: boolean;
    softenAmbiguousProfanity: boolean;
    context?: TranslationContext;
}

export interface SemanticMatch {
    id: string;
    category: string;
    meaning: string;
    sourceLanguage: string;
    form: string;
    confidence: SemanticConfidence;
    slots?: Partial<SemanticSlots>;
}

export interface PragmaticProfanityMatch {
    ruleId: string;
    role: PragmaticProfanityRole;
    confidence: SemanticConfidence;
    normalized: string;
    slots: SemanticSlots;
}

export interface RecognizedEntity {
    source: string;
    canonical: string;
    participantId?: string;
    kind: "username" | "display_name" | "nickname";
    confidence: SemanticConfidence;
    evidence: TranslationParticipant["evidence"];
}

export interface IncomingChatMatch {
    ruleId: string;
    sense: string;
    confidence: SemanticConfidence;
    normalized: string;
    captures: Record<string, string>;
    abbreviations: Record<string, string>;
    typos: Record<string, string>;
    slots: SemanticSlots;
}

export interface TranslationStyle {
    noCommas: boolean;
    noSentencePunctuation: boolean;
    allLowercase: boolean;
    allUppercase: boolean;
    startsLowercase: boolean;
    endingMarks: string;
    endingEllipsis: string;
    sourceSlangScore: number;
    slangDensity: number;
    slangTokenCount: number;
    compressionScore: number;
    punctuationIntensity: number;
    profanityStrength: number;
}

export interface SourceAnalysis {
    language: string | null;
    matchedSlangIds: Set<string>;
    matchedForms: Set<string>;
    laughter: boolean;
    profanity: boolean;
    confusionInterjection: boolean;
    semanticMatches: SemanticMatch[];
    pragmaticProfanity: PragmaticProfanityMatch[];
    semanticSlots: SemanticSlots[];
    clauses: ClauseAnalysis;
    contextSignals: string[];
    selectedTransformations: string[];
    recognizedEntities: RecognizedEntity[];
    normalizedTypos: Array<{ source: string; normalized: string; confidence: SemanticConfidence; }>;
    recognizedAbbreviations: Array<{ form: string; meaning: string; confidence: SemanticConfidence; }>;
    selectedSenses: Array<{ token: string; sense: string; confidence: SemanticConfidence; }>;
    contextEvidence: string[];
    incomingChatMatches: IncomingChatMatch[];
    providerSafeInput?: string;
    register: SocialRegister;
    mixedLanguage: boolean;
    style: TranslationStyle;
}

export interface PreparedTranslation {
    preserveTargetText: boolean;
    foreignSegments: Array<{ text: string; index: number; }>;
    original: string;
    text: string;
    sourceLanguage: string | null;
    targetLanguage: string;
    mode: ChatStyle;
    level: StyleLevel;
    options: EngineOptions;
    analysis: SourceAnalysis;
    shortcut: string | null;
    restore: (translated: string) => string;
}

export interface TranslationEngine {
    dataset: SlangDataset;
    prepare(input: string, options: EngineOptions): PreparedTranslation;
    finalize(prepared: PreparedTranslation, providerOutput: string): string;
    detectSourceLanguage(input: string, context?: TranslationContext): string | null;
    analyzeSource(input: string, context?: TranslationContext): SourceAnalysis;
    naturalize(input: string, targetLanguage: string, level: StyleLevel, register?: SocialRegister): string;
}

type RuleReplacement = string | ((substring: string, ...args: string[]) => string);
type Rule = readonly [RegExp, RuleReplacement];

const PHRASE_REGEX_CACHE = new Map<string, RegExp>();
const MAX_REGEX_CACHE = 4096;

const REGISTER_LEVEL: Record<string, StyleLevel> = {
    casual: 1,
    slang: 2,
    heavy: 3,
};

const SOURCE_NORMALIZATION_RULES: Rule[] = [
    [/(?<![\p{L}\p{N}_])я\s+хз(?![\p{L}\p{N}_])/giu, "я не знаю"],
    [/(?<![\p{L}\p{N}_])хз(?![\p{L}\p{N}_])/giu, "не знаю"],
    [/(?<![\p{L}\p{N}_])мб(?![\p{L}\p{N}_])/giu, "может быть"],
    [/(?<![\p{L}\p{N}_])(?:кста(?:ти)?|кст)(?![\p{L}\p{N}_])/giu, "кстати"],
    [/(?<![\p{L}\p{N}_])спс(?![\p{L}\p{N}_])/giu, "спасибо"],
    [/(?<![\p{L}\p{N}_])(?:пжлст|пж|плиз)(?![\p{L}\p{N}_])/giu, "пожалуйста"],
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
];

const EN_CONTRACTIONS: Rule[] = [
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
];

const LANGUAGE_STOPWORDS: Record<string, string[]> = {
    en: ["the", "this", "that", "you", "your", "are", "is", "with", "what", "know", "rules", "picture", "however"],
    de: ["der", "die", "das", "ist", "nicht", "ich", "du", "und", "aber", "keine", "ahnung", "tot"],
    es: ["el", "la", "los", "las", "que", "por", "para", "pero", "esto", "muerto", "gracias"],
    fr: ["le", "la", "les", "est", "pas", "je", "tu", "mais", "avec", "mort", "merci"],
    "pt-br": ["você", "não", "que", "pra", "para", "mas", "isso", "bora", "obrigado", "boa"],
    pl: ["nie", "jest", "ale", "dla", "mam", "wiem", "dzięki", "czat"],
};

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeComparable(value: string): string {
    return value
        .toLocaleLowerCase()
        .replace(/[“”"'’`]/g, "")
        .replace(/[.,!?！？。,:;，；：…]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeLanguageCode(language: string): string {
    const normalized = language.toLocaleLowerCase();
    if (normalized.startsWith("zh")) return normalized.includes("tw") || normalized.includes("hant") ? "zh-tw" : "zh-cn";
    if (normalized.startsWith("pt")) return "pt-br";
    if (normalized.startsWith("uk")) return "uk";
    return normalized.split("-")[0];
}

function languageBase(language: string): string {
    return normalizeLanguageCode(language);
}

function normalizedName(value: string): string {
    return value.normalize("NFKC").replace(/^@/, "").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function entityPositionIsStrong(input: string, source: string): boolean {
    const escaped = escapeRegex(source);
    const literalObject = new RegExp(`\\b(?:ordered|order|bought|buy|drank|drink|made|make|a|an|the|some)\\s+(?:\\w+\\s+){0,2}${escaped}\\b`, "iu");
    if (literalObject.test(input)) return false;
    const patterns = [
        new RegExp(`(?:^|[.!?]\\s+)(?:hey|hi|hello|sup|yo|thanks|thx)\\s*,?\\s*${escaped}(?=\\s+(?:dude|bro|man|mate)\\b|[,.!?]|$)`, "iu"),
        new RegExp(`(?:^|[.!?]\\s+)(?:why|where|how)\\s+(?:is|was|did|does)\\s+${escaped}(?=\\b)`, "iu"),
        new RegExp(`^${escaped}\\s+(?:is|was|did|does|said|sent|deleted|joined|left)\\b`, "iu"),
        new RegExp(`@${escaped}(?![\\p{L}\\p{N}_])`, "iu"),
    ];
    if (patterns.some(pattern => pattern.test(input))) return true;
    const exactCase = input.match(new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, "u"))?.[0];
    return !!exactCase && exactCase[0] === exactCase[0].toLocaleUpperCase();
}

function recognizeContextEntities(input: string, context?: TranslationContext): RecognizedEntity[] {
    const result: RecognizedEntity[] = [];
    const seen = new Set<string>();
    const participants = (context?.participants ?? []).slice(0, 16);
    for (const participant of participants) {
        const candidates: Array<[RecognizedEntity["kind"], string | undefined]> = [
            ["display_name", participant.displayName],
            ["nickname", participant.nickname],
            ["username", participant.username],
        ];
        for (const [kind, candidate] of candidates) {
            const name = candidate?.trim();
            if (!name || name.length < 2 || name.length > 64) continue;
            const key = normalizedName(name);
            if (!key || seen.has(`${participant.id ?? "?"}:${key}`)) continue;
            const match = input.match(new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegex(name)}(?![\\p{L}\\p{N}_])`, "iu"))?.[0];
            if (!match || !entityPositionIsStrong(input, match)) continue;
            seen.add(`${participant.id ?? "?"}:${key}`);
            result.push({
                source: match,
                canonical: name,
                participantId: participant.id,
                kind,
                confidence: participant.evidence === "mention" || participant.evidence === "reply" ? "high" : "medium",
                evidence: participant.evidence,
            });
        }
    }
    return result.sort((a, b) => b.source.length - a.source.length).slice(0, 12);
}

function relevantContextTexts(context?: TranslationContext): string[] {
    const result: string[] = [];
    if (context?.replyMessage?.trim()) result.push(context.replyMessage);
    const turns = [...(context?.previousTurns ?? [])]
        .filter(turn => turn.content?.trim())
        .sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0))
        .slice(0, 4)
        .map(turn => turn.content);
    result.push(...turns);
    result.push(...(context?.previousMessages ?? []).slice(-4).reverse(), context?.previousMessage ?? "");
    return [...new Set(result.filter(value => !!value?.trim()))].slice(0, 4);
}

function contextCorpus(input: string, context?: TranslationContext): string {
    return [input, ...relevantContextTexts(context)].join(" \n ");
}

function relatedContextCorpus(context?: TranslationContext): string {
    return relevantContextTexts(context).join(" \n ");
}

function reliableContextCorpus(context?: TranslationContext): string {
    if (!context) return "";
    const turns = context.previousTurns?.length
        ? context.previousTurns.filter(turn => (turn.relevance ?? 0) >= 3).sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0)).slice(0, 4).map(turn => turn.content)
        : [...(context.previousMessages ?? []).slice(-4), context.previousMessage ?? ""];
    return [context.replyMessage ?? "", ...turns].filter(Boolean).join("\n");
}

function inferContextDomain(input: string, context?: TranslationContext): NonNullable<TranslationContext["domain"]> {
    if (context?.domain) return context.domain;
    const corpus = contextCorpus(input, context);
    if (/\b(?:invoice|contract|application|interview|client|customer|business|meeting|deadline|employment)\b/iu.test(corpus)) return "business";
    if (/\b(?:ban|mute|moderator|modmail|appeal|rule violation|report user|модерац|жалоб|правил)\b/iu.test(corpus)) return "moderation";
    if (/\b(?:game|match|rank|queue|server|build|weapon|sword|damage|dmg|heal|boss|raid|nerf|buff|игр|катк|сервер|билд|меч|рейд|гра|spiel|zocken)\b/iu.test(corpus)) return "gaming";
    return "chat";
}

function analyzeClauses(input: string): ClauseAnalysis {
    const trimmed = input.trim();
    const connectors = trimmed.match(/(?<![\p{L}\p{N}_])(?:however|therefore|but|though|tho|aber|jedoch|doch|deshalb|но|однако|поэтому|але|однак|тому|mais|cependant|donc|pero|sin embargo|entonces|mas|porém|więc|ale|しかし|でも|だから|근데|하지만)(?![\p{L}\p{N}_])/giu) ?? [];
    const clauses = trimmed
        .split(/(?:\r?\n)+|(?<=[.!?！？。])\s+|[,;，；]\s*(?=(?:however|therefore|but|aber|jedoch|doch|но|однако|але|однак|mais|pero|mas|ale)\b)/iu)
        .map(value => value.trim())
        .filter(Boolean)
        .slice(0, 8);
    const tokenCount = trimmed.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
    const question = /[?？]\s*$/u.test(trimmed) || /^(?:why|how|what|when|where|who|can|could|would|do|does|did|warum|wie|was|wann|wo|wer|kann|könnt|wieso|почему|как|что|когда|где|кто|мож|чому|як|що|коли|де|хто|pourquoi|comment|qu|est-ce|por qué|cómo|qué|quando|como|czy|dlaczego|jak|co|为什么|怎麼|怎么|왜|어떻게|なぜ|なんで)/iu.test(trimmed);
    const request = /^(?:please|pls|plz|can you|could you|bitte|kannst du|könnt ihr|пожалуйста|пж|можешь|давай|будь ласка|можеш|s'il te plaît|por favor|proszę|请|請|お願い|제발)/iu.test(trimmed);
    const complaint = /(?:why|warum|почему|чому|pourquoi|por qué|dlaczego|为什么|為什麼|なんで|왜).*(?:still|noch|до сих пор|досі|encore|todavía|ainda|nadal|还|還|まだ|아직)|(?:пиздец|бля(?:ть)?|сука|fuck|shit|scheiße|kurwa|putain|joder|씨발)/iu.test(trimmed);
    const reaction = tokenCount <= 3 && /^(?:real|same|fr|based|жиза|точно|да ну|серйозно|реально|echt|genau|krass|vraiment|grave|same|จริง|真的|真的嗎|マジ|まじ|진짜)/iu.test(trimmed);
    const speechAct: SpeechAct = request ? "request" : reaction ? "reaction" : complaint ? "complaint" : question ? "question" : "statement";
    const subject: SemanticSlots["subject"] = /(?<![\p{L}\p{N}_])(?:i|i'm|im|ich|я|yo|je|eu|ja|私|僕|俺|我|나|내가)(?![\p{L}\p{N}_])/iu.test(trimmed)
        ? "self"
        : /(?<![\p{L}\p{N}_])(?:we|wir|мы|ми|nous|nosotros|nós|my|私たち|我們|我们|우리)(?![\p{L}\p{N}_])/iu.test(trimmed)
            ? "group"
            : /(?<![\p{L}\p{N}_])(?:he|she|they|er|sie|он|она|они|він|вона|вони|il|elle|ils|ellos|ele|eles|on|他|她|他们|他們|彼|彼女|그|걔)(?![\p{L}\p{N}_])/iu.test(trimmed)
                ? "other"
                : "unknown";
    return {
        clauses: clauses.length ? clauses : [trimmed],
        speechAct,
        isQuestion: question,
        isComplaint: complaint,
        hasNegation: /(?<![\p{L}\p{N}_])(?:not|never|no|nicht|kein|nie|не|нет|ні|pas|jamais|no|não|nie|不|没|沒|ない|ぬ|안|못)(?![\p{L}\p{N}_])/iu.test(trimmed) || /n['’]t/iu.test(trimmed),
        hasModal: /(?<![\p{L}\p{N}_])(?:can|could|should|must|would|kann|könnt|soll|muss|мож|долж|треба|повинен|peux|doit|puede|debe|pode|musi|może|可以|应该|應該|できる|べき|수|해야)(?![\p{L}\p{N}_])/iu.test(trimmed),
        discourseConnectors: [...new Set(connectors.map(value => value.toLocaleLowerCase()))],
        subject,
    };
}

function semanticComparable(value: string): string {
    return normalizeComparable(value.replace(/\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier}|\u200D\p{Extended_Pictographic})*/gu, ""));
}

type SourceNormalizationResult = {
    text: string;
    typos: SourceAnalysis["normalizedTypos"];
    abbreviations: SourceAnalysis["recognizedAbbreviations"];
    expressive: Array<{ source: string; normalized: string; }>;
};

function normalizationContextMatches(rule: Pick<SourceNormalizationRule, "language" | "requires_context" | "context_patterns" | "negative_patterns">, input: string, context?: TranslationContext, originalInput = input, relevantOnly = false): boolean {
    const related = rule.requires_context || relevantOnly ? reliableContextCorpus(context) : relatedContextCorpus(context);
    if (rule.requires_context && !reliableContextAvailable(context)) return false;
    const corpus = `${input}\n${originalInput}\n${related}`;
    if (rule.negative_patterns?.some(pattern => containsPhrase(corpus, pattern, rule.language))) return false;
    if (!rule.context_patterns?.length) return true;
    return rule.context_patterns.some(pattern => containsPhrase(corpus, pattern, rule.language));
}

function applySourceNormalizations(
    dataset: SlangDataset,
    input: string,
    sourceLanguage: string | null,
    context?: TranslationContext,
    originalInput = input,
): SourceNormalizationResult {
    let text = input;
    const typos: SourceNormalizationResult["typos"] = [];
    const abbreviations: SourceNormalizationResult["abbreviations"] = [];
    const expressive: SourceNormalizationResult["expressive"] = [];
    if (!sourceLanguage) return { text, typos, abbreviations, expressive };
    const code = normalizeLanguageCode(sourceLanguage);
    for (const rule of dataset.source_normalization_rules ?? []) {
        if (!rule.current || !rule.can_recognize || rule.confidence === "low" || normalizeLanguageCode(rule.language) !== code) continue;
        if (!normalizationContextMatches(rule, text, context, originalInput, true)) continue;
        try {
            const regex = new RegExp(rule.pattern, "giu");
            const first = regex.exec(text);
            if (!first) continue;
            regex.lastIndex = 0;
            const before = first[0];
            text = text.replace(regex, rule.replacement);
            if (rule.kind === "abbreviation") {
                abbreviations.push({ form: before, meaning: rule.meaning ?? rule.replacement, confidence: rule.confidence });
            } else if (rule.kind === "expressive") {
                expressive.push({ source: before, normalized: rule.replacement });
            } else {
                typos.push({ source: before, normalized: rule.replacement, confidence: rule.confidence });
            }
        } catch {
            // Optional dataset normalization must never block incoming chat.
        }
    }
    return { text: text.replace(/[ \t]{2,}/g, " ").trim(), typos, abbreviations, expressive };
}

function expandCaptures(template: string, captures: Record<string, string>): string {
    return template.replace(/\$<([A-Za-z][\w]*)>/g, (whole, key: string) => captures[key] ?? whole);
}

function hasMixedScripts(input: string): boolean {
    const groups = [
        /\p{Script=Latin}/u,
        /\p{Script=Cyrillic}/u,
        /[\u3400-\u9fff]/u,
        /[\u3040-\u30ff]/u,
        /[\uac00-\ud7af]/u,
    ];
    return groups.filter(pattern => pattern.test(input)).length > 1;
}

function sourceSpec(mapping: SemanticMapping, language: string): SemanticSourceSpec | undefined {
    const target = normalizeLanguageCode(language);
    return Object.entries(mapping.sources).find(([code]) => normalizeLanguageCode(code) === target)?.[1];
}

function semanticOutput(mapping: SemanticMapping, language: string): SemanticOutputs | undefined {
    const target = normalizeLanguageCode(language);
    return Object.entries(mapping.outputs).find(([code]) => normalizeLanguageCode(code) === target)?.[1];
}

function semanticSpecContextMatches(spec: SemanticSourceSpec, input: string, context?: TranslationContext, language = "en"): boolean {
    if (spec.negative_patterns?.some(pattern => containsPhrase(input, pattern, language))) return false;
    if (spec.requires_context && !relatedContextCorpus(context)) return false;
    if (!spec.context_patterns?.length) return true;
    const corpus = spec.requires_context ? relatedContextCorpus(context) : contextCorpus(input, context);
    return spec.context_patterns.some(pattern => containsPhrase(corpus, pattern, language));
}

function findSemanticMatches(
    dataset: SlangDataset,
    input: string,
    sourceLanguage: string | null,
    context?: TranslationContext,
): SemanticMatch[] {
    const matches: SemanticMatch[] = [];
    const candidateCodes = sourceLanguage
        ? [normalizeLanguageCode(sourceLanguage)]
        : dataset.languages.map(language => normalizeLanguageCode(language.code));
    const seen = new Set<string>();

    for (const mapping of dataset.semantic_mappings ?? []) {
        if (!mapping.current || !mapping.can_recognize) continue;
        for (const code of candidateCodes) {
            const spec = sourceSpec(mapping, code);
            if (!spec) continue;
            const forms = [...spec.forms].sort((a, b) => b.length - a.length);
            for (const form of forms) {
                const exact = semanticComparable(input) === semanticComparable(form);
                if ((!exact || spec.requires_context) && !semanticSpecContextMatches(spec, input, context, code)) continue;
                if (exact && spec.negative_patterns?.some(pattern => containsPhrase(input, pattern, code))) continue;
                if (spec.exact_only && !exact) continue;
                let matched = exact;
                if (!matched) {
                    try {
                        matched = phraseRegex(
                            form,
                            code,
                            spec.case_sensitive ? "u" : "iu",
                            spec.whole_word !== false,
                        ).test(input);
                    } catch {
                        matched = false;
                    }
                }
                if (!matched || seen.has(mapping.id)) continue;
                // Medium-confidence rewrites need either an exact phrase or an explicit context cue.
                if (spec.confidence === "medium" && !exact && spec.context_patterns?.length &&
                    !spec.context_patterns.some(pattern => containsPhrase(contextCorpus(input, context), pattern, code))) continue;
                seen.add(mapping.id);
                matches.push({
                    id: mapping.id,
                    category: mapping.category,
                    meaning: mapping.meaning,
                    sourceLanguage: code,
                    form,
                    confidence: spec.confidence,
                    slots: mapping.slots,
                });
                break;
            }
        }
    }
    return matches;
}

function phraseRegex(value: string, languageCode: string, flags = "giu", wholeWord = true): RegExp {
    const escaped = escapeRegex(value).replace(/\\\s+/g, "\\s+");
    const source = !wholeWord || /^(?:zh|ja|ko)/i.test(languageCode)
        ? escaped
        : `(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`;
    const key = `${source}\u0000${flags}`;
    let cached = PHRASE_REGEX_CACHE.get(key);
    if (!cached) {
        cached = new RegExp(source, flags);
        PHRASE_REGEX_CACHE.set(key, cached);
        if (PHRASE_REGEX_CACHE.size > MAX_REGEX_CACHE) {
            const oldest = PHRASE_REGEX_CACHE.keys().next().value;
            if (oldest) PHRASE_REGEX_CACHE.delete(oldest);
        }
    }
    cached.lastIndex = 0;
    return cached;
}

function applyRules(input: string, rules: Rule[]): string {
    let output = input;
    for (const [pattern, replacement] of rules) {
        output = typeof replacement === "string"
            ? output.replace(pattern, replacement)
            : output.replace(pattern, replacement);
    }
    return output;
}

function hashText(input: string): string {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36).toLocaleUpperCase();
}

function getDatasetLanguage(dataset: SlangDataset, language: string): DatasetLanguage | undefined {
    const code = normalizeLanguageCode(language);
    return dataset.languages.find(candidate => normalizeLanguageCode(candidate.code) === code);
}

function entryPattern(entry: SlangEntry, form: string, languageCode: string, flags = "giu"): RegExp {
    return phraseRegex(form, languageCode, entry.case_sensitive ? flags.replace("i", "") : flags, entry.whole_word !== false);
}

function containsPhrase(input: string, phrase: string, languageCode: string): boolean {
    if (!phrase.trim()) return false;
    try {
        return phraseRegex(phrase, languageCode, "iu").test(input);
    } catch {
        return input.toLocaleLowerCase().includes(phrase.toLocaleLowerCase());
    }
}

function scriptLanguage(input: string): string | null {
    if (/[іїєґІЇЄҐ]/u.test(input)) return "uk";
    if (/[а-яёА-ЯЁ]/u.test(input)) return "ru";
    if (/[\u3040-\u30ff]/u.test(input)) return "ja";
    if (/[\uac00-\ud7af]/u.test(input)) return "ko";
    if (/[\u3400-\u9fff]/u.test(input)) {
        return /[這個們來為與說對謝網遊戲後裡麼還會時學長開關點現氣樣體國臺灣將無過從]/u.test(input) ? "zh-tw" : "zh-cn";
    }
    return null;
}

function stopwordScores(input: string): Map<string, number> {
    const normalized = ` ${normalizeComparable(input)} `;
    const scores = new Map<string, number>();
    for (const [language, words] of Object.entries(LANGUAGE_STOPWORDS)) {
        let score = 0;
        for (const word of words) {
            if (normalized.includes(` ${word} `)) score++;
        }
        if (score) scores.set(language, score);
    }
    return scores;
}

function shouldPreserveIncoming(dataset: SlangDataset, input: string, language: string | null, options: EngineOptions): boolean {
    if (options.kind !== "received" || !language) return false;
    const target = normalizeLanguageCode(options.targetLanguage);
    if (normalizeLanguageCode(language) !== target) return false;
    if (["ru", "uk"].includes(target)) return true;
    // CJK scripts need explicit, region-correct evidence; shared Han alone is
    // ambiguous between Japanese and both Chinese profiles.
    if (target === "ja") return /[\u3040-\u30ff]/u.test(input) && !/\p{Script=Cyrillic}|[\uac00-\ud7af]/u.test(input);
    if (target === "ko") return /[\uac00-\ud7af]/u.test(input) && !/\p{Script=Cyrillic}|[\u3040-\u30ff]/u.test(input);
    if (target.startsWith("zh")) return /[\u3400-\u9fff]/u.test(input) && !/\p{Script=Cyrillic}|[\u3040-\u30ff\uac00-\ud7af]/u.test(input);
    if (hasMixedScripts(input)) return false;
    const ranked = [...stopwordScores(input)].sort((a, b) => b[1] - a[1]);
    // Avoid silently skipping polysemous one-word reactions (real, cool, etc.).
    return ranked[0]?.[0] === target && ranked[0][1] >= 2 && ranked[0][1] > (ranked[1]?.[1] ?? 0);
}

function detectSourceLanguage(dataset: SlangDataset, input: string, context?: TranslationContext): string | null {
    const comparable = normalizeComparable(input);
    if (!comparable) return null;

    const exactMatches = new Set<string>();
    // Semantic phrases are indexed before generic detection so one- or two-token Discord
    // replies do not get guessed from the Latin alphabet alone.
    for (const mapping of dataset.semantic_mappings ?? []) {
        if (!mapping.current || !mapping.can_recognize) continue;
        for (const [code, spec] of Object.entries(mapping.sources)) {
            if (spec.forms.some(form => semanticComparable(form) === semanticComparable(input)) &&
                !spec.negative_patterns?.some(pattern => containsPhrase(input, pattern, code)) &&
                (!spec.requires_context || semanticSpecContextMatches(spec, input, context, code))) exactMatches.add(normalizeLanguageCode(code));
        }
    }
    for (const language of dataset.languages) {
        for (const entry of language.slang ?? []) {
            if (!entry.can_recognize) continue;
            if (entry.forms?.some(form => normalizeComparable(form) === comparable)) exactMatches.add(normalizeLanguageCode(language.code));
        }
        for (const reaction of language.reactions ?? []) {
            if (normalizeComparable(reaction.form) === comparable) exactMatches.add(normalizeLanguageCode(language.code));
        }
        for (const entry of language.gaming ?? []) {
            if (entry.forms?.some(form => normalizeComparable(form) === comparable)) exactMatches.add(normalizeLanguageCode(language.code));
        }
        for (const entry of language.profanity ?? []) {
            for (const form of String(entry.source).split(/\s*\/\s*/g)) {
                if (normalizeComparable(form) === comparable) exactMatches.add(normalizeLanguageCode(language.code));
            }
        }
    }
    if (exactMatches.size === 1) return [...exactMatches][0];

    const byScript = scriptLanguage(input);
    if (byScript === "ru") {
        const ukScore = ["це", "що", "який", "якщо", "мені", "тобі", "ти", "можеш", "зараз", "можливо", "будь ласка", "вже", "йду", "спати", "робиш", "нема"]
            .filter(word => containsPhrase(input, word, "uk")).length;
        const ruScore = ["это", "что", "который", "если", "мне", "тебе", "сейчас", "может", "пожалуйста"]
            .filter(word => containsPhrase(input, word, "ru")).length;
        if (ukScore > ruScore) return "uk";
    }
    // Shared Han characters alone cannot distinguish Mainland and Taiwan.
    // A bounded, high-confidence regional construction is stronger evidence
    // than the default Simplified fallback (bare numbers are not evidence).
    if (byScript === "zh-cn" && (dataset.source_normalization_rules ?? []).some(rule => {
        if (normalizeLanguageCode(rule.language) !== "zh-tw" || !rule.current || !rule.can_recognize || rule.confidence !== "high") return false;
        if (!normalizationContextMatches(rule, input, context)) return false;
        try { return new RegExp(rule.pattern, "iu").test(input); } catch { return false; }
    })) return "zh-tw";
    if (byScript) return byScript;

    const scores = stopwordScores(input);
    const grammarHints = new Set((dataset.source_normalization_rules ?? [])
        .filter(rule => rule.language_hint && rule.current && rule.can_recognize && rule.confidence === "high")
        .filter(rule => normalizationContextMatches(rule, input, context, input, true))
        .filter(rule => { try { return new RegExp(rule.pattern, "iu").test(input); } catch { return false; } })
        .map(rule => normalizeLanguageCode(rule.language)));
    if (grammarHints.size === 1) {
        const code = [...grammarHints][0];
        // A context-validated subject + predicate outweighs one foreign
        // possessive/register token (English "a TON" versus French "ton").
        scores.set(code, (scores.get(code) ?? 0) + 8);
    }
    for (const marker of dataset.register_markers ?? []) {
        if (markerMatches(marker, input)) {
            const code = normalizeLanguageCode(marker.language);
            scores.set(code, (scores.get(code) ?? 0) + (marker.confidence === "high" ? 5 : 2));
        }
    }
    for (const language of dataset.languages) {
        const code = normalizeLanguageCode(language.code);
        let score = scores.get(code) ?? 0;
        for (const entry of language.slang ?? []) {
            if (!entry.can_recognize) continue;
            for (const form of entry.forms ?? []) {
                if (form.length >= 2 && containsPhrase(input, form, code)) score += Math.min(4, Math.max(1, form.length / 2));
            }
        }
        for (const reaction of language.reactions ?? []) {
            if (reaction.form?.length >= 2 && containsPhrase(input, reaction.form, code)) score += 3;
        }
        if (score) scores.set(code, score);
    }

    const ranked = [...scores].sort((a, b) => b[1] - a[1]);
    if (!ranked.length || (ranked[1] && ranked[0][1] === ranked[1][1])) {
        const recognizedLanguages = new Set((dataset.source_normalization_rules ?? [])
            .filter(rule => rule.current && rule.can_recognize && rule.confidence === "high")
            .filter(rule => { try { return new RegExp(rule.pattern, "iu").test(input); } catch { return false; } })
            .map(rule => normalizeLanguageCode(rule.language)));
        if (recognizedLanguages.size === 1) return [...recognizedLanguages][0];
        if (context) {
            const contextual = detectSourceLanguage(dataset, context.replyMessage ?? relevantContextTexts(context)[0] ?? "");
            // Context is only a tie-breaker for short replies, never a replacement for clear script evidence.
            const conflictsWithLatin = /\p{Script=Latin}/u.test(input) &&
                ["ru", "uk", "ja", "ko", "zh-cn", "zh-tw"].includes(normalizeLanguageCode(contextual ?? ""));
            if (contextual && !conflictsWithLatin && (input.match(/[\p{L}\p{N}]+/gu)?.length ?? 0) <= 3) return contextual;
        }
        return null;
    }
    return ranked[0][0];
}

function markerMatches(marker: RegisterMarker, input: string): boolean {
    if (marker.negative_patterns?.some(pattern => containsPhrase(input, pattern, marker.language))) return false;
    if (marker.context_patterns?.length && !marker.context_patterns.some(pattern => containsPhrase(input, pattern, marker.language))) return false;
    return marker.patterns.some(pattern => {
        try {
            return phraseRegex(
                pattern,
                marker.language,
                marker.case_sensitive ? "u" : "iu",
                marker.whole_word !== false,
            ).test(input);
        } catch {
            return false;
        }
    });
}

function detectSocialRegister(
    dataset: SlangDataset,
    input: string,
    sourceLanguage: string | null,
    context?: TranslationContext,
): SocialRegister {
    if (!sourceLanguage) return context?.domain === "business" ? "formal" : "neutral";
    const code = normalizeLanguageCode(sourceLanguage);
    const corpus = contextCorpus(input, context);
    const scores = new Map<SocialRegister, number>();
    for (const marker of dataset.register_markers ?? []) {
        if (normalizeLanguageCode(marker.language) !== code || !markerMatches(marker, corpus)) continue;
        const weight = marker.confidence === "high" ? 3 : marker.confidence === "medium" ? 2 : 1;
        scores.set(marker.register, (scores.get(marker.register) ?? 0) + weight);
    }
    if (context?.domain === "business") scores.set("formal", (scores.get("formal") ?? 0) + 2);
    const ranked = [...scores].sort((a, b) => b[1] - a[1]);
    if (!ranked.length || (ranked[1] && ranked[0][1] === ranked[1][1])) return "neutral";
    return ranked[0][0];
}

function styleEmphasisSources(input: string, hasProfanity: boolean): SemanticSlots["emphasisSources"] {
    const result: SemanticSlots["emphasisSources"] = [];
    if (hasProfanity) result.push("profanity");
    if (/\b(?:very|really|extremely|so|sehr|wirklich|очень|дуже|très|muy|muito|bardzo|很|超|めっちゃ|진짜|너무)\b/iu.test(input)) result.push("lexical");
    if (/(\p{L})\1{2,}|\b(\p{L}+)\s+\2\b/iu.test(input)) result.push("repetition");
    if (/[!?！？]{2,}|\.{2,}|…/u.test(input)) result.push("punctuation");
    const letters = input.match(/\p{L}/gu)?.join("") ?? "";
    if (letters.length >= 4 && letters === letters.toLocaleUpperCase()) result.push("caps");
    if (/\p{Extended_Pictographic}/u.test(input)) result.push("emoji");
    return result;
}

function contextSignals(input: string, context?: TranslationContext): string[] {
    const related = relatedContextCorpus(context);
    const signals: string[] = [];
    if (context?.replyMessage) signals.push("direct_reply");
    const count = Math.min(4, context?.previousTurns?.filter(turn => turn.content?.trim()).length ??
        ((context?.previousMessages ?? []).filter(Boolean).length + Number(!!context?.previousMessage)));
    if (count) signals.push(`local_window:${count}`);
    const domain = inferContextDomain(input, context);
    signals.push(`domain:${domain}`);
    if (related && /\b(?:nerf|buff|sword|weapon|build|match|rank|меч|оруж|билд|игр|spiel|zocken)\b/iu.test(related)) signals.push("context:gaming_cue");
    if (related && /[!?！？]{2,}|\p{Extended_Pictographic}/u.test(related)) signals.push("context:emotional_cue");
    return signals;
}

function baseSemanticSlots(
    input: string,
    clauses: ClauseAnalysis,
    register: SocialRegister,
    confidence: SemanticConfidence,
    context?: TranslationContext,
    hasProfanity = false,
): SemanticSlots {
    return {
        speechAct: clauses.speechAct,
        subject: clauses.subject,
        intensity: hasProfanity ? "strong" : "none",
        register: register === "neutral" ? (hasProfanity ? "vulgar_informal" : "neutral") : register,
        contextDomain: inferContextDomain(input, context),
        certainty: confidence,
        emphasisSources: styleEmphasisSources(input, hasProfanity),
    };
}

function reliableContextAvailable(context?: TranslationContext): boolean {
    if (context?.replyMessage?.trim()) return true;
    if (context?.previousTurns?.some(turn => (turn.relevance ?? 0) >= 3 && turn.content?.trim())) return true;
    // Backward-compatible pure-engine callers may only provide the immediate previous message.
    return !!context?.previousMessage?.trim() || (!!context?.previousMessages?.length && !context.previousTurns?.length);
}

function findIncomingChatMatches(
    dataset: SlangDataset,
    input: string,
    sourceLanguage: string | null,
    clauses: ClauseAnalysis,
    register: SocialRegister,
    entities: RecognizedEntity[],
    context?: TranslationContext,
): IncomingChatMatch[] {
    if (!sourceLanguage) return [];
    const code = normalizeLanguageCode(sourceLanguage);
    const matches: IncomingChatMatch[] = [];
    for (const rule of dataset.incoming_chat_rules ?? []) {
        if (!rule.current || !rule.can_recognize || normalizeLanguageCode(rule.language) !== code) continue;
        if (rule.requires_context && !reliableContextAvailable(context)) continue;
        const corpus = `${input}\n${rule.requires_context ? reliableContextCorpus(context) : relatedContextCorpus(context)}`;
        if (rule.context_patterns?.length && !rule.context_patterns.some(pattern => containsPhrase(corpus, pattern, code))) continue;
        if (rule.negative_patterns?.some(pattern => containsPhrase(corpus, pattern, code))) continue;
        try {
            const regex = new RegExp(rule.pattern, "iu");
            const match = regex.exec(input);
            if (!match) continue;
            const captures = { ...(match.groups ?? {}) } as Record<string, string>;
            if (rule.required_entity_capture) {
                const captured = captures[rule.required_entity_capture];
                if (!captured || !entities.some(entity =>
                    normalizedName(entity.source) === normalizedName(captured) || normalizedName(entity.canonical) === normalizedName(captured))) continue;
                const entity = entities.find(candidate =>
                    normalizedName(candidate.source) === normalizedName(captured) || normalizedName(candidate.canonical) === normalizedName(captured));
                if (entity) captures[rule.required_entity_capture] = entity.canonical;
            }
            const slots: SemanticSlots = {
                ...baseSemanticSlots(input, clauses, register, rule.confidence, context, false),
                intent: rule.id,
                ...(rule.slots ?? {}),
            };
            matches.push({
                ruleId: rule.id,
                sense: rule.sense,
                confidence: rule.confidence,
                normalized: expandCaptures(rule.normalized, captures),
                captures,
                abbreviations: rule.abbreviations ?? {},
                typos: rule.typos ?? {},
                slots,
            });
        } catch {
            // Malformed optional chat rules fall back to normal provider translation.
        }
        if (matches.length >= 2) break;
    }
    return matches;
}

function findPragmaticProfanityMatches(
    dataset: SlangDataset,
    input: string,
    sourceLanguage: string | null,
    clauses: ClauseAnalysis,
    register: SocialRegister,
    context?: TranslationContext,
): PragmaticProfanityMatch[] {
    if (!sourceLanguage) return [];
    const language = normalizeLanguageCode(sourceLanguage);
    const matches: PragmaticProfanityMatch[] = [];
    for (const rule of dataset.pragmatic_profanity_rules ?? []) {
        if (!rule.current || !rule.can_recognize || normalizeLanguageCode(rule.language) !== language) continue;
        if (rule.negative_patterns?.some(pattern => containsPhrase(input, pattern, language))) continue;
        try {
            const regex = new RegExp(rule.pattern, "iu");
            if (!regex.test(input)) continue;
            const normalized = input.replace(regex, rule.normalized).trim();
            const slots: SemanticSlots = {
                ...baseSemanticSlots(input, clauses, register, rule.confidence, context, true),
                intensity: "extreme",
                pragmaticProfanityRole: rule.role,
                ...(rule.slots ?? {}),
            };
            if (!slots.emphasisSources.includes("profanity")) slots.emphasisSources.push("profanity");
            matches.push({ ruleId: rule.id, role: rule.role, confidence: rule.confidence, normalized, slots });
        } catch {
            // Optional research rules are advisory; malformed data must not block chat rendering.
        }
        if (matches.length >= 2) break;
    }
    return matches;
}

function captureAnalysis(dataset: SlangDataset, input: string, context?: TranslationContext): SourceAnalysis {
    let language = detectSourceLanguage(dataset, input, context);
    if (!language && /[A-Za-z]/u.test(input) && (dataset.incoming_chat_rules ?? []).some(rule => {
        if (normalizeLanguageCode(rule.language) !== "en" || !rule.current || !rule.can_recognize) return false;
        try { return new RegExp(rule.pattern, "iu").test(input); } catch { return false; }
    })) language = "en";
    if (!language && /[A-Za-z]/u.test(input) && (dataset.source_normalization_rules ?? []).some(rule => {
        if (normalizeLanguageCode(rule.language) !== "en" || !rule.current || !rule.can_recognize) return false;
        try { return new RegExp(rule.pattern, "iu").test(input); } catch { return false; }
    })) language = "en";
    const recognizedEntities = recognizeContextEntities(input, context);
    const normalizedSource = applySourceNormalizations(dataset, input, language, context);
    const analysisInput = normalizedSource.text;
    const matchedSlangIds = new Set<string>();
    const matchedForms = new Set<string>();
    const source = language ? getDatasetLanguage(dataset, language) : undefined;
    let datasetScore = 0;

    if (source) {
        for (const entry of source.slang ?? []) {
            if (!entry.can_recognize) continue;
            const matched = (entry.forms ?? []).find(form => {
                try {
                    return entryPattern(entry, form, source.code, "iu").test(input);
                } catch {
                    return false;
                }
            });
            if (!matched) continue;
            matchedSlangIds.add(entry.id);
            matchedForms.add(matched.toLocaleLowerCase());
            const registers = entry.register ?? [];
            const strength = registers.includes("heavy") ? 3 : registers.includes("slang") ? 2 : 1;
            datasetScore += strength;
        }

        for (const reaction of source.reactions ?? []) {
            if (reaction.form && containsPhrase(input, reaction.form, source.code)) datasetScore += 2;
        }
        for (const profanity of source.profanity ?? []) {
            for (const form of String(profanity.source).split(/\s*\/\s*/g)) {
                if (containsPhrase(input, form, source.code)) datasetScore += 3;
            }
        }
    }

    const letters = input.match(/[\p{L}]/gu)?.join("") ?? "";
    const firstLetter = input.match(/[\p{L}]/u)?.[0] ?? "";
    const laughter = /(?:ахах|хаха|хех|лол|lmao|lol|😂|🤣|ㅋㅋ|www|笑)/iu.test(input);
    const profanity = datasetScore >= 3 && !!source?.profanity?.some(entry => String(entry.source).split(/\s*\/\s*/g).some(form => containsPhrase(input, form, source.code)));
    const tokenCount = Math.max(1, input.match(/[\p{L}\p{N}]+/gu)?.length ?? 1);
    const slangTokenCount = matchedSlangIds.size;
    const slangDensity = slangTokenCount / tokenCount;
    const compressedForms = [...matchedForms].filter(form => form.length <= 5 || !/[aeiouаеёиоуыэюяіїєąęó]/iu.test(form)).length;
    const punctuationIntensity = (/(?:[!?！？]{2,}|\.{2,}|…|\n)/u.test(input) ? 1 : 0) +
        (/[!?！？]{3,}\s*$/u.test(input) || (letters.length >= 4 && letters === letters.toLocaleUpperCase()) ? 1 : 0);
    const compressionScore = Math.min(3,
        compressedForms +
        (!/[.!?！？。]\s*$/u.test(input) ? 1 : 0) +
        (/^(?:[\p{L}\p{N}_'-]+\s+){0,3}[\p{L}\p{N}_'-]+[!?！？…]*$/u.test(input.trim()) ? 1 : 0),
    );
    const detectedProfanityStrength = profanity ? Math.min(3, 1 + (/[!?！？]{2,}|\b(?:fuck|fucking|нахуй|пиздец|kurwa|씨발|他妈的)\b/iu.test(input) ? 1 : 0)) : 0;
    let sourceSlangScore = datasetScore;
    if (laughter) sourceSlangScore++;
    if (letters && letters === letters.toLocaleLowerCase()) sourceSlangScore++;
    if (!/[.!?！？]/u.test(input)) sourceSlangScore++;
    if (/[!?！？]{3,}\s*$/u.test(input)) sourceSlangScore++;

    const clauses = analyzeClauses(analysisInput);
    let register = detectSocialRegister(dataset, analysisInput, language, context);
    if (language === "en" && register === "neutral" && inferContextDomain(input, context) === "chat" &&
        /\b(?:you|youre|you're|your|idk|nah|sup|dude|bro|gf|brb|finna|gonna|gotta|ain't|aint)\b/iu.test(input)) register = "informal";
    const semanticMatches = findSemanticMatches(dataset, analysisInput, language, context);
    const pragmaticProfanity = findPragmaticProfanityMatches(dataset, analysisInput, language, clauses, register, context);
    const incomingChatMatches = findIncomingChatMatches(
        dataset, analysisInput, language, clauses, register, recognizedEntities, context,
    );
    const semanticSlots = [
        ...semanticMatches.map(match => ({
            ...baseSemanticSlots(input, clauses, register, match.confidence, context, profanity),
            intent: match.id,
            ...(match.slots ?? {}),
        })),
        ...pragmaticProfanity.map(match => match.slots),
        ...incomingChatMatches.map(match => match.slots),
    ];
    const signals = contextSignals(input, context);
    const contextEvidence = [
        ...signals,
        ...recognizedEntities.map(entity => `entity:${entity.kind}:${entity.evidence}:${entity.canonical}`),
        ...((context?.previousTurns ?? []).filter(turn => (turn.relevance ?? 0) >= 3).map(turn => `turn_relevance:${turn.relevance}`)),
    ];
    const providerSafeInput = incomingChatMatches.find(match => match.confidence !== "low")?.normalized ?? analysisInput;
    return {
        language,
        matchedSlangIds,
        matchedForms,
        laughter,
        profanity,
        confusionInterjection: /^\s*(?:ч[её]|що|что|а|эм|мм|huh|what)\s*[?!]+\s*$/iu.test(input),
        semanticMatches,
        pragmaticProfanity,
        semanticSlots,
        clauses,
        contextSignals: signals,
        selectedTransformations: [
            ...semanticMatches.filter(match => match.confidence !== "low").map(match => `semantic:${match.id}`),
            ...pragmaticProfanity.filter(match => match.confidence !== "low").map(match => `profanity:${match.ruleId}:${match.role}`),
            ...incomingChatMatches.filter(match => match.confidence !== "low").map(match => `incoming:${match.ruleId}:${match.sense}`),
            ...normalizedSource.typos.map(change => `typo:${change.source}->${change.normalized}`),
            ...normalizedSource.abbreviations.map(change => `abbr:${change.form}->${change.meaning}`),
            ...normalizedSource.expressive.map(change => `expressive:${change.source}->${change.normalized}`),
        ],
        recognizedEntities,
        normalizedTypos: normalizedSource.typos,
        recognizedAbbreviations: [
            ...normalizedSource.abbreviations,
            ...incomingChatMatches.flatMap(match => Object.entries(match.abbreviations)
                .map(([form, meaning]) => ({ form, meaning, confidence: match.confidence }))),
        ],
        selectedSenses: incomingChatMatches.map(match => ({ token: match.ruleId, sense: match.sense, confidence: match.confidence })),
        contextEvidence,
        incomingChatMatches,
        providerSafeInput,
        register,
        mixedLanguage: hasMixedScripts(input),
        style: {
            noCommas: !/[,;:，；：]/u.test(input),
            noSentencePunctuation: !/[.!?！？。]/u.test(input),
            allLowercase: letters.length > 0 && letters === letters.toLocaleLowerCase(),
            allUppercase: letters.length > 0 && letters === letters.toLocaleUpperCase() && letters !== letters.toLocaleLowerCase(),
            startsLowercase: !!firstLetter && firstLetter === firstLetter.toLocaleLowerCase(),
            endingMarks: input.match(/[!?！？]+\s*$/u)?.[0]?.trim() ?? "",
            endingEllipsis: input.match(/(?:\.{2,}|…+)\s*$/u)?.[0]?.trim() ?? "",
            sourceSlangScore: sourceSlangScore + normalizedSource.abbreviations.length + normalizedSource.expressive.length,
            slangDensity,
            slangTokenCount,
            compressionScore,
            punctuationIntensity,
            profanityStrength: detectedProfanityStrength,
        },
    };
}

function levelForMode(mode: ChatStyle, style: TranslationStyle): StyleLevel {
    if (mode === "clean") return 0;
    if (mode === "casual") return 1;
    if (mode === "slang") return 2;
    if (mode === "heavy") return 3;
    const dimensions = Number(style.slangTokenCount >= 2 || style.slangDensity >= 0.3) +
        Number(style.compressionScore >= 2) + Number(style.punctuationIntensity >= 1) +
        Number(style.profanityStrength >= 2);
    // Heavy requires several independent style dimensions; one token or one swear is not enough.
    if (
        dimensions >= 3 &&
        ((style.slangTokenCount >= 3 && style.slangDensity >= 0.2) || (style.slangTokenCount >= 2 && style.profanityStrength >= 2))
    ) return 3;
    if (
        style.slangTokenCount >= 2 ||
        (style.slangTokenCount >= 1 && (style.compressionScore >= 2 || style.punctuationIntensity >= 1)) ||
        (style.profanityStrength >= 2 && style.compressionScore >= 2)
    ) return 2;
    return 1;
}

function canonicalForRecognition(entry: SlangEntry): string | null {
    const canonical = entry.canonical?.trim();
    if (!canonical || canonical.includes(" / ") || canonical.includes(";")) return null;
    if (/\bdepending\b/i.test(entry.meaning ?? "")) return null;
    return canonical;
}

function applyDatasetRecognition(dataset: SlangDataset, input: string, sourceLanguage: string | null): string {
    if (!sourceLanguage) return input;
    const language = getDatasetLanguage(dataset, sourceLanguage);
    if (!language) return input;
    let output = input;
    const entries = [...language.slang]
        .filter(entry => entry.can_recognize)
        .sort((a, b) => Math.max(0, ...b.forms.map(form => form.length)) - Math.max(0, ...a.forms.map(form => form.length)));

    for (const entry of entries) {
        const canonical = canonicalForRecognition(entry);
        if (!canonical) continue;
        for (const form of [...entry.forms].sort((a, b) => b.length - a.length)) {
            if (!form.trim() || normalizeComparable(form) === normalizeComparable(canonical)) continue;
            // Numeric chat forms collide with quantities, scores and item IDs.
            // Only syntax-bounded source_normalization_rules may expand them.
            if (/^\d+$/u.test(form)) continue;
            try {
                output = output.replace(entryPattern(entry, form, language.code), canonical);
            } catch {
                // Invalid research rows must not block sending.
            }
        }
    }
    return output;
}

function semanticMappingById(dataset: SlangDataset, id: string): SemanticMapping | undefined {
    return (dataset.semantic_mappings ?? []).find(mapping => mapping.id === id);
}

function applySemanticRecognition(
    dataset: SlangDataset,
    input: string,
    matches: SemanticMatch[],
): string {
    let output = input;
    for (const match of matches) {
        if (match.confidence === "low") continue;
        const mapping = semanticMappingById(dataset, match.id);
        const spec = mapping && sourceSpec(mapping, match.sourceLanguage);
        if (!spec?.normalized.trim()) continue;
        try {
            output = output.replace(
                phraseRegex(match.form, match.sourceLanguage, spec.case_sensitive ? "u" : "iu", spec.whole_word !== false),
                matched => preserveInitialCase(matched, spec.normalized),
            );
        } catch {
            // Recognition data is advisory and must never block translation.
        }
    }
    return output;
}

function pragmaticRuleById(dataset: SlangDataset, id: string): PragmaticProfanityRule | undefined {
    return dataset.pragmatic_profanity_rules?.find(rule => rule.id === id);
}

function applyPragmaticProfanityNormalization(
    dataset: SlangDataset,
    input: string,
    matches: PragmaticProfanityMatch[],
): string {
    let output = input;
    for (const match of matches) {
        if (match.confidence === "low") continue;
        const rule = pragmaticRuleById(dataset, match.ruleId);
        if (!rule?.normalized.trim()) continue;
        try {
            output = output.replace(new RegExp(rule.pattern, "iu"), rule.normalized);
        } catch {
            // A malformed optional pragmatic rule must not block provider fallback.
        }
    }
    return output;
}

function semanticStyleCandidates(outputs: SemanticOutputs, level: StyleLevel, canGenerate: boolean): string[] {
    if (level === 0) return outputs.clean;
    if (level === 1 || !canGenerate) return outputs.casual.length ? outputs.casual : outputs.clean;
    if (level === 2) return outputs.slang.length ? outputs.slang : outputs.casual.length ? outputs.casual : outputs.clean;
    return outputs.heavy.length ? outputs.heavy : outputs.slang.length ? outputs.slang : outputs.casual.length ? outputs.casual : outputs.clean;
}

function emojiTail(input: string): string {
    return input.match(/\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier}|\u200D\p{Extended_Pictographic})*/gu)?.join(" ") ?? "";
}

function findSemanticShortcut(
    dataset: SlangDataset,
    original: string,
    matches: SemanticMatch[],
    targetLanguage: string,
    level: StyleLevel,
): string | null {
    for (const match of matches) {
        if (match.confidence === "low" || semanticComparable(original) !== semanticComparable(match.form)) continue;
        const mapping = semanticMappingById(dataset, match.id);
        const outputs = mapping && semanticOutput(mapping, targetLanguage);
        if (!mapping || !outputs) continue;
        const selected = chooseStyledCandidate(
            dataset,
            semanticStyleCandidates(outputs, level, mapping.can_generate),
            targetLanguage,
            level,
        );
        if (!selected) continue;
        const emoji = emojiTail(original);
        return emoji && !selected.includes(emoji) ? `${selected} ${emoji}` : selected;
    }
    return null;
}

function findPragmaticProfanityShortcut(
    dataset: SlangDataset,
    original: string,
    matches: PragmaticProfanityMatch[],
    targetLanguage: string,
    level: StyleLevel,
): string | null {
    for (const match of matches) {
        if (match.confidence === "low") continue;
        const rule = pragmaticRuleById(dataset, match.ruleId);
        if (!rule?.can_generate) continue;
        const target = normalizeLanguageCode(targetLanguage);
        const outputs = Object.entries(rule.outputs ?? {}).find(([code]) => normalizeLanguageCode(code) === target)?.[1];
        if (!outputs) continue;
        const selected = chooseStyledCandidate(dataset, semanticStyleCandidates(outputs, level, true), target, level);
        if (!selected) continue;
        const emoji = emojiTail(original);
        return emoji && !selected.includes(emoji) ? `${selected} ${emoji}` : selected;
    }
    return null;
}

function incomingChatRuleById(dataset: SlangDataset, id: string): IncomingChatRule | undefined {
    return dataset.incoming_chat_rules?.find(rule => rule.id === id);
}

function findIncomingChatShortcut(
    dataset: SlangDataset,
    original: string,
    matches: IncomingChatMatch[],
    targetLanguage: string,
    level: StyleLevel,
): string | null {
    const target = normalizeLanguageCode(targetLanguage);
    for (const match of matches) {
        if (match.confidence === "low") continue;
        const rule = incomingChatRuleById(dataset, match.ruleId);
        if (!rule?.can_generate) continue;
        const outputs = Object.entries(rule.outputs ?? {}).find(([code]) => normalizeLanguageCode(code) === target)?.[1];
        if (!outputs) continue;
        const candidates = semanticStyleCandidates(outputs, level, true).map(candidate => expandCaptures(candidate, match.captures));
        const selected = chooseStyledCandidate(dataset, candidates, target, level);
        if (!selected) continue;
        const emoji = emojiTail(original);
        return emoji && !selected.includes(emoji) ? `${selected} ${emoji}` : selected;
    }
    return null;
}

function applySemanticFailureCorrections(
    dataset: SlangDataset,
    input: string,
    matches: SemanticMatch[],
    targetLanguage: string,
    level: StyleLevel,
): string {
    let output = input;
    const target = normalizeLanguageCode(targetLanguage);
    for (const match of matches) {
        if (match.confidence !== "high") continue;
        const mapping = semanticMappingById(dataset, match.id);
        const natural = mapping && semanticOutput(mapping, target);
        const failures = mapping && Object.entries(mapping.literal_failures ?? {})
            .find(([code]) => normalizeLanguageCode(code) === target)?.[1];
        if (!mapping || !natural || !failures?.length) continue;
        const replacement = semanticStyleCandidates(natural, level, mapping.can_generate)[0];
        if (!replacement) continue;
        for (const failure of failures) {
            try {
                output = output.replace(phraseRegex(failure, target), replacement);
            } catch {
                // Ignore invalid optional correction rows.
            }
        }
    }
    return output;
}

function baseGenerationAllowed(entry: SlangEntry, language: DatasetLanguage, level: StyleLevel): boolean {
    // Casual is natural conversational prose; abbreviations begin at explicit Slang.
    if (level < 2 || !entry.current || entry.outdated || !entry.can_generate) return false;
    const registers = entry.register ?? [];
    const minimum = registers.length
        ? Math.min(...registers.map(register => REGISTER_LEVEL[register] ?? 3))
        : 2;
    if (level < Math.max(2, minimum)) return false;
    const entryRegion = entry.region?.toLocaleLowerCase();
    const languageRegion = language.region?.toLocaleLowerCase();
    if (
        entryRegion && !entryRegion.includes("global") && languageRegion && !languageRegion.includes("global") &&
        !entryRegion.includes(languageRegion) && !languageRegion.includes(entryRegion)
    ) return false;
    if (entry.contexts?.length && !entry.contexts.some(context => ["discord", "gaming", "chat", "texting"].includes(context))) return false;
    return true;
}

function generationAllowed(entry: SlangEntry, language: DatasetLanguage, level: StyleLevel, input: string): boolean {
    if (!baseGenerationAllowed(entry, language, level)) return false;
    if (!entry.requires_generation_ids?.length) return true;
    return entry.requires_generation_ids.every(id => {
        const dependency = language.slang.find(candidate => candidate.id === id);
        if (!dependency || !baseGenerationAllowed(dependency, language, level)) return false;
        return [canonicalForRecognition(dependency), ...(dependency.generation_sources ?? [])]
            .some(source => !!source && containsPhrase(input, source, language.code));
    });
}

function chooseDatasetForm(entry: SlangEntry, level: StyleLevel): string | null {
    const forms = entry.forms.filter(form => !!form.trim());
    if (!forms.length) return null;
    const canonical = normalizeComparable(entry.canonical);
    const alternatives = forms.filter(form => normalizeComparable(form) !== canonical);
    const candidates = alternatives.length ? alternatives : forms;
    return level >= 3
        ? [...candidates].sort((a, b) => a.length - b.length)[0]
        : candidates[0];
}

function applyDatasetGeneration(dataset: SlangDataset, input: string, targetLanguage: string, level: StyleLevel): string {
    const language = getDatasetLanguage(dataset, targetLanguage);
    if (!language || level < 2) return input;
    let output = input;
    const entries = [...language.slang]
        .filter(entry => generationAllowed(entry, language, level, input))
        .sort((a, b) => b.canonical.length - a.canonical.length);

    for (const entry of entries) {
        const canonical = canonicalForRecognition(entry);
        const replacement = chooseDatasetForm(entry, level);
        if (!replacement) continue;
        const sourceForms = [canonical, ...(entry.generation_sources ?? [])]
            .filter((value): value is string => !!value?.trim())
            .sort((a, b) => b.length - a.length);
        for (const sourceForm of sourceForms) {
            if (normalizeComparable(sourceForm) === normalizeComparable(replacement)) continue;
            try {
                output = output.replace(entryPattern(entry, sourceForm, language.code), replacement);
            } catch {
                // Ignore malformed rows.
            }
        }
    }
    return output;
}

function inferredPhraseTarget(sourceLanguage: string, phrase: PhraseEntry): string {
    if (phrase.target_language) return normalizeLanguageCode(phrase.target_language);
    const source = normalizeLanguageCode(sourceLanguage);
    // Backward compatibility for v1.0: EN/DE phrase outputs are native; other packs target EN.
    return source === "en" || source === "de" ? source : "en";
}

function candidateMatchesTarget(dataset: SlangDataset, candidate: string, sourceLanguage: string, targetLanguage: string): boolean {
    const target = normalizeLanguageCode(targetLanguage);
    const source = normalizeLanguageCode(sourceLanguage);
    if (target === source) return true;
    const detected = detectSourceLanguage(dataset, candidate);
    if (!detected) return true;
    return normalizeLanguageCode(detected) === target;
}

function phraseMode(level: StyleLevel): "casual" | "slang" | "heavy" {
    return level >= 3 ? "heavy" : level >= 2 ? "slang" : "casual";
}

function chooseNaturalOutput(
    dataset: SlangDataset,
    phrase: PhraseEntry,
    sourceLanguage: string,
    targetLanguage: string,
    level: StyleLevel,
): string | null {
    const outputs = phrase.natural_outputs;
    if (!outputs) return null;
    const modes: Array<"casual" | "slang" | "heavy"> = [phraseMode(level), "casual", "slang", "heavy"];
    for (const mode of modes) {
        for (const candidate of outputs[mode] ?? []) {
            if (candidateMatchesTarget(dataset, candidate, sourceLanguage, targetLanguage)) return candidate;
        }
    }
    return null;
}

function findPhraseShortcut(
    dataset: SlangDataset,
    original: string,
    sourceLanguage: string | null,
    targetLanguage: string,
    level: StyleLevel,
): string | null {
    if (!sourceLanguage || level === 0) return null;
    const source = getDatasetLanguage(dataset, sourceLanguage);
    if (!source) return null;
    const comparable = normalizeComparable(original);
    for (const phrase of source.phrases ?? []) {
        if (inferredPhraseTarget(source.code, phrase) !== normalizeLanguageCode(targetLanguage)) continue;
        if (!(phrase.source_examples ?? []).some(example => normalizeComparable(example) === comparable)) continue;
        const output = chooseNaturalOutput(dataset, phrase, source.code, targetLanguage, level);
        if (output) return output;
    }
    return null;
}

function candidateRegister(dataset: SlangDataset, candidate: string, targetLanguage: string): number {
    const normalized = normalizeComparable(candidate);
    const language = getDatasetLanguage(dataset, targetLanguage);
    let score = 0;
    if (/\b(?:fuck|fucking|shit|wtf|idgaf|нахуй|похуй|бля|пиздец)\b/iu.test(candidate)) score = 3;
    if (/\b(?:bro|dude|cooked|wild|insane|wanna|gonna|lmao|no way)\b/iu.test(candidate)) score = Math.max(score, 2);
    if (/\b(?:no clue|whatever|in a sec|one sec)\b/iu.test(candidate)) score = Math.max(score, 1);
    if (/['’]/u.test(candidate)) score = Math.max(score, 1);
    if (language) {
        for (const entry of language.slang) {
            if (!entry.forms.some(form => normalizeComparable(form) === normalized || containsPhrase(candidate, form, language.code))) continue;
            const compressed = entry.forms.some(form => normalizeComparable(form) === normalized && form.length <= 5);
            const registers = entry.register ?? [];
            const minimum = Math.min(3, ...registers.map(register => REGISTER_LEVEL[register] ?? 3));
            score = Math.max(score, compressed ? Math.max(2, minimum) : minimum);
        }
        for (const entry of language.gaming ?? []) {
            if ((entry.forms ?? []).some(form => normalizeComparable(form) === normalized)) score = Math.max(score, 2);
        }
    }
    if (/^(?:chat|server|game)\s+dead$/iu.test(candidate)) score = Math.max(score, 2);
    return score;
}

function grammaticalScore(candidate: string): number {
    let score = 0;
    if (/\b(?:is|are|am|do|does|have|has|will|can|know|care)\b/i.test(candidate)) score += 2;
    if (/^[A-ZА-ЯЁ]/u.test(candidate)) score++;
    if (/[.!?]$/u.test(candidate)) score++;
    return score;
}

function chooseStyledCandidate(dataset: SlangDataset, candidates: string[], targetLanguage: string, level: StyleLevel): string | null {
    const usable = candidates.filter(candidate => !!candidate.trim());
    if (!usable.length) return null;
    return [...usable].sort((a, b) => {
        const ar = candidateRegister(dataset, a, targetLanguage);
        const br = candidateRegister(dataset, b, targetLanguage);
        if (level === 0) return ar - br || grammaticalScore(b) - grammaticalScore(a) || b.length - a.length;
        if (level === 1) return Math.abs(ar - 1) - Math.abs(br - 1) || ar - br || grammaticalScore(b) - grammaticalScore(a);
        if (level === 2) return Math.abs(ar - 2) - Math.abs(br - 2) || a.length - b.length;
        return br - ar || a.length - b.length;
    })[0];
}

function findReactionShortcut(
    dataset: SlangDataset,
    original: string,
    sourceLanguage: string | null,
    targetLanguage: string,
    level: StyleLevel,
): string | null {
    if (!sourceLanguage) return null;
    const comparable = normalizeComparable(original);
    const source = getDatasetLanguage(dataset, sourceLanguage);
    const target = getDatasetLanguage(dataset, targetLanguage);
    if (!source || !target) return null;
    const targetCode = normalizeLanguageCode(target.code);
    const sourceCode = normalizeLanguageCode(source.code);

    for (const reaction of source.reactions ?? []) {
        if (normalizeComparable(reaction.form) !== comparable) continue;
        const equivalents = reaction.equivalents?.[targetCode] ?? [];
        const selected = chooseStyledCandidate(dataset, equivalents, targetCode, level);
        if (selected) {
            const ending = original.match(/[!?！？]+\s*$/u)?.[0]?.trim() ?? "";
            const sourceLetters = original.match(/\p{L}/gu)?.join("") ?? "";
            const cased = sourceLetters.length > 1 && sourceLetters === sourceLetters.toLocaleUpperCase()
                ? selected.toLocaleUpperCase()
                : selected;
            return ending && !/[!?！？]\s*$/u.test(cased) ? `${cased}${ending}` : cased;
        }
    }

    if (level > 0) {
        for (const reaction of target.reactions ?? []) {
            if (!reaction.current || reaction.outdated) continue;
            const equivalents = reaction.equivalents?.[sourceCode] ?? [];
            if (equivalents.some(value => normalizeComparable(value) === comparable)) return reaction.form;
        }
    }
    return null;
}

function findGamingShortcut(
    dataset: SlangDataset,
    original: string,
    sourceLanguage: string | null,
    targetLanguage: string,
    level: StyleLevel,
    context?: TranslationContext,
    protectedNames: string[] = [],
): string | null {
    const comparable = normalizeComparable(original);
    if (protectedNames.some(name => normalizeComparable(name) === comparable)) return null;
    const targetCode = normalizeLanguageCode(targetLanguage);
    const detectedSource = sourceLanguage ? getDatasetLanguage(dataset, sourceLanguage) : undefined;
    const languages = detectedSource
        ? [detectedSource]
        : [...dataset.languages].sort((a, b) => normalizeLanguageCode(a.code) === "en" ? -1 : normalizeLanguageCode(b.code) === "en" ? 1 : 0);
    for (const source of languages) {
        for (const entry of source.gaming ?? []) {
            if (!normalizationContextMatches({ ...entry, language: source.code }, original, context, original, true)) continue;
            if (!(entry.forms ?? []).some(form => normalizeComparable(form) === comparable)) continue;
            if (entry.keep_untranslated) return original.trim();
            const outputs = entry.translations?.[targetCode] ?? entry.translations?.[getDatasetLanguage(dataset, targetCode)?.code ?? ""] ?? [];
            const selected = chooseStyledCandidate(dataset, outputs, targetCode, level);
            if (selected) return selected;
        }
    }
    return null;
}

function profanityStrength(value: string): number {
    if (/\b(?:fuck|fucking|motherfuck|cunt|пиздец|нахуй)\b/iu.test(value)) return 3;
    if (/\b(?:shit|bullshit|wtf|damn)\b/iu.test(value)) return 2;
    return 1;
}

function findProfanityShortcut(
    dataset: SlangDataset,
    original: string,
    sourceLanguage: string | null,
    targetLanguage: string,
    level: StyleLevel,
    soften: boolean,
): string | null {
    if (!soften || !sourceLanguage || normalizeLanguageCode(targetLanguage) !== "en") return null;
    const source = getDatasetLanguage(dataset, sourceLanguage);
    if (!source) return null;
    const comparable = normalizeComparable(original);
    for (const entry of source.profanity ?? []) {
        const forms = String(entry.source).split(/\s*\/\s*/g);
        if (!forms.some(form => normalizeComparable(form) === comparable)) continue;
        const reaction = entry.meanings?.find(meaning => /reaction/i.test(meaning.context)) ?? entry.meanings?.find(meaning => !meaning.literal_allowed);
        const outputs = Array.isArray(reaction?.natural) ? reaction.natural : reaction?.natural ? [reaction.natural] : [];
        if (!outputs.length) return null;
        const sorted = [...outputs].sort((a, b) => profanityStrength(a) - profanityStrength(b));
        return level >= 3 ? sorted.at(-1)! : sorted[0];
    }
    return null;
}

function applyTranslationMistakes(
    dataset: SlangDataset,
    input: string,
    original: string,
    sourceLanguage: string | null,
    targetLanguage: string,
    level: StyleLevel,
): string {
    if (!sourceLanguage) return input;
    const sourceCode = normalizeLanguageCode(sourceLanguage);
    const targetCode = normalizeLanguageCode(targetLanguage);
    const originalComparable = normalizeComparable(original);
    let output = input;

    for (const mistake of dataset.translation_mistakes ?? []) {
        if (normalizeLanguageCode(mistake.source_language) !== sourceCode || normalizeLanguageCode(mistake.target_language) !== targetCode) continue;
        const patterns = mistake.source_patterns ?? [];
        const preferred = chooseStyledCandidate(dataset, mistake.preferred_outputs ?? [], targetCode, level);
        if (!preferred) continue;
        if (patterns.some(pattern => normalizeComparable(pattern) === originalComparable)) {
            output = preferred;
            continue;
        }
        if (!patterns.some(pattern => containsPhrase(original, pattern, sourceCode))) continue;
        for (const bad of mistake.bad_outputs ?? []) {
            if (!bad.trim()) continue;
            try {
                output = output.replace(phraseRegex(bad, targetCode), preferred);
            } catch {
                // Skip malformed research rows.
            }
        }
    }
    return output;
}

function inferredDomain(prepared: PreparedTranslation): TranslationContext["domain"] {
    return inferContextDomain(prepared.original, prepared.options.context);
}

function desiredRegister(prepared: PreparedTranslation): SocialRegister {
    if (prepared.analysis.register !== "neutral") return prepared.analysis.register;
    const domain = inferredDomain(prepared);
    if (domain === "business") return "formal";
    if (prepared.sourceLanguage && normalizeLanguageCode(prepared.sourceLanguage) === "en" && prepared.level > 0 &&
        (domain === "gaming" || domain === "chat")) return "informal";
    return "neutral";
}

function applyRegisterRepairs(
    dataset: SlangDataset,
    input: string,
    targetLanguage: string,
    register: SocialRegister,
): string {
    if (register === "neutral") return input;
    const target = normalizeLanguageCode(targetLanguage);
    let output = input;
    for (const repair of dataset.register_repairs ?? []) {
        if (normalizeLanguageCode(repair.target_language) !== target || repair.register !== register || repair.confidence === "low") continue;
        try {
            output = output.replace(new RegExp(repair.pattern, `${repair.case_sensitive ? "" : "i"}gu`), repair.replacement);
        } catch {
            // A malformed optional register row must not block a message.
        }
    }
    return output;
}

function naturalizationMode(level: StyleLevel): "casual" | "slang" | "heavy" {
    return level >= 3 ? "heavy" : level >= 2 ? "slang" : "casual";
}

function naturalizationOutput(rule: NaturalizationRule, level: StyleLevel): string | null {
    const mode = naturalizationMode(level);
    const fallbacks = mode === "heavy" ? ["heavy", "slang", "casual"] as const
        : mode === "slang" ? ["slang", "casual"] as const
            : ["casual"] as const;
    for (const candidateMode of fallbacks) {
        const candidates = rule.outputs[candidateMode];
        if (candidates?.length) return candidates[0];
    }
    return null;
}

function preserveInitialCase(match: string, replacement: string): string {
    const sourceLetter = match.match(/\p{L}/u)?.[0];
    const replacementIndex = replacement.search(/\p{L}/u);
    if (!sourceLetter || replacementIndex < 0 || sourceLetter !== sourceLetter.toLocaleUpperCase()) return replacement;
    const letter = replacement[replacementIndex];
    return replacement.slice(0, replacementIndex) + letter.toLocaleUpperCase() + replacement.slice(replacementIndex + letter.length);
}

function ruleContextMatches(rule: NaturalizationRule, input: string): boolean {
    if (rule.negative_patterns?.some(pattern => containsPhrase(input, pattern, rule.language))) return false;
    if (!rule.context_patterns?.length) return true;
    return rule.context_patterns.some(pattern => containsPhrase(input, pattern, rule.language));
}

function applyContrastRule(input: string, rule: NaturalizationRule, marker: string, level: StyleLevel): string {
    const alternatives = (rule.source_patterns ?? []).map(escapeRegex).join("|");
    if (!alternatives) return input;
    const middle = new RegExp(`^(.+?)[,;，；]\\s*(?:${alternatives})[,;，；]?\\s*(.+)$`, rule.case_sensitive ? "u" : "iu");
    const match = input.match(middle);
    if (match) {
        const first = match[1].trim();
        const second = match[2].trim();
        return level >= 2 && marker.toLocaleLowerCase() === "tho"
            ? `${first} ${marker}, ${second}`
            : `${first}, ${marker} ${second}`;
    }
    const leading = new RegExp(`^(?:${alternatives})[,;，；]?\\s*(.+)$`, rule.case_sensitive ? "u" : "iu");
    const leadingMatch = input.match(leading);
    if (!leadingMatch) return input;
    return level >= 2 && marker.toLocaleLowerCase() === "tho"
        ? `${leadingMatch[1].trim()} ${marker}`
        : `${marker} ${leadingMatch[1].trim()}`;
}

function applyNaturalizationRule(input: string, rule: NaturalizationRule, level: StyleLevel): string {
    const replacement = naturalizationOutput(rule, level);
    if (replacement === null || !ruleContextMatches(rule, input)) return input;
    if (rule.operation === "contrast") return applyContrastRule(input, rule, replacement, level);

    if (rule.operation === "regex") {
        if (!rule.pattern) return input;
        try {
            const flags = `${rule.case_sensitive ? "" : "i"}u${(rule.max_applications ?? 1) > 1 ? "g" : ""}`;
            return input.replace(new RegExp(rule.pattern, flags), replacement);
        } catch {
            return input;
        }
    }

    let output = input;
    let applications = 0;
    const limit = rule.max_applications ?? Number.POSITIVE_INFINITY;
    for (const source of [...(rule.source_patterns ?? [])].sort((a, b) => b.length - a.length)) {
        if (applications >= limit) break;
        try {
            const pattern = phraseRegex(source, rule.language, rule.case_sensitive ? "gu" : "giu", rule.whole_word !== false);
            output = output.replace(pattern, match => {
                if (applications >= limit) return match;
                applications++;
                return preserveInitialCase(match, replacement);
            });
        } catch {
            // Invalid research data must not block a translation.
        }
    }
    return output;
}

function applyNaturalizationRules(
    dataset: SlangDataset,
    input: string,
    targetLanguage: string,
    level: StyleLevel,
    register: SocialRegister = "neutral",
): string {
    const target = normalizeLanguageCode(targetLanguage);
    const stages: NaturalizationStage[] = ["formality", "clause", "grammar", "compression"];
    let output = input;
    for (const stage of stages) {
        for (const rule of dataset.naturalization_rules ?? []) {
            if (
                normalizeLanguageCode(rule.language) !== target || rule.stage !== stage ||
                !rule.current || !rule.can_generate || rule.confidence === "low" ||
                (register === "formal" && rule.changes_register)
            ) continue;
            output = applyNaturalizationRule(output, rule, level);
        }
    }
    return output;
}

function naturalizeClauses(
    dataset: SlangDataset,
    input: string,
    targetLanguage: string,
    level: StyleLevel,
    register: SocialRegister = "neutral",
): string {
    if (level === 0) return input;
    let output = applyNaturalizationRules(dataset, input, targetLanguage, level, register);
    if (languageBase(targetLanguage) === "en") output = applyRules(output, EN_CONTRACTIONS);
    return output.replace(/[ \t]{2,}/g, " ").trim();
}

function restoreStyle(input: string, prepared: PreparedTranslation): string {
    const { style } = prepared.analysis;
    const { options, mode, level, targetLanguage } = prepared;
    let output = input.trim();
    if (options.preserveStyle && mode !== "clean") {
        if (style.noCommas) {
            output = output.replace(/[,;:，；：]/g, "").replace(/[ \t]{2,}/g, " ");
        }
        if (style.noSentencePunctuation) output = output.replace(/[.!?！？。]+\s*$/g, "");
        if (style.endingEllipsis) {
            output = output.replace(/(?:\.{2,}|…+)\s*$/u, "").trimEnd() + style.endingEllipsis;
        } else if (style.endingMarks && !(mode === "heavy" && style.punctuationIntensity === 0 && !/[!?！？]\s*$/u.test(output))) {
            output = output.replace(/[!?！？]+\s*$/u, "").trimEnd() + style.endingMarks;
        }
        if (!/^[¿¡]/u.test(style.endingMarks) && languageBase(targetLanguage) === "es") output = output.replace(/^[¿¡]+/u, "");
        if (style.allUppercase) output = output.toLocaleUpperCase();
        else if (style.allLowercase || style.startsLowercase) output = output.toLocaleLowerCase();
    }
    if (
        languageBase(targetLanguage) === "en" &&
        options.dropEnglishApostrophes &&
        level >= 1 &&
        (mode !== "mirror" || style.allLowercase || style.startsLowercase || style.sourceSlangScore >= 2)
    ) {
        output = output.replace(/([A-Za-z])['’]([A-Za-z])/g, "$1$2");
    }
    return output.trim();
}

function crossRuleEnabled(dataset: SlangDataset, id: string): boolean {
    return dataset.cross_language_rules?.some(rule => rule.id === id) ?? false;
}

function protectText(
    dataset: SlangDataset,
    input: string,
    sourceLanguage: string | null,
    options: EngineOptions,
): { text: string; restore: (translated: string) => string; } {
    const values: string[] = [];
    const termForms = new Map<number, NonNullable<GamingEntry["translation_inflections"]>[string]>();
    let salt = hashText(input);
    while (input.toLocaleUpperCase().includes(`SONYPROTECT${salt}`)) salt += "X";
    let text = input;
    const tokenFor = (index: number) => `SONYPROTECT${salt}TOKEN${index}END`;
    const protectValue = (value: string, forms?: NonNullable<GamingEntry["translation_inflections"]>[string]) => {
        const index = values.push(value) - 1;
        if (forms) termForms.set(index, forms);
        return tokenFor(index);
    };
    const protectPattern = (
        pattern: RegExp,
        predicate?: (value: string) => boolean,
        canonical?: (value: string) => string,
        forms?: NonNullable<GamingEntry["translation_inflections"]>[string],
    ) => {
        text = text.replace(pattern, value => {
            if (value.includes("SONYPROTECT") || (predicate && !predicate(value))) return value;
            return protectValue(canonical ? canonical(value) : value, forms);
        });
    };

    if (crossRuleEnabled(dataset, "protect_code_blocks")) protectPattern(/```[\s\S]*?```/g);
    if (crossRuleEnabled(dataset, "protect_inline_code")) protectPattern(/`[^`\n]+`/g);
    if (crossRuleEnabled(dataset, "protect_urls")) {
        protectPattern(/(?:https?:\/\/|www\.)[^\s<>]+/giu);
        protectPattern(/\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|gg|dev|app)(?:\/[^\s<>]*)?/giu);
    }
    if (crossRuleEnabled(dataset, "protect_discord_mentions")) protectPattern(/<@!?\d+>|<@&\d+>|<#\d+>|@[A-Za-z0-9_.-]+/giu);
    if (crossRuleEnabled(dataset, "protect_custom_discord_emojis")) protectPattern(/<a?:[A-Za-z0-9_]+:\d+>/giu);
    if (crossRuleEnabled(dataset, "protect_emojis")) {
        protectPattern(/\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier}|\u200D\p{Extended_Pictographic})*/gu);
    }
    if (crossRuleEnabled(dataset, "protect_timestamps")) {
        protectPattern(/<t:\d+(?::[tTdDfFR])?>/giu);
        protectPattern(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})\b/giu);
    }
    if (crossRuleEnabled(dataset, "protect_hashtags")) protectPattern(/#[\p{L}\p{N}_-]+/giu);
    if (crossRuleEnabled(dataset, "protect_file_paths")) {
        protectPattern(/[A-Za-z]:\\(?:[^\\\s]+\\)*[^\\\s]*/g);
        protectPattern(/(?:\.{0,2}\/)+(?:[^\s/]+\/)*[^\s/]+/g);
        protectPattern(/(?<![\p{L}\p{N}_-])[\p{L}\p{N}_-]+\.(?:tsx?|jsx?|json|ya?ml|toml|md|txt|csv|png|jpe?g|gif|webp|mp[34]|pdf|exe|py|cs|cpp|h|java|kt|log|zip)(?![\p{L}\p{N}_-])/giu);
    }
    if (crossRuleEnabled(dataset, "protect_cli")) protectPattern(/--?[A-Za-z][\w-]*/g);
    if (crossRuleEnabled(dataset, "protect_versions")) protectPattern(/\bv?\d+(?:\.\d+){1,}(?:[-+._][A-Za-z0-9]+)*\b/giu);
    if (crossRuleEnabled(dataset, "protect_acronyms")) protectPattern(/\b(?:GG|GGWP|AFK|OP|FPS|DPS|PVP|PVE|NPC|CPU|GPU|RAM|API|SDK)\b/giu);
    protectPattern(/\b[0-9a-f]{8,64}\b/giu);

    if (options.protectNames) {
        for (const entity of recognizeContextEntities(input, options.context)) {
            const pattern = new RegExp(
                `(?<![\\p{L}\\p{N}_])${escapeRegex(entity.source)}(?![\\p{L}\\p{N}_])`,
                "giu",
            );
            protectPattern(pattern, undefined, () => entity.canonical);
        }
    }

    const source = sourceLanguage ? getDatasetLanguage(dataset, sourceLanguage) : undefined;
    const gamingContext = (source?.gaming ?? []).some(entry => (entry.forms ?? []).some(form => {
        if (form.length < 2) return false;
        return containsPhrase(input, form, source!.code) && normalizeComparable(input) !== normalizeComparable(form);
    })) || /\b(?:game|match|server|team|player|rank|queue|игр|катк|сервер|тим|матч)\b/iu.test(input);
    for (const gaming of source?.gaming ?? []) {
        if (!gaming.keep_untranslated) continue;
        if (!normalizationContextMatches({ ...gaming, language: source!.code }, input, options.context, input, true)) continue;
        for (const form of gaming.forms ?? []) {
            if (form.length < 2) continue;
            const unambiguous = form === form.toLocaleUpperCase() && /[\p{L}]/u.test(form) || /\d/u.test(form);
            const exact = normalizeComparable(input) === normalizeComparable(form);
            if (!unambiguous && !exact && !gamingContext) continue;
            try {
                protectPattern(phraseRegex(form, source!.code));
            } catch {
                // Ignore malformed research rows.
            }
        }
    }

    if (options.protectNames && crossRuleEnabled(dataset, "mixed_language_protection")) {
        const custom = options.customProtectedNames.split(/[,;\n]/g).map(value => value.trim()).filter(Boolean);
        const entities = dataset.protected_entities
            .filter(entity => entity.always_keep)
            .flatMap(entity => [entity.name, ...(entity.aliases ?? [])].map(name => ({ entity, name, custom: false })));
        const names = [...entities, ...custom.map(name => ({ entity: null, name, custom: true }))]
            .sort((a, b) => b.name.length - a.name.length);
        for (const item of names) {
            const escaped = escapeRegex(item.name).replace(/\\\s+/g, "\\s+");
            const isHan = /[\u3400-\u9fff]/u.test(item.name);
            const pattern = isHan
                ? new RegExp(escaped, "gi")
                : new RegExp(`(?<![\\p{L}\\p{N}_'’])${escaped}(?![\\p{L}\\p{N}_'’])`, "giu");
            protectPattern(pattern, value => item.custom || item.entity?.protect_lowercase !== false || value !== value.toLocaleLowerCase());
        }

        if (/[\p{Script=Cyrillic}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(input)) {
            // Preserve deliberate CamelCase/model tokens, but not every Title-Case hyphenated phrase.
            protectPattern(/\b(?=[A-Za-z0-9.+#_-]*[A-Z])(?=[A-Za-z0-9.+#_-]*[a-z])[A-Za-z]*[a-z][A-Z][A-Za-z0-9.+#_-]*\b/g);
            protectPattern(/\b(?:[A-Z]{2,}|[A-Z][a-z]+)\s+\d[A-Za-z0-9.-]*(?:\s+[A-Z0-9][A-Za-z0-9.-]*){0,3}\b/g);
            protectPattern(/\b[A-Z][A-Za-z0-9.+#'_-]*(?:\s+(?:[A-Z][A-Za-z0-9.+#'_-]*|\d+[A-Za-z0-9.+#'_-]*)){1,4}\b/g);
        }
    }

    // Technical semantic slots come after code, member names and custom entities.
    // Otherwise a member named "Crit Rate" could be translated as a stat.
    if (options.smartSourceSlang) for (const gaming of source?.gaming ?? []) {
        if (!gaming.protect_translation) continue;
        if (!normalizationContextMatches({ ...gaming, language: source!.code }, input, options.context, input, true)) continue;
        const term = Object.entries(gaming.translations ?? {})
            .find(([code]) => normalizeLanguageCode(code) === normalizeLanguageCode(options.targetLanguage))?.[1]?.[0];
        if (!term) continue;
        const forms = Object.entries(gaming.translation_inflections ?? {})
            .find(([code]) => normalizeLanguageCode(code) === normalizeLanguageCode(options.targetLanguage))?.[1];
        for (const form of gaming.forms ?? []) {
            try { protectPattern(phraseRegex(form, source!.code), undefined, () => term, forms); }
            catch { /* Malformed optional term data falls back to the provider. */ }
        }
    }

    return {
        text,
        restore(translated: string) {
            let result = translated;
            values.forEach((value, index) => {
                const token = tokenFor(index);
                // Opaque transport placeholders occasionally get a spurious
                // "labelled" wrapper. Remove it only beside our technical slot
                // and only when the source never described a label/mark/tag.
                if (termForms.has(index) && normalizeLanguageCode(options.targetLanguage) === "ru" &&
                    !/\b(?:label(?:led|ed)?|mark(?:ed|ing)?|tag)\b/iu.test(input)) {
                    result = result.replace(new RegExp(`(?<![\\p{L}])(с\\s+)маркировкой\\s+(?=${escapeRegex(token)})`, "giu"), "$1");
                }
                result = result.replace(new RegExp(escapeRegex(token), "gi"), (_matched, offset: number) => {
                    const forms = termForms.get(index);
                    if (!forms || normalizeLanguageCode(options.targetLanguage) !== "ru") return value;
                    const prefix = result.slice(Math.max(0, offset - 100), offset);
                    // Only the protected technical term is inflected. Never run
                    // morphology over arbitrary names, code or surrounding text.
                    if (/(?:^|[^\p{L}])(?:с|со)\s+\d[\d.,]*\s*%\s*$/iu.test(prefix)) return forms.instrumental ?? value;
                    if (/(?:^|[^\p{L}])при\s+\d[\d.,]*\s*%\s*$/iu.test(prefix)) return forms.prepositional ?? value;
                    if (/(?:\d[\d.,]*\s*%\s*|(?:^|[^\p{L}])(?:без|вместо|для|до|от)\s+)(?:(?:дополнительного|высокого|низкого|двойного|нового)\s+)?$/iu.test(prefix)) return forms.genitive ?? value;
                    if (/(?:^|[^\p{L}])(?:с|со)\s+(?:(?:двойным|дополнительным|высоким|низким|полным|новым)\s+)?$/iu.test(prefix)) return forms.instrumental ?? value;
                    if (/(?:^|[^\p{L}])(?:о|об|при)\s+(?:(?:двойном|дополнительном|высоком|низком|новом)\s+)?$/iu.test(prefix)) return forms.prepositional ?? value;
                    if (/(?:^|[^\p{L}])к\s+(?:(?:двойному|дополнительному|высокому|низкому|новому)\s+)?$/iu.test(prefix)) return forms.dative ?? value;
                    return value;
                });
            });
            return result;
        },
    };
}

function normalizeAmbiguousProfanity(input: string): string {
    return input
        .replace(/(?<![\p{L}\p{N}_])(нам|мне|тебе|ему|ей|им)\s+пизда(?![\p{L}\p{N}_])/giu, "$1 конец")
        .replace(/(?<![\p{L}\p{N}_])пизда(?![\p{L}\p{N}_])/giu, "чёрт");
}

function hasTranslatableText(dataset: SlangDataset, input: string): boolean {
    const stripped = input.replace(/```[\s\S]*?```|`[^`\n]+`|(?:https?:\/\/|www\.)[^\s<>]+|<@!?\d+>|<@&\d+>|<#\d+>|<a?:[A-Za-z0-9_]+:\d+>|<t:\d+(?::[tTdDfFR])?>/giu, "");
    return /[\p{L}]/u.test(stripped) || detectSourceLanguage(dataset, stripped) !== null;
}

export function createTranslationEngine(rawDataset: unknown): TranslationEngine {
    const dataset = rawDataset as SlangDataset;
    return {
        dataset,
        detectSourceLanguage: (input, context) => detectSourceLanguage(dataset, input, context),
        analyzeSource: (input, context) => captureAnalysis(dataset, input, context),
        naturalize: (input, targetLanguage, level, register = "neutral") => naturalizeClauses(dataset, input, targetLanguage, level, register),
        prepare(input, options) {
            const analysis = captureAnalysis(dataset, input, options.context);
            const level = levelForMode(options.mode, analysis.style);
            // Incoming Cyrillic text already in the reading language is data to keep,
            // not a request to autocorrect or restyle the author's own wording.
            const preserveTargetText = shouldPreserveIncoming(dataset, input, analysis.language, options);
            const chatMatch = analysis.incomingChatMatches.find(match => match.confidence !== "low");
            const emoji = emojiTail(input);
            const providerSource = chatMatch && !preserveTargetText
                ? `${chatMatch.normalized}${emoji && !chatMatch.normalized.includes(emoji) ? ` ${emoji}` : ""}`
                : input;
            const protectedText = protectText(dataset, providerSource, analysis.language, options);
            let working = protectedText.text;
            if (options.smartSourceSlang && !preserveTargetText) {
                working = applySourceNormalizations(dataset, working, analysis.language, options.context, input).text;
                working = applyPragmaticProfanityNormalization(dataset, working, analysis.pragmaticProfanity);
                working = applySemanticRecognition(dataset, working, analysis.semanticMatches);
                if (analysis.language === "ru" || analysis.language === "uk") working = applyRules(working, SOURCE_NORMALIZATION_RULES);
                working = applyDatasetRecognition(dataset, working, analysis.language);
            }
            if (options.softenAmbiguousProfanity && options.kind === "sent") working = normalizeAmbiguousProfanity(working);

            const foreignSegments = preserveTargetText && !options.preserveMixedEnglish &&
                ["ru", "uk", "ja", "ko", "zh-cn", "zh-tw"].includes(normalizeLanguageCode(options.targetLanguage))
                ? [...working.matchAll(/(?<![\p{L}\p{N}_])(?:(?!SONYPROTECT)[A-Za-z][A-Za-z'-]*)(?:[ \t]+(?!SONYPROTECT)[A-Za-z][A-Za-z'-]*)*/gu)]
                    .map(match => ({ text: match[0], index: match.index! }))
                : [];
            const shortcut = preserveTargetText
                ? (foreignSegments.length ? null : input)
                :
                findIncomingChatShortcut(dataset, input, analysis.incomingChatMatches, options.targetLanguage, level) ??
                findPragmaticProfanityShortcut(dataset, input, analysis.pragmaticProfanity, options.targetLanguage, level) ??
                findSemanticShortcut(dataset, input, analysis.semanticMatches, options.targetLanguage, level) ??
                findReactionShortcut(dataset, input, analysis.language, options.targetLanguage, level) ??
                findPhraseShortcut(dataset, input, analysis.language, options.targetLanguage, level) ??
                findGamingShortcut(dataset, input, analysis.language, options.targetLanguage, level, options.context,
                    options.protectNames ? [
                        ...options.customProtectedNames.split(/[,;\n]/g).map(name => name.trim()).filter(Boolean),
                        ...analysis.recognizedEntities.map(entity => entity.source),
                    ] : []) ??
                findProfanityShortcut(dataset, input, analysis.language, options.targetLanguage, level, options.softenAmbiguousProfanity);

            analysis.providerSafeInput = protectedText.restore(working);
            return {
                preserveTargetText,
                foreignSegments,
                original: input,
                text: working,
                sourceLanguage: analysis.language,
                targetLanguage: options.targetLanguage,
                mode: options.mode,
                level,
                options,
                analysis,
                shortcut,
                restore: protectedText.restore,
            };
        },
        finalize(prepared, providerOutput) {
            if (prepared.preserveTargetText) return prepared.restore(prepared.shortcut ?? providerOutput);
            let output = prepared.shortcut ?? providerOutput;
            // A style-specific dataset shortcut is already more precise than the generic
            // mistake candidates; only repair actual provider output.
            if (!prepared.shortcut) {
                output = applySemanticFailureCorrections(
                    dataset,
                    output,
                    prepared.analysis.semanticMatches,
                    prepared.targetLanguage,
                    prepared.level,
                );
                output = applyTranslationMistakes(
                    dataset,
                    output,
                    prepared.original,
                    prepared.sourceLanguage,
                    prepared.targetLanguage,
                    prepared.level,
                );
            }
            const register = desiredRegister(prepared);
            output = applyRegisterRepairs(dataset, output, prepared.targetLanguage, register);
            output = naturalizeClauses(dataset, output, prepared.targetLanguage, prepared.level, register);
            output = applyRegisterRepairs(dataset, output, prepared.targetLanguage, register);
            if (prepared.options.targetSlangPacks) {
                output = applyDatasetGeneration(dataset, output, prepared.targetLanguage, prepared.level);
            }
            output = restoreStyle(output, prepared);
            return prepared.restore(output).trim();
        },
    };
}

export function canTranslate(dataset: unknown, input: string): boolean {
    return hasTranslatableText(dataset as SlangDataset, input);
}
