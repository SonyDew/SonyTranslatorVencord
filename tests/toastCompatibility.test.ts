import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const plugin = readFileSync(new URL("../index.tsx", import.meta.url), "utf8");

test("SonyTranslator uses the current Vencord Toast API", () => {
    const toastCalls = [...plugin.matchAll(/showToast\(([^\n]*)/g)].map(match => match[1]);
    assert.equal(toastCalls.length, 2, "Review additional toast calls when added");
    for (const call of toastCalls) {
        assert.match(call, /^\{\s*text:\s*/, "showToast must receive a ToastData object");
    }
    assert.match(plugin, /variant: "success"/);
    assert.match(plugin, /variant: "critical"/);
    assert.doesNotMatch(plugin, /showToast\([^\n]+,\s*"(?:success|failure|message)"/);
});
