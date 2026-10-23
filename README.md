# Bot_KaGuYa

QQ 群聊机器人 —— 东方 Project 蓬莱山辉夜（**NEET 姬** 二创方向）。

> 「永远月宫的公主，如今赖在永远亭被炉里不出来的家里蹲。嘴很毒，手很懒，心很软。」

---

## 它是什么

- **主体只做调度和人格化播报**，能力全在外挂模块里。
- 所有模块用同一套调用契约：[`docs/module-contract.md`](docs/module-contract.md)。
- **模块失败不影响聊天**：辉夜随口吐槽一句，聊天继续。

## 当前进度

| 阶段 | 内容 | 状态 |
|---|---|---|
| 1 | 人格卡 + QQ 接入跑通 | ✅ **已验收**（真实群里能对话） |
| 2 | `call_module` + 极简 gallery | ⬜ 待开始 |
| 3 | gallery 完善（按心情/场景 + 定时主动发） | ⬜ |
| 4 | B站 模块 | ⬜ |
| 5 | STG 模块（联机邀请 + `launch_stg_bot`） | ⬜ |

---

## 架构

```
QQ 群友 @ 辉夜
   │
   ├─ QQ 客户端（D:\qq，机器人小号）
   │     │  登录态复用
   ├─ NapCat ────────── 注入 QQ，转成 OneBot v11 协议
   │     │  反向 WebSocket
   ├─ 辉夜大脑（DSH kaguya profile）── 端口 8643 / 3080
   │     ├─ 人格卡 persona/kaguya.md
   │     ├─ 聊天调度
   │     └─ 各外挂模块（gallery / bili / stg …）
   │
   └─ 回复发回群里
```

| 部件 | 作用 |
|---|---|
| **NapCat** | 把 QQ 协议转成 OneBot v11，让程序能收发消息 |
| **dsh-onebot-qq** | DSH 侧的 QQ 通道插件，负责 @ 门控、会话管理、发图等 |
| **kaguya profile** | 隔离的 DSH 运行环境，人格与配置都在这里 |

---

## 目录结构

| 目录 | 内容 |
|---|---|
| `persona/` | 人格卡 `kaguya.md`（**唯一来源**，改这里） |
| `docs/` | 模块调用契约、设计说明 |
| `config/` | 模块注册表 `modules.json` |
| `modules/` | 各外挂模块（每模块一个子目录） |
| `tools/` | 开发/自测工具 |
| `examples/` | 配置样例（脱敏版，照着填） |
| `runtime/` | 运行时数据（**不进仓库**：会话、凭据、日志） |
| `napcat/` | QQ 通道二进制（**不进仓库**：2GB 第三方文件） |
| `DEVLOG.md` | 开发记录（做了什么 / 遇到什么问题 / 怎么解决） |

> ⚠️ `runtime/` 和 `napcat/` 被 `.gitignore` 排除。里面含登录凭据和聊天记录，**不要提交**。

---

## 快速开始（不接 QQ，先聊起来）

```bash
# 1. 起辉夜大脑（需要一个已配置好的 DSH 环境）
启动辉夜_管理员.cmd

# 2. 另开一个窗口，用模拟器当群友
2-群聊模拟器.cmd
```

模拟器里直接打字当群友 @ 辉夜；`/quit` 退出。

想看她自动表演一遍：`3-自动演示.cmd`

---

## 接入真 QQ

**前置**：一个专门当机器人的 QQ 小号（别用主号）。

### 1. 装 QQ 和 NapCat

- 官方 QQ：<https://im.qq.com>（装到 `D:\qq`）
- NapCat（Framework 版）：<https://github.com/NapNeko/NapCatQQ/releases>

### 2. 配 NapCat

在 `napcat/framework/config/onebot11_<机器人QQ号>.json` 里加一个反向 WS 客户端：

```json
{
  "network": {
    "websocketClients": [
      {
        "name": "kaguya",
        "enable": true,
        "url": "ws://127.0.0.1:8643/ws",
        "messagePostFormat": "array",
        "token": "<你在 examples/kaguya-patch.yml 里设的 accessToken>",
        "reconnectInterval": 3000
      }
    ]
  }
}
```

### 3. 启动

**双击 `启动辉夜_管理员.cmd`**（它会自动请求管理员权限）。

⚠️ **管理员权限是硬要求**，原因见下面「踩过的坑」。

---

## ⚠️ 踩过的坑（血泪教训）

### NapCat 必须以管理员权限运行

普通权限下，Windows 拒绝把 hook 写进 QQ 进程。`napimain` 注入后会立刻退出，
退出时执行 `Hooks cleaned up` 把钩子卸掉，**QQ 跟着崩溃**。

日志里那句「按任意键关闭启动器（QQ 将继续运行）」是**误导** —— 它根本不会等按键。

用管理员权限就一切正常：QQ 稳定、WebUI 在线、零崩溃。

### 别用 OneKey 绿色版自带的 QQ

`NapCat.Shell.Windows.OneKey.zip` 里那个 9.9.33 是被改动过的精简版，
启动时报 `error code v2:-8`（QQ 自己的完整性校验失败），起不来。
**用官方安装的 QQ**。

### 辉夜会和桌面版 DSH 抢缓存

两个 DSH 实例默认共用 `%APPDATA%\@deepseek-ai\dsh-desktop`，
抢同一个 `GPUCache`，日志刷 `Unable to move the cache: 拒绝访问 (0x5)` 然后退出。

**解法**：给辉夜单独指定缓存目录（`ELECTRON_USER_DATA_DIR`）。

> 注意不能传 `--user-data-dir`，DSH 的 CLI 会拦这个参数并报 `bad option`。

---

## 人格怎么改

唯一来源是 [`persona/kaguya.md`](persona/kaguya.md)。改完跑一次：

```bash
node tools/sync-persona.mjs     # 或双击 tools\同步人格.cmd
```

它会重新把人格卡嵌进 agent preset，插件秒级热重载（不用重启宿主）。

### 人格卡的结构

文件分成两段：

```markdown
<!-- HANDWRITTEN: DO NOT MODIFY -->
（手写部分：核心定调、行为规则、设定、路由规则、语气参照、反例）
<!-- /HANDWRITTEN -->

<!-- AUTO: 由演化系统每周填充 -->
（辉夜自己从素材里学来的东西）
<!-- /AUTO -->
```

**手写段永远不被修改**，自动演化只写 AUTO 段。

---

## 人格自动演化（可选）

接入了 `dsh-persona-distill`，让她定期从真实素材里学东西：

- **每天**读素材 → 提炼候选
- **每周**把候选定型写入 AUTO 段
- 素材来源：刷B站挑出来的内容 + 评论区真人原句

关键保护：
- 定型前自动快照到 `persona/archive/`
- 除 AUTO 段外的一切逐字节比对，被改动就回滚

---

## 工具

| 工具 | 用途 |
|---|---|
| `tools/sync-persona.mjs` | 人格卡 → 运行配置 |
| `tools/chat-cli.mjs` | 群聊模拟器（不用 QQ 就能聊） |
| `tools/peek-session.mjs` | 看某个会话聊了什么 |
| `tools/bridge-selftest.mjs` | 检查素材桥接是否正常 |

---

## License

私人项目，未授权分发。
