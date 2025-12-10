# 📚 Incremental Reading - 智能增量阅读插件

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Obsidian](https://img.shields.io/badge/Obsidian-Plugin-7C3AED.svg)](https://obsidian.md)
[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/yg2224/obsidian-incremental-reading/releases)

🎯 **完全中文化界面** | 📊 **智能指标管理** | 🧠 **AI推荐算法** | 📁 **批量文件操作**

---

## 📖 项目简介

**Incremental Reading** 是一个功能强大的 Obsidian 插件，将您的知识库转化为智能学习系统。通过先进的推荐算法和多维度优先级管理，帮助您在成百上千的笔记中找到最值得阅读的文档，实现真正的增量阅读体验。

> 💡 **核心理念**：让知识主动找到你，而不是你寻找知识

### 🎯 v2.0.0 重大更新

- ✨ **完全中文化界面**：移除复杂的 i18n 系统，原生中文显示
- 🔧 **修复关键问题**：解决设置界面显示和组件刷新问题
- ⚡ **性能大幅提升**：容器隔离机制，界面更稳定
- 📊 **指标管理优化**：支持 1-10 个自定义指标，自动权重归一化

---

## ✨ 核心特性

### 🎯 智能漫游系统

#### 1. 🚀 继续漫游
**基于优先级的加权随机选择**
- 综合考虑自定义指标权重和优先级
- 实时显示每个文档的选中概率
- 优先级越高，选中概率越大
- 智能排除当前文档，避免重复阅读

#### 2. 🧠 智能推荐
**基于 TF-IDF 的内容相似度推荐**
- 使用您的阅读历史作为推荐基准
- 通过 TF-IDF 算法分析文档内容相似度
- 支持中英文混合分词处理
- 多重推荐基准：最近浏览 + 高频访问

#### 3. 🎲 随机漫游
**纯随机选择模式**
- 完全随机选择漫游文档
- 打破思维定式，发现意外内容
- 适合探索式学习和创意启发

### 📊 自定义指标系统

#### 🔧 灵活的指标配置
- **自定义数量**：支持 1-10 个自定义评估指标
- **中文界面**：指标名称和描述完全中文化
- **自动归一化**：所有权重自动归一化为 100%
- **实时预览**：设置修改立即生效

#### 📈 默认评估维度
| 指标名称 | 说明 | 默认权重 |
|---------|------|---------|
| 📚 难度 | 内容理解难度 | 2.0 |
| ⭐ 重要性 | 知识的重要程度 | 3.0 |
| 🔥 紧急度 | 阅读的紧急程度 | 2.5 |
| ❤️ 兴趣度 | 个人兴趣偏好 | 2.0 |
| 🎯 优先级 | 手动设置的优先级 | 2.5 |

### 📁 批量文件管理

#### 📂 文件夹批量添加
- 一键添加整个文件夹的 Markdown 文档
- 递归扫描子文件夹
- 智能过滤非 Markdown 文件

#### 🎯 多选文件支持
- Ctrl+点击 选择多个文档
- Shift+点击 连续选择文档
- 批量操作，提高效率

#### 🛡️ 智能过滤系统
- 支持通配符路径排除（`*`、`**`）
- 预设常见排除路径（`.obsidian/`、`Templates/` 等）
- 自定义过滤规则

---

## 🚀 快速开始

### 📋 系统要求

- **Obsidian 版本**：0.15.0 或更高
- **操作系统**：Windows、macOS、Linux
- **内存要求**：至少 512MB 可用内存

### 💿 安装方法

#### 方法一：从 GitHub 下载
1. 访问 [Releases 页面](https://github.com/yg2224/obsidian-incremental-reading/releases)
2. 下载最新版本的三个文件：
   - `main.js` - 插件主文件
   - `manifest.json` - 插件清单
   - `styles.css` - 样式文件
3. 在 Obsidian 中：`设置` > `社区插件` > `关闭安全模式`
4. 点击 `从本地安装插件`，选择文件所在文件夹

#### 方法二：手动安装
```bash
# 克隆仓库
git clone https://github.com/yg2224/obsidian-incremental-reading.git

# 复制到插件目录
cp -r obsidian-incremental-reading/* <vault>/.obsidian/plugins/obsidian-incremental-reading/
```

### 🎮 基础使用

1. **📚 添加文档**：
   - 打开任意 Markdown 文档
   - 点击侧边栏的 "加入漫游" 按钮
   - 或者使用快捷键 `Ctrl+Shift+R` 添加当前文档

2. **⚙️ 设置指标**：
   - 在设置页面配置自定义指标
   - 为每个文档设置评估分数（0-10分）
   - 调整指标权重，影响推荐结果

3. **🎯 开始漫游**：
   - 打开插件侧边栏
   - 选择漫游模式：继续漫游、智能推荐或随机漫游
   - 点击开始，系统会推荐下一个文档

4. **📊 查看统计**：
   - 查看文档排行榜
   - 监控阅读进度
   - 分析推荐效果

---

## ⚙️ 高级配置

### 📊 自定义指标设置

```typescript
// 示例：配置个性化指标
const customMetrics = [
    {
        id: "business_importance",
        name: "商业价值",
        weight: 30,
        description: "对工作或业务的重要程度"
    },
    {
        id: "learning_value",
        name: "学习价值",
        weight: 25,
        description: "知识的学习价值"
    }
    // ... 最多支持10个指标
];
```

### 🧠 推荐算法参数

| 参数 | 说明 | 默认值 | 调节建议 |
|------|------|--------|---------|
| 最近锚点数量 | 用于推荐的最近浏览文档数 | 5 | 增加提高关联性 |
| 高频锚点数量 | 用于推荐的高频访问文档数 | 3 | 增加提高稳定性 |
| 推荐结果数量 | 返回的推荐文档数量 | 10 | 根据阅读习惯调节 |
| 最大候选文档数 | 算法考虑的最大文档数 | 200 | 影响性能和推荐质量 |
| 段落采样数量 | 每个文档采样的段落数 | 5 | 影响内容分析精度 |

### 🛡️ 过滤规则示例

```
# 排除模板文件
Templates/*

# 排除归档文件
Archive/**

# 排除特定文件类型
**/*.excalidraw
**/*.canvas

# 排除临时文件
**/tmp/**
**/temp/**
```

---

## 🔧 技术架构

### 📦 项目结构

```
obsidian-incremental-reading/
├── 📁 src/                    # 源代码目录
│   ├── 📁 components/         # 通用组件
│   ├── 📁 services/          # 业务逻辑层
│   ├── 📁 settings/          # 设置页面组件
│   ├── 📁 views/             # 视图组件
│   ├── 📁 types/             # TypeScript 类型定义
│   ├── 📁 utils/             # 工具函数
│   └── 📄 main.ts           # 插件入口文件
├── 📄 main.js               # 编译后的插件文件
├── 📄 manifest.json         # Obsidian 插件清单
├── 📄 package.json          # 项目配置
├── 📄 styles.css            # 插件样式
└── 📄 tsconfig.json         # TypeScript 配置
```

### 🎯 核心算法

#### 优先级计算
```typescript
优先级 = Σ(指标分数 × 指标权重) / Σ(所有指标权重)

选择概率 = (文档优先级 / 所有文档总优先级) × 100%
```

#### 智能推荐评分
```typescript
综合评分 = 相似度 × 0.4 + 优先级 × 0.3 + 时效性 × 0.2 + 访问频率 × 0.1

相似度 = TF-IDF余弦相似度计算
时效性 = 基于最后访问时间的衰减因子
访问频率 = 访问次数的时间加权平均
```

### 🔧 技术特性

- **🎯 TypeScript**：完整的类型定义和类型安全
- **⚡ 模块化架构**：清晰的代码组织和职责分离
- **🔄 响应式设计**：适配不同屏幕尺寸
- **🎨 主题兼容**：完美融入 Obsidian 主题系统
- **🛡️ 错误处理**：完善的异常捕获和用户提示

---

## 🗺️ 发展路线图

### 🎯 v2.1.0 - 云同步版本
- [ ] 🌐 云端设置同步
- [ ] 📊 阅读统计图表
- [ ] 📈 学习进度可视化
- [ ] 📋 阅读报告导出

### 🚀 v2.2.0 - AI 增强版本
- [ ] 🤖 AI 智能文档总结
- [ ] 🌍 多语言文档支持
- [ ] 📱 移动端完整适配
- [ ] 🔌 插件市场发布

### 🎨 v2.3.0 - 体验优化版本
- [ ] 🎨 自定义主题支持
- [ ] ⌨️ 丰富的快捷键配置
- [ ] 🔍 全文搜索功能
- [ ] 🏷️ 标签过滤系统

---

## 🤝 参与贡献

我们欢迎所有形式的贡献！

### 🐛 报告问题
- 发现 Bug？请在 [Issues](https://github.com/yg2224/obsidian-incremental-reading/issues) 中报告
- 详细描述问题现象、复现步骤和环境信息

### 💡 功能建议
- 有新想法？在 [Discussions](https://github.com/yg2224/obsidian-incremental-reading/discussions) 中讨论
- 我们重视每个用户的反馈和建议

### 🔧 代码贡献
```bash
# 1. Fork 项目到您的 GitHub
# 2. 克隆您的 Fork
git clone https://github.com/your-username/obsidian-incremental-reading.git

# 3. 创建功能分支
git checkout -b feature/your-awesome-feature

# 4. 安装依赖并开发
npm install
npm run dev

# 5. 提交更改
git commit -m "Add: your awesome feature"

# 6. 推送到您的 Fork
git push origin feature/your-awesome-feature

# 7. 创建 Pull Request
```

### 📝 代码规范
- 使用 TypeScript 进行开发
- 遵循 ESLint 代码规范
- 添加适当的注释和文档
- 确保所有测试通过
- 提交信息使用清晰的前缀（`Add:`, `Fix:`, `Update:`, `Docs:` 等）

---

## 📄 许可证

本项目采用 **MIT 许可证** - 查看 [LICENSE](LICENSE) 文件了解详情。

---

## 🙏 致谢

### 🌟 特别感谢
- **Obsidian 团队**：提供优秀的知识管理平台
- **原作者 ebAobS**：核心算法和设计思路的贡献
- **开源社区**：无数开发者的工具和库支持
- **所有测试用户**：宝贵的反馈和建议

### 🛠️ 技术致谢
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的 JavaScript
- [Obsidian API](https://docs.obsidian.md/) - 强大的插件开发接口
- [ESBuild](https://esbuild.github.io/) - 快速的 JavaScript 打包工具

---

## 📞 联系方式

- **GitHub 仓库**: [yg2224/obsidian-incremental-reading](https://github.com/yg2224/obsidian-incremental-reading)
- **问题反馈**: [Issues 页面](https://github.com/yg2224/obsidian-incremental-reading/issues)
- **功能讨论**: [Discussions 页面](https://github.com/yg2224/obsidian-incremental-reading/discussions)

---

## ⭐ 支持项目

如果这个插件对您有帮助，请考虑：

- 🌟 **给项目一个 Star** - 让更多人发现这个插件
- 📢 **分享给朋友** - 帮助更多 Obsidian 用户
- 💡 **提出建议** - 帮助我们改进插件
- 🔧 **贡献代码** - 一起完善这个项目

---

<div align="center">

### 🎓 让知识主动找到你，而不是你寻找知识 🎓

**Made with ❤️ and TypeScript**

[⬆️ 返回顶部](#-incremental-reading---智能增量阅读插件)

</div>