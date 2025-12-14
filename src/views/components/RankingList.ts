import { TFile } from 'obsidian';
import IncrementalReadingPlugin from '../../main';
import { SharedUtils } from '../../utils/SharedUtils';
import { DocumentMetricsModal } from '../../components/Modal';
import { i18n } from '../../i18n';

/**
 * 排行榜组件 - 显示Top 10优先级文档
 */
export class RankingList {
    private container: HTMLElement;
    private plugin: IncrementalReadingPlugin;
    private onOpenDocument: (file: TFile) => void;
    private onEditMetrics: (file: TFile, metrics: any) => void;
    private currentRankingType: 'priority' | 'visits' = 'priority';

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

    public render(): void {
        this.container.empty();

        const rankingSection = this.container.createEl('div', { cls: 'ranking-section' });

        // Create header with toggle buttons
        const headerContainer = rankingSection.createEl('div', { cls: 'ranking-header' });

        const title = headerContainer.createEl('h3', { text: '🏆 ' + i18n.t('ranking.title') });

        // Toggle buttons for ranking type
        const toggleContainer = headerContainer.createEl('div', { cls: 'ranking-toggle' });

        const priorityBtn = toggleContainer.createEl('button', {
            cls: `toggle-btn ${this.currentRankingType === 'priority' ? 'active' : ''}`,
            text: i18n.t('ranking.priorityToggle')
        });
        priorityBtn.onclick = () => this.switchRankingType('priority');

        const visitsBtn = toggleContainer.createEl('button', {
            cls: `toggle-btn ${this.currentRankingType === 'visits' ? 'active' : ''}`,
            text: i18n.t('ranking.visitsToggle')
        });
        visitsBtn.onclick = () => this.switchRankingType('visits');

        const rankingList = rankingSection.createEl('div', { cls: 'ranking-list' });

        // Get documents based on current ranking type
        const rankedDocuments = this.currentRankingType === 'priority'
            ? this.getDocumentsByPriority()
            : this.getDocumentsByVisits();

        if (rankedDocuments.length === 0) {
            rankingList.createEl('p', {
                text: i18n.t('ranking.emptyMessage'),
                cls: 'empty-message'
            });
            return;
        }

        // Display top 10 or all if less than 10
        const topDocuments = rankedDocuments.slice(0, 10);

        topDocuments.forEach(({ file, score, metrics }, index) => {
            const rankingItem = this.createRankingItem(file, score, metrics, index + 1);
            rankingList.appendChild(rankingItem);
        });

        // Add refresh button
        const refreshBtn = rankingSection.createEl('button', {
            cls: 'refresh-ranking-btn',
            text: '🔄 ' + i18n.t('ranking.refreshButton')
        });
        refreshBtn.onclick = () => this.render();
    }

    private getDocumentsByPriority() {
        const files = this.plugin.getValidRoamingFiles();
        const documentsWithPriority = files.map(file => {
            const metrics = this.plugin.getDocumentMetrics(file);
            const priority = SharedUtils.calculatePriority(metrics, this.plugin.settings.metricWeights, this.plugin.settings.customMetrics);
            return { file, score: priority, metrics };
        });

        // Sort by priority (descending)
        return documentsWithPriority.sort((a, b) => b.score - a.score);
    }

    private getDocumentsByVisits() {
        const files = this.plugin.getValidRoamingFiles();
        const documentsWithVisits = files.map(file => {
            const metrics = this.plugin.getDocumentMetrics(file);
            const visitCount = metrics.visitCount || 0;
            return { file, score: visitCount, metrics };
        });

        // Sort by visit count (descending)
        return documentsWithVisits.sort((a, b) => b.score - a.score);
    }

    private switchRankingType(type: 'priority' | 'visits'): void {
        this.currentRankingType = type;
        this.render();
    }

    private createRankingItem(file: TFile, score: number, metrics: any, rank: number): HTMLElement {
        const item = document.createElement('div');
        item.className = 'ranking-item';

        // Rank badge
        const rankBadge = item.createEl('span', { cls: 'rank-badge' });
        rankBadge.textContent = rank.toString();

        // Apply special styling for top 3
        if (rank === 1) {
            rankBadge.addClass('gold');
        } else if (rank === 2) {
            rankBadge.addClass('silver');
        } else if (rank === 3) {
            rankBadge.addClass('bronze');
        }

        // File info
        const fileInfo = item.createEl('div', { cls: 'file-info' });

        const fileName = fileInfo.createEl('div', { cls: 'file-name' });
        fileName.textContent = file.basename;
        fileName.title = file.path; // Show full path on hover

        const filePath = fileInfo.createEl('div', { cls: 'file-path' });
        filePath.textContent = file.path;

        // Score display
        const scoreInfo = item.createEl('div', { cls: 'score-info' });

        const mainScoreEl = scoreInfo.createEl('span', { cls: 'main-score' });
        if (this.currentRankingType === 'priority') {
            mainScoreEl.textContent = `${i18n.t('metrics.priorityLabel')}: ${score.toFixed(1)}`;
            mainScoreEl.style.color = SharedUtils.getPriorityColor(score);
        } else {
            mainScoreEl.textContent = `${i18n.t('ranking.visits')}: ${score}`;
            mainScoreEl.style.color = this.getVisitCountColor(score);
        }

        // Actions
        const actions = item.createEl('div', { cls: 'actions' });

        // Open button
        const openBtn = actions.createEl('button', {
            cls: 'open-btn',
            text: '📖 ' + i18n.t('ranking.openButton')
        });
        openBtn.title = i18n.t('view.openDocument');
        openBtn.onclick = () => this.onOpenDocument(file);

        return item;
    }

    private getVisitCountColor(visits: number): string {
        if (visits >= 10) {
            return '#dc3545'; // red - very active
        } else if (visits >= 5) {
            return '#fd7e14'; // orange - active
        } else if (visits >= 2) {
            return '#ffc107'; // yellow - moderate
        } else {
            return '#28a745'; // green - low activity
        }
    }

    /**
     * 刷新排行榜数据
     */
    public refresh(): void {
        this.render();
    }
}
