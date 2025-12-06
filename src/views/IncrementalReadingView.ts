import { ItemView, WorkspaceLeaf, TFile, Notice, setIcon } from 'obsidian';
import IncrementalReadingPlugin from '../main';
import { DocumentMetrics } from '../models/Settings';
import { SharedUtils } from '../utils/SharedUtils';
import { Modal, SliderModal, LoadingIndicator, ErrorBoundary, DocumentMetricsModal } from '../components/Modal';

export const VIEW_TYPE_INCREMENTAL_READING = 'incremental-reading-view';

export class IncrementalReadingView extends ItemView {
	plugin: IncrementalReadingPlugin;
	private currentFile: TFile | null = null;
	private currentMetrics: DocumentMetrics | null = null;
	private loadingIndicator: LoadingIndicator | null = null;
	private errorBoundary: ErrorBoundary | null = null;
	private stylesAdded = false;
		private visitTable: HTMLElement | null = null;
	private priorityTable: HTMLElement | null = null;
	private recommendationsList: HTMLElement | null = null; // 推荐列表
	private visitRankList: HTMLElement | null = null; // 访问次数排行榜
	private priorityRankList: HTMLElement | null = null; // 优先级排行榜
	private chanceSpan: HTMLElement | null = null; // 相似度概率显示元素
	private continueBtn: HTMLButtonElement | null = null; // 继续漫游按钮引用
	private docStatsElement: HTMLElement | null = null; // 文档统计显示元素
	private addRoamingBtn: HTMLButtonElement | null = null; // 加入漫游按钮引用
	private navButtons: HTMLButtonElement[] = []; // 导航按钮数组
	private currentActiveSection: string = 'metrics'; // 当前激活的界面
	private tabButtons: HTMLButtonElement[] = []; // 标签页按钮数组
	private tabSlider: HTMLElement | null = null; // 滑动的白色方块
	private currentActiveTab: string = 'metrics'; // 当前激活的标签页
	private currentTabIndex: number = 0; // 当前激活的标签页索引

	// 防抖相关
	private updateRecommendationsTimeout: NodeJS.Timeout | null = null;
	private isUpdatingRecommendations = false;

	constructor(leaf: WorkspaceLeaf, plugin: IncrementalReadingPlugin) {
		super(leaf);
		this.plugin = plugin;

		// Initialize components
		this.errorBoundary = new ErrorBoundary(document.body, 'View initialization failed');
		this.loadingIndicator = new LoadingIndicator(document.body);
	}

	getViewType() {
		return VIEW_TYPE_INCREMENTAL_READING;
	}

	getDisplayText() {
		return 'Incremental Reading';
	}

	getIcon() {
		return 'book-open';
	}

	async onOpen() {
		// Create view with error handling
		this.createView();
	}

	async onClose() {
		// Cleanup when view is closed
		this.cleanup();
	}

	private createView() {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass('plugin-container');

		// Create layout according to reference prototype
		this.createHeroSection(container);
		this.createSlidingNavigation(container);
		this.createContentArea(container);

		// Add CSS styles
		this.addSiyuanStyles();

		// Listen for file changes
		this.registerEvent(
			this.app.workspace.on('file-open', (file) => {
				this.onFileOpen(file);
			})
		);

		// Initial data load
		this.refreshSiyuanData();

		// Initialize interface - show only metrics section by default
		setTimeout(() => {
			this.hideAllSections();
			this.showSection('metrics');
		}, 100);
	}

	private createHeroSection(container: HTMLElement) {
		// 区域一：顶部核心面板 - 按照参考原型
		const heroSection = container.createEl('div', { cls: 'hero-section' });

		// Main Title
		heroSection.createEl('h1', { cls: 'main-title', text: '漫游式渐进阅读' });

		// Poetic Subtitle - 完全按照HTML格式
		const subtitle = heroSection.createEl('p', { cls: 'poetic-subtitle' });
		subtitle.innerHTML = '"展卷乃无言的情意：以<span class=\"chance\">等待漫游...</span>的机遇，<br>穿越星辰遇见你，三秋霜雪印马蹄。"';
		// 查找span元素用于显示概率
		this.chanceSpan = subtitle.querySelector('.chance');

		// Status Text
		const docCount = this.getVisitedDocumentCount();
		this.docStatsElement = heroSection.createEl('div', { cls: 'status-text' });
		this.docStatsElement.textContent = `${docCount} 篇漫游文档${docCount === 0 ? ' (无漫游文档)' : ''}`;

		// Action Bar - 按照参考原型
		this.createActionBar(heroSection);
	}

	private createActionBar(heroSection: HTMLElement) {
		const actionBar = heroSection.createEl('div', { cls: 'action-bar' });

		// Continue Reading button
		this.continueBtn = actionBar.createEl('button', {
			cls: 'btn primary',
			text: '继续漫游'
		});
		this.continueBtn.onclick = () => this.continueReading();
		this.updateContinueButtonState(this.continueBtn);

		// Smart Recommendations button
		const recommendBtn = actionBar.createEl('button', {
			cls: 'btn',
			text: '智能推荐'
		});
		recommendBtn.onclick = () => this.getSmartRecommendations();

		// Status Update button
		const refreshDataBtn = actionBar.createEl('button', {
			cls: 'btn',
			text: '状态更新'
		});
		refreshDataBtn.onclick = () => this.refreshSiyuanData();

		// Random Roaming button
		const randomRoamBtn = actionBar.createEl('button', {
			cls: 'btn',
			text: '随机漫游'
		});
		randomRoamBtn.onclick = () => this.randomRoaming();

		// Add to Roaming button
		this.addRoamingBtn = actionBar.createEl('button', {
			cls: 'btn',
			text: '加入漫游'
		});
		this.addRoamingBtn.onclick = () => this.addCurrentToRoaming();
		this.updateAddRoamingButtonState();
	}

	private createSlidingNavigation(container: HTMLElement) {
		const navSection = container.createEl('div', { cls: 'sliding-navigation' });

		const tabContainer = navSection.createEl('div', { cls: 'tabs-wrapper' });

		// Create sliding indicator
		this.tabSlider = tabContainer.createEl('div', { cls: 'tab-slider' });

		const tabs = [
			{ id: 'metrics', label: '文档指标', icon: '' },
			{ id: 'recommendations', label: '智能推荐', icon: '' },
			{ id: 'ranking', label: '漫游排行', icon: '' }
		];

		// Store tab buttons for state management
		this.tabButtons = [];

		tabs.forEach((tab, index) => {
			const tabBtn = tabContainer.createEl('button', {
				cls: 'tab-btn',
				text: tab.label
			});
			tabBtn.setAttribute('data-target', tab.id);
			tabBtn.onclick = () => this.switchToTab(tab.id, index);

			this.tabButtons.push(tabBtn);
		});

		// Set default active tab
		this.currentActiveTab = 'metrics';
		this.currentTabIndex = 0;
		this.updateTabSlider();
	}

	private switchToTab(tabId: string, index: number) {
		if (this.currentActiveTab === tabId) return;

		this.currentActiveTab = tabId;
		this.currentTabIndex = index;

		// Update tab button states
		this.tabButtons.forEach((btn, i) => {
			if (i === index) {
				btn.classList.add('active');
			} else {
				btn.classList.remove('active');
			}
		});

		// Update slider position
		this.updateTabSlider();

		// Show corresponding section
		this.hideAllSections();
		this.showSection(tabId);
	}

	private updateTabSlider() {
		if (!this.tabSlider || this.tabButtons.length === 0) return;

		// Simple animation: move slider by percentage
		const percentage = this.currentTabIndex * 100;
		this.tabSlider.style.transform = `translateX(${percentage}%)`;
	}

	private hideAllSections() {
		const sections = this.containerEl.querySelectorAll('.content-section');
		sections.forEach(section => {
			(section as HTMLElement).style.display = 'none';
		});
	}

	private showSection(sectionId: string) {
		const section = this.containerEl.querySelector(`.${sectionId}-section`) as HTMLElement;
		if (section) {
			section.style.display = 'block';
		}
	}

	private createContentArea(container: HTMLElement) {
		const contentArea = container.createEl('div', { cls: 'content-area' });

		// Metrics Section
		const metricsSection = contentArea.createEl('div', { cls: 'content-section metrics-section' });
		this.createMetricsContent(metricsSection);

		// Recommendations Section
		const recommendationsSection = contentArea.createEl('div', { cls: 'content-section recommendations-section' });
		this.createRecommendationsContent(recommendationsSection);

		// Ranking Section
		const rankingSection = contentArea.createEl('div', { cls: 'content-section ranking-section' });
		this.createRankingContent(rankingSection);
	}

	
	private createMetricsContent(section: HTMLElement) {
		// 根据需求文档，移除了section标题，直接显示内容
		const currentFile = this.app.workspace.getActiveFile();
		if (currentFile && this.currentMetrics) {
			this.createCurrentDocumentMetricsWithScoring(section, currentFile, this.currentMetrics);
		} else {
			section.createEl('p', { cls: 'empty-message', text: '请打开文档查看指标' });
		}
	}

	
	private createRecommendationsContent(section: HTMLElement) {
		// 创建推荐内容容器
		const recommendationsWrapper = section.createEl('div', { cls: 'recommendations-wrapper' });

		this.recommendationsList = recommendationsWrapper.createEl('div', { cls: 'recommendations-list' });
		this.updateRecommendationsList();

		// 在右下角添加刷新按钮
		const refreshBtn = section.createEl('button', {
			cls: 'floating-refresh-btn',
			text: '🔄 刷新'
		});
		refreshBtn.onclick = () => this.refreshRecommendations();
	}

	private createRankingContent(section: HTMLElement) {
		// 创建排行内容容器
		const rankingWrapper = section.createEl('div', { cls: 'ranking-wrapper' });

		const rankingContainer = rankingWrapper.createEl('div', { cls: 'ranking-container' });

		// Visit Count Ranking
		const visitRankSection = rankingContainer.createEl('div', { cls: 'rank-section' });
		visitRankSection.createEl('h3', { cls: 'rank-title', text: '📈 漫游次数排行' });
		this.visitRankList = visitRankSection.createEl('div', { cls: 'rank-list' });

		// Priority Ranking
		const priorityRankSection = rankingContainer.createEl('div', { cls: 'rank-section' });
		priorityRankSection.createEl('h3', { cls: 'rank-title', text: '⭐ 优先级排行' });
		this.priorityRankList = priorityRankSection.createEl('div', { cls: 'rank-list' });

		// Update rankings
		this.updateRankings();

		// 在右下角添加刷新按钮
		const refreshBtn = section.createEl('button', {
			cls: 'floating-refresh-btn ranking-refresh',
			text: '🔄 刷新'
		});
		refreshBtn.onclick = () => {
			this.updateRankings();
			new Notice('排行榜已刷新');
		};
	}

	private updateRankings() {
		this.updateVisitRanking();
		this.updatePriorityRanking();
	}

	private updateVisitRanking() {
		if (!this.visitRankList) return;

		this.visitRankList.empty();

		const validFiles = this.getValidRoamingFiles();
		const filesWithMetrics = validFiles.map(file => ({
			file,
			metrics: this.plugin.getDocumentMetrics(file)
		}));

		// Sort by visit count (descending)
		filesWithMetrics.sort((a, b) => b.metrics.visitCount - a.metrics.visitCount);

		// Display top 10 with completely new structure
		filesWithMetrics.slice(0, 10).forEach((item, index) => {
			const rankItem = this.visitRankList.createEl('div', { cls: 'ranking-item' });

			// Rank - fixed width circle background
			const rankCol = rankItem.createEl('div', { cls: 'rank-col' });
			const rankNumber = rankCol.createEl('span', { cls: 'rank-badge' });
			rankNumber.textContent = `${index + 1}`;

			// Date/Name - takes remaining space
			const dateCol = rankItem.createEl('div', { cls: 'date-col' });
			const fileName = dateCol.createEl('span', { cls: 'file-name' });
			fileName.textContent = item.file.basename;

			// Count - right aligned
			const countCol = rankItem.createEl('div', { cls: 'count-col' });
			const visitCount = countCol.createEl('span', { cls: 'visit-count' });
			visitCount.textContent = `${item.metrics.visitCount}次`;
		});
	}

	private updatePriorityRanking() {
		if (!this.priorityRankList) return;

		this.priorityRankList.empty();

		const validFiles = this.getValidRoamingFiles();
		const filesWithPriority = validFiles.map(file => ({
			file,
			priority: this.calculatePriority(this.plugin.getDocumentMetrics(file))
		}));

		// Sort by priority (descending)
		filesWithPriority.sort((a, b) => b.priority - a.priority);

		// Display top 10 with completely new structure
		filesWithPriority.slice(0, 10).forEach((item, index) => {
			const rankItem = this.priorityRankList.createEl('div', { cls: 'ranking-item' });

			// Rank - fixed width circle background
			const rankCol = rankItem.createEl('div', { cls: 'rank-col' });
			const rankNumber = rankCol.createEl('span', { cls: 'rank-badge' });
			rankNumber.textContent = `${index + 1}`;

			// Date/Name - takes remaining space
			const dateCol = rankItem.createEl('div', { cls: 'date-col' });
			const fileName = dateCol.createEl('span', { cls: 'file-name' });
			fileName.textContent = item.file.basename;

			// Count - right aligned (priority score)
			const countCol = rankItem.createEl('div', { cls: 'count-col' });
			const priorityScore = countCol.createEl('span', { cls: 'priority-score' });
			priorityScore.textContent = `${(item.priority / 10).toFixed(1)}`;
		});
	}

	// Helper methods
	private getVisitedDocumentCount(): number {
		// 使用技术方式验证实际的漫游文档数量
		const validRoamingDocs = this.plugin.settings.roamingDocs.filter(path => {
			const file = this.app.vault.getAbstractFileByPath(path);
			return file instanceof TFile && file.extension === 'md'; // 确保是Markdown文件且文件存在
		});

		return validRoamingDocs.length;
	}

	/**
	 * 获取有效的漫游文档列表（技术验证）
	 */
	private getValidRoamingFiles(): TFile[] {
		return this.plugin.settings.roamingDocs
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

	/**
	 * 更新文档统计显示
	 */
	private updateDocStatsDisplay() {
		if (this.docStatsElement) {
			const docCount = this.getVisitedDocumentCount();
			this.docStatsElement.empty();
			this.docStatsElement.createEl('span', { text: `${docCount}篇漫游文档` });
		}
	}

	/**
	 * 更新加入漫游按钮的状态
	 */
	private updateAddRoamingButtonState() {
		if (!this.addRoamingBtn) return;

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			// 没有打开文档
			this.addRoamingBtn.disabled = true;
			this.addRoamingBtn.classList.add('disabled');
			this.addRoamingBtn.textContent = '加入漫游';
			this.addRoamingBtn.title = '请先打开一个文档';
			return;
		}

		if (activeFile.extension !== 'md') {
			// 不是Markdown文档
			this.addRoamingBtn.disabled = true;
			this.addRoamingBtn.classList.add('disabled');
			this.addRoamingBtn.textContent = '仅支持Markdown文档';
			this.addRoamingBtn.title = '只能添加Markdown文档到漫游列表';
			return;
		}

		if (this.plugin.settings.roamingDocs.includes(activeFile.path)) {
			// 已经在漫游列表中
			this.addRoamingBtn.disabled = true;
			this.addRoamingBtn.classList.add('disabled');
			this.addRoamingBtn.textContent = '已加入漫游';
			this.addRoamingBtn.title = `该文档已在漫游列表中`;
		} else {
			// 可以添加
			this.addRoamingBtn.disabled = false;
			this.addRoamingBtn.classList.remove('disabled');
			this.addRoamingBtn.textContent = '加入漫游';
			this.addRoamingBtn.title = `将 "${activeFile.basename}" 添加到漫游列表`;
		}
	}

	private createMetricsPanel(panel: HTMLElement) {
		// Panel header
		const header = panel.createEl('div', { cls: 'panel-header' });
		header.createEl('h3', { cls: 'panel-title', text: '文档指标' });
		const expandBtn = header.createEl('button', { cls: 'expand-btn', text: '▲' });
		expandBtn.onclick = () => this.togglePanelExpansion(panel);

		// Current document info with scoring
		const currentFile = this.app.workspace.getActiveFile();
		if (currentFile && this.currentMetrics) {
			this.createCurrentDocumentMetricsWithScoring(panel, currentFile, this.currentMetrics);
		} else {
			const emptyMetrics = panel.createEl('div', { cls: 'empty-metrics' });
			emptyMetrics.createEl('p', { text: '请打开文档查看指标' });
		}

		// Action buttons - 移除优先对齐和刷新推荐按钮
		const actions = panel.createEl('div', { cls: 'metric-actions' });

		this.continueBtn = actions.createEl('button', {
			cls: 'action-btn primary',
			text: '继续漫游'
		});
		this.continueBtn.onclick = () => this.continueReading();

		// 更新按钮状态
		this.updateContinueButtonState(this.continueBtn);

		const recommendBtn = actions.createEl('button', {
			cls: 'action-btn secondary',
			text: '智能推荐'
		});
		recommendBtn.onclick = () => this.getSmartRecommendations();

		// NEW: 添加状态更新按钮
		const refreshDataBtn = actions.createEl('button', {
			cls: 'action-btn secondary',
			text: '状态更新'
		});
		refreshDataBtn.onclick = () => this.refreshSiyuanData();

		const randomRoamBtn = actions.createEl('button', {
			cls: 'action-btn secondary',
			text: '随机漫游'
		});
		randomRoamBtn.onclick = () => this.randomRoaming(); // NEW: 随机漫游

		this.addRoamingBtn = actions.createEl('button', {
			cls: 'action-btn secondary',
			text: '加入漫游'
		});
		this.addRoamingBtn.onclick = () => this.addCurrentToRoaming();

		// 更新按钮状态
		this.updateAddRoamingButtonState();
	}

