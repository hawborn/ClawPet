# ClawPet

**中文** | [English](README.md)

一个面向 macOS 的像素桌宠原型，也是 OpenClaw 的轻量桌面交互层。

ClawPet 会在桌面边缘显示一只或多只透明像素猫，用来做三件事：

- 作为轻量的桌面陪伴
- 可视化 OpenClaw 的运行状态
- 承接会话切换、消息发送和审批操作

> 想直接看“现在怎么用”，请先读 [PLAYBOOK.md](PLAYBOOK.md)。

## 当前形态

- **平台**：macOS
- **技术栈**：Electron + Vite + TypeScript
- **渲染方式**：原生 Canvas
- **集成方式**：优先连接 OpenClaw Gateway，失败时可降级到 soul bridge 文件模式
- **项目阶段**：桌宠原型，重点在“陪伴感 + 状态感知 + 轻交互”

## 核心能力

### 桌宠本体

- 每只宠物对应一个独立的透明、无边框、常驻桌面的 Electron 窗口
- 支持多宠物同时出现，并以独立窗口形式活动
- 基于像素动画驱动的宠物状态机
- 点击宠物可触发打招呼动作和互动气泡
- 内置 3 种配色变体

**P1 新增**：
- 每只宠物显示对应的会话信息和优先级标记
- 任务生命周期阶段过渡动画（task-received / thinking / executing / waiting / done / failed）
- 7 种情感状态映射（excited / focused / concerned / completed / failed 等）
- 宠物行为与任务阶段同步

### 桌面交互

- 菜单栏托盘支持添加宠物、移除最后一只、暂停、点击穿透、显示窗口、退出
- 双击宠物可打开 OpenClaw 控制面板
- 有待审批请求时可弹出独立审批浮窗
- 支持完成、失败、长时间等待等提醒反馈

**P1 新增**：
- 点击宠物可快速切换到对应的工作会话
- 宠物优先级变化时自动调整显示顺序

### OpenClaw

- 自动探测 `~/.openclaw/openclaw.json`
- 直接连接本地 Gateway WebSocket
- 读取会话列表、最近对话、presence、节点、待审批请求和运行活动
- 发送消息到当前 session
- 中止当前 run
- 处理 `exec.approval.requested`
- 将 `read / write / edit / exec / tool / job` 等活动映射到桌宠视觉反馈

## 内置宠物

- 蜜桃猫
- 薄荷猫
- 夜空猫

## 快速开始

### 环境要求

- macOS
- Node.js + npm
- 如果要体验状态同步和审批交互，需要本地可用的 OpenClaw / QClaw 环境

### 开发运行

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

构建输出目录：

- `out/main`
- `out/preload`
- `out/renderer`

## 工作方式

ClawPet 本质上是一个 Electron 桌面应用，负责把 OpenClaw 的运行状态翻译成桌宠行为和桌面交互。

### 架构分层

- `src/main`：Electron 主进程，负责窗口、托盘、IPC、持久化和 Gateway 连接
- `src/preload`：安全桥接层
- `src/renderer`：Canvas 桌宠渲染、面板 UI、审批浮窗
- `src/shared`：主进程与渲染进程共享类型

### 状态流转

1. ClawPet 启动
2. 探测 OpenClaw / QClaw 配置文件
3. 尝试连接本地 Gateway
4. 接收会话、活动、审批等状态更新
5. 将状态映射为宠物行为、面板内容和审批浮窗
6. 用户交互后再把指令回传给 Gateway

### 连接状态

ClawPet 目前支持以下连接状态：

- `unconfigured`：未发现 OpenClaw 配置
- `connecting`：正在连接
- `connected`：已连接
- `degraded`：降级模式（使用 soul bridge）
- `disconnected`：已断开
- `error`：连接异常

## 灵魂模式与文件桥接

如果 Gateway 暂时不可用，ClawPet 仍然可以退回到文件桥接模式，通过 `soul-state.json` 接收状态更新。

支持的状态语义：

- `idle`
- `thinking`
- `coding`
- `running`
- `waiting`
- `error`

### 状态同步脚本

仓库提供了一个辅助脚本：

```bash
python3 scripts/set_state.py coding "正在实现登录页重构"
python3 scripts/set_state.py thinking "在分析数据流"
python3 scripts/set_state.py running "正在跑测试"
python3 scripts/set_state.py idle "待命中"
```

它会把状态写入 OpenClaw / QClaw workspace 对应的 `clawpet/soul-state.json`。

如果你想自定义状态文件位置，可以设置环境变量：

```bash
export CLAWPET_SOUL_STATE_FILE=/your/path/soul-state.json
```

## 交互说明

- **单击宠物**：触发打招呼动作和气泡
- **双击宠物**：打开 OpenClaw 面板
- **审批到来时**：自动弹出独立审批浮窗
- **菜单栏托盘**：主控制入口
- **灵魂模式**：优先根据 OpenClaw / QClaw 状态切换行为和氛围
- **点击穿透**：窗口不拦截鼠标，适合只做陪伴显示
- **暂停动作**：适合开会、录屏、演示等场景

## 本地数据

ClawPet 会把本地状态保存在 Electron 的 `userData` 目录中。macOS 下通常位于：

