import { App, Plugin, PluginSettingTab, Setting, TFile, Notice, WorkspaceLeaf } from 'obsidian';
import { IncrementalReadingView, VIEW_TYPE_INCREMENTAL_READING } from './views/IncrementalReadingView';
import { RecommendationService } from './services/RecommendationService';
import { DocumentMetrics, IncrementalReadingSettings, DEFAULT_SETTINGS } from './models/Settings';
import { SharedUtils } from './utils/SharedUtils';

export default class IncrementalReadingPlugin extends Plugin {
	settings: IncrementalReadingSettings;
	recommendationService: RecommendationService;
	leaf: WorkspaceLeaf | null = null;
	private isUpdatingSettings = false;

	async onload() {
		console.log('Loading Incremental Reading plugin');

		// Load settings
		await this.loadSettings();

		// Initialize recommendation service
		this.recommendationService = new RecommendationService(this.app, this.settings);

		// Register view
		this.registerView(
			VIEW_TYPE_INCREMENTAL_READING,
			(leaf) => new IncrementalReadingView(leaf, this)
		);

		// Add ribbon icon
		this.addRibbonIcon('book-open', 'Incremental Reading', () => {
			this.activateView();
		});

		// Add commands
		this.addCommands();

		// Add settings tab
		this.addSettingTab(new IncrementalReadingSettingTab(this.app, this));
	}

	onunload() {
		console.log('Unloading Incremental Reading plugin');
	}

	async loadSettings() {
		try {
			const savedSettings = await this.loadData();
			const validatedSettings = SharedUtils.validateSettings(savedSettings);
			this.settings = Object.assign({}, DEFAULT_SETTINGS, validatedSettings);

			// 检查是否首次运行新版本，如果是则清空漫游列表
			if (!this.settings.version || this.settings.version !== DEFAULT_SETTINGS.version) {
				// 升级版本时，重置漫游列表为空，让用户重新手动添加
				this.settings.roamingDocs = [];
				this.settings.version = DEFAULT_SETTINGS.version;
				await this.saveData(this.settings);

				// 显示升级提示
				new Notice('🎉 漫游阅读功能已升级！请使用"加入漫游"功能重新添加你想漫游的文档');
			}
		} catch (error) {
			console.error('Error loading settings:', error);
			new Notice('Error loading settings, using defaults');
			this.settings = { ...DEFAULT_SETTINGS };
		}
	}

	async saveSettings() {
		if (this.isUpdatingSettings) {
			console.warn('Settings update already in progress, skipping');
			return;
		}

		this.isUpdatingSettings = true;
		try {
			// Validate settings before saving
			const validatedSettings = SharedUtils.validateSettings(this.settings);
			Object.assign(this.settings, validatedSettings);

			await this.saveData(this.settings);
			// Reinitialize service with new settings
			this.recommendationService = new RecommendationService(this.app, this.settings);
		} catch (error) {
			console.error('Error saving settings:', error);
			new Notice('Error saving settings');
		} finally {
			this.isUpdatingSettings = false;
		}
	}

	async activateView() {
		const { workspace } = this.app;

		if (this.leaf) {
			workspace.revealLeaf(this.leaf);
		} else {
			this.leaf = workspace.getRightLeaf(false);
			await this.leaf?.setViewState({ type: VIEW_TYPE_INCREMENTAL_READING, active: true });
		}

		workspace.revealLeaf(this.leaf!);
	}

