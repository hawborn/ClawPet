# 文档快速参考卡片

供 Clawpet 开发团队日常使用的文档快速查找和操作指南。

## 🚀 快速导航

### 我是...

#### 👤 新用户
1. 读 [README.md](../README.md) - 了解项目（5 分钟）
2. 读 [PLAYBOOK.md](../PLAYBOOK.md) - 学会使用（15 分钟）
3. 看 [PROJECT-STATUS.md](PROJECT-STATUS.md) - 了解最新功能（5 分钟）

#### 👨‍💻 新开发者
1. 读 [CONTRIBUTING.md](../CONTRIBUTING.md) - 贡献流程（5 分钟）
2. 读 [CLAWPET-PRD.md](CLAWPET-PRD.md) - 产品需求（30 分钟）
3. 读 [STATE-TAXONOMY.md](STATE-TAXONOMY.md) - 状态系统（20 分钟）
4. 看 [IMPLEMENTATION-BACKLOG.md](IMPLEMENTATION-BACKLOG.md) - 当前任务（10 分钟）
5. 选择一个任务开始！

#### 📊 项目经理
1. 读 [PROJECT-STATUS.md](PROJECT-STATUS.md) - 当前状态
2. 看 [ROADMAP.md](ROADMAP.md) - 发展方向
3. 看 [IMPLEMENTATION-BACKLOG.md](IMPLEMENTATION-BACKLOG.md) - 任务进度
4. 参考 [CLAWPET-PRD.md](CLAWPET-PRD.md) - 产品需求

#### 🎨 设计师
1. 读 [CP-009-STATE-LANGUAGE-SPEC.md](CP-009-STATE-LANGUAGE-SPEC.md) - 设计规范
2. 读 [CP-008-PANEL-IA-COMPLETE.md](CP-008-PANEL-IA-COMPLETE.md) - UI 架构
3. 看 [CP-006-LIFECYCLE-CEREMONY-COMPLETE.md](CP-006-LIFECYCLE-CEREMONY-COMPLETE.md) - 动画设计

---

## 📋 日常操作清单

### 每天开始工作时

- [ ] 打开 [IMPLEMENTATION-BACKLOG.md](IMPLEMENTATION-BACKLOG.md)
- [ ] 检查你的任务状态（进行中/待做）
- [ ] 更新任务进度或标记为完成
- [ ] 检查有无新任务被分配

### 完成一个任务时

- [ ] 标记 IMPLEMENTATION-BACKLOG.md 中对应任务为完成
- [ ] 提交 PR 并提供相关链接
- [ ] 如有重大设计决策，更新相关文档
- [ ] 如是新特性，创建对应的 CP-XXX 文档

### 发起特性讨论时

1. 查阅 [CLAWPET-PRD.md](CLAWPET-PRD.md) 中是否已有相关需求
2. 查阅 [ROADMAP.md](ROADMAP.md) 中特性是否在规划中
3. 参考 [CP-006-009](.) 系列文档的结构创建新的特性文档
4. 在 [INDEX.md](INDEX.md) 中添加链接

### 发布新版本时

- [ ] 更新 [CHANGELOG.md](../CHANGELOG.md)
- [ ] 检查 [OPEN_SOURCE_CHECKLIST.md](OPEN_SOURCE_CHECKLIST.md)
- [ ] 更新 [README.md](../README.md) 中的版本号（如需要）
- [ ] 验证所有链接有效性
- [ ] 创建 GitHub Release 并链接到相应文档

### 完成阶段时

- [ ] 创建 `{PHASE}-COMPLETION-SUMMARY.md`
- [ ] 更新 [PROJECT-STATUS.md](PROJECT-STATUS.md)
- [ ] 整理 [IMPLEMENTATION-BACKLOG.md](IMPLEMENTATION-BACKLOG.md)
- [ ] 提交阶段总结到 [CHANGELOG.md](../CHANGELOG.md)

---

## 🔍 常见文档查询

