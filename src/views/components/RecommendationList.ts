import { TFile, Notice } from 'obsidian';
import IncrementalReadingPlugin from '../../main';
import { SharedUtils } from '../../utils/SharedUtils';
import { DocumentMetricsModal } from '../../components/Modal';
import { i18n } from '../../i18n';

/**
 * 智能推荐列表组件
 */
interface RecommendationItem {
    file: TFile;
    score: number;
}

export class RecommendationList {
    private container: HTMLElement;
    private plugin: IncrementalReadingPlugin;
    private onOpenDocument: (file: TFile) => void;
    private onEditMetrics: (file: TFile, metrics: any) => void;
    private cachedRecommendations: RecommendationItem[] = [];

    constructor(
        container: HTMLElement,
        plugin: IncrementalReadingPlugin,
        callbacks: {
            onOpenDocument: (file: TFile) => void;
            onEditMetrics: (file: TFile, metrics: any) => void;
        }
    ) {
        this.container = container;
        this.plugin = plugin;
        this.onOpenDocument = callbacks.onOpenDocument;
        this.onEditMetrics = callbacks.onEditMetrics;
    }

    public render(recommendations: TFile[]): void {
        this.container.empty();

        const recommendationsSection = this.container.createEl('div', { cls: 'recommendations-section' });
        recommendationsSection.createEl('h3', { text: i18n.t('recommendations.title') });

        if (recommendations.length === 0) {
            recommendationsSection.createEl('p', {
                text: i18n.t('recommendations.emptyMessage'),
                cls: 'empty-message'
            });
            return;
        }

        const recommendationsList = recommendationsSection.createEl('div', { cls: 'recommendations-list' });

        recommendations.forEach((file, index) => {
            const recItem = this.createRecommendationItem(file, index);
            recommendationsList.appendChild(recItem);
        });

        // Add action buttons
        const buttonContainer = recommendationsSection.createEl('div', { cls: 'recommendation-buttons' });

        const refreshBtn = buttonContainer.createEl('button', {
            cls: 'refresh-recommendations-btn',
            text: i18n.t('recommendations.refreshButton')
        });
        refreshBtn.onclick = () => this.refresh();

        const smartJumpBtn = buttonContainer.createEl('button', {
            cls: 'smart-jump-btn',
            text: i18n.t('recommendations.smartJumpButton')
        });
        smartJumpBtn.onclick = async () => {
            try {
                const recommendations = await this.plugin.recommendationService.getRecommendations();
                if (recommendations.length === 0) {
                    new Notice(i18n.t('recommendations.emptyMessage'));
                    return;
                }
                const topRecommendation = recommendations[0];
                const similarity = (topRecommendation.score * 100).toFixed(1);
                await this.onOpenDocument(topRecommendation.file);
                new Notice(i18n.t('recommendations.smartJumpNotice', {
                    filename: topRecommendation.file.basename,
                    similarity: similarity
                }));
            } catch (error) {
                console.error('智能跳转失败:', error);
                new Notice(i18n.t('recommendations.smartJumpFailed'));
            }
        };
    }

    public renderWithScores(recommendations: RecommendationItem[]): void {
        this.container.empty();
        this.cachedRecommendations = recommendations;

        const recommendationsSection = this.container.createEl('div', { cls: 'recommendations-section' });
        recommendationsSection.createEl('h3', { text: i18n.t('recommendations.title') });

        if (recommendations.length === 0) {
            recommendationsSection.createEl('p', {
                text: i18n.t('recommendations.emptyMessage'),
                cls: 'empty-message'
            });
            return;
        }

        const recommendationsList = recommendationsSection.createEl('div', { cls: 'recommendations-list' });

        recommendations.forEach((rec, index) => {
            const recItem = this.createRecommendationItemWithScore(rec, index);
            recommendationsList.appendChild(recItem);
        });

        // Add action buttons
        const buttonContainer = recommendationsSection.createEl('div', { cls: 'recommendation-buttons' });

        const refreshBtn = buttonContainer.createEl('button', {
            cls: 'refresh-recommendations-btn',
            text: i18n.t('recommendations.refreshButton')
        });
        refreshBtn.onclick = () => this.refresh();

        const smartJumpBtn = buttonContainer.createEl('button', {
            cls: 'smart-jump-btn',
            text: i18n.t('recommendations.smartJumpButton')
        });
        smartJumpBtn.onclick = async () => {
            try {
                const recommendations = await this.plugin.recommendationService.getRecommendations();
                if (recommendations.length === 0) {
                    new Notice(i18n.t('recommendations.emptyMessage'));
                    return;
                }
                const topRecommendation = recommendations[0];
                const similarity = (topRecommendation.score * 100).toFixed(1);
                await this.onOpenDocument(topRecommendation.file);
                new Notice(i18n.t('recommendations.smartJumpNotice', {
                    filename: topRecommendation.file.basename,
                    similarity: similarity
                }));
            } catch (error) {
                console.error('智能跳转失败:', error);
                new Notice(i18n.t('recommendations.smartJumpFailed'));
            }
        };
    }

