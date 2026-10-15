# Trading, stats and reply semantics — 15 October 2026

This pass follows user-reported Discord regressions. Fixtures use short generic
constructions and synthetic context, not participant identities or channel history.

## Evidence

* Distinct critical chance and damage: [May 2025 player build discussion](https://www.reddit.com/r/CastoriceMains_/comments/1kn0zu7/),
  [July 2025 discussion](https://www.reddit.com/r/PopsicleMains/comments/1mcm358/),
  [September 2025 discussion](https://www.reddit.com/r/MualaniMain/comments/1n8oa0p/).
  Their numerical values must not swap meanings during translation.
* `run with` as group participation: [December 2025 WoW discussion](https://us.forums.blizzard.com/en/wow/t/how-am-i-supposed-to-pug/2207064?page=4),
  plus the supplied gaming conversation. Physical running remains a valid literal
  interpretation; only sufficiently relevant raid/build/party evidence selects play.
* Poor-quality `buns`: [March 2025 weapon discussion](https://www.reddit.com/r/NarutoShinobiStriker/comments/1jm7thw/),
  [September 2025 Roblox discussion](https://www.reddit.com/r/roblox/comments/1nud94o/),
  [Roblox developer discussion, February 2025](https://devforum.roblox.com/t/high-stakes-sneak-peak/3452500).
  Recognition is restricted to a comparative predicate with gaming evidence.
  No automatic generation, added profanity, or bread/hair reinterpretation.
* Thousand-plus remainder: the user example and [September 2026 public discussion](https://texags.com/forums/16/topics/3622654/replies/72833080).
  This is numerical scale preservation, not a new slang-generation rule. Require
  price evidence and exclude running/resolution contexts. Decimal amounts remain
  conservative fallback rather than guessing decimal/thousands separators.

## Changes

Existing dataset gaming records can opt into `protect_translation`: an unambiguous
technical term is represented by a protected slot with a known target-language
value. Names, custom entities, code, mentions and URLs take precedence. Russian
initial coverage distinguishes critical chance, critical damage and skill damage;
other target languages retain provider-safe expansion without leaking Russian.
Numeric values are not changed or assigned invented percentages.

Incoming `True` needs related context for an agreement shortcut; Boolean/programming
contexts block it. Numbered stat ellipsis `mine ...` normalizes ownership without
inventing a weapon/item type. A narrow informal Russian repair fixes mid-clause
`вам нужен`; a word boundary also prevents `Вам` from corrupting `Вампир`.

The explicit Google capture tool now supports required/forbidden patterns for
**all five final outputs**, failing its exit status on violations. Live samples
and results are in `benchmark/trading-chat-samples.json` and
`benchmark/captures/trading-chat-2026-10-15.json`. This is a reproducible spot check,
not a claim that all chat or all languages have been native-speaker reviewed.

Remaining limits: stat-label slots can sound telegraphic in a grammatical sentence;
item names such as Ghost/Stella require reliable entity evidence; informal `you`
can be singular or plural; malformed trading claims and uncertain quantities are
not reconstructed by guessing. A Boolean `True` may remain a literal provider
translation rather than agreement, as intended by the negative fixture.
