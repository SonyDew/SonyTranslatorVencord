# Discord and Vencord installation checks

The Windows installer distinguishes installing a custom Vencord build from
updating one that Discord already loads.

* **Install** can install or repair Vencord and SonyTranslator together.
* **Update** requires an active loader in the selected Discord client pointing
  at the chosen SonyTranslator Vencord checkout. A leftover source directory,
  settings directory, plugin file or older patched Discord version is not enough.
* A regular Vencord installation in AppData is recognized as Vencord, but is not
  mistaken for the separate SonyTranslator build. Install is the explicit path
  for switching to that build; Update does not silently switch installations.
* Running Stable does not borrow evidence from patched Canary or PTB. With no
  running client, update selects only a unique matching active build. Ambiguous
  clients require an explicit `-DiscordClient Stable`, `Canary` or `PTB` choice.

The read-only detector parses the small official `resources/app.asar` bootstrap,
checks its package entry point and literal require path, and verifies the target
patcher, renderer, preload and original Discord archive exist. It does not execute
the loader or search an entire Discord bundle for strings. Unknown/custom loader
formats, Store/portable installs and other clients are not guessed as supported.

The format and native CLI contracts were checked against the official
[ASAR writer](https://github.com/Vencord/Installer/blob/main/app_asar.go),
[Windows discovery](https://github.com/Vencord/Installer/blob/main/find_discord_windows.go)
and [CLI target selection](https://github.com/Vencord/Installer/blob/main/cli.go).
The private-build environment is also checked against the locally installed
Vencord `scripts/runInstaller.mjs` launcher. A zero launcher exit cannot establish
successful injection because it can swallow a native error.

Checks run before closing Discord or downloading build prerequisites. Injection
uses the native CLI exit code and an explicit client location, then verifies that
client actually points to the expected build. The target is rechecked immediately
before injection. Conflicting numeric/lexical version ordering stops before
mutation rather than allowing the upstream helper to patch an older directory.

Plugin source and the selected bootstrap are backed up. Failure restores the
previous source and exact bootstrap bytes; a failed fresh install returns to
vanilla Discord rather than injecting Vencord during rollback. Restarts remain
after successful recovery. If Discord changes version during the operation or
recovery fails, it is not restarted as if recovery succeeded. Backups are retained.

## Validation and limits

32 focused fixture checks cover real ASAR structure, missing/broken loaders,
official/private roots, all three client identities, stale versions, ambiguity,
native and post-check failures, environment cleanup, partial-copy rollback and
fresh vanilla recovery. The packaged installer has additional isolated install,
update, removed-Vencord refusal, rollback and restart-order tests.

These are filesystem and transaction tests, not proof that Discord rendered a
working plugin. Native DLL/loader alternatives need separate support. Detection
does not authenticate Vencord file contents or reconstruct removed source files.
An OS update racing injection is reported as failure and may need manual repair;
there is no claim of an atomic transaction with Discord's own updater.
