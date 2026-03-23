# Clawpet Roadmap

> Source of truth for delivery sequencing after `docs/CLAWPET-PRD.md`.
> This roadmap is milestone-based, not calendar-based.

---

## 1. 产品目标回顾

Clawpet 的主线不是“做一个更可爱的桌宠”，而是把它逐步做成：

- **OpenClaw 的桌面化身**：让万能搭子真实住进桌面
- **Presence Layer**：让 agent 的工作可被一眼感知
- **Handoff Layer**：让关键时刻可被自然接住
- **Relationship Layer**：让用户愿意长期常驻，而不是偶尔打开看看

因此路线图的顺序应当是：

1. 先让它有资格长期挂在桌面上
2. 再让它像一个真正的桌面搭子
3. 最后让它变成可扩展的 companion system

---

## 2. 路线图总览

### P0：Desk-worthy Foundation
**关键词**：稳定、可信、低打扰、可常驻

目标：
让 Clawpet 从“很酷的原型”升级为“值得日常挂着的桌面入口”。

核心问题：
> 用户为什么要一直把它开着？

产出：
- 连接更稳
- 状态更准
- 审批更顺
- 完成 / 失败 / 等待有闭环
- 轻量操作入口可用
- 不会制造桌面噪音

### P1：Companion Credibility
**关键词**：在场、连贯、搭子感、工作节奏

目标：
让用户不只是看到一个有状态的小东西，而是开始真的把它当成桌面搭子。

核心问题：
> 它能不能从“可用工具”升级成“真实存在的工作陪伴体”？

产出：
- 生命周期仪式感
- 多 session / 多宠物态势图
- 工作日节奏陪伴
- 关系语气系统
- 更像工作卡片中心的面板

### P2：Extensible Companion System
**关键词**：可配置、可扩展、可生长

目标：
让 Clawpet 从一个固定实现，成长为一个可扩展的 companion system。

核心问题：
> 它能不能在不失焦的前提下，支持不同 companion 与更长期的生态能力？

产出：
- Companion schema 外置化
- Personality / behavior packs
- Role-aware / workspace-aware 反应
- 资源与主题体系

---

## 3. P0：Desk-worthy Foundation

### 3.1 目标结果

完成 P0 后，用户应该形成这些印象：

- 它能稳定连上 OpenClaw
- 它在桌面上不会添乱
- 它的提醒值得看
- 它不只是展示状态，而是真的能接住关键时刻
- 它值得长期开着

### 3.2 范围

#### P0-A：连接与恢复
- 自动连接 Gateway
- 断线重连
- 配置路径探测稳定化
- 原生接入失败时降级到 soul / file bridge
- 明确的连接状态反馈

#### P0-B：桌面壳与持久化
- 保存宠物数量与布局
- 保存皮肤 / 变体选择
- 保存点击穿透与暂停状态
- 保存面板偏好
- 启动时恢复上次桌面状态

#### P0-C：状态反馈细化 v1
至少支持：
- idle
- thinking
- executing
- approval-requested
- waiting / blocked
- done
- failed
- read / write / edit / exec 等活动差异

要求：
- 用户能分辨“在看 / 在改 / 在跑 / 在等 / 出问题了”

#### P0-D：关键交接闭环
- 审批浮窗升级
- 完成反馈
- 失败反馈
- 长等待提醒
- cancelled / interrupted feedback
- 从提醒进入上下文

#### P0-E：轻量操作入口
- 查看当前最重要状态
- 快速进入对应 session
- 快速发一句消息
- 中止当前 run
- 处理审批
- 查看最近结果 / 待接球动作

#### P0-F：抗打扰机制
- 提醒分级
- 重复提醒节流
- 长等待提醒升级策略
- 快速静音 / 暂停 / 点击穿透
- 保持“低打扰但有存在感”

### 3.3 明确不做
- 复杂宠物养成
- 多人格系统
- 资源市场
- 泛生产力插件扩展
- 跨平台优先

### 3.4 验收标准
- 用户可以把 Clawpet 挂一整天  
- 连接异常时不会无声失效  
- 审批和结果接球可以只靠 Clawpet 完成  
- 用户能通过行为区分至少 5 类关键状态  
- control UI 打开频次开始下降  

