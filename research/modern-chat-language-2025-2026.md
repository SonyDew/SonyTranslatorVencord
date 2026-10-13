# Modern chat-language research for SonyTranslator v0.8

Research dates: 2026-09-12–2026-09-13. The implementation work in this repository is based on public user-generated writing from 2025-2026, with older material used only when checking whether a form remained stable over time.

## Method

The corpus covers public Reddit discussions, Steam Community discussions/groups/reviews, DTF, Douyin, Bilibili, Dcard, Bahamut, Inven and Ruliweb. Public Discord message history is rarely indexable, so Discord-adjacent LFG, bot, moderation and gaming discussions were used instead. TikTok and Weibo did not expose enough stable, permalinked comment text to support generation rules; they were not simulated with dictionary or SEO examples.

A pattern is considered:

- **high confidence** when it recurs across independent authors and communities, normally on more than one thread or platform;
- **medium confidence** when it is current but carries a clear region, age, platform or stance signal;
- **recognition-only** when it is understood but dated, ironic, volatile, dialectal, or too risky to generate without conversation context.

No user message is copied into the dataset. The implementation stores generalized semantic and clause templates.

## Cross-language findings

The strongest shared result is that modern chat style is structural, not a bag of abbreviations:

1. Formal frames collapse into ordinary verbs: “perform a check” becomes “check”; Russian `осуществить проверку` becomes `проверить`; Polish `dokonać sprawdzenia` becomes `sprawdzić`.
2. Written connectors become short conversational ones: however/jedoch/однако/проте/sin embargo/cependant/no entanto/jednakże become but/aber/но/але/pero/mais/mas/ale, with language-specific ordering.
3. Recoverable subjects disappear in pro-drop languages and in short English/German replies. This is safe only when person and referent remain unambiguous.
4. Gaming intent is expressed with constructions, not only nouns: invitations, repeated-failure complaints, balance demands, short verdicts and lobby replies each have their own clause shapes.
5. Chat rhythm mostly preserves source affect: lowercase, missing final stops, ellipses, repeated punctuation, CAPS and laughter markers must not be invented merely because Heavy is selected.
6. Profanity must be indexed by pragmatic role (surprise, positive/negative intensifier, doom, filler, situation complaint, directed insult) and strength. Heavy must never introduce profanity absent from the source.

## English

High-confidence rules include `however -> but`, unambiguous trailing `tho` in Slang/Heavy, `therefore -> so`, `violates rules/policy/terms -> breaks ...`, `it is not necessary -> you do not need to`, rhetorical purpose questions becoming `what's the point`/`why even`, and invitations becoming `anyone want/wanna play?`. Repeated faults prefer event verbs such as `keeps crashing`, `keeps lagging`, and short symptom clauses.

The specific forms requested for validation have different safety profiles:

- `urself` is current, but should be Heavy or part of an already compressed `u/ur` cluster, not Casual.
- `w/o` is current in gaming/technical chat before a short noun phrase or gerund; it is not a universal replacement for “without”.
- object/prepositional `em` remains current, but needs a close unambiguous antecedent and is recognition-only in the default profile.
- `prolly` is current in chat/gaming, but inappropriate in moderation, formal warnings or neutral factual uncertainty.
- the proposed general rewrite `if there is X in them -> if they got X in em` was rejected: possession, acquisition, containment and number can diverge. The safer structural family is `did X without even checking Y -> did X and didn't even check Y`.