	private createCurrentDocumentMetricsWithScoring(panel: HTMLElement, file: TFile, metrics: DocumentMetrics) {
		const metricsContent = panel.createEl('div', { cls: 'metrics-content' });

		// Comprehensive scoring sliders section
		const scoringSection = metricsContent.createEl('div', { cls: 'comprehensive-scoring-section' });
		scoringSection.createEl('h4', { cls: 'scoring-title', text: '📊 文档评分' });

		// Create slider for each metric
		const createMetricSlider = (label: string, key: keyof DocumentMetrics, value: number, color: string) => {
			const sliderGroup = scoringSection.createEl('div', { cls: 'metric-slider-group' });

			const labelContainer = sliderGroup.createEl('div', { cls: 'slider-label-container' });
			labelContainer.createEl('div', { cls: 'slider-label', text: label });
			const valueDisplay = labelContainer.createEl('div', { cls: 'slider-value', text: value.toFixed(1) });
			valueDisplay.style.color = color;

			const slider = sliderGroup.createEl('input', {
				type: 'range',
				cls: 'metric-slider'
			});
			slider.min = '0';
			slider.max = '10';
			slider.step = '0.1';
			slider.value = value.toString();

			slider.addEventListener('input', () => {
				const newValue = parseFloat(slider.value);
				valueDisplay.textContent = newValue.toFixed(1);
			});

			slider.addEventListener('change', async () => {
				const newValue = parseFloat(slider.value);
				console.log(`滑块变化: ${label} = ${newValue}`);

				await this.plugin.updateDocumentMetrics(file, { [key]: newValue });
				this.currentMetrics = this.plugin.getDocumentMetrics(file);

				console.log('更新后的当前指标:', this.currentMetrics);

				// 计算新的优先级
				const newCalculatedPriority = this.calculatePriority(this.currentMetrics);
				const newDisplayPriority = newCalculatedPriority / 10; // Convert: 63.2 → 6.3
				console.log(`新的计算优先级: ${newCalculatedPriority} → 显示优先级: ${newDisplayPriority}`);

				// 直接更新优先级显示
				const prioritySection = this.containerEl.querySelector('.priority-section');
				if (prioritySection && (prioritySection as any)._priorityValue) {
					(prioritySection as any)._priorityValue.textContent = `${newCalculatedPriority.toFixed(2)} → ${newDisplayPriority.toFixed(1)}`;
				}

				this.updatePriorityTable(); // Also update priority table
				new Notice(`已将 "${file.basename}" 的${label}更新为 ${newValue.toFixed(1)}，计算优先级: ${newDisplayPriority.toFixed(1)}`);
			});

			return slider;
		};

		// Create sliders for 4 metrics (excluding manual priority)
		createMetricSlider('难度 (Difficulty)', 'difficulty', metrics.difficulty, '#ff6b6b');
		createMetricSlider('重要性 (Importance)', 'importance', metrics.importance, '#4ecdc4');
		createMetricSlider('紧急度 (Urgency)', 'urgency', metrics.urgency, '#45b7d1');
		createMetricSlider('兴趣度 (Interest)', 'interest', metrics.interest, '#f9ca24');

		// Calculated Priority Section
		const prioritySection = metricsContent.createEl('div', { cls: 'priority-section' });
		prioritySection.createEl('div', { cls: 'priority-label', text: '⭐ 计算优先级' });

		const calculatedPriority = this.calculatePriority(metrics);
		const displayPriority = calculatedPriority / 10; // Convert: 63.2 → 6.3
		const priorityValue = prioritySection.createEl('div', { cls: 'priority-value', text: `${calculatedPriority.toFixed(2)} → ${displayPriority.toFixed(1)}` });

		// Store reference for updating
		(prioritySection as any)._priorityValue = priorityValue;
		(prioritySection as any)._calculatedPriority = calculatedPriority;
		(prioritySection as any)._displayPriority = displayPriority;

		// Weight breakdown
		const weights = this.plugin.settings.metricWeights;
		const breakdown = metricsContent.createEl('div', { cls: 'weight-breakdown' });
		breakdown.createEl('h5', { text: '权重分配' });

		const weightItems = [
			{ key: 'difficulty', label: '难度', color: '#ff6b6b' },
			{ key: 'importance', label: '重要性', color: '#4ecdc4' },
			{ key: 'urgency', label: '紧急度', color: '#45b7d1' },
			{ key: 'interest', label: '兴趣度', color: '#f9ca24' }
		];

		weightItems.forEach(item => {
			const weightItem = breakdown.createEl('div', { cls: 'weight-item' });
			const weightLabel = weightItem.createEl('div', {
				cls: 'weight-label',
				text: `${item.label}(${Math.round(weights[item.key as keyof typeof weights] * 10)}%)`
			});
			weightLabel.style.color = item.color;
			weightItem.createEl('div', { cls: 'weight-value', text: metrics[item.key as keyof DocumentMetrics].toFixed(2) });
		});

		// Visit stats
		const visitStats = metricsContent.createEl('div', { cls: 'visit-stats' });
		visitStats.createEl('div', { cls: 'visit-stat', text: `📖 漫游次数：${metrics.visitCount}` });

		if (metrics.lastVisited) {
			const lastVisit = new Date(metrics.lastVisited);
			const dateStr = `${lastVisit.getFullYear()}-${String(lastVisit.getMonth() + 1).padStart(2, '0')}-${String(lastVisit.getDate()).padStart(2, '0')} ${String(lastVisit.getHours()).padStart(2, '0')}:${String(lastVisit.getMinutes()).padStart(2, '0')}`;
			visitStats.createEl('div', { cls: 'visit-stat', text: `🕐 上次访问：${dateStr}` });
		}
	}

	private updateCalculatedPriority() {
		const prioritySection = this.containerEl.querySelector('.priority-section');
		if (prioritySection && (prioritySection as any)._priorityValue) {
			const calculatedPriority = this.calculatePriority(this.currentMetrics);
			const displayPriority = calculatedPriority / 10; // Convert: 63.2 → 6.3
			(prioritySection as any)._priorityValue.textContent = `${calculatedPriority.toFixed(2)} → ${displayPriority.toFixed(1)}`;
			(prioritySection as any)._calculatedPriority = calculatedPriority;
			(prioritySection as any)._displayPriority = displayPriority;
		}
	}

	private calculatePriority(metrics: DocumentMetrics): number {
		const weights = this.plugin.settings.metricWeights;
		console.log('当前权重设置:', weights);
		console.log('输入的指标数据:', metrics);

		// 确保所有数值存在且为数字
		const difficulty = metrics.difficulty || 5.0;
		const importance = metrics.importance || 5.0;
		const urgency = metrics.urgency || 5.0;
		const interest = metrics.interest || 5.0;
		const priority = metrics.priority || 5.0;

		const difficultyScore = difficulty * weights.difficulty;
		const importanceScore = importance * weights.importance;
		const urgencyScore = urgency * weights.urgency;
		const interestScore = interest * weights.interest;
		const priorityScore = priority * weights.priority;

		const calculatedPriority = difficultyScore + importanceScore + urgencyScore + interestScore + priorityScore;

		console.log(`详细计算过程:`, {
			难度: `${difficulty}×${weights.difficulty}=${difficultyScore}`,
			重要性: `${importance}×${weights.importance}=${importanceScore}`,
			紧急度: `${urgency}×${weights.urgency}=${urgencyScore}`,
			兴趣度: `${interest}×${weights.interest}=${interestScore}`,
			手动优先级: `${priority}×${weights.priority}=${priorityScore}`,
			计算结果: calculatedPriority
		});

		return calculatedPriority;
	}

	private createCurrentDocumentMetrics(panel: HTMLElement, file: TFile, metrics: DocumentMetrics) {
		const metricsContent = panel.createEl('div', { cls: 'metrics-content' });

		// Priority display
		const prioritySection = metricsContent.createEl('div', { cls: 'priority-section' });
		prioritySection.createEl('div', { cls: 'priority-label', text: '优先级' });
		const priorityValue = prioritySection.createEl('div', { cls: 'priority-value', text: metrics.priority.toFixed(2) });

		// Weight breakdown
		const weights = this.plugin.settings.metricWeights;
		const breakdown = metricsContent.createEl('div', { cls: 'weight-breakdown' });

		const importanceItem = breakdown.createEl('div', { cls: 'weight-item' });
		importanceItem.createEl('div', { cls: 'weight-label', text: `重要性(${Math.round(weights.importance * 10)}%)` });
		importanceItem.createEl('div', { cls: 'weight-value', text: metrics.importance.toFixed(2) });

		const urgencyItem = breakdown.createEl('div', { cls: 'weight-item' });
		urgencyItem.createEl('div', { cls: 'weight-label', text: `紧急度(${Math.round(weights.urgency * 10)}%)` });
		urgencyItem.createEl('div', { cls: 'weight-value', text: metrics.urgency.toFixed(2) });

		const difficultyItem = breakdown.createEl('div', { cls: 'weight-item' });
		difficultyItem.createEl('div', { cls: 'weight-label', text: `难度(${Math.round(weights.difficulty * 10)}%)` });
		difficultyItem.createEl('div', { cls: 'weight-value', text: metrics.difficulty.toFixed(2) });

		// Visit stats
		const visitStats = metricsContent.createEl('div', { cls: 'visit-stats' });
		visitStats.createEl('div', { cls: 'visit-stat', text: `浸游次数：${metrics.visitCount}` });

		if (metrics.lastVisited) {
			const lastVisit = new Date(metrics.lastVisited);
			const dateStr = `${lastVisit.getFullYear()}-${String(lastVisit.getMonth() + 1).padStart(2, '0')}-${String(lastVisit.getDate()).padStart(2, '0')} ${String(lastVisit.getHours()).padStart(2, '0')}:${String(lastVisit.getMinutes()).padStart(2, '0')}`;
			visitStats.createEl('div', { cls: 'visit-stat', text: `上次访问：${dateStr}` });
		}
	}

	
	private createTablesPanel(tablesPanel: HTMLElement) {
		// Recommendations table - NEW!
		const recommendationsSection = tablesPanel.createEl('div', { cls: 'table-section' });
		const recHeader = recommendationsSection.createEl('div', { cls: 'table-header' });
		recHeader.createEl('h3', { cls: 'table-title', text: '智能推荐列表' });
		const recControls = recHeader.createEl('div', { cls: 'table-controls' });
		const showMoreBtn = recControls.createEl('button', {
			cls: 'table-btn',
			text: '显示更多'
		});
		showMoreBtn.onclick = () => this.showMoreRecommendations();

		this.recommendationsList = recommendationsSection.createEl('div', { cls: 'recommendations-list' });

		// Visit count table
		const visitTableSection = tablesPanel.createEl('div', { cls: 'table-section' });
		const visitHeader = visitTableSection.createEl('div', { cls: 'table-header' });
		visitHeader.createEl('h3', { cls: 'table-title', text: '漫游次数排序表' });
		const visitControls = visitHeader.createEl('div', { cls: 'table-controls' });
		const visitRefreshBtn = visitControls.createEl('button', {
			cls: 'table-btn',
			text: '刷新列表'
		});
		visitRefreshBtn.onclick = () => this.refreshVisitTable();

		this.visitTable = visitTableSection.createEl('div', { cls: 'visit-table' });

		// Priority table
		const priorityTableSection = tablesPanel.createEl('div', { cls: 'table-section' });
		const priorityHeader = priorityTableSection.createEl('div', { cls: 'table-header' });
		priorityHeader.createEl('h3', { cls: 'table-title', text: '优先级排序表' });
		const priorityControls = priorityHeader.createEl('div', { cls: 'table-controls' });
		priorityControls.createEl('div', { cls: 'table-filter', text: '刷新列表' });

		this.priorityTable = priorityTableSection.createEl('div', { cls: 'priority-table' });
	}

	private createHeader(container: HTMLElement) {
		const header = container.createEl('div', { cls: 'ir-header' });

		// Title and statistics
		const titleSection = header.createEl('div', { cls: 'ir-title-section' });
		titleSection.createEl('h1', { cls: 'ir-title', text: '智能学习' });

		// Statistics row
		const statsRow = titleSection.createEl('div', { cls: 'ir-stats-row' });
		statsRow.createEl('span', { cls: 'ir-stat', text: '📚 待学习: 0' });
		statsRow.createEl('span', { cls: 'ir-stat', text: '📖 已学习: 0' });
		statsRow.createEl('span', { cls: 'ir-stat', text: '🔄 已复习: 0' });
		statsRow.createEl('span', { cls: 'ir-stat', text: '⏰ 间隔: 0天' });

		// Control buttons
		const controls = header.createEl('div', { cls: 'ir-controls' });

		const scheduleBtn = controls.createEl('button', {
			cls: 'ir-btn ir-btn-primary',
			text: '智能调度'
		});
		scheduleBtn.onclick = () => this.scheduleDocuments();

		const addBtn = controls.createEl('button', {
			cls: 'ir-btn ir-btn-secondary',
			text: '加入漫游'
		});
		addBtn.onclick = () => this.addCurrentToRoaming();

		const priorityBtn = controls.createEl('button', {
			cls: 'ir-btn ir-btn-secondary',
			text: '⭐ 手动优先级'
		});
		priorityBtn.onclick = () => this.showPriorityAdjustment();
	}

	private createContent(container: HTMLElement) {
		const content = container.createEl('div', { cls: 'ir-content' });

		// Create document cards list (replaced with SiYuan style)
		// this.documentList = content.createEl('div', { cls: 'ir-document-list' });
		// this.updateDocumentList();
	}

	private createFooter(container: HTMLElement) {
		const footer = container.createEl('div', { cls: 'ir-footer' });
		footer.createEl('div', { cls: 'ir-footer-text', text: '基于智能算法的增量阅读系统' });
	}

	
	// SiYuan-specific methods
	private refreshSiyuanData() {
		this.updateCurrentDocument();

		// Update all content sections
		this.updateMetricsContent();
		this.updateRecommendationsList();
		this.updateRankings();

		// 更新文档统计显示
		this.updateDocStatsDisplay();

		// 更新按钮状态
		if (this.continueBtn) {
			this.updateContinueButtonState(this.continueBtn);
		}
		if (this.addRoamingBtn) {
			this.updateAddRoamingButtonState();
		}
	}

	private updateMetricsContent() {
		const metricsSection = this.containerEl.querySelector('.metrics-section') as HTMLElement;
		if (metricsSection) {
			metricsSection.empty();
			this.createMetricsContent(metricsSection);
		}
	}

	private updateCurrentDocument() {
		const currentFile = this.app.workspace.getActiveFile();
		if (currentFile) {
			this.currentFile = currentFile;
			this.currentMetrics = this.plugin.getDocumentMetrics(currentFile);
		}

		// Refresh metrics panel
		const metricsPanel = this.containerEl.querySelector('.metrics-panel');
		if (metricsPanel) {
			metricsPanel.empty();
			this.createMetricsPanel(metricsPanel as HTMLElement);
		}
	}

	
	private updateVisitTable() {
		if (!this.visitTable) return;

		this.visitTable.empty();

		// 使用技术验证确保只显示有效的漫游文档
		const validRoamingPaths = this.getValidRoamingPaths();
		const documents = Object.entries(this.plugin.settings.documentMetrics)
			.filter(([path]) => validRoamingPaths.includes(path))
			.sort(([_, a], [__, b]) => b.visitCount - a.visitCount)
			.slice(0, 10); // Show top 10

		for (const [path, metrics] of documents) {
			const file = this.app.vault.getAbstractFileByPath(path) as TFile;
			if (!file) continue;

			const row = this.visitTable.createEl('div', { cls: 'table-row' });

			const rank = row.createEl('div', { cls: 'table-cell rank', text: (metrics.visitCount).toString() });
			const name = row.createEl('div', { cls: 'table-cell name', text: file.basename });
			const visits = row.createEl('div', { cls: 'table-cell visits', text: `漫游${metrics.visitCount}次` });
			const actions = row.createEl('div', { cls: 'table-cell actions' });

			const clearBtn = actions.createEl('button', {
				cls: 'clear-btn',
				text: '清0'
			});
			clearBtn.onclick = async () => {
				await this.plugin.updateDocumentMetrics(file, { visitCount: 0 });
				this.updateVisitTable();
			};
		}
	}

	private updatePriorityTable() {
		if (!this.priorityTable) return;

		this.priorityTable.empty();

		// 使用技术验证确保只显示有效的漫游文档
		const validRoamingPaths = this.getValidRoamingPaths();
		const documents = Object.entries(this.plugin.settings.documentMetrics)
			.filter(([path]) => validRoamingPaths.includes(path))
			.sort(([_, a], [__, b]) => {
				// 按计算优先级排序
				const priorityA = this.calculatePriority(a) / 10; // Convert to display priority
				const priorityB = this.calculatePriority(b) / 10;
				return priorityB - priorityA;
			})
			.slice(0, 10); // Show top 10

		for (const [path, metrics] of documents) {
			const file = this.app.vault.getAbstractFileByPath(path) as TFile;
			if (!file) continue;

			const row = this.priorityTable.createEl('div', { cls: 'table-row' });

			const name = row.createEl('div', { cls: 'table-cell name', text: this.truncateFileName(file.basename) });
			const calculatedPriority = this.calculatePriority(metrics) / 10; // Convert to display priority
			const priority = row.createEl('div', { cls: 'table-cell priority', text: calculatedPriority.toFixed(1) });

			// Add actions cell
			const actions = row.createEl('div', { cls: 'table-cell actions' });
			const editBtn = actions.createEl('button', {
				cls: 'edit-btn',
				text: '编辑'
			});
			editBtn.onclick = () => {
				this.editDocumentMetrics(file, metrics);
			};
		}
	}

