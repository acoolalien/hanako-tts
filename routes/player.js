// TTS audio player — auto-play on visible, skip if already played
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { renderPlayer } from "./player-template.js";

export default function (app, ctx) {
  app.get("/player", (c) => {
    const file = c.req.query("file") || "";
    if (!file || file.includes("/") || file.includes("\\") || file.includes("..")) {
      return c.text("invalid file", 400);
    }
    const fp = path.join(ctx.dataDir, file);
    let buf;
    try { buf = fs.readFileSync(fp); } catch { return c.text("audio not found", 404); }
    const src = `data:audio/mpeg;base64,${buf.toString("base64")}`;
    const key = crypto.createHash("md5").update(file).digest("hex").slice(0, 8);

    const html = renderPlayer({ src, key });
    return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  });
}
