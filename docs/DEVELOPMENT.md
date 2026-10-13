# SonyTranslator for Vencord v0.9.3

Vencord userplugin with one Translate button in Discord's message composer. Clicking it opens the full control modal.

## What SonyTranslator does

- Auto-translates visible incoming messages to your selected language.
- Auto-translates outgoing messages before Discord sends them.
- Uses Vencord's built-in Translate plugin / Google Translate as the transport; no personal API key is required.
- Adds a chat-language layer around machine translation: slang recognition, natural chat rewrites, reactions, gaming language and style preservation.
- Uses the bundled v1.4 research dataset covering EN, DE, RU, UA, Mainland Chinese, Taiwan Chinese, ES, FR, PT-BR, PL, JA and KO.
- Separates slang recognition from generation: outdated or recognize-only forms are understood without being emitted automatically.
- Protects Discord mentions, channel mentions, custom emoji, timestamps, URLs, code blocks, paths, CLI flags, versions and common technical acronyms.
- Protects known game/software/product names such as Steam Tools, Iron Soul, Roblox, Discord, Vencord, KernelSU, HyperOS and others before translation, then restores their exact spelling.
- Detects intentional Title Case / mixed-case Latin names inside Cyrillic/CJK messages and preserves them.
- Lets you add your own comma/newline-separated protected names from the modal.
- Avoids literal anatomical translation for ambiguous Russian profanity in normal chat contexts.
- Attempts to preserve lowercase/CAPS, missing commas/final punctuation and repeated ?/! endings.
- Clean / Casual / Slang / Heavy / Match-my-typing outgoing modes.
- Separate Clean / Casual / Slang / Heavy / Match-source adaptation for incoming messages.
- The built-in Vencord Translate chat-bar button is hidden while SonyTranslator is enabled.

## v0.9.3

- Fixed shallow Vencord checkout updates: restore Git ancestry before fast-forwarding to current upstream.
- Stop installation if Vencord cannot update, preserving local changes instead of silently building an incompatible old revision.
- Added an error boundary around the settings modal to contain future Discord component incompatibilities.
- Validated against current Vencord with the updated Discord Modal lookup.

## v0.9.2

- Restored Discord's native quoted-reply order: reply author/name first, translated quote second.
- Reworked AutoInstaller restart state: the running Stable/Canary/PTB client is captured before shutdown and only that client is restarted after successful injection or completed rollback.
- Discord launch failures are warnings and no longer roll back an otherwise successful SonyTranslator installation.
- Added isolated restart tests for all three clients, one-client-only behavior, no-client no-guess behavior, rollback ordering and launch-failure isolation.

## v0.9.1

- Added an incoming chat-understanding stage for typo-tolerant English, abbreviations, malformed grammar, short reactions, expressive spelling and contextual senses before Google Translate.
- Added bounded participant-aware entity protection for reply authors, mentions and recent channel authors, so names such as `Mocha` and `Rob` survive translation without treating ordinary literal uses as names.
- Added relevance-ranked local context: reply targets, conversational pairs, mentions, same-author continuations and lexical overlap outrank unrelated nearby messages.
- Added dataset-driven meanings for `sup`, `brb`, `gf/bf`, `idk`, `finna/boutta/gonna/gotta`, contextual `ss`, `ain't no way`, `cool`, `fire`, `sick`, `hard`, `dead`, `bet`, and common high-confidence chat typos. Risky forms remain recognition-only for generation.
- Added a 120-case messy incoming-chat benchmark, including 25+ dictionary-translation traps and the supplied Discord regression family.
- Reply previews now receive their own fail-open translation while retaining Discord's native reply layout, typography and color.
- AutoInstaller records the running Discord Stable/Canary/PTB client before closing it, then restarts only that same client after successful injection or a completed rollback. A launch failure is a warning and cannot roll back an otherwise successful plugin installation.

## v0.9.0

- Added a bounded local context window (reply target plus up to four recent messages) for resolving short ambiguous reactions. Only the current message is sent to Google Translate.
- Added lightweight clause analysis and inspectable semantic slots for intent, speech act, subject, action, stance, polarity, intensity, emotion, register, context domain, certainty and pragmatic profanity role.
- Added pragmatic profanity handling for intensifiers, admiration, frustration and pain. Constructions such as `пиздец как я хочу спать` are understood as extreme desire/exhaustion rather than a standalone literal curse.
- Added mode-specific semantic realization so Clean / Casual / Slang / Heavy can differ in clause structure, contractions, pronoun omission, verbs, casing and punctuation without adding new aggression.
- Expanded German conversational compression for wellbeing checks, sleep/desire, rewards, unresolved bugs, server checks, joining, healing resources, completion, `gibt's` and guarded `hab grad` constructions.
- Added an 80-case v0.9 semantic/context benchmark on top of the existing 300-case multilingual benchmark, plus positive and negative golden regressions.
- Preserved the v0.8.1 incoming-message visibility fix: empty translations fail open, and translated bodies keep Discord's own text color, font and reply preview.

## v0.8.1

- Fixed translated message bodies becoming invisible when Discord's accessory wrapper supplied a non-message inherited text color/font.
- Empty or malformed translation results now fail open and leave the original message visible.

## v0.8.0

