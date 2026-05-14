export default class TTSPlugin {
  async onload() {
    const ctx = this.ctx;
    if (!ctx) {
      console.error("[tts] onload: ctx is undefined, plugin will not function");
      return;
    }

    if (ctx.log) {
      ctx.log.info("TTS plugin loaded");
    } else {
      console.log("[tts] plugin loaded");
    }
  }

  async onunload() {
    const ctx = this.ctx;
    if (ctx?.log) {
      ctx.log.info("TTS plugin unloaded");
    }
  }
}
