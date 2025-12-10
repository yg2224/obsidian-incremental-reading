import { ItemView, WorkspaceLeaf, TFile, Notice } from 'obsidian';
import IncrementalReadingPlugin from '../main';
import { DocumentMetrics, CustomMetric } from '../models/Settings';
import { DocumentMetricsModal } from '../components/Modal';

// 导入组件
import { ActionBar } from './components/ActionBar';
import { DocumentMetricsDisplay } from './components/DocumentMetrics';
import { NavigationTabs } from './components/NavigationTabs';
import { RankingList } from './components/RankingList';
import { RecommendationList } from './components/RecommendationList';

export const VIEW_TYPE_INCREMENTAL_READING = 'incremental-reading-view';

/**
 * 漫游式渐进阅读主视图
 */
export class IncrementalReadingView extends ItemView {
    plugin: IncrementalReadingPlugin;
    private currentFile: TFile | null = null;
    private currentMetrics: DocumentMetrics | null = null;

    // 状态元素
    private statusText: HTMLElement | null = null;

    // 组件实例
    private actionBar: ActionBar | null = null;
    private documentMetricsDisplay: DocumentMetricsDisplay | null = null;
    private navigationTabs: NavigationTabs | null = null;
    private rankingList: RankingList | null = null;
    private recommendationList: RecommendationList | null = null;

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
        return 'Incremental Reading';
    }

    getIcon(): string {
        return 'book-open';
    }

    async onOpen(): Promise<void> {
        this.createView();
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

        // 监听文件变化
        this.registerEvent(
            this.app.workspace.on('file-open', (file) => {
                this.onFileOpen(file);
            })
        );

        // 初始数据加载
        this.refreshData();

        // 默认显示指标部分
        setTimeout(() => {
            this.switchToTab('metrics', 0);
        }, 100);
    }

    private createHeroSection(container: HTMLElement): void {
        const heroSection = container.createEl('div', { cls: 'hero-section' });

        // 主标题
        heroSection.createEl('h1', { cls: 'main-title', text: '漫游式渐进阅读' });

        // 诗意副标题
        const subtitle = heroSection.createEl('p', { cls: 'poetic-subtitle' });
        subtitle.innerHTML = '"展卷乃无言的情意：以<span class="chance">等待漫游...</span>的机遇，<br>穿越星辰遇见你，三秋霜雪印马蹄。"';

        // 状态文本
        const docCount = this.getVisitedDocumentCount();
        this.statusText = heroSection.createEl('div', { cls: 'status-text' });
        this.statusText.textContent = `${docCount} 篇漫游文档${docCount === 0 ? ' (无漫游文档)' : ''}`;

        // 操作栏
        this.actionBar = new ActionBar(heroSection, this.plugin, {
            onContinueReading: () => this.continueReading(),
            onGetSmartRecommendations: () => this.getSmartRecommendations(),
            onRefreshData: () => this.refreshData(),
            onRandomRoaming: () => this.randomRoaming(),
            onAddCurrentToRoaming: () => this.addCurrentToRoaming()
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
            metricsSection.createEl('p', { text: '请先打开一个Markdown文档', cls: 'empty-message' });
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

    // 业务逻辑方法
    private async onFileOpen(file: TFile | null): Promise<void> {
        if (!file) return;

        try {
            console.log(`文件切换到: ${file.path} (当前标签: ${this.currentActiveTab})`);

            this.currentFile = file;
            this.currentMetrics = this.plugin.getDocumentMetrics(file);

            // 更新访问统计
            await this.plugin.updateDocumentMetrics(file, {
                lastVisited: Date.now(),
                visitCount: (this.currentMetrics?.visitCount || 0) + 1
            });

            // 如果当前在指标标签页，更新显示
            if (this.currentActiveTab === 'metrics') {
                this.updateMetricsSection();
            }

            // 更新按钮状态
            this.actionBar?.updateButtonStates();

        } catch (error) {
            console.error('文件切换处理失败:', error);
            new Notice('文件切换时出现错误');
        }
    }

    private async continueReading(): Promise<void> {
        try {
            const validRoamingFiles = this.plugin.getValidRoamingFiles();

            if (validRoamingFiles.length === 0) {
                new Notice('暂无漫游文档，请先添加文档到漫游列表');
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

                new Notice(`已选择：${selectedFile.basename} (选择概率: ${selectionProbability.toFixed(1)}%)`);
            }

        } catch (error) {
            console.error('继续漫游失败:', error);
            new Notice('继续漫游失败');
        }
    }

    private async getSmartRecommendations(): Promise<void> {
        try {
            // Get recommendations with scores
            const recommendations = await this.plugin.recommendationService.getRecommendations();

            if (recommendations.length === 0) {
                new Notice('暂无推荐文档，请添加更多文档到漫游列表');
                return;
            }

            // Get the highest similarity recommendation
            const topRecommendation = recommendations[0];
            const similarity = (topRecommendation.score * 100).toFixed(1);

            // Open the document
            await this.openDocument(topRecommendation.file);

            // Show notification with similarity info
            new Notice(`🧠 智能推荐：${topRecommendation.file.basename} (相似度: ${similarity}%)`);

        } catch (error) {
            console.error('智能推荐失败:', error);
            new Notice('智能推荐失败，请重试');
        }
    }

    private async refreshData(): Promise<void> {
        // 更新状态文本
        this.updateStatusText();

        // 更新所有数据
        this.updateMetricsSection();
        await this.updateRecommendationsSection();
        this.updateRankingSection();
        this.actionBar?.updateButtonStates();
    }

    private updateStatusText(): void {
        if (this.statusText) {
            const docCount = this.getVisitedDocumentCount();
            this.statusText.textContent = `${docCount} 篇漫游文档${docCount === 0 ? ' (无漫游文档)' : ''}`;
        }
    }

    private async randomRoaming(): Promise<void> {
        try {
            // 获取所有已加入漫游的文档
            const roamingFiles = this.plugin.getValidRoamingFiles();

            if (roamingFiles.length === 0) {
                new Notice('暂无漫游文档，请先添加文档到漫游列表');
                return;
            }

            // 从漫游文档中随机选择一个
            const randomIndex = Math.floor(Math.random() * roamingFiles.length);
            const randomFile = roamingFiles[randomIndex];

            await this.openDocument(randomFile);
            new Notice(`🎲 随机漫游：${randomFile.basename}`);

        } catch (error) {
            console.error('随机漫游失败:', error);
            new Notice('随机漫游失败');
        }
    }

    private async addCurrentToRoaming(): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice('没有打开的文档');
            return;
        }

        try {
            if (activeFile.extension !== 'md') {
                new Notice(`只能添加Markdown文档到漫游列表 "${activeFile.basename}"`);
                return;
            }

            if (this.plugin.settings.roamingDocs.includes(activeFile.path)) {
                new Notice(`"${activeFile.basename}" 已在漫游列表中`);
                return;
            }

            this.plugin.settings.roamingDocs.push(activeFile.path);

            const fileService = this.plugin.fileManagementService;
            const defaultMetrics = fileService.createDefaultMetricsForFile(activeFile);
            await this.plugin.updateDocumentMetrics(activeFile, defaultMetrics);

            await this.plugin.saveSettings();
            new Notice(`✅ 已将 "${activeFile.basename}" 加入漫游列表`);

            this.refreshData();

        } catch (error) {
            console.error('加入漫游失败:', error);
            new Notice('加入漫游失败');
        }
    }

    private async openDocument(file: TFile): Promise<void> {
        try {
            await this.app.workspace.getLeaf().openFile(file);
        } catch (error) {
            console.error('打开文档失败:', error);
            new Notice('打开文档失败');
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
                    new Notice(`文档 "${file.basename}" 的得分已更新`);
                    this.refreshData();
                },
                async (realTimeMetrics) => {
                    await this.updateDocumentMetricsRealTime(file, realTimeMetrics);
                }
            );

            modal.open();
        } catch (error) {
            console.error('编辑文档得分失败:', error);
            new Notice('编辑文档得分失败');
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
    }
}