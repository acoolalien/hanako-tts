# 语音合成 TTS 插件

基于 [硅基流动 SiliconFlow](https://siliconflow.cn) CosyVoice2-0.5B 模型的文本转语音插件，为 OpenHanako Agent 提供语音输出能力。

## 功能特性

- **文本转语音**：调用 `tts_generate_speech` 工具将文字转为 mp3 音频，自动嵌入对话卡片播放
- **Agent 音色绑定**：每个 Agent 自动匹配独立音色，无需手动指定
- **情感 Prompt 控制**：通过自然语言情感指令（如「用撒娇的语气说」）控制语音语调，CosyVoice2 原生支持
- **自动语音策略**：按 Agent 角色设定三级积极度（aggressive / normal / conservative），Agent 自主判断何时出声
- **长回复语音总结**：长文本不全文朗读，Agent 自动生成 1~2 句口语化总结
- **ifarme 自动播放**：卡片内音频在滚动到可见区域时自动播放，已播音频不会重复播放
- **斜杠命令**：`/tts_speak` 快速生成语音，`/tts_config` 查看/修改配置

## 快速开始

### 1. 安装插件

将本目录放入 `~/.hanako/plugins/tts/`。

### 2. 获取 API Key

前往 [硅基流动控制台](https://cloud.siliconflow.cn/account/ak) 创建 API Key。

### 3. 配置

在 `~/.hanako/tts_config.json` 中写入：

```json
{
  "apiKey": "sk-你的key",
  "voice": "anna",
  "speed": 1.2,
  "gain": 0.0,
  "agents": {
    "hanako": { "voice": "anna", "gain": 5.0 },
    "xiaqi": { "voice": "claire", "prompt": "用一种温柔带喘、黏糊糊的撒娇语气说" },
    "wenwen": { "voice": "diana" },
    "wenwen-2": { "voice": "bella" }
  }
}
```

### 4. 重启 Hanako

插件将在启动时自动加载。

## 可用音色

| ID | 描述 | 试听 |
|----|------|------|
| `anna` | 沉稳女声 | [试听](https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/voice_template/fish_audio-Anna.mp3) |
| `bella` | 热情女声 | [试听](https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/voice_template/fish_audio-Bella.mp3) |
| `claire` | 温柔女声 | [试听](https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/voice_template/fish_audio-Claire.mp3) |
| `diana` | 欢快女声 | [试听](https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/voice_template/fish_audio-Diana.mp3) |
| `alex` | 沉稳男声 | [试听](https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/voice_template/fish_audio-Alex.mp3) |
| `benjamin` | 深沉男声 | [试听](https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/voice_template/fish_audio-Benjamin.mp3) |
| `charles` | 磁性男声 | [试听](https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/voice_template/fish_audio-Charles.mp3) |
| `david` | 欢快男声 | [试听](https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/voice_template/fish_audio-David.mp3) |

## 工具参数

### `tts_generate_speech`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `text` | string | ✅ | 要转换为语音的文本 |
| `voice` | string | | 音色名称，不填自动按 Agent 匹配 |
| `speed` | number | | 语速 0.25~4.0 |
| `gain` | number | | 音量增益 -10~10 dB |
| `prompt` | string | | 情感指令，如「用高兴的语气说」 |

### 斜杠命令

```
/tts_speak <文本> [voice=音色] [speed=语速] [gain=增益]
/tts_config [voice=音色] [speed=语速]
```

## 情感控制

CosyVoice2-0.5B 支持通过 `<|endofprompt|>` 分隔符注入情感指令：

```
情感描述 <|endofprompt|> 实际文本
```

插件自动处理注入，只需传 `prompt` 参数即可。

### 有效的情感 prompt 示例

```
用害羞又带点喘的声音说
像刚睡醒迷迷糊糊的声音
压低声音，像在说悄悄话
激动得声音都在发抖地说
带着哭腔、委屈地说
慵懒地、拖长音地说
```

## 配置详解

### Agent 配置

每个 Agent 可单独设置 `voice`、`speed`、`gain`、`prompt`：

```json
"agents": {
  "你的agent-id": {
    "voice": "claire",
    "speed": 1.1,
    "gain": 3.0,
    "prompt": "用温柔的语调说"
  }
}
```

解析优先级：`agent 绑定 > 工具传参 > 全局默认`

### 自动语音策略

语音行为策略通过 Agent 的置顶记忆（`pinned.md`）注入到 system prompt，无需技能触发。

| level | 行为 |
|-------|------|
| `aggressive` | 积极出声，短句也语音，情绪内容几乎必说 |
| `normal` | 长回复/重要内容语音，技术内容跳过 |
| `conservative` | 仅用户明确要求时出声 |

各 Agent 的 `pinned.md` 中定义自己的语音积极度和触发规则。

### 配置热加载

`tts_config.json` 每次调用时实时读取，修改后无需重启。

## 架构

```
plugins/tts/
├── index.js                  # 入口，注册路由和生命周期
├── manifest.json             # 插件清单
├── README.md                 # 本文档
├── lib/
│   └── tts-core.js           # 核心：API 调用、配置解析、音色/增益/速度/情感解析
├── tools/
│   └── generate_speech.js    # 工具：tts_generate_speech
├── commands/
│   ├── tts_speak.js          # /tts_speak 命令
│   └── tts_config.js         # /tts_config 命令
├── routes/
│   └── player.js             # iframe 自动播放卡片 + 音频文件服务
└── skills/
    └── tts-guide/
        └── SKILL.md          # Agent 使用指南（自动注入，无需手动触发）
```

## 依赖

- **TTS API**：[SiliconFlow CosyVoice2-0.5B](https://docs.siliconflow.cn/cn/userguide/capabilities/text-to-speech)
- **计费**：$7.15 / 百万 UTF-8 字节（输入文本长度）
- **无需本地模型**，纯云端调用

## 兼容性

- Hanako >= 0.158.0
- Node.js >= 20（使用原生 `fetch`）

## License

MIT
