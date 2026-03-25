# ClawPet

**中文** | [English](README.md)

ClawPet 是一个面向 macOS 的像素桌宠桌面壳层，用来把 OpenClaw 的运行状态、待审批动作和轻量会话交互，直接搬到桌面上。

它不是一个“把控制台搬进 Electron”的壳，而是一个围绕桌面陪伴、状态感知、轻交接而设计的 Companion Shell：

- 在桌面边缘常驻像素猫，持续表达会话和任务状态
- 在面板里承接实时对话、图片发送、审批和切换会话
- 在审批浮窗里给出快速决策入口
- 在 Gateway 不可用时退回 soul bridge 文件模式，维持基础状态反馈

> 仓库公开 Markdown 策略：除 `README.md` 与 `README-zh.md` 外，不再保留其他 Markdown 文档。

## 当前定位

ClawPet 当前解决的是一个很具体的问题：

**让 OpenClaw 从“控制台里的 agent”变成“桌面上可感知、可接手、可快速回应的工作搭子”。**

对应的产品目标不是做成一个重型 IDE 面板，而是完成这三层能力：

- **桌面陪伴**：桌宠持续在桌面上表达运行中的工作状态
- **状态可视化**：任务、审批、等待、失败、完成都能被及时看见
- **轻交互承接**：不必回控制台，也能切会话、发消息、批审批、停任务

## 现在能做什么

### 桌宠层

- 透明、无边框、常驻桌面的 Electron 窗口
- 支持多宠物并存与自动排布
- 支持拖拽、点击互动、双击打开面板
- 内置 6 种像素猫变体：蜜桃猫、薄荷猫、夜空猫、奶油猫、樱花猫、可可猫
- 支持点击穿透、暂停动作、静音桌面直说

### 状态表达层

- 基于任务生命周期表达状态：`task-received` / `thinking` / `executing` / `waiting` / `needs-human` / `done` / `failed`
- 将 OpenClaw 的 `read / write / edit / exec / tool / job` 等活动映射为桌宠反馈
- 宠物可绑定会话并带有优先级信息
- 桌面直说卡片用于承接短而重要的反馈：审批、完成、失败、等待、进度、摘要
- 通过节流与静音机制，避免提醒刷屏

### 面板层

当前面板已经是一个明确的工作交接界面，而不是统计面板。它包含：

- **当前最重要任务**：聚焦正在运行的会话动作
- **待我接球**：聚焦待审批和需要人工接手的事项
- **实时对话**：查看 transcript、发送消息、停止当前 run
- **切换会话**：在多个 OpenClaw 会话之间快速切换
- **像素衣橱**：统一管理宠物换肤

实时对话区目前支持：

- 发送文本消息
- 发送图片附件
- 通过文件选择器添加图片
- 直接粘贴图片到输入框
- 展示对话中的图片预览
- 复制 transcript 文本
- 右键菜单复制 / 粘贴
- 发送后清空输入框与附件草稿

### 审批层

- 有待审批动作时弹出独立审批浮窗
- 对命令做基础风险分级
- 支持拒绝、允许一次、总是允许
- 可以快速回到主面板继续查看上下文

### OpenClaw 集成层

- 自动探测 `~/.openclaw/openclaw.json`
- 连接本地 Gateway WebSocket
- 同步会话、presence、节点、审批、活跃 run、transcript
- 发送消息到当前会话
- 支持图片附件发送
- 支持中止当前 run
- 记录并展示 Gateway 错误信息

### 降级与本地能力

- Gateway 不可用时，可通过 soul bridge 文件模式继续接收基础状态
- 持久化应用设置：`clickThrough`、`paused`、`soulMode`、`muted`、`lastActiveSessionKey`
- 持久化宠物阵列与位置
- 保存 OpenClaw 设备身份与本地运行数据

## 最新架构

ClawPet 现在的架构已经比较清晰，核心原则是：

**主进程负责桌面壳层与系统能力，Gateway Client 负责状态源接入，Renderer 负责表达和交互，Shared 层负责统一协议。**

### 架构分层

```text
src/
├── main/
│   ├── index.ts              # 应用入口、窗口管理、Tray、IPC、系统集成
│   ├── openclaw-client.ts    # Gateway WebSocket 客户端与状态归一化
│   ├── pet-manager.ts        # 多宠物窗口、布局、会话映射、优先级广播
│   ├── app-config.ts         # 环境变量与运行配置解析
│   ├── app-persistence.ts    # 应用设置持久化
│   ├── pet-lineup-store.ts   # 宠物阵列持久化
│   └── soul-bridge.ts        # 文件桥接降级模式
├── preload/
│   └── index.ts              # 安全 IPC Bridge
├── renderer/
│   ├── index.html
│   └── src/
│       ├── pet-app.ts        # 桌宠窗口
│       ├── panel-app.ts      # 对话面板
│       ├── approval-app.ts   # 审批浮窗
│       ├── pet-engine.ts     # 像素渲染与动画
│       └── styles.css        # 统一视觉样式
└── shared/
    └── ipc.ts                # 跨进程共享类型与 IPC 协议
```

### 主进程职责

`src/main/index.ts` 是桌面壳层中枢，负责：

