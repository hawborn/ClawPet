# Changelog

所有值得注意的变化都将在此记录。

版本格式：[MAJOR.MINOR.PATCH](https://semver.org/)

## [0.1.0] - 2026-03-22

### 🎉 初始发布 - 完整的桌宠 + OpenClaw 集成

#### ✨ 新功能

##### 核心桌宠功能
- Canvas 像素渲染的独立宠物窗口
- 多宠物支持，每只独立窗口
- 三种内置皮肤变体（蜜桃猫、薄荷猫、夜空猫）
- 完整的宠物状态机和动画系统
  - idle / walk / greet / sleep 动作
  - 自然的行为转移和随机性
- 托盘菜单控制（添加、移除、暂停、穿透、关闭）
- 点击宠物触发互动气泡和打招呼动画

##### OpenClaw Gateway 集成
- 自动探测 OpenClaw/QClaw 配置
- WebSocket 连接与挑战式握手
- 会话管理和消息发送
- 活动类型识别（read/write/edit/exec/tool/job）
- 待审批请求检测和浮窗处理
- 宠物状态与 Gateway 活动同步

##### 灵魂模式（Soul Mode）
- 原生 Gateway 状态映射到宠物行为
- 六种灵魂状态（idle/thinking/coding/running/waiting/error）
- 文件桥接备选方案（SOUL.md 监听）
- Python 辅助脚本（set_state.py）

##### 交接面板（Panel）
- 双击宠物打开 Panel
- 会话列表和选择
- 对话时间线（最近 120 条消息）
- 直接消息发送和运行中止
- 待审批请求实时显示
- 皮肤切换器（全部宠物快速换肤）

##### 审批浮窗（Approval Window）
- 审批请求自动弹窗
- 三种决策选项（允许一次、总是允许、拒绝）
- 命令和上下文显示
- 过期倒计时

##### 反馈系统
- 任务完成提示（带粒子效果）
- 任务失败提示（温和提醒）
- 长时间等待催促（30秒超时）
- 完成/失败/等待三种反馈

##### 性能优化
- 主进程 Snapshot 节流（Panel: 100ms, 宠物: 500ms）
- Panel 流式更新检测（区分结构性变化和流式变化）
- 用户滚动保护（滚动时暂停渲染）
- 异步渲染批处理（requestAnimationFrame）
- IME 输入法保护（拼音输入不中断）

#### 🔧 技术栈
- Electron 41.0.3（主进程窗口管理）
- Vite 7.3.1（前端构建）
- TypeScript 5.9.3（类型安全）
- Canvas（像素渲染）
- WebSocket（Gateway 连接）

#### 📁 项目结构
```
src/
├─ main/           Electron 主进程
│  ├─ index.ts     应用入口、IPC 处理
│  ├─ pet-manager.ts  宠物生命周期管理
│  ├─ soul-bridge.ts  灵魂状态监听
│  ├─ openclaw-client.ts  Gateway 连接
│  ├─ app-config.ts  配置管理
│  └─ app-persistence.ts  状态持久化
├─ preload/        IPC 安全桥接
├─ renderer/       前端渲染
│  ├─ pet-app.ts   宠物窗口
│  ├─ panel-app.ts  交接面板
│  ├─ approval-app.ts  审批浮窗
│  ├─ pet-engine.ts  宠物渲染引擎
│  ├─ pet-definitions.ts  宠物定义和行为
│  └─ styles.css   样式
└─ shared/         共享类型定义
```

#### 📖 文档
- [README.md](README.md) - 项目总览
- [PLAYBOOK.md](PLAYBOOK.md) - 使用指南和玩法
- [docs/ROADMAP.md](docs/ROADMAP.md) - 项目路线
- [docs/CLAWPET-PRD.md](docs/CLAWPET-PRD.md) - 产品需求文档

#### 🚀 如何开始
```bash
npm install
npm run dev
```

#### 💡 已知限制
- 仅支持 macOS
- Electron 应用体积相对较大（可考虑后续迁移到 Tauri）
- 宠物动画基于状态机（非完整骨骼系统）

#### 🔐 许可证
AGPL v3 - 非商业开源

---

## 更新日志说明

### 版本号规范
- **MAJOR**: 重大功能或架构变更
- **MINOR**: 新功能或显著改进
- **PATCH**: Bug 修复、小改进

### 变更分类
- ✨ **新功能**（feat）
- 🐛 **Bug 修复**（fix）
- 📝 **文档**（docs）
- 🔧 **内部改进**（refactor/perf）
- ⚠️ **破坏性变更**（breaking change）

### 贡献者
感谢所有为 ClawPet 做出贡献的人！
