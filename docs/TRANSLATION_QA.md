# Translation quality review guide

This guide supplements deterministic tests. It does **not** claim that the live Google Translate provider or Discord integration has been tested.

## Why add human-reviewed output examples?

The existing 300 conversational, 80 semantic and 120 incoming-chat benchmark rows provide useful structural and semantic checks, but many do not measure final translation quality against a natural native-language target. Use `benchmark/quality-review-candidates.json` as a *candidate* evaluation queue, not an automatic pass list or training set.

## Review workflow

1. Verify the source meaning, region and situational context; add a negative/literal interpretation where applicable.
2. Capture raw provider output and SonyTranslator output **in the same language pair and style**. Date and record the provider version/environment when practical.
3. Have a proficient reviewer score each output: semantic fidelity (0–2), naturalness (0–2), preserved tone/register (0–2), technical/Discord entity integrity (0–2). Record critical failures (wrong meaning, negation, introduced profanity, changed names) separately.
4. Only promote a candidate to an automated golden test after the intended output and negative contexts are checked. Prefer a deterministic mocked-provider test for reproducibility.
5. Measure changes on unrelated languages, Clean mode, literal meanings and named entities to avoid overfitting. Avoid inventing slang to make Heavy look more different.
6. For Google-dependent examples, compare with a dated captured provider response. Treat provider output as variable; do not hard-code a timeless claim of live accuracy.

## Priorities

- **Compatibility:** build against current Vencord upstream, including `testTsc` and `build`. A passing core-only `npm run check` is not a substitute for an integration build.
- **Same-language text:** preserve already-correct content, but be conservative about short/ambiguous words and mixed-language chat.
- **Chat semantics:** literal use vs slang ("cooked", "ate", "locked in"), negation, irony, nicknames, gaming senses and language/region differences.
- **Safety:** never alter code blocks, mentions, URLs, timestamps, or intentionally preserved names.
- **Reliability:** rate limits, outdated requests and errors must not hide original messages; document whether outgoing messages fail open.

## Candidate fixture schema

Each item has `id`, `sourceLanguage`, `targetLanguage`, `mode`, `source`, `candidateTranslation`, `intent`, `risk`, and `negativeGuard`. These are proposed natural equivalents for future review, **not observed plugin results or assertions**. A reviewer should accept, revise or reject them before use in CI.

## Release checks

- Run `npm ci && npm run check`.
- Build inside a fresh upstream Vencord checkout (`pnpm install --frozen-lockfile`, `pnpm testTsc`, `pnpm build`) with the userplugin copied into `src/userplugins/SonyTranslator`.
- Check actual Discord incoming/reply/composer flows separately; static tests cannot guarantee runtime UI compatibility.
- Do not merge compatibility changes solely on successful regex/static source checks.