- 创建桌宠窗口、面板窗口、审批窗口
- 管理托盘菜单与系统行为
- 管理右键菜单、剪贴板、文件选择器
- 聚合 Gateway snapshot，并广播给 renderer
- 分发桌面直说消息
- 维护节流、错误兜底和窗口诊断

### Gateway Client 职责

`src/main/openclaw-client.ts` 负责把 Gateway 的原始协议转成 ClawPet 内部稳定状态：

- 维护连接状态与重连逻辑
- 处理 `chat`、`agent`、`approval` 等事件
- 归一化 transcript、recent messages、active run
- 发消息、发附件、停止任务、切会话、处理审批
- 把 Gateway 错误包装为可读错误信息

### 表达层职责

- `pet-app.ts`：负责桌宠本体、桌面直说卡片和基础交互
- `panel-app.ts`：负责任务卡片、待接球区、实时对话、图片与复制交互
- `approval-app.ts`：负责独立审批流
- `pet-manager.ts`：负责多宠物布局、窗口同步和会话映射

### 协议层职责

`src/shared/ipc.ts` 是整个项目的协议中心，统一定义：

- `AppSettings`
- `OpenClawSnapshot`
- `GatewaySendMessagePayload`
- `GatewayTranscriptEntry`
- `GatewayApprovalSummary`
- `PetSessionBinding`
- `PetPriorityInfo`
- 桌面直说与 IPC channel

## 设计取向

ClawPet 当前设计不是“信息越多越好”，而是遵循下面几个原则：

### 1. Companion First

桌宠先是陪伴与感知层，再是操作入口。它应该像工作搭子，而不是浮在桌面的状态灯。

### 2. 重要信息就地浮现

短而关键的内容优先出现在桌宠卡片、审批浮窗或面板顶部，而不是要求用户回到控制台翻日志。

### 3. 轻操作留在桌面

切会话、回一句话、发图、批审批、停任务，这些高频轻操作应该尽量在桌面上闭环。

### 4. 全部表达共用一份状态源

桌宠、面板、审批浮窗都基于同一个 `OpenClawSnapshot` 和统一状态语言，避免一处更新、一处过时。

## 本地运行

### 环境要求

- macOS
- Node.js + npm
- 如需体验完整能力，需要本地 OpenClaw Gateway 可用

### 开发启动

```bash
npm install
npm run dev
```

### 类型检查

```bash
npm run check
```

### 构建

```bash
npm run build
npm run preview
```

## 本地数据与配置

ClawPet 默认使用 Electron `userData` 目录保存本地状态。macOS 下通常位于：

```bash
~/Library/Application Support/ClawPet/
```

典型内容包括：

```text
app-state.json       # 应用设置
pet-lineup.json      # 宠物阵列和位置
openclaw/device.json # Gateway 设备身份
```

### 常用环境变量

- `CLAWPET_ENABLE_GATEWAY`
- `CLAWPET_ENABLE_PETS`
- `CLAWPET_ENABLE_SOUL_BRIDGE`
- `CLAWPET_STARTUP_LOG`
- `CLAWPET_MAX_PETS`
- `CLAWPET_DEFAULT_PETS`
- `CLAWPET_DATA_DIR`
- `CLAWPET_LINEUP_FILE`
- `CLAWPET_SOUL_STATE_FILE`

## 当前计划与完成情况

这部分可以直接作为对外汇报口径使用。

### 当前阶段判断

**ClawPet 已经完成了“Companion Shell Baseline”的主体能力，正在从“功能补齐”转入“稳定性收口 + 开源整理 + 可交付化”。**

### 已完成

- **桌面壳层**：Electron 多窗口结构、Tray、窗口管理、错误兜底已经稳定
- **状态接入**：OpenClaw Gateway 连接、重连、snapshot 聚合、soul bridge 降级已完成
- **桌宠表达**：多宠物、会话映射、生命周期表达、优先级表达、桌面直说已完成
- **审批闭环**：审批浮窗、风险提示、快速决策已完成
- **面板闭环**：当前任务、待接球、实时对话、切会话、像素衣橱已完成
- **实时对话 v1**：文本发送、停止 run、图片附件、图片粘贴、图片预览、文本复制、右键复制粘贴已完成
- **持久化 v2**：设置持久化与最近活跃会话恢复已完成
- **仓库整理**：公开文档收敛为双 README 方案，其他 Markdown 不再作为仓库对外文档面出现

### 当前进行中

- **交互稳定性收口**：继续收口实时对话与面板的边缘交互问题
- **开源仓库整理**：README、目录边界、公开信息表达正在统一
- **交付准备**：为后续更顺手地给别人使用做结构和文案收敛

### 下一步计划

1. **稳定性继续收口**：把实时对话、审批、桌面直说的边缘问题继续磨平
2. **可交付化**：补齐打包与更明确的使用入口，降低别人接手门槛
3. **配置外置化**：逐步把宠物定义、文案、行为参数从硬编码走向可配置
4. **行为扩展**：在现有 Companion Shell 稳定后，再考虑更丰富的宠物行为与交互

### 一句话汇报版本

> ClawPet 目前已经不是一个“会动的状态灯”，而是一个可常驻桌面的 OpenClaw Companion Shell：能看状态、接审批、发消息、发图片、切会话，主体闭环已形成，当前重点转向稳定性收口、开源整理和可交付化。

## License

ClawPet 使用 `AGPL-3.0-only` 许可证，具体条款见 `LICENSE`。
