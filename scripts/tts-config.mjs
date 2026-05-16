// TTS 配置 CLI — 临时脚本，直接操作 tts_config.json
// 用法：
//   node scripts/tts-config.mjs show                   查看当前配置
//   node scripts/tts-config.mjs set key=value ...      设置配置
//   node scripts/tts-config.mjs set-defaults            初始化默认配置

import { loadConfig, saveConfig, listAdapters } from "../lib/tts-core.js";

const cmd = process.argv[2];

function printConfig(cfg) {
  console.log("=== TTS 当前配置 ===");
  console.log(`  默认后端: ${cfg.defaultBackend || "siliconflow"}`);
  console.log(`  默认语速: ${cfg.defaultSpeed ?? 1.0}`);
  console.log(`  默认策略: ${cfg.defaultStrategy || "normal"}`);

  console.log("\n  可用后端:");
  for (const a of listAdapters()) {
    const mark = a.id === (cfg.defaultBackend || "siliconflow") ? " ← 默认" : "";
    console.log(`    ${a.id}: ${a.name}${mark}`);
  }

  if (cfg.agents && Object.keys(cfg.agents).length > 0) {
    console.log("\n  Agent 配置:");
    for (const [id, ac] of Object.entries(cfg.agents)) {
      const bits = [];
      if (ac.voice) bits.push(`voice=${ac.voice}`);
      if (ac.speed !== undefined) bits.push(`speed=${ac.speed}`);
      if (ac.strategy) bits.push(`strategy=${ac.strategy}`);
      if (ac.prompt) bits.push(`prompt="${ac.prompt}"`);
      console.log(`    ${id}: ${bits.join(", ") || "(空)"}`);
    }
  } else {
    console.log("\n  Agent 配置: (未设置)");
  }
  console.log("");
}

function setConfig(pairs) {
  const cfg = loadConfig();
  const changed = [];

  // 全局字段
  const globalKeys = ["defaultBackend", "defaultSpeed", "defaultStrategy"];

  for (const pair of pairs) {
    const eq = pair.indexOf("=");
    if (eq <= 0) {
      console.log(`  跳过无效参数: ${pair}（格式应为 key=value）`);
      continue;
    }
    const key = pair.slice(0, eq);
    const val = pair.slice(eq + 1);

    if (globalKeys.includes(key)) {
      cfg[key] = key === "defaultSpeed" ? Number(val) : val;
      changed.push(`${key}=${cfg[key]}`);
      continue;
    }

    // Agent 级别: agent.<id>.<field>=<value>
    const agentMatch = key.match(/^agent\.(.+?)\.(.+)$/);
    if (agentMatch) {
      const [, agentId, field] = agentMatch;
      const validFields = ["voice", "speed", "strategy", "prompt"];
      if (!validFields.includes(field)) {
        console.log(`  跳过无效字段: ${field}`);
        continue;
      }
      if (!cfg.agents) cfg.agents = {};
      if (!cfg.agents[agentId]) cfg.agents[agentId] = {};
      cfg.agents[agentId][field] = field === "speed" ? Number(val) : val;
      changed.push(`${key}=${cfg.agents[agentId][field]}`);
      continue;
    }

    // 后端级别: backend.<id>.<field>=<value>
    const backendMatch = key.match(/^backend\.(.+?)\.(.+)$/);
    if (backendMatch) {
      const [, backendId, field] = backendMatch;
      const validFields = ["apiBase", "model", "apiKey"];
      if (!validFields.includes(field)) {
        console.log(`  跳过无效字段: ${field}`);
        continue;
      }
      if (!cfg.backends) cfg.backends = {};
      if (!cfg.backends[backendId]) cfg.backends[backendId] = {};
      cfg.backends[backendId][field] = val;
      changed.push(`${key}=${val}`);
      continue;
    }

    console.log(`  跳过未知配置: ${key}`);
  }

  if (changed.length > 0) {
    saveConfig(cfg);
    console.log(`已更新: ${changed.join(", ")}`);
  } else {
    console.log("没有需要更新的配置项");
  }
  console.log("");
  printConfig(cfg);
}

function setDefaults() {
  const cfg = loadConfig();
  cfg.defaultBackend = cfg.defaultBackend || "siliconflow";
  cfg.defaultSpeed = cfg.defaultSpeed ?? 1.0;
  cfg.defaultStrategy = cfg.defaultStrategy || "normal";
  saveConfig(cfg);
  console.log("全局默认配置已写入（不影响已有 Agent 配置）\n");
  printConfig(cfg);
}

// ── main ──

if (cmd === "show" || !cmd) {
  printConfig(loadConfig());
} else if (cmd === "set") {
  const pairs = process.argv.slice(3);
  if (pairs.length === 0) {
    console.log("用法: node scripts/tts-config.mjs set key=value ...");
    console.log("示例: node scripts/tts-config.mjs set defaultBackend=siliconflow agent.<id>.voice=anna");
    process.exit(1);
  }
  setConfig(pairs);
} else if (cmd === "set-defaults") {
  setDefaults();
} else {
  console.log(`未知命令: ${cmd}`);
  console.log("可用命令: show | set | set-defaults");
  console.log("示例:");
  console.log("  node scripts/tts-config.mjs show");
  console.log("  node scripts/tts-config.mjs set defaultStrategy=aggressive agent.<id>.voice=anna");
  console.log("  node scripts/tts-config.mjs set-defaults");
  process.exit(1);
}
