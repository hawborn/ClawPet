# P0 阶段性提醒与行为优化

## 1. 长等待提醒升级 (CP-004+)

### 目标
实现分阶段的长等待提醒系统，在任务长时间未响应时逐步提升提醒强度：
- **30s 无反馈** → 宠物显示"期待"行为
- **60s 首次提醒** → 宠物说话 ("还等呢...")
- **120s 升级提醒** → 更强的视觉反馈
- **300s 重要提醒** → 系统通知级别
- **600s 最强提醒** → 系统 desktop 通知

### 实现方式
修改 [`src/main/index.ts`](src/main/index.ts)：
- 增加多级别等待定时器（30s, 60s, 120s, 300s, 600s）
- 每个阶段触发不同级别的提醒
- 宠物通过 `setPetState` 展示"期待"行为
- 系统通知通过 OS native notification

## 2. 宠物行为优化 (CP-006)

### 目标
优化宠物在不同状态下的行为映射，增加完成/失败的过渡动画：

#### 2.1 状态映射优化
修改 [`src/renderer/src/pet-engine.ts`](src/renderer/src/pet-engine.ts)：
- **idle** → 无活动时的默认状态
- **walk** → 任务流转时的行走动画
- **greet** → 新任务到达时的打招呼
- **sleep** → 长时间无动作时的睡眠状态
- **thinking** → 任务处理中（新增）
- **executing** → 任务执行中（新增）
- **waiting** → 等待响应（新增）
- **expecting** → 期待响应（新增）

#### 2.2 完成/失败动画
修改 [`src/renderer/src/pet-manager.ts`](src/renderer/src/pet-manager.ts)：
- 完成时播放胜利动画 + 反馈文字
- 失败时播放失望动画 + 错误信息
- 确保动画流畅不卡顿

## 3. 核心改动文件

| 文件 | 改动范围 | 优先级 |
|-----|--------|-------|
| `src/main/index.ts` | 多级等待定时器、阶段性提醒 | P0 |
| `src/renderer/src/pet-engine.ts` | 行为映射表、状态转移 | P0 |
| `src/renderer/src/pet-manager.ts` | 命令处理、反馈动画 | P0 |
| `src/shared/ipc.ts` | 新增命令类型（如需） | P0 |

## 4. 验收标准

- ✅ 多级提醒按时间阶段正确触发
- ✅ 宠物在等待时显示"期待"行为
- ✅ 完成/失败动画流畅无卡顿
- ✅ 系统通知正确发送
- ✅ UI 不卡顿、响应灵敏

