SonyTranslator AutoInstaller v0.9.6
===================================

Normal installation/update:
1. Extract the whole ZIP.
2. Double-click "Install SonyTranslator.cmd".
3. Wait for the green success message.
4. If Discord was running, that same Stable/Canary/PTB client starts again after the verified build is injected. SonyTranslator is enabled by default on a fresh install.

"Update SonyTranslator.cmd" uses the same safe installer and is provided for users
coming from an older AutoInstaller release.
Update requires the selected Discord client to be connected to this SonyTranslator
Vencord build. Leftover source or settings folders do not count. If Vencord was
removed or another build is active, Update stops before closing Discord.
Use Install SonyTranslator.cmd for an explicit fresh install or repair instead.
With several clients installed and none running, choose one explicitly:
powershell -File Install-SonyTranslator.ps1 -DiscordClient Stable
Supported choices: Stable, Canary, PTB. A running different client is never chosen
just because Vencord exists elsewhere.

What it does:
- uses a private Vencord source checkout in %LOCALAPPDATA%\SonyTranslator\Vencord;
- installs Node.js 22 LTS and Git through winget only when they are missing;
- copies only the bundled SonyTranslator payload;
- backs up src\userplugins\SonyTranslator and the selected Discord bootstrap;
- builds Vencord, injects into the selected client, and verifies its loader;
- remembers the Discord Stable/Canary/PTB client that was running before installation;
- closes Discord before build/injection and restarts only that same client afterward;
- also restarts the previous client after a completed rollback when installation fails;
- never guesses between installed clients when none was running;
- restores the previous SonyTranslator files if installation/build/injection fails.
Backups remain in %LOCALAPPDATA%\SonyTranslator\backups for manual recovery.
Official small app.asar bootstraps are supported. Unknown loader formats stop an
update rather than being guessed as installed. Nonstandard/portable clients need
separate support; this detection covers normal Windows Stable, Canary and PTB.

It does not delete other plugins or Discord/Vencord settings. Installer details are
written to %LOCALAPPDATA%\SonyTranslator\installer.log.

Prerequisites when winget is unavailable: Git and Node.js 22 or newer.
