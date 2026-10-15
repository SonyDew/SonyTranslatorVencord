// Optional, explicit network diagnostic. Uses synthetic fixtures only, never channel history.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import dataset from "../slangDataset.ts";
import { createTranslationEngine, type EngineOptions, type TranslationContext } from "../translationCore.ts";
import { googleSourceCode, runPreparedTranslation } from "../translationRunner.ts";

const vencordPath = process.argv[2];
const outputPath = process.argv[3];
if (!vencordPath || !outputPath) throw new Error("Usage: tsx scripts/capture-google-quality.ts <Vencord checkout> <output.json>");
// Follow the locally verified upstream implementation; do not add another provider
// or embed a second API key in the plugin or its developer tooling.
const upstream = readFileSync(resolve(vencordPath, "src/plugins/translate/utils.ts"), "utf8");
const key = upstream.match(/"key":\s*"([^"]+)"/)?.[1];
if (!key || !upstream.includes("https://translate-pa.googleapis.com/v1/translate?")) {
    throw new Error("Upstream Google transport changed; review the capture tool before using it.");
}
const memo = new Map<string, Promise<string>>();
function google(text: string, sourceLanguage: string | null, targetLanguage: string): Promise<string> {
    const source = googleSourceCode(sourceLanguage) ?? "auto";
    const target = googleSourceCode(targetLanguage) ?? targetLanguage;
    const id = JSON.stringify([text, source, target]);
    if (!memo.has(id)) memo.set(id, (async () => {
        const query = new URLSearchParams({ "params.client": "gtx", dataTypes: "TRANSLATION", key: key!,
            "query.sourceLanguage": source, "query.targetLanguage": target, "query.text": text });
        const response = await fetch(`https://translate-pa.googleapis.com/v1/translate?${query}`, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error(`Google HTTP ${response.status}`);
        const result = await response.json() as { translation?: string };
        if (typeof result.translation !== "string") throw new Error("Unexpected Google response");
        return result.translation;
    })());
    return memo.get(id)!;
}
const engine = createTranslationEngine(dataset);
const rows: unknown[] = [];
const samples: Array<[string, string, string, TranslationContext?]> = process.argv[4]
    ? JSON.parse(readFileSync(process.argv[4], "utf8")) : [
    ["en", "im cooked 💀", "ru"], ["de", "ich bin komplett lost", "ru"],
    ["ru", "пиздец как я хочу спать", "en"], ["uk", "шо ти робиш", "en"],
    ["zh-CN", "我寄了", "ru"], ["zh-TW", "你484忘了", "ru"],
    ["es", "estoy frito", "ru"], ["fr", "tkt je gère", "ru"],
    ["pt-BR", "bora jogar amanhã", "ru"], ["pl", "nwm czy działa", "ru"],
    ["ja", "詰んだ", "ru"], ["ko", "망했다", "ru"],
    ["en", "It's cool outside.", "ru"], ["en", "I ordered a mocha.", "ru"],
    ["en", "She is sick.", "ru"], ["en", "I cooked chicken for dinner.", "ru"],
    ["de", "Ich habe meinen Schlüssel verloren.", "ru"], ["zh-TW", "數量是484個", "ru"],
];
for (const [language, source, targetLanguage, context] of samples) {
    const options: EngineOptions = { kind: "received", targetLanguage, mode: "clean", preserveStyle: true,
        smartSourceSlang: true, targetSlangPacks: true, protectNames: true, customProtectedNames: "",
        dropEnglishApostrophes: false, softenAmbiguousProfanity: true, context };
    try {
        const raw = await google(source, null, targetLanguage);
        const outputs: Record<string, string> = {};
        for (const mode of ["clean", "casual", "slang", "heavy", "mirror"] as const) {
            const prepared = engine.prepare(source, { ...options, mode });
            outputs[mode] = await runPreparedTranslation(engine, prepared,
                (text, detected) => google(text, detected, targetLanguage));
        }
        const prepared = engine.prepare(source, options);
        rows.push({ language, source, targetLanguage, context, raw, detectedSourceLanguage: prepared.sourceLanguage,
            register: prepared.analysis.register, providerSafeInput: prepared.analysis.providerSafeInput,
            selectedSense: prepared.analysis.semanticMatches.map(match => match.id), outputs });
        process.stdout.write(`${language}: ${source} → ${outputs.mirror}\n`);
    } catch (error) {
        rows.push({ language, source, targetLanguage, error: error instanceof Error ? error.message : String(error) });
        process.exitCode = 1;
    }
}
writeFileSync(outputPath, JSON.stringify({ capturedAt: new Date().toISOString(),
    note: "Synthetic fixtures; live Google outputs are variable. Not a native-speaker fluency rating or Discord UI test.", rows }, null, 2) + "\n");
