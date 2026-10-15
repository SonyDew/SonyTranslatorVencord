This update comes from testing SonyTranslator against real gaming conversations. It fixes several cases where a translation kept the words but missed what the person meant.

- Better handling of trading prices, critical-hit stats, crafting and short replies. In the right context, `rip` is a sympathetic reaction, `pity` is a guarantee mechanic, and `forged` means crafting—not counterfeiting.
- Stronger protection for names, filenames and game labels. Messages already in your reading language are less likely to be translated again.
- A bounded request queue and cache reduce duplicate work and prevent stale translations from replacing newer results.

There are still rough edges. Long, messy messages can sound stiff, and unfamiliar game terms or implied meanings can still be wrong. This is an improvement, not a promise that every chat message will translate naturally. Google Translate is still the only provider; no LLM or paid API key is required.

Before publishing, the candidate passed 323 local tests, strict TypeScript, dataset checks, live Google regression checks, and a full Vencord typecheck and production build. The installer archive was also checked with isolated install, update, rollback and Discord-restart simulations. Those checks are not a visual test of every translation inside Discord.

For Windows, download **SonyTranslator-AutoInstaller-0.9.6.zip**, extract the whole archive, then run **Install SonyTranslator.cmd** or **Update SonyTranslator.cmd**. The installer rebuilds Vencord and requests a restart of the Discord client that was running before installation. Source files are in **SonyTranslatorVencord-0.9.6.zip**.

The experimental GitHub update downloader is not included in this release.
