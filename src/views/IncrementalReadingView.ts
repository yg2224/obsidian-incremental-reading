import { ItemView, WorkspaceLeaf, TFile, Notice } from 'obsidian';
import IncrementalReadingPlugin from '../main';
import { DocumentMetrics, CustomMetric } from '../models/Settings';
import { DocumentMetricsModal } from '../components/Modal';
import { i18n } from '../i18n';

// 导入组件
import { ActionBar } from './components/ActionBar';
import { DocumentMetricsDisplay } from './components/DocumentMetrics';
import { NavigationTabs } from './components/NavigationTabs';
import { RankingList } from './components/RankingList';
import { RecommendationList } from './components/RecommendationList';
import { PriorityVisualization } from './components/PriorityVisualization';

export const VIEW_TYPE_INCREMENTAL_READING = 'incremental-reading-view';

/**
 * 漫游式渐进阅读主视图
 */
export class IncrementalReadingView extends ItemView {
    plugin: IncrementalReadingPlugin;
    private currentFile: TFile | null = null;
    private currentMetrics: DocumentMetrics | null = null;
    private lastProcessedFile: string | null = null;
    private lastProcessedTime: number = 0;

    // 状态元素
    private statusText: HTMLElement | null = null;

    // 组件实例
    private actionBar: ActionBar | null = null;
    private documentMetricsDisplay: DocumentMetricsDisplay | null = null;
    private navigationTabs: NavigationTabs | null = null;
    private rankingList: RankingList | null = null;
    private recommendationList: RecommendationList | null = null;
    private priorityVisualization: PriorityVisualization | null = null;

    // 视图状态
    private currentActiveTab: string = 'metrics';

    constructor(leaf: WorkspaceLeaf, plugin: IncrementalReadingPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return VIEW_TYPE_INCREMENTAL_READING;
    }

    getDisplayText(): string {
        return i18n.t('view.title');
    }

    getIcon(): string {
        return 'book-open';
    }

