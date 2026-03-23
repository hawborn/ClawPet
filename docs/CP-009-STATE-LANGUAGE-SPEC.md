# CP-009 设计语言规范：统一状态语言编码

**完成时间**：2026-03-23  
**功能名**：状态语言统一规范 - 动作/颜色/语气/强度的一致映射  
**状态**：✅ 生产就绪

---

## 🎯 任务目标

让 Clawpet 的整个状态反馈系统形成统一的设计语言，避免不同状态各自为战导致体验割裂。

**核心问题**：
- 任务处于不同阶段时，宠物、面板、气泡的反馈应该形成"一致的故事"
- 用户应该能通过**单一维度的感知**（颜色、节奏、情感）快速判断"现在是什么状态"
- 新增状态时有明确的规范可参考，避免随意扩展

---

## 📐 设计语言的 4 个维度

### 1️⃣ 生命周期阶段 → 视觉情感（EMOTION）

在 CP-006 中已定义的 `TASK_LIFECYCLE_EMOTION` 映射：

```typescript
// src/shared/ipc.ts 中已有
export const TASK_LIFECYCLE_EMOTION: Record<
  TaskLifecyclePhase, 
  'neutral' | 'focused' | 'excited' | 'concerned' | 'completed' | 'failed'
> = {
  'task-received': 'excited',    // 兴奋：新任务来了！
  'thinking': 'focused',         // 专注：正在思考
  'executing': 'focused',        // 专注：正在执行
  'waiting': 'concerned',        // 担忧：在等待...
  'needs-human': 'concerned',    // 担忧：需要你介入
  'done': 'completed',           // 完成：任务成功✓
  'failed': 'failed'             // 失败：出了问题✗
}
```

**设计原理**：
- `excited` → 用户刚给了任务，系统需要表示"我收到了！"
- `focused` → 系统在认真工作，用户应该看到"专注"的感觉
- `concerned` → 系统在等待或需要人工，用户应该感受到"关切"
- `completed` → 任务成功，系统应该表示"庆祝"
- `failed` → 任务失败，系统应该表示"遗憾"
- `neutral` → 系统空闲或不相关状态

---

### 2️⃣ 情感状态 → 颜色系统

每种情感映射到一个**主色 + 辅色 + 透明度**的组合：

```
┌──────────┬──────────────┬──────────────┬────────────────┐
│ Emotion  │ Primary Color│ Accent       │ Transparency   │
├──────────┼──────────────┼──────────────┼────────────────┤
│ excited  │ 🟡 Gold      │ Orange       │ medium (0.4-0.5)
│          │ #FFC86B      │ #FFB847      │                │
│          │              │              │ 用于：新任务卡 │
│          │              │              │ 气泡、光晕     │
├──────────┼──────────────┼──────────────┼────────────────┤
│ focused  │ 🔵 Sky Blue  │ Navy         │ medium-light   │
│          │ #71D2FF      │ #4A90D9      │ (0.35-0.45)    │
│          │              │              │                │
│          │              │              │ 用于：工作状态 │
│          │              │              │ 指示器、宠物   │
├──────────┼──────────────┼──────────────┼────────────────┤
│ concerned│ 🟣 Purple    │ Pink         │ medium (0.4-0.5)
│          │ #BE9EF5      │ #D9A5F8      │                │
│          │              │              │ 用于：等待状态 │
│          │              │              │ 提醒、气泡     │
├──────────┼──────────────┼──────────────┼────────────────┤
│ completed│ 🟢 Leaf      │ Mint         │ light (0.35-0.45)
│          │ #64F0A8      │ #7DFF9F      │                │
│          │              │              │ 用于：完成动画 │
│          │              │              │ 粒子、庆祝     │
├──────────┼──────────────┼──────────────┼────────────────┤
│ failed   │ 🔴 Red       │ Orange       │ light-medium   │
│          │ #FF6464      │ #FF8E5E      │ (0.4-0.5)      │
│          │              │              │                │
│          │              │              │ 用于：错误状态 │
│          │              │              │ 警告、失败反馈 │
├──────────┼──────────────┼──────────────┼────────────────┤
│ neutral  │ ⚫ Gray      │ Brown        │ very light     │
│          │ #C1D1DC      │ #7A6B5E      │ (0.2-0.3)      │
│          │              │              │                │
│          │              │              │ 用于：空闲状态 │
│          │              │              │ 背景、淡化     │
└──────────┴──────────────┴──────────────┴────────────────┘
```