    private createRecommendationItem(file: TFile, index: number): HTMLElement {
        const recItem = document.createElement('div');
        recItem.className = 'recommendation-item';
        recItem.setAttribute('data-file-path', file.path);

        // Recommendation number
        const recNumber = recItem.createEl('span', { cls: 'rec-number' });
        recNumber.textContent = (index + 1).toString();

        // File info
        const fileInfo = recItem.createEl('div', { cls: 'file-info' });

        const fileName = fileInfo.createEl('div', { cls: 'file-name' });
        fileName.textContent = file.basename;
        fileName.title = file.path;

        // Metrics display
        const metricsInfo = recItem.createEl('div', { cls: 'metrics-info' });

        const metrics = this.plugin.getDocumentMetrics(file);
        const calculatedPriority = SharedUtils.calculatePriority(metrics, this.plugin.settings.metricWeights, this.plugin.settings.customMetrics);

        // Priority
        const priorityEl = metricsInfo.createEl('span', { cls: 'priority' });
        priorityEl.textContent = `${i18n.t('recommendations.priorityLabel')}: ${calculatedPriority.toFixed(1)}`;
        priorityEl.style.color = SharedUtils.getPriorityColor(calculatedPriority);

        // Custom metrics
        for (const metric of this.plugin.settings.customMetrics.slice(0, 2)) { // Show first 2 metrics
            const metricEl = metricsInfo.createEl('span', { cls: 'metric' });
            const metricValue = metrics[metric.id] || 0;
            metricEl.textContent = `${metric.name}: ${metricValue.toFixed(1)}`;
        }

        // Visit count
        const visitEl = metricsInfo.createEl('span', { cls: 'visit-count' });
        visitEl.textContent = `${i18n.t('recommendations.visitCountLabel')}: ${metrics.visitCount || 0}`;

        // Quick actions
        const actions = recItem.createEl('div', { cls: 'quick-actions' });

        // Open button
        const openBtn = actions.createEl('button', { text: i18n.t('recommendations.openButton') });
        openBtn.onclick = () => this.onOpenDocument(file);

        return recItem;
    }

    private createRecommendationItemWithScore(rec: RecommendationItem, index: number): HTMLElement {
        const recItem = document.createElement('div');
        recItem.className = 'recommendation-item';
        recItem.setAttribute('data-file-path', rec.file.path);

        // Recommendation number
        const recNumber = recItem.createEl('span', { cls: 'rec-number' });
        recNumber.textContent = (index + 1).toString();

        // File info
        const fileInfo = recItem.createEl('div', { cls: 'file-info' });

        const fileName = fileInfo.createEl('div', { cls: 'file-name' });
        fileName.textContent = rec.file.basename;
        fileName.title = rec.file.path;

        // Only show similarity score for recommendations
        const similarityInfo = recItem.createEl('div', { cls: 'similarity-info' });

        const similarityEl = similarityInfo.createEl('span', { cls: 'similarity-score-large' });
        similarityEl.textContent = `${i18n.t('recommendations.similarity')}: ${(rec.score * 100).toFixed(1)}%`;
        similarityEl.style.color = this.getSimilarityColor(rec.score);

        // Quick actions
        const actions = recItem.createEl('div', { cls: 'quick-actions' });

        // Open button
        const openBtn = actions.createEl('button', { text: i18n.t('recommendations.openButton') });
        openBtn.onclick = () => this.onOpenDocument(rec.file);

        return recItem;
    }

    private getSimilarityColor(score: number): string {
        // Score is between 0 and 1, higher is more similar
        if (score >= 0.8) {
            return '#dc3545'; // red - very similar
        } else if (score >= 0.6) {
            return '#fd7e14'; // orange - similar
        } else if (score >= 0.4) {
            return '#ffc107'; // yellow - moderately similar
        } else {
            return '#28a745'; // green - low similarity
        }
    }

    /**
     * 刷新推荐列表
     */
    public async refresh(): Promise<void> {
        try {
            // Get new recommendations with scores
            const recommendations = await this.plugin.recommendationService.getRecommendations();
            this.renderWithScores(recommendations);
        } catch (error) {
            console.error('刷新推荐失败:', error);
        }
    }

    /**
     * 更新特定文件项的显示
     */
    public updateFileItem(filePath: string): void {
        const fileItem = this.container.querySelector(`[data-file-path="${filePath}"]`);
        if (fileItem) {
            const file = this.plugin.app.vault.getAbstractFileByPath(filePath) as TFile;
            if (file) {
                const metrics = this.plugin.getDocumentMetrics(file);
                // Update priority and metrics display
                const priorityEl = fileItem.querySelector('.priority');
                if (priorityEl) {
                    const calculatedPriority = SharedUtils.calculatePriority(metrics, this.plugin.settings.metricWeights, this.plugin.settings.customMetrics);
                    priorityEl.textContent = `${i18n.t('recommendations.priorityLabel')}: ${calculatedPriority.toFixed(1)}`;
                    priorityEl.setAttribute('style', `color: ${SharedUtils.getPriorityColor(calculatedPriority)}`);
                }
            }
        }
    }
}
