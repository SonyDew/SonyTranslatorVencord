/* Copyright (c) 2026 SonyDev. LicenseRef-SonyTranslator-Personal-Use-1.0 */
import type { PreparedTranslation, TranslationEngine } from "./translationCore";

export type TranslationProvider = (text: string, sourceLanguage: string | null) => Promise<string>;

export function googleSourceCode(language: string | null): string | null {
    const code = language?.toLowerCase();
    if (!code) return null;
    if (code.startsWith("pt")) return "pt";
    if (code === "zh-cn") return "zh-CN";
    if (code === "zh-tw") return "zh-TW";
    return code;
}

export async function runPreparedTranslation(
    engine: TranslationEngine,
    prepared: PreparedTranslation,
    provider: TranslationProvider,
): Promise<string> {
    if (prepared.shortcut !== null) return engine.finalize(prepared, "");
    if (!prepared.preserveTargetText) {
        return engine.finalize(prepared, await provider(prepared.text, prepared.sourceLanguage));
    }

    // Translate foreign spans separately; surrounding target-language text stays exact.
    let result = "";
    let cursor = 0;
    for (const segment of prepared.foreignSegments) {
        const part = engine.prepare(segment.text, { ...prepared.options, context: prepared.options.context });
        const translated = part.shortcut ?? await provider(part.text, part.sourceLanguage);
        if (!translated.trim()) throw new Error("Empty foreign-span translation");
        result += prepared.text.slice(cursor, segment.index) + engine.finalize(part, translated);
        cursor = segment.index + segment.text.length;
    }
    return engine.finalize(prepared, result + prepared.text.slice(cursor));
}