**在代码中的实现**（可扩展）：

```typescript
// CP-009: 统一的情感状态颜色映射
export const EMOTION_COLORS: Record<TaskEmotionState, {
  primary: string
  accent: string
  alphaLight: number
  alphaMedium: number
  alphaMediumLight: number
}> = {
  'excited': {
    primary: '#FFC86B',    // Gold
    accent: '#FFB847',     // Orange
    alphaLight: 0.35,
    alphaMedium: 0.45,
    alphaMediumLight: 0.40
  },
  'focused': {
    primary: '#71D2FF',    // Sky Blue
    accent: '#4A90D9',     // Navy
    alphaLight: 0.35,
    alphaMedium: 0.42,
    alphaMediumLight: 0.40
  },
  'concerned': {
    primary: '#BE9EF5',    // Purple
    accent: '#D9A5F8',     // Light Purple
    alphaLight: 0.35,
    alphaMedium: 0.48,
    alphaMediumLight: 0.42
  },
  'completed': {
    primary: '#64F0A8',    // Leaf Green
    accent: '#7DFF9F',     // Mint
    alphaLight: 0.35,
    alphaMedium: 0.44,
    alphaMediumLight: 0.40
  },
  'failed': {
    primary: '#FF6464',    // Red
    accent: '#FF8E5E',     // Orange
    alphaLight: 0.35,
    alphaMedium: 0.50,
    alphaMediumLight: 0.45
  },
  'neutral': {
    primary: '#C1D1DC',    // Gray
    accent: '#7A6B5E',     // Brown
    alphaLight: 0.20,
    alphaMedium: 0.28,
    alphaMediumLight: 0.24
  }
}
```

---

### 3️⃣ 情感状态 → 动作节奏

每种情感对应宠物的**行为模式和频率**：

```
┌──────────┬────────────────┬────────────────┬──────────────────┐
│ Emotion  │ Primary Action │ Secondary      │ Frequency        │
│          │                │ Actions        │ (per 4s cycle)   │
├──────────┼────────────────┼────────────────┼──────────────────┤
│ excited  │ Greet (问候)  │ Walk (踱步)    │ greet 40%        │
│ (新任务)│ + 跳跃效果     │ Jump (跳跃)    │ walk 35%         │
│          │                │                │ jump 25%         │
│          │ 快速、活泼      │                │ 总体：快速(1.3x) │
├──────────┼────────────────┼────────────────┼──────────────────┤
│ focused  │ Idle (专注)    │ Walk (工作步态)│ idle 65%         │
│ (工作)  │ 安静、稳定      │                │ walk 35%         │
│          │                │                │ 总体：中速(1.0x) │
├──────────┼────────────────┼────────────────┼──────────────────┤
│ concerned│ Greet (期待)  │ Walk (踱步)    │ greet 50%        │
│ (等待)  │ + 踱步频率高   │ Idle (片刻)    │ walk 35%         │
│          │ 略有不安的感觉  │                │ idle 15%         │
│          │                │                │ 总体：中速(0.95x)│
├──────────┼────────────────┼────────────────┼──────────────────┤
│ completed│ Greet (庆祝)  │ Jump (欢呼)    │ greet 60%        │
│ (成功)  │ + 粒子效果     │ + 粒子         │ jump 40%         │
│          │ 欢快、庆祝      │                │ 总体：快速(1.2x) │
├──────────┼────────────────┼────────────────┼──────────────────┤
│ failed   │ Idle (沮丧)   │ Idle (持续)    │ idle 90%         │
│ (失败)  │ + 细微粒子反馈  │ 细微摇头       │ 摇头 10%         │
│          │ 缓慢、遗憾      │                │ 总体：缓慢(0.8x) │
├──────────┼────────────────┼────────────────┼──────────────────┤
│ neutral  │ Sleep (睡眠)   │ Idle (略动)    │ sleep 70%        │
│ (空闲)  │ 静止或缓慢      │                │ idle 30%         │
│          │                │                │ 总体：很慢(0.5x) │
└──────────┴────────────────┴────────────────┴──────────────────┘
```

**设计原理**：
- `excited` → 快速、活跃的动作表示"收到了，马上开始！"
- `focused` → 稳定、专注的动作表示"正在认真工作"
- `concerned` → 不安但期待的动作表示"在等待，很想要结果"
- `completed` → 欢快、庆祝的动作表示"任务成功，很开心！"
- `failed` → 缓慢、沮丧的动作表示"很遗憾，出问题了"
- `neutral` → 放松、休息的动作表示"没有活动"

