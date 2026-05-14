// TTS core — single config source: tts_config.json
import path from "node:path";
import fs from "node:fs";

export const SPEECH_API = "https://api.siliconflow.cn/v1/audio/speech";
export const MODEL = "FunAudioLLM/CosyVoice2-0.5B";

export const VOICES = {
  anna: "沉稳女声",
  bella: "热情女声",
  claire: "温柔女声",
  diana: "欢快女声",
  alex: "沉稳男声",
  benjamin: "深沉男声",
  charles: "磁性男声",
  david: "欢快男声",
};

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

// 解析任意参数：agent override > input > global default > 兜底
function resolveParam(config, agentId, paramKey, inputValue, fallback) {
  // 1. agent override
  if (agentId && config.agents?.[agentId]?.[paramKey] !== undefined) {
    return config.agents[agentId][paramKey];
  }
  // 2. input
  if (inputValue !== undefined && inputValue !== null) {
    return typeof fallback === "number" ? Number(inputValue) : String(inputValue);
  }
  // 3. global default from config
  if (config[paramKey] !== undefined) return config[paramKey];
  // 4. code fallback
  return fallback;
}

export function resolveVoice(voiceInput, agentId, config) {
  const cfg = config || loadConfig();
  const v = resolveParam(cfg, agentId, "voice", voiceInput, "anna");
  return (v || "anna").includes(":") ? v : `${MODEL}:${v}`;
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

export function resolveApiKey() {
  const cfg = loadConfig();
  if (cfg.apiKey) return cfg.apiKey;
  if (process.env.SILICON_FLOW_API_KEY) return process.env.SILICON_FLOW_API_KEY;

  // Hanako added-models.yaml fallback
  try {
    const p = path.join(dataDir(), "added-models.yaml");
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf-8");
      const m = raw.match(/^\s+siliconflow:\s*\n\s+api_key:\s*(\S+)/m);
      if (m) return m[1];
    }
  } catch (_) {}

  throw new Error("未找到 API Key。请在 tts_config.json 设置 apiKey");
}

// ── speech ──

export async function generateSpeech({ text, voice, speed, gain, prompt, agentId }, log) {
  const cfg = loadConfig();
  const apiKey = resolveApiKey();
  const resolvedVoice = resolveVoice(voice, agentId, cfg);
  const resolvedSpeed = resolveSpeed(speed, agentId, cfg);
  const resolvedGain = resolveGain(gain, agentId, cfg);
  const resolvedPrompt = resolvePrompt(prompt, agentId, cfg);

  // 拼装带情感 prompt 的 input
  let input = text.trim();
  if (resolvedPrompt) {
    input = `${resolvedPrompt}<|endofprompt|>${input}`;
  }

  log?.info(
    `TTS: ${text.length}chars voice=${resolvedVoice} speed=${resolvedSpeed} gain=${resolvedGain}dB`
  );

  const resp = await fetch(SPEECH_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input,
      voice: resolvedVoice,
      response_format: "mp3",
      speed: resolvedSpeed,
      gain: resolvedGain,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`TTS API ${resp.status}: ${errText.slice(0, 200)}`);
  }

  return Buffer.from(await resp.arrayBuffer());
}
