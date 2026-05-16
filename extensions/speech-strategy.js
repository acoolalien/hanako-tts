// 语音策略注入 — 监听 before_agent_start，按 Agent 配置注入语音行为指令
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
 * @param {object} pi - Pi SDK ExtensionAPI
 */
export default function (pi) {
  pi.on("before_agent_start", (event) => {
    try {
      const cfg = loadConfig();
      const agentId = event?.agentId || event?.agent?.id || null;

      if (!agentId) return;

      const agentCfg = cfg.agents?.[agentId] || {};
      const strategy = agentCfg.strategy || cfg.defaultStrategy || "normal";
      const prompt = STRATEGY_PROMPTS[strategy];

      if (!prompt) return;

      // 注入 system message
      const systemMsg = { role: "system", content: prompt };
      if (Array.isArray(event.messages)) {
        // 插在 system prompt 区域的末尾
        const lastSystemIdx = event.messages.reduce(
          (last, m, i) => (m.role === "system" ? i : last), -1
        );
        if (lastSystemIdx >= 0) {
          event.messages.splice(lastSystemIdx + 1, 0, systemMsg);
        } else {
          event.messages.unshift(systemMsg);
        }
      }

      return event;
    } catch (_) {
      // 注入失败不影响主流程
    }
  });
}
