#!/usr/bin/env node
/**
 * fake-napcat.mjs —— 假 NapCat：不装 QQ 也能把「群友说话 → 辉夜回话」整条链路跑通。
 *
 * 它冒充 NapCat 拨进 Bot_KaGuYa 的反向 WS 端口，然后：
 *   1. 发一条 lifecycle 元事件（让插件学到 botQQ）
 *   2. 发一条群消息（默认带 @辉夜）
 *   3. 把机器人回过来的每一帧原样打印出来（这就是验收要看的东西）
 *   4. 对机器人的 send 类动作回一个成功回执，否则插件会当成发送失败
 *
 * 用法：
 *   node tools/fake-napcat.mjs "在吗，出来打游戏"
 *   node tools/fake-napcat.mjs --wait 90 --group 999001 "来张辉夜图"
 */
import { setTimeout as sleep } from 'node:timers/promises';

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf('--' + name);
  if (i === -1) return dflt;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};

const URL = opt('url', process.env.KAGUYA_WS_URL || 'ws://127.0.0.1:8643/ws');
// token 必须与 kaguya profile 里 dsh-onebot 的 accessToken 一致
// 见 examples/kaguya-patch.yml
const TOKEN = opt('token', process.env.KAGUYA_ONEBOT_TOKEN || 'change-me');
const GROUP = Number(opt('group', process.env.KAGUYA_TEST_GROUP || 999001));
const SELF = Number(opt('self', process.env.KAGUYA_BOT_QQ || 1000001));
const USER = Number(opt('user', process.env.KAGUYA_TEST_QQ || 10001));
const NICK = opt('nick', '测试群友');
const WAIT = Number(opt('wait', 120));
const TEXT = args.join(' ') || '在吗，出来打游戏';

const t0 = Date.now();
const stamp = () => String(Date.now() - t0).padStart(6) + 'ms';
const say = (...a) => console.log(`[${stamp()}]`, ...a);

say(`连接 ${URL} ...`);
const ws = new WebSocket(URL, { headers: { Authorization: `Bearer ${TOKEN}` } });

let seq = Number(String(Date.now()).slice(-7)); // 每次跑都换一批 id，避免被插件的去重窗口拦掉
const envelope = (ev) => ({
  post_type: 'message',
  message_type: 'group',
  sub_type: 'normal',
  message_id: ++seq,
  group_id: GROUP,
  user_id: USER,
  self_id: SELF,
  time: Math.floor(Date.now() / 1000),
  raw_message: `[CQ:at,qq=${SELF}] ${TEXT}`,
  sender: { user_id: USER, nickname: NICK, card: '', role: 'member' },
  message: [
    { type: 'at', data: { qq: String(SELF) } },
    { type: 'text', data: { text: ' ' + TEXT } },
  ],
});

/** 把机器人发来的帧尽量读成人话 */
function describe(frame) {
  const action = frame.action;
  if (!action) {
    if (frame.post_type) return `机器人在发事件？post_type=${frame.post_type}`;
    return JSON.stringify(frame).slice(0, 300);
  }
  const p = frame.params ?? {};
  const parts = [];
  if (p.group_id) parts.push(`群${p.group_id}`);
  if (p.user_id) parts.push(`私聊${p.user_id}`);
  if (Array.isArray(p.message)) {
    for (const seg of p.message) {
      if (seg.type === 'text') parts.push(`文字「${seg.data?.text ?? ''}」`);
      else if (seg.type === 'image') parts.push(`图片(${seg.data?.file ?? seg.data?.url ?? '?'})`);
      else if (seg.type === 'at') parts.push(`@${seg.data?.qq}`);
      else parts.push(`${seg.type}:${JSON.stringify(seg.data).slice(0, 120)}`);
    }
  } else if (typeof p.message === 'string') {
    parts.push(`文字「${p.message}」`);
  }
  if (p.user_id && !Array.isArray(p.message)) parts.push(`(${action})`);
  return `动作 ${action} → ${parts.join(' ') || JSON.stringify(p).slice(0, 200)}`;
}

ws.addEventListener('open', async () => {
  say('已连接。发 lifecycle 元事件...');
  ws.send(
    JSON.stringify({
      post_type: 'meta_event',
      meta_event_type: 'lifecycle',
      sub_type: 'connect',
      self_id: SELF,
      time: Math.floor(Date.now() / 1000),
    }),
  );
  await sleep(1200);
  say(`发群消息：@辉夜 ${TEXT}`);
  ws.send(JSON.stringify(envelope()));
});

ws.addEventListener('message', (e) => {
  let frame;
  try {
    frame = JSON.parse(String(e.data));
  } catch {
    say('收到非 JSON 帧:', String(e.data).slice(0, 300));
    return;
  }
  // ⚠️ 顺序很重要：机器人发来的「动作请求」自带 echo 字段，必须先按动作处理，
  //    否则会被误判成回执，插件那边等回执等到 30 秒超时。
  if (frame.action) {
    const line = describe(frame);
    if (line) say('⬅ ' + line);
    ws.send(
      JSON.stringify({
        status: 'ok',
        retcode: 0,
        data: { message_id: ++seq },
        echo: frame.echo,
      }),
    );
    return;
  }
  if (frame.echo !== undefined) {
    say('回执:', frame.status, frame.retcode, frame.wording ?? '');
    return;
  }
  say('收到事件:', JSON.stringify(frame).slice(0, 300));
});

ws.addEventListener('error', (e) => say('连接出错:', e.message ?? e.error?.message ?? String(e)));
ws.addEventListener('close', (e) => say(`连接关闭 code=${e.code} ${e.reason ?? ''}`));

await sleep(WAIT * 1000);
say('时间到，收工。');
try {
  ws.close();
} catch {
  /* ignore */
}
process.exit(0);