---

## 4. P1：Companion Credibility

### 4.1 目标结果

完成 P1 后，用户应该觉得：

- 它不是静态吉祥物，而是在“工作”
- 它的行为是连贯的，不是状态机硬切换
- 多 session 时，它能帮我建立空间感
- 它开始像一个真正的桌面搭子，而不是更可爱的状态灯

### 4.2 范围

#### P1-A：任务生命周期仪式感
- task received
- thinking
- executing
- waiting
- needs human
- done
- failed

目标：
让用户能感到“它经历了一个过程”。

#### P1-B：多 session / 多宠物映射
- 每只宠物代表一个 session / agent / 工作线程
- 区分主会话与后台会话
- 用存在感表达优先级与紧急度
- 从宠物快速进入对应 session

#### P1-C：工作日节奏陪伴
- 开工启动感
- 专注时的安静陪伴
- 阻塞时的轻量缓冲
- 完成后的收尾反馈
- 下班前的总结 / 收束感

#### P1-D：关系语气系统 v1
- 气泡语气规范
- 提醒强度对应的语言分层
- 2-3 种基础 companion 风格预设
- 避免幼稚、油腻、过度拟人

#### P1-E：面板 2.0
- 更像工作卡片中心
- 突出当前最重要任务
- 突出待审批 / 待接球动作
- 会话与消息保持轻量
- 降低后台管理器感

#### P1-F：状态语言统一规范
统一：
- 动作节奏
- 颜色 / 氛围
- 气泡语气
- 提醒强度

### 4.3 明确不做
- 泛情感陪聊
- 复杂长记忆人格
- 非 OpenClaw 的大规模任务接入
- 大量皮肤 / 主题商城化

### 4.4 验收标准
- 用户开始把它描述为“搭子”  
- 多 session 时，不看列表也能大概知道态势  
- 工作过程有更明显的节奏与仪式感  
- 开工 / 专注 / 等待 / 收尾体验更连续  

---

## 5. P2：Extensible Companion System

### 5.1 目标结果

完成 P2 后，Clawpet 应该具备：

- 可配置的 companion 定义
- 可扩展的人格和行为包
- 更清晰的 core / pack 边界
- 更长期的生态生长能力

### 5.2 范围

#### P2-A：Companion Schema 外置化
抽离：
- 资源定义
- 动作定义
- 文案与语气定义
- 状态映射规则
- 事件响应规则

#### P2-B：Personality / Behavior Packs
支持：
- 冷静型
- 乐观型
- 黏人但克制型
- 严肃型

要求：
- 只是风格差异，不改变产品主线

#### P2-C：Role-aware / Workspace-aware 反应
- 不同工作类型对应不同反馈模式
- 不同 workspace 可有不同 companion 气质
- skill / task 上下文影响行为表达

#### P2-D：资源与主题体系
- companion 资源包
- personality pack
- theme pack
- 与 workspace / skill 绑定的角色包

#### P2-E：更广泛人群验证
在不失焦的前提下，验证是否能从 OpenClaw power user 扩展到更广泛的高压知识工作者。

### 5.3 明确不做
- 无边界 pack 市场
- 与工作价值脱钩的娱乐生态
- 脱离 OpenClaw 的独立 companion app

### 5.4 验收标准
- 新 companion 行为可在不改核心逻辑的情况下扩展  
- 风格差异清晰，但主线不失焦  
- pack 体系不会把产品带回“桌宠皮肤市场”  

---

## 6. 推荐顺序

### 先做什么
1. 连接 / 状态 / 交接闭环  
2. 轻量操作入口与抗打扰机制  
3. 生命周期与多 session 态势能力  
4. 工作节奏中的陪伴层  
5. Companion schema 与 pack 能力  

### 为什么这么排
因为 Clawpet 的价值递进很明确：

- 没有稳定与可信，就不会常驻
- 没有常驻，就谈不上关系感
- 没有关系感，就不会成为真正的桌面搭子
- 没有清晰边界，就不适合做生态化扩展

---

## 7. 一句话总结

> **P0 先让它值得一直开着，P1 再让它像一个真正的桌面搭子，P2 最后让它变成可以长期生长的 companion system。**