```bash
~/Library/Application Support/ClawPet/
```

典型文件结构如下：

```bash
~/Library/Application Support/ClawPet/
├── pet-lineup.json         # 宠物布局、皮肤、位置
├── app-state.json          # 应用设置（点击穿透、暂停、灵魂模式）
└── openclaw/
    └── device.json         # 设备身份认证（自动生成）
```

如有需要，也可以通过环境变量覆盖默认目录：

- `CLAWPET_DATA_DIR`
- `CLAWPET_LINEUP_FILE`

## 当前版本

**P1 Companion Credibility ✅ 已完成（2026-03-23）**

ClawPet 现在已成为真正的"桌面搭子"，不仅是状态灯。

### P1 核心升级

| 功能 | 状态 | 说明 |
|------|------|------|
| **CP-006 生命周期仪式感** | ✅ 完成 | 7 个生命周期阶段 + 过渡动画 + 情感映射 |
| **CP-007 多会话宠物映射** | ✅ 完成 | 宠物代表会话 + 优先级表达 + 空间感 |
| **CP-008 面板架构重构** | ✅ 完成 | 工作卡片中心 + 信息优先级清晰 |
| **CP-009 统一状态语言** | ✅ 完成 | 6 个情感状态 + 颜色系统规范 + 动作映射 |

### 新增能力

- **任务有节奏**：从接收 → 思考 → 执行 → 完成的连贯过程，而不是硬切状态
- **多会话空间感**：不同宠物代表不同会话，优先级明确，一眼看出哪个最活跃
- **面板交接中心**：进入面板立即看到最重要的任务和待决策事项，而不是统计数据
- **统一设计语言**：颜色、动作、文案、提醒形成一致的故事，新增功能有规范可参考

### P0 产品底盘

| 功能 | 状态 | 说明 |
|------|------|------|
| P0-1 稳定连接与恢复 | ✅ 完成 | 6 层连接状态机 + 自动重连 + 降级支持 |
| P0-2 本地持久化 | ✅ 完成 | `clickThrough` / `paused` / `soulMode` 持久化 |
| P0-3 细粒度状态反馈 | ✅ 完成 | 8 种活动类型映射 + 宠物行为优化 |
| P0-4 审批浮窗增强 | ✅ 完成 | 风险等级 + 命令摘要 + 上下文展示 |
| P0-5 完成/失败反馈 | ✅ 完成 | 完成 / 失败 / 长时间等待三类反馈 |

## 下一阶段（P2）

如果继续往前做，比较值得优先推进的方向有：

1. **CP-010 Companion Schema 外置化**：把宠物定义、动作、文案抽离为可配置资源
2. **CP-011 人格/行为包系统**：支持不同风格宠物的差异化行为和语气
3. **音效系统**：为每个情感状态配置音效反馈
4. **更丰富的行为**：追随光标、定时提醒、番茄钟等互动模式
5. **拖拽与物理**：拖拽宠物、回弹、靠边停靠等视觉交互
6. **打包分发**：生成可安装的 `.dmg`，降低使用门槛

## 相关文档

📚 **完整文档导航** → [docs/INDEX.md](docs/INDEX.md)

### 快速开始
- [PLAYBOOK.md](PLAYBOOK.md)：当前版本推荐玩法

### P1 功能文档
- [docs/P1-COMPLETION-SUMMARY.md](docs/P1-COMPLETION-SUMMARY.md)：P1 全体完成总结
- [docs/CP-006-LIFECYCLE-CEREMONY-COMPLETE.md](docs/CP-006-LIFECYCLE-CEREMONY-COMPLETE.md)：生命周期仪式感设计
- [docs/CP-007-MULTI-SESSION-MAPPING.md](docs/CP-007-MULTI-SESSION-MAPPING.md)：多会话宠物映射
- [docs/CP-008-PANEL-IA-COMPLETE.md](docs/CP-008-PANEL-IA-COMPLETE.md)：面板信息架构
- [docs/CP-009-STATE-LANGUAGE-SPEC.md](docs/CP-009-STATE-LANGUAGE-SPEC.md)：统一状态语言规范
- [docs/PROJECT-STATUS.md](docs/PROJECT-STATUS.md)：项目状态报告

### 规划文档
- [docs/ROADMAP.md](docs/ROADMAP.md)：产品规划与路线图
- [docs/CLAWPET-PRD.md](docs/CLAWPET-PRD.md)：产品需求文档
- [docs/IMPLEMENTATION-BACKLOG.md](docs/IMPLEMENTATION-BACKLOG.md)：实现待办清单

### 社区
- [CONTRIBUTING.md](CONTRIBUTING.md)：贡献指南
- [CHANGELOG.md](CHANGELOG.md)：版本记录
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)：社区行为准则

## 许可证

![AGPL v3](https://img.shields.io/badge/license-AGPL%20v3-blue.svg)

ClawPet 使用 **AGPL-3.0-only** 许可证。

这意味着你可以在 AGPL 条款下学习、修改和分发代码；如果你分发修改版本，或通过网络向他人提供修改后的服务，需要同时提供对应源代码。

具体条款请以 [LICENSE](LICENSE) 为准。
