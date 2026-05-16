# TTS 插件 — 共享术语表

## 术语

| 术语 | 定义 |
|------|------|
| **TTS 插件** | Hanako 文本转语音插件，支持多后端、让 Agent 在对话中出声 |
| **语音策略** | 控制 Agent 何时自主调用 TTS 的行为配置，三级：aggressive / normal / conservative |
| **情感 prompt** | 注入到 CosyVoice2 的自然语言语调指令，如「用撒娇的语气说」 |
| **音色绑定** | 每个 Agent 自动匹配固定的语音音色，无需手动传参 |
| **显式调用入口** | `/tts_speak` 斜杠命令，用户主动触发语音生成 |
| **自主调用** | Agent 根据语音策略自行判断是否调用 `tts_generate_speech` |

## 需求锚点

1. **Agent 自主出声**：对话中 Agent 根据语音策略自动调用 TTS，用户无感
2. **显式调用入口**：`/tts_speak` 命令，用户主动触发语音生成
3. **多后端切换**：支持硅基流动、火山引擎，未适配平台走自定义参数通道
4. **每 Agent 独立配置**：音色、语速、策略级别各自独立，全局默认 normal
5. **零代码开箱**：安装后 CLI 脚本一键写全局默认，Agent 个性化配置可通过对话让 AI 自动完成。设置页配置按钮因 Hanako 平台缺口暂不可用
6. **安装即用**：拖入插件目录即可加载，不需要额外步骤
7. **信息流气泡 UI**：音频以 iframe card 嵌入消息流，含播放控件和时长。符合 Hanako 卡片规范（`type: "iframe"`, `aspectRatio: "8:1"`）
8. **自动播放不轰炸**：当前轮次生成时自动播放；已播文件通过 sessionStorage 去重不重播。同 session 多未播卡片同时进入视口时连续触发（已知边缘，未做全局互斥）
9. **语音策略细化**：对 AI 明确三件事——合成什么（全文/总结）、何时合成（字数阈值）、自动判断（根据上下文）
10. **Skill 策略指导**：`tts-guide` skill 承担语音策略指导职责，告诉 Agent 如何判断和调用
11. **文件交付规范**：音频走 `SessionFile` + `stageFile()`，不自行构建媒体 URL

## 已对齐的设计决策

1. **核心场景**：Agent 自主调用为主 + `/tts_speak` 显式调用为辅
2. **配置粒度**：每个 Agent 独立配置语音策略，全局默认 `normal`
3. **策略注入方式**：extensions 监听 `before_agent_start`，注入 system prompt，而非 pinned 记忆
4. **配置存储**：contributes.configuration 声明 JSON Schema（等 Hanako 支持设置页渲染）。运行时通过 `tts_config.json`（位于 `plugin-data/tts/`）读写，配合 CLI 脚本和 AI 辅助配置
5. **Manifest 规范**：字段名为 `contributes`，需要 `package.json`
6. **API Key**：走 Hanako provider 体系，不自行管理。需具备模型可用性检测能力
7. **后端抽象**：音色列表、模型 ID、API 端点均用户可配置，不写死。插件作为通用 TTS 能力，硅基流动为默认后端。火山引擎为第二适配平台
8. **参数对齐策略**：核心参数（text、voice、speed、format）统一抽象为公共接口；平台独占参数（gain、pitch_rate、emotion prompt 等）走各后端独立配置段；未适配平台走自定义参数通道（用户自行填写 JSON schema）
9. **气泡 UI**：iframe card + `SessionFile` 交付。播放器规格：
   - 卡片高度固定 `aspectRatio: "8:1"`，含播放/暂停按钮 + 时长显示
   - 可见时自动播放（IntersectionObserver, threshold 0.5）
   - 已播放文件不重播（sessionStorage 去重，key=tts_played_<hash>）
   - 已知边缘：同 session 内多个未播卡片同时进入视口时连续触发，未做全局互斥锁
10. **Skill 指导**：`tts-guide` skill 写入合成策略（全文/总结/字数阈值/自动判断），供 Agent 调用时参考
11. **CLI 临时方案**：当前 Hanako 桌面端不支持插件斜杠命令（前端未接 `/api/commands`，服务器端命令加载器要求 `handler` 签名），配置通过 `scripts/tts-config.mjs` CLI 脚本操作 `tts_config.json`。等平台支持斜杠命令后，`/tts_config` 和 `/tts_speak` 自然启用
