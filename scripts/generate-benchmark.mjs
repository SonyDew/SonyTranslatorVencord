import { mkdirSync, writeFileSync } from "node:fs";

const languages = ["en", "de", "ru", "uk", "zh-CN", "zh-TW", "es", "fr", "pt-BR", "pl", "ja", "ko"];
const sources = {
    en: [
        "Could you check the server settings?", "idk bro maybe later", "this build is busted", "i got one tapped", "im cooked",
        "we're so back", "ain't no way", "this shit keeps crashing", "бля this build is so ass", "I cooked chicken for dinner",
        "fr?", "fr", "check https://example.com after the match", "tell <@123> to run `npm test`", "upload crash.log please",
        "anyone wanna play Valorant?", "server keeps lagging rn", "u got any heals?", "report that griefer", "been grinding this drop all night",
        "gg we clutched that", "we choked the last round", "ive got no heals left", "ngl the patch nerfed my build hard but the ult still melts", "Could you please review this contract?",
    ],
    de: [
        "Können Sie die Servereinstellungen prüfen?", "kp bro vielleicht später", "der Build ist komplett broken", "ich wurde geoneshottet", "ich bin geliefert",
        "wir sind wieder da", "das kann nicht sein", "dieser Scheiß crasht ständig", "bro das game ist literally unspielbar", "Ich habe das Hähnchen gekocht",
        "safe?", "safe", "prüf https://example.com nach der Runde", "sag <@123>, er soll `npm test` starten", "lad crash.log hoch",
        "Jemand Bock auf Valorant?", "der Server laggt schon wieder", "hast du noch Heals?", "report den Griefer", "farme den Drop seit Stunden",
        "gg stark gecarried", "wir haben die letzte Runde gechoked", "hab keine Heals mehr", "der Patch hat meinen Build hart generft, aber die Ult ist noch OP", "Könnten Sie bitte den Vertrag prüfen?",
    ],
    ru: [
        "Вы можете проверить настройки сервера?", "хз бро мб позже", "этот билд имба", "меня ваншотнули", "мне конец",
        "мы снова в игре", "не может быть", "эта хуйня опять крашится", "бля this build is so ass", "Я приготовил курицу на ужин",
        "втф?", "втф", "проверь https://example.com после катки", "скажи <@123> запустить `npm test`", "закинь crash.log",
        "кто в Valorant?", "сервер опять лагает", "у тебя хилки есть?", "репортни грифeра", "всю ночь фармлю этот дроп",
        "гг затащили", "слили последний раунд", "хилок больше нет", "патч занерфил билд в говно, но ульта всё ещё плавит", "Не могли бы Вы проверить договор?",
    ],
    uk: [
        "Ви можете перевірити налаштування сервера?", "хз бро може пізніше", "цей білд імба", "мене ваншотнули", "мені кінець",
        "ми знову в грі", "та ну", "ця хрінь знову крашиться", "бля this build такий поганий", "Я приготував курку на вечерю",
        "серйозно?", "реально", "перевір https://example.com після катки", "скажи <@123> запустити `npm test`", "закинь crash.log",
        "хто в Valorant?", "сервер знову лагає", "у тебе є хілки?", "репортни грифера", "всю ніч фармлю цей дроп",
        "гг витягнули", "злили останній раунд", "хілок більше нема", "патч сильно понерфив білд, але ульта ще плавить", "Чи могли б Ви перевірити договір?",
    ],
    "zh-CN": [
        "您能检查一下服务器设置吗？", "不知道兄弟晚点吧", "这个流派太超模了", "我被秒了", "我寄了",
        "我们又行了", "不是吧", "这破东西又崩了", "这个 build 太垃圾了", "我晚饭做了鸡肉",
        "真的？", "真的", "打完检查 https://example.com", "让 <@123> 跑一下 `npm test`", "把 crash.log 发上来",
        "有人玩 Valorant 吗？", "服务器又卡了", "你还有治疗吗？", "举报那个恶意玩家", "刷这个掉落刷了一整晚",
        "gg 这把翻盘了", "最后一局打崩了", "我没治疗了", "补丁把 build 砍废了但大招伤害还很高", "请您审阅这份合同。",
    ],
    "zh-TW": [
        "您能檢查一下伺服器設定嗎？", "不知道啦晚點吧", "這個流派太超模了", "我被秒了", "我沒救了",
        "我們又行了", "不是吧", "這東西又當掉了", "這個 build 太爛了", "我晚餐煮了雞肉",
        "真的？", "真的", "打完檢查 https://example.com", "叫 <@123> 跑 `npm test`", "把 crash.log 傳上來",
        "有人要玩 Valorant 嗎？", "伺服器又 lag 了", "你還有補嗎？", "檢舉那個雷隊友", "刷這個掉落刷整晚",
        "gg 這把逆轉了", "最後一局打崩了", "我沒補了", "更新把 build 砍爛了但大招還是很痛", "請您審閱這份合約。",
    ],
    es: [
        "¿Puede usted revisar la configuración del servidor?", "ns bro quizá luego", "esta build está rotísima", "me hizo one shot", "estoy frito",
        "estamos de vuelta", "no puede ser", "esta mierda sigue crasheando", "bro este juego está literally roto", "Cociné pollo para cenar",
        "¿de verdad?", "de verdad", "mira https://example.com después de la partida", "dile a <@123> que ejecute `npm test`", "sube crash.log",
        "¿alguien para Valorant?", "el servidor vuelve a tener lag", "¿te quedan curas?", "reporta al griefer", "llevo toda la noche farmeando este drop",
        "gg remontamos", "tiramos la última ronda", "ya no me quedan curas", "el parche nerfeó muchísimo mi build pero la ulti aún derrite", "¿Podría revisar este contrato?",
    ],
    fr: [
        "Pourriez-vous vérifier les paramètres du serveur ?", "jsp frérot peut-être plus tard", "ce build est complètement pété", "il m'a one shot", "je suis foutu",
        "on est de retour", "c'est pas possible", "cette merde crash encore", "frérot ce jeu est literally injouable", "J'ai cuisiné du poulet",
        "sérieux ?", "sérieux", "regarde https://example.com après la game", "dis à <@123> de lancer `npm test`", "envoie crash.log",
        "qui pour Valorant ?", "le serveur lag encore", "t'as encore des heals ?", "report le griefer", "je farm ce drop depuis des heures",
        "gg on a clutch", "on a choke la dernière manche", "j'ai plus de heals", "le patch a nerf mon build à mort mais l'ulti fait toujours mal", "Pourriez-vous examiner ce contrat ?",
    ],
    "pt-BR": [
        "O senhor pode verificar as configurações do servidor?", "n sei mano talvez dps", "essa build tá quebrada", "tomei one shot", "tô ferrado",
        "tamo de volta", "não é possível", "essa merda continua crashando", "mano esse jogo tá literally injogável", "Cozinhei frango no jantar",
        "sério?", "sério", "olha https://example.com depois da partida", "fala pro <@123> rodar `npm test`", "manda crash.log",
        "bora Valorant?", "o servidor tá lagando de novo", "vc tem heal?", "reporta o griefer", "tô farmando esse drop a noite toda",
        "gg carregamos", "jogamos fora o último round", "tô sem heal", "o patch deu um nerf pesado na build mas a ult ainda derrete", "O senhor poderia revisar este contrato?",
    ],
    pl: [
        "Czy może Pan sprawdzić ustawienia serwera?", "nwm bro może później", "ten build jest broken", "dostałem oneshota", "po mnie",
        "wracamy do gry", "nie ma szans", "to gówno znowu crashuje", "bro ta gra jest literally niegrywalna", "Ugotowałem kurczaka na kolację",
        "serio?", "serio", "sprawdź https://example.com po meczu", "powiedz <@123>, żeby odpalił `npm test`", "wrzuć crash.log",
        "ktoś w Valorant?", "serwer znowu laguje", "masz jakieś heale?", "zgłoś griefera", "farmie ten drop całą noc",
        "gg wyciągnęliśmy to", "rzuciliśmy ostatnią rundę", "nie mam już heali", "patch mocno znerfił build, ale ult dalej topi", "Czy mógłby Pan sprawdzić umowę?",
    ],
    ja: [
        "サーバー設定を確認していただけますか？", "わからん、たぶん後で", "このビルド壊れてる", "ワンパンされた", "詰んだ",
        "復活した", "ありえない", "このクソゲーまた落ちる", "この build マジで弱い", "夕食に鶏肉を料理した",
        "マジ？", "それな", "試合後に https://example.com を見て", "<@123> に `npm test` を実行してって言って", "crash.log 上げて",
        "Valorant やる人？", "サーバーまたラグい", "回復まだある？", "荒らしを通報して", "このドロップ一晩中周回してる",
        "gg 逆転した", "最後のラウンドでやらかした", "回復もうない", "パッチでビルドが産廃になったけどウルトはまだ火力ある", "この契約を確認していただけますか？",
    ],
    ko: [
        "서버 설정을 확인해 주시겠습니까?", "몰라 아마 나중에", "이 빌드 너무 사기야", "원콤 당했다", "망했다",
        "다시 살아났다", "말도 안 돼", "이 망할 게임 또 튕겨", "이 build 진짜 구림", "저녁으로 닭을 요리했다",
        "진짜?", "ㄹㅇ", "게임 끝나고 https://example.com 확인해", "<@123>한테 `npm test` 돌리라고 해", "crash.log 올려",
        "Valorant 할 사람?", "서버 또 렉 걸려", "힐 남았어?", "트롤 신고해", "이 드롭 밤새 파밍 중",
        "gg 역전했다", "마지막 라운드 던졌다", "힐 다 썼어", "패치로 빌드가 관짝 갔는데 궁딜은 아직 셈", "이 계약을 검토해 주시겠습니까?",
    ],
};

