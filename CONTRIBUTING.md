# 贡献指南

感谢你对 ClawPet 的兴趣！我们欢迎各种形式的贡献。

## 行为准则

请遵守以下原则：
- 尊重他人
- 包容多元观点
- 提供建设性反馈
- 专注于项目的最佳利益

## 开源许可证

ClawPet 采用 **AGPL v3 许可证**。

### 这意味着什么？

- ✅ 你可以自由学习、修改、分享代码
- ✅ 你可以为项目做出贡献
- ❌ 你不能将本项目用于商业目的
- ⚠️ 如果你修改并分发（包括网络分发），必须公开源代码

### 贡献者同意

通过提交代码、文档或其他内容，你同意这些内容将在 AGPL v3 许可证下发布。

## 如何贡献

### 报告 Bug

1. 检查 [Issues](https://github.com/yourusername/clawpet/issues) 是否已有相同问题
2. 如果没有，创建新 issue，包含：
   - 清晰的标题
   - 问题描述
   - 复现步骤
   - 期望行为 vs 实际行为
   - macOS 版本、ClawPet 版本

### 提议功能

1. 检查 [Issues](https://github.com/yourusername/clawpet/issues) 的现有讨论
2. 创建 issue，描述：
   - 功能目的
   - 预期用途
   - 为什么这个功能对 ClawPet 重要
   - 可能的实现方向

### 提交代码

1. **Fork** 项目
2. **创建特性分支** (`git checkout -b feature/amazing-feature`)
3. **提交更改** (`git commit -m 'Add some amazing feature'`)
4. **推送到分支** (`git push origin feature/amazing-feature`)
5. **创建 Pull Request**

#### 代码规范

- 使用 TypeScript（不是 JavaScript）
- 遵循项目现有的代码风格
- 使用 `npm run check` 验证类型
- 为复杂逻辑添加注释
- 更新相关文档

#### 提交信息规范

```
<type>: <subject>

<body>

<footer>
```

类型：
- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档
- `refactor:` 代码重构
- `perf:` 性能优化
- `test:` 测试

示例：
```
feat: add mouse hover feedback for pets

- Add hover state tracking to PetEngine
- Display subtle visual feedback on hover
- Emit sparkle particles on hover interaction

Closes #42
```

### 改进文档

文档改进同样重要！可以改进：
- README.md
- PLAYBOOK.md
- docs/ 下的各类文档
- 代码注释
- 示例

## 开发设置

```bash
# 克隆仓库
git clone https://github.com/yourusername/clawpet.git
cd clawpet

# 安装依赖
npm install

# 开发模式
npm run dev

# 类型检查
npm run check

# 构建
npm run build
```

## 项目结构

```
src/
  ├─ main/          Electron 主进程
  ├─ preload/       IPC 桥接
  ├─ renderer/      前端（Canvas + UI）
  └─ shared/        共享类型定义

docs/
  ├─ ROADMAP.md     项目路线
  ├─ CLAWPET-PRD.md 产品需求文档
  └─ ...
```

## 讨论区域

- **Bug 报告**: GitHub Issues（标签：bug）
- **功能请求**: GitHub Issues（标签：enhancement）
- **讨论**: GitHub Discussions
- **设计相关**: Issues 中标注为 design

## 许可证

ClawPet 采用 AGPL v3 许可证。详见 [LICENSE](LICENSE)。

通过贡献代码，你同意这些贡献将在 AGPL v3 许可证下发布。

## 问题或疑问？

- 查看 [PLAYBOOK.md](PLAYBOOK.md) 了解项目现状
- 查看 [README.md](README.md) 了解功能
- 查看 [docs/](docs/) 目录下的文档
- 在 Issues 中提问

---

感谢你的贡献！🐱✨