| 我想查找... | 应该看 | 位置 |
|-----------|--------|------|
| 项目在做什么 | PROJECT-STATUS.md | docs/ |
| 后续会做什么 | ROADMAP.md | docs/ |
| 完整的需求 | CLAWPET-PRD.md | docs/ |
| 当前任务 | IMPLEMENTATION-BACKLOG.md | docs/ |
| 如何使用 | PLAYBOOK.md | 根目录 |
| 如何贡献 | CONTRIBUTING.md | 根目录 |
| 状态定义 | STATE-TAXONOMY.md | docs/ |
| 设计规范 | CP-009-STATE-LANGUAGE-SPEC.md | docs/ |
| P1 完成了什么 | P1-COMPLETION-SUMMARY.md | docs/ |
| 版本更新 | CHANGELOG.md | 根目录 |
| 所有文档 | INDEX.md | docs/ |
| 文档怎么维护 | DOCUMENTATION-GUIDE.md | docs/ |
| 文档结构 | DOCUMENTATION-STRUCTURE.md | docs/ |

---

## 📝 文档模板

### 快速创建新特性文档

复制以下模板创建 `CP-XXX-{FEATURE-NAME}.md`：

```markdown
# CP-XXX: {功能名称}

> 完成日期：YYYY-MM-DD  
> 关联任务：#issue-number  
> 相关需求：CLAWPET-PRD.md 中的 Requirement X.Y  

## 概述

[1-2 句话描述这个特性是什么]

## 需求分析

基于 CLAWPET-PRD.md 的以下需求：
- Requirement X.Y: [具体需求]
- Requirement X.Z: [具体需求]

## 设计决策

### 核心设计

[描述主要设计方案]

### 数据模型

[关键数据结构]

### 交互流程

[用户/系统交互]

## 实现细节

### 主要改动

- 文件 A: [改动描述]
- 文件 B: [改动描述]

### 关键代码片段

[重要的代码参考]

## 测试覆盖

- [x] 单元测试
- [x] 集成测试
- [x] 手动测试

## 已知限制

[任何已知问题或限制]

## 后续优化

[可能的未来改进]

## 参考

- [CLAWPET-PRD.md](CLAWPET-PRD.md): 产品需求
- [STATE-TAXONOMY.md](STATE-TAXONOMY.md): 状态定义
- PR #XXX: [相关 PR]
```

### 快速更新进度

编辑 IMPLEMENTATION-BACKLOG.md，找到对应任务：

```markdown
- [x] 已完成的任务
  - 完成于：YYYY-MM-DD
  - PR：#XXX
  - 文档：link-to-doc.md

- [ ] 待做任务
  - 优先级：High/Medium/Low
  - 预计工作量：X day(s)
  - 分配给：@username

- [WIP] 进行中的任务
  - 开始于：YYYY-MM-DD
  - 进度：X%
  - 预计完成：YYYY-MM-DD
```

---

## 🎯 周期性维护任务

### 每日（开发者）
- 更新 IMPLEMENTATION-BACKLOG.md 中自己的任务状态

### 每周（项目负责人）
- 审视 IMPLEMENTATION-BACKLOG.md，更新 PROJECT-STATUS.md
- 检查是否有遗漏的文档链接或过时信息

### 每月（主导开发者）
- 如有重大功能变化，更新 README.md 和 PLAYBOOK.md
- 检查 ROADMAP.md 的相关性

### 每季度（项目经理）
- 完整审视所有文档的准确性
- 计划下一个阶段的文档需求

### 每年（项目主导）
- 年度文档审计
- 清理过时或冗余的文档
- 规划新年的文档结构改进

---

## 🔗 关键链接速查

### 核心文档
- [README.md](../README.md) - 项目主文档
- [CLAWPET-PRD.md](CLAWPET-PRD.md) - 产品需求文档
- [IMPLEMENTATION-BACKLOG.md](IMPLEMENTATION-BACKLOG.md) - 任务清单 ⭐

### 状态文档
- [PROJECT-STATUS.md](PROJECT-STATUS.md) - 当前项目状态
- [ROADMAP.md](ROADMAP.md) - 产品路线图