const intents = [
    "polite_request", "casual_uncertainty", "overpowered_balance", "instant_defeat", "speaker_doomed",
    "comeback", "disbelief", "frustrated_crash", "mixed_language_complaint", "literal_cooking",
    "question_reaction", "agreement_reaction", "url_preservation", "discord_and_code_preservation", "filename_preservation",
    "gaming_invitation", "lag_complaint", "healing_request", "moderation_report", "grind_progress",
    "win_reaction", "loss_responsibility", "chat_spelling", "multi_clause_balance", "formal_register",
];

const benchmark = [];
for (const [languageIndex, language] of languages.entries()) {
    const messages = sources[language];
    if (messages.length !== 25) throw new Error(`${language} has ${messages.length} messages, expected 25`);
    for (let index = 0; index < messages.length; index++) {
        benchmark.push({
            id: `${language.toLowerCase()}-${String(index + 1).padStart(2, "0")}`,
            source: messages[index],
            sourceLanguage: language,
            semanticIntent: intents[index],
            targetLanguage: languages[(languageIndex + 1 + index) % languages.length],
            expectedImportantMeanings: [intents[index]],
            forbiddenSemanticChanges: ["invented threat", "invented addressee", "invented certainty", "invented profanity"],
        });
    }
}

mkdirSync(new URL("../benchmark/", import.meta.url), { recursive: true });
writeFileSync(new URL("../benchmark/conversational-benchmark.json", import.meta.url), `${JSON.stringify(benchmark, null, 2)}\n`);
console.log(`Generated ${benchmark.length} benchmark cases (${benchmark.length / languages.length} per language)`);
