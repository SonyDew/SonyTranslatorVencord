# Incoming gaming spending / item senses — 15 October 2026

The user supplied a live Discord comparison. This pass addresses demonstrated
sense errors without trying to correct every malformed sentence in that chat.
Test context is synthetic and contains no participant identities or channel IDs.

## Evidence

* [Blox Fruits discussion, September 2025](https://www.reddit.com/r/bloxfruits/comments/1nig7iv/)
  discusses whether receiving gifted items counts as F2P. This confirms a
  transfer-of-goods sense, not a statement of personal talent.
* [Roblox discussion, July 2025](https://www.reddit.com/r/plsdonategame/comments/1m6xf1y/1000_robux_for_free/)
  independently combines F2P status, gifted gamepasses and purchases.
* [Sol's RNG discussion, May 2025](https://sol-rng.fandom.com/f/p/4400000000000113521)
  also qualifies F2P status by gifts. Definitions vary: the translator must
  translate each author's claim rather than enforce one payment policy.
* [Sailor Piece discussion, April 2026](https://www.reddit.com/r/SailorPiece/comments/1sdjzvh/)
  uses character race/clan, luck, damage and farming builds in the same thread.
  [Another discussion, April 2026](https://www.reddit.com/r/SailorPiece/comments/1sxnn2r/)
  independently uses races, clans and game progression. These support guarded
  character-race interpretation, not a global replacement of `race`.

No dependable cross-community definition of `soft F2P` was established. It stays
as a borrowed category label, including its qualifier; no invented spending
threshold or claim that the game itself is free is added.

## Implementation decisions

* Existing gaming metadata protects F2P and soft F2P; Robux is a protected currency.
* A reusable modal/recipient family recognizes gift requirements only with
  relevant item/currency context. Singular/elliptical and plural forms keep
  their number. Talent, mathematics and Bee Swarm contexts are negatives.
* A narrow definition family preserves the explicit negation in F2P/Robux
  spending statements. It does not rewrite affirmative spending or earning.
* Race-plus-stat normalization requires related RPG evidence. Racing/horse/car
  negatives are checked in context as well as the current message. Low-relevance
  neighboring turns cannot alone authorize this interpretation.

The existing dataset/core is reused; no new transport, LLM, or global dictionary
replacement is introduced. Incoming shortcuts provide Russian realization;
other targets use provider-safe semantic wording and conservative fallback.

## Limits and reproducibility

`tests/gamingSpending.test.ts` tests all five modes, negative senses, number,
negation, entities, URLs, mentions and code. Synthetic live samples are in
`benchmark/gaming-spending-samples.json`; captured raw Google and final outputs
are in `benchmark/captures/gaming-spending-2026-10-15.json`.

Google can still render surrounding `soft F2P` prose awkwardly, misunderstand
specialized Bee Swarm terminology, or guess number/gender/formality. Those
fallbacks are not claimed as fixed. The contradictory/malformed `my main ...
but f2p ...` sentence is not reconstructed automatically: insufficient evidence
exists for deciding which missing clause or subject the author intended.
