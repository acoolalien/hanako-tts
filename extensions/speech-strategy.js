// 语音策略注入
// 轨道 A — before_agent_start：session 启动时注入一条消息（不碰 systemPrompt，绕过 #1125）
// 轨道 B — context：长会话中每 30 轮刷新一次极简标签，防止注意力稀释

import { loadConfig } from "../lib/tts-core.js";

/** 刷新间隔（轮次） */
const REFRESH_INTERVAL = 30;

// ── 各策略的完整说明（轨道 A：session 启动时注入一次） ──

/**
 * 构建策略说明消息。
 * 开头明确标注这是 TTS 插件的发声策略，并告知 agent 去哪里查找具体规则。
 */
function buildStrategyMessage(strategy, agentId) {
  const header = [
    `【TTS 发声策略 · ${agentId}】`,
    "",
    "这是 TTS 语音合成插件为你配置的发声控制策略，影响你何时调用 tts_generate_speech 工具。",
    "请仔细阅读以下规则，在每次回复前判断是否需要生成语音。",
    "",
    "▎ 详细判断逻辑",
    "字数阈值、上下文感知、情感判定、长回复总结策略等完整规则，",
    "请查阅技能 tts-guide 中的「语音合成策略」章节。",
    "技能路径：skills/tts-guide/SKILL.md",
    "",
    "▎ 参数说明",
    "音色(voice)、语速(speed)、音量增益(gain)、情感指令(prompt)已按你的配置自动绑定，",
    "调用 tts_generate_speech 时只需传 text 参数，其余自动匹配。",
    "具体配置在 tts_config.json 中 agents.<agentId> 段。",
    "",
    "▎ 当前策略规则",
  ];

  const RULES = {
    aggressive: [
      "你当前为「积极模式」。",
      "1. 非技术类回复尽量出声，短到一句话也可以。",
      "2. 情绪内容（安慰、撒娇、兴奋、道歉、害羞）必须出声。",
      "3. 上下文感知：连续技术讨论自动降级为保守行为。",
      "4. 上一轮出过声且本轮回复很短时跳过，避免刷屏。",
    ],
    normal: [
      "你当前为「正常模式」。",
      "1. 回复超过 150 字时，生成 1~2 句口语化总结后出声。",
      "2. 情绪内容优先出声（不限字数）。",
      "3. 纯信息/技术/列表类回复跳过。",
      "4. 上下文感知：用户明显情绪化时倾向出声。",
    ],
    conservative: [
      "你当前为「保守模式」。",
      "1. 仅用户明确说「念出来」「读给我听」「用语音」时才出声。",
      "2. 会话首条消息可以出声打招呼。",
      "3. 其余情况一律跳过。",
    ],
  };

  return [...header, ...(RULES[strategy] || RULES.normal)].join("\n");
}

// ── 极简刷新标签（轨道 B：context 定期注入） ──

const TAG_PREFIX = "【TTS策略】";

function buildRefreshTag(strategy) {
  return `${TAG_PREFIX}你的发声策略为「${strategy}」。具体判断规则见 tts-guide 技能。`;
}

// ── 工具函数 ──

/**
 * 从 session 文件路径中提取 agent ID。
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
 * 获取指定 agent 的 TTS 策略。
 * 读取顺序：agent 配置 > 全局默认 > "normal"
 */
function resolveStrategy(agentId) {
  try {
    const cfg = loadConfig();
    return cfg.agents?.[agentId]?.strategy || cfg.defaultStrategy || "normal";
  } catch {
    return "normal";
  }
}

// ── 状态跟踪 ──

/** 记录每个 session 上次注入 refresh tag 时的消息轮次数 */
const refreshTurns = new Map();

// ── Extension 入口 ──

export default function (pi) {
  // ── 轨道 A：before_agent_start ──
  // 只返回 message，不返回 systemPrompt，确保不触发 cache prefix contract（#1125）
  pi.on("before_agent_start", (event, ctx) => {
    try {
      const sessionPath = ctx?.sessionManager?.getSessionFile?.() || null;
      const agentId = extractAgentId(sessionPath);
      if (!agentId) return;

      const strategy = resolveStrategy(agentId);
      const content = buildStrategyMessage(strategy, agentId);

      return {
        message: {
          role: "user",
          content,
        },
        // 不返回 systemPrompt → 绕过 cache prefix contract 校验
      };
    } catch (_) {
      // 注入失败不影响主流程
    }
  });

  // ── 轨道 B：context ──
  // 长会话中定期刷新一条极简标签，防止 agent 在大量对话后遗忘自己的发声策略
  pi.on("context", (event, ctx) => {
    try {
      const sessionPath = ctx?.sessionManager?.getSessionFile?.() || null;
      const agentId = extractAgentId(sessionPath);
      if (!agentId) return;

      // 计算当前对话轮次（user + assistant 消息数）
      const turnCount = event.messages.filter(
        m => m.role === "user" || m.role === "assistant"
      ).length;

      const lastInjected = refreshTurns.get(sessionPath) || 0;
      if (turnCount - lastInjected < REFRESH_INTERVAL) return;

      refreshTurns.set(sessionPath, turnCount);

      const strategy = resolveStrategy(agentId);
      const tag = buildRefreshTag(strategy);

      // unshift 到消息数组头部，让模型优先看到
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
