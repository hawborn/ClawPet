# Clawpet Implementation Backlog

> This document turns the PRD and roadmap into executable work items.
> Use it as the seed list for GitHub issues / milestones.

## 1. 使用方式

建议给 issue 打上三类标签：

### 优先级
- `P0`
- `P1`
- `P2`

### 类型
- `infra`
- `ui`
- `state`
- `integration`
- `ux`
- `docs`

### 状态
- `now`
- `next`
- `later`

---

## 2. Epic 列表

### EPIC-0：Prototype Hardening
目标：让 Clawpet 变成一个可以长期常驻的产品原型，而不是一次性演示。

### EPIC-1：Presence Upgrade
目标：让用户开始真正依赖它理解 agent 工作流。

### EPIC-2：Extensible Companion System
目标：让 companion 行为和人格具备长期可扩展性。

---

## 3. Now（建议先开）

## CP-001 连接状态机梳理
**Epic**：EPIC-0  
**Priority**：P0  
**Type**：integration / infra

### 目标
统一 OpenClaw Gateway 连接、断线重连、失败回退和 UI 状态表达。

### 为什么先做
如果连接状态不可信，后面的行为反馈都会变成噪音。

### 交付内容
- 明确连接状态枚举
- 区分：connecting / connected / degraded / disconnected / error
- 原生接入失败时回退到 soul/file bridge
- 把状态同步给托盘、宠物、面板

### 验收标准
- 用户可以明确知道当前是否连上 Gateway
- 断线后有可恢复路径
- 降级后不会“看起来正常，其实失效”

---

## CP-002 本地持久化模型
**Epic**：EPIC-0  
**Priority**：P0  
**Type**：state / infra

### 目标
设计并实现统一的本地持久化数据结构。

### 交付内容
- companion lineup 持久化
- 皮肤 / 变体偏好
- 点击穿透状态
- 暂停状态
- 面板最近视图 / 当前会话偏好（如适用）

### 验收标准
- 重启后桌宠数量和外观基本恢复
- 用户不会每次重新配置一遍
- schema 可扩展，不是零散 JSON 拼接

---

## CP-003 审批浮窗 v2
**Epic**：EPIC-0  
**Priority**：P0  
**Type**：ux / ui / integration

### 目标
把审批浮窗从“有入口”提升到“默认就想用它处理”。

### 交付内容
- 展示命令摘要
- 展示来源 session
- allow once / always / deny 三个主动作
- 提供“打开面板查看更多”次动作
- 明确高风险动作的视觉等级

### 验收标准
- 常见审批可以不离开桌面完成
- 用户看得懂自己在批准什么
- 不会因为信息太少而不敢点

---

## CP-004 任务闭环反馈
**Epic**：EPIC-0  
**Priority**：P0  
**Type**：ux / state

### 目标
让任务完成、失败、等待形成明确闭环。

### 交付内容
- done feedback
- failed feedback
- long-waiting feedback
- cancelled/interrupted feedback

### 验收标准
- 任务不会“静默结束”
- 不同结果的反馈强度不同
- 不会制造过量打扰

---

## CP-005 细粒度活动分类 v1
**Epic**：EPIC-0  
**Priority**：P0  
**Type**：state / integration

### 目标
把 agent activity 从粗粒度状态提升为可感知的工作类型。

### 第一版建议分类
- read
- write
- edit
- exec
- approval-requested
- waiting
- done
- failed

### 交付内容
- activity taxonomy
- 映射规则
- 基础 UI/动画差异

### 验收标准
- 用户能大致分辨“在看 / 在改 / 在跑 / 在等 / 出错”
- taxonomy 不和未来扩展冲突

---

## 4. Next（M0 后立刻接）

## CP-006 生命周期仪式感设计
**Epic**：EPIC-1  
**Priority**：P1  
**Type**：ux / ui / state

### 目标
让任务流转从状态跳变，升级为有节奏的工作过程。

### 交付内容
为这些阶段定义统一反馈：
- task-received
- thinking
- executing
- waiting
- done
- failed

### 验收标准
- 每个阶段视觉/行为语言清楚
- 过渡自然，不是硬切
- 用户能感到“它在经历一个过程”

---

## CP-007 多 session / 多宠物映射
**Epic**：EPIC-1  
**Priority**：P1  
**Type**：integration / ui / state

### 目标
把多宠物从装饰性功能升级为多任务可视化能力。

### 交付内容
- 定义 pet <-> session 的映射策略
- 区分主会话与后台会话
- 支持从宠物进入对应 session
- 处理宠物数量、排序、优先级表达

