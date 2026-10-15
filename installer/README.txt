SonyTranslator AutoInstaller v0.9.5
===================================

Normal installation/update:
1. Extract the whole ZIP.
2. Double-click "Install SonyTranslator.cmd".
3. Wait for the green success message.
4. If Discord was running, that same Stable/Canary/PTB client starts again after the verified build is injected. SonyTranslator is enabled by default on a fresh install.

"Update SonyTranslator.cmd" checks the official GitHub repository for a newer stable
release, verifies the archive against GitHub's SHA-256 digest, and runs its installer.
It never installs prereleases or downgrades. No Discord history or account token is sent.
To check without installing: powershell -File Update-SonyTranslator.ps1 -CheckOnly.
For a custom checkout add -VencordPath "your existing Vencord directory".
"Install SonyTranslator.cmd" still installs the bundled payload without an update check.

What it does:
- uses a private Vencord source checkout in %LOCALAPPDATA%\SonyTranslator\Vencord;
- installs Node.js 22 LTS and Git through winget only when they are missing;
- copies only the bundled SonyTranslator payload;
- backs up only src\userplugins\SonyTranslator;
- builds Vencord, injects the verified build, and retains the backup;
- remembers the Discord Stable/Canary/PTB client that was running before installation;
- closes Discord before build/injection and restarts only that same client afterward;
- also restarts the previous client after a completed rollback when installation fails;
- never guesses between installed clients when none was running;
- restores the previous SonyTranslator files if installation/build/injection fails.

It does not delete other plugins or Discord/Vencord settings. Installer details are
written to %LOCALAPPDATA%\SonyTranslator\installer.log.

Backups remain in %LOCALAPPDATA%\SonyTranslator\backups and are not pruned automatically.
To recover one later, close Discord, copy the chosen backup into the SonyTranslator
userplugin folder, then rebuild and inject that Vencord checkout before reopening Discord.
Automatic failure rollback restores files, rebuilds and reinjects before restarting Discord.
SHA-256 detects corruption and binds the ZIP to trusted GitHub release metadata; it is
not an independent publisher signature and cannot protect a compromised GitHub account.

Prerequisites when winget is unavailable: Git and Node.js 22 or newer.
