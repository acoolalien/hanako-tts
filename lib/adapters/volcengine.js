// 火山引擎 TTS adapter（骨架，待实现）
export const id = "volcengine";
export const name = "火山引擎";

export const defaultApiBase = "https://openspeech.bytedance.com/api/v3/tts/unidirectional";
export const defaultModel = "seed-tts-2.0";

export const voices = {
  // 火山引擎音色通过 API 动态获取，此处为空占位
  // 实际使用时需调用 ListSpeakers 接口
};

export const defaultParams = {
  pitchRate: 0,
  speechRate: 0,
};

/**
 * 火山引擎 TTS 合成（待实现）
 * 协议：HTTP Chunked V3 单向流式
 * 文档：https://www.volcengine.com/docs/6561/1598757
 */
export async function synthesize({
  text, voice, speed, apiKey,
  model, apiBase, log,
}) {
  // TODO: 实现火山引擎 HTTP Chunked V3 协议
  // 请求头：X-Api-Key, X-Api-Resource-Id
  // 请求体：{ app: { appid, token, cluster }, audio: { voice_type, encoding, speed_ratio }, request: { reqid, text, operation } }
  // 响应：流式二进制音频块
  throw new Error("火山引擎 TTS 适配器尚未实现");
}
