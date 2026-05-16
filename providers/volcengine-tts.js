// 火山引擎 TTS Provider — API Key 走 Hanako provider 体系
export const id = "volcengine-tts";
export const displayName = "火山引擎 TTS";
export const authType = "api-key";
export const defaultBaseUrl = "https://openspeech.bytedance.com/api/v3/tts";

export const capabilities = {
  chat: { projection: "none" },
  media: { speech: true },
};
