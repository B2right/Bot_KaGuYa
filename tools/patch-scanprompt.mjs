/**
 * 把「顺手抄说话样本 → voice.md」这条要求，写进**真正生效的那份提示词**。
 *
 * 用法：
 *   node tools/patch-scanprompt.mjs
 *
 * 环境变量：
 *   KAGUYA_SCROLL_DIR —— 刷B站数据目录，默认 <DSH_HOME>/bili-duty
 *
 * 背景（为什么需要专门改提示词）：
 *   新版刷B站插件已经不再读 prompts/duty.md，改成了读设置页里存的 scanPrompt。
 *   所以改 duty.md 是无效的 —— 真正进模型眼睛的是 <家目录>/config.json 的 scanPrompt 字段。
 *
 * 只改 scanPrompt 一个字段，其余原样写回；改前整份备份。
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh')
const home_ = process.env.KAGUYA_SCROLL_DIR || join(dshHome, 'bili-duty')
const cfgPath = join(home_, 'config.json')
const backupDir = process.env.KAGUYA_BACKUP_DIR || join(home_, 'backup')

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const backup = join(backupDir, `config.json.before-voice-sample-${stamp}`)

if (!existsSync(cfgPath)) {
  console.error('找不到 config.json：' + cfgPath)
  process.exit(1)
}
if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })
copyFileSync(cfgPath, backup)
console.log('已备份 →', backup)

const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'))
const old = String(cfg.scanPrompt || '')
console.log('scanPrompt 原长度 =', old.length)

if (old.includes('voice.md')) {
  console.log('scanPrompt 里已经有 voice.md 了，不重复加。')
  process.exit(0)
}

// 插入点：评论那一步之后
const NEEDLE = '顺手翻翻评论区，看看大家真实怎么说。'
if (!old.includes(NEEDLE)) {
  console.error('找不到插入点，scanPrompt 不是预期的那一版。中止，什么都没改。')
  console.error('现在的内容：\n' + old)
  process.exit(2)
}

const voicePath = join(home_, 'voice.md').replace(/\\/g, '/')
const INSERT = `${NEEDLE}
⭐ 翻评论的时候**顺手把说得好的真人原句抄一份**：追加进 \`${voicePath}\`，一行一条，
格式是 \`- 「原句」—— 为什么好\`（破折号后面写一句"好在哪"）。
什么叫"说得好"：**有味道、有个性、换我我也想学一句的** —— 自嘲、损人、接梗、夸人、阴阳怪气但很妙的 ✓。
⚠️ **不要**抄用户名、不要抄时间、不要抄 BV 号，**只抄原句和"为什么好"**；一轮 **0-3 条**，
**没看到说得好的就一条都别抄**（凑数会把这份样本搞脏 ✗）；抄之前先翻一眼里面现有的，抄过的别重复。`

const TAIL_OLD = '写完把报告交给我就行，不用替我发评论、也不用发私信——那些我自己来。'
const TAIL_NEW =
  '⭐ 报告末尾再写一句 **「抄了 N 条样本」**（N=0 也写），好让我一眼看出这一步做了没有。\n' + TAIL_OLD

let next = old.replace(NEEDLE, INSERT)
next = next.includes(TAIL_OLD) ? next.replace(TAIL_OLD, TAIL_NEW) : next + '\n' + TAIL_NEW

cfg.scanPrompt = next
writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8')
console.log('scanPrompt 新长度 =', next.length)
console.log('已写入', cfgPath)
