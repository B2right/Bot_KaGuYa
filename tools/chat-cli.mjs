#!/usr/bin/env node
/**
 * 辉夜群聊模拟器（命令行版）
 *
 * 不需要装 QQ、不需要 NapCat。本程序冒充 NapCat 拨进 Bot_KaGuYa，
 * 你在下面直接打字当「群友」，辉夜的回复会实时打出来。
 *
 * 用法：
 *   双击 tools\辉夜群聊模拟器.cmd        ← 推荐
 *   node tools/chat-cli.mjs              ← 命令行
 *   node tools/chat-cli.mjs "在吗" "来张辉夜图"   ← 带参数 = 自动跑一遍就退
 *
 * 场内的斜杠命令：
 *   /nick 名字     换个群友昵称
 *   /noat 内容     这条不带 @辉夜 发出去（用来看她会不会装死）
 *   /quit          退出
 */
import { setTimeout as sleep } from 'node:timers/promises';
import { createInterface } from 'node:readline';

const URL = process.env.KAGUYA_WS_URL || 'ws://127.0.0.1:8643/ws';
// token 必须与 kaguya profile 里 dsh-onebot 的 accessToken 一致
// 见 examples/kaguya-patch.yml
const TOKEN = process.env.KAGUYA_ONEBOT_TOKEN || 'change-me';
const GROUP = Number(process.env.KAGUYA_TEST_GROUP || 999001);
const SELF = Number(process.env.KAGUYA_BOT_QQ || 1000001);
const USER = Number(process.env.KAGUYA_TEST_QQ || 10001);

let nick = '测试群友';
let seq = Number(String(Date.now()).slice(-7));
const scripted = process.argv.slice(2);

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

console.log(c.bold('\n=== 辉夜群聊模拟器 ==='));
console.log(c.dim(`假装是 NapCat，连 ${URL}，群号 ${GROUP}\n`));

const ws = new WebSocket(URL, { headers: { Authorization: `Bearer ${TOKEN}` } });

/** 把机器人发来的帧读成人话；返回 null 表示这帧不用显示 */
function readFrame(frame) {
  const action = frame.action;
  if (!action) return null;
  const p = frame.params ?? {};
  const out = [];
  if (Array.isArray(p.message)) {
    for (const seg of p.message) {
      if (seg.type === 'text') out.push(seg.data?.text ?? '');
      else if (seg.type === 'image') out.push(c.dim(`[图片 ${seg.data?.file ?? seg.data?.url ?? '?'}]`));
      else if (seg.type === 'at') out.push(`@${seg.data?.qq}`);
      else out.push(c.dim(`[${seg.type}]`));
    }
  } else if (typeof p.message === 'string') {
    out.push(p.message);
  }
  return out.join('');
}

let pending = false;

ws.addEventListener('open', () => {
  ws.send(
    JSON.stringify({
      post_type: 'meta_event',
      meta_event_type: 'lifecycle',
      sub_type: 'connect',
      self_id: SELF,
      time: Math.floor(Date.now() / 1000),
    }),
  );
  console.log(c.dim('已连上。直接打字当群友说话，辉夜会回。输入 /quit 退出。\n'));
  start();
});

ws.addEventListener('message', (e) => {
  let frame;
  try {
    frame = JSON.parse(String(e.data));
  } catch {
    return;
  }
  // 机器人发来的动作请求自带 echo，必须先按动作处理再回执，否则插件会 30 秒超时
  if (frame.action) {
    const text = readFrame(frame);
    if (text !== null) {
      pending = false;
      console.log(c.cyan('\n辉夜> ') + c.bold(text) + '\n');
      prompt();
    }
    ws.send(JSON.stringify({ status: 'ok', retcode: 0, data: { message_id: ++seq }, echo: frame.echo }));
    return;
  }
});

ws.addEventListener('error', (e) => {
  console.log(c.red('\n连不上机器人：' + (e.message ?? e.error?.message ?? String(e))));
  console.log(c.red('多半是机器人主进程没在跑。去 D:\\Bot_KaGuYa 双击「启动辉夜.cmd」。\n'));
});

let rl = null;
let queue = [];
function prompt() {
  if (!rl) return;
  if (pending) {
    rl.setPrompt(c.dim('  ...辉夜正在想\n群友> '));
  } else {
    rl.setPrompt(c.green(`${nick}> `));
  }
  rl.prompt();
}

/** 把一条群友消息发进去 */
function send(text, { at = true } = {}) {
  const segs = [];
  if (at) segs.push({ type: 'at', data: { qq: String(SELF) } });
  segs.push({ type: 'text', data: { text: (at ? ' ' : '') + text } });
  const raw = (at ? `[CQ:at,qq=${SELF}] ` : '') + text;
  ws.send(
    JSON.stringify({
      post_type: 'message',
      message_type: 'group',
      sub_type: 'normal',
      message_id: ++seq,
      group_id: GROUP,
      user_id: USER,
      self_id: SELF,
      time: Math.floor(Date.now() / 1000),
      raw_message: raw,
      sender: { user_id: USER, nickname: nick, card: '', role: 'member' },
      message: segs,
    }),
  );
  pending = true;
}

/** 等辉夜把当前这条回完（或超时），脚本模式用 */
async function waitReply(ms = 60000) {
  const t0 = Date.now();
  while (pending && Date.now() - t0 < ms) await sleep(200);
}

async function start() {
  if (scripted.length) {
    for (const line of scripted) {
      await sleep(600);
      console.log(c.green(`${nick}> `) + line);
      send(line);
      await waitReply();
      await sleep(300);
    }
    console.log(c.dim('\n演示结束。'));
    ws.close();
    process.exit(0);
  }

  rl = createInterface({ input: process.stdin, output: process.stdout });
  for (const q of queue) rl.question(q); // 连接前就输入的内容
  queue = [];
  rl.on('line', (line) => {
    const s = line.trim();
    if (!s) return prompt();
    if (s === '/quit' || s === '/exit') {
      ws.close();
      process.exit(0);
    }
    if (s.startsWith('/nick ')) {
      nick = s.slice(6).trim() || nick;
      return prompt();
    }
    if (s.startsWith('/noat ')) {
      send(s.slice(6), { at: false });
      return;
    }
    send(s);
  });
  rl.on('close', () => process.exit(0));
  prompt();
}
