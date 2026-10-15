# Crafting dictionary follow-up — 16 October 2026

The user's new screenshots expose `forged` being interpreted as counterfeiting,
uncountable Russian ore agreement, and a crafting label being translated as luck
with counterfeits. These are additional fixtures, not evidence that the preceding
candidate has been installed: that candidate was not installed in Discord.

## Meaning evidence and conservative scope

Independent UGC uses forging for equipment crafting and upgrades:
[March 2025 Stardew discussion](https://www.reddit.com/r/StardewValley/comments/1j6iu9f/)
and [October 2026 Valheim discussion](https://www.reddit.com/r/valheim/comments/1x6my89/the_new_forge_of_potential_mechanics_save_mapping/).
These support the general crafting sense, not the exact mechanics of the unnamed
game in the screenshots. No assumptions about VIP privileges, success chances,
the meaning of 4/4, or a 93% masterwork quality are encoded.

## Implementation

* Subject + past-tense `forged` can normalize to `crafted` only with equipment or
  smithing evidence. Signature, passport, document, alliance and similar senses
  veto it. Unrelated nearby channel chatter does not supply evidence.
* The same high-confidence construction opts into a bounded language score hint.
  Otherwise the French register marker `ton` incorrectly outweighs English `a TON`.
  Clear source script still wins; ordinary French `ton armure` is a negative test.
* Counted integer `ores` becomes `units of ore` with crafting evidence. Integer
  `1k ores` means one thousand units. Decimal and ore-type ambiguity fall back.
* `Forge Luck` remains a source label in relevant equipment discussions; no
  undocumented bonus or percentage is added.
* Contextual `I pulled one.` can mean `I got one.` without inventing an omitted
  weapon/item. Physical tooth/muscle/lever contexts are blocked.

14 new offline tests exercise all modes, source language, literal senses, weak
context, code, numbers and preserved labels. Live fixtures cover the screenshots,
ordinary French and literal counterfeiting. The phone message is a control;
Google can still infer purchase from `got a new one`, which is not guaranteed by
the source. Also, longer clauses, formal pronouns and `masterwork` realization
remain imperfect; passing selected invariants is not a native fluency score.
