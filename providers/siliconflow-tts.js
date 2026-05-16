// 硅基流动 TTS Provider — API Key 走 Hanako provider 体系
export const id = "siliconflow-tts";
export const displayName = "硅基流动 TTS";
export const authType = "api-key";
export const defaultBaseUrl = "https://api.siliconflow.cn/v1";

export const capabilities = {
  chat: { projection: "none" },
  media: { speech: true },
};
