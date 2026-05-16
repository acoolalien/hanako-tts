// /tts_config command — view or modify TTS configuration
import { loadConfig, saveConfig, parseArgs, VOICES } from "../lib/tts-core.js";

export const name = "tts_config";
export const description = "查看或修改 TTS 语音配置";
export const permission = "anyone";
export const usage = "/tts_config [key=value ...]";

const STRATEGY_LEVELS = ["aggressive", "normal", "conservative"];

function printConfig(cfg) {
  const lines = ["[TTS] 当前配置:"];
  lines.push(`  默认后端: ${cfg.defaultBackend || "siliconflow"}`);
  lines.push(`  默认语速: ${cfg.defaultSpeed ?? 1.0}`);
  lines.push(`  默认策略: ${cfg.defaultStrategy || "normal"}`);
  if (cfg.agents && Object.keys(cfg.agents).length > 0) {
    lines.push("  Agent 配置:");
    for (const [id, ac] of Object.entries(cfg.agents)) {
      const bits = [];
      if (ac.voice) bits.push(`voice=${ac.voice}`);
      if (ac.speed !== undefined) bits.push(`speed=${ac.speed}`);
      if (ac.strategy) bits.push(`strategy=${ac.strategy}`);
      if (ac.prompt) bits.push(`prompt="${ac.prompt}"`);
      lines.push(`    ${id}: ${bits.join(", ") || "(空)"}`);
    }
  }
  const voiceIds = Object.keys(VOICES);
  if (voiceIds.length > 0) {
    lines.push(`  可用音色: ${voiceIds.join(", ")}`);
  }
  return lines.join("\n");
}

export async function execute(rawArgs, cmdCtx) {
  try {
    const args = parseArgs(rawArgs);
    const cfg = loadConfig();
    const changed = [];

    // Global fields
    const globalFields = {
      defaultBackend: "默认后端",
      defaultSpeed: "默认语速",
      defaultStrategy: "默认策略",
    };
    for (const [key, label] of Object.entries(globalFields)) {
      if (args[key] !== undefined) {
        cfg[key] = key === "defaultSpeed" ? Number(args[key]) : String(args[key]);
        changed.push(`${label}=${cfg[key]}`);
      }
    }

    // Agent-level fields: /tts_config agent.<id>.voice=anna
    for (const [rawKey, rawVal] of Object.entries(args)) {
      const match = rawKey.match(/^agent\.(.+?)\.(.+)$/);
      if (!match) continue;
      const [, agentId, field] = match;
      const validFields = ["voice", "speed", "strategy", "prompt"];
      if (!validFields.includes(field)) continue;

      if (!cfg.agents) cfg.agents = {};
      if (!cfg.agents[agentId]) cfg.agents[agentId] = {};
      cfg.agents[agentId][field] = field === "speed" ? Number(rawVal) : String(rawVal);
      changed.push(`agents.${agentId}.${field}=${cfg.agents[agentId][field]}`);
    }

    if (changed.length > 0) {
      saveConfig(cfg);
      return { reply: `[TTS] 配置已更新: ${changed.join(", ")}` };
    }

    return { reply: printConfig(cfg) };
  } catch (err) {
    console.error("[tts] config command error", err);
    return { reply: `[TTS] 配置操作失败: ${err.message}` };
  }
}
