// 语音策略注入
// 仅使用 context 事件：每次 LLM 调用前注入一条极简标签，标记当前策略级别。
//
// 为什么不使用 before_agent_start + message：
//   before_agent_start 每次 agent 启动都触发，返回的 message 会作为
//   custom_message 持久保存到 session 文件，导致每轮对话积累一条，严重浪费 token。
//
// 为什么不使用 before_agent_start + systemPrompt：
//   不碰 systemPrompt，避免触发 cache prefix contract 冲突（#1125）。
//
// context 方案：
//   - 注入的是 ephemeral 消息（不写入 session 文件），无累积浪费
//   - 标签极轻量（～15 tokens），每次成本可忽略
//   - tts-guide skill 已包含完整的策略规则，标签只需告诉 agent 用哪个级别

import { loadConfig } from "../lib/tts-core.js";

const TAG_PREFIX = "【TTS策略】";
const TAG_PATTERN = `${TAG_PREFIX}你的发声策略为「`;
const LABELS = {
  aggressive: "积极模式：短句也出声，情绪内容必出声",
  normal: "正常模式：长回复出声，情绪内容优先，技术内容跳过",
  conservative: "保守模式：仅用户明确要求时出声",
};

function buildTag(strategy) {
  const label = LABELS[strategy] || LABELS.normal;
  return `${TAG_PREFIX}你的发声策略为「${strategy}」——${label}。具体规则见 tts-guide 技能。`;
}

function extractAgentId(sessionPath) {
  if (!sessionPath) return null;
  const segments = sessionPath.replace(/\\/g, "/").split("/");
  const idx = segments.indexOf("sessions");
  if (idx > 0) return segments[idx - 1];
  const oldIdx = segments.indexOf("activity");
  if (oldIdx > 0) return segments[oldIdx - 1];
  return null;
}

function resolveStrategy(agentId) {
  try {
    const cfg = loadConfig();
    return cfg.agents?.[agentId]?.strategy || cfg.defaultStrategy || "normal";
  } catch {
    return "normal";
  }
}

export default function (pi) {
  pi.on("context", (event, ctx) => {
    try {
      const sessionPath = ctx?.sessionManager?.getSessionFile?.() || null;
      const agentId = extractAgentId(sessionPath);
      if (!agentId) return;

      // 检查本轮消息中是否已有 TTS 策略标签，避免重复注入
      const alreadyHasTag = event.messages.some(
        m => typeof m.content === "string" && m.content.startsWith(TAG_PATTERN)
      );
      if (alreadyHasTag) return;

      const strategy = resolveStrategy(agentId);
      const tag = buildTag(strategy);

      event.messages.unshift({
        role: "user",
        content: tag,
      });

      return { messages: event.messages };
    } catch (_) {
      // 注入失败不影响主流程
    }
  });
}