	private addCommands() {
		this.addCommand({
			id: 'start-incremental-reading',
			name: 'Start Incremental Reading',
			callback: () => {
				this.activateView();
			}
		});

		this.addCommand({
			id: 'open-random-document',
			name: 'Open Random Document',
			callback: () => {
				this.openRandomDocument();
			}
		});

		this.addCommand({
			id: 'add-to-roaming',
			name: '添加至漫游',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					new Notice('没有打开的文档');
					return;
				}

				try {
					// 检查文件类型并添加到漫游文档
					if (activeFile.extension !== 'md') {
						new Notice(`只能添加Markdown文档到漫游列表 "${activeFile.basename}"`);
						return;
					}

					// Add to roaming documents if not already
					if (!this.settings.roamingDocs.includes(activeFile.path)) {
						this.settings.roamingDocs.push(activeFile.path);
					}

					// Update or create metrics
					const metrics = this.getDocumentMetrics(activeFile);
					await this.updateDocumentMetrics(activeFile, {
						priority: metrics.priority || 5.0, // Keep existing priority or use default
						lastVisited: Date.now()
					});

					await this.saveSettings();
					new Notice(`已将 "${activeFile.basename}" 加入漫游`);
				} catch (error) {
					console.error('加入漫游失败:', error);
					new Notice('加入漫游失败');
				}
			}
		});

		this.addCommand({
			id: 'reset-visited-documents',
			name: 'Clear Reading History',
			callback: async () => {
				this.settings.roamingDocs = [];
				// Also reset all visit counts to 0
				for (const [path] of Object.entries(this.settings.documentMetrics)) {
					this.settings.documentMetrics[path].visitCount = 0;
					this.settings.documentMetrics[path].lastVisited = 0;
				}
				await this.saveSettings();
				new Notice('漫游历史已清除');
			}
		});
	}

	/**
	 * 获取有效的漫游文档列表（技术验证）
	 */
	private getValidRoamingFiles(): TFile[] {
		return this.settings.roamingDocs
			.map(path => this.app.vault.getAbstractFileByPath(path))
			.filter((file): file is TFile => {
				// 验证文件存在且是Markdown文件
				return file instanceof TFile && file.extension === 'md';
			});
	}

	/**
	 * 获取有效的漫游文档路径列表
	 */
	private getValidRoamingPaths(): string[] {
		return this.getValidRoamingFiles().map(file => file.path);
	}

	private async openRandomDocument() {
		try {
			const files = this.app.vault.getMarkdownFiles();
			const filteredFiles = files.filter(file =>
				!this.settings.roamingDocs.includes(file.path) &&
				SharedUtils.shouldIncludeFile(file, this.settings.excludedPaths)
			);

			if (filteredFiles.length === 0) {
				new Notice('No unvisited documents found');
				return;
			}

			const randomFile = filteredFiles[Math.floor(Math.random() * filteredFiles.length)];
			await this.app.workspace.getLeaf().openFile(randomFile);

			// Note: Don't automatically add to roaming docs, let user manually add
		} catch (error) {
			console.error('Error opening random document:', error);
			new Notice('Error opening random document');
		}
	}

	
	getDocumentMetrics(file: TFile): DocumentMetrics {
		return SharedUtils.getDocumentMetrics(file, this.settings);
	}

	async updateDocumentMetrics(file: TFile, metrics: Partial<DocumentMetrics>) {
		try {
			// Validate metrics
			const validatedMetrics = SharedUtils.validateMetrics(metrics);
			const updatedMetrics = SharedUtils.updateDocumentMetrics(file, this.settings, validatedMetrics);

			this.settings.documentMetrics[file.path] = updatedMetrics;
			await this.saveSettings();
		} catch (error) {
			console.error('Error updating document metrics:', error);
			new Notice('Error updating document metrics');
		}
	}

	getRecommendedDocuments(limit: number = 10): TFile[] {
		try {
			const files = this.app.vault.getMarkdownFiles();
			// Only include documents that have been manually added to roaming and are valid
			const validRoamingPaths = this.getValidRoamingPaths();
			const filteredFiles = files.filter(file =>
				SharedUtils.shouldIncludeFile(file, this.settings.excludedPaths) &&
				validRoamingPaths.includes(file.path) // Only include valid roaming documents
			);

			// Calculate priority for each document
			const documentsWithPriority = filteredFiles.map(file => {
				const metrics = this.getDocumentMetrics(file);
				const priority = SharedUtils.calculatePriority(metrics, this.settings.metricWeights);
				return { file, priority };
			});

			// Sort by priority (descending)
			documentsWithPriority.sort((a, b) => b.priority - a.priority);

			// Get top recommendations
			return documentsWithPriority
				.slice(0, limit)
				.map(item => item.file);
		} catch (error) {
			console.error('Error getting recommended documents:', error);
			return [];
		}
	}

}

class IncrementalReadingSettingTab extends PluginSettingTab {
	plugin: IncrementalReadingPlugin;

