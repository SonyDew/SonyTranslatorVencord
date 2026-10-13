import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

const index = readFileSync(new URL("../index.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

describe("incoming translation rendering regressions", () => {
    test("replacement selector is scoped to the current message content ID", () => {
        assert.match(index, /li:has\(#\$\{accessoryId\}\) #message-content-\$\{message\.id\}/);
        assert.doesNotMatch(styles, /\[id\^=["']message-content-/);
    });

    test("translated text reuses Discord message typography classes", () => {
        assert.match(index, /findCssClassesLazy\("messageContent", "markupRtl"\)/);
        assert.match(index, /findCssClassesLazy\("markup", "codeContainer"\)/);
        assert.match(index, /MessageContentClasses\.messageContent/);
        assert.match(index, /MarkupClasses\.markup/);
        assert.doesNotMatch(styles, /\.sony-translator-text\s*\{[^}]*font-size/s);
        assert.doesNotMatch(styles, /\.sony-translator-text\s*\{[^}]*\b(?:color|font|line-height)\s*:/s);
    });

    test("an empty translation cannot hide the original message", () => {
        assert.match(index, /finalize\(prepared, providerOutput\)\.trim\(\)/);
        assert.match(index, /!translated\?\.trim\(\)/);
    });

    test("quoted reply preview gets its own fail-open translated replacement", () => {
        assert.match(index, /REPLY_QUOTE_MESSAGE_NOT_LOADED/);
        assert.match(index, /function ReplyTranslation/);
        assert.match(index, /cachedIncomingTranslation\(referenced\)/);
        assert.match(index, /ReplyClasses\.repliedTextPreview/);
        assert.match(index, /!translated\?\.trim\(\)/);
        assert.match(styles, /\.sony-translator-reply-text/);
        assert.match(styles, /\.sony-translator-reply-text\s*\{[^}]*order:\s*999/s);
        assert.doesNotMatch(styles, /\.sony-translator-reply-text\s*\{[^}]*(?:color|font|line-height)\s*:/s);
    });
});

describe("outgoing language regressions", () => {
    test("outgoing translation is not gated to Cyrillic source text", () => {
        assert.doesNotMatch(index, /onlyOutgoingCyrillic\s*&&/);
        assert.doesNotMatch(index, /if\s*\([^)]*\\u0400-\\u04FF[^)]*\)\s*return/);
    });

    test("reply and bounded local context are passed for incoming and outgoing translations", () => {
        assert.match(index, /MessageStore\.getMessage/);
        assert.match(index, /MessageStore\.getMessages/);
        assert.match(index, /\.slice\(-12\)/);
        assert.match(index, /previousTurns/);
        assert.match(index, /context\?\.replyMessage/);
        assert.match(index, /sendOptions\?\.messageReference/);
        assert.match(index, /coreTranslate\(kind, prepared\.text\)/);
    });

    test("context is participant-aware, relevance-ranked and bounded", () => {
        assert.match(index, /participantNameCache/);
        assert.match(index, /GuildMemberStore\.getMember/);
        assert.match(index, /lexicalContextOverlap/);
        assert.match(index, /relevance \+= 2/);
        assert.match(index, /previousTurns/);
        assert.match(index, /\.slice\(0, 4\)/);
        assert.match(index, /participants: \[\.\.\.participants\.values\(\)\]\.slice\(0, 16\)/);
    });
});
