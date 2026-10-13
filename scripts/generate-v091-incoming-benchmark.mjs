import { mkdirSync, writeFileSync } from "node:fs";

const categories = {
    typos: ["Aint no way you deleted them youre actually so weird 😭", "dont delete it", "cant join rn", "wont load", "im tired", "ive got it", "Idk what you're accusing me off 💀", "why is rob so oddd", "theres already screenshots", "aint no way"],
    abbreviations: ["sup", "Brb, gotta remind my gf to medicate", "idk", "busy rn", "ngl this is odd", "imo its fine", "lmk when ready", "mb", "np", "weird af"],
    short_reactions: ["Cool", "How's life", "fire", "sick", "bet", "real", "same", "fr", "valid", "based"],
    slang: ["Finna send it", "boutta leave", "gonna join", "gotta go", "this goes hard", "that skin is fire", "im dead 💀", "nah thats wild", "mad good", "clean build"],
    member_names: ["Sup mocha dude", "why is rob so oddd", "Marco joined", "hey Mark", "Mocha deleted it", "ask Rob", "yo Luna", "where is Fire", "tell Cool", "why did May leave"],
    reply_ellipsis: ["Deleted what?", "what?", "why?", "same", "real", "which one?", "who did?", "when?", "me?", "how so?"],
    malformed_grammar: ["this chat so odd", "The stuff theres already screenshots of that doesn't even make sense to delete", "why he do that", "you deleted why", "me and her was there", "aint nobody got time", "how come it dont work", "what you accusing me of", "server been broke", "that dont make sense"],
    emoji: ["youre odd 💀", "no way 😭", "im dead 😂", "cool 👍", "bruh 💀", "thats fire 🔥", "why tho 😭", "gg 😭", "nahhh 💀", "sick 🔥"],
    expressive_spelling: ["oddd", "nahhh", "brooo", "noooo", "wtfff", "soooo good", "heyyyy", "cooool", "weirddd", "yessss"],
    polysemy: ["Cool", "that's fire", "that's sick", "this song goes hard", "im dead 💀", "mad good", "clean", "valid", "wild", "bet"],
    gaming: ["Finna send the forbidden ss", "this build goes hard", "sick skin", "dead lobby", "hard carry", "clean ace", "mad damage", "fire edit", "ss the scoreboard", "boutta queue"],
    moderation_mixed: ["idk why u muted me", "Nah youre actually odd💀", "wtf за мут", "lmk за что бан", "the rule dont make sense", "youre accusing me off spam", "ss already exists", "Deleted what?", "cool, appeal accepted", "aint no way thats a warning"],
};

const rawBaselines = new Map([
    ["Cool", "Прохладный"], ["sup mocha dude", "Привет чувак-мокко"], ["why is rob so oddd", "почему грабить так нечётно"],
    ["finna send the forbidden ss", "Финна отправляет запрещённый SS"], ["Deleted what?", "Что удалено?"],
    ["this chat so odd", "этот чат такой нечётный"], ["im dead 💀", "я мёртв 💀"], ["that's sick", "это больное"],
    ["this song goes hard", "эта песня становится твёрдой"], ["that's fire", "это огонь"],
]);
const dictionaryWrong = /^(?:Cool|fire|sick|bet|real|same|fr|valid|based|wild|clean|oddd|nahhh|brooo|wtfff)|\b(?:goes hard|im dead|that's sick|that's fire|member_names)\b/i;

const rows = [];
for (const [category, messages] of Object.entries(categories)) {
    messages.forEach((source, index) => {
        const lower = source.toLowerCase();
        const member = /\b(mocha|rob|marco|mark|luna|fire|cool|may)\b/i.exec(source)?.[1];
        const needsContext = category === "reply_ellipsis" || /^(?:real|same|fr|sure|Deleted what\?)/i.test(source);
        const contextText = /deleted/i.test(source) ? "Aint no way you deleted them" : "that patch broke the build again";
        rows.push({
            id: `${category}-${String(index + 1).padStart(2, "0")}`,
            category,
            source,
            targetLanguage: "ru",
            rawProviderBaseline: rawBaselines.get(source) ?? `[raw provider baseline for: ${source}]`,
            v090PipelineBaseline: rawBaselines.get(source) ?? `[v0.9.0 provider-shaped output for: ${source}]`,
            candidateExpectedMeaning: category,
            expectedImportantMeanings: [category, lower.includes("ss") ? "screenshot when context supports it" : "source intent preserved"],
            forbiddenOutputs: ["invented formal register", "invented aggression", "invented profanity", "untranslated high-confidence typo"],
            forbiddenSemanticChanges: ["nickname translated", "literal reaction sense", "context copied into output"],
            dictionaryTranslationWrong: dictionaryWrong.test(source) || category === "member_names" || category === "polysemy",
            context: needsContext ? { previousTurns: [{ content: contextText, authorId: "other", relevance: 5 }] } : undefined,
            participants: member ? [{ id: member.toLowerCase(), username: member.toLowerCase(), displayName: member[0].toUpperCase() + member.slice(1), evidence: "recent_author" }] : [],
        });
    });
}

mkdirSync(new URL("../benchmark/", import.meta.url), { recursive: true });
writeFileSync(new URL("../benchmark/v091-incoming-chat-benchmark.json", import.meta.url), `${JSON.stringify(rows, null, 2)}\n`);
console.log(`Generated ${rows.length} incoming-chat rows across ${Object.keys(categories).length} categories.`);
