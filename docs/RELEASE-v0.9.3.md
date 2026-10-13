# SonyTranslator 0.9.3 — the settings window works with current Discord again

If pressing the translator button crashed Discord, this update addresses the cause.
The installer had been rebuilding an old Vencord checkout even when its Git update
failed. That old build could no longer find Discord's settings-dialog component.
The checkout now updates correctly, and a blocked update stops with an error instead
of quietly reinstalling stale code. SonyTranslator also uses the current notification API.

The installer is easier to follow now: you see the stages, while Git, dependency and
build output goes into a detail log. It still remembers whether you were using Stable,
Canary or PTB and brings that same client back after the operation.

**Install:** download `SonyTranslator-AutoInstaller-0.9.3.zip`, extract it fully, and run
`Install SonyTranslator.cmd` or `Update SonyTranslator.cmd`. The other ZIP contains
the plugin source, tests and documentation for manual builds.

This release passed 163 tests, the full Vencord TypeScript check and production build
on upstream `16ec4ea8`. Fresh installation, updating from 0.9.2, rollback and Discord
restart scenarios were checked. The local 0.9.2 installation was also updated and
Discord Stable restarted successfully. Automated checks do not substitute for clicking
the settings button in the running Discord client.

The repository now has English, Russian, German and Chinese documentation. Original
author: **SonyDev**. Personal use is permitted; publishing a modified or rebranded version
requires prior written permission and author credit. See LICENSE for the exact terms.
Earlier MIT copies and third-party license rights remain intact.

---

**Русский:** исправлено падение при открытии настроек после обновления Discord. Установщик
теперь действительно обновляет Vencord, показывает этапы и возвращает тот же клиент Discord.
Для обновления распакуйте AutoInstaller целиком и запустите `Update SonyTranslator.cmd`.

**Deutsch:** behebt den Absturz beim Öffnen der Übersetzereinstellungen nach einem
Discord-Update. Vencord wird wieder korrekt aktualisiert; der Installer zeigt klare Schritte
und startet denselben Discord-Client erneut. ZIP vollständig entpacken und den Updater starten.

**简体中文：**修复 Discord 更新后打开翻译设置时的崩溃。安装器现在能正确更新 Vencord，
显示安装阶段，并重新启动原来的 Discord 客户端。完整解压安装器后运行更新脚本。
