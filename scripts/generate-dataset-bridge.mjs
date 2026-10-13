import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const jsonPath = `${root}slang-dataset.json`;
const bridgePath = `${root}slangDataset.ts`;
const json = readFileSync(jsonPath, "utf8").trim();

JSON.parse(json);

const header = `/*
 * SonyTranslator slang dataset bridge.
 * Generated from slang-dataset.json by scripts/generate-dataset-bridge.mjs.
 */

const slangDataset: {
    version: string;
    generated_at: string;
    naturalization_rules: any[];
    languages: any[];
    protected_entities: any[];
    cross_language_rules: any[];
    translation_mistakes: any[];
    semantic_mappings?: any[];
    register_markers?: any[];
    register_repairs?: any[];
    pragmatic_profanity_rules?: any[];
    incoming_chat_rules?: any[];
    source_normalization_rules?: any[];
} = `;

writeFileSync(bridgePath, `${header}${json};\n\nexport default slangDataset;\n`, "utf8");