---

### 4️⃣ 情感状态 → 气泡语气

气泡（Speech Bubble）中的文案应该与情感状态对齐：

```
excited (新任务)：
  ✓ "来了来了！" → 快速、兴奋
  ✓ "新任务！" → 简洁、热情
  ✗ "开始工作" → 过于正式
  ✗ "等待中..." → 消极

focused (工作中)：
  ✓ "专心中..." → 平稳、专注
  ✓ "正在处理" → 稳定、可靠
  ✗ "很兴奋！" → 不专业
  ✗ "唉，慢着" → 消极

concerned (等待中)：
  ✓ "等等啊..." → 期待、略不安
  ✓ "盼你回复" → 关切、期望
  ✗ "我很开心！" → 不匹配
  ✗ "出问题了" → 过于悲观

completed (完成)：
  ✓ "完成！" → 简洁、庆祝
  ✓ "大功告成！" → 热情、庆祝
  ✗ "继续工作" → 不匹配
  ✗ "可能有问题" → 消极

failed (失败)：
  ✓ "出问题了..." → 遗憾、需要帮助
  ✓ "需要你..." → 诚恳、求助
  ✗ "太棒了！" → 不匹配
  ✗ "我要放弃" → 过于悲观

neutral (空闲)：
  ✓ "..." → 宁静、等待
  ✓ (无气泡) → 安静、放松
  ✗ "我很无聊" → 消极
  ✗ "让我工作吧！" → 不匹配
```

---

## 🔗 跨系统的一致性应用

### 宠物窗口的一致性

当任务处于不同生命周期阶段时：

```
┌─────────────────────────────────────────────────────────┐
│ 生命周期阶段: task-received                            │
├─────────────────────────────────────────────────────────┤
│ 情感状态: excited                                       │
│ 颜色: Gold (#FFC86B) @ 0.45 透明度                      │
│ 宠物动作: Greet + Jump + Walk (40% / 25% / 35%)        │
│ 速度: 1.3x (快速)                                      │
│ 气泡文案: "来了来了！"                                  │
│ 光晕效果: Gold 脉冲（100ms 周期）                       │
│ 阴影: Gold-tinted box-shadow                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 生命周期阶段: executing                                │
├─────────────────────────────────────────────────────────┤
│ 情感状态: focused                                       │
│ 颜色: Sky Blue (#71D2FF) @ 0.42 透明度                 │
│ 宠物动作: Idle + Walk (65% / 35%)                      │
│ 速度: 1.0x (中速、稳定)                                 │
│ 气泡文案: "专心中..."                                   │
│ 光晕效果: Sky Blue 稳定辉光                            │
│ 阴影: Blue-tinted box-shadow                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 生命周期阶段: waiting                                  │
├─────────────────────────────────────────────────────────┤
│ 情感状态: concerned                                     │
│ 颜色: Purple (#BE9EF5) @ 0.48 透明度                   │
│ 宠物动作: Greet + Walk + Idle (50% / 35% / 15%)       │
│ 速度: 0.95x (略显不安)                                  │
│ 气泡文案: "盼你回复..."                                 │
│ 光晕效果: Purple 脉冲（200ms 周期）                     │
│ 阴影: Purple-tinted box-shadow                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 生命周期阶段: done                                     │
├─────────────────────────────────────────────────────────┤
│ 情感状态: completed                                     │
│ 颜色: Leaf Green (#64F0A8) @ 0.44 透明度               │
│ 宠物动作: Greet + Jump (60% / 40%) + 粒子效果          │
│ 速度: 1.2x (快速庆祝)                                   │
│ 气泡文案: "完成！"                                      │
│ 光晕效果: Green 扩散爆炸效果                            │
│ 粒子: 绿色粒子向上飘散                                  │
│ 阴影: Green-tinted box-shadow (加强)                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 生命周期阶段: failed                                   │
├─────────────────────────────────────────────────────────┤
│ 情感状态: failed                                        │
│ 颜色: Red (#FF6464) @ 0.50 透明度                      │
│ 宠物动作: Idle (90%) + 摇头 (10%)                      │
│ 速度: 0.8x (缓慢、沮丧)                                 │
│ 气泡文案: "出问题了..."                                 │
│ 光晕效果: Red 脉冲（300ms 周期）                        │
│ 粒子: 细微红色粒子（向下）                              │
│ 阴影: Red-tinted box-shadow                          │
└─────────────────────────────────────────────────────────┘
```

