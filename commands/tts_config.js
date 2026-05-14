import path from "node:path";
import fs from "node:fs";

export const name = "tts_config";
export const description = "查看或修改 TTS 语音配置";
export const permission = "anyone";
export const usage = "/tts_config [voice=<anna>] [speed=<1.0>]";

const DEFAULTS = { voice: "anna", speed: "1.0" };

function getConfigPath() {
  return path.join(
    process.env.HANAKO_DATA_DIR ||
      path.join(process.env.USERPROFILE || process.env.HOME || ".", ".hanako"),
    "tts_config.json",
  );
}

function loadConfig() {
  const p = getConfigPath();
  try {
    if (fs.existsSync(p)) {
      return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(p, "utf-8")) };
    }
  } catch (e) {
    console.error("[tts] config read error", e.message);
  }
  return { ...DEFAULTS };
}

function saveConfig(cfg) {
  const p = getConfigPath();
  try {
    fs.writeFileSync(p, JSON.stringify(cfg, null, 2), "utf-8");
    console.log("[tts] config saved", p);
  } catch (e) {
    console.error("[tts] config write error", e.message);
  }
}

function parseArgs(raw) {
  const args = {};
  if (!raw) return args;
  for (const part of raw.split(/\s+/)) {
    const eq = part.indexOf("=");
    if (eq > 0) {
      args[part.slice(0, eq)] = part.slice(eq + 1);
    }
  }
  return args;
}

export async function handler(ctx) {
  try {
    const args = parseArgs(ctx.args);
    const cfg = loadConfig();
    const changed = [];

    if (args.voice !== undefined) {
      cfg.voice = String(args.voice);
      changed.push(`voice=${cfg.voice}`);
      console.log(`[tts] config changed: voice=${cfg.voice}`);
    }
    if (args.speed !== undefined) {
      cfg.speed = String(args.speed);
      changed.push(`speed=${cfg.speed}`);
      console.log(`[tts] config changed: speed=${cfg.speed}`);
    }

    if (changed.length > 0) {
      saveConfig(cfg);
      return { reply: `[TTS] 配置已更新: ${changed.join(", ")}` };
    }

    return {
      reply: `[TTS] 当前配置:\n  音色: ${cfg.voice}\n  语速: ${cfg.speed}`,
    };
  } catch (err) {
    console.error("[tts] config command error", err);
    return { reply: `[TTS] 配置操作失败: ${err.message}` };
  }
}
