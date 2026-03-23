# Clawpet P1 实现启动总结

**启动时间**：2026-03-23  
**P1 阶段**：Companion Credibility  
**核心主题**：让用户把 Clawpet 当成真正的桌面搭子，而不仅仅是状态灯

---

## 🎯 P1 的核心目标

完成 P1 后，用户应该觉得：
- ✨ 它不是静态吉祥物，而是在"工作"
- 🔄 它的行为是连贯的，不是状态机硬切换
- 🗺️ 多 session 时，它能帮我建立空间感
- 🤝 它像一个真正的桌面搭子，而不是更可爱的状态灯

---

## 📋 P1 的 6 个主要功能块

### 1. ✅ **CP-006: 生命周期仪式感设计** (已启动)

**目标**：让任务从"状态跳变"变成"有节奏的工作过程"

**本次实现内容**：
- ✅ 添加 `TaskLifecyclePhase` 类型定义
  - `task-received` - 刚收到任务
  - `thinking` - 正在思考/分析
  - `executing` - 正在执行
  - `waiting` - 等待响应/审批
  - `needs-human` - 需要人工介入
  - `done` - 完成成功
  - `failed` - 执行失败

- ✅ 添加任务生命周期标签和视觉状态映射
  - `TASK_LIFECYCLE_LABELS` - 每个阶段的标签
  - `TASK_LIFECYCLE_EMOTION` - 对应的视觉情感状态

- ✅ 添加 IPC 命令支持
  - `task-lifecycle` - 任务阶段更新
  - `ceremony-transition` - 生命周期过渡动画

- ✅ 实现主进程的生命周期追踪逻辑
  - `taskLifecycleTracker` - 追踪每个任务的生命周期
  - `updateTaskLifecyclePhase()` - 更新任务阶段
  - `inferTaskLifecyclePhase()` - 从快照推断生命周期阶段

**技术亮点**：
- 从 OpenClaw 的 `activityKind` 智能推断任务阶段
- 支持从不同 Gateway 活动类型过渡到统一的生命周期表达
- 每个阶段过渡都会触发 UI 动画（600ms 过渡时间）

---

### 2. ⏳ **CP-007: 多 session / 多宠物映射**

**目标**：让多个宠物代表不同的工作线程，建立空间感

**计划内容**：
- 定义 pet ↔ session 映射策略
- 区分主会话与后台会话
- 支持从宠物直接进入对应会话
- 处理宠物数量、排序、优先级表达

---

### 3. ⏳ **CP-008: 面板信息架构重构**

**目标**：让面板更像交接界面而不是控制台

**计划内容**：
- 突出"当前最重要任务"
- 突出待审批/待接球动作
- 降低"管理后台"感
- 增强"工作卡片中心"感

---

### 4. ⏳ **CP-009: 状态语言统一规范**

**目标**：统一整个系统的设计语言

**计划内容**：
- 动作 / 颜色 / 气泡语气 / 提醒强度的映射关系
- 保证一致性
- 防止后续新增状态随意生长

---

## 💾 文件变更统计

### 新增代码
- `src/shared/ipc.ts`：+80 行
  - `TaskLifecyclePhase` 类型定义
  - `TASK_LIFECYCLE_LABELS` 标签映射
  - `TASK_LIFECYCLE_EMOTION` 视觉状态映射
  - IPC 命令类型扩展

- `src/main/index.ts`：+100 行
  - 生命周期追踪数据结构
  - `updateTaskLifecyclePhase()` 函数
  - `inferTaskLifecyclePhase()` 推断函数
  - 集成到 `detectRunStateChanges()` 流程

### 代码质量
- ✅ TypeScript 编译无错误
- ✅ 类型检查通过
- ✅ 生产构建成功
- ✅ 增量构建：108.79 KB

---

## 🏗️ P1 架构变化

### 状态流转图

```
Gateway Snapshot (activeRun + approvals)
        ↓
inferTaskLifecyclePhase()  [智能推断]
        ↓
detectRunStateChanges()    [状态检测]
        ↓
updateTaskLifecyclePhase() [更新追踪]
        ↓
petManager.broadcast({     [广播过渡]
  type: 'ceremony-transition',
  from: TaskLifecyclePhase,
  to: TaskLifecyclePhase,
  durationMs: 600
})
        ↓
渲染层播放动画 + 视觉反馈
```

---

## 🎯 与 P0 的区别

| 方面 | P0 | P1 |
|------|-----|-----|
| 状态表达 | 离散的状态跳变 | 连贯的生命周期过程 |
| 用户感知 | "系统状态改变了" | "任务在经历一个过程" |
| 动画效果 | 完成/失败反馈 | 阶段过渡 + 情感变化 |
| 行为连贯性 | 按活动类型反应 | 按生命周期阶段反应 |

---

## ✨ P1 相对于 P0 的核心提升

### P0（基础可用）
- 连接稳定，提醒清晰
- 宠物展示基础状态
- 任务完成/失败有反馈

### P1（真实搭子）
- ✨ **新增**：任务过程可感知
- ✨ **新增**：阶段过渡有仪式感
- ✨ **新增**：行为表现更人性化
- ✨ **新增**：多任务有空间感（后续 CP-007）

---

## 📊 P1 完成度评估

| 功能 | 状态 | 预计完成时间 |
|------|------|----------|
| CP-006: 生命周期仪式感 | 🟢 60% | 2 天 |
| CP-007: 多宠物映射 | 🟡 0% | 2-3 天 |
| CP-008: 面板重构 | 🟡 0% | 2-3 天 |
| CP-009: 状态规范 | 🟡 0% | 1-2 天 |
| **总计** | **🟡 15%** | **7-10 天** |

---

## 📝 下一步实现计划

### 立即接下来
1. **宠物引擎改造** - 根据生命周期阶段选择动画
2. **UI 过渡动画** - 实现 `ceremony-transition` 命令的渲染
3. **颜色/氛围** - 根据 `TASK_LIFECYCLE_EMOTION` 调整视觉

### 并行进行
1. **CP-007** - 多宠物映射（复杂度最高）
2. **CP-008** - 面板信息架构重构
3. **CP-009** - 状态语言规范文档

---

**本文档记录了 P1 阶段的启动状态和 CP-006 的初步实现。**
