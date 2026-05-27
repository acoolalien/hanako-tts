// TTS generate_speech tool — generates mp3 + auto-play via iframe card
import path from "node:path";
import fs from "node:fs";
import { generateSpeech, loadConfig, resolveVoice, resolveSpeed, resolveGain, VOICES } from "../lib/tts-core.js";

export const name = "tts_generate_speech";
export const description =
  "将文本转换为语音文件，输出 mp3 音频，自动通过卡片播放。可用音色: anna/bella/claire/diana/alex/benjamin/charles/david";

export const parameters = {
  type: "object",
  properties: {
    text: { type: "string", description: "要转换为语音的文本" },
    voice: { type: "string", description: "音色名称（可选，优先用 agent 绑定）" },
    speed: { type: "number", description: "语速 0.25-4.0（可选）" },
    gain: { type: "number", description: "音量增益 dB，范围 -10~10（可选）" },
    prompt: { type: "string", description: "情感指令，如「用高兴的语气说」（可选，优先用 agent 绑定）" },
  },
  required: ["text"],
};

export async function execute(input, toolCtx) {
  const log = toolCtx?.log || { info: () => {}, error: () => {} };
  const start = Date.now();

  try {
    const text = (typeof input.text === "string" ? input.text : String(input.text || "")).trim();
    if (!text) throw new Error("文本为空");

    const cfg = loadConfig();
    const agentId = toolCtx?.agentId || null;
    const voice = resolveVoice(input.voice, agentId, cfg);
    const speed = resolveSpeed(input.speed, agentId, cfg);
    const gain = resolveGain(input.gain, agentId, cfg);

    const buffer = await generateSpeech({ text, voice, speed, gain, prompt: input.prompt, agentId }, log);
    const elapsed = Date.now() - start;

    await fs.promises.mkdir(toolCtx.dataDir, { recursive: true });
    const filename = `speech_${Date.now()}.mp3`;
    const filePath = path.join(toolCtx.dataDir, filename);
    await fs.promises.writeFile(filePath, buffer);

    log.info(`TTS done: ${(buffer.length / 1024).toFixed(1)}KB ${elapsed}ms`);

    // stage for session delivery
    if (toolCtx.stageFile && toolCtx.sessionPath) {
      try {
        toolCtx.stageFile({ sessionPath: toolCtx.sessionPath, filePath, label: "speech.mp3" });
      } catch (_) {}
    }

    const cardRoute = `/player?file=${encodeURIComponent(filename)}`;

    return {
      content: [{ type: "text", text: `🔊 ${text}` }],
      details: {
        card: {
          type: "iframe",
          route: cardRoute,
          aspectRatio: "8:1",
        },
        media: { items: [] },
      },
    };
  } catch (err) {
    log.error("TTS failed", err.message);
    return {
      content: [{ type: "text", text: `语音生成失败: ${err.message}` }],
    };
  }
}
