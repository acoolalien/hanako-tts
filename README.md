# 🎙️ Hanako TTS

> OpenHanako 文本转语音插件，支持多后端、Agent 音色绑定、情感控制与自动语音策略

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Hanako](https://img.shields.io/badge/Hanako-%3E%3D0.158.0-6c5ce7)](https://github.com/liliMozi/openhanako)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933)](https://nodejs.org)

为 OpenHanako Agent 提供语音输出能力。Agent 在对话中自动判断何时出声，也可用斜杠命令手动触发。音频以信息流气泡卡片呈现，生成时自动播放。

## 当前状态（v2.0.0）

✅ 硅基流动 CosyVoice2 后端完整可用
✅ Agent 自动语音策略 + 音色绑定 + 情感控制
✅ 信息流气泡播放器（iframe card，自动播放/去重）
✅ Provider 集成（API Key 走 Hanako 鉴权体系）
✅ CLI 配置脚本（`node scripts/tts-config.mjs`）
🚧 火山引擎适配器（骨架就位，API 待对接）
⚠️ 设置页配置按钮不可用（Hanako 平台缺口，contributions 列表不含 configuration）
⚠️ 斜杠命令不可用（桌面端前端未接 /api/commands，参数以 handler 形式导出但平台未消费）

## 功能特性

- **多后端支持**：默认硅基流动 CosyVoice2，火山引擎适配中，未适配平台走自定义参数
- **Agent 音色绑定**：每个 Agent 独立音色，调用时自动匹配，无需手动传参
- **情感 Prompt 控制**：自然语言控制语调（撒娇、激动、慵懒…），后端原生支持
- **自动语音策略**：三级（aggressive / normal / conservative），extensions 运行时注入 system prompt，每 Agent 独立配置
- **合成策略智能判断**：短回复全文朗读，长回复自动生成口语化总结，技术内容跳过
- **信息流气泡**：音频以 iframe card 嵌入消息流，可见时自动播放，已播放不重复
- **安装即用**：拖入插件目录即加载，CLI 脚本一键配置

## 快速开始

### 1. 安装

将本目录拖入 Hanako 设置 → 插件安装区，或放入 `~/.hanako/plugins/tts/`。

### 2. 配置 API Key

在 Hanako 设置中为对应 Provider 填入 API Key：
- **硅基流动**：[控制台获取](https://cloud.siliconflow.cn/account/ak)
- **火山引擎**：[控制台获取](https://console.volcengine.com/)

### 3. 初始化配置

在插件目录下运行：

```bash
node scripts/tts-config.mjs set-defaults
```

这会写入全局默认值：硅基流动后端、语速 1.0、策略 normal。Agent 个性化配置需手动添加（见下方）。

### 4. 修改配置

```bash
# 查看当前配置
node scripts/tts-config.mjs show

# 修改单个选项
node scripts/tts-config.mjs set defaultStrategy=aggressive agent.<id>.voice=anna
```

支持三层配置：全局（`defaultBackend` / `defaultSpeed` / `defaultStrategy`）、Agent（`agent.<id>.voice` 等）、后端（`backend.<id>.apiBase` 等）。

### 5. 重启 Hanako

插件自动加载，配置热生效。

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

火山引擎音色通过 API 动态获取，配置后可用。

## 工具

### `tts_generate_speech`

Agent 在对话中调用，生成语音并嵌入气泡卡片。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `text` | string | ✅ | 要朗读的文本 |
| `voice` | string | | 音色，不填自动按 Agent 匹配 |
| `speed` | number | | 语速 0.25~4.0 |
| `gain` | number | | 增益 -10~10 dB（硅基流动） |
| `prompt` | string | | 情感指令 |

参数优先级：Agent 配置 > 调用时传入 > 全局默认 > 代码兜底。

## 语音策略

策略通过 `extensions/speech-strategy.js` 在每次会话开始时注入 system prompt。Agent 按 `tts-guide` skill 的指引判断何时出声、合成全文还是总结。

| 级别 | 行为 |
|------|------|
| `aggressive` | 积极出声，短句也语音，情绪内容必说 |
| `normal` | 回复超 150 字生成总结语音，情绪内容优先 |
| `conservative` | 仅用户明确要求时出声 |

## 情感控制

支持 `<|endofprompt|>` 分隔符注入自然语言情感指令：

```
用害羞又带点喘的声音说 <|endofprompt|> 你轻点...
```

常用 prompt：`用黏糊糊的撒娇语气说` / `压低声音，像在说悄悄话` / `激动得声音都在发抖地说` / `带着哭腔、委屈地说`。

## 架构

```
tts/
├── manifest.json                 # 插件清单（contributes.configuration + providers + extensions）
├── package.json                  # 插件发现必需
├── index.js                      # 生命周期入口
├── lib/
│   ├── tts-core.js               # 配置管理 + 适配器调度 + 参数解析
│   └── adapters/
│       ├── siliconflow.js         # 硅基流动 CosyVoice2 适配器
│       └── volcengine.js          # 火山引擎适配器（骨架）
├── tools/
│   └── generate_speech.js        # tts_generate_speech 工具
├── routes/
│   ├── player.js                 # iframe 播放器路由
│   └── player-template.js        # 播放器 HTML 模板
├── extensions/
│   └── speech-strategy.js        # 语音策略注入（before_agent_start）
├── providers/
│   ├── siliconflow-tts.js        # 硅基流动 Provider 声明
│   └── volcengine-tts.js         # 火山引擎 Provider 声明
├── skills/
│   └── tts-guide/SKILL.md        # Agent 合成策略指南
├── scripts/
│   └── tts-config.mjs            # CLI 配置脚本
├── CONTEXT.md                    # 需求锚点 + 设计决策
└── README.md                     # 本文档
```

## 依赖

| 依赖 | 说明 |
|------|------|
| Hanako >= 0.158.0 | 插件宿主 |
| Node.js >= 20 | 原生 `fetch` API |

无 npm 依赖，仅使用 Node.js 内置模块。零依赖安装。

## 兼容性

| 环境 | 状态 |
|------|------|
| Windows | ✅ |
| macOS | ✅ |
| Linux | ✅ |