	private getPriorityColor(priority: number): string {
		if (priority >= 8) return '#ff4757';
		if (priority >= 6) return '#ff6348';
		if (priority >= 4) return '#ffa502';
		if (priority >= 2) return '#2ed573';
		return '#747d8c';
	}

	private truncateFileName(name: string, maxLength: number = 10): string {
		return name.length > maxLength ? name.substr(0, maxLength) + '.' : name;
	}

	/**
	 * 更新继续漫游按钮的状态
	 */
	private updateContinueButtonState(button: HTMLButtonElement) {
		// 使用技术验证获取实际可用的漫游文档数量
		const validRoamingFiles = this.getValidRoamingFiles();
		const roamingCount = validRoamingFiles.length;

		if (roamingCount === 0) {
			// 没有漫游文档
			button.disabled = true;
			button.classList.add('disabled');
			button.textContent = '继续漫游 (无漫游文档)';
			button.title = '请先添加文档到漫游列表';
			// 更新诗词中的概率显示
			if (this.chanceSpan) {
				this.chanceSpan.textContent = '0%的概率';
			}
		} else if (roamingCount === 1) {
			// 只有1个有效漫游文档
			const singleFile = validRoamingFiles[0];
			if (this.currentFile && singleFile.path === this.currentFile.path) {
				// 只有当前文档在漫游列表中
				button.disabled = true;
				button.classList.add('disabled');
				button.textContent = '继续漫游 (文档不足)';
				button.title = '漫游列表中只有当前文档，请添加更多文档';
				// 更新诗词中的概率显示
				if (this.chanceSpan) {
					this.chanceSpan.textContent = '0%的概率';
				}
			} else {
				// 有1个漫游文档但不是当前文档
				button.disabled = false;
				button.classList.remove('disabled');
				button.textContent = '继续漫游';
				button.title = `从 ${roamingCount} 个有效漫游文档中随机选择`;
				// 更新诗词中的概率显示
				if (this.chanceSpan) {
					this.chanceSpan.textContent = '100%的概率';
				}
			}
		} else {
			// 有多个有效漫游文档
			const availableFiles = validRoamingFiles.filter(file =>
				!this.currentFile || file.path !== this.currentFile.path
			);
			const availableCount = availableFiles.length;

			if (availableCount === 0) {
				// 所有有效漫游文档都是当前文档
				button.disabled = true;
				button.classList.add('disabled');
				button.textContent = '继续漫游 (文档不足)';
				button.title = '请添加更多文档到漫游列表';
				// 更新诗词中的概率显示
				if (this.chanceSpan) {
					this.chanceSpan.textContent = '0%的概率';
				}
			} else {
				const probability = Math.round((1 / availableCount) * 100);
				button.disabled = false;
				button.classList.remove('disabled');
				button.textContent = '继续漫游';
				button.title = `从 ${availableCount} 个可用漫游文档中随机选择`;
				// 更新诗词中的概率显示
				if (this.chanceSpan) {
					this.chanceSpan.textContent = `${probability}%的概率`;
				}
			}
		}
	}

	// SiYuan action methods
	private async continueReading() {
		try {
			// 使用技术验证获取有效漫游文档
			const validRoamingFiles = this.getValidRoamingFiles();

			// 首先检查是否有有效的漫游文档
			if (validRoamingFiles.length === 0) {
				new Notice('⚠️ 没有有效的漫游文档\n请先添加有效的Markdown文档到漫游列表');
				return;
			}

			// 排除当前文档，获取可选择的文档
			const availableFiles = validRoamingFiles.filter(file =>
				!this.currentFile || file.path !== this.currentFile.path
			);

			if (availableFiles.length === 0) {
				// 如果只有当前文档在漫游列表中
				if (this.currentFile && validRoamingFiles.some(f => f.path === this.currentFile!.path)) {
					new Notice(`⚠️ 漫游列表中只有当前文档 "${this.currentFile.basename}"\n请添加更多文档到漫游列表才能继续漫游`);
				} else {
					new Notice('⚠️ 没有可漫游的文档\n请先添加文档到漫游列表');
				}
				return;
			}

			// 检查如果只有1个有效漫游文档（就是当前文档）
			if (validRoamingFiles.length === 1 && this.currentFile && validRoamingFiles[0].path === this.currentFile.path) {
				new Notice(`⚠️ 漫游列表中只有 "${this.currentFile.basename}"\n请添加更多文档到漫游列表才能使用继续漫游功能`);
				return;
			}

			this.loadingIndicator?.updateMessage('基于优先级随机选择漫游文档...');
			this.loadingIndicator?.show();

			// 基于优先级的加权随机选择
			const weightedFiles = availableFiles.map(file => {
				const metrics = this.plugin.getDocumentMetrics(file);
				const priority = SharedUtils.calculatePriority(metrics, this.plugin.settings.metricWeights); // 使用综合计算优先级
				return { file, weight: Math.max(0.1, priority) }; // 确保最小权重为0.1
			});

			// 计算权重总和
			const totalWeight = weightedFiles.reduce((sum, item) => sum + item.weight, 0);

			// 加权随机选择
			let random = Math.random() * totalWeight;
			let selectedFile = weightedFiles[0].file;
			for (const item of weightedFiles) {
				random -= item.weight;
				if (random <= 0) {
					selectedFile = item.file;
					break;
				}
			}

			// 获取选中文档的优先级和计算基于优先级的概率
			const selectedMetrics = this.plugin.getDocumentMetrics(selectedFile);
			const priorityScore = SharedUtils.calculatePriority(selectedMetrics, this.plugin.settings.metricWeights);
			const selectedWeight = weightedFiles.find(item => item.file.path === selectedFile.path)?.weight || 0.1;
			const selectionProbability = (selectedWeight / totalWeight * 100);

			// 计算相似度概率（作为额外信息显示）
			let similarityProbability = 0;
			if (this.currentFile) {
				similarityProbability = await this.calculateSimilarity(this.currentFile, selectedFile);
			}

			// 更新头部概率显示 - 基于优先级的概率
			if (this.chanceSpan) {
				this.chanceSpan.textContent = `${selectionProbability.toFixed(1)}%`;
				this.chanceSpan.title = `基于优先级的选择概率: ${selectionProbability.toFixed(2)}% (优先级: ${priorityScore.toFixed(1)})`;
			}

			// 显示选择结果 - 重点突出优先级概率
			if (this.currentFile && similarityProbability > 0) {
				new Notice(`基于优先级选择: ${selectedFile.basename} - 选中概率: ${selectionProbability.toFixed(1)}%, 相似度: ${(similarityProbability * 100).toFixed(1)}%`);
			} else {
				new Notice(`基于优先级选择: ${selectedFile.basename} - 选中概率: ${selectionProbability.toFixed(1)}%, 优先级: ${priorityScore.toFixed(1)}`);
			}

			// 打开选中的文档
			await this.app.workspace.getLeaf().openFile(selectedFile);

			// 更新当前文档信息（访问次数会在 onFileOpen 中处理）
			this.currentFile = selectedFile;
			this.currentMetrics = this.plugin.getDocumentMetrics(selectedFile);

			this.refreshSiyuanData();
		} catch (error) {
			console.error('继续漫游失败:', error);
			new Notice('继续漫游失败');
		} finally {
			this.loadingIndicator?.hide();
		}
	}

	/**
	 * 计算两个文档之间的相似度概率
	 */
	private async calculateSimilarity(file1: TFile, file2: TFile): Promise<number> {
		try {
			// 读取文档内容
			const content1 = await this.app.vault.read(file1);
			const content2 = await this.app.vault.read(file2);

			// 简化的相似度计算（基于TF-IDF概念）
			const words1 = this.extractWords(content1.toLowerCase());
			const words2 = this.extractWords(content2.toLowerCase());

			// 计算词频
			const freq1 = this.calculateWordFrequency(words1);
			const freq2 = this.calculateWordFrequency(words2);

			// 获取所有唯一词汇
			const allWords = new Set([...Object.keys(freq1), ...Object.keys(freq2)]);

			// 计算TF-IDF向量
			const vector1: number[] = [];
			const vector2: number[] = [];

			for (const word of allWords) {
				const tf1 = freq1[word] || 0;
				const tf2 = freq2[word] || 0;

				// 简化的IDF计算（这里简化处理）
				const idf = 1; // 实际应该是 log(total_docs / docs_with_word)

				vector1.push(tf1 * idf);
				vector2.push(tf2 * idf);
			}

			// 计算余弦相似度
			return this.cosineSimilarity(vector1, vector2);
		} catch (error) {
			console.error('计算相似度失败:', error);
			return Math.random() * 0.3 + 0.1; // 返回随机概率作为fallback
		}
	}

	/**
	 * 提取文档中的词汇
	 */
	private extractWords(text: string): string[] {
		// 简化的词汇提取，包含中英文
		return text.match(/[\u4e00-\u9fa5]+|[a-zA-Z]+/g) || [];
	}

	/**
	 * 计算词频
	 */
	private calculateWordFrequency(words: string[]): Record<string, number> {
		const frequency: Record<string, number> = {};
		const total = words.length;

		for (const word of words) {
			frequency[word] = (frequency[word] || 0) + 1;
		}

		// 归一化为词频（TF）
		for (const word in frequency) {
			frequency[word] = frequency[word] / total;
		}

		return frequency;
	}

	/**
	 * 计算余弦相似度
	 */
	private cosineSimilarity(vector1: number[], vector2: number[]): number {
		if (vector1.length === 0 || vector2.length === 0) return 0;

		let dotProduct = 0;
		let magnitude1 = 0;
		let magnitude2 = 0;

		for (let i = 0; i < vector1.length; i++) {
			dotProduct += vector1[i] * vector2[i];
			magnitude1 += vector1[i] * vector1[i];
			magnitude2 += vector2[i] * vector2[i];
		}

		magnitude1 = Math.sqrt(magnitude1);
		magnitude2 = Math.sqrt(magnitude2);

		if (magnitude1 === 0 || magnitude2 === 0) return 0;

		return dotProduct / (magnitude1 * magnitude2);
	}

	private async getSmartRecommendations() {
		try {
			this.loadingIndicator?.updateMessage('获取智能推荐...');
			this.loadingIndicator?.show();

			const recommendations = await this.plugin.recommendationService.getRecommendations();

			if (recommendations.length === 0) {
				new Notice('暂无推荐');
				return;
			}

			// Show top recommendation
			const topRecommendation = recommendations[0];
			await this.app.workspace.getLeaf().openFile(topRecommendation.file);

			new Notice(`推荐: ${topRecommendation.file.basename}`);
			this.refreshSiyuanData();
		} catch (error) {
			console.error('获取推荐失败:', error);
			new Notice('获取推荐失败');
		} finally {
			this.loadingIndicator?.hide();
		}
	}

	private async alignPriorities() {
		try {
			this.loadingIndicator?.updateMessage('优先级对齐中...');
			this.loadingIndicator?.show();

			// 使用技术验证确保只处理有效的漫游文档
			const validRoamingPaths = this.getValidRoamingPaths();
			const documents = Object.entries(this.plugin.settings.documentMetrics)
				.filter(([path]) => validRoamingPaths.includes(path));

			// Normalize priorities based on visit count and recency
			for (const [path, metrics] of documents) {
				const file = this.app.vault.getAbstractFileByPath(path) as TFile;
				if (!file) continue;

				const daysSince = metrics.lastVisited ?
					(Date.now() - metrics.lastVisited) / (1000 * 60 * 60 * 24) : 999;

				// Calculate new priority
				let newPriority = 5; // Base priority
				newPriority += (metrics.visitCount * 0.2); // Boost for frequent visits
				newPriority -= (daysSince * 0.1); // Reduce for old documents
				newPriority = Math.max(0, Math.min(10, newPriority));

				await this.plugin.updateDocumentMetrics(file, { priority: newPriority });
			}

			new Notice('优先级对齐完成');
			this.refreshSiyuanData();
		} catch (error) {
			console.error('优先级对齐失败:', error);
			new Notice('优先级对齐失败');
		} finally {
			this.loadingIndicator?.hide();
		}
	}

	
	
	private togglePanelExpansion(panel: HTMLElement) {
		const content = panel.querySelector('.metrics-content, .visit-table, .priority-table') as HTMLElement;
		const expandBtn = panel.querySelector('.expand-btn') as HTMLButtonElement;

		if (content) {
			const isHidden = content.style.display === 'none';
			content.style.display = isHidden ? '' : 'none';
			expandBtn.textContent = isHidden ? '▲' : '▼';
		}
	}

	
	private async refreshVisitTable() {
		this.updateVisitTable();
		new Notice('列表已刷新');
	}

	// Action methods
	private async scheduleDocuments() {
		try {
			this.loadingIndicator?.updateMessage('智能调度中...');
			this.loadingIndicator?.show();

			// Get recommendations from service
			const recommendations = await this.plugin.recommendationService.getRecommendations();

			if (recommendations.length === 0) {
				new Notice('没有可调度的文档');
				return;
			}

			// Update priorities based on recommendations
			for (const { file, score } of recommendations) {
				const currentMetrics = this.plugin.getDocumentMetrics(file);
				const newPriority = Math.min(10, Math.max(0, currentMetrics.priority + (score > 0.5 ? 0.5 : -0.5)));
				await this.plugin.updateDocumentMetrics(file, { priority: newPriority });
			}

			new Notice(`智能调度完成，处理了 ${recommendations.length} 个文档`);
			this.refreshSiyuanData();
		} catch (error) {
			console.error('智能调度失败:', error);
			new Notice('智能调度失败');
		} finally {
			this.loadingIndicator?.hide();
		}
	}