    async onOpen(): Promise<void> {
        this.createView();

        // 添加文件切换监听器
        this.registerEvent(
            this.app.workspace.on('file-open', (file) => {
                this.onFileOpen(file);
            })
        );

        // 添加活动叶子变化监听器（仅更新UI，不增加计数）
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', () => {
                // 只更新按钮状态，不调用 onFileOpen 避免重复计数
                this.actionBar?.updateButtonStates();
            })
        );
    }

    async onClose(): Promise<void> {
        this.cleanup();
    }

    private createView(): void {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('plugin-container');

        this.createHeroSection(container);
        this.createSlidingNavigation(container);
        this.createContentArea(container);

        this.addStyles();

        // 初始数据加载
        this.refreshData();

        // 默认显示指标部分
        setTimeout(() => {
            this.switchToTab('metrics', 0);
        }, 100);

        // 立即更新按钮状态（基于当前活动文件）
        setTimeout(() => {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
                this.onFileOpen(activeFile);
            } else {
                // 即使没有活动文件，也要更新按钮状态
                this.actionBar?.updateButtonStates();
            }
        }, 150);
    }

    private createHeroSection(container: HTMLElement): void {
        const heroSection = container.createEl('div', { cls: 'hero-section' });

        // 主标题
        heroSection.createEl('h1', { cls: 'main-title', text: i18n.t('view.title') });

        // 诗意副标题
        const subtitle = heroSection.createEl('p', { cls: 'poetic-subtitle' });
        subtitle.innerHTML = i18n.t('view.subtitle');

        // 状态徽章
        const docCount = this.getVisitedDocumentCount();
        this.statusText = heroSection.createEl('div', { cls: 'status-text' });
        this.statusText.innerHTML = `<span>📚</span><span>${i18n.t('view.statusTemplate', { count: docCount.toString() })}</span>`;

        // 操作栏
        this.actionBar = new ActionBar(heroSection, this.plugin, {
            onContinueReading: () => this.continueReading(),
            onGetSmartRecommendations: () => this.getSmartRecommendations(),
            onRefreshData: () => this.refreshData(),
            onRandomRoaming: () => this.randomRoaming(),
            onAddCurrentToRoaming: () => this.addCurrentToRoaming(),
            onRemoveCurrentFromRoaming: () => this.removeCurrentFromRoaming()
        });
    }

    private createSlidingNavigation(container: HTMLElement): void {
        this.navigationTabs = new NavigationTabs(
            container,
            (tabId, index) => this.switchToTab(tabId, index),
            'metrics'
        );
    }

    private createContentArea(container: HTMLElement): void {
        const content = container.createEl('div', { cls: 'content-area' });

        // 创建不同视图的内容区域
        this.createMetricsSection(content);
        this.createRecommendationsSection(content);
        this.createRankingSection(content);
        this.createVisualizationSection(content);

        // 初始隐藏所有部分
        this.hideAllSections();
    }

    private createMetricsSection(container: HTMLElement): void {
        const metricsSection = container.createEl('div', { cls: 'metrics-section', attr: { 'data-section': 'metrics' } });

        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            const metrics = this.plugin.getDocumentMetrics(activeFile);
            this.documentMetricsDisplay = new DocumentMetricsDisplay(
                metricsSection,
                this.plugin,
                activeFile,
                metrics,
                () => this.refreshData() // 当指标更新时刷新数据
            );
            this.documentMetricsDisplay.render();
        } else {
            metricsSection.createEl('p', { text: i18n.t('metrics.noFileOpen'), cls: 'empty-message' });
        }
    }

    private createRecommendationsSection(container: HTMLElement): void {
        const recommendationsSection = container.createEl('div', { cls: 'recommendations-section', attr: { 'data-section': 'recommendations' } });

        this.recommendationList = new RecommendationList(recommendationsSection, this.plugin, {
            onOpenDocument: (file) => this.openDocument(file),
            onEditMetrics: (file, metrics) => {} // 空实现，保留接口兼容性
        });
    }

    private createRankingSection(container: HTMLElement): void {
        const rankingSection = container.createEl('div', { cls: 'ranking-section', attr: { 'data-section': 'ranking' } });

        this.rankingList = new RankingList(rankingSection, this.plugin, {
            onOpenDocument: (file) => this.openDocument(file),
            onEditMetrics: (file, metrics) => {} // 空实现，保留接口兼容性
        });
    }

    private createVisualizationSection(container: HTMLElement): void {
        const visualizationSection = container.createEl('div', { cls: 'visualization-section', attr: { 'data-section': 'visualization' } });

        this.priorityVisualization = new PriorityVisualization(
            visualizationSection,
            this.plugin,
            (file) => this.openDocument(file)
        );
    }

    private async switchToTab(tabId: string, index: number): Promise<void> {
        this.currentActiveTab = tabId;
        this.hideAllSections();
        this.showSection(tabId);

        // 更新导航状态
        this.navigationTabs?.setActiveTab(tabId);

        // 根据标签加载相应数据
        switch (tabId) {
            case 'metrics':
                this.updateMetricsSection();
                break;
            case 'recommendations':
                await this.updateRecommendationsSection();
                break;
            case 'ranking':
                this.updateRankingSection();
                break;
            case 'visualization':
                this.updateVisualizationSection();
                break;
        }
    }

    private hideAllSections(): void {
        const sections = this.containerEl.querySelectorAll('[data-section]');
        sections.forEach(section => {
            (section as HTMLElement).style.display = 'none';
        });
    }

    private showSection(sectionId: string): void {
        const section = this.containerEl.querySelector(`[data-section="${sectionId}"]`);
        if (section) {
            (section as HTMLElement).style.display = 'block';
        }
    }

    private updateMetricsSection(): void {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && this.documentMetricsDisplay) {
            const metrics = this.plugin.getDocumentMetrics(activeFile);
            this.documentMetricsDisplay.updateMetrics(activeFile, metrics);
        }
    }

    private async updateRecommendationsSection(): Promise<void> {
        if (this.recommendationList) {
            try {
                const recommendations = await this.plugin.recommendationService.getRecommendations();
                this.recommendationList.renderWithScores(recommendations);
            } catch (error) {
                console.error('更新推荐部分失败:', error);
                // Fallback to simple file list
                const recommendations = this.plugin.getRecommendedDocuments(10);
                this.recommendationList.render(recommendations);
            }
        }
    }

    private updateRankingSection(): void {
        if (this.rankingList) {
            this.rankingList.refresh();
        }
    }

    private updateVisualizationSection(): void {
        if (this.priorityVisualization) {
            this.priorityVisualization.refresh();
        }
    }

    // 业务逻辑方法
    private async onFileOpen(file: TFile | null): Promise<void> {
        if (!file) return;

        try {
            console.log(`文件切换到: ${file.path} (当前标签: ${this.currentActiveTab})`);

            // 防抖：避免短时间内重复处理同一文件（3秒内）
            const now = Date.now();
            if (this.lastProcessedFile === file.path && now - this.lastProcessedTime < 3000) {
                console.log('跳过重复的文件打开事件（防抖）');
                // 仍然更新UI，但不增加计数
                this.currentFile = file;
                this.currentMetrics = this.plugin.getDocumentMetrics(file);

                if (this.currentActiveTab === 'metrics') {
                    this.updateMetricsSection();
                }
                this.actionBar?.updateButtonStates();
                return;
            }

            this.currentFile = file;
            this.currentMetrics = this.plugin.getDocumentMetrics(file);

            // 只为漫游文档更新访问统计
            if (this.plugin.settings.roamingDocs.includes(file.path)) {
                await this.plugin.updateDocumentMetrics(file, {
                    lastVisited: Date.now(),
                    visitCount: (this.currentMetrics?.visitCount || 0) + 1
                });

                // 重新获取更新后的指标
                this.currentMetrics = this.plugin.getDocumentMetrics(file);

                // 记录最后处理的文件和时间
                this.lastProcessedFile = file.path;
                this.lastProcessedTime = now;
            }

            // 如果当前在指标标签页，更新显示
            if (this.currentActiveTab === 'metrics') {
                this.updateMetricsSection();
            }

            // 更新按钮状态
            this.actionBar?.updateButtonStates();

        } catch (error) {
            console.error('文件切换处理失败:', error);
            new Notice(i18n.t('notices.fileSwitchError'));
        }
    }

    private async continueReading(): Promise<void> {
        try {
            const validRoamingFiles = this.plugin.getValidRoamingFiles();

            if (validRoamingFiles.length === 0) {
                new Notice(i18n.t('view.actionBar.noDocuments'));
                return;
            }

            // 使用加权随机选择文档
            const weightedFiles = validRoamingFiles.map(file => {
                const metrics = this.plugin.getDocumentMetrics(file);
                const priority = this.calculatePriority(metrics); // 使用综合计算优先级
                return { file, weight: Math.max(0.1, priority) }; // 确保最小权重为0.1
            });

            // 计算权重总和
            const totalWeight = weightedFiles.reduce((sum, item) => sum + item.weight, 0);

            // 加权随机选择
            let random = Math.random() * totalWeight;
            let selectedFile: TFile | null = null;

            for (const { file, weight } of weightedFiles) {
                random -= weight;
                if (random <= 0) {
                    selectedFile = file;
                    break;
                }
            }

            if (selectedFile) {
                await this.openDocument(selectedFile);

                // 显示选择概率和相关信息
                const selectedWeight = weightedFiles.find(item => item.file.path === selectedFile.path)?.weight || 0.1;
                const selectionProbability = (selectedWeight / totalWeight * 100);

                new Notice(i18n.t('notices.selectionProbability', {
                    filename: selectedFile.basename,
                    probability: selectionProbability.toFixed(1)
                }));
            }

        } catch (error) {
            console.error('继续漫游失败:', error);
            new Notice(i18n.t('notices.continueFailed'));
        }
    }

    private async getSmartRecommendations(): Promise<void> {
        try {
            // Get recommendations with scores
            const recommendations = await this.plugin.recommendationService.getRecommendations();

            if (recommendations.length === 0) {
                new Notice(i18n.t('recommendations.emptyMessage'));
                return;
            }

            // Get the highest similarity recommendation
            const topRecommendation = recommendations[0];
            const similarity = (topRecommendation.score * 100).toFixed(1);

            // Open the document
            await this.openDocument(topRecommendation.file);

            // Show notification with similarity info
            new Notice(i18n.t('recommendations.smartJumpNotice', {
                filename: topRecommendation.file.basename,
                similarity: similarity
            }));

        } catch (error) {
            console.error('智能推荐失败:', error);
            new Notice(i18n.t('notices.smartRecommendationFailed'));
        }
    }

    private async refreshData(): Promise<void> {
        // 更新状态文本
        this.updateStatusText();

        // 更新所有数据
        this.updateMetricsSection();
        await this.updateRecommendationsSection();
        this.updateRankingSection();
        this.updateVisualizationSection();
        this.actionBar?.updateButtonStates();
    }

    /**
     * 刷新整个视图UI（用于语言切换）
     */
    public refreshUI(): void {
        console.log('开始刷新UI...');

        // 保存当前激活的标签页
        const currentTab = this.currentActiveTab;
        console.log(`当前激活标签: ${currentTab}`);

        // 完全重建视图
        this.createView();

        // 恢复之前激活的标签页并刷新数据
        setTimeout(() => {
            console.log(`恢复标签页: ${currentTab}`);
            const tabIndex = currentTab === 'metrics' ? 0 :
                            currentTab === 'recommendations' ? 1 :
                            currentTab === 'ranking' ? 2 :
                            currentTab === 'visualization' ? 3 : 0;
            this.switchToTab(currentTab, tabIndex);

            // 确保数据也被刷新
            this.refreshData();
        }, 200);
    }

    private updateStatusText(): void {
        if (this.statusText) {
            const docCount = this.getVisitedDocumentCount();
            this.statusText.innerHTML = `<span>📚</span><span>${i18n.t('view.statusTemplate', { count: docCount.toString() })}</span>`;
        }
    }

    private async randomRoaming(): Promise<void> {
        try {
            // 获取所有已加入漫游的文档
            const roamingFiles = this.plugin.getValidRoamingFiles();

            if (roamingFiles.length === 0) {
                new Notice(i18n.t('view.actionBar.noDocuments'));
                return;
            }

            // 从漫游文档中随机选择一个
            const randomIndex = Math.floor(Math.random() * roamingFiles.length);
            const randomFile = roamingFiles[randomIndex];

            await this.openDocument(randomFile);
            new Notice(i18n.t('notices.randomRoaming', { filename: randomFile.basename }));

        } catch (error) {
            console.error('随机漫游失败:', error);
            new Notice(i18n.t('notices.randomRoamingFailed'));
        }
    }

    private async addCurrentToRoaming(): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice(i18n.t('notices.noActiveFile'));
            return;
        }

        try {
            if (activeFile.extension !== 'md') {
                new Notice(i18n.t('notices.onlyMarkdownFiles'));
                return;
            }

            if (this.plugin.settings.roamingDocs.includes(activeFile.path)) {
                new Notice(i18n.t('view.actionBar.alreadyInRoaming'));
                return;
            }

            this.plugin.settings.roamingDocs.push(activeFile.path);

            const fileService = this.plugin.fileManagementService;
            const defaultMetrics = fileService.createDefaultMetricsForFile(activeFile);
            await this.plugin.updateDocumentMetrics(activeFile, defaultMetrics);

            await this.plugin.saveSettings();
            new Notice(i18n.t('notices.addedToRoaming', { filename: activeFile.basename }));

            this.refreshData();
            // 立即更新按钮状态
            this.actionBar?.updateButtonStates();

        } catch (error) {
            console.error('加入漫游失败:', error);
            new Notice(i18n.t('notices.errorSavingSettings'));
        }
    }

    private async removeCurrentFromRoaming(): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice(i18n.t('notices.noActiveFile'));
            return;
        }

        try {
            const index = this.plugin.settings.roamingDocs.indexOf(activeFile.path);
            if (index > -1) {
                this.plugin.settings.roamingDocs.splice(index, 1);
                await this.plugin.saveSettings();
                new Notice(i18n.t('notices.removedFromRoaming', { filename: activeFile.basename }));
                this.refreshData();
                // 立即更新按钮状态
                this.actionBar?.updateButtonStates();
            }
        } catch (error) {
            console.error('移除漫游失败:', error);
            new Notice(i18n.t('notices.errorSavingSettings'));
        }
    }

    private async openDocument(file: TFile): Promise<void> {
        try {
            await this.app.workspace.getLeaf().openFile(file);
        } catch (error) {
            console.error('打开文档失败:', error);
            new Notice(i18n.t('notices.documentOpenFailed'));
        }
    }

    private async editDocumentMetrics(file: TFile, currentMetrics: DocumentMetrics): Promise<void> {
        try {
            const modal = new DocumentMetricsModal(
                this.app,
                file,
                currentMetrics,
                this.plugin.settings.customMetrics,
                async (updatedMetrics) => {
                    await this.plugin.updateDocumentMetrics(file, updatedMetrics);
                    new Notice(i18n.t('notices.settingsSaved'));
                    this.refreshData();
                },
                async (realTimeMetrics) => {
                    await this.updateDocumentMetricsRealTime(file, realTimeMetrics);
                }
            );

            modal.open();
        } catch (error) {
            console.error('编辑文档得分失败:', error);
            new Notice(i18n.t('notices.editMetricsFailed'));
        }
    }

    private async updateDocumentMetricsRealTime(file: TFile, realTimeMetrics: DocumentMetrics): Promise<void> {
        try {
            this.plugin.settings.documentMetrics[file.path] = {
                ...realTimeMetrics,
                lastVisited: Date.now()
            };

            // 只更新排行榜部分以避免性能问题
            this.updateRankingSection();
        } catch (error) {
            console.warn('实时指标更新失败:', error);
        }
    }

    private calculatePriority(metrics: DocumentMetrics): number {
        return this.plugin.documentScoringService.calculatePriority(metrics, this.plugin.settings.customMetrics);
    }

    private getVisitedDocumentCount(): number {
        return this.plugin.settings.roamingDocs.length;
    }

    private addStyles(): void {
        // CSS 已通过 manifest.json 加载
    }

    private cleanup(): void {
        // 清理组件引用
        this.actionBar = null;
        this.documentMetricsDisplay = null;
        this.navigationTabs = null;
        this.rankingList = null;
        this.recommendationList = null;
        this.priorityVisualization = null;
    }
}