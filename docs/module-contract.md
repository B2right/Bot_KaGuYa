# 模块调用契约 v1

> 本文件是**主体与模块之间唯一的约定**。契约一旦变动，必须同步改这里。
> 最后更新：阶段1

## 一句话

主体不关心模块内部是什么语言、什么框架。主体只做四件事：**读注册表 → 起子进程 → 喂 JSON → 读 JSON**。

## 1. 注册表

位置：`config/modules.json`

加模块只改这里，主体代码不动。

```json
{
  "version": 1,
  "modules": {
    "<模块名>": {
      "enabled": true,
      "description": "给模型看的一句话说明",
      "type": "command",
      "command": "python",
      "args": ["main.py"],
      "cwd": "modules/<模块名>",
      "timeoutMs": 15000,
      "actions": {
        "<动作名>": "给模型看的一句话说明"
      }
    }
  }
}
```

字段说明：

| 字段 | 必填 | 说明 |
|---|---|---|
| `enabled` | 否 | 默认 `true`。`false` 时主体拒绝调用，模型看不到该模块 |
| `description` | 是 | 一句话，会拼进工具说明给模型看 |
| `type` | 是 | 目前只有 `command` |
| `command` | 是 | 可执行文件；`python` / `node` / 绝对路径都行 |
| `args` | 否 | 固定参数，不含动作名 |
| `cwd` | 否 | 相对项目根；模块自己解析相对路径的基准 |
| `timeoutMs` | 否 | 默认 15000。超时即判失败 |
| `actions` | 是 | 动作名 → 说明。模型只能调这里列出的动作 |

## 2. 调用

主体向子进程 **stdin 写一行 JSON**，然后等子进程退出，**读 stdout 的 JSON**。

请求：

```json
{
  "module": "gallery",
  "action": "random",
  "args": { "mood": "困" },
  "requestId": "req_1750000000000_ab12",
  "context": {
    "chatType": "group",
    "chatId": "123456",
    "userId": "10001",
    "nickname": "群友",
    "text": "来张辉夜图"
  }
}
```

- `args` 由模型按 `actions` 说明填，主体不校验内容，只透传。
- `context` 是只读上下文，模块可用可不用。

## 3. 返回

子进程 **stdout 必须是且只有一个 JSON 对象**。日志、调试信息一律走 **stderr**。

```json
{
  "success": true,
  "summary": "从图库里翻出一张辉夜窝在被炉里的图。",
  "artifacts": [
    { "type": "image", "path": "modules/gallery/images/keitaro_01.png" }
  ],
  "error": null
}
```

| 字段 | 说明 |
|---|---|
| `success` | 布尔。模块自己判断这次调用成没成 |
| `summary` | **主体组织播报的唯一依据。** 一句人话，会被辉夜人格卡改写后发出去。禁止写技术细节（路径、异常名、耗时） |
| `artifacts` | 数组，可为空。主体按 `type` 决定怎么处理 |
| `error` | 失败时填一句人话；成功时 `null` |

`artifacts[].type` 取值：

| type | 附加字段 | 主体行为 |
|---|---|---|
| `text` | `text` | 直接并入播报文本 |
| `image` | `path` 或 `url` | 调 `qq_send_image` 发图 |
| `file` | `path` 或 `url` | 调 `qq_send_file` 发文件 |
| `link` | `url`、可选 `title` | 把链接拼进播报文本 |

## 4. 失败与隔离

主体负责一切失败兜底，模块只管尽力而为：

| 情况 | 主体行为 |
|---|---|
| 模块超时（超过 `timeoutMs`） | 杀子进程，标记失败 |
| 子进程非零退出 | 标记失败 |
| stdout 不是合法 JSON | 标记失败 |
| `success: false` | 按失败处理 |
| `enabled: false` / 模块不存在 | 拒绝调用 |

**任何失败都只让模型收到一句人话**，形如「图库那边没反应」。模型据此用辉夜口吻随口吐槽一句，然后继续聊天。

失败信息里**不得出现**：模块名以外的技术名词、路径、异常栈、超时毫秒数、状态码。

## 5. 模块开发者须知（给以后的自己和模块作者）

- 一个模块 = 一个目录，放在 `modules/<模块名>/`，自带自己的依赖和入口。
- 模块**不依赖主体**：单独在命令行跑起来也必须能工作。
- 模块**不发言**：只返回 `summary`，怎么说是主体和人格卡的事。
- 模块**不写共享状态**：不要改别的模块或主体的文件。
- 需要长驻的模块（比如避弹程序）不走这套契约，另注册启动型工具。
