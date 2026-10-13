import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

test("installer recovers shallow ancestry and preserves conflicting user edits", { skip: process.platform !== "win32" }, () => {
    const result = spawnSync("powershell.exe", [
        "-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
        fileURLToPath(new URL("../scripts/test-vencord-source-update.ps1", import.meta.url)),
    ], { encoding: "utf8", timeout: 30000 });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /PASS: shallow ancestry recovery/);
});
