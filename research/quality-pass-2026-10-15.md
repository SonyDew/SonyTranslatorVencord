# Incoming quality and reliability pass — 15 October 2026

This is a conservative extension of the existing twelve-language research, not a
claim that every review candidate has been native-speaker approved. The 24
`quality-review-candidates.json` examples remain proposals for human review.

## Evidence and decisions

Public user-generated discussions were checked for recurring constructions,
not copied into fixtures or converted into sentence-specific output rules.

* German `komplett lost` expresses confusion in gaming discussions:
  [June 2026](https://www.reddit.com/r/zocken/comments/1twm2j3/),
  [October 2025](https://www.reddit.com/r/zocken/comments/1oh7ldy/).
  Normalize only the explicit first-person predicate, not every occurrence of
  `lost`, and do not generate the borrowing automatically.
* Brazilian `bora jogar` is an invitation:
  [May 2025](https://www.reddit.com/r/gamesEcultura/comments/1kcebbu/),
  [March 2025](https://www.reddit.com/r/gamesEcultura/comments/1j95l2d/).
  Normalize the verb construction, not `Bora` used as a name.
* Polish `nwm` introduces uncertainty:
  [January 2025](https://www.reddit.com/r/Polska/comments/1idirzb/),
  [August 2025](https://www.reddit.com/r/Polska/comments/1muhti4/).
  Require a complement word such as `czy`, `jak`, or `gdzie`.
* French `tkt` introduces reassurance:
  [April 2025](https://www.reddit.com/r/france/comments/1k7asbh/).
  Together with the existing French research, this supports recognition before
  a bounded conversational subject, not universal acronym expansion.
* Taiwan `你484…` asks `你是不是…`:
  [June 2025](https://forum.gamer.com.tw/C.php?bsn=29330&snA=22707),
  [December 2025](https://forum.gamer.com.tw/C.php?bsn=75703&snA=3756),
  [April 2025](https://forum.gamer.com.tw/C.php?bsn=82273&snA=525).
  Require `你` plus an allowlisted predicate onset. Bare `484` is often a
  quantity or part of a display name and must not be expanded.
* Ukrainian `шо ти робиш/думаєш/хочеш` uses the regional interrogative `шо`.
  See the Ukrainian discussions in `modern-chat-language-2025-2026.md`.
  Recognition is restricted to this grammatical frame; no regional generation.

Rejected: broad Mainland `人机` → insult (literal bots and names collide),
automatic dialect/vocative insertion, and promotion of the remaining review
candidates without stronger evidence. Existing semantic mappings still cover
all twelve languages; quality tests exercise their final realizations rather
than merely checking that preparation does not throw.

## Test interpretation

The twelve-by-twelve-by-five doom-intent matrix uses an intentionally wrong
literal provider sentinel. It checks semantic reconciliation, nonempty final
outputs, and absence of invented profanity. This is a deterministic regression
test, not a live Google quality score or independent human fluency rating.
Normalization tests include entity collisions and literal/acronym negatives.