	constructor(app: App, plugin: IncrementalReadingPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: '漫游式渐进阅读插件设置' });

		// 指标权重设置
		containerEl.createEl('h3', { text: '📊 评分权重设置' });

		new Setting(containerEl)
			.setName('难度权重')
			.setDesc('文档的难易程度在最终评分中的影响权重')
			.addSlider(slider => slider
				.setLimits(0, 10, 0.5)
				.setValue(this.plugin.settings.metricWeights.difficulty)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.metricWeights.difficulty = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('重要性权重')
			.setDesc('文档的重要程度在最终评分中的影响权重')
			.addSlider(slider => slider
				.setLimits(0, 10, 0.5)
				.setValue(this.plugin.settings.metricWeights.importance)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.metricWeights.importance = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('紧急度权重')
			.setDesc('文档的紧急程度在最终评分中的影响权重')
			.addSlider(slider => slider
				.setLimits(0, 10, 0.5)
				.setValue(this.plugin.settings.metricWeights.urgency)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.metricWeights.urgency = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('兴趣度权重')
			.setDesc('文档的兴趣程度在最终评分中的影响权重')
			.addSlider(slider => slider
				.setLimits(0, 10, 0.5)
				.setValue(this.plugin.settings.metricWeights.interest)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.metricWeights.interest = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('手动评分权重')
			.setDesc('用户手动设置的评分在最终评分中的影响权重')
			.addSlider(slider => slider
				.setLimits(0, 10, 0.5)
				.setValue(this.plugin.settings.metricWeights.priority)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.metricWeights.priority = value;
					await this.plugin.saveSettings();
				}));

		// 智能推荐设置
		containerEl.createEl('h3', { text: '🧠 智能推荐设置' });

		new Setting(containerEl)
			.setName('最近浏览锚点数量')
			.setDesc('智能推荐时使用的最近浏览文档数量（作为推荐基准）')
			.addSlider(slider => slider
				.setLimits(1, 20, 1)
				.setValue(this.plugin.settings.recommendationSettings.recentCount)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.recommendationSettings.recentCount = Math.floor(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('高频访问锚点数量')
			.setDesc('智能推荐时使用的漫游次数最多的文档数量（作为推荐基准）')
			.addSlider(slider => slider
				.setLimits(1, 20, 1)
				.setValue(this.plugin.settings.recommendationSettings.topCount)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.recommendationSettings.topCount = Math.floor(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('推荐结果数量')
			.setDesc('智能推荐算法返回的推荐文档数量')
			.addSlider(slider => slider
				.setLimits(5, 50, 1)
				.setValue(this.plugin.settings.recommendationSettings.topK)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.recommendationSettings.topK = Math.floor(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('最大候选文档数')
			.setDesc('智能推荐算法考虑的最大文档数量（影响性能和推荐质量）')
			.addSlider(slider => slider
				.setLimits(50, 500, 10)
				.setValue(this.plugin.settings.maxCandidates)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.maxCandidates = Math.floor(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('文档段落采样数量')
			.setDesc('智能推荐时从每个文档采样的段落数量（包含标题+头/中/尾段落）')
			.addSlider(slider => slider
				.setLimits(3, 10, 1)
				.setValue(this.plugin.settings.recommendationSettings.maxParagraphs)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.recommendationSettings.maxParagraphs = Math.floor(value);
					await this.plugin.saveSettings();
				}));

		// 文档过滤设置
		containerEl.createEl('h3', { text: '📁 文档过滤设置' });

		new Setting(containerEl)
			.setName('排除路径')
			.setDesc('要从漫游中排除的文件夹路径（每行一个，支持*通配符匹配）')
			.addTextArea(text => text
				.setPlaceholder('示例：\nTemplates/*\nArchive/**\n.obsidian/**\n**/*.excalidraw')
				.setValue(this.plugin.settings.excludedPaths.join('\n'))
				.onChange(async (value) => {
					this.plugin.settings.excludedPaths = value.split('\n').filter(p => p.trim());
					await this.plugin.saveSettings();
				}));

		// 数据管理
		containerEl.createEl('h3', { text: '🗂️ 数据管理' });

		new Setting(containerEl)
			.setName('清除漫游历史')
			.setDesc('清除所有漫游历史记录和访问次数（此操作不可撤销，请谨慎操作）')
			.addButton(button => button
				.setButtonText('🗑️ 清除所有历史')
				.onClick(async () => {
					// 确认对话框
					if (confirm('确定要清除所有漫游历史吗？\n这将清空漫游列表并重置所有文档的访问次数。\n\n此操作不可撤销！')) {
						this.plugin.settings.roamingDocs = [];
						// Also reset all visit counts to 0
						for (const [path] of Object.entries(this.plugin.settings.documentMetrics)) {
							this.plugin.settings.documentMetrics[path].visitCount = 0;
							this.plugin.settings.documentMetrics[path].lastVisited = 0;
						}
						await this.plugin.saveSettings();
						new Notice('✅ 所有漫游历史已清除');
					}
				}));
	}
}