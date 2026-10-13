<div align="center">

# SonyTranslator

### Translate the message. Keep the person behind it.

Discord chat translation for Vencord · by **SonyDev**

[English](README.md) · [Русский](docs/README.ru.md) · [Deutsch](docs/README.de.md) · [简体中文](docs/README.zh-CN.md)

![Version](https://img.shields.io/badge/version-0.9.5-b77984)
![Transport](https://img.shields.io/badge/transport-Google_Translate-555b66)
![License](https://img.shields.io/badge/license-personal_use_%2B_attribution-555b66)

[Download installer](https://github.com/SonyDew/SonyTranslatorVencord/releases/latest) · [Report a problem](https://github.com/SonyDew/SonyTranslatorVencord/issues) · [License](LICENSE)

</div>

![Illustrative chat translation preview](docs/images/chat-preview.svg)

SonyTranslator automatically translates incoming Discord messages and your outgoing
messages through Google Translate. A deterministic language engine preserves meaning,
conversational phrasing and source style: slang, reactions, abbreviations, common typos
and gaming language. No paid API key or mandatory LLM is required.

## Install

1. Download **SonyTranslator-AutoInstaller-0.9.5.zip** from [Releases](https://github.com/SonyDew/SonyTranslatorVencord/releases/latest).
2. Extract the entire archive.
3. Run **Install SonyTranslator.cmd**, or **Update SonyTranslator.cmd** for an existing installation.
4. Wait for completion. The previously running Discord Stable/Canary/PTB client restarts automatically.
5. Open the translator button in the message composer to select reading/sending languages and styles.

AutoInstaller requires Windows. It downloads and builds Vencord locally. Node 22+ and
Git are installed through winget if needed. The window shows installation stages;
technical output is written to the log. Settings and unrelated plugins are preserved.
Failures restore the previous SonyTranslator payload before restarting Discord.
If no Discord was running, the installer does not guess which client to launch.

## Pick the right voice

| Mode | Behavior |
|---|---|
| Clean | Natural, grammatical, meaning-focused |
| Casual | Everyday clauses and conversational contractions |
| Slang | Chat phrasing and conservative abbreviations |
| Heavy | Stronger compression and source-supported emotion |
| Mirror | Adapts to the original message's style |

Incoming and outgoing modes are independent. Neutral messages do not receive invented
insults, profanity or vocatives. Recognition is broader than generation.

The interface follows your Discord language automatically, including settings,
notifications and language names. Twelve UI language profiles are available;
other Discord languages use English. Your reading and sending languages remain your choice.

## What stays intact

- Discord mentions, emoji, URLs, code and filenames.
- Participant names from replies, mentions and recent authors: `Mocha` stays `Mocha`.
- Literal meanings: reaction `Cool` differs from `It's cool outside`.
- Informal address and source punctuation/casing where safe.
- Translated reply previews with native `@name → quote` order, typography and colors.
- Incoming Russian/Ukrainian messages already in the reading language stay unchanged.
- English words in those mixed messages are kept by default; you can enable translating them in settings.

**Languages:** English, German, Russian, Ukrainian, Simplified Chinese (Mainland),
Traditional Chinese (Taiwan), Spanish, French, Brazilian Portuguese, Polish, Japanese
and Korean. Mainland and Taiwan rules are separate.

## Privacy and limits

The current message, sometimes normalized for meaning, is sent to Google Translate.
Reply/history messages and participant metadata are analyzed locally and are never
appended to Google's request. Context is bounded and ranked by relevance.
Novel sarcasm, private aliases and ambiguous abbreviations may still be misunderstood.
Low-confidence cases use conservative provider fallback.

SonyTranslator is not affiliated with Discord, Google or Vencord.

## Development

```sh
npm ci
npm run check
```

184 tests cover golden modes, incoming regressions, entities, dataset integrity, UI localization and
installer Git-update recovery on Windows. The benchmark has 500 cases. Full Vencord
`testTsc` and production build are required before release.

For manual installation, copy `index.tsx`, `styles.css`, `translationCore.ts` and
`slangDataset.ts`, `translationRunner.ts` and `localization.ts` into Vencord's `src/userplugins/SonyTranslator/`, then build and inject.
See [development history](docs/DEVELOPMENT.md) and [research notes](research/modern-chat-language-2025-2026.md).

## Authorship and permissions

Original author: **SonyDev / [SonyDew](https://github.com/SonyDew)**.
Personal use and private modification are permitted. Do not claim the project as your
own. Publishing, redistributing or rebranding an improved version requires SonyDev's
prior written permission and visible original-author credit. Request permission through
repository issues. Read [LICENSE](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md).
Earlier MIT copies retain their original terms.
