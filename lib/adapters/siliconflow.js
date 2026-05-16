// SiliconFlow CosyVoice2 adapter
export const id = "siliconflow";
export const name = "硅基流动";

export const defaultApiBase = "https://api.siliconflow.cn/v1/audio/speech";
export const defaultModel = "FunAudioLLM/CosyVoice2-0.5B";

export const voices = {
  anna: "沉稳女声",
  bella: "热情女声",
  claire: "温柔女声",
  diana: "欢快女声",
  alex: "沉稳男声",
  benjamin: "深沉男声",
  charles: "磁性男声",
  david: "欢快男声",
};

// 平台独占参数默认值
export const defaultParams = {
  gain: 0,
  emotionPrompt: true,
};

/**
 * @param {Object} opts
 * @param {string} opts.text - 合成文本
 * @param {string} opts.voice - 音色 ID（不含 model 前缀）
 * @param {number} opts.speed - 语速 0.25~4.0
 * @param {number} opts.gain - 增益 -10~10 dB
 * @param {string|null} opts.prompt - 情感指令
 * @param {string} opts.apiKey - API Key
 * @param {string} [opts.model] - 模型 ID
 * @param {string} [opts.apiBase] - API 端点
 * @param {Function} [opts.log] - 日志函数
 * @returns {Promise<Buffer>}
 */
export async function synthesize({
  text, voice, speed, gain, prompt, apiKey,
  model, apiBase, log,
}) {
  const resolvedModel = model || defaultModel;
  const resolvedApiBase = apiBase || defaultApiBase;
  const resolvedVoice = voice.includes(":") ? voice : `${resolvedModel}:${voice}`;

  let input = text.trim();
  if (prompt) {
    input = `${prompt}<|endofprompt|>${input}`;
  }

  log?.info(
    `[siliconflow] ${text.length}chars voice=${resolvedVoice} speed=${speed} gain=${gain}dB`
  );

  const resp = await fetch(resolvedApiBase, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: resolvedModel,
      input,
      voice: resolvedVoice,
      response_format: "mp3",
      speed,
      gain,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`SiliconFlow TTS ${resp.status}: ${errText.slice(0, 200)}`);
  }

  return Buffer.from(await resp.arrayBuffer());
}
