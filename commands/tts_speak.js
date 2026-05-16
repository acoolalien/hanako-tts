// /tts_speak command — quick voice generation
import path from "node:path";
import fs from "node:fs";
import { generateSpeech, loadConfig, resolveVoice, resolveSpeed, resolveGain, dataDir, parseArgs, VOICES } from "../lib/tts-core.js";

export const name = "tts_speak";
export const description = "使用语音朗读指定文本";
export const permission = "anyone";
export const usage = "/tts_speak <文本> [voice=音色] [speed=语速] [gain=增益]";

export async function execute(rawArgs, cmdCtx) {
  try {
    const args = parseArgs(rawArgs);
    const text = args.text || "";

    if (!text || !text.trim()) {
      const voiceList = Object.entries(VOICES)
        .map(([k, v]) => `  ${k}: ${v}`)
        .join("\n");
      return { reply: `用法: /tts_speak <文本> [voice=音色] [speed=语速] [gain=增益]\n\n可用音色:\n${voiceList}` };
    }

    const cfg = loadConfig();
    const agentId = cmdCtx?.agentId || null;
    const voice = resolveVoice(args.voice, agentId, cfg);
    const speed = resolveSpeed(args.speed, agentId, cfg);
    const gain = resolveGain(args.gain, agentId, cfg);

    const buffer = await generateSpeech({ text, voice, speed, gain, agentId }, console);

    const outDir = path.join(dataDir(), "plugin-data", "tts");
    await fs.promises.mkdir(outDir, { recursive: true });
    const filePath = path.join(outDir, `speech_${Date.now()}.mp3`);
    await fs.promises.writeFile(filePath, buffer);

    const kb = (buffer.length / 1024).toFixed(1);
    return { reply: `🔊 已生成语音 (${kb} KB): ${text.slice(0, 50)}${text.length > 50 ? "…" : ""}` };
  } catch (err) {
    console.error("[tts] speak failed", err);
    return { reply: `[TTS] 语音生成失败: ${err.message}` };
  }
}
