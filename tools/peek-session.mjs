#!/usr/bin/env node
/**
 * peek-session.mjs —— 看一眼某个 QQ 会话里模型到底说了什么。
 *
 * 会话日志是 zstd 压缩的 JSONL。本脚本解压后只打印「用户说什么 / 辉夜说什么」两类事件，
 * 方便不开 GUI 就能验收人格效果。
 *
 * 用法：node tools/peek-session.mjs [sessionId] [条数]
 *   sessionId 默认 onebot-group-999001
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { zstdDecompressSync } from 'node:zlib';
import { join } from 'node:path';

const SESSIONS = 'D:/Bot_KaGuYa/runtime/dsh-home/sessions';
const sessionId = process.argv[2] ?? 'onebot-group-999001';
const limit = Number(process.argv[3] ?? 40);

/** 在 sessions 下按目录名递归找 <sessionId>/session.v4.jsonl.zstd */
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
        /* 继续往下找 */
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
const events = raw
  .split('\n')
  .filter((l) => l.trim())
  .map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  })
  .filter(Boolean);

/** 把事件里的文本块抠出来 */
function texts(ev) {
  const out = [];
  const walk = (node) => {
    if (!node) return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (typeof node !== 'object') return;
    if (typeof node.text === 'string' && node.text.trim()) out.push(node.text);
    for (const [k, v] of Object.entries(node)) {
      if (k === 'text') continue;
      if (v && typeof v === 'object') walk(v);
    }
  };
  walk(ev);
  return out;
}

const shown = events.filter((ev) => {
  const kind = ev.kind ?? ev.type ?? '';
  return /user|assistant|message/i.test(String(kind));
});

console.log(`# ${sessionId}  (${events.length} 个事件，显示最后 ${limit} 条对话)\n`);
for (const ev of shown.slice(-limit)) {
  const kind = ev.kind ?? ev.type ?? '?';
  const body = texts(ev).join('\n').trim();
  if (!body) continue;
  console.log(`──[${kind}]──`);
  console.log(body);
  console.log();
}