Evidence: [Discord community discussion, Apr 2025](https://www.reddit.com/r/discordapp/comments/1jp02ef), [Discord bot discussion, Sep 2025](https://www.reddit.com/r/discordapp/comments/1ns13zp), [Steam Deck support, Feb 2025](https://steamcommunity.com/app/1675200/discussions/0/599644118125144859/), [PEAK discussion using w/o, Aug 2025](https://steamcommunity.com/app/3527290/discussions/0/592905171239070417/), [Limbus Company discussion using w/o, Feb 2025](https://steamcommunity.com/app/1973530/discussions/0/597393519024346902/), [SteamScams object em, Apr 2025](https://www.reddit.com/r/SteamScams/comments/1k7tjd4), [Arma 3 urself, Jul 2025](https://steamcommunity.com/app/107410/discussions/0/591775577045833890/), [Roblox discussion, Jul 2025](https://www.reddit.com/r/roblox/comments/1m667te), [GamerPals LFG, 2025](https://www.reddit.com/r/GamerPals/comments/1kcuuvw).

Recognition-only/default-off: `finna`, automatic `bro/homie/dawg`, `no cap`, `rizz`, `it's giving`, brainrot templates, `git gud`, and dialect-like grammar. They are current in some groups but would make the translator impersonate a demographic rather than preserve style.

## German

High-confidence demotion rules are `jedoch/allerdings -> aber`, `dennoch/nichtsdestotrotz -> trotzdem`, `folglich -> also/deshalb`, agent-safe necessity (`es ist notwendig -> du/man musst`) and short reply forms such as `hab`, `bin dabei`, `weiß nicht`, `keine Ahnung`. Gaming clauses naturally integrate `laggt`, `crasht`, `läuft`, `Build`, `Loot`, `farmen`, `grinden`, `OP` and `broken`, but only in a gaming context. LFG commonly uses `Jemand Bock auf X?`, `Noch wer?`, `Bin dabei`, `Add mich`.

Evidence: [r/zocken mobile gaming, May 2025](https://www.reddit.com/r/zocken/comments/1knum41/), [r/zocken recommendations, Sep 2025](https://www.reddit.com/r/zocken/comments/1n5lfek), [r/zocken LFG, Feb 2026](https://www.reddit.com/r/zocken/comments/1rhh93v/), [German gaming preferences, Jun 2026](https://www.reddit.com/r/zocken/comments/1twm2j3/), [German loot/grind discussion, Dec 2025](https://www.reddit.com/r/zocken/comments/1pre7gz/).

Recognition-only/profile-driven: `wallah/yallah`, dialect spellings such as `kannste/haste/musste/nich/dat`, automatic `Digga/Brudi`, `das crazy`, `nh`, and forced lowercase German nouns. Modal particles (`halt`, `doch`, `eh`, `einfach`) alter stance and cannot be sprinkled in as decoration.

## Russian

High-confidence gains come from nominal-to-verbal collapse (`необходимо осуществить проверку -> нужно проверить`), simple connectors (`однако/тем не менее -> но`), goal/cause compression (`для того чтобы -> чтобы`, `в связи с тем, что -> потому что`), guarded first-person pro-drop, and gaming intent templates (`кто в X?`, `погнали в X`, `кто хочет — пишите`). Gaming mappings such as `разрабы`, `рандомы`, `ливнул`, `пофиксили`, `в соло`, `кооп`, `репорт`, `лузстрик` require gaming context.

Evidence: [Dead by Daylight Steam, Sep 2025](https://steamcommunity.com/app/381210/discussions/17/595161023680419187/), [STALZONE Steam, Nov 2025](https://steamcommunity.com/app/1818450/eventcomments/684111558794585849/), [7 Days to Die Steam, Jan 2025](https://steamcommunity.com/app/251570/discussions/0/777534384814228488/), [r/ru_gamer LFG, Dec 2025](https://www.reddit.com/r/ru_gamer/comments/1pqdwew/), [DTF Battlefield 6 discussion, Aug 2025](https://dtf.ru/games/3951288-itogi-pervogo-dnya-bety-battlefield-6).

Recognition-only/default-off: `сяб`, `срз`, `лан`, `ток`, `ваще` and deliberate misspellings. `го` may generate only for a clear gaming invitation; it conflicts with the game Go and is age-marked. `имба` must not mean merely “good/strong”.

## Ukrainian

High-confidence conversational rules: `наразі -> зараз`, `необхідно/слід -> треба`, `однак/проте -> але`, `у випадку якщо -> якщо`, `для того щоб/з метою -> щоб`, `існує можливість -> можна`, `здійснити перевірку -> перевірити`. Modern gaming writing naturally uses `апдейт`, `білд`, `пінг`, `лаґає`, `у паті`, `у соло`, `фармити`, `гріндити`, with context guards.

Evidence: [UA_Gamers, Nov 2025](https://www.reddit.com/r/UA_Gamers/comments/1p8z4d1/), [UA_Gamers, Dec 2025](https://www.reddit.com/r/UA_Gamers/comments/1pogbwl/), [UA_Gamers, Jan 2026](https://www.reddit.com/r/UA_Gamers/comments/1q56w7s/), [UA_Gamers, Aug 2026](https://www.reddit.com/r/UA_Gamers/comments/1vdaoi7/), [Ukraine_UA conversational thread, Aug 2025](https://www.reddit.com/r/Ukraine_UA/comments/1mtpjo3/).

Recognition-only/default-off: regional `шо/шось/тре`; Russian-influenced `го`, `погнали`, and `но`. These may be mirrored only when several source markers support that profile.

## Mainland Chinese (`zh-CN`)

High-confidence patterns are topic-first order, safe subject drop, complaint questions (`为什么还没修 X -> X 怎么还没修`), short rhetorical verdicts (`这怎么赢`, `这合理吗`), and result compression with `直接/根本/纯` only when the source already supports that force. `不是，...` is a discourse repair opener; `不是哥们，...` adds mock/confrontational stance and is guarded.

Evidence: [Douyin, Apr 2025](https://www.douyin.com/video/7491247800726965516), [Douyin, Jul 2025](https://www.douyin.com/video/7526346728396574004), [Douyin, Dec 2025](https://www.douyin.com/video/7584447588109323577), [Bilibili, Apr 2025](https://www.bilibili.com/video/BV1dZfKYeEJr/), [Bilibili, Sep 2025](https://www.bilibili.com/video/BV1ZuYKzjEr7/).

`yyds`, `u1s1`, `xswl`, `awsl`, `栓Q`, and `233` are recognition-only/default-off. Full `有一说一` and `笑死` remain more natural than their initialisms. `绝绝子` remains dated. Mainland rules must not leak into Taiwan output.

## Taiwan Chinese (`zh-TW`)

High-confidence patterns include topic-first clauses, dropped recoverable subjects, complaint framing with `到底/怎麼`, binary `要嘛 A，要嘛 B`, and a region-specific degree ladder (`蠻/很` then guarded `超/有夠`). Particles such as `啦/欸/喔` and markers such as `ㄏㄏ` change interpersonal stance and are preserved only from source affect.

Evidence: [Dcard AoV, Jun 2025](https://www.dcard.tw/f/aov/p/259467990), [Dcard gaming, 2025](https://www.dcard.tw/f/game/p/259836661), [Bahamut MapleStory, Jun 2025](https://forum.gamer.com.tw/C.php?bsn=7650&snA=1033053), [Bahamut LoL, Jan 2026](https://forum.gamer.com.tw/C.php?bsn=17532&snA=706553).

Recognition-only/default-off: `484`, `94`, `3Q`, `森77`, `母湯`, `是在哈囉`, `87`, `XDD/QQ` outside exact reaction/Mirror. Taiwan output must not receive Mainland `不是哥们/卧槽/咋`.

## Spanish

The cross-regional safe layer is conservative: `sin embargo/no obstante -> pero`, `es necesario -> hay que`, `con el fin de -> para`, `no es necesario -> no hace falta`, `viola/incumple las reglas -> rompe las reglas`, and short LFG forms such as `¿alguien/quién para jugar?`. Subject pronouns may disappear because Spanish is pro-drop, but only when the verb form is unambiguous.

Evidence: [Human Fall Flat Spanish topics, 2025](https://steamcommunity.com/app/477160/discussions/5/), [R.E.P.O. Spanish LFG, Mar 2025](https://steamcommunity.com/app/3241660/discussions/0/603024565118978644/?l=spanish), [Tarkov Spanish discussion, Nov 2025](https://steamcommunity.com/app/3932890/discussions/1/690868131878416112/), [Argaming discussion, Sep 2025](https://www.reddit.com/r/Argaming/comments/1nn2p2v), [VideojuegosMX, Aug 2026](https://www.reddit.com/r/VideojuegosMX/comments/1vr6g9f/se_viene/).

Regional forms such as Argentine `re/banda`, Mexican `wey/nmms/alv`, Spanish `tío`, and `pana` are recognition-only unless a future explicit regional profile is selected. They must never be mixed into one generic Spanish persona.

## French

High-confidence changes are `cependant/néanmoins -> mais`, `il est nécessaire de -> il faut`, `afin de -> pour`, `ce n'est pas nécessaire -> pas besoin de`, ordinary negation compression (`je ne sais pas -> je sais pas`) in Slang+, and gaming evaluations such as `c'est pas ouf`, `ça me gave`, `j'ai la flemme de`, `ça lag/crash`. Subject removal is much less general than in Spanish/Slavic languages.

Evidence: [r/jeuxvideo, Sep 2025](https://www.reddit.com/r/jeuxvideo/comments/1n7cihm), [r/jeuxvideo, Jul 2025](https://www.reddit.com/r/jeuxvideo/comments/1m0kg2f), [r/jeuxvideo, Nov 2025](https://www.reddit.com/r/jeuxvideo/comments/1pa5voz/), [r/jeuxvideo, Mar 2026](https://www.reddit.com/r/jeuxvideo/comments/1rrxbu7/), [r/jeuxvideo, May 2026](https://www.reddit.com/r/jeuxvideo/comments/1t49k9u/).

`jpp`, `mdr`, `ptdr` remain recognizable/current in reactions, while automatic `wesh/frr/bg` or elongated laughter would impose a persona. `lol` is recognition-only/downgraded in the current French pack.

## Brazilian Portuguese

The high-confidence layer uses `no entanto/contudo -> mas`, `é necessário -> tem que`, `para poder -> pra`, `não é necessário -> não precisa`, and gaming/LFG constructions `bora`, `chama`, `me add`, `alguém on?`. Natural messages often omit subject pronouns, use short clauses, `pra`, and a small number of stable reductions (`vc`, `q`, `mt`, `agr`) rather than compressing every word.

Evidence: [gamesEcultura weekly thread, Mar 2025](https://www.reddit.com/r/gamesEcultura/comments/1jiqwxe), [gamesEcultura discussion, Mar 2025](https://www.reddit.com/r/gamesEcultura/comments/1j8pe2z), [XboxBrasil LFG, Apr 2025](https://www.reddit.com/r/XboxBrasil/comments/1jpwo0s), [R.E.P.O. Steam BR, Mar 2025](https://steamcommunity.com/app/3241660/discussions/0/595142878916813641/?l=portuguese), [PEAK Steam BR, Aug 2025](https://steamcommunity.com/app/3527290/discussions/1/687494077953960915/).

`slk`, `pprt`, `mn`, elongated `kkkk`, and regional/vocalized spellings are recognition-only or exact-reaction/Mirror material. Profanity such as `puta que pariu`, `o foda é que`, and `essa desgraça` has different pragmatic functions and cannot be translated word-for-word.

## Polish

High-confidence rules are `obecnie -> teraz`, `należy/konieczne jest -> trzeba`, `jednakże/niemniej jednak -> ale/jednak`, `w przypadku gdy -> jeśli`, `w celu/po to, aby -> żeby`, `istnieje możliwość -> można`, `dokonać sprawdzenia -> sprawdzić`, `narusza zasady -> łamie zasady`. Gaming Polish productively inflects English roots (`znerfili`, `zbuffowali`, `skipnął`, `randomy`), but only in gaming context.

Evidence: [r/Polska gaming thread, May 2025](https://www.reddit.com/r/Polska/comments/1kq3lge/), [r/Polska gaming thread, Jul 2025](https://www.reddit.com/r/Polska/comments/1lzdqkr/), [r/Polska gaming thread, Mar 2026](https://www.reddit.com/r/Polska/comments/1s18u94/), [Polish games discussion, Sep 2025](https://www.reddit.com/r/Polska/comments/1nn8hdt/), [Europa Universalis V Steam reviews, 2025-2026](https://steamcommunity.com/app/3450310/negativereviews/?browsefilter=toprated&l=polish&snr=1_5_100010_).

`nwm` is recognized but too sparse for default generation; removing Polish diacritics is never generated. `xD` is preserved/mirrored rather than invented. `git` can mean “fine” only in a complete non-development predicate; it conflicts with Git in developer contexts.

## Japanese

High-confidence rules are recoverable pronoun omission, productive contractions (`している -> してる`, `ではない -> じゃない`, `という -> って`, `てしまう -> ちゃう`, `なければ -> なきゃ`), evaluative fragments (`これ無理`, `普通に面白い`, `さすがにきつい`), and complaint questions (`なぜまだ修正されていないのですか -> これまだ直ってないの？`). Plain/contracted morphology and topic-fronting must be applied together; random slang tokens are insufficient.

Evidence: [Japanese Reddit game thread, Jul 2025](https://www.reddit.com/r/newsokuexp/comments/1lp35si), [Japanese Reddit game thread, Nov 2025](https://www.reddit.com/r/newsokuexp/comments/1olho5v/), [Steam Visage reviews, 2025](https://steamcommunity.com/app/594330/negativereviews/?browsefilter=trendyear&filterLanguage=japanese&l=english&p=1), [Steam Portal 2 review, Sep 2025](https://steamcommunity.com/app/620/negativereviews/?browsefilter=toprated&l=japanese).

`草/w` is current but laughter-specific. `ワロタ/ワロス`, `ぴえん` and `なう` are recognition-only/downgraded. `死ね` is never generated. Assertive `だろ/んだよ` is not a universal casual suffix.

## Korean

High-confidence patterns are recoverable subject/object/particle omission, conversational endings (`합니다/입니다 -> 해/이야`) and guarded board compression (`함/임/됨`), discourse-repair `아니`, rhetorical `이게 맞냐?`, `왜 X 안 함?`, and instruction `그냥 X하면 돼` / gaming-board `걍 X하면 됨`. `ㅋㅋ/ㅎㅎ/ㅠㅠ/;;` preserve affect and are not generic punctuation.

Evidence: [Inven Lost Ark, May 2025](https://www.inven.co.kr/board/lostark/6271/1879819), [Inven Sorceress, Nov 2025](https://www.inven.co.kr/board/lostark/5770/115505), [Ruliweb, Jul 2025](https://bbs.ruliweb.com/community/board/300143/read/71518826), [Ruliweb, Dec 2025](https://bbs.ruliweb.com/community/board/300143/read/73417858), [Ruliweb, Jan 2026](https://bbs.ruliweb.com/community/board/300143/read/73899071).

Consonant forms (`ㅇㅇ/ㄴㄴ/ㄱㄱ/ㅈㅅ/ㄹㅇ/ㅇㅈ`) are exact-reply or already-compressed-style outputs, not universal substitutions. `킹받네`, `헐`, `대박` are recognition-only/default-off. Strong `존나/씨발/ㅅㅂ` requires source profanity.

## Incoming semantic validation pass

The v0.8 pass concentrated on meaning before generation. Repeated 2025–2026 discussions confirm that English `cook` cannot have a token-level mapping: `he cooked` is praise, `let him cook` asks others not to interrupt a potentially good idea, while `he is cooked` and `we're cooked` predict failure. The grammatical relation—not the word itself—sets polarity. This contrast appears independently in [MinecraftBuilds, January 2025](https://www.reddit.com/r/Minecraftbuilds/comments/1idnwbm/did_my_little_brother_cook/), [GameboyAdvance, February 2025](https://www.reddit.com/r/GameboyAdvance/comments/1io7lna/), [meirl, May 2025](https://www.reddit.com/r/meirl/comments/1kumdyw/), [PetPeeves, December 2025](https://www.reddit.com/r/PetPeeves/comments/1ptdc4n/when_people_act_like_cooked_is_something_only/) and [crappymusic, February 2026](https://www.reddit.com/r/crappymusic/comments/1rc0af2/somebody_please_stop_him_from_cooking/). Literal food nouns remain a hard negative guard.

Gaming doom/result constructions also recur as native clauses rather than dictionary substitutions. Mainland Chinese `这把…寄了` occurs as a match-result prediction in [Bilibili, June 2025](https://www.bilibili.com/video/BV1yDM2zVEv4/); Taiwan discussions use `沒救了` for a team/game state in [Bahamut, 2025](https://forum.gamer.com.tw/C.php?bsn=79940&snA=611) and again in [Bahamut's 2026 LCK discussion](https://forum.gamer.com.tw/C.php?bsn=17532&gothis=6317891&page=565&snA=706592). Japanese `詰んだ` is productive for an unrecoverable game state in [Steam reviews, May 2025](https://steamcommunity.com/app/304390/negativereviews/?browsefilter=recentlyupdated&filterLanguage=japanese&p=1), while `詰んだｗ` combines the result with laughter in [The Infected review history, 2025–2026](https://steamcommunity.com/app/1360000/reviews/?browsefilter=toprated&l=japanese). These forms are recognized as doom only in complete/result constructions; the underlying characters or stems are not rewritten globally.

Balance language is similarly constructional. Russian players combine `имба`, inflected `занерфили`, `в говно`, build vocabulary and profanity without each part retaining a literal independent meaning, as shown by [ru_gamer, August 2025](https://www.reddit.com/r/ru_gamer/comments/1mtjifv). Brazilian discussions repeatedly use `jogo quebrado` for a defective or unbalanced game and distinguish it from a physically broken object in [gamesEcultura, September 2025](https://www.reddit.com/r/gamesEcultura/comments/1nrxvck), [October 2025](https://www.reddit.com/r/gamesEcultura/comments/1nypepe) and [April 2026](https://www.reddit.com/r/gamesEcultura/comments/1sgsc8d/o_que_foi_normalizado_na_ind%C3%BAstria_de_jogos_que/). The executable mapping therefore requires a game item/build/weapon clause or an exact high-confidence phrase; bare `broken/quebrado` stays with the provider.

Register evidence supports a conservative T/V policy. Current German gaming discussion addresses individual peers with `du/dich` forms, for example [r/zocken, September 2025](https://www.reddit.com/r/zocken/comments/1n5lfek), while plural community prompts naturally use `ihr`, as in [r/zocken, July 2025](https://www.reddit.com/r/zocken/comments/1m4o2o2). French gaming threads mix public-post `vous` with direct reply `tu` rather than treating Casual as automatically informal; examples include [jeuxvideo, May 2025](https://www.reddit.com/r/jeuxvideo/comments/1kw0bwq) and [September 2025](https://www.reddit.com/r/jeuxvideo/comments/1n7cihm). SonyTranslator therefore detects register from the source before Google, uses a Discord/gaming hint only when English `you` is genuinely ambiguous, and applies structural verb–pronoun repairs instead of blind `Sie → du` replacement.

The safe-to-generate set remains deliberately smaller than recognition. `we're so back` is understood as recovery but not generated by default; regional Spanish `ya valí`, strong German/Russian/Polish doom profanity, Mainland `寄了`, Taiwan particles, Japanese board-style fragments and Korean consonant compression are either exact-source/mirror forms or conservative outputs. Bare `cooked`, `dead`, `real`, `valid`, `W/L`, isolated `broken`, and literal `frito/cuit/gekocht` are not aggressively normalized without a complete phrase or supporting context.

## Implementation decisions

The dataset will gain executable naturalization rules with language, region, stage, operation, style outputs, confidence, contexts, generation/recognition gates and negative guards. The core will apply them in this order:

```text
semantic shortcuts
-> phrase/formality rules
-> clause-level structural operations
-> conversational grammar/contractions
-> slang and abbreviation generation
-> source casing/punctuation restoration
```

The first implementation intentionally selects only high-confidence, low-stance-delta rules. Region/persona forms and affect/profanity injection remain disabled. CJK clause templates are kept separate by language and region.

## v0.9 validation: local context, German clause rhythm and pragmatic profanity

Research pass: 2026-09-13. This pass deliberately sampled complete clauses and adjacent replies rather than collecting isolated slang tokens. The primary evidence was public 2025–2026 user-generated discussion; older material was used only as a stability check. No quoted user sentence was copied into executable data.

### German conversational structure

Across independent r/zocken discussions, ordinary German gaming/chat prose repeatedly prefers short finite clauses, `hab`, `grad`, `schon`, `Bock`, English gaming nouns, and recoverable-subject omission. Full provider-like constructions such as `bereits überprüft`, `werde jetzt beitreten`, `Heilungen`, and `bereits abgeschlossen` are understandable, but are markedly less chat-native than `schon gecheckt`, `komm gleich rein`, `Heals`, and `schon fertig`. Current examples were checked in [September 2025 gaming discussion](https://www.reddit.com/r/zocken/comments/1n8x97b), [September 2025 recommendations](https://www.reddit.com/r/zocken/comments/1noqwba), [October 2025 weekend thread](https://www.reddit.com/r/zocken/comments/1nws268/langes_wochenend%C3%A4%C3%A4%C3%A4_was_zockt_ihr_so/), [December 2025 adult-gaming discussion](https://www.reddit.com/r/zocken/comments/1phod8v/fr%C3%BCher_jeden_tag_gezockt_jetzt_30_feierabend_und/) and [June 2026 current-games thread](https://www.reddit.com/r/zocken/comments/1tzjaad/was_habt_ihr_als_letztes_gezockt_was_zockt_ihr/).

The implementation therefore treats the following as clause families rather than global word substitutions:

- wellbeing question: `Wie geht es dir?` → `Wie geht's dir?` / `Wie geht's?` / `wie gehts?`;
- completed-result clause: `Wir haben bereits abgeschlossen.` → `Wir sind schon fertig.` / `schon fertig`;
- immediate lobby action: `Ich werde jetzt beitreten.` → `Ich komm gleich rein.` / `komm gleich rein`;
- gaming-resource question: `Hast du noch Heilungen?` → `Hast du noch Heals?` / `Heals?`;
- checked-object question: `Hast du den Server bereits überprüft?` → `Hast du den Server schon gecheckt?` / `Server gecheckt?`.

These rules are bounded to complete clauses and selected gaming/technical nouns. `bereits`, `ich habe`, `es gibt`, or `du` are not deleted globally. Business/legal tails such as `Vertrag`, `Antrag`, and `Kündigung` explicitly block the new `hab grad` compression. `Digga`, `Brudi`, `Alter`, dialect spellings (`haste`, `kannste`, `nich`) and discourse particles (`halt`, `doch`, `eh`) remain recognition-first because they signal group, region, or stance. The engine never invents a vocative merely to make Heavy differ.

International tokens such as `wtf`, `lol`, `gg`, `wp`, `afk` and `brb` continue to function as borrowed internet expressions in German communities rather than requiring literary expansion. Current German Reddit discussion also shows English platform vocabulary used without translation; see [r/germany, July 2025](https://www.reddit.com/r/germany/comments/1m18ywr/why_do_so_many_germans_use_reddit/). An [older AskAGerman discussion](https://www.reddit.com/r/AskAGerman/comments/lu89ng) was used only to confirm that the borrowing pattern is stable, not as evidence of 2025 novelty.

### Russian profanity as a grammatical/pragmatic operator

Current Russian-language discussions confirm that `пиздец` is polyfunctional: a standalone doom verdict, an evaluation (`это пиздец`), a frustrated reaction (`ну пиздец`), or a productive degree operator in `пиздец как + predicate`. The predicate determines polarity: `пиздец как красиво` is admiration, while `пиздец как бесит` is frustration. This distinction appears in independent 2025–2026 learner/native explanations and translation discussions: [March 2025 discussion](https://www.reddit.com/r/russian/comments/1jesx1f/), [January 2025 pragmatic explanation](https://www.reddit.com/r/russian/comments/1icylpw), [November 2025 context-dependent translation](https://www.reddit.com/r/russian/comments/1or8j3f/) and [April 2026 translation request](https://www.reddit.com/r/russian/comments/1rkjs0i/need_translation/).

SonyTranslator now records `pragmaticProfanityRole`, intensity, emotion, polarity, register and the source of emphasis before normalization. `пиздец как я хочу спать` becomes a provider-safe meaning equivalent to “speaker very strongly wants to sleep”; target realization then restores the original strength according to output mode. Positive admiration is never normalized as disaster, and neutral sources never gain profanity. Lower-confidence functions of `putain`, `joder/puta`, `kurwa`, `씨발`, Mainland `他妈的`, and Taiwan `幹/他媽` are recognized but are not general-purpose generation rules.

### Context and rejected transformations

The useful local-context result is narrow: an exact short reaction such as `real`, `same`, `fr`, `жиза`, `точно`, `echt`, or `genau` may resolve to agreement when a reply target or one of the last four messages supplies a related proposition. Context does not override current-message language, is never concatenated to the provider request, and is not used to rewrite a longer literal use such as Russian `это реально плохо`.

Rejected from automatic generation in this pass:

- adding `Digga`, `bro`, `Alter`, sarcasm, anger, insults, or profanity absent from the source;
- globally deleting German subjects/pronouns or replacing every `bereits` with `schon`;
- treating one `wtf`, `lol`, or profanity token as proof that the whole message is Heavy;
- literal one-token profanity dictionaries across languages;
- sending reply/channel history to Google or embedding internal intent markers in provider text;
- automatic generation of regional, age-marked, consonant-only, brainrot, or rapidly shifting meme forms without multiple style signals.

## v0.9.1 validation: messy incoming Discord English

Research pass: 2026-09-13. This pass checked complete 2025–2026 user-generated gaming and Discord-adjacent clauses, not glossary entries. Steam discussions repeatedly use `ain't no way` as an incredulous stance marker before a proposition, often alongside lowercase, malformed agreement, repeated punctuation, `lol`, gaming nouns and emoji. Examples span [Monster Hunter Wilds, February 2025](https://steamcommunity.com/app/2246340/discussions/0/600770233128476947/), [Tokyo Xtreme Racer, February 2025](https://steamcommunity.com/app/2634950/discussions/0/505068966120620697/), [CloverPit, September 2025](https://steamcommunity.com/app/3314790/discussions/0/595161023680727029/) and [Assassin's Creed Valhalla, December 2025](https://steamcommunity.com/app/2208920/discussions/0/686365261725544436/). It is therefore analyzed as reaction/incredulity plus its clause, not translated as a literal construction word by word.

Public Discord discussion confirms that `ss` is actively used for `screenshot` when local syntax supplies screenshot actions such as `take`, `send`, `show`, `post` or possession of an image. The same token is too polysemous to expand globally; evidence includes [r/discordapp, August 2025](https://www.reddit.com/r/discordapp/comments/1g3mfzm/discord_can_detect_if_you_take_a_screenshot/) and [r/privacy, December 2025](https://www.reddit.com/r/privacy/comments/1py68jz/psa_iphone_photo_edits_can_leak_your_original/). The executable rule is therefore context-gated.

Current UGC also supports clustered compression (`finna/gonna/gotta`, omitted apostrophes, `rn`, `ngl`, `fr/frfr`) and emoji-assisted stance. A January 2025 [r/Nicegirls discussion](https://www.reddit.com/r/Nicegirls/comments/1ieifrq/) contains these forms across independent participants, while the discussion itself shows that `finna` is dialect/group-marked. SonyTranslator recognizes the intended future/imminent action, but `finna` and `boutta` remain generation-disabled so the plugin does not impose a dialectal persona.

Short tokens are now sense records, not dictionary replacements. `Cool` as a standalone reply is an acknowledgement/positive reaction, while `cool outside` remains temperature; `sick` is praise only in evaluative object clauses and illness elsewhere; `goes hard` is praise only as a complete construction; `dead` can be a laughter/reaction predicate but remains literal with an animate/physical-death proposition. `fire`, `hard`, `mad`, `clean`, `valid`, `based`, `odd`, `weird`, `fine`, `sure` and `bet` follow the same conservative speech-act-first principle. Unclear cases remain on the provider path.

Participant names are recognized before typo/slang normalization from a bounded set: reply target, mentions, current/recent authors and channel display names. Exact normalized spelling plus a strong vocative/subject position can protect lowercase `mocha` as `Mocha`; an object construction such as `ordered a mocha` explicitly blocks entity promotion. Fuzzy server-wide scans and dictionary autocorrection of unknown usernames were rejected for correctness and performance.