	private async addCurrentToRoaming() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('没有打开的文档');
			return;
		}

		try {
			// Check file type
			if (activeFile.extension !== 'md') {
				new Notice(`只能添加Markdown文档到漫游列表 "${activeFile.basename}"`);
				return;
			}

			// Check if already in roaming list
			if (this.plugin.settings.roamingDocs.includes(activeFile.path)) {
				new Notice(`"${activeFile.basename}" 已在漫游列表中`);
				return;
			}

			// Add to roaming documents
			this.plugin.settings.roamingDocs.push(activeFile.path);

			// Update or create metrics with default values
			await this.plugin.updateDocumentMetrics(activeFile, {
				difficulty: 5.0,
				importance: 5.0,
				urgency: 5.0,
				interest: 5.0,
				priority: 5.0,
				lastVisited: Date.now(),
				visitCount: 0
			});

			await this.plugin.saveSettings();
			new Notice(`✅ 已将 "${activeFile.basename}" 加入漫游列表`);

			// 立即更新所有状态 - 确保图表立即显示
			this.updateDocStatsDisplay();
			this.updateContinueButtonState(this.continueBtn!);
			this.updateAddRoamingButtonState();

			// 强制刷新整个视图以确保图表更新
			console.log('添加漫游文档后刷新界面...');
			this.refreshSiyuanData();

		} catch (error) {
			console.error('加入漫游失败:', error);
			new Notice('加入漫游失败');
		}
	}

	private async openDocument(file: TFile) {
		try {
			await this.app.workspace.getLeaf().openFile(file);

			// Update metrics
			await this.plugin.updateDocumentMetrics(file, {
				lastVisited: Date.now(),
				visitCount: this.plugin.getDocumentMetrics(file).visitCount + 1
			});

			this.refreshSiyuanData();
		} catch (error) {
			console.error('打开文档失败:', error);
			new Notice('打开文档失败');
		}
	}

	private async rescheduleDocument(file: TFile) {
		try {
			const currentMetrics = this.plugin.getDocumentMetrics(file);

			// Show priority adjustment modal
			const modal = new SliderModal(
				this.app,
				currentMetrics.priority,
				{
					title: `重新调度: ${file.basename}`,
					label: '优先级',
					min: 0,
					max: 10,
					step: 0.1,
					onConfirm: async (newPriority) => {
						await this.plugin.updateDocumentMetrics(file, { priority: newPriority });
						new Notice(`已将 "${file.basename}" 优先级调整为 ${newPriority.toFixed(1)}`);
						this.refreshSiyuanData();
					}
				}
			);

			modal.open();
		} catch (error) {
			console.error('重新调度失败:', error);
			new Notice('重新调度失败');
		}
	}

	private async processDocument(file: TFile) {
		try {
			// Mark as processed
			const currentMetrics = this.plugin.getDocumentMetrics(file);
			await this.plugin.updateDocumentMetrics(file, {
				priority: Math.max(0, currentMetrics.priority - 1), // Reduce priority
				lastVisited: Date.now()
			});

			new Notice(`已处理 "${file.basename}"`);
			this.refreshSiyuanData();
		} catch (error) {
			console.error('处理文档失败:', error);
			new Notice('处理文档失败');
		}
	}

	private async startReading() {
		try {
			this.loadingIndicator?.updateMessage('Getting recommendations...');
			this.loadingIndicator?.show();

			const recommendations = await this.plugin.recommendationService.getRecommendations();

			if (recommendations.length === 0) {
				new Notice('No recommendations available');
				return;
			}

			const topRecommendation = recommendations[0];
			this.loadingIndicator?.updateMessage('Opening document...');
			await this.app.workspace.getLeaf().openFile(topRecommendation.file);

			// Note: Don't automatically add to roaming docs, let user manually add

			// Update view
			const recList = SharedUtils.safeElementQuery(this.containerEl, '.recommendations-list') as HTMLElement;
			if (recList) {
				this.updateRecommendations(recList);
			}
		} catch (error) {
			console.error('Error starting reading session:', error);
			new Notice('Error starting reading session');
		} finally {
			this.loadingIndicator?.hide();
		}
	}

	private async openRandomDocument() {
		try {
			this.loadingIndicator?.updateMessage('Finding random document...');
			this.loadingIndicator?.show();

			// 使用技术验证获取有效的漫游文档
			const validRoamingFiles = this.getValidRoamingFiles();
			const filteredFiles = validRoamingFiles.filter(file =>
				SharedUtils.shouldIncludeFile(file, this.plugin.settings.excludedPaths)
			);

		if (filteredFiles.length === 0) {
			new Notice('没有漫游文档可供随机选择');
			return;
		}

		const randomFile = filteredFiles[Math.floor(Math.random() * filteredFiles.length)];
		await this.app.workspace.getLeaf().openFile(randomFile);

		// Update visit count for already visited document
		await this.plugin.updateDocumentMetrics(randomFile, {
			lastVisited: Date.now()
		});

		new Notice(`Opened: ${randomFile.basename}`);
		} catch (error) {
			console.error('Error opening random document:', error);
			new Notice('Error opening random document');
		} finally {
			this.loadingIndicator?.hide();
		}
	}

	private async resetVisitedDocuments() {
		// Show confirmation modal
		const modal = new Modal(this.app, {
			title: '清空漫游历史',
			content: '这将清空所有漫游历史并重置所有文档的访问次数。此操作无法撤销。',
			confirmText: '清空历史',
			cancelText: '取消',
			onConfirm: async () => {
				this.plugin.settings.roamingDocs = [];
				// Also reset all visit counts to 0
				for (const [path] of Object.entries(this.plugin.settings.documentMetrics)) {
					this.plugin.settings.documentMetrics[path].visitCount = 0;
					this.plugin.settings.documentMetrics[path].lastVisited = 0;
				}
				await this.plugin.saveSettings();
				new Notice('漫游历史已清除');

				// Update view
				const recList = SharedUtils.safeElementQuery(this.containerEl, '.recommendations-list') as HTMLElement;
				if (recList) {
					this.updateRecommendations(recList);
				}

				const statsPanel = SharedUtils.safeElementQuery(this.containerEl, '.statistics-panel') as HTMLElement;
				if (statsPanel) {
					this.updateStatisticsPanel(statsPanel);
				}
			}
		});

		modal.open();
	}

	private async onFileOpen(file: TFile | null) {
		if (!file) return;

		this.currentFile = file;
		this.currentMetrics = this.plugin.getDocumentMetrics(file);

		// Only update display if it's a roaming document (don't auto-record)
		if (this.plugin.settings.roamingDocs.includes(file.path)) {
			// Update visit count for roaming documents - increment by 1 only
			const newVisitCount = this.currentMetrics.visitCount + 1;
			await this.plugin.updateDocumentMetrics(file, {
				lastVisited: Date.now(),
				visitCount: newVisitCount
			});
			console.log(`文件 ${file.basename} 漫游次数更新为: ${newVisitCount}`); // Debug log
		}

		// Refresh the SiYuan display
		this.refreshSiyuanData();

		// Make sure calculated priority is updated when opening a file
		setTimeout(() => {
			this.updateCalculatedPriority();
		}, 100);
	}

	private async updateRecommendations(container: HTMLElement) {
		container.empty();

		const recommendations = await this.plugin.recommendationService.getRecommendations();

		if (recommendations.length === 0) {
			container.createEl('p', {
				text: 'No recommendations available yet. Read more documents to get personalized recommendations.',
				cls: 'help-text'
			});
			return;
		}

		for (const { file, score } of recommendations) {
			const recItem = container.createEl('div', { cls: 'recommendation-item' });

			// File icon and title
			const fileInfo = recItem.createEl('div', { cls: 'file-info' });
			const fileIcon = fileInfo.createEl('span', { cls: 'file-icon' });
			setIcon(fileIcon, 'file-text');

			const fileLink = fileInfo.createEl('a', { text: file.basename, cls: 'file-link' });
			fileLink.onclick = (e) => {
				e.preventDefault();
				this.app.workspace.getLeaf().openFile(file);
			};

			// Score
			const scoreEl = recItem.createEl('span', { cls: 'score' });
			scoreEl.textContent = `${(score * 100).toFixed(1)}%`;

			// Priority
			const metrics = this.plugin.getDocumentMetrics(file);
			const priorityEl = recItem.createEl('span', { cls: 'priority' });
			priorityEl.textContent = `Priority: ${metrics.priority.toFixed(1)}`;
			priorityEl.style.color = SharedUtils.getPriorityColor(metrics.priority);

			// Visit count (always show since we only recommend visited documents)
			const visitCount = this.plugin.getDocumentMetrics(file).visitCount;
			const visitEl = recItem.createEl('span', { cls: 'visit-count' });
			visitEl.textContent = `📖 ${visitCount}`;
			visitEl.title = `Visited ${visitCount} time${visitCount !== 1 ? 's' : ''}`;

			// Quick actions
			const actions = recItem.createEl('div', { cls: 'quick-actions' });

			const adjustBtn = actions.createEl('button', { text: 'Adjust Priority' });
			adjustBtn.onclick = () => this.showPriorityAdjuster(file);

			const skipBtn = actions.createEl('button', { text: 'Defer' });
			skipBtn.title = 'Lower priority and refresh recommendations';
			skipBtn.onclick = async () => {
				// Reduce priority and update recommendations
				const currentMetrics = this.plugin.getDocumentMetrics(file);
				const newPriority = Math.max(0, currentMetrics.priority - 1);
				await this.plugin.updateDocumentMetrics(file, { priority: newPriority });
				this.updateRecommendations(container);
			};
		}
	}

	private updateMetricsPanel(container: HTMLElement) {
		container.empty();

		if (!this.currentFile) {
			container.createEl('p', { text: 'Open a document to see and adjust its metrics.' });
			return;
		}

		if (!this.currentMetrics) {
			this.currentMetrics = this.plugin.getDocumentMetrics(this.currentFile);
		}

		const metrics = this.currentMetrics;

		// Create sliders for each metric
		const createSlider = (label: string, key: keyof DocumentMetrics, min: number, max: number, step: number = 0.1) => {
			const sliderContainer = container.createEl('div', { cls: 'metric-slider' });

			const labelEl = sliderContainer.createEl('label', { text: `${label}: ${metrics[key]}` });
			const slider = sliderContainer.createEl('input', { type: 'range', cls: 'slider' });

			slider.min = min.toString();
			slider.max = max.toString();
			slider.step = step.toString();
			slider.value = metrics[key].toString();

			slider.oninput = () => {
				const value = parseFloat(slider.value);
				labelEl.textContent = `${label}: ${value.toFixed(1)}`;
				this.currentMetrics![key] = value;
			};

			slider.onchange = async () => {
				const value = parseFloat(slider.value);
				if (this.currentFile) {
					await this.plugin.updateDocumentMetrics(this.currentFile, { [key]: value });
				}
			};

			return slider;
		};

		createSlider('Difficulty', 'difficulty', 0, 10);
		createSlider('Importance', 'importance', 0, 10);
		createSlider('Urgency', 'urgency', 0, 10);
		createSlider('Interest', 'interest', 0, 10);
		createSlider('Manual Priority', 'priority', 0, 10);

		// Show calculated priority
		const calculatedPriority = this.calculatePriority(metrics);
		const priorityInfo = container.createEl('div', { cls: 'priority-info' });
		priorityInfo.createEl('p', { text: `Calculated Priority: ${calculatedPriority.toFixed(2)}` });
	}

	private updateStatisticsPanel(container: HTMLElement) {
		container.empty();

		// Get all documents with visit counts
		const visitCounts = new Map<string, number>();
		for (const [path, metrics] of Object.entries(this.plugin.settings.documentMetrics)) {
			visitCounts.set(path, metrics.visitCount);
		}

		const totalVisited = visitCounts.size;
		const totalVisits = Array.from(visitCounts.values()).reduce((sum, count) => sum + count, 0);

		const stats = container.createEl('div', { cls: 'statistics-grid' });

		stats.createEl('div', { cls: 'stat-item', text: `Read Documents: ${totalVisited}` });
		stats.createEl('div', { cls: 'stat-item', text: `Total Visits: ${totalVisits}` });

		// Most visited documents
		const sortedByVisits = Array.from(visitCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10); // Show top 10 instead of 5

		if (sortedByVisits.length > 0) {
			const mostVisited = container.createEl('div', { cls: 'most-visited' });
			mostVisited.createEl('h4', { text: '漫游次数最多文档' });

			for (const [path, count] of sortedByVisits) {
				const file = this.app.vault.getAbstractFileByPath(path) as TFile;
				if (file) {
					const item = mostVisited.createEl('div', { cls: 'visit-item' });

					// File name with visit count
					const fileInfo = item.createEl('div', { cls: 'file-info' });
					fileInfo.createEl('span', { cls: 'file-name', text: file.basename });
					fileInfo.createEl('span', { cls: 'visit-count', text: `漫游${count}次` });

					// Quick action button
					const openBtn = item.createEl('button', {
						cls: 'open-document-btn',
						text: '打开'
					});
					openBtn.onclick = () => {
						this.app.workspace.getLeaf().openFile(file);
					};
				}
			}
		} else {
			const noDocuments = container.createEl('div', { cls: 'no-documents' });
			noDocuments.createEl('p', {
				text: '还没有漫游文档。使用"添加至漫游"功能来添加文档。',
				cls: 'help-text'
			});
		}
	}

	private showPriorityAdjustment() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('没有打开的文档');
			return;
		}

		const metrics = this.plugin.getDocumentMetrics(activeFile);
		const currentPriority = metrics.priority || 5.0;

		const sliderModal = new SliderModal(
			this.app,
			currentPriority,
			{
				title: `调整手动优先级: ${activeFile.basename}`,
				label: '手动优先级',
				min: 0,
				max: 10,
				step: 0.1,
				onConfirm: async (newValue) => {
					await this.plugin.updateDocumentMetrics(activeFile, { priority: newValue });
					this.currentMetrics = this.plugin.getDocumentMetrics(activeFile);

					// 更新计算优先级显示
					this.updateCalculatedPriority();

					new Notice(`已将 "${activeFile.basename}" 的手动优先级调整为 ${newValue.toFixed(1)}`);
				}
			}
		);
		sliderModal.open();
	}

	private showPriorityAdjuster(file: TFile) {
		const metrics = this.plugin.getDocumentMetrics(file);
		const currentPriority = metrics.priority;

		const sliderModal = new SliderModal(
			this.app,
			currentPriority,
			{
				title: `Adjust Priority: ${file.basename}`,
				label: 'Priority',
				min: 0,
				max: 10,
				step: 0.1,
				onConfirm: async (newValue) => {
					await this.plugin.updateDocumentMetrics(file, { priority: newValue });

					// Update UI
					const recList = SharedUtils.safeElementQuery(this.containerEl, '.recommendations-list') as HTMLElement;
					if (recList) {
						this.updateRecommendations(recList);
					}

					new Notice(`Priority updated to ${newValue.toFixed(1)}`);
				}
			}
		);

		sliderModal.open();
	}

	/**
	 * Random roaming - 完全随机选择
	 */
	private async randomRoaming() {
		try {
			this.loadingIndicator?.updateMessage('随机选择漫游文档...');
			this.loadingIndicator?.show();

			const validRoamingFiles = this.getValidRoamingFiles();
			const availableFiles = validRoamingFiles.filter(file =>
				!this.currentFile || file.path !== this.currentFile.path
			);

			if (availableFiles.length === 0) {
				new Notice('⚠️ 没有可随机漫游的文档');
				return;
			}

			const randomFile = availableFiles[Math.floor(Math.random() * availableFiles.length)];

			await this.app.workspace.getLeaf().openFile(randomFile);

			// 更新当前文档信息（访问次数会在 onFileOpen 中处理）
			this.currentFile = randomFile;
			this.currentMetrics = this.plugin.getDocumentMetrics(randomFile);

			new Notice(`随机漫游: ${randomFile.basename}`);
			this.refreshSiyuanData();
		} catch (error) {
			console.error('随机漫游失败:', error);
			new Notice('随机漫游失败');
		} finally {
			this.loadingIndicator?.hide();
		}
	}

	/**
	 * Update recommendations list (with debounce)
	 */
	private updateRecommendationsList() {
		// 如果已经在更新中，则取消之前的更新
		if (this.updateRecommendationsTimeout) {
			clearTimeout(this.updateRecommendationsTimeout);
		}

		// 防抖延迟100ms执行
		this.updateRecommendationsTimeout = setTimeout(async () => {
			await this.performUpdateRecommendationsList();
		}, 100);
	}

	/**
	 * 实际执行更新推荐列表的方法
	 */
	private async performUpdateRecommendationsList() {
		if (!this.recommendationsList || this.isUpdatingRecommendations) return;

		this.isUpdatingRecommendations = true;
		try {
			this.recommendationsList.empty();

			const recommendations = await this.getRecommendationsWithScores();

			if (recommendations.length === 0) {
				const emptyMessage = this.recommendationsList.createEl('div', { cls: 'empty-recommendations' });
				emptyMessage.createEl('p', { text: '暂无推荐，请先添加更多漫游文档' });
				return;
			}

			// Show top 8 recommendations with new CSS Grid structure
			for (let i = 0; i < Math.min(8, recommendations.length); i++) {
				const { file, score } = recommendations[i];
				const row = this.recommendationsList.createEl('div', { cls: 'recommendation-row' });

				// Index column
				const indexCol = row.createEl('div', { cls: 'rec-index' });
				const indexText = indexCol.createEl('span', { cls: 'index-text' });
				indexText.textContent = `${i + 1}`;

				// Name column
				const nameCol = row.createEl('div', { cls: 'rec-name' });
				const nameText = nameCol.createEl('span', { cls: 'name-text' });
				nameText.textContent = this.truncateFileName(file.basename);

				// Score column
				const scoreCol = row.createEl('div', { cls: 'rec-score' });
				const scoreText = scoreCol.createEl('span', { cls: 'score-text' });
				scoreText.textContent = `${(score * 100).toFixed(1)}%`;

				// Make the row clickable
				row.onclick = () => this.openRecommendedFile(file);
				row.title = `${file.basename} - 相似度: ${(score * 100).toFixed(1)}%`;
			}
		} catch (error) {
			console.error('更新推荐列表失败:', error);
		} finally {
			this.isUpdatingRecommendations = false;
		}
	}

	/**
	 * Get recommendations with scores
	 */
	private async getRecommendationsWithScores(): Promise<Array<{ file: TFile; score: number }>> {
		try {
			const currentFile = this.app.workspace.getActiveFile();
			const recommendations = await this.plugin.recommendationService.getRecommendations(currentFile || undefined);
			return recommendations.filter(rec => !currentFile || rec.file.path !== currentFile.path);
		} catch (error) {
			console.error('获取推荐失败:', error);
			return [];
		}
	}

	/**
	 * Open recommended file and update metrics
	 */
	private async openRecommendedFile(file: TFile) {
		try {
			await this.app.workspace.getLeaf().openFile(file);

			// 更新当前文档信息（访问次数会在 onFileOpen 中处理）
			this.currentFile = file;
			this.currentMetrics = this.plugin.getDocumentMetrics(file);
			this.refreshSiyuanData();
		} catch (error) {
			console.error('打开推荐文档失败:', error);
			new Notice('打开推荐文档失败');
		}
	}

	/**
	 * Show more recommendations
	 */
	private async showMoreRecommendations() {
		try {
			this.loadingIndicator?.updateMessage('加载更多推荐...');
			this.loadingIndicator?.show();

			const recommendations = await this.getRecommendationsWithScores();

			if (recommendations.length === 0) {
				new Notice('暂无更多推荐');
				return;
			}

			const modal = new Modal(this.app, {
				title: '智能推荐列表',
				content: '基于TF-IDF相似度计算',
				showCancel: false
			});

			const contentEl = modal.contentEl;
			contentEl.empty();

			const list = contentEl.createEl('div', { cls: 'recommendations-modal-list' });
			for (let i = 0; i < recommendations.length; i++) {
				const { file, score } = recommendations[i];
				const item = list.createEl('div', { cls: 'recommendation-item-modal' });

				item.createEl('span', { cls: 'rec-file-name', text: file.basename });
				item.createEl('span', { cls: 'rec-score', text: `${(score * 100).toFixed(1)}%` });

				item.onclick = () => {
					modal.close();
					this.openRecommendedFile(file);
				};
			}

			modal.open();
		} catch (error) {
			console.error('显示更多推荐失败:', error);
			new Notice('加载推荐失败');
		} finally {
			this.loadingIndicator?.hide();
		}
	}

	/**
	 * Edit document metrics
	 */
	private async editDocumentMetrics(file: TFile, currentMetrics: DocumentMetrics) {
		try {
			const modal = new DocumentMetricsModal(
				this.app,
				file,
				currentMetrics,
				async (updatedMetrics) => {
					// Update document metrics
					await this.plugin.updateDocumentMetrics(file, updatedMetrics);

					new Notice(`文档 "${file.basename}" 的得分已更新`);

					// Refresh the view
					this.refreshSiyuanData();
				}
			);

			modal.open();
		} catch (error) {
			console.error('编辑文档得分失败:', error);
			new Notice('编辑文档得分失败');
		}
	}

	private cleanup(): void {
		// Hide loading indicator
		this.loadingIndicator?.hide();
		this.loadingIndicator = null;

		// Remove error boundary
		this.errorBoundary = null;

		// Remove styles if added
		if (this.stylesAdded) {
			const existingStyle = document.getElementById('incremental-reading-styles');
			if (existingStyle) {
				existingStyle.remove();
			}
			this.stylesAdded = false;
		}
	}

	private addSiyuanStyles() {
		// Check if styles are already added
		if (this.stylesAdded || document.getElementById('incremental-reading-styles')) {
			this.stylesAdded = true;
			return;
		}

		const style = document.createElement('style');
		style.id = 'incremental-reading-styles';
		style.textContent = `
			/* CSS Variables - 现代化配色 */
			:root {
				--primary-color: #4a90e2;
				--primary-light: #6ba3e5;
				--primary-dark: #357abd;
				--bg-color: #f8fafc;
				--bg-secondary: #f1f5f9;
				--bg-tertiary: #e2e8f0;
				--card-bg: #ffffff;
				--text-main: #1e293b;
				--text-sub: #64748b;
				--text-light: #94a3b8;
				--border-color: #e2e8f0;
				--border-light: #f1f5f9;
				--highlight-bg: #eff6ff;
				--success-color: #10b981;
				--warning-color: #f59e0b;
				--error-color: #ef4444;
			}

			/* 插件主容器 - 按照需求文档 */
			.plugin-container {
				width: 400px;
				height: 800px;
				background-color: var(--card-bg);
				border-radius: 12px;
				box-shadow: 0 4px 20px rgba(0,0,0,0.1);
				display: flex;
				flex-direction: column;
				overflow: hidden;
				font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
			}

			/* 区域一：顶部核心面板 - 按照需求文档 */
			.hero-section {
				padding: 24px 20px;
				border-bottom: 1px solid var(--border-color);
				background: linear-gradient(to bottom, #fff, #fafafa);
				flex-shrink: 0;
			}

			.main-title {
				font-size: 20px;
				font-weight: 700;
				color: var(--text-main);
				margin: 0 0 8px 0;
				text-align: center;
			}

			.poetic-subtitle {
				font-size: 12px;
				color: var(--text-sub);
				font-family: "Songti SC", serif; /* 尝试使用宋体/衬线体增加诗意 */
				text-align: center;
				line-height: 1.6;
				margin-bottom: 16px;
				font-style: italic;
			}

			.status-text {
				font-size: 13px;
				color: var(--primary-color);
				text-align: center;
				margin-bottom: 16px;
				font-weight: 500;
			}

			.chance {
				color: #ff6b6b;
				font-weight: 500;
			}

			.status-text {
				font-size: 13px;
				color: var(--primary-color);
				text-align: center;
				margin-bottom: 16px;
				font-weight: 500;
			}

			.action-bar {
				display: grid;
				grid-template-columns: 1fr 1fr;
				gap: 10px;
			}

			.btn {
				padding: 8px 12px;
				border: 1px solid var(--border-color);
				border-radius: 6px;
				background-color: #fff;
				color: var(--text-main);
				font-size: 13px;
				cursor: pointer;
				transition: all 0.2s;
			}

			.btn:hover {
				background-color: var(--highlight-bg);
				border-color: var(--primary-color);
			}

			.btn.primary {
				background-color: var(--primary-color);
				color: white;
				border: none;
				grid-column: span 2; /* 占据整行 */
				font-weight: 600;
				padding: 10px;
			}

			.btn.primary:hover {
				opacity: 0.9;
			}

			.btn:hover {
				background-color: var(--highlight-bg);
				border-color: var(--primary-color);
			}

			.btn.primary {
				background-color: var(--primary-color);
				color: white;
				border: none;
				grid-column: span 2;
				font-weight: 600;
				padding: 10px;

			.title-section {
				text-align: center;
				margin-bottom: 20px;
			}

			.main-title {
				margin: 0 0 16px 0;
				font-size: 22px;
				font-weight: 700;
				color: var(--text-primary);
				letter-spacing: -0.025em;
			}

			.poetic-text {
				color: var(--text-secondary);
				font-size: 14px;
				line-height: 1.6;
				margin-bottom: 16px;
				font-style: italic;
			}

			.chance {
				color: var(--primary-color);
				font-weight: 600;
				text-decoration: underline;
				text-underline-offset: 2px;
				text-decoration-thickness: 1px;
				text-decoration-color: rgba(74, 144, 226, 0.3);
			}

			.doc-stats {
				display: inline-block;
				background: var(--primary-light);
				color: var(--primary-color);
				font-size: 13px;
				font-weight: 600;
				padding: 6px 12px;
				border-radius: 20px;
				border: 1px solid rgba(74, 144, 226, 0.2);
			}

			
			/* Content Layout - Modern Card Grid */
			.siyuan-content {
				display: grid;
				grid-template-columns: 1fr;
				gap: 20px;
				margin-bottom: 20px;
			}

			/* Modern Card Styles */
			.metrics-panel,
			.chart-panel,
			.tables-panel,
			.recommendations-panel {
				background: var(--bg-primary);
				border-radius: var(--border-radius-lg);
				padding: 20px;
				box-shadow: var(--shadow-sm);
				border: 1px solid var(--border-color);
				transition: all 0.2s ease;
			}

			.metrics-panel:hover,
			.chart-panel:hover,
			.tables-panel:hover,
			.recommendations-panel:hover {
				box-shadow: var(--shadow-md);
				transform: translateY(-2px);
			}

			.panel-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 20px;
				padding-bottom: 12px;
				border-bottom: 2px solid var(--border-color);
			}

			.panel-title {
				margin: 0;
				font-size: 16px;
				font-weight: 600;
				color: var(--text-primary);
				display: flex;
				align-items: center;
				gap: 8px;
			}

			.panel-title::before {
				content: '';
				width: 4px;
				height: 20px;
				background: var(--primary-color);
				border-radius: 2px;
			}

			.expand-btn {
				background: var(--bg-tertiary);
				border: 1px solid var(--border-color);
				color: var(--text-secondary);
				cursor: pointer;
				font-size: 12px;
				padding: 6px 10px;
				border-radius: var(--border-radius);
				transition: all 0.2s ease;
			}

			.expand-btn:hover {
				background: var(--primary-light);
				color: var(--primary-color);
				border-color: var(--primary-color);
			}

			/* Metrics Panel */
			.metrics-content {
				flex: 1;
				overflow-y: auto;
			}

			.comprehensive-scoring-section {
				margin-bottom: 24px;
				padding: 16px;
				background: #f8f9fa;
				border-radius: 8px;
				border: 1px solid #e0e0e0;
			}

			.scoring-title {
				margin: 0 0 16px 0;
				font-size: 16px;
				font-weight: 600;
				color: #333;
				text-align: center;
			}

			.metric-slider-group {
				margin-bottom: 16px;
			}

			.slider-label-container {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 8px;
			}

			.slider-label {
				font-size: 13px;
				font-weight: 500;
				color: #333;
			}

			.slider-value {
				font-size: 14px;
				font-weight: 600;
				min-width: 35px;
				text-align: right;
			}

			.metric-slider {
				width: 100%;
				height: 6px;
				border-radius: 3px;
				background: #ddd;
				outline: none;
				-webkit-appearance: none;
				margin: 4px 0;
			}

			.metric-slider::-webkit-slider-thumb {
				-webkit-appearance: none;
				appearance: none;
				width: 16px;
				height: 16px;
				border-radius: 50%;
				background: #007acc;
				cursor: pointer;
				box-shadow: 0 2px 4px rgba(0, 122, 204, 0.3);
			}

			.metric-slider::-moz-range-thumb {
				width: 16px;
				height: 16px;
				border-radius: 50%;
				background: #007acc;
				cursor: pointer;
				border: none;
				box-shadow: 0 2px 4px rgba(0, 122, 204, 0.3);
			}

			.priority-section {
				margin-bottom: 20px;
			}

			.priority-label {
				font-size: 12px;
				color: #666;
				margin-bottom: 4px;
			}

			.priority-container {
				display: flex;
				align-items: center;
				gap: 16px;
				margin-bottom: 16px;
			}

			.priority-value {
				font-size: 32px;
				font-weight: 600;
				color: #007acc;
				min-width: 80px;
				text-align: right;
			}

			.integrated-scoring-slider {
				flex: 1;
				height: 8px;
				border-radius: 4px;
				background: #ddd;
				outline: none;
				-webkit-appearance: none;
				margin: 0;
			}

			.integrated-scoring-slider::-webkit-slider-thumb {
				-webkit-appearance: none;
				appearance: none;
				width: 20px;
				height: 20px;
				border-radius: 50%;
				background: #007acc;
				cursor: pointer;
				box-shadow: 0 2px 6px rgba(0, 122, 204, 0.3);
			}

			.integrated-scoring-slider::-moz-range-thumb {
				width: 20px;
				height: 20px;
				border-radius: 50%;
				background: #007acc;
				cursor: pointer;
				border: none;
				box-shadow: 0 2px 6px rgba(0, 122, 204, 0.3);
			}

			.weight-breakdown {
				margin-bottom: 16px;
			}

			.weight-item {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 8px 0;
				border-bottom: 1px solid #f0f0f0;
			}

			.weight-item:last-child {
				border-bottom: none;
			}

			.weight-label {
				font-size: 12px;
				color: #666;
			}

			.weight-value {
				font-size: 14px;
				font-weight: 500;
				color: #333;
			}

			.visit-stats {
				border-top: 1px solid #e0e0e0;
				padding-top: 12px;
			}

			.visit-stat {
				font-size: 12px;
				color: #666;
				margin-bottom: 4px;
			}

			.metric-actions {
				display: flex;
				flex-direction: column;
				gap: 8px;
			}

			.action-btn {
				padding: 8px 16px;
				border: 1px solid #ddd;
				border-radius: 4px;
				font-size: 12px;
				cursor: pointer;
				transition: all 0.2s;
			}

			.action-btn.primary {
				background: #007acc;
				color: white;
				border-color: #007acc;
			}

			.action-btn.primary:hover {
				background: #005a9e;
			}

			.action-btn.secondary {
				background: white;
				color: #333;
			}

			.action-btn.secondary:hover {
				background: #f0f0f0;
			}

			.action-btn.disabled {
				background: #ccc !important;
				color: #999 !important;
				border-color: #ccc !important;
				cursor: not-allowed !important;
				opacity: 0.6;
			}

			.action-btn.disabled:hover {
				background: #ccc !important;
				transform: none !important;
			}

			/* Chart Panel */
			.chart-controls {
				display: flex;
				gap: 8px;
				margin-bottom: 16px;
			}

			.chart-btn {
				padding: 4px 8px;
				border: 1px solid #ddd;
				background: white;
				border-radius: 3px;
				font-size: 11px;
				cursor: pointer;
			}

			.chart-btn.active {
				background: #007acc;
				color: white;
				border-color: #007acc;
			}

			
			.axis-container {
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				pointer-events: none;
			}

			.axis-label {
				position: absolute;
				font-size: 12px;
				font-weight: 600;
				color: #666;
			}

			.y-axis {
				top: 50%;
				left: 10px;
				transform: translateY(-50%) rotate(-90deg);
				transform-origin: center;
				width: 100px;
				text-align: center;
			}

			.x-axis {
				bottom: 10px;
				left: 50%;
				transform: translateX(-50%);
				width: 150px;
				text-align: center;
			}

			.axis-values {
				position: absolute;
				font-size: 10px;
				color: #888;
			}

			.y-values {
				left: 25px;
				top: 30px;
				bottom: 40px;
				width: 20px;
			}

			.axis-value {
				position: absolute;
				right: 0;
				transform: translateY(50%);
			}

			.chart-content {
				width: 100%;
				height: 100%;
				position: relative;
				background: linear-gradient(to bottom, #f8f9fa 0%, #f8f9fa 100%);
			}

			.grid-line {
				position: absolute;
				left: 40px;
				right: 10px;
				height: 1px;
				background: #e0e0e0;
				opacity: 0.5;
			}

			.grid-line.horizontal {
				width: calc(100% - 50px);
				left: 40px;
			}

			.grid-line.major {
				background: #ccc;
				opacity: 0.8;
			}

			.empty-chart-message {
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				color: #999;
				font-size: 12px;
				text-align: center;
				padding: 20px;
			}

			.empty-icon {
				font-size: 48px;
				margin-bottom: 12px;
				opacity: 0.5;
			}

			.empty-title {
				font-size: 16px;
				font-weight: 600;
				color: #666;
				margin-bottom: 8px;
			}

			.empty-desc {
				font-size: 12px;
				color: #999;
				line-height: 1.4;
			}

			/* Tab Navigation */
			.section {
				margin-bottom: 24px;
				padding: 16px;
				background: #f8f9fa;
				border-radius: 8px;
				border: 1px solid #e0e0e0;
			}

			.section-title {
				margin: 0 0 16px 0;
				padding: 8px 0;
				border-bottom: 2px solid #007acc;
				color: #333;
				font-size: 16px;
				font-weight: 600;
			}

			.section-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 16px;
			}

			/* Tab Headers */
			.tab-header {
				margin-bottom: 20px;
				padding: 16px;
				background: #f8f9fa;
				border-radius: 8px;
				border: 1px solid #e0e0e0;
			}

			.tab-header h3 {
				margin: 0 0 12px 0;
				font-size: 18px;
				font-weight: 600;
				color: #333;
			}

			.refresh-btn {
				padding: 8px 16px;
				border: 1px solid #007acc;
				border-radius: 6px;
				background: white;
				color: #007acc;
				font-size: 13px;
				font-weight: 500;
				cursor: pointer;
				transition: all 0.2s ease;
			}

			.refresh-btn:hover {
				background: #007acc;
				color: white;
			}

			/* Tab Content Layout */
			.reading-content,
			.recommendations-content,
			.analytics-content {
				display: flex;
				flex-direction: column;
				gap: 20px;
			}

			.control-buttons {
				display: flex;
				gap: 12px;
				flex-wrap: wrap;
				padding: 16px;
				background: #f8f9fa;
				border-radius: 8px;
				border: 1px solid #e0e0e0;
			}

			.analytics-content {
				display: grid;
				grid-template-columns: 1fr 1fr;
				gap: 20px;
			}

			@media (max-width: 1200px) {
				.analytics-content {
					grid-template-columns: 1fr;
				}
			}

			.chart-dot {
				width: 8px;
				height: 8px;
				border-radius: 50%;
				position: absolute;
				cursor: pointer;
				transition: all 0.3s ease;
				z-index: 2;
				background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
				border: 2px solid rgba(255, 255, 255, 0.9);
				box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3);
			}

			.chart-dot:hover {
				width: 12px;
				height: 12px;
				background: linear-gradient(135deg, var(--primary-light), var(--primary-color));
				box-shadow: 0 4px 16px rgba(74, 144, 226, 0.5), 0 2px 8px rgba(0,0,0,0.2);
				transform: scale(1.2);
				z-index: 5;
			}

			.chart-dot::before {
				content: '';
				position: absolute;
				top: -4px;
				left: -4px;
				right: -4px;
				bottom: -4px;
				border-radius: 50%;
				background: radial-gradient(circle, rgba(74, 144, 226, 0.1) 0%, transparent 70%);
				opacity: 0;
				transition: opacity 0.3s ease;
			}

			.chart-dot:hover::before {
				opacity: 1;
			}

			.score-line {
				height: 2px;
				position: absolute;
				opacity: 0.6;
				border-radius: 1px;
				z-index: 1;
				transition: all 0.2s;
			}

			.empty-chart {
				display: flex;
				align-items: center;
				justify-content: center;
				height: 100%;
				color: #999;
				font-size: 12px;
			}

			/* Tables Panel */
			.table-section {
				margin-bottom: 20px;
			}

			.table-section:last-child {
				margin-bottom: 0;
			}

			.table-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 12px;
			}

			.table-title {
				margin: 0;
				font-size: 12px;
				font-weight: 600;
				color: #333;
			}

			.table-controls {
				display: flex;
				gap: 4px;
			}

			.table-btn {
				padding: 2px 6px;
				border: 1px solid #ddd;
				background: white;
				border-radius: 3px;
				font-size: 10px;
				cursor: pointer;
			}

			.table-filter {
				font-size: 10px;
				color: #666;
				padding: 2px 6px;
				border: 1px solid #ddd;
				border-radius: 3px;
				background: #f0f0f0;
			}

			.visit-table,
			.priority-table {
				max-height: 200px;
				overflow-y: auto;
			}

			.table-row {
				display: flex;
				align-items: center;
				padding: 6px 0;
				border-bottom: 1px solid #f0f0f0;
				font-size: 11px;
			}

			.table-row:last-child {
				border-bottom: none;
			}

			.table-cell {
				padding: 0 6px;
			}

			.table-cell.rank {
				color: #007acc;
				font-weight: 600;
				min-width: 20px;
			}

			.table-cell.name {
				flex: 1;
				color: #333;
			}

			.table-cell.visits {
				color: #666;
				font-size: 10px;
			}

			.table-cell.priority {
				color: #333;
				font-weight: 500;
			}

			.table-cell.actions {
				min-width: 40px;
				display: flex;
				gap: 4px;
			}

			.clear-btn {
				padding: 2px 6px;
				border: 1px solid #ff6b6b;
				background: white;
				color: #ff6b6b;
				border-radius: 3px;
				font-size: 10px;
				cursor: pointer;
			}

			.clear-btn:hover {
				background: #ff6b6b;
				color: white;
			}

			.edit-btn {
				padding: 2px 6px;
				border: 1px solid #007acc;
				background: white;
				color: #007acc;
				border-radius: 3px;
				font-size: 10px;
				cursor: pointer;
			}

			.edit-btn:hover {
				background: #007acc;
				color: white;
			}

			/* Document Metrics Modal Styles */
			.document-metrics-modal .sliders-container {
				max-height: 400px;
				overflow-y: auto;
				padding: 10px 0;
			}

			.document-metrics-modal .slider-group {
				margin-bottom: 20px;
				padding: 8px;
				background: #f8f9fa;
				border-radius: 4px;
			}

			.document-metrics-modal .label-row {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 8px;
			}

			.document-metrics-modal .metric-label {
				font-weight: 500;
				color: #333;
				font-size: 13px;
			}

			.document-metrics-modal .value-display {
				font-weight: 600;
				color: #007acc;
				font-size: 14px;
				min-width: 30px;
				text-align: right;
			}

			.document-metrics-modal .slider {
				width: 100%;
				height: 6px;
				border-radius: 3px;
				background: #ddd;
				outline: none;
				margin: 8px 0;
			}

			.document-metrics-modal .slider::-webkit-slider-thumb {
				-webkit-appearance: none;
				appearance: none;
				width: 18px;
				height: 18px;
				border-radius: 50%;
				background: #007acc;
				cursor: pointer;
				box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
			}

			.document-metrics-modal .slider::-moz-range-thumb {
				width: 18px;
				height: 18px;
				border-radius: 50%;
				background: #007acc;
				cursor: pointer;
				border: none;
				box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
			}

			/* Empty states */
			.empty-metrics {
				display: flex;
				align-items: center;
				justify-content: center;
				height: 100%;
				color: #999;
				font-size: 12px;
			}

			/* Responsive adjustments */
			@media (max-width: 1024px) {
				.siyuan-content {
					grid-template-columns: 1fr;
					grid-template-rows: auto auto auto;
				}
			}

			@media (max-width: 768px) {
				.siyuan-ir-view {
					padding: 8px;
				}

				.siyuan-content {
					gap: 8px;
					height: calc(100vh - 160px);
				}

				.metrics-panel,
				.chart-panel,
				.tables-panel {
					padding: 12px;
				}

				.priority-value {
					font-size: 24px;
				}
			}

			/* Modern Button Styles */
			.action-btn {
				background: var(--bg-primary);
				border: 2px solid var(--border-color);
				color: var(--text-primary);
				padding: 12px 20px;
				border-radius: var(--border-radius);
				font-size: 14px;
				font-weight: 600;
				cursor: pointer;
				transition: all 0.2s ease;
				outline: none;
				display: inline-flex;
				align-items: center;
				gap: 8px;
			}

			.action-btn:hover {
				transform: translateY(-1px);
				box-shadow: var(--shadow-sm);
				border-color: var(--primary-color);
			}

			.action-btn.primary {
				background: var(--primary-color);
				color: white;
				border-color: var(--primary-color);
			}

			.action-btn.primary:hover {
				background: #3a7bc8;
				border-color: #3a7bc8;
			}

			.action-btn.secondary {
				background: var(--bg-primary);
				color: var(--text-secondary);
				border-color: var(--border-color);
			}

			.action-btn.secondary:hover {
				background: var(--primary-light);
				color: var(--primary-color);
				border-color: var(--primary-color);
			}

			.action-btn:disabled {
				background: var(--bg-tertiary);
				color: var(--text-muted);
				border-color: var(--border-color);
				cursor: not-allowed;
				transform: none;
				box-shadow: none;
			}

			.action-btn.disabled {
				background: var(--bg-tertiary);
				color: var(--text-muted);
				border-color: var(--border-color);
				cursor: not-allowed;
				transform: none;
				box-shadow: none;
			}

			/* Control Buttons Layout */
			.metric-actions {
				display: grid;
				grid-template-columns: 1fr 1fr;
				gap: 12px;
				margin-top: 20px;
			}

			.control-buttons {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
				gap: 12px;
				margin-top: 16px;
			}

			/* ========================================
			   模块1: 文档指标 - 现代化卡片设计
			   ======================================== */
			.metrics-content {
				padding: 8px 0;
			}

			.comprehensive-scoring-section {
				background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
				border-radius: 12px;
				padding: 20px;
				box-shadow: 0 2px 12px rgba(74, 144, 226, 0.08);
				margin-bottom: 20px;
			}

			.scoring-title {
				text-align: center;
				font-size: 16px;
				font-weight: 700;
				color: var(--primary-color);
				margin: 0 0 24px 0;
				padding-bottom: 12px;
				border-bottom: 2px solid rgba(74, 144, 226, 0.1);
				letter-spacing: 0.5px;
			}

			.metric-slider-group {
				margin-bottom: 24px;
				background: rgba(255, 255, 255, 0.6);
				padding: 16px;
				border-radius: 10px;
				transition: all 0.3s ease;
				border: 1px solid rgba(74, 144, 226, 0.1);
			}

			.metric-slider-group:hover {
				background: rgba(255, 255, 255, 0.9);
				transform: translateY(-2px);
				box-shadow: 0 4px 12px rgba(74, 144, 226, 0.12);
			}

			.slider-label-container {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 10px;
			}

			.slider-label {
				font-size: 14px;
				font-weight: 600;
				color: var(--text-main);
				letter-spacing: 0.3px;
			}

			.slider-value {
				background: var(--primary-color);
				color: white;
				padding: 4px 10px;
				border-radius: 12px;
				font-size: 13px;
				font-weight: 700;
				min-width: 40px;
				text-align: center;
				box-shadow: 0 2px 6px rgba(74, 144, 226, 0.3);
			}

			.metric-slider {
				width: 100%;
				height: 6px !important;
				border-radius: 3px !important;
				background: linear-gradient(to right, #e2e8f0 0%, #cbd5e1 100%) !important;
				outline: none;
				-webkit-appearance: none;
				margin: 8px 0;
				cursor: pointer;
			}

			.metric-slider::-webkit-slider-thumb {
				-webkit-appearance: none;
				width: 20px !important;
				height: 20px !important;
				border-radius: 50% !important;
				background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%) !important;
				cursor: pointer;
				box-shadow: 0 2px 8px rgba(74, 144, 226, 0.4) !important;
				border: 2px solid white !important;
				transition: all 0.2s ease;
			}

			.metric-slider::-webkit-slider-thumb:hover {
				transform: scale(1.15);
				box-shadow: 0 4px 12px rgba(74, 144, 226, 0.6) !important;
			}

			.priority-section {
				background: linear-gradient(135deg, #fff8e1 0%, #fff9c4 100%);
				border-radius: 16px;
				padding: 20px;
				margin: 20px 0;
				text-align: center;
				border: 2px solid rgba(255, 217, 61, 0.3);
				box-shadow: 0 4px 16px rgba(255, 193, 7, 0.15);
			}

			.priority-label {
				font-size: 13px;
				color: #f59e0b;
				margin-bottom: 8px;
				font-weight: 600;
				letter-spacing: 0.5px;
				text-transform: uppercase;
			}

			.priority-value {
				font-size: 32px;
				font-weight: 800;
				background: linear-gradient(135deg, #f59e0b 0%, #ff9800 100%);
				-webkit-background-clip: text;
				background-clip: text;
				color: transparent;
				text-shadow: 0 2px 4px rgba(255, 152, 0, 0.2);
				margin: 8px 0;
			}

			.weight-breakdown {
				background: rgba(255, 255, 255, 0.7);
				border-radius: 10px;
				padding: 16px;
				margin-top: 20px;
				border: 1px solid rgba(74, 144, 226, 0.1);
			}

			.weight-breakdown h5 {
				margin: 0 0 16px 0;
				font-size: 14px;
				color: var(--text-main);
				font-weight: 700;
				text-align: center;
			}

			.weight-item {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 10px 12px;
				margin-bottom: 8px;
				border-radius: 8px;
				background: rgba(255, 255, 255, 0.9);
				border-left: 4px solid var(--primary-color);
				transition: all 0.2s ease;
			}

			.weight-item:hover {
				transform: translateX(4px);
				box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
			}

			.weight-label {
				font-size: 13px;
				font-weight: 600;
			}

			.weight-value {
				font-size: 14px;
				font-weight: 700;
				color: var(--primary-color);
				background: rgba(74, 144, 226, 0.1);
				padding: 4px 10px;
				border-radius: 8px;
			}

			.visit-stats {
				display: grid;
				grid-template-columns: 1fr 1fr;
				gap: 16px;
				margin-top: 20px;
			}

			.visit-stat {
				background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
				padding: 12px 16px;
				border-radius: 10px;
				font-size: 13px;
				font-weight: 600;
				text-align: center;
				color: var(--text-main);
				box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
			}

			.metric-item {
				display: flex;
				justify-content: space-between;
				padding: 12px 16px;
				margin-bottom: 8px;
				background: linear-gradient(to right, #fafafa 0%, white 100%);
				border-radius: 10px;
				font-size: 14px;
				font-weight: 600;
				color: var(--text-main);
				border: 1px solid rgba(74, 144, 226, 0.1);
				transition: all 0.2s ease;
			}

			.metric-item:hover {
				background: linear-gradient(to right, #eef4ff 0%, white 100%);
				transform: translateY(-2px);
				box-shadow: 0 4px 12px rgba(74, 144, 226, 0.1);
			}

			/* 空状态样式 */
			.empty-message {
				text-align: center;
				padding: 40px 20px;
				color: var(--text-sub);
				font-style: italic;
				font-size: 14px;
				background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
				border-radius: 12px;
				margin: 20px 0;
				border: 1px dashed var(--primary-color);
			}

			/* 推荐列表样式 - 根据需求文档 */
			.rec-list {
				list-style: none;
				padding: 0;
				margin: 0;
			}

			.rec-item {
				padding: 12px;
				border: 1px solid #eee;
				border-radius: 8px;
				margin-bottom: 10px;
			}

			.rec-title {
				font-weight: 600;
				font-size: 14px;
				margin-bottom: 4px;
			}

			.rec-meta {
				font-size: 11px;
				color: #888;
				display: flex;
				justify-content: space-between;
			}

			.empty-state {
				text-align: center;
				padding: 40px 0;
				color: #999;
				font-size: 13px;
			}

			/* 排行榜样式 - 根据需求文档 */
			.ranking-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 10px;
				margin-top: 20px;
			}

			.ranking-header:first-child {
				margin-top: 0;
			}

			.rank-title {
				font-weight: bold;
				font-size: 14px;
			}

			.btn-mini {
				padding: 4px 8px;
				font-size: 11px;
			}

			.rank-list {
				list-style: none;
				padding: 0;
			}

			.rank-item {
				display: flex;
				justify-content: space-between;
				padding: 8px 0;
				border-bottom: 1px solid #eee;
				font-size: 13px;
			}

			.rank-score {
				font-family: monospace;
				font-weight: bold;
			}

			.document-item {
				padding: 10px 12px;
				border-radius: 6px;
				display: flex;
				justify-content: space-between;
				align-items: center;
				transition: all 0.2s ease;
				background: var(--card-bg);
				border: 1px solid var(--border-color);
				cursor: pointer;
			}

			.document-item:hover {
				background: var(--highlight-bg);
				border-color: var(--primary-color);
				transform: translateY(-1px);
				box-shadow: 0 2px 8px rgba(74, 144, 226, 0.2);
			}

			.document-info {
				flex: 1;
				min-width: 0;
			}

			.document-name {
				font-weight: 600;
				color: var(--text-primary);
				font-size: 14px;
				margin-bottom: 4px;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.document-stats {
				font-size: 12px;
				color: var(--text-secondary);
				display: flex;
				gap: 12px;
			}

			.document-actions {
				display: flex;
				gap: 8px;
			}

			.open-document-btn,
			.edit-btn,
			.clear-btn {
				padding: 6px 12px;
				border-radius: var(--border-radius);
				border: 1px solid var(--border-color);
				background: var(--bg-primary);
				color: var(--text-secondary);
				font-size: 12px;
				cursor: pointer;
				transition: all 0.2s ease;
			}

			.open-document-btn:hover {
				background: var(--primary-color);
				color: white;
				border-color: var(--primary-color);
			}

			.edit-btn:hover {
				background: var(--warning-color);
				color: white;
				border-color: var(--warning-color);
			}

			.clear-btn:hover {
				background: var(--danger-color);
				color: white;
				border-color: var(--danger-color);
			}

			/* Modern Section Styles */
			.section {
				background: var(--bg-primary);
				border-radius: var(--border-radius-lg);
				padding: 20px;
				box-shadow: var(--shadow-sm);
				border: 1px solid var(--border-color);
				margin-bottom: 20px;
			}

			.section-title {
				margin: 0 0 16px 0;
				font-size: 16px;
				font-weight: 600;
				color: var(--text-primary);
				display: flex;
				align-items: center;
				gap: 8px;
			}

			.controls-panel {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
				gap: 12px;
			}

			/* Responsive Design */
			@media (max-width: 768px) {
				.siyuan-ir-view {
					padding: 12px;
				}

				.siyuan-header {
					padding: 16px;
				}

				.metric-actions,
				.control-buttons,
				.controls-panel {
					grid-template-columns: 1fr;
				}

				.main-title {
					font-size: 18px;
				}

				.panel-title {
					font-size: 14px;
				}
			}

			/* 区域二：滑动导航栏 - 优化布局 */
			.sliding-navigation {
				background: linear-gradient(135deg, var(--bg-secondary) 0%, rgba(74, 144, 226, 0.05) 100%);
				padding: 6px;
				margin: 12px 16px 0 16px;
				border-radius: 12px;
				position: relative;
				display: flex;
				height: 42px;
				border: 1px solid rgba(74, 144, 226, 0.3);
				box-shadow: 0 2px 8px rgba(74, 144, 226, 0.1);
			}

			.tabs-wrapper {
				display: flex;
				position: relative;
				width: 100%;
				gap: 2px; /* 标签间距 */
			}

			/* 滑动的方块 (背景) - 优化设计 */
			.tab-slider {
				position: absolute;
				top: 2px;
				left: 2px;
				width: calc(33.33% - 1.5px); /* 3个Tab平分宽度，考虑间距 */
				height: 34px;
				background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%);
				border-radius: 8px;
				box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3), 0 2px 4px rgba(0,0,0,0.1);
				transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1); /* 更平滑的动画 */
				z-index: 1;
				transform: translateX(0%);
				border: 1px solid rgba(255, 255, 255, 0.3);
			}

			.tab-btn {
				border: none;
				background: transparent;
				font-size: 13px;
				color: var(--text-sub);
				z-index: 2; /* 在滑块之上 */
				cursor: pointer;
				font-weight: 600;
				transition: all 0.3s ease;
				border-radius: 8px;
				position: relative;
				overflow: hidden;
				display: flex;
				align-items: center;
				justify-content: center;
				flex: 1; /* 三个tab平分宽度 */
			}

			.tab-btn::before {
				content: '';
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				background: linear-gradient(135deg, rgba(74, 144, 226, 0.1) 0%, transparent 100%);
				opacity: 0;
				transition: opacity 0.3s ease;
			}

			.tab-btn:hover::before {
				opacity: 1;
			}

			.tab-btn:hover {
				color: var(--primary-color);
				transform: translateY(-1px);
			}

			.tab-btn.active {
				color: #ffffff;
				font-weight: 700;
				text-shadow: 0 1px 2px rgba(0,0,0,0.1);
			}

			/* 区域三：内容区域 */
			.content-area {
				flex: 1;
				overflow-y: auto;
				padding: 20px;
				position: relative;
			}

			
			.content-section {
				display: none; /* 默认隐藏 */
				animation: fadeIn 0.3s ease;
			}

			.content-section.active {
				display: block; /* 激活显示 */
			}

			@keyframes fadeIn {
				from { opacity: 0; transform: translateY(5px); }
				to { opacity: 1; transform: translateY(0); }
			}

			.section-title {
				margin: 0 0 16px 0;
				font-size: 16px;
				font-weight: 600;
				color: var(--text-main);
				border-bottom: 1px solid var(--border-color);
				padding-bottom: 8px;
			}

			.empty-message {
				text-align: center;
				color: var(--text-sub);
				font-style: italic;
				padding: 40px 20px;
			}

			.rank-item {
				display: flex;
				align-items: center;
				padding: 12px 16px;
				background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
				border-radius: 12px;
				transition: all 0.3s ease;
				border: 1px solid rgba(74, 144, 226, 0.08);
				box-shadow: 0 2px 6px rgba(0,0,0,0.04);
				position: relative;
				overflow: hidden;
				margin-bottom: 12px;
				cursor: pointer;
				gap: 12px; /* 添加元素间距 */
			}

			.rank-item::before {
				content: '';
				position: absolute;
				top: 0;
				left: 0;
				width: 3px;
				height: 100%;
				background: linear-gradient(180deg, var(--primary-color), var(--primary-light));
				opacity: 0;
				transition: opacity 0.3s ease;
				border-radius: 12px 0 0 12px;
			}

			.rank-item:hover {
				background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
				transform: translateY(-1px) translateX(2px);
				box-shadow: 0 4px 16px rgba(74, 144, 226, 0.12), 0 2px 6px rgba(0,0,0,0.08);
				border-color: rgba(74, 144, 226, 0.2);
			}

			.rank-item:hover::before {
				opacity: 1;
			}

			.rank-number {
				font-weight: 800;
				min-width: 28px;
				font-size: 14px;
				display: flex;
				align-items: center;
				justify-content: center;
				width: 32px;
				height: 32px;
				border-radius: 50%;
				border: 2px solid rgba(74, 144, 226, 0.15);
				background: linear-gradient(135deg, rgba(74, 144, 226, 0.08) 0%, rgba(107, 163, 229, 0.12) 100%);
				color: var(--primary-color);
				flex-shrink: 0; /* 防止压缩 */
			}

			.rank-name {
				flex: 1;
				font-size: 14px;
				font-weight: 600;
				color: var(--text-main);
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
				line-height: 1.4; /* 添加行高 */
				min-width: 0; /* 允许压缩 */
			}

			.rank-value {
				font-weight: 700;
				color: var(--primary-color);
				font-size: 13px;
				background: linear-gradient(135deg, rgba(74, 144, 226, 0.1) 0%, rgba(107, 163, 229, 0.15) 100%);
				padding: 6px 12px;
				border-radius: 8px;
				border: 1px solid rgba(74, 144, 226, 0.2);
				min-width: 60px;
				text-align: center;
				position: relative;
				overflow: hidden;
				transition: all 0.3s ease;
				font-weight: 600;
				flex-shrink: 0; /* 防止压缩 */
				line-height: 1.4; /* 添加行高 */
			}

			.rank-value::before {
				content: '';
				position: absolute;
				top: 0;
				left: -100%;
				width: 100%;
				height: 100%;
				background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
				transition: left 0.4s ease;
			}

			.rank-item:hover .rank-value::before {
				left: 100%;
			}

			.rank-item:hover .rank-value {
				transform: scale(1.05);
				background: linear-gradient(135deg, rgba(74, 144, 226, 0.15) 0%, rgba(107, 163, 229, 0.2) 100%);
				border-color: rgba(74, 144, 226, 0.3);
			}

			/* 前三名特殊样式 - 优化版 */
			.rank-item:nth-child(1) .rank-number {
				background: linear-gradient(135deg, #ffd700, #ffed4e);
				color: #8b6914;
				border-color: rgba(255, 215, 0, 0.4);
				box-shadow: 0 3px 8px rgba(255, 215, 0, 0.3);
				transform: scale(1.08);
				font-weight: 900;
			}

			.rank-item:nth-child(2) .rank-number {
				background: linear-gradient(135deg, #c0c0c0, #e8e8e8);
				color: #555;
				border-color: rgba(192, 192, 192, 0.4);
				box-shadow: 0 3px 8px rgba(192, 192, 192, 0.3);
				transform: scale(1.04);
				font-weight: 850;
			}

			.rank-item:nth-child(3) .rank-number {
				background: linear-gradient(135deg, #cd7f32, #e4a853);
				color: #6b4226;
				border-color: rgba(205, 127, 50, 0.4);
				box-shadow: 0 3px 8px rgba(205, 127, 50, 0.3);
				transform: scale(1.02);
				font-weight: 820;
			}

			/* 前三名排行项特殊背景 */
			.rank-item:nth-child(1) {
				background: linear-gradient(135deg, #fffdf6 0%, #fff9e6 100%);
				border-color: rgba(255, 215, 0, 0.2);
			}

			.rank-item:nth-child(2) {
				background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
				border-color: rgba(192, 192, 192, 0.2);
			}

			.rank-item:nth-child(3) {
				background: linear-gradient(135deg, #fff8f0 0%, #fef1e6 100%);
				border-color: rgba(205, 127, 50, 0.2);
			}

			/* 排行模块全新设计 */
			.ranking-wrapper {
				height: 100%;
				overflow: hidden;
				position: relative;
			}

			.ranking-container {
				display: flex;
				flex-direction: column;
				gap: 20px;
				height: 100%;
				padding: 16px;
			}

			.rank-section {
				background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
				border-radius: 20px;
				padding: 0;
				border: 1px solid rgba(74, 144, 226, 0.08);
				box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
				overflow: hidden;
				position: relative;
			}

			.rank-section::before {
				content: '';
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				height: 3px;
				background: linear-gradient(90deg, var(--primary-color), var(--primary-light), var(--primary-dark));
			}

			.rank-title {
				font-size: 15px;
				font-weight: 700;
				color: var(--text-main);
				margin: 0;
				padding: 16px 20px;
				background: linear-gradient(135deg, rgba(74, 144, 226, 0.05) 0%, rgba(107, 163, 229, 0.08) 100%);
				border-bottom: 1px solid rgba(74, 144, 226, 0.1);
				position: relative;
				letter-spacing: 0.5px;
			}

			.rank-title::before {
				content: '';
				position: absolute;
				left: 0;
				top: 50%;
				transform: translateY(-50%);
				width: 4px;
				height: 20px;
				background: linear-gradient(180deg, var(--primary-color), var(--primary-light));
				border-radius: 2px;
			}

			.rank-list {
				padding: 12px 16px 16px 16px;
				max-height: 280px;
				overflow-y: auto;
			}

			/* 自定义排行滚动条 */
			.rank-list::-webkit-scrollbar {
				width: 4px;
			}

			.rank-list::-webkit-scrollbar-track {
				background: rgba(74, 144, 226, 0.05);
				border-radius: 2px;
			}

			.rank-list::-webkit-scrollbar-thumb {
				background: linear-gradient(180deg, var(--primary-light), var(--primary-color));
				border-radius: 2px;
			}

			/* 推荐列表样式 */
			.recommendations-list {
				display: flex;
				flex-direction: column;
				gap: 12px;
				max-height: 450px;
				overflow-y: auto;
				padding: 8px;
				border-radius: 12px;
				background: linear-gradient(135deg, rgba(74, 144, 226, 0.02) 0%, rgba(107, 163, 229, 0.05) 100%);
				border: 1px solid rgba(74, 144, 226, 0.1);
			}

			.recommendations-list::-webkit-scrollbar {
				width: 6px;
			}

			.recommendations-list::-webkit-scrollbar-track {
				background: rgba(74, 144, 226, 0.05);
				border-radius: 3px;
			}

			.recommendations-list::-webkit-scrollbar-thumb {
				background: linear-gradient(180deg, var(--primary-light), var(--primary-color));
				border-radius: 3px;
			}

			.recommendations-list::-webkit-scrollbar-thumb:hover {
				background: linear-gradient(180deg, var(--primary-color), var(--primary-dark));
			}

			.table-row {
				display: grid;
				grid-template-columns: 40px 1fr 80px;
				align-items: center;
				padding: 16px 20px;
				background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
				border-radius: 12px;
				cursor: pointer;
				transition: all 0.3s ease;
				border: 1px solid rgba(74, 144, 226, 0.1);
				box-shadow: 0 2px 8px rgba(0,0,0,0.05);
				position: relative;
				overflow: hidden;
			}

			.table-row::before {
				content: '';
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				background: linear-gradient(135deg, rgba(74, 144, 226, 0.05) 0%, transparent 100%);
				opacity: 0;
				transition: opacity 0.3s ease;
			}

			.table-row:hover {
				background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
				transform: translateY(-2px) translateX(4px);
				box-shadow: 0 6px 20px rgba(74, 144, 226, 0.15), 0 2px 8px rgba(0,0,0,0.1);
				border-color: rgba(74, 144, 226, 0.3);
			}

			.table-row:hover::before {
				opacity: 1;
			}
			}

			.table-cell {
				font-size: 14px;
				color: var(--text-main);
				position: relative;
				z-index: 1;
			}

			.table-cell.rank {
				font-weight: 700;
				color: var(--primary-color);
				text-align: center;
				font-size: 15px;
			}

			.table-cell.name {
				font-weight: 600;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
				color: var(--text-main);
				padding-right: 20px;
			}

			.table-cell.priority {
				font-weight: 700;
				color: var(--primary-color);
				text-align: right;
				font-size: 15px;
			}

			.empty-recommendations {
				text-align: center;
				padding: 60px 20px;
				color: var(--text-sub);
				font-style: italic;
				background: linear-gradient(135deg, rgba(74, 144, 226, 0.02) 0%, rgba(107, 163, 229, 0.05) 100%);
				border-radius: 16px;
				border: 2px dashed rgba(74, 144, 226, 0.2);
				position: relative;
				overflow: hidden;
			}

			.empty-recommendations::before {
				content: '🔍';
				position: absolute;
				top: 20px;
				left: 50%;
				transform: translateX(-50%);
				font-size: 32px;
				opacity: 0.5;
				font-style: normal;
			}

			.empty-recommendations p {
				margin: 0;
				font-size: 16px;
				font-weight: 600;
				margin-top: 20px;
				color: var(--text-sub);
				background: linear-gradient(135deg, var(--text-sub), var(--primary-color));
				-webkit-background-clip: text;
				-webkit-text-fill-color: transparent;
				background-clip: text;
			}

			/* 推荐项操作按钮样式 */
			.recommendation-actions {
				display: flex;
				gap: 8px;
				opacity: 0;
				transition: opacity 0.3s ease;
			}

			.table-row:hover .recommendation-actions {
				opacity: 1;
			}

			.action-btn-small {
				padding: 4px 8px;
				font-size: 11px;
				border-radius: 4px;
				border: 1px solid var(--primary-color);
				background: var(--primary-color);
				color: white;
				cursor: pointer;
				transition: all 0.2s ease;
			}

			.action-btn-small:hover {
				background: var(--primary-dark);
				transform: scale(1.05);
			}

			/* 浮动刷新按钮样式 */
			.floating-refresh-btn {
				position: fixed;
				bottom: 24px;
				right: 24px;
				padding: 12px 16px;
				background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
				color: white;
				border: none;
				border-radius: 24px;
				font-size: 13px;
				font-weight: 600;
				cursor: pointer;
				box-shadow: 0 4px 16px rgba(74, 144, 226, 0.4), 0 2px 8px rgba(0,0,0,0.1);
				transition: all 0.3s ease;
				z-index: 1000;
				display: flex;
				align-items: center;
				gap: 6px;
				border: 2px solid rgba(255, 255, 255, 0.3);
				backdrop-filter: blur(10px);
			}

			.floating-refresh-btn:hover {
				transform: translateY(-2px) scale(1.05);
				box-shadow: 0 6px 24px rgba(74, 144, 226, 0.5), 0 4px 12px rgba(0,0,0,0.15);
				background: linear-gradient(135deg, var(--primary-dark), var(--primary-color));
			}

			.floating-refresh-btn:active {
				transform: translateY(0) scale(0.98);
			}

			/* 内容区域容器样式 */
			.recommendations-wrapper,
			.chart-wrapper,
			.ranking-wrapper {
				height: 100%;
				position: relative;
			}

			.recommendation-item {
				background: var(--card-bg);
				border-radius: 8px;
				padding: 16px;
				box-shadow: 0 2px 8px rgba(0,0,0,0.1);
				transition: transform 0.2s;
			}

			.recommendation-item:hover {
				transform: translateY(-2px);
				box-shadow: 0 4px 16px rgba(0,0,0,0.15);
			}

			/* 图表容器样式 - 修复遮蔽问题 */
			.chart-container {
				background: linear-gradient(135deg, var(--card-bg) 0%, #f8fafc 100%);
				border-radius: 16px;
				padding: 24px;
				box-shadow: 0 8px 32px rgba(0,0,0,0.08);
				min-height: 420px;
				position: relative;
				border: 1px solid rgba(74, 144, 226, 0.1);
				overflow: visible; /* 修复遮蔽问题 */
				z-index: 1;
			}

			.chart-container::before {
				content: '📊 文档分布图谱';
				position: absolute;
				top: 16px;
				left: 24px;
				font-size: 14px;
				font-weight: 600;
				color: var(--primary-color);
				background: rgba(255, 255, 255, 0.9);
				padding: 6px 12px;
				border-radius: 6px;
				border: 1px solid rgba(74, 144, 226, 0.2);
				z-index: 10;
			}

			.chart-wrapper {
				width: 100%;
				height: 380px;
				position: relative;
				padding: 50px 20px 50px 60px;
				margin-top: 20px;
				border-radius: 12px;
				overflow: visible; /* 修复遮蔽问题 */
				background: linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%);
				box-shadow: inset 0 2px 8px rgba(0,0,0,0.05);
			}

			.axis-container {
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				pointer-events: none;
			}

			.axis-label {
				position: absolute;
				font-size: 12px;
				font-weight: 600;
				color: var(--text-sub);
			}

			.y-axis {
				transform: rotate(-90deg);
				transform-origin: left top;
				left: 15px;
				top: 50%;
			}

			.x-axis {
				bottom: 10px;
				left: 50%;
				transform: translateX(-50%);
			}

			.chart-content {
				width: 100%;
				height: 100%;
				position: relative;
				background: linear-gradient(to bottom, #f8f9fa 0%, #f8f9fa 100%);
				border: 1px solid var(--border-color);
				border-radius: 4px;
				overflow: hidden;
			}

			.grid-line {
				position: absolute;
				left: 60px;
				right: 20px;
				height: 1px;
				background: linear-gradient(90deg, rgba(74, 144, 226, 0.1) 0%, rgba(74, 144, 226, 0.05) 50%, rgba(74, 144, 226, 0.1) 100%);
				opacity: 0.6;
				border-radius: 1px;
			}

			.grid-line.horizontal {
				width: calc(100% - 80px);
				left: 60px;
			}

			.grid-line.major {
				background: linear-gradient(90deg, rgba(74, 144, 226, 0.3) 0%, rgba(74, 144, 226, 0.2) 50%, rgba(74, 144, 226, 0.3) 100%);
				opacity: 0.8;
				height: 2px;
				box-shadow: 0 1px 2px rgba(74, 144, 226, 0.1);
			}

			.grid-line.vertical {
				width: 1px;
				height: calc(100% - 100px);
				top: 50px;
			}

			.grid-line.vertical.major {
				width: 2px;
				background: linear-gradient(180deg, rgba(74, 144, 226, 0.3) 0%, rgba(74, 144, 226, 0.2) 50%, rgba(74, 144, 226, 0.3) 100%);
			}

			.axis-values {
				position: absolute;
				top: 0;
				left: 0;
				bottom: 0;
				width: 40px;
			}

			.y-values {
				display: flex;
				flex-direction: column;
				justify-content: space-between;
				height: 100%;
			}

			.axis-value {
				position: absolute;
				font-size: 10px;
				color: var(--text-sub);
				right: 5px;
			}

			.chart-dot {
				width: 8px;
				height: 8px;
				border-radius: 50%;
				position: absolute;
				cursor: pointer;
				transition: all 0.3s ease;
				z-index: 2;
				background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
				border: 2px solid rgba(255, 255, 255, 0.9);
				box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3);
			}

			.chart-dot:hover {
				width: 12px;
				height: 12px;
				background: linear-gradient(135deg, var(--primary-light), var(--primary-color));
				box-shadow: 0 4px 16px rgba(74, 144, 226, 0.5), 0 2px 8px rgba(0,0,0,0.2);
				transform: scale(1.2);
				z-index: 5;
			}

			.chart-dot::before {
				content: '';
				position: absolute;
				top: -4px;
				left: -4px;
				right: -4px;
				bottom: -4px;
				border-radius: 50%;
				background: radial-gradient(circle, rgba(74, 144, 226, 0.1) 0%, transparent 70%);
				opacity: 0;
				transition: opacity 0.3s ease;
			}

			.chart-dot:hover::before {
				opacity: 1;
			}

			.score-line {
				height: 2px;
				position: absolute;
				opacity: 0.6;
				border-radius: 1px;
				z-index: 1;
				transition: all 0.2s;
			}

			.empty-chart-message {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				height: 100%;
				color: var(--text-sub);
				text-align: center;
				padding: 20px;
			}

			.empty-icon {
				font-size: 48px;
				margin-bottom: 16px;
				opacity: 0.5;
			}

			.empty-title {
				font-size: 16px;
				font-weight: 600;
				margin-bottom: 8px;
			}

			.empty-desc {
				font-size: 14px;
				line-height: 1.4;
				max-width: 300px;
			}

			/* 按钮禁用状态 */
			.btn:disabled {
				background-color: var(--border-color);
				color: var(--text-sub);
				cursor: not-allowed;
			}

			.btn.disabled {
				background-color: var(--border-color);
				color: var(--text-sub);
				cursor: not-allowed;
			}

			/* 文档指标滑块样式 - 现代化设计 */
			.comprehensive-scoring-section {
				background: linear-gradient(135deg, var(--card-bg) 0%, #f8fafc 100%);
				border-radius: 16px;
				padding: 24px;
				margin-bottom: 24px;
				box-shadow: 0 8px 32px rgba(0,0,0,0.08);
				border: 1px solid rgba(74, 144, 226, 0.1);
				position: relative;
				overflow: hidden;
			}

			.comprehensive-scoring-section::before {
				content: '';
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				height: 3px;
				background: linear-gradient(90deg, var(--primary-color), var(--primary-light), var(--primary-dark));
				border-radius: 16px 16px 0 0;
			}

			.scoring-title {
				margin: 0 0 24px 0;
				font-size: 18px;
				font-weight: 700;
				color: var(--text-main);
				text-align: center;
				background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
				-webkit-background-clip: text;
				-webkit-text-fill-color: transparent;
				background-clip: text;
				text-shadow: 0 2px 4px rgba(74, 144, 226, 0.1);
			}

			.metric-slider-group {
				margin-bottom: 24px;
				padding: 16px;
				background: rgba(255, 255, 255, 0.7);
				border-radius: 12px;
				border: 1px solid rgba(74, 144, 226, 0.05);
				backdrop-filter: blur(10px);
				transition: all 0.3s ease;
			}

			.metric-slider-group:hover {
				background: rgba(255, 255, 255, 0.9);
				border-color: rgba(74, 144, 226, 0.15);
				transform: translateY(-2px);
				box-shadow: 0 4px 16px rgba(74, 144, 226, 0.1);
			}

			.slider-label-container {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 12px;
			}

			.slider-label {
				font-size: 14px;
				font-weight: 600;
				color: var(--text-main);
				display: flex;
				align-items: center;
				gap: 8px;
			}

			.slider-label::before {
				content: '◆';
				color: var(--primary-color);
				font-size: 10px;
			}

			.slider-value {
				font-size: 16px;
				font-weight: 700;
				min-width: 42px;
				text-align: right;
				color: var(--primary-color);
				background: linear-gradient(135deg, var(--primary-light), var(--primary-color));
				-webkit-background-clip: text;
				-webkit-text-fill-color: transparent;
				background-clip: text;
			}

			.metric-slider {
				width: 100%;
				height: 8px;
				border-radius: 4px;
				background: linear-gradient(90deg, #e2e8f0 0%, #cbd5e1 50%, #e2e8f0 100%);
				outline: none;
				-webkit-appearance: none;
				margin: 8px 0;
				position: relative;
				box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
			}

			.metric-slider::-webkit-slider-thumb {
				-webkit-appearance: none;
				appearance: none;
				width: 20px;
				height: 20px;
				border-radius: 50%;
				background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
				cursor: pointer;
				box-shadow: 0 4px 12px rgba(74, 144, 226, 0.4), 0 2px 4px rgba(0,0,0,0.1);
				border: 3px solid rgba(255, 255, 255, 0.9);
				transition: all 0.2s ease;
			}

			.metric-slider::-webkit-slider-thumb:hover {
				transform: scale(1.1);
				box-shadow: 0 6px 16px rgba(74, 144, 226, 0.5), 0 4px 8px rgba(0,0,0,0.15);
			}

			.metric-slider::-moz-range-thumb {
				width: 20px;
				height: 20px;
				border-radius: 50%;
				background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
				cursor: pointer;
				border: 3px solid rgba(255, 255, 255, 0.9);
				box-shadow: 0 4px 12px rgba(74, 144, 226, 0.4), 0 2px 4px rgba(0,0,0,0.1);
				transition: all 0.2s ease;
			}

			.metric-slider::-moz-range-thumb:hover {
				transform: scale(1.1);
				box-shadow: 0 6px 16px rgba(74, 144, 226, 0.5), 0 4px 8px rgba(0,0,0,0.15);
			}

			/* 优先级显示区域现代化设计 */
			.priority-section {
				margin-bottom: 24px;
				padding: 20px;
				background: linear-gradient(135deg, rgba(74, 144, 226, 0.05) 0%, rgba(107, 163, 229, 0.08) 100%);
				border-radius: 12px;
				border: 2px solid rgba(74, 144, 226, 0.2);
				position: relative;
				overflow: hidden;
			}

			.priority-section::before {
				content: '⭐ 优先级评分';
				position: absolute;
				top: 12px;
				left: 20px;
				font-size: 12px;
				font-weight: 600;
				color: var(--primary-color);
				background: rgba(255, 255, 255, 0.9);
				padding: 4px 8px;
				border-radius: 4px;
			}

			.priority-container {
				display: flex;
				align-items: center;
				gap: 20px;
				margin-top: 20px;
			}

			.priority-value {
				font-size: 36px;
				font-weight: 800;
				color: var(--primary-color);
				min-width: 100px;
				text-align: right;
				background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
				-webkit-background-clip: text;
				-webkit-text-fill-color: transparent;
				background-clip: text;
				text-shadow: 0 4px 8px rgba(74, 144, 226, 0.2);
			}

			.integrated-scoring-slider {
				flex: 1;
				height: 12px;
				border-radius: 6px;
				background: linear-gradient(90deg, #e2e8f0 0%, var(--primary-light) 50%, var(--primary-color) 100%);
				outline: none;
				-webkit-appearance: none;
				margin: 0;
				box-shadow: inset 0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(74, 144, 226, 0.2);
			}

			.integrated-scoring-slider::-webkit-slider-thumb {
				-webkit-appearance: none;
				appearance: none;
				width: 24px;
				height: 24px;
				border-radius: 50%;
				background: linear-gradient(135deg, #ffffff, #f8fafc);
				cursor: pointer;
				box-shadow: 0 6px 20px rgba(74, 144, 226, 0.5), 0 3px 8px rgba(0,0,0,0.2);
				border: 4px solid var(--primary-color);
				transition: all 0.3s ease;
			}

			.integrated-scoring-slider::-webkit-slider-thumb:hover {
				transform: scale(1.15);
				box-shadow: 0 8px 24px rgba(74, 144, 226, 0.6), 0 4px 12px rgba(0,0,0,0.25);
			}

			.integrated-scoring-slider::-moz-range-thumb {
				width: 24px;
				height: 24px;
				border-radius: 50%;
				background: linear-gradient(135deg, #ffffff, #f8fafc);
				cursor: pointer;
				border: 4px solid var(--primary-color);
				box-shadow: 0 6px 20px rgba(74, 144, 226, 0.5), 0 3px 8px rgba(0,0,0,0.2);
				transition: all 0.3s ease;
			}

			.integrated-scoring-slider::-moz-range-thumb:hover {
				transform: scale(1.15);
				box-shadow: 0 8px 24px rgba(74, 144, 226, 0.6), 0 4px 12px rgba(0,0,0,0.25);
			}

			/* 优先级显示样式 */
			.priority-section {
				margin-bottom: 20px;
				padding: 16px;
				background: var(--bg-color);
				border-radius: 8px;
				border: 1px solid var(--border-color);
			}

			.priority-label {
				font-size: 12px;
				color: var(--text-sub);
				margin-bottom: 4px;
			}

			.priority-value {
				font-size: 24px;
				font-weight: 600;
				color: var(--primary-color);
				text-align: center;
				padding: 10px 0;
			}

			.weight-breakdown {
				margin-top: 16px;
			}

			.weight-breakdown h5 {
				margin: 0 0 12px 0;
				font-size: 14px;
				font-weight: 600;
				color: var(--text-main);
			}

			.weight-item {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 6px 0;
				border-bottom: 1px solid #f0f0f0;
			}

			.weight-item:last-child {
				border-bottom: none;
			}

			.weight-label {
				font-size: 12px;
				color: var(--text-sub);
			}

			.weight-value {
				font-size: 13px;
				font-weight: 600;
				color: var(--text-main);
			}

			.visit-stats {
				margin-top: 16px;
				padding: 12px;
				background: #f8f9fa;
				border-radius: 6px;
			}

			.visit-stat {
				font-size: 12px;
				color: var(--text-sub);
				margin-bottom: 4px;
			}

			.visit-stat:last-child {
				margin-bottom: 0;
			}

			/* ============= 完全重写的三个模块样式 ============= */

			/* 1. 排行显示模块 - 全新flex布局 */
			.ranking-item {
				display: flex;
				align-items: center;
				gap: 16px;
				padding: 16px;
				background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
				border-radius: 12px;
				border: 1px solid rgba(74, 144, 226, 0.1);
				margin-bottom: 12px;
				cursor: pointer;
				transition: all 0.3s ease;
			}

			.ranking-item:hover {
				background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
				transform: translateY(-2px);
				box-shadow: 0 6px 20px rgba(74, 144, 226, 0.12), 0 2px 6px rgba(0,0,0,0.08);
			}

			.rank-col {
				width: 40px;
				flex-shrink: 0;
				display: flex;
				justify-content: center;
				align-items: center;
			}

			.rank-badge {
				width: 32px;
				height: 32px;
				border-radius: 50%;
				background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
				color: white;
				font-weight: 800;
				font-size: 14px;
				display: flex;
				align-items: center;
				justify-content: center;
				box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3);
			}

			.date-col {
				flex: 1;
				display: flex;
				align-items: center;
				justify-content: flex-start;
				padding: 0 8px;
			}

			.file-name {
				font-size: 14px;
				font-weight: 600;
				color: var(--text-main);
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
				max-width: 100%;
			}

			.count-col {
				width: 80px;
				flex-shrink: 0;
				display: flex;
				align-items: center;
				justify-content: flex-end;
			}

			.visit-count, .priority-score {
				background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(107, 163, 229, 0.15));
				color: var(--primary-color);
				padding: 6px 12px;
				border-radius: 8px;
				border: 1px solid rgba(74, 144, 226, 0.2);
				font-weight: 700;
				font-size: 13px;
				text-align: center;
				min-width: 60px;
			}

			/* 前三名特殊样式 */
			.ranking-item:nth-child(1) .rank-badge {
				background: linear-gradient(135deg, #ffd700, #ffed4e);
				color: #8b6914;
				box-shadow: 0 3px 8px rgba(255, 215, 0, 0.3);
			}

			.ranking-item:nth-child(2) .rank-badge {
				background: linear-gradient(135deg, #c0c0c0, #e8e8e8);
				color: #555;
				box-shadow: 0 3px 8px rgba(192, 192, 192, 0.3);
			}

			.ranking-item:nth-child(3) .rank-badge {
				background: linear-gradient(135deg, #cd7f32, #e4a853);
				color: #6b4226;
				box-shadow: 0 3px 8px rgba(205, 127, 50, 0.3);
			}

			/* 2. 智能推荐模块 - CSS Grid布局 */
			.recommendation-row {
				display: grid;
				grid-template-columns: 50px 1fr 80px; /* 索引、名称、分数 */
				align-items: center;
				gap: 16px;
				padding: 14px 16px;
				background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
				border-radius: 12px;
				border: 1px solid rgba(74, 144, 226, 0.08);
				margin-bottom: 12px;
				cursor: pointer;
				transition: all 0.3s ease;
				min-height: 48px;
			}

			.recommendation-row:hover {
				background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
				transform: translateY(-2px);
				box-shadow: 0 6px 20px rgba(74, 144, 226, 0.12), 0 2px 6px rgba(0,0,0,0.08);
				border-color: rgba(74, 144, 226, 0.2);
			}

			.rec-index {
				display: flex;
				align-items: center;
				justify-content: center;
			}

			.index-text {
				background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
				color: white;
				font-weight: 700;
				font-size: 14px;
				padding: 4px 8px;
				border-radius: 6px;
				min-width: 28px;
				text-align: center;
				box-shadow: 0 2px 6px rgba(74, 144, 226, 0.3);
			}

			.rec-name {
				display: flex;
				align-items: center;
				justify-content: flex-start;
				padding: 0 8px;
			}

			.name-text {
				font-size: 14px;
				font-weight: 600;
				color: var(--text-main);
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
				max-width: 100%;
				line-height: 1.4;
			}

			.rec-score {
				display: flex;
				align-items: center;
				justify-content: flex-end;
			}

			.score-text {
				background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(107, 163, 229, 0.15));
				color: var(--primary-color);
				font-weight: 700;
				font-size: 13px;
				padding: 6px 10px;
				border-radius: 8px;
				border: 1px solid rgba(74, 144, 226, 0.2);
				text-align: center;
				min-width: 65px;
			}

			/* 3. 图谱模块 - Flex居中布局 */
			.chart-main-container {
				display: flex;
				justify-content: center;
				align-items: center;
				width: 100%;
				height: 100%;
				min-height: 400px;
				padding: 20px;
				box-sizing: border-box;
			}

			.chart-inner-wrapper {
				max-width: 100%;
				max-height: 100%;
				overflow: hidden;
				border-radius: 12px;
				position: relative;
			}

			/* 清理旧的样式冲突 */
			.ranking-item,
			.recommendation-row,
			.chart-main-container {
				box-sizing: border-box;
			}

			/* 确保内容不溢出 */
			.ranking-item,
			.recommendation-row,
			.file-name,
			.name-text {
				overflow: hidden;
			}

			/* ============= 改进的点状图样式 ============= */
			.improved-dot {
				width: 12px;
				height: 12px;
				border-radius: 50%;
				border: 2px solid rgba(255, 255, 255, 0.9);
				box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
				transition: all 0.3s ease;
				z-index: 10;
				position: absolute;
			}

			.improved-dot:hover {
				width: 16px;
				height: 16px;
				box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
				transform: translate(-50%, 50%) scale(1.2) !important;
				z-index: 15;
			}

			.improved-score-line {
				position: absolute;
				border-radius: 2px;
				transition: all 0.3s ease;
				z-index: 5;
			}

			.improved-score-line:hover {
				opacity: 0.8 !important;
				height: 6px;
			}

			/* 覆盖旧的点状图样式以避免冲突 */
			.chart-content .chart-dot:not(.improved-dot) {
				display: none;
			}

			.chart-content .score-line:not(.improved-score-line) {
				display: none;
			}
		`;

		document.head.appendChild(style);
		this.stylesAdded = true;
	}

	// Tab switching and page creation methods
	
	private createContinueReadingSection(container: HTMLElement) {
		// 漫游式渐进阅读控制
		const section = container.createEl('div', { cls: 'section continue-reading-section' });
		section.createEl('h3', { cls: 'section-title', text: '📖 漫游式渐进阅读' });

		const controlsPanel = section.createEl('div', { cls: 'controls-panel' });
		this.createControlsPanel(controlsPanel);
	}

	private createDocumentMetricsSection(container: HTMLElement) {
		// 文档指标
		const section = container.createEl('div', { cls: 'section metrics-section' });
		section.createEl('h3', { cls: 'section-title', text: '📋 文档指标' });

		const metricsPanel = section.createEl('div', { cls: 'metrics-panel' });
		this.createMetricsPanel(metricsPanel);
	}

	private createRecommendationsSection(container: HTMLElement) {
		// 智能推荐
		const section = container.createEl('div', { cls: 'section recommendations-section' });
		section.createEl('h3', { cls: 'section-title', text: '🔍 智能推荐' });

		const header = section.createEl('div', { cls: 'section-header' });

		const refreshBtn = header.createEl('button', {
			cls: 'refresh-btn',
			text: '🔄 刷新推荐'
		});
		refreshBtn.onclick = () => this.refreshRecommendations();

		const recommendationsList = section.createEl('div', { cls: 'recommendations-list' });
		this.recommendationsList = recommendationsList;
		this.updateRecommendationsList();
	}

	private createAnalyticsSection(container: HTMLElement) {
		// 数据分析 (图表 + 排序表)
		const section = container.createEl('div', { cls: 'section analytics-section' });
		section.createEl('h3', { cls: 'section-title', text: '📊 数据分析' });

		// Tables panel
		const tablesPanel = section.createEl('div', { cls: 'tables-panel' });
		this.createTablesPanel(tablesPanel);
	}

	private createControlsPanel(container: HTMLElement) {
		// Control buttons
		const controls = container.createEl('div', { cls: 'control-buttons' });

		this.continueBtn = controls.createEl('button', {
			cls: 'action-btn primary',
			text: '继续漫游'
		});
		this.continueBtn.onclick = () => this.continueReading();

		// 更新按钮状态
		this.updateContinueButtonState(this.continueBtn);

		const recommendBtn = controls.createEl('button', {
			cls: 'action-btn secondary',
			text: '智能推荐'
		});
		recommendBtn.onclick = () => this.getSmartRecommendations();

		// 状态更新按钮
		const refreshDataBtn = controls.createEl('button', {
			cls: 'action-btn secondary',
			text: '状态更新'
		});
		refreshDataBtn.onclick = () => this.refreshSiyuanData();

		const randomRoamBtn = controls.createEl('button', {
			cls: 'action-btn secondary',
			text: '随机漫游'
		});
		randomRoamBtn.onclick = () => this.randomRoaming();

		this.addRoamingBtn = controls.createEl('button', {
			cls: 'action-btn secondary',
			text: '加入漫游'
		});
		this.addRoamingBtn.onclick = () => this.addCurrentToRoaming();

		// 更新按钮状态
		this.updateAddRoamingButtonState();
	}

	private refreshReadingTab() {
		const metricsPanel = this.containerEl.querySelector('.reading-content .metrics-panel');
		if (metricsPanel) {
			metricsPanel.empty();
			this.createMetricsPanel(metricsPanel as HTMLElement);
		}
	}

	private refreshRecommendationsTab() {
		const recommendationsList = this.containerEl.querySelector('.recommendations-list');
		if (recommendationsList) {
			this.recommendationsList = recommendationsList as HTMLElement;
			this.updateRecommendationsList();
		}
	}

	private refreshAnalyticsTab() {
		
		this.updateVisitTable();
		this.updatePriorityTable();
	}

	private refreshRecommendations() {
		// Force refresh of recommendations
		this.refreshRecommendationsTab();
		new Notice('推荐列表已刷新');
	}
}