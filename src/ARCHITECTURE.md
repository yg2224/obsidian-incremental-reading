# Obsidian Incremental Reading Plugin - 新架构设计

## 🎯 架构目标

1. **功能分块清晰**: 每个模块职责单一，边界清晰
2. **代码复用性**: 减少重复代码，提高维护性
3. **扩展性**: 易于添加新功能和修改现有功能
4. **测试友好**: 便于单元测试和集成测试

## 📁 新目录结构

```
src/
├── core/                    # 🔧 核心业务逻辑层
│   ├── FileManager.ts       # 文件管理核心
│   ├── MetricsEngine.ts     # 指标计算引擎
│   └── RankingEngine.ts     # 排行榜引擎
├── ui/                      # 🎨 用户界面层
│   ├── views/               # 视图容器
│   │   ├── MainView.ts      # 主视图
│   │   └── components/      # UI组件
│   │       ├── FileSelector/     # 文件选择相关
│   │       │   ├── FolderSelector.ts
│   │       │   └── FileSelector.ts
│   │       ├── MetricsDisplay/   # 指标显示相关
│   │       │   ├── MetricsPanel.ts
│   │       │   └── MetricsModal.ts
│   │       └── RankingDisplay/   # 排行榜显示相关
│   │           ├── RankingList.ts
│   │           └── RankingCard.ts
│   └── modals/              # 弹窗
│       ├── BaseModal.ts     # 基础弹窗类
│       ├── FileModal.ts     # 文件相关弹窗
│       └── MetricsModal.ts  # 指标相关弹窗
├── services/                # 🌐 外部服务层
│   ├── CacheService.ts      # 缓存服务
│   └── RecommendationService.ts
├── config/                  # ⚙️ 配置管理层
│   ├── Settings.ts          # 设置类型定义
│   ├── SettingsManager.ts   # 设置管理器
│   └── DefaultSettings.ts   # 默认配置
├── types/                   # 📝 类型定义
│   ├── file.ts              # 文件相关类型
│   ├── metrics.ts           # 指标相关类型
│   ├── ranking.ts           # 排行榜相关类型
│   └── ui.ts                # UI相关类型
├── utils/                   # 🔧 工具函数
│   ├── validation.ts        # 验证工具
│   ├── formatting.ts        # 格式化工具
│   └── helpers.ts           # 辅助函数
├── models/                  # 📊 数据模型 (保持兼容性)
│   └── Settings.ts
└── main.ts                  # 🚀 插件入口
```

## 🔧 核心业务逻辑层

### FileManager.ts
- **职责**: 文件操作、文件夹递归、文件选择
- **核心方法**:
  - `getFilesInFolder()`: 递归获取文件夹文件
  - `addFoldersToRoaming()`: 批量添加文件夹
  - `getValidRoamingFiles()`: 获取有效漫游文件

### MetricsEngine.ts
- **职责**: 指标计算、验证、权重管理
- **核心方法**:
  - `calculatePriority()`: 计算优先级分数
  - `validateMetrics()`: 验证指标值
  - `normalizeWeights()`: 归一化权重

### RankingEngine.ts
- **职责**: 排行榜生成、排序、分析
- **核心方法**:
  - `generateRanking()`: 生成排行榜
  - `getTopDocuments()`: 获取Top文档
  - `analyzeRanking()`: 分析排行榜统计

## 🎨 用户界面层

### 组件化设计
- **FileSelector**: 文件选择组件
- **MetricsDisplay**: 指标显示组件
- **RankingDisplay**: 排行榜显示组件

### Modal设计
- **BaseModal**: 基础Modal类，提供通用功能
- **专用Modal**: 继承BaseModal，实现具体功能

## ⚙️ 配置管理层

### SettingsManager
- **职责**: 设置的CRUD操作、验证、导入导出
- **特性**: 类型安全、自动验证、默认值处理

## 📝 类型定义

### 类型分离
- **file.ts**: 文件相关类型
- **metrics.ts**: 指标相关类型
- **ranking.ts**: 排行榜相关类型
- **ui.ts**: UI相关类型

## 🔄 迁移策略

### 阶段1: 核心层重构 ✅
- [x] 创建 core/ 目录和核心引擎
- [x] 重构文件管理逻辑
- [x] 重构指标计算逻辑
- [x] 重构排行榜逻辑

### 阶段2: UI组件重构 🔄
- [ ] 创建组件化的UI结构
- [ ] 重构Modal为继承体系
- [ ] 分离显示逻辑和业务逻辑

### 阶段3: 配置管理重构 ✅
- [x] 创建SettingsManager
- [x] 分离类型定义
- [ ] 更新设置界面

### 阶段4: 主入口更新 ⏳
- [ ] 更新main.ts使用新架构
- [ ] 更新主视图使用新组件
- [ ] 测试功能完整性

## 🎯 优势

### 1. 清晰的职责分离
- 每个类只负责一个核心功能
- 业务逻辑与UI逻辑分离
- 数据与操作分离

### 2. 更好的可测试性
- 核心逻辑可以独立测试
- UI组件可以单独测试
- 依赖注入支持

### 3. 更容易维护
- 修改某个功能只需要关注对应的模块
- 新增功能有清晰的位置
- 代码复用性更高

### 4. 更好的扩展性
- 新指标类型只需要扩展MetricsEngine
- 新UI组件遵循现有模式
- 新服务可以独立开发

## 📋 TODO

- [ ] 完成UI组件重构
- [ ] 更新主入口文件
- [ ] 编写单元测试
- [ ] 更新文档
- [ ] 性能测试和优化