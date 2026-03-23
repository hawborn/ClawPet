# 开源准备清单

## ✅ 已完成

### 法律和许可证
- [x] LICENSE 文件（AGPL v3）
- [x] package.json 中的许可证字段
- [x] README 中的许可证说明
- [x] CONTRIBUTING.md 中的贡献者协议

### 文档
- [x] 详细的 README.md
- [x] PLAYBOOK.md（使用指南）
- [x] CONTRIBUTING.md（贡献指南）
- [x] CHANGELOG.md（版本历史）
- [x] CODE_OF_CONDUCT.md（行为准则）
- [x] docs/ 目录下的详细文档
  - [x] ROADMAP.md
  - [x] CLAWPET-PRD.md
  - [x] IMPLEMENTATION-BACKLOG.md

### GitHub 文件
- [x] .github/ISSUE_TEMPLATE/bug_report.md
- [x] .github/ISSUE_TEMPLATE/feature_request.md
- [x] .github/PULL_REQUEST_TEMPLATE.md
- [x] .github/workflows/typecheck.yml

### 项目元数据
- [x] package.json
  - [x] 准确的 description
  - [x] keywords 填充
  - [x] author 信息
  - [x] license 字段
  - [x] repository 链接
  - [x] bugs 链接
  - [x] homepage 链接

### 代码质量
- [x] .gitignore（现有）
- [x] tsconfig.json（TypeScript 配置）
- [x] TypeScript 类型检查通过

## ⏳ 待办事项

### 在公开发布前
- [ ] 决定 GitHub 用户名和仓库名
  - 建议：`yourusername/clawpet` 或 `clawpet-opensource/clawpet`
- [ ] 更新所有 GitHub 链接
  - [ ] package.json 中的 repository/bugs/homepage
  - [ ] CONTRIBUTING.md 中的链接
  - [ ] CHANGELOG.md 中的链接
- [ ] 创建 GitHub 仓库
- [ ] 推送代码到 GitHub
- [ ] 在 GitHub 中启用适当的设置
  - [ ] 保护 main 分支
  - [ ] 要求 PR review
  - [ ] 要求状态检查通过

### 宣传
- [ ] 在 Product Hunt 上发布（可选）
- [ ] 在 Hacker News 上讨论（可选）
- [ ] 发布首个公开版本说明
- [ ] 分享到相关社区

### 后续维护
- [ ] 监控 Issues 和 PRs
- [ ] 制定响应时间期望
- [ ] 建立发布节奏（建议每月一次）
- [ ] 跟踪贡献者
- [ ] 定期更新文档

## 📋 项目元数据验证

### package.json 检查
```json
{
  "name": "clawpet",
  "version": "0.1.0",
  "description": "✅ 包含 OpenClaw 信息的描述",
  "license": "AGPL-3.0-only",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/clawpet"  // ❌ 需要更新
  },
  "keywords": ["electron", "desktop-pet", "pixel-art", ...],  // ✅ 已填充
  "author": "wuhao"  // ✅ 已填充
}
```

### 文件完整性检查
```
✅ LICENSE - AGPL v3 完整文本
✅ README.md - 完整的项目说明
✅ CONTRIBUTING.md - 贡献指南
✅ CHANGELOG.md - 版本历史
✅ CODE_OF_CONDUCT.md - 行为准则
✅ .github/ - Issue 和 PR 模板
✅ .gitignore - 现有且完整
```

## 🚀 发布流程

### 第一步：准备本地仓库
```bash
# 确保本地仓库干净
git status

# 创建 0.1.0 发布标签
git tag -a v0.1.0 -m "Initial release: Clawpet desktop pet with OpenClaw integration"

# 验证标签
git tag -l -n
```

### 第二步：创建 GitHub 仓库
1. 登录 GitHub
2. 创建新仓库（Public）
3. 仓库名：`clawpet`
4. 描述：复制 package.json 的 description
5. 选择 MIT/Apache/etc... ❌（我们已有 AGPL v3）
6. 不初始化 README（我们已有）

### 第三步：推送代码
```bash
git remote add origin https://github.com/yourusername/clawpet.git
git branch -M main
git push -u origin main
git push origin v0.1.0
```

### 第四步：GitHub 发布
1. 打开 https://github.com/yourusername/clawpet/releases
2. 点击 "Create a new release"
3. 选择标签 `v0.1.0`
4. 标题：`v0.1.0 - Initial Release`
5. 描述：复制 CHANGELOG.md 的 0.1.0 部分
6. 发布！

## 📞 联系方式

如果用户有问题，他们应该能够通过以下方式联系：
- [ ] Issues 在 GitHub
- [ ] Discussions 在 GitHub（可选启用）
- [ ] Email（可选，在 CONTRIBUTING.md 中）

## 🔒 安全考虑

- [x] 没有泄露私密信息
- [x] 没有 API 密钥在代码中
- [x] .gitignore 包含所有敏感文件
- [x] 代码已通过类型检查

## 📚 文档完整性

- [x] README 解释了项目目的
- [x] README 包含快速开始指南
- [x] README 包含技术选型说明
- [x] CONTRIBUTING.md 说明了如何贡献
- [x] CHANGELOG.md 记录了所有功能
- [x] CODE_OF_CONDUCT.md 建立了社区规范
- [x] .github 模板指导用户提交 issues/PRs

## 🎯 最终检查清单

在推送到 GitHub 之前：

```bash
# 1. 类型检查通过
npm run check

# 2. 清理构建文件
rm -rf out dist

# 3. 确认 .gitignore 正确
git status --porcelain

# 4. 验证许可证文件
cat LICENSE | head -20

# 5. 检查 package.json
cat package.json | jq '.license, .repository, .author'
```

---

**发布后**的维护建议：

1. **第一周**：监控 Issues，迅速响应
2. **第一个月**：收集反馈，优化文档
3. **持续**：定期发布补丁和功能更新
4. **社区**：积极回应贡献者的 PRs

祝 Clawpet 开源顺利！🐱✨
