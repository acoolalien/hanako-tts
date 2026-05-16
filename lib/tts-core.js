// TTS core — config management + adapter dispatch
import path from "node:path";
import fs from "node:fs";
import * as siliconflow from "./adapters/siliconflow.js";
import * as volcengine from "./adapters/volcengine.js";

// ── adapter registry ──

const adapters = { siliconflow, volcengine };

export function getAdapter(backendId) {
  const a = adapters[backendId];
  if (!a) throw new Error(`未知 TTS 后端: ${backendId}`);
  return a;
}

export function listAdapters() {
  return Object.entries(adapters).map(([id, a]) => ({ id, name: a.name }));
}

// 兼容旧代码：VOICES 指向硅基流动的音色
export const VOICES = siliconflow.voices;

// ── config ──

export function dataDir() {
  return (
    process.env.HANAKO_DATA_DIR ||
    path.join(process.env.USERPROFILE || process.env.HOME || ".", ".hanako")
  );
}

export function loadConfig() {
  try {
    const p = path.join(dataDir(), "tts_config.json");
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (_) {}
  return {};
}

export function saveConfig(cfg) {
  const p = path.join(dataDir(), "tts_config.json");
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(cfg, null, 2), "utf-8");
}

export function parseArgs(raw) {
  if (!raw) return {};
  const parts = raw.split(/\s+/);
  const args = {};
  const positional = [];
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq > 0) {
      const k = part.slice(0, eq);
      const v = part.slice(eq + 1);
      args[k] = isNaN(Number(v)) ? v : Number(v);
    } else {
      positional.push(part);
    }
  }
  if (positional.length > 0) {
    args.text = positional.join(" ");
  }
  return args;
}

// ── parameter resolution: agent override > input > global default > fallback ──

function resolveParam(config, agentId, paramKey, inputValue, fallback) {
  if (agentId && config.agents?.[agentId]?.[paramKey] !== undefined) {
    return config.agents[agentId][paramKey];
  }
  if (inputValue !== undefined && inputValue !== null) {
    return typeof fallback === "number" ? Number(inputValue) : String(inputValue);
  }
  if (config[paramKey] !== undefined) return config[paramKey];
  return fallback;
}

export function resolveVoice(voiceInput, agentId, config) {
  const cfg = config || loadConfig();
  return resolveParam(cfg, agentId, "voice", voiceInput, "anna");
}

export function resolveSpeed(speedInput, agentId, config) {
  const cfg = config || loadConfig();
  return Number(resolveParam(cfg, agentId, "speed", speedInput, 1.0));
}

export function resolveGain(gainInput, agentId, config) {
  const cfg = config || loadConfig();
  return Number(resolveParam(cfg, agentId, "gain", gainInput, 0.0));
}

export function resolvePrompt(promptInput, agentId, config) {
  const cfg = config || loadConfig();
  return resolveParam(cfg, agentId, "prompt", promptInput, null);
}

// ── API key ──

export function resolveApiKey(backendId) {
  const cfg = loadConfig();

  // 1. 后端专用 API Key
  if (backendId && cfg.backends?.[backendId]?.apiKey) {
    return cfg.backends[backendId].apiKey;
  }

  // 2. 环境变量
  if (backendId === "siliconflow" || !backendId) {
    if (cfg.apiKey) return cfg.apiKey;
    if (process.env.SILICON_FLOW_API_KEY) return process.env.SILICON_FLOW_API_KEY;
  }
  if (backendId === "volcengine") {
    if (process.env.VOLCENGINE_API_KEY) return process.env.VOLCENGINE_API_KEY;
  }

  // 3. Hanako added-models.yaml fallback (硅基流动)
  try {
    const p = path.join(dataDir(), "added-models.yaml");
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf-8");
      const m = raw.match(/^\s+siliconflow:\s*\n\s+api_key:\s*(\S+)/m);
      if (m) return m[1];
    }
  } catch (_) {}

  throw new Error(`未找到 ${backendId || "TTS"} 的 API Key。请在 tts_config.json 中设置`);
}

// ── speech dispatch ──

/**
 * @param {Object} opts
 * @param {string} opts.text - 合成文本
 * @param {string} [opts.voice] - 音色 ID
 * @param {number} [opts.speed] - 语速
 * @param {number} [opts.gain] - 增益
 * @param {string} [opts.prompt] - 情感指令
 * @param {string} [opts.agentId] - Agent ID
 * @param {string} [opts.backend] - 后端 ID
 * @param {Function} [log] - 日志函数
 * @returns {Promise<Buffer>}
 */
export async function generateSpeech({ text, voice, speed, gain, prompt, agentId, backend }, log) {
  const cfg = loadConfig();
  const backendId = backend || cfg.defaultBackend || "siliconflow";
  const adapter = getAdapter(backendId);
  const apiKey = resolveApiKey(backendId);

  const resolvedVoice = resolveVoice(voice, agentId, cfg);
  const resolvedSpeed = resolveSpeed(speed, agentId, cfg);
  const resolvedGain = resolveGain(gain, agentId, cfg);
  const resolvedPrompt = resolvePrompt(prompt, agentId, cfg);

  // 从后端配置取自定义 apiBase / model
  const backendCfg = cfg.backends?.[backendId] || {};

  return adapter.synthesize({
    text,
    voice: resolvedVoice,
    speed: resolvedSpeed,
    gain: resolvedGain,
    prompt: resolvedPrompt,
    apiKey,
    model: backendCfg.model || adapter.defaultModel,
    apiBase: backendCfg.apiBase || adapter.defaultApiBase,
    log,
  });
}