### 文档管理
- [INDEX.md](INDEX.md) - 完整文档导航
- [DOCUMENTATION-GUIDE.md](DOCUMENTATION-GUIDE.md) - 维护指南
- [DOCUMENTATION-STRUCTURE.md](DOCUMENTATION-STRUCTURE.md) - 结构可视化

### P1 特性文档
- [CP-006-LIFECYCLE-CEREMONY-COMPLETE.md](CP-006-LIFECYCLE-CEREMONY-COMPLETE.md)
- [CP-007-MULTI-SESSION-MAPPING.md](CP-007-MULTI-SESSION-MAPPING.md)
- [CP-008-PANEL-IA-COMPLETE.md](CP-008-PANEL-IA-COMPLETE.md)
- [CP-009-STATE-LANGUAGE-SPEC.md](CP-009-STATE-LANGUAGE-SPEC.md)

### 技术参考
- [STATE-TAXONOMY.md](STATE-TAXONOMY.md) - 状态分类
- [CONTRIBUTING.md](../CONTRIBUTING.md) - 贡献指南

---

## ✨ Pro 提示

### 🎯 快速创建链接

在 markdown 中引用其他文档时：

```markdown
# 标准链接
[文档名称](DOCUMENT-NAME.md)

# 链接到特定章节（标题）
[章节标题](DOCUMENT-NAME.md#章节-anchor)

# 链接到上级目录
[根目录文档](../README.md)

# 链接到特定行
[代码行](../src/main/index.ts#L42)
```

### 🔍 搜索小技巧

```bash
# 搜索所有文档中提到某个概念
grep -r "关键词" docs/ README.md

# 找出所有 TODO 项
grep -r "TODO\|FIXME\|XXX" docs/

# 检查损坏的链接（Mac）
grep -rE "\]\(.*\.md\)" docs/ | grep -v "^Binary"
```

### 📱 快速查看

在 IDE 中打开 [INDEX.md](INDEX.md) 并使用 Outline 功能快速导航。

---

## ❓ 常见问题

**Q: 我完成了一个任务，应该做什么？**  
A: 
1. 更新 IMPLEMENTATION-BACKLOG.md，标记为 [x]
2. 添加完成日期和 PR 链接
3. 提交 PR
4. 如是新特性，创建 CP-XXX 文档

**Q: 我发现文档有错误，应该怎么办？**  
A: 
1. 直接提交 PR 修复（小改动）
2. 或创建 Issue 讨论（大改动）
3. 通知文档负责人

**Q: 怎样的文档变化需要通知团队？**  
A:
- 新增大型特性文档（CP-XXX）
- 更新产品需求或规划（PRD、ROADMAP）
- 发现关键问题的记录

**Q: 文档和代码不同步了怎么办？**  
A:
1. 优先确保代码正确
2. 更新对应文档
3. 提交单独的文档 PR 说明变化原因

**Q: 我如何建议改进文档结构？**  
A:
1. 在 [DOCUMENTATION-STRUCTURE.md](DOCUMENTATION-STRUCTURE.md) 中记录建议
2. 参考 [DOCUMENTATION-GUIDE.md](DOCUMENTATION-GUIDE.md) 的改进建议
3. 提交 PR 或创建 Issue 讨论

---

## 🚀 文档快捷键（IDE 配置建议）

在你的 IDE 中配置快捷键，快速打开常用文档：

```json
// VSCode Keybindings Example
[
  {
    "key": "cmd+shift+d cmd+b",
    "command": "workbench.action.openFile",
    "args": "docs/IMPLEMENTATION-BACKLOG.md"
  },
  {
    "key": "cmd+shift+d cmd+p",
    "command": "workbench.action.openFile",
    "args": "docs/PROJECT-STATUS.md"
  },
  {
    "key": "cmd+shift+d cmd+i",
    "command": "workbench.action.openFile",
    "args": "docs/INDEX.md"
  }
]
```

---

**最后更新**：2026-03-23  
**维护者**：Clawpet 文档团队
