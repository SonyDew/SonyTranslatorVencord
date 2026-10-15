import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

test("release updater validates metadata, hashes, archives, versions and native injection failures", { skip: process.platform !== "win32" }, () => {
    const result = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
        fileURLToPath(new URL("../scripts/test-release-updater.ps1", import.meta.url))], { encoding: "utf8", timeout: 30000 });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /PASS: 26 updater validation checks/);
});

test("updater verifies before executing; backups survive success and rollback reinjects before restart", () => {
    const installer = readFileSync(new URL("../installer/Install-SonyTranslator.ps1", import.meta.url), "utf8");
    const updater = readFileSync(new URL("../installer/Update-SonyTranslator.ps1", import.meta.url), "utf8");
    assert.ok(updater.indexOf("Assert-SonyArchive $archive") < updater.indexOf("& powershell.exe"));
    assert.ok(updater.indexOf("Assert-SonyPayloadVersion $installerRoot") < updater.indexOf("& powershell.exe"));
    assert.doesNotMatch(installer, /Remove-TemporaryBackup/);
    const rollback = installer.slice(installer.indexOf("$rollbackSucceeded = $false"));
    assert.ok(rollback.indexOf("Inject-Vencord $script:VencordDir") < rollback.indexOf("Start-DiscordAfterOperation"));
});
