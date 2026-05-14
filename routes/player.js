// TTS audio player — auto-play on visible, skip if already played
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

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
    // unique key for dedup
    const key = crypto.createHash("md5").update(file).digest("hex").slice(0, 8);

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:transparent;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
body{display:flex;align-items:center;justify-content:center}
.bar{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:100%;background:rgba(74,158,255,.08);border-radius:8px;padding:0 12px;cursor:pointer;user-select:none;-webkit-user-select:none}
.bar:hover{background:rgba(74,158,255,.14)}
.bar.playing{background:rgba(74,158,255,.18)}
.ico{width:18px;height:18px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.ico svg{width:16px;height:16px}
.ico .on{display:none;fill:#4a9eff}
.ico .off{display:block;fill:#4a9eff}
.playing .ico .on{display:block}
.playing .ico .off{display:none}
.dur{font-size:11px;color:#6a9ed8;flex-shrink:0;font-variant-numeric:tabular-nums}
</style></head><body>
<div class="bar" id="b">
  <span class="ico">
    <svg class="off" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
    <svg class="on" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
  </span>
  <span class="dur" id="d">--:--</span>
</div>
<audio id="a" src="${esc(src)}" preload="auto"></audio>
<script>
(function(){
var a=document.getElementById("a"),b=document.getElementById("b"),d=document.getElementById("d");
var playing=false,secs=0,hasAutoplayed=false;
var STORAGE_KEY="tts_played_${esc(key)}";

function fmt(s){var m=Math.floor(s/60),r=Math.floor(s%60);return m+":"+(r<10?"0":"")+r}
function alreadyPlayed(){
  try{return !!sessionStorage.getItem(STORAGE_KEY)}catch(e){return false}
}
function markPlayed(){
  try{sessionStorage.setItem(STORAGE_KEY,"1")}catch(e){}
}

a.addEventListener("loadedmetadata",function(){secs=a.duration||0;d.textContent=fmt(secs)});
a.addEventListener("timeupdate",function(){if(playing)d.textContent=fmt(a.currentTime)});
a.addEventListener("ended",function(){playing=false;b.classList.remove("playing");d.textContent=fmt(secs);markPlayed()});
a.addEventListener("error",function(){d.textContent="错误"});

b.addEventListener("click",function(){
  if(playing){a.pause();playing=false;b.classList.remove("playing");d.textContent=fmt(secs);return}
  var p=a.play();if(p&&p.then){p.then(function(){playing=true;b.classList.add("playing");markPlayed()}).catch(function(){d.textContent="点击播放"})}
  else{playing=true;b.classList.add("playing");markPlayed()}
});

// auto-play only when visible and not yet played
if(!alreadyPlayed()){
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting && !hasAutoplayed){
        hasAutoplayed=true;
        obs.disconnect();
        var p=a.play();
        if(p&&p.then){p.then(function(){playing=true;b.classList.add("playing");markPlayed()}).catch(function(){})}
        else{playing=true;b.classList.add("playing");markPlayed()}
      }
    });
  },{threshold:0.5});
  obs.observe(b);
}
})();
</script></body></html>`;

    return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  });
}
