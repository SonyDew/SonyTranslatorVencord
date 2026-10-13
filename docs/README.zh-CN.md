# SonyTranslator

面向 Vencord 的 Discord 聊天翻译插件，保留消息的含义、语气和聊天风格。作者：**SonyDev**。

[English](../README.md) · [Русский](README.ru.md) · [Deutsch](README.de.md) · [简体中文](README.zh-CN.md)

![使用虚构参与者的翻译示例](images/chat-preview.svg)

## 安装 v0.9.5

1. 从 [Releases](https://github.com/SonyDew/SonyTranslatorVencord/releases/latest) 下载 **SonyTranslator-AutoInstaller-0.9.5.zip**。
2. 完整解压 ZIP。
3. 运行 **Install SonyTranslator.cmd** 或 **Update SonyTranslator.cmd**。
4. 等待完成。安装前运行的 Stable、Canary 或 PTB 客户端会重新启动。
5. 点击输入框旁的翻译按钮，选择语言和风格。

安装器支持 Windows，在本地下载并编译 Vencord。需要 Node 22+ 和 Git，缺失时通过
winget 安装。窗口显示安装阶段，详细信息写入日志。保留现有设置和其他插件；失败
时恢复旧版 SonyTranslator。安装前没有运行 Discord 时，不会随意启动客户端。

## 功能

- 通过 Google Translate 翻译收到和发送的消息，无需付费 API 密钥或强制 LLM。
- 独立选择 Clean、Casual、Slang、Heavy 和 Mirror。
- 识别俚语、缩写、明确的拼写错误、简短回应和游戏表达。
- 保护昵称、提及、URL、代码、文件名和表情。
- 翻译回复预览，保留 `@昵称 → 内容` 顺序及原有字体和颜色。
- 英语、德语、俄语、乌克兰语、简体中文（大陆）、繁体中文（台湾）、西班牙语、法语、巴西葡萄牙语、波兰语、日语和韩语。

Clean 注重自然准确；Casual 使用日常说法；Slang 和 Heavy 加强聊天压缩；Mirror
跟随原文。不会给中性消息添加辱骂。单独的 `Cool` 是回应，天气中的 cool 仍表示凉爽。

## 隐私与限制

界面会自动跟随 Discord 的语言，包括设置、通知和语言名称。支持十二种语言配置，
其他语言使用英文。阅读和发送语言仍可单独选择。

只有当前消息会发送到 Google，必要时先在本地规范化表达。回复上下文、相关的历史
消息和参与者信息只在本地分析，不会附加到请求。新梗、讽刺和模糊缩写仍可能误解。

## 许可与署名

原创作者：**SonyDev / SonyDew**。允许个人使用和私下修改，不得冒充原创作者。
公开发布、再分发、改名或以自己的名称发布改进版本，必须事先获得 SonyDev 的明确
书面许可，并显著注明原创作者。通过 [Issues](https://github.com/SonyDew/SonyTranslatorVencord/issues) 请求许可。
以英文 [LICENSE](../LICENSE) 为准。第三方许可证和先前 MIT 版本的许可不受影响。
这是限制再分发的源码可见许可证，并非自由开源许可证。
