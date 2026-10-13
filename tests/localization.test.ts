import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { languageDisplayName, resolveUiLocale, uiKeys, uiPacks, uiText } from "../localization.ts";

test("all twelve UI packs contain every nonempty message", () => {
    assert.equal(Object.keys(uiPacks).length, 12);
    for (const [locale, values] of Object.entries(uiPacks)) {
        assert.equal(values.length, uiKeys.length, locale);
        assert.ok(values.every(value => typeof value === "string" && value.trim()), locale);
        for (const key of uiKeys) assert.ok(uiText(locale, key).trim(), `${locale}:${key}`);
        assert.match(uiText(locale, "privacy"), /Google Translate/, locale);
    }
});

test("Discord regional locales map to the appropriate language pack", () => {
    for (const [input, expected] of [
        ["en-US", "en"], ["en-GB", "en"], ["de", "de"], ["ru", "ru"], ["uk", "uk"],
        ["es-ES", "es"], ["es-419", "es"], ["pt-BR", "pt-BR"], ["pt_PT", "pt-BR"],
        ["zh-CN", "zh-CN"], ["zh-Hans", "zh-CN"], ["zh-TW", "zh-TW"], ["zh-Hant-HK", "zh-TW"],
        ["ja", "ja"], ["ko", "ko"], ["fr", "fr"], ["pl", "pl"],
    ]) assert.equal(resolveUiLocale(input), expected, input);
});

test("unknown locales fall back to English without changing any translation target", () => {
    for (const locale of [undefined, "", "it", "tr", "invalid-locale", "__proto__"]) {
        assert.equal(resolveUiLocale(locale), "en");
        assert.equal(uiText(locale, "incoming"), uiText("en", "incoming"));
    }
});

test("locale changes resolve new strings and localize language picker names", () => {
    assert.equal(uiText("ru", "readLanguage"), "Язык чтения");
    assert.equal(uiText("de", "readLanguage"), "Lesesprache");
    assert.equal(uiText("zh-TW", "translated"), "已翻譯");
    assert.equal(uiText("zh-CN", "translated"), "已翻译");
    assert.equal(languageDisplayName("de", "ru", "German"), "немецкий");
    assert.equal(languageDisplayName("not_a_language", "ru", "Fallback"), "Fallback");
});

test("UI subscribes to Discord locale and preserves user-selected target languages", () => {
    const source = readFileSync(new URL("../index.tsx", import.meta.url), "utf8");
    assert.match(source, /useStateFromStores\(\[LocaleStore\], \(\) => LocaleStore\.locale\)/);
    assert.match(source, /languageOptions\(locale\), \[locale\]/);
    assert.doesNotMatch(source, /title="[А-Яа-я]/);
    assert.doesNotMatch(source, /description="[А-Яа-я]/);
    assert.doesNotMatch(source, /incomingTarget\s*=\s*locale|outgoingTarget\s*=\s*locale/);
});
