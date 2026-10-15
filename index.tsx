/*
 * SonyTranslator - Vencord userplugin v0.9.6
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
import { RequestQueue, TranslationCache, type TranslationLease } from "./requestQueue";
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
const translationEngine = createTranslationEngine(slangDataset);

const incomingCache = new TranslationCache();
const translationQueue = new RequestQueue();
const participantNameCache = new Map<string, TranslationParticipant>();
const MAX_PARTICIPANT_CACHE = 512;
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
    translationQueue.clear();
    participantNameCache.clear();
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

function hasTranslatableText(text: string) {
    return canTranslate(slangDataset, text);
}

async function translateStyled(kind: "received" | "sent", input: string, context?: TranslationContext, signal?: AbortSignal): Promise<string | null> {
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
        if (signal?.aborted) throw new Error("Translation cancelled");
        const translated = await translationQueue.run(() => {
            const inputKey = kind === "sent" ? "sentInput" : "receivedInput";
            const outputKey = kind === "sent" ? "sentOutput" : "receivedOutput";
            const previous = coreTranslateSettings.store[inputKey];
            const previousOutput = coreTranslateSettings.store[outputKey];
            const sourceCode = googleSourceCode(sourceLanguage);
            coreTranslateSettings.store[inputKey] = sourceCode && sourceCode in GoogleLanguages
                ? sourceCode as keyof typeof GoogleLanguages : "auto";
            coreTranslateSettings.store[outputKey] = targetLanguage;
            try {
                // coreTranslate reads settings synchronously before starting its request.
                return coreTranslate(kind, text);
            } finally {
                coreTranslateSettings.store[inputKey] = previous;
                coreTranslateSettings.store[outputKey] = previousOutput;
            }
        }, signal, kind === "sent" ? 1 : 0);
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
        settings.store.softenAmbiguousProfanity ? "soften-profanity" : "preserve-profanity",
        slangDataset.version,
        context?.replyMessage ?? "no-reply-context",
        context?.previousMessages?.join("\u241e") ?? "no-local-context",
        context?.participants?.map(participant =>
            `${participant.id ?? "?"}:${participant.displayName ?? participant.nickname ?? participant.username ?? ""}`,
        ).join("\u241f") ?? "no-participants",
    ].join("|");
}

function cachedIncomingTranslation(message: Message): TranslationLease {
    const context = conversationContext(
        message.channel_id,
        message.messageReference,
        message.id,
        message.content,
        message.author?.id,
        message.mentions,
    );
    const key = getIncomingCacheKey(message, context);
    return incomingCache.acquire(key, signal => translateStyled("received", message.content, context, signal));
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
        "softenAmbiguousProfanity",
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

        const request = cachedIncomingTranslation(message);
        request.promise.then(result => {
            if (!cancelled) setTranslated(result);
        }, () => { /* Keep the original message visible; cache permits retry. */ });

        return () => { cancelled = true; request.release(); };
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
        s.softenAmbiguousProfanity,
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
    const s = settings.use([
        "incomingEnabled", "incomingTarget", "incomingStyle", "preserveStyle", "preserveMixedEnglish",
        "smartSourceSlang", "targetSlangPacks", "protectNames", "customProtectedNames",
        "dropEnglishApostrophes", "softenAmbiguousProfanity",
    ]);
    const [translated, setTranslated] = useState<string | null>(null);
    const referenced = referencedMessage.state === ReferencedMessageState.Loaded ? referencedMessage.message : undefined;

    useEffect(() => {
        let cancelled = false;
        setTranslated(null);
        if (!s.incomingEnabled || !referenced?.content?.trim() || !hasTranslatableText(referenced.content)) {
            return () => { cancelled = true; };
        }
        const request = cachedIncomingTranslation(referenced);
        request.promise.then(result => {
            if (!cancelled) setTranslated(result);
        }, () => { /* A failed quoted translation must leave the original visible. */ });
        return () => { cancelled = true; request.release(); };
    }, [
        baseMessage.id,
        referenced?.id,
        referenced?.content,
        s.incomingEnabled,
        s.incomingTarget,
        s.incomingStyle,
        s.preserveStyle,
        s.preserveMixedEnglish,
        s.smartSourceSlang,
        s.targetSlangPacks,
        s.protectNames,
        s.customProtectedNames,
        s.dropEnglishApostrophes,
        s.softenAmbiguousProfanity,
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
                        <div className="sony-translator-hero-title">SonyTranslator · v0.9.6</div>
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
                            showToast({ text: `SonyTranslator: ${t("cleared")}`, variant: "success" });
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
            showToast({ text: `SonyTranslator: ${uiText(LocaleStore.locale, "sendFailed")}`, variant: "critical" });
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
