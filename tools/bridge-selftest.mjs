/**
 * 桥接自检 —— 只跑一次，看 scroll 的真产出能不能变成人格原料。
 * 不写任何生产文件之外的路径；镜像落在 <DSH_HOME>/external-bili-scroll/。
 */
process.env.DSH_HOME = 'D:/Bot_KaGuYa/runtime/dsh-home'

const base = 'file:///D:/Bot_KaGuYa/runtime/dsh-persona-distill/lib/'
const { scrollSourceDir } = await import(base + 'paths.mjs')
const { ADAPTERS, probeExternalSources, syncExternalSources } = await import(base + 'external.mjs')

console.log('DSH_HOME        =', process.env.DSH_HOME)
console.log('scrollSourceDir =', scrollSourceDir())
console.log('适配器          =', ADAPTERS.map((a) => a.id).join(' , '))
console.log('')

console.log('--- probe（只看状态，不写文件）---')
for (const r of probeExternalSources()) {
  console.log(` ${r.id.padEnd(14)} active=${r.active} files=${r.files}`)
}
console.log('')

console.log('--- sync（真同步）---')
for (const r of syncExternalSources()) {
  console.log(` ${r.id.padEnd(14)} active=${r.active} entries=${r.entries ?? '-'} notes=${r.notes ?? '-'} voice=${r.voice ?? '-'} files=${r.files ?? '-'}${r.error ? ' ERR=' + r.error : ''}`)
}
