# Contextual dictionary review — 16 October 2026

Reviewed the slang/gaming inventory across all twelve language sections, generation
gates, executable source normalization and the newly reported incoming examples.
This is not a claim of native-speaker validation of every entry in every language.
No unverified slang was enabled for generation. Existing recognition-only entries
and the Google-only transport are retained.
Inventory: 213 slang entries and 105 gaming entries across twelve languages.

## Evidence

Independent user discussions confirm guarantee mechanics rather than compassion:
[March 2025 gacha discussion](https://www.reddit.com/r/gachagaming/comments/1je1qh5/),
[February 2025 Roblox game discussion](https://www.reddit.com/r/JujutsuInfinite/comments/1irws1i/it_happened/),
and [July 2026 gacha discussion](https://www.reddit.com/r/gachagaming/comments/1up78cg/whats_the_biggest_anniversary_or_some_event/).
They also show that thresholds vary: do not invent a fixed number of draws.
Setback reactions are independently visible in
[August 2025 discussion](https://www.reddit.com/r/gachagaming/comments/1n42llv/)
and [September 2026 reroll report](https://us.forums.blizzard.com/en/diablo-immortal/t/rerolled-wings-over-30-times-no-new-unlock/15320).
No user messages from these sources are added to the dataset.

## Changes and safety

* Optional gaming-entry positive/negative context conditions now apply to both
  preservation and exact shortcuts, as well as technical target slots.
* `pity/pities` is a guarantee mechanic only with relevant draw/reroll evidence.
  Compassion expressions veto it. An exact contextual clarification can bypass
  Google; a longer sentence uses provider-safe wording for target agreement.
* `rip` resolves as sympathy only with relevant setback context. Solemn death,
  physical tearing, disc ripping and networking contexts do not use that shortcut.
* Counted spins with draw evidence are understood as attempts at random drops.
  Mechanical rotations remain literal. This still produces longer wording than
  native Russian gaming shorthand; no fluency claim is made for it.
* Explicit race/clan rerolls for a named currency preserve the exchange direction.
  Resource amounts, rarity, level and number of copies are not inferred.
* A narrow inventory `n` conjunction is recognition-only, with math negatives.
* `Glory Core` is a context-bound source label, not an invented Russian item name.
* Source normalization no longer uses low-relevance nearby turns as meaning hints.
* The protected filename extension list now includes common text/media/document
  formats. A regression caught `pities.txt` being normalized inside a filename.

Generation safety and duplicate-form checks traverse every language. Targeted
tests exercise all five modes, literal negatives, context relevance, names, code,
URLs, filenames and numerical invariants. Live Google fixtures include both fixes
and literal controls; they run in the existing quality gate before Vencord checks.

## Limits

No automatic reinterpretation of `Lucifer 3` or `Demon 2`: the screenshot alone
does not establish levels versus copies versus progression. Longer malformed
clauses can still sound mechanical. English gacha source normalization can benefit
all Google target languages, but the new precise short realizations are Russian;
the other targets use conservative provider fallback. No broader cross-language
generation expansion is justified by this focused evidence pass.

## Validation

309 tests including 18 new dictionary/context tests; strict core TypeScript and
JSON-to-TypeScript bridge integrity. The new test file also passes on Node 22.0.0.
The unified gate checks live Google output in all five modes, the previous
multilingual/spending/trading/stat fixture groups, and full Vencord testTsc plus
production build. See local `G:/codex_tmp/sony-dictionary-verified` capture output.
No Discord UI validation, release publication, installation, or PR merge is
performed by this dictionary-only pass.
