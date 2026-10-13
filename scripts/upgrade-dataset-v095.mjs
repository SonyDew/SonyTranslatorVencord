import { readFileSync, writeFileSync } from "node:fs";
const path = new URL("../slang-dataset.json", import.meta.url);
const dataset = JSON.parse(readFileSync(path, "utf8"));
const upsert = (rows, row) => {
    const index = rows.findIndex(value => value.id === row.id);
    if (index < 0) rows.push(row); else rows[index] = row;
};
const contexts = ["remap", "buttons", "keyboard", "controls", "клавиш", "кнопки", "кнопок", "управление"];
upsert(dataset.source_normalization_rules, {
    id: "en_key_assignment_typo", language: "en", pattern: "\\bkey assigment\\b",
    replacement: "key assignment", kind: "typo", confidence: "high",
    current: true, can_recognize: true,
});
const outputs = (clean, casual) => ({ ru: { clean: [clean], casual: [casual], slang: [casual], heavy: [casual] } });
upsert(dataset.incoming_chat_rules, {
    id: "en_key_assignment_controls", language: "en", pattern: "^key assign?ment[.!?]*$",
    normalized: "keyboard key bindings", sense: "mapping keyboard keys to controls",
    confidence: "high", current: true, can_recognize: true, can_generate: true,
    requires_context: true, context_patterns: contexts,
    slots: { intent: "control_configuration", speechAct: "statement", action: "assign_keys", certainty: "high" },
    outputs: outputs("Назначение клавиш", "назначение клавиш"),
});
upsert(dataset.incoming_chat_rules, {
    id: "en_remap_buttons_controls", language: "en", pattern: "^remap (?:buttons|keys)[.!?]*$",
    normalized: "reassign the controls to different buttons", sense: "reassigning input controls",
    confidence: "high", current: true, can_recognize: true, can_generate: true,
    slots: { intent: "control_configuration", speechAct: "statement", action: "remap_buttons", certainty: "high" },
    outputs: outputs("Переназначить кнопки", "переназначить кнопки"),
});
dataset.version = "1.5";
dataset.generated_at = "2026-10-14";
writeFileSync(path, `${JSON.stringify(dataset, null, 2)}\n`);
