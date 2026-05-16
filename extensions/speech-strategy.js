// 语音策略注入 — 监听 before_agent_start，按 Agent 配置注入语音行为指令
import path from "node:path";
import { loadConfig } from "../lib/tts-core.js";

const STRATEGY_PROMPTS = {
  aggressive: `
[语音策略：积极]
你被配置为积极语音模式。遵循以下规则：
- 非技术类回复尽量出声，短到一句话也可以
- 情绪内容（安慰、撒娇、兴奋、道歉、害羞）必须出声
- 调用 tts_generate_speech 时，只传 text 参数，其余自动匹配
- 参考 skills/tts-guide 的「语音合成策略」章节做具体判断
`.trim(),

  normal: `
[语音策略：正常]
你被配置为正常语音模式。遵循以下规则：
- 回复超过 150 字时，生成 1~2 句口语化总结后出声
- 情绪内容优先出声（不限字数）
- 纯信息/技术/列表类回复跳过
- 调用 tts_generate_speech 时，只传 text 参数
- 参考 skills/tts-guide 的「语音合成策略」章节做具体判断
`.trim(),

  conservative: `
[语音策略：保守]
你被配置为保守语音模式。遵循以下规则：
- 仅用户明确说「念出来」「读给我听」「用语音」时才出声
- 会话首条消息可以出声打个招呼
- 其余情况一律跳过
- 调用 tts_generate_speech 时，只传 text 参数
- 参考 skills/tts-guide 的「语音合成策略」章节做具体判断
`.trim(),
};

/**
 * 从 Hanako session 文件路径中提取 agent ID。
 * 路径模式：.../agents/<agentId>/(sessions|activity)/<sessionFile>.jsonl
 */
function extractAgentId(sessionPath) {
  if (!sessionPath) return null;
  const segments = sessionPath.replace(/\\/g, "/").split("/");
  const idx = segments.indexOf("sessions");
  if (idx > 0) return segments[idx - 1];
  const oldIdx = segments.indexOf("activity");
  if (oldIdx > 0) return segments[oldIdx - 1];
  return null;
}

/**
 * @param {object} pi - Pi SDK ExtensionAPI
 */
export default function (pi) {
  pi.on("before_agent_start", (event, ctx) => {
    try {
      const cfg = loadConfig();
      const sessionPath =
        ctx?.sessionManager?.getSessionFile?.() || null;
      const agentId = extractAgentId(sessionPath);

      if (!agentId) return;

      const agentCfg = cfg.agents?.[agentId] || {};
      const strategy = agentCfg.strategy || cfg.defaultStrategy || "normal";
      const prompt = STRATEGY_PROMPTS[strategy];

      if (!prompt) return;

      return { systemPrompt: (event.systemPrompt || "") + "\n\n" + prompt };
    } catch (_) {
      // 注入失败不影响主流程
    }
  });
}