- Added an incoming semantic-understanding stage before Google Translate. Phrase-level meanings such as `I'm cooked`, `he cooked`, `let him cook`, severe nerfs, instant defeats and comeback reactions are distinguished instead of sharing word-level replacements.
- Added high/medium/low confidence, literal negative guards, conservative provider paraphrases and safe post-provider failure correction metadata.
- Added multilingual semantic mappings and style-specific outputs for all 12 supported language packs. Recognition remains broader than generation.
- Added optional previous/reply-message context to the pure engine API and connected direct Discord reply context without reading channel history.
- Added social-register detection and structural repairs for informal, formal and plural-informal address, including German `du/Sie/ihr`, French `tu/vous`, and guarded equivalents in the other language packs.
- Removed the outgoing Cyrillic-only gate. English, German, CJK and every other translatable source can now be translated to the selected outgoing language.
- Added chat-native Cyrillic reaction handling such as `втф??? → WTF???` instead of expanding it into a literary German phrase.
- Added a 300-case anonymized multilingual benchmark (25 messages per language) and semantic-invariant tests.
- Kept translated incoming text on Discord's own typography/color classes and preserved quoted reply previews.

## v0.7.0

- Added a phrase/clause naturalization pass between Google Translate and word-level slang generation.
- Added researched, dataset-driven naturalization rules for all 12 target languages, with separate Mainland China and Taiwan profiles.
- Naturalization rules now carry stage, operation, region, contexts, confidence, negative guards and independent recognition/generation gates.
- Formal constructions can now be structurally rewritten, such as postposed `however`, `in violation of`, `please be aware that`, `due to the fact that` and similar machine-style clauses.
- Added guarded conversational compression for invitations, formal support verbs, complaint questions, CJK topic-first structures and language-specific contractions.
- Heavy is now structurally distinct from Slang where the corpus supports it; risky persona, dialect and meme forms remain recognition-only.
- Connected dataset phrases, style-specific `natural_outputs`, gaming translations, profanity pragmatics, cross-language protection policies and generation metadata to the runtime pipeline.
- Translation-mistake candidates are ranked by the selected style, so Clean no longer blindly takes the first slang-heavy output.
- Mirror now scores recognized dataset slang, reactions and profanity for every supported language.
- Mirror now separates lexical density, compression, punctuation intensity and profanity strength; one slang token cannot select Heavy by itself.
- Exact reactions, phrases, gaming terms and profanity meanings no longer make an unnecessary Google request.
- Added selectable incoming slang adaptation, including natural Russian cleanup and optional target-language slang generation.
- Added safer language detection for ordinary Latin text and Ukrainian text without distinctive letters.
- Failed incoming requests are evicted from cache and can be retried.
- Core Translate settings are restored when SonyTranslator stops.
- Ambiguous lowercase words such as `steam`, `windows`, `unity` and `react` are no longer always treated as product names.
- Incoming replacement now hides only the current message body, preserving Discord reply previews. Translated text reuses Discord's native message typography and color classes.
- Added deterministic golden, negative, UI regression and dataset integrity tests.
- Added a reproducible JSON-to-TypeScript dataset bridge generator.

The research notes and source links are in [`research/modern-chat-language-2025-2026.md`](research/modern-chat-language-2025-2026.md).

## v0.6.0

- Integrated the full v1 research dataset instead of relying only on hand-written replacement lists.
- Added dataset-driven source slang recognition and target slang generation with `current`, `outdated`, `can_generate` and register gates.
- Added dataset-driven reaction mapping. Example: RU `круто` / `хорош` / `красава` can become Mainland Chinese `666` in non-Clean chat modes; incoming `666` can be understood as a reaction rather than a number.
- Added dataset-driven fixes for known machine-translation mistakes, including many RU -> EN chat/gaming phrases and selected CN/TW/JA/KO/FR/PT-BR/PL/ES -> EN cases.
- Added protected-entity engine plus custom protected names so `Steam Tools` is not translated as literal steam/instruments.
- Added protection for intentional mixed-script product/game/project names and technical tokens.
- Moved very compressed English `and -> nd` and `are -> ar` to Heavy only. They remain recognizable in the dataset but are not forced in normal Slang/Match modes.
- Kept the existing hand-tuned natural-chat fixes as a fast layer before the broader dataset layer.

## Install from source

1. Put the whole `SonyTranslator` folder into `Vencord/src/userplugins/`.
2. Run `pnpm build` from the Vencord source repo.
3. Inject/restart Discord as usual for your custom Vencord build.
4. SonyTranslator is enabled by default on first launch.

## Notes

- Slang changes constantly and can be regional/context-sensitive. The dataset deliberately distinguishes forms that are safe to generate from forms that should only be recognized.
- Incoming translation is lazy for rendered/visible messages and uses a concurrency limit/cache.
- Translation content is still sent to Google Translate through Vencord's existing Translate implementation.
- The bundled research JSON is shipped alongside a TypeScript bridge so the plugin build does not depend on JSON module import settings.

## Development checks

The pure translation core can be checked without Discord or network access:

```sh
npm run check
```

This runs strict TypeScript checking for the pure core followed by deterministic tests through `tsx`. The command is verified on supported Node 22 releases and does not depend on experimental built-in TypeScript stripping. A full Vencord build is still recommended after copying the plugin into a Vencord source checkout.
