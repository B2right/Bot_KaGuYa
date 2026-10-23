/**
 * 探查：刷B站那一轮真正读到的章程，到底是哪一份、里面有没有你要的条目。
 * 只读，不写任何东西。
 *
 * 用法：
 *   node tools/check-charter.mjs
 *
 * 依赖环境变量（不填就用默认的 DSH 家目录）：
 *   DSH_HOME             —— DSH 家目录，默认 ~/.dsh
 *   KAGUYA_SCROLL_DIR    —— 刷B站数据目录，默认 <DSH_HOME>/bili-duty
 *   KAGUYA_SCROLL_PLUGIN —— dsh-bili-scroll 插件目录
 *
 * 为什么需要这个脚本：
 *   刷B站的「章程」可能有多份（插件自带的 prompts/duty.md、家目录里被用户改过的那份），
 *   而且新版插件可能已经不用章程、改用设置页里的提示词。
 *   排查「我改了规则但没生效」时，先跑这个确认到底读的是哪一份。
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh')
const stateDir = process.env.KAGUYA_SCROLL_DIR || join(dshHome, 'bili-duty')
const pluginDir =
  process.env.KAGUYA_SCROLL_PLUGIN ||
  join(dshHome, 'profiles', 'desktop', 'node_modules', 'dsh-bili-scroll')

console.log('DSH_HOME     =', dshHome)
console.log('stateDir     =', stateDir)
console.log('pluginDir    =', pluginDir)
console.log('')

if (!existsSync(pluginDir)) {
  console.error('找不到插件目录。用 KAGUYA_SCROLL_PLUGIN 指定它。')
  process.exit(1)
}

const { charterPath } = await import('file://' + join(pluginDir, 'lib', 'state.mjs').replace(/\\/g, '/'))

console.log('charterPath  =', charterPath(pluginDir, stateDir))

const duty = charterPath(pluginDir, stateDir)
if (!existsSync(duty)) {
  console.error('章程文件不存在:', duty)
  process.exit(1)
}

const raw = readFileSync(duty, 'utf8')
// 章程里用 <家目录> 占位，运行时会被替换成真实路径
const text = raw.split('<家目录>').join(stateDir)

console.log('原文长度     =', raw.length, '→ 替换后', text.length)
console.log('残留占位符   =', text.includes('<家目录>'))
console.log('')
console.log('=== 你关心的条目是否在里面 ===')
for (const needle of ['抄说话样本', '抄了 N 条样本', 'voice.md']) {
  const n = needle === 'voice.md' ? text.split(needle).length - 1 : Number(text.includes(needle))
  console.log(`  ${needle.padEnd(16)} ${n}`)
}

const i = text.indexOf('抄说话样本')
if (i >= 0) {
  console.log('')
  console.log('=== 那一段的真实样子（替换路径后）===')
  console.log(text.slice(Math.max(0, i - 120), i + 620))
}
