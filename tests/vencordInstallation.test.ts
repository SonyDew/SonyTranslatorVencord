import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

test("Vencord installation detection distinguishes active, removed, broken and other-client loaders", { skip: process.platform !== "win32" }, () => {
    const result = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
        fileURLToPath(new URL("../scripts/test-vencord-installation.ps1", import.meta.url))], { encoding: "utf8", timeout: 30000 });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /PASS: 32 Vencord installation checks/);
});

test("preflight precedes stop, prerequisites and payload; injection has explicit target and post-check", () => {
    const source = readFileSync(new URL("../installer/Install-SonyTranslator.ps1", import.meta.url), "utf8");
    const main = source.slice(source.indexOf("Write-Host 'SonyTranslator AutoInstaller'"));
    assert.ok(main.indexOf("Select-SonyDiscordInstallation") < main.indexOf("Stop-RunningDiscordClients"));
    assert.ok(main.indexOf("Select-SonyDiscordInstallation") < main.indexOf("Install-Prerequisites"));
    assert.ok(main.indexOf("Select-SonyDiscordInstallation") < main.indexOf("Install-Payload"));
    assert.doesNotMatch(source, /'--branch', 'auto'/);
    assert.match(source, /'--location', \$script:SelectedDiscord.Root/);
    assert.match(source, /Assert-SonyDiscordInjection \$script:SelectedDiscord/);
    assert.match(main, /Restore-DiscordLoader/);
});