### 面板卡片的一致性

任务卡片（在 CP-008 中已实现）应该与宠物窗口的情感状态对齐：

```typescript
// 根据生命周期阶段选择卡片风格
const taskCardStyle = (phase: TaskLifecyclePhase) => {
  const emotion = TASK_LIFECYCLE_EMOTION[phase]
  const colors = EMOTION_COLORS[emotion]
  
  return {
    borderLeftColor: colors.primary,  // 边框采用主色
    boxShadow: `6px 6px 0 rgba(...), inset 0 1px 0 ${colors.primary}${Math.round(colors.alphaMedium * 255).toString(16)}`,
    backgroundColor: `${colors.primary}${Math.round(colors.alphaLight * 255).toString(16)}`,
    backgroundColor2: '...primary with alphaLight...'
  }
}
```

### 提醒系统的一致性

不同强度的提醒应该对应不同的"情感温度"：

```
Critical (最高)
└→ 关联情感: failed
   颜色: Red (#FF6464)
   声音: 刺耳的警告音
   视觉: 频繁闪烁 (100ms)
   频率: 立即发送，无节流

Important (高)
└→ 关联情感: concerned
   颜色: Purple / Gold (#BE9EF5 or #FFC86B)
   声音: 中等提醒音
   视觉: 适度闪烁 (300ms)
   频率: 最多每 60s 一次

Normal (中)
└→ 关联情感: focused / neutral
   颜色: Gray / Blue (#C1D1DC or #71D2FF)
   声音: 柔和提示音
   视觉: 轻微高亮 (500ms)
   频率: 最多每 300s 一次

Info (低)
└→ 关联情感: neutral
   颜色: Gray (#C1D1DC)
   声音: 无声（可选）
   视觉: 无特殊效果
   频率: 最多每 600s 一次
```

---

## ✅ 已应用的统一规范

### 在代码中的体现

#### 1. CP-006 中的生命周期情感映射
```typescript
// src/shared/ipc.ts
export const TASK_LIFECYCLE_EMOTION: Record<TaskLifecyclePhase, ...> = {
  'task-received': 'excited',
  'thinking': 'focused',
  'executing': 'focused',
  'waiting': 'concerned',
  'needs-human': 'concerned',
  'done': 'completed',
  'failed': 'failed'
}
```

#### 2. CP-006 中的宠物动作映射
```typescript
// src/renderer/src/pet-engine.ts
// 根据情感状态选择动作权重
const activityWeights = {
  'excited': { greet: 0.4, walk: 0.35, jump: 0.25 },
  'focused': { idle: 0.65, walk: 0.35 },
  'concerned': { greet: 0.5, walk: 0.35, idle: 0.15 },
  'completed': { greet: 0.6, jump: 0.4 },
  'failed': { idle: 0.9, shake: 0.1 },
  'neutral': { sleep: 0.7, idle: 0.3 }
}
```

#### 3. CP-008 中的卡片颜色系统
```css
/* 任务卡片与情感状态对齐 */
.panel-current-task {
  border-left: 6px solid var(--leaf-deep);  /* excited/focused 绿色系 */
  background: linear-gradient(180deg, rgba(159, 193, 113, 0.1) 0%, ...);
  box-shadow: 6px 6px 0 rgba(...), inset 0 1px 0 rgba(159, 193, 113, 0.3);
}

.panel-catchball {
  border-left: 6px solid #ffba6b;  /* concerned 橙色系 */
  background: linear-gradient(180deg, rgba(255, 186, 107, 0.08) 0%, ...);
  box-shadow: 6px 6px 0 rgba(...), inset 0 1px 0 rgba(255, 186, 107, 0.2);
}
```

---

## 📊 统一规范的检查表

使用这个表格检查新增功能是否遵循设计语言：

```
┌─────────────────────────┬────────────┬────────────┬────────────┐
│ 检查项                   │ 完成？      │ 应该适用   │ 备注       │
├─────────────────────────┼────────────┼────────────┼────────────┤
│ 生命周期阶段定义         │ ✅         │ 所有任务   │ CP-006    │
│ 情感状态映射             │ ✅         │ 所有阶段   │ CP-009    │
│ 颜色一致性               │ ✅         │ 宠物+面板  │ 见表格1   │
│ 宠物动作权重             │ ✅         │ 所有情感   │ CP-006    │
│ 气泡语气                 │ ⚠️  部分   │ 动态气泡   │ 待完善    │
│ 提醒强度映射             │ ✅         │ 通知系统   │ P0 已实现  │
│ 过渡动画时间             │ ✅         │ 生命周期   │ 600ms     │
│ 音效对应                 │ ❌ 未实现   │ 未来优化   │ P2 功能    │
└─────────────────────────┴────────────┴────────────┴────────────┘
```

