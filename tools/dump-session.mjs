#!/usr/bin/env node
/**
 * dump-session.mjs —— 把某个 QQ 会话的原始事件流摊开看。
 *
 * 验收排查用：peek-session 只挑「用户说/辉夜说」，这个脚本把每个事件的 kind 和原文都打出来，
 * 用来确认模型到底有没有真的跑、报了什么错。
 *
 * 用法：node tools/dump-session.mjs [sessionId] [最多事件数]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { zstdDecompressSync } from 'node:zlib';
import { join } from 'node:path';

const SESSIONS = 'D:/Bot_KaGuYa/runtime/dsh-home/sessions';
const sessionId = process.argv[2] ?? 'onebot-group-999001';
const limit = Number(process.argv[3] ?? 200);

function findSession(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (!statSync(full).isDirectory()) continue;
    if (name === sessionId) {
      const f = join(full, 'session.v4.jsonl.zstd');
      try {
        statSync(f);
        return f;
      } catch {
        /* 继续递归 */
      }
    }
    const hit = findSession(full);
    if (hit) return hit;
  }
  return null;
}

const file = findSession(SESSIONS);
if (!file) {
  console.error(`找不到会话 ${sessionId}`);
  process.exit(1);
}

const raw = zstdDecompressSync(readFileSync(file)).toString('utf8');
const lines = raw.split('\n').filter((l) => l.trim());
console.log(`# ${sessionId}  共 ${lines.length} 个事件  (${file})\n`);

for (const line of lines.slice(-limit)) {
  let ev;
  try {
    ev = JSON.parse(line);
  } catch {
    console.log('[非JSON] ' + line.slice(0, 300));
    continue;
  }
  const kind = ev.kind ?? ev.type ?? ev.event ?? '?';
  console.log(`──[${kind}]── ${JSON.stringify(ev).slice(0, 1200)}`);
}
