# Stat agreement and short contextual replies — 15 October 2026

Follow-up to PR #4, prompted by the user's live Discord screenshots. This fixes
the target-slot grammatical regression rather than weakening protected spans.

## Evidence and scope

* [March 2025 build discussion](https://www.reddit.com/r/WutheringWaves/comments/1j776eh/)
  and [February 2025 discussion](https://www.reddit.com/r/CastoriceMains_/comments/1iltpg7/)
  independently use critical-rate substats. A `sub` next to a stat can be a
  secondary equipment parameter, not an audio speaker or subscriber.
* [January 2025 weapon discussion](https://www.reddit.com/r/MHWilds/comments/1i3i8lc/)
  and [December 2025 discussion](https://www.reddit.com/r/valheim/comments/1pdf7r3/)
  use bow as a weapon. Only explicit relevant weapon/archery context selects
  the short `Bow?` shortcut; violin, ribbon and ship negatives block it.
* The tag-label regression is a local discourse-role issue, not a new meaning
  for `weed`. An exact label response is preserved only when a relevant turn
  discusses tags and no plant/drug context conflicts.

## Realization

Dataset technical entries can now supply Russian genitive, instrumental,
prepositional and dative forms. Only their own protected slots are inflected;
names, code and arbitrary message words are untouched. Local target syntax
selects the form: standalone `90% шанса`, `с 90% шансом`, `при 90% шансе`,
`с двойным критическим уроном`, `без шанса`, `к урону навыков`.

Explicit compound qualifiers (`extra`, `double`) are protected as whole
constructions, preventing modifier loss and reducing opaque-placeholder artifacts.
A spurious Google `с маркировкой <technical-slot>` wrapper is removed only next
to such a slot when the source never mentioned a label/mark/tag. Literal label
contexts are negative tests. This is a constrained transport repair, not a
general-purpose deletion of words from Russian sentences.

Provider-safe stat-shortfall recognition uses original current-message evidence
even when technical tokens have already been protected. It requires relevant
context and blocks missing-a-fact/story uses. Other-language target terms fall
back conservatively; no Russian morphology is applied to other languages.

## Validation and limits

`tests/statGrammar.test.ts` covers all five modes, cases, labels, literal senses,
unrelated context and compact `critdmg`. The live capture fixture has semantic
invariants and forbidden malformed forms. The unified local quality gate includes
it alongside previous multilingual, spending and trading checks.

No implicit millions or percent signs are added to ambiguous source numbers.
This is not a full Russian morphological parser. Unseen adjectives, long clauses,
ambiguous bindings, invented Google filler and labels for unknown game items can
still require conservative fallback or additional research-backed constructions.