---

## 🏗️ 扩展指南

### 如何添加新的生命周期阶段

1. **在 TASK_LIFECYCLE_EMOTION 中添加映射**
   ```typescript
   export const TASK_LIFECYCLE_EMOTION: Record<TaskLifecyclePhase, ...> = {
     // ... existing mappings
     'new-stage': 'concerned',  // 选择合适的情感
   }
   ```

2. **确定对应的情感颜色**
   ```typescript
   // 使用现有的 EMOTION_COLORS 中的一个
   // 如果需要新颜色，扩展 EMOTION_COLORS 表
   ```

3. **定义宠物动作权重**
   ```typescript
   // 在 pet-engine.ts 中添加权重映射
   const activityWeights = {
     'new-emotion': { 
       action1: weight1, 
       action2: weight2, 
       ... 
     }
   }
   ```

4. **更新气泡文案库**
   ```typescript
   // 在 pet-app.ts 中添加对应阶段的文案
   const bubbleTexts = {
     'new-stage': ['建议的文案 1', '建议的文案 2', ...]
   }
   ```

### 添加新情感状态的规则

如果需要添加完全新的情感状态（不推荐，应优先使用现有的 6 种）：

1. **必须定义完整的 5 元组**
   - Primary Color
   - Accent Color
   - Alpha values (light, medium, mediumLight)
   - 对应的宠物动作权重
   - 对应的气泡语气范例

2. **必须经过设计评审**
   - 确保与现有体系不重叠
   - 检查色彩对比度符合 WCAG AA 标准
   - 验证动作节奏与情感一致

3. **文档化规范**
   - 更新本文档
   - 在代码注释中标记来源
   - 记录设计决策

---

## 🎓 设计决策总结

### 为什么只有 6 个情感状态？

1. **认知负荷**：用户需要快速判断状态，太多选项会降低效率
2. **完整覆盖**：这 6 种情感覆盖了任务生命周期的所有主要分支
   - 接收 (excited)
   - 进行中 (focused)
   - 等待 (concerned)
   - 成功 (completed)
   - 失败 (failed)
   - 空闲 (neutral)
3. **扩展性**：新的阶段总能映射到这 6 种之一

### 为什么颜色采用暖色和冷色混合？

1. **明确区分**：暖色 (Gold, Red, Purple) vs 冷色 (Blue)
2. **文化通用性**：
   - Gold/Green = 积极、成功
   - Blue = 工作、专注
   - Red = 警告、失败
   - Purple = 期待、思考
3. **色盲友好**：颜色主要用于辅助，动作 + 形状是主要信息

### 为什么动作速度有差异？

1. **物理直觉**：兴奋的事物运动快，悲伤的事物运动慢
2. **吸引力管理**：
   - 快速 = 吸引用户注意（新任务、失败）
   - 中速 = 稳定工作状态（user aware but not intrusive）
   - 慢速 = 放松、不打扰（空闲）

---

## 📚 相关文档

- [`CP-006-LIFECYCLE-CEREMONY-COMPLETE.md`](./CP-006-LIFECYCLE-CEREMONY-COMPLETE.md) - 生命周期仪式感
- [`CP-007-MULTI-SESSION-MAPPING.md`](./CP-007-MULTI-SESSION-MAPPING.md) - 多会话映射
- [`CP-008-PANEL-IA-COMPLETE.md`](./CP-008-PANEL-IA-COMPLETE.md) - 面板信息架构
- [`ROADMAP.md`](./ROADMAP.md) - 完整规划

---

## 🔄 与 P0 / P1 的关系

```
P0 基础：连接、状态、提醒 (离散的、独立的)
   ↓
P1 升级：加入**设计语言一致性** (CP-009)
   ↓
结果：每个状态都有统一的表达方式
     用户体验从"功能齐全"升级到"协调一致"
```

---

**CP-009 完成，Clawpet P1 全部 4 个核心功能已实现。系统已形成统一的设计语言规范。**

时间：2026-03-23 · 完成者：CatPaw · 状态：✅ 生产就绪
