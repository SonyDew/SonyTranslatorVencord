import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import slangDataset from "../slangDataset.ts";

describe("dataset integrity", () => {
    test("generated TypeScript bridge exactly matches the source JSON", () => {
        const json = readFileSync(new URL("../slang-dataset.json", import.meta.url), "utf8").trim();
        const bridge = readFileSync(new URL("../slangDataset.ts", import.meta.url), "utf8");
        const start = bridge.indexOf("} = {") + 4;
        const end = bridge.lastIndexOf(";", bridge.lastIndexOf("export default"));
        assert.equal(bridge.slice(start, end).trim(), json);
    });

    test("language sections have locally unique IDs and required slang gates", () => {
        for (const language of slangDataset.languages) {
            for (const section of ["slang", "phrases", "reactions", "gaming", "profanity"] as const) {
                const ids = language[section].map((entry: { id: string; }) => entry.id);
                assert.equal(new Set(ids).size, ids.length, `${language.code}/${section} contains duplicate IDs`);
            }
            for (const entry of language.slang) {
                assert.equal(typeof entry.can_generate, "boolean", `${entry.id} lacks can_generate`);
                assert.equal(typeof entry.can_recognize, "boolean", `${entry.id} lacks can_recognize`);
                assert.ok(Array.isArray(entry.contexts), `${entry.id} lacks contexts`);
                assert.ok(entry.region, `${entry.id} lacks region`);
            }
        }
    });

    test("phrase records provide a usable output for every style", () => {
        for (const language of slangDataset.languages) {
            for (const phrase of language.phrases) {
                assert.ok(phrase.source_examples?.length, `${phrase.id} lacks source examples`);
                for (const style of ["casual", "slang", "heavy"] as const) {
                    assert.ok(phrase.natural_outputs?.[style]?.length, `${phrase.id} lacks ${style} output`);
                }
            }
        }
    });

    test("executable cross-language protection policies are present", () => {
        const ids = new Set(slangDataset.cross_language_rules.map(rule => rule.id));
        for (const required of [
            "mixed_language_protection",
            "protect_urls",
            "protect_discord_mentions",
            "protect_emojis",
            "protect_custom_discord_emojis",
            "protect_timestamps",
            "protect_code_blocks",
            "protect_inline_code",
            "protect_file_paths",
            "protect_cli",
            "protect_versions",
            "protect_hashtags",
            "protect_acronyms",
            "slang_generation_gate",
            "regional_slang_gate",
            "profanity_pragmatics",
        ]) assert.ok(ids.has(required), `missing cross-language rule: ${required}`);
    });

    test("naturalization rules cover every supported target language", () => {
        const covered = new Set(slangDataset.naturalization_rules.map(rule => rule.language.toLocaleLowerCase()));
        for (const language of slangDataset.languages) {
            assert.ok(covered.has(language.code.toLocaleLowerCase()), `missing naturalization rules for ${language.code}`);
        }
    });

    test("naturalization rules carry generation safety metadata", () => {
        const ids = slangDataset.naturalization_rules.map(rule => rule.id);
        assert.equal(new Set(ids).size, ids.length, "naturalization rule IDs must be unique");
        for (const rule of slangDataset.naturalization_rules) {
            assert.ok(["high", "medium", "low"].includes(rule.confidence), `${rule.id} lacks confidence`);
            assert.equal(typeof rule.can_generate, "boolean", `${rule.id} lacks can_generate`);
            assert.equal(typeof rule.can_recognize, "boolean", `${rule.id} lacks can_recognize`);
            assert.ok(rule.region, `${rule.id} lacks region`);
            assert.ok(rule.contexts?.length, `${rule.id} lacks contexts`);
            assert.ok(Object.values(rule.outputs).some(outputs => outputs?.length), `${rule.id} has no outputs`);
            if (rule.operation === "regex") {
                assert.ok(rule.pattern, `${rule.id} lacks a regex pattern`);
                assert.doesNotThrow(() => new RegExp(rule.pattern, "iu"), `${rule.id} has an invalid regex`);
            } else {
                assert.ok(rule.source_patterns?.length, `${rule.id} lacks source patterns`);
            }
        }
    });

    test("researched recognition-only forms stay generation-disabled", () => {
        const required = [
            "cn_xswl", "cn_yyds", "cn_awsl", "cn_u1s1", "tw_484", "pl_nwm", "uk_sho", "en_them_em",
            "en_bro", "de_digga", "de_brudi", "ru_vashche", "ru_scha", "ru_syab", "fr_frr", "pt_mano", "pt_slk", "pt_pprt",
        ];
        const entries = slangDataset.languages.flatMap(language => language.slang);
        for (const id of required) {
            const entry = entries.find(candidate => candidate.id === id);
            assert.ok(entry, `missing recognition-only entry ${id}`);
            assert.equal(entry.can_recognize, true, `${id} must remain recognizable`);
            assert.equal(entry.can_generate, false, `${id} must not be generated`);
        }
    });

    test("semantic mappings are multilingual, confidence-gated and style-complete", () => {
        assert.ok((slangDataset.semantic_mappings?.length ?? 0) >= 9);
        for (const mapping of slangDataset.semantic_mappings ?? []) {
            assert.equal(typeof mapping.can_recognize, "boolean", mapping.id);
            assert.equal(typeof mapping.can_generate, "boolean", mapping.id);
            assert.ok(Object.keys(mapping.sources).length, `${mapping.id} has no sources`);
            assert.ok(Object.keys(mapping.outputs).length, `${mapping.id} has no outputs`);
            for (const [language, spec] of Object.entries(mapping.sources) as Array<[string, any]>) {
                assert.ok(spec.forms?.length && spec.normalized, `${mapping.id}/${language}`);
                assert.ok(["high", "medium", "low"].includes(spec.confidence), `${mapping.id}/${language} confidence`);
            }
            for (const [language, outputs] of Object.entries(mapping.outputs) as Array<[string, any]>) {
                for (const style of ["clean", "casual", "slang", "heavy"]) assert.ok(outputs[style]?.length, `${mapping.id}/${language}/${style}`);
            }
        }
    });

    test("register metadata has unique IDs and compilable repair patterns", () => {
        const markerIds = (slangDataset.register_markers ?? []).map(marker => marker.id);
        const repairIds = (slangDataset.register_repairs ?? []).map(repair => repair.id);
        assert.equal(new Set(markerIds).size, markerIds.length);
        assert.equal(new Set(repairIds).size, repairIds.length);
        for (const repair of slangDataset.register_repairs ?? []) {
            assert.doesNotThrow(() => new RegExp(repair.pattern, "giu"), repair.id);
        }
    });

    test("pragmatic profanity rules are confidence-gated and compilable", () => {
        const rules = slangDataset.pragmatic_profanity_rules ?? [];
        assert.ok(rules.length >= 14);
        assert.equal(new Set(rules.map(rule => rule.id)).size, rules.length);
        for (const rule of rules) {
            assert.doesNotThrow(() => new RegExp(rule.pattern, "iu"), rule.id);
            assert.ok(["high", "medium", "low"].includes(rule.confidence), rule.id);
            assert.equal(typeof rule.can_recognize, "boolean", rule.id);
            assert.equal(typeof rule.can_generate, "boolean", rule.id);
            assert.ok(rule.normalized, rule.id);
            assert.ok(rule.role, rule.id);
            if (rule.can_generate) {
                assert.ok(rule.outputs && Object.keys(rule.outputs).length >= 6, `${rule.id} lacks multilingual realizations`);
            }
        }
    });

    test("context-dependent short reactions cannot resolve without related context", () => {
        const mapping = slangDataset.semantic_mappings?.find(candidate => candidate.id === "contextual_agreement_reaction");
        assert.ok(mapping);
        for (const spec of Object.values(mapping.sources)) {
            assert.equal(spec.requires_context, true);
            assert.equal(spec.exact_only, true);
        }
    });

    test("incoming chat rules are unique, compilable and generation-gated", () => {
        const rules = slangDataset.incoming_chat_rules ?? [];
        assert.ok(rules.length >= 18);
        assert.equal(new Set(rules.map(rule => rule.id)).size, rules.length);
        for (const rule of rules) {
            assert.doesNotThrow(() => new RegExp(rule.pattern, "iu"), rule.id);
            assert.ok(rule.can_recognize, rule.id);
            assert.ok(["high", "medium", "low"].includes(rule.confidence), rule.id);
            if (rule.can_generate) assert.ok(Object.keys(rule.outputs ?? {}).length, rule.id);
            if (rule.required_entity_capture) assert.match(rule.pattern, new RegExp(`\\?<${rule.required_entity_capture}>`), rule.id);
        }
    });

    test("source normalization collisions are guarded", () => {
        const rules = slangDataset.source_normalization_rules ?? [];
        assert.ok(rules.length >= 29);
        assert.equal(new Set(rules.map(rule => rule.id)).size, rules.length);
        for (const rule of rules) assert.doesNotThrow(() => new RegExp(rule.pattern, "giu"), rule.id);
        const screenshot = rules.find(rule => rule.id === "en_ss_screenshot_context");
        assert.ok(screenshot?.context_patterns?.includes("screenshot"));
        assert.ok(screenshot?.context_patterns?.includes("send"));
        assert.equal(rules.some(rule => rule.pattern === "\\bmocha\\b"), false);
        assert.equal(rules.some(rule => rule.pattern === "\\brob\\b"), false);
    });
});