### 验收标准
- 多会话时，用户能不用列表就判断大概态势
- 不会因为宠物太多导致信息爆炸

---

## CP-008 面板信息架构重构
**Epic**：EPIC-1  
**Priority**：P1  
**Type**：ux / ui

### 目标
让控制面板更像交接界面，而不是后台控制台。

### 交付内容
- 突出“当前最重要任务”
- 突出待审批 / 待接球动作
- 会话与消息保持轻量
- 降低管理台感

### 验收标准
- 面板更像工作卡片中心
- 用户进入面板后能迅速理解“现在最重要的是什么”

---

## CP-009 状态语言统一规范
**Epic**：EPIC-1  
**Priority**：P1  
**Type**：ux / docs / state

### 目标
统一动作、颜色、气泡语气、提醒强度之间的关系。

### 交付内容
- 状态语义表
- 动效/颜色/语气映射规范
- 提醒等级规范

### 验收标准
- 不同状态反馈具有一致设计语言
- 后续新增状态不会随意生长

---

## 5. Later（M1 之后）

## CP-010 Companion Schema 外置化
**Epic**：EPIC-2  
**Priority**：P2  
**Type**：infra / state

### 目标
把 companion 的静态定义和行为规则从硬编码中抽出来。

### 交付内容
- companion schema
- 状态映射字段
- 文案与行为配置字段
- 默认 companion pack

### 验收标准
- 新增 companion 不必大改核心代码
- schema 对未来人格系统友好

---

## CP-011 人格 / 行为包系统
**Epic**：EPIC-2  
**Priority**：P2  
**Type**：ux / state / infra

### 目标
支持不同风格 companion 拥有系统级差异，而非只换皮。

### 交付内容
- 人格参数模型
- 语气差异
- 节奏差异
- 状态反应差异

### 验收标准
- 不同人格的差异可被用户明显感知
- 不破坏核心状态与交接语义

---

## CP-012 Pack Boundary 设计
**Epic**：EPIC-2  
**Priority**：P2  
**Type**：infra / docs

### 目标
定义哪些可配置、哪些不可配置，避免未来扩展混乱。

### 交付内容
- core / pack boundary 文档
- pack 可重写能力定义
- 核心保留字段定义

### 验收标准
- 扩展时不容易破坏状态表达一致性
- companion pack 能力边界清晰

---

## 6. 我建议再补的 3 个文档型 issue

## CP-013 状态事件词典
**Epic**：EPIC-0  
**Priority**：P0  
**Type**：docs / state

### 目标
整理一份统一 event taxonomy，供产品、设计、实现共用。

### 输出建议
`docs/STATE-TAXONOMY.md`

---

## CP-014 面板线框稿 / 信息层级草稿
**Epic**：EPIC-1  
**Priority**：P1  
**Type**：docs / ui

### 目标
先把面板信息层级说清楚，再动手改 UI。

### 输出建议
`docs/PANEL-IA.md`

---

## CP-015 Companion Schema 草案
**Epic**：EPIC-2  
**Priority**：P2  
**Type**：docs / infra

### 目标
在真正抽离 schema 前，先把字段设计写清楚。

### 输出建议
`docs/COMPANION-SCHEMA.md`

---

## 7. 建议的 issue 创建顺序

### 第一批（立刻开）
1. CP-001 连接状态机梳理
2. CP-002 本地持久化模型
3. CP-003 审批浮窗 v2
4. CP-004 任务闭环反馈
5. CP-005 细粒度活动分类 v1

### 第二批（第一批基本完成后）
6. CP-013 状态事件词典
7. CP-006 生命周期仪式感设计
8. CP-007 多 session / 多宠物映射
9. CP-008 面板信息架构重构
10. CP-009 状态语言统一规范
11. CP-014 面板线框稿 / 信息层级草稿

### 第三批（进入长期建设）
12. CP-015 Companion Schema 草案
13. CP-010 Companion Schema 外置化
14. CP-011 人格 / 行为包系统
15. CP-012 Pack Boundary 设计

---

## 8. 哪些最值得你现在亲自判断

如果只能由你拍板，我建议优先明确这 4 个问题：

1. **多宠物到底是装饰，还是 session 的实体化？**
2. **审批浮窗是偏“安全工具”，还是偏“自然交接体验”？**
3. **面板的定位是轻控制台，还是交接中心？**
4. **未来 companion 的个性差异，要不要上升到系统级能力？**

这 4 个答案会决定后面大量实现细节。

---

## 9. 配套文档

- 产品定义：`docs/CLAWPET-PRD.md`
- 阶段路线：`docs/ROADMAP.md`
