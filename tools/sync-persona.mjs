#!/usr/bin/env node
/**
 * sync-persona.mjs —— 把 persona/kaguya.md 同步进 kaguya profile 的 preset 声明。
 *
 * 人格卡的唯一来源是 persona/kaguya.md。
 * 本脚本只重写 profile patch 里 PERSONA PRESET 两个标记之间的内容，
 * 其余部分（包括设置页写回的 dsh-onebot config）原样保留。
 *
 * 用法：node tools/sync-persona.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'D:/Bot_KaGuYa';
const PERSONA = `${ROOT}/persona/kaguya.md`;
const PATCH = `${ROOT}/runtime/dsh-home/profiles/kaguya/cordis.patch.yml`;

const BEGIN = '# >>> PERSONA PRESET (generated from persona/kaguya.md — do not edit by hand)';
const END = '# <<< PERSONA PRESET';

const persona = readFileSync(PERSONA, 'utf8').replace(/\r\n/g, '\n').trimEnd();

/** 给多行文本加统一缩进（空行保持空行，符合 YAML 块标量语义） */
const indent = (text, n) =>
  text
    .split('\n')
    .map((line) => (line.trim() === '' ? '' : ' '.repeat(n) + line))
    .join('\n');

const block = [
  BEGIN,
  '- insert:',
  '    - id: preset-kaguya',
  "      name: '@deepseek-ai/dsh-agent-preset'",
  '      config:',
  '        id: kaguya',
  '        name: 辉夜',
  '        description: 蓬莱山辉夜（NEET 姬）——东方 Project 二创人格，只做群聊',
  '        order: 40',
  '        plugins:',
  '          # 人格本体：complete 模式，整段系统提示词就是人格卡',
  '          - id: persona',
  "            name: '@deepseek-ai/dsh-persona'",
  '            config:',
  '              complete: true',
  '              includeRuntimeContext: false',
  '              prefix: |-',
  indent(persona, 16),
  '          # 让辉夜知道现在几点（她作息很烂，这个有用）',
  '          - id: time-context',
  "            name: '@deepseek-ai/dsh-time-context'",
  '          # 文件工具：只留看图，不给读写改——群聊机器人不需要动文件',
  '          - id: tool-fs',
  "            name: '@deepseek-ai/dsh-tool-fs'",
  '            config:',
  '              read: false',
  '              readImage: true',
  '              write: false',
  '              edit: false',
  '          # 上下文压缩：群聊久了会很长',
  '          - id: compaction',
  '            name: cordis:group',
  '            group: true',
  '            isolate:',
  '              compaction: true',
  '            config:',
  '              - id: compaction-basic',
  "                name: '@deepseek-ai/dsh-compaction-basic'",
  '              - id: command-compact',
  "                name: '@deepseek-ai/dsh-command-compact'",
  END,
].join('\n');

const patch = readFileSync(PATCH, 'utf8').replace(/\r\n/g, '\n');
const beginAt = patch.indexOf(BEGIN);
const endAt = patch.indexOf(END);

if (beginAt < 0 || endAt < 0 || endAt < beginAt) {
  console.error(`[sync-persona] 找不到标记，放弃写入。检查 ${PATCH} 里的：`);
  console.error(`  ${BEGIN}`);
  console.error(`  ${END}`);
  process.exit(1);
}

const next = patch.slice(0, beginAt) + block + patch.slice(endAt + END.length);
writeFileSync(PATCH, next, 'utf8');
console.log(`[sync-persona] 已同步 ${persona.length} 字人格 → ${PATCH}`);
