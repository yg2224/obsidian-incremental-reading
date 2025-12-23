import { TFile, Notice } from 'obsidian';
import IncrementalReadingPlugin from '../../main';
import { DocumentMetrics, CustomMetric } from '../../models/Settings';
import { SharedUtils } from '../../utils/SharedUtils';
import { i18n } from '../../i18n';

/**
 * 文档指标显示组件
 */
export class DocumentMetricsDisplay {
    private container: HTMLElement;
    private plugin: IncrementalReadingPlugin;
    private file: TFile;
    private metrics: DocumentMetrics;
    private onMetricsUpdated: () => void;

    constructor(
        container: HTMLElement,
        plugin: IncrementalReadingPlugin,
        file: TFile,
        metrics: DocumentMetrics,
        onMetricsUpdated?: () => void
    ) {
        this.container = container;
        this.plugin = plugin;
        this.file = file;
        this.metrics = metrics;
        this.onMetricsUpdated = onMetricsUpdated || (() => {});

        console.log(`DocumentMetricsDisplay 初始化: ${file.basename}`);
    }

    public render(): HTMLElement {
        const metricsContent = this.container.createEl('div', { cls: 'metrics-content' });

        const isRoamingDoc = this.plugin.settings.roamingDocs.includes(this.file.path);
        console.log(`渲染文档指标: ${this.file.basename}, 是否漫游: ${isRoamingDoc}`);

        if (isRoamingDoc) {
            // For roaming documents: show full metrics with inline sliders
            this.createCustomMetricsSection(metricsContent);
            this.createPrioritySection(metricsContent);
            this.createVisitStatsSection(metricsContent);
        } else {
            // For non-roaming documents: show prompt to join roaming
            this.createNonRoamingPrompt(metricsContent);
        }

        return metricsContent;
    }

    private createNonRoamingPrompt(metricsContent: HTMLElement): void {
        const promptSection = metricsContent.createEl('div', { cls: 'non-roaming-prompt' });

        // Title - 使用 p 标签和 description 一样的样式
        const title = promptSection.createEl('p', { cls: 'prompt-description' });
        title.textContent = i18n.t('view.nonRoaming.title');

        // Description
        const description = promptSection.createEl('p', { cls: 'prompt-description' });
        description.textContent = i18n.t('view.nonRoaming.description');

        // Benefits list
        const benefitsList = promptSection.createEl('ul', { cls: 'benefits-list' });
        const benefits = i18n.t('view.nonRoaming.benefits') as unknown as string[];

        benefits.forEach(benefit => {
            const li = benefitsList.createEl('li');
            li.textContent = benefit;
        });

        // Action button
        const actionSection = promptSection.createEl('div', { cls: 'prompt-action' });
        const addButton = actionSection.createEl('button', {
            cls: 'add-to-roaming-btn',
            text: '+ ' + i18n.t('view.nonRoaming.action')
        });

        addButton.onclick = async () => {
            try {
                // Check if file is markdown
                if (this.file.extension !== 'md') {
                    new Notice(i18n.t('notices.onlyMarkdownFiles'));
                    return;
                }

                // Add to roaming docs
                if (!this.plugin.settings.roamingDocs.includes(this.file.path)) {
                    this.plugin.settings.roamingDocs.push(this.file.path);

                    const fileService = this.plugin.fileManagementService;
                    const defaultMetrics = fileService.createDefaultMetricsForFile(this.file);
                    await this.plugin.updateDocumentMetrics(this.file, defaultMetrics);

                    await this.plugin.saveSettings();
                    new Notice(i18n.t('notices.addedToRoaming', { filename: this.file.basename }));

                    // Re-render to show the metrics interface
                    this.container.empty();
                    this.render();

                    // Trigger callback to update parent
                    this.onMetricsUpdated();
                }
            } catch (error) {
                console.error('加入漫游失败:', error);
                new Notice(i18n.t('notices.errorSavingSettings'));
            }
        };
    }

    private async updateDocumentMetricsRealTime(file: TFile, realTimeMetrics: DocumentMetrics): Promise<void> {
        try {
            this.plugin.settings.documentMetrics[file.path] = {
                ...realTimeMetrics,
                lastVisited: Date.now()
            };
        } catch (error) {
            console.warn('实时指标更新失败:', error);
        }
    }

    private updateMetricValueColor(valueElement: HTMLElement, value: number): void {
        if (value >= 8) {
            valueElement.style.color = '#dc3545'; // red
        } else if (value >= 6) {
            valueElement.style.color = '#fd7e14'; // orange
        } else if (value >= 4) {
            valueElement.style.color = '#ffc107'; // yellow
        } else {
            valueElement.style.color = '#28a745'; // green
        }
    }

    private updatePriorityDisplay(metricsContent: HTMLElement): void {
        // Find and update the priority value
        const priorityValue = metricsContent.querySelector('.priority-value') as HTMLElement;
        if (priorityValue) {
            const calculatedPriority = this.calculatePriority(this.metrics);
            priorityValue.textContent = calculatedPriority.toFixed(2);
            priorityValue.style.color = SharedUtils.getPriorityColor(calculatedPriority);
        }

        // Find and update the weight breakdown
        const breakdown = metricsContent.querySelector('.breakdown-list');
        if (breakdown) {
            breakdown.empty();
            this.createWeightBreakdownContent(breakdown as HTMLElement);
        }
    }

    private createWeightBreakdownContent(breakdown: HTMLElement): void {
        const customMetrics = this.plugin.settings.customMetrics;
        const weights = this.plugin.settings.metricWeights;

        for (const metric of customMetrics) {
            const metricValue = this.metrics[metric.id] || 0;
            const metricWeight = weights[metric.id] || metric.weight;
            const normalizedWeight = metricWeight / 100;
            const score = metricValue * normalizedWeight;

            const breakdownItem = breakdown.createEl('div', { cls: 'breakdown-item' });
            breakdownItem.createEl('span', {
                cls: 'breakdown-label',
                text: `${i18n.getMetricName(metric)} (${metricWeight}%):`
            });
            breakdownItem.createEl('span', {
                cls: 'breakdown-score',
                text: `${metricValue} × ${normalizedWeight.toFixed(2)} = ${score.toFixed(2)}`
            });
        }

        // Total score
        const totalScore = this.calculatePriority(this.metrics);
        const totalItem = breakdown.createEl('div', { cls: 'breakdown-item total' });
        totalItem.createEl('span', { cls: 'breakdown-label', text: i18n.t('metrics.totalLabel') + ':' });
        totalItem.createEl('span', { cls: 'breakdown-score total-score', text: totalScore.toFixed(2) });
    }

    private createPrioritySection(metricsContent: HTMLElement) {
        const prioritySection = metricsContent.createEl('div', { cls: 'priority-section' });
        prioritySection.createEl('div', { cls: 'priority-label', text: i18n.t('metrics.priorityLabel') });

        const calculatedPriority = this.calculatePriority(this.metrics);
        const priorityValue = prioritySection.createEl('div', {
            cls: 'priority-value',
            text: calculatedPriority.toFixed(2)
        });

        // Weight breakdown
        const breakdown = metricsContent.createEl('div', { cls: 'weight-breakdown' });
        this.createWeightBreakdownContent(breakdown);
    }

    private createCustomMetricsSection(metricsContent: HTMLElement) {
        const customMetricsSection = metricsContent.createEl('div', { cls: 'custom-metrics-section' });
        customMetricsSection.createEl('h4', { text: i18n.t('metrics.customMetricsTitle') });

        const metricsList = customMetricsSection.createEl('div', { cls: 'metrics-list' });

        for (const metric of this.plugin.settings.customMetrics) {
            const metricItem = metricsList.createEl('div', { cls: 'metric-item' });

            // Create label row
            const labelRow = metricItem.createEl('div', { cls: 'metric-label-row' });

            const label = labelRow.createEl('span', { cls: 'metric-label', text: `${i18n.getMetricName(metric)} (${metric.weight}%):` });

            const valueDisplay = labelRow.createEl('span', {
                cls: 'metric-value',
                text: (this.metrics[metric.id] || 5).toFixed(1)
            });

            // Color code based on value
            const metricValue = this.metrics[metric.id] || 5;
            this.updateMetricValueColor(valueDisplay, metricValue);

            // Create slider (this method is only called for roaming documents)
            const slider = metricItem.createEl('input', {
                type: 'range',
                cls: 'metric-slider',
                attr: {
                    min: '0',
                    max: '10',
                    step: '0.5',
                    'data-metric-id': metric.id
                }
            });
            slider.value = metricValue.toString();

            // Debounced update function
            let updateTimeout: NodeJS.Timeout | null = null;
            const debouncedUpdate = async (newValue: number) => {
                if (updateTimeout) {
                    clearTimeout(updateTimeout);
                }

                updateTimeout = setTimeout(async () => {
                    try {
                        // Update metrics in real-time
                        this.metrics[metric.id] = newValue;
                        await this.updateDocumentMetricsRealTime(this.file, this.metrics);

                        // Refresh priority display
                        this.updatePriorityDisplay(metricsContent);

                        // Trigger callback
                        this.onMetricsUpdated();
                    } catch (error) {
                        console.warn('Failed to update metric:', error);
                    }
                }, 300); // 300ms debounce
            };

            // Add event listeners
            slider.addEventListener('input', () => {
                const newValue = parseFloat(slider.value);
                valueDisplay.textContent = newValue.toFixed(1);
                this.updateMetricValueColor(valueDisplay, newValue);

                // Trigger debounced update
                debouncedUpdate(newValue);
            });

            // Immediate update when user finishes dragging
            slider.addEventListener('change', async () => {
                const newValue = parseFloat(slider.value);
                valueDisplay.textContent = newValue.toFixed(1);
                this.updateMetricValueColor(valueDisplay, newValue);

                // Update immediately on change
                this.metrics[metric.id] = newValue;
                await this.updateDocumentMetricsRealTime(this.file, this.metrics);
                this.updatePriorityDisplay(metricsContent);
                this.onMetricsUpdated();
            });

            // Keyboard support for better accessibility
            slider.addEventListener('keydown', (e) => {
                const currentValue = parseFloat(slider.value);
                let newValue = currentValue;

                switch (e.key) {
                    case 'ArrowLeft':
                    case 'ArrowDown':
                        newValue = Math.max(0, currentValue - 0.5);
                        break;
                    case 'ArrowRight':
                    case 'ArrowUp':
                        newValue = Math.min(10, currentValue + 0.5);
                        break;
                    case 'Home':
                        newValue = 0;
                        break;
                    case 'End':
                        newValue = 10;
                        break;
                    default:
                        return;
                }

                e.preventDefault();
                slider.value = newValue.toString();
                valueDisplay.textContent = newValue.toFixed(1);
                this.updateMetricValueColor(valueDisplay, newValue);
                debouncedUpdate(newValue);
            });

            // Add visual feedback for value ranges
            const updateSliderBackground = () => {
                const value = parseFloat(slider.value);
                const percentage = (value / 10) * 100;
                // Use our theme color instead of Obsidian's interactive-accent
                slider.style.background = `linear-gradient(to right, var(--accent-color) 0%, var(--accent-color) ${percentage}%, rgba(0,0,0,0.1) ${percentage}%, rgba(0,0,0,0.1) 100%)`;
            };

            slider.addEventListener('input', updateSliderBackground);
            updateSliderBackground(); // Set initial background
        }
    }

    private createVisitStatsSection(metricsContent: HTMLElement) {
        const visitSection = metricsContent.createEl('div', { cls: 'visit-section' });
        visitSection.createEl('h4', { text: i18n.t('metrics.visitStatsTitle') });

        const visitStats = visitSection.createEl('div', { cls: 'visit-stats' });

        // Visit count
        const visitCount = visitStats.createEl('div', { cls: 'visit-stat' });
        visitCount.createEl('span', { cls: 'stat-label', text: i18n.t('metrics.visitCountLabel') + ': ' });
        visitCount.createEl('span', { cls: 'stat-value', text: this.metrics.visitCount.toString() });

        // Last visited
        const lastVisited = visitStats.createEl('div', { cls: 'visit-stat' });
        lastVisited.createEl('span', { cls: 'stat-label', text: i18n.t('metrics.lastVisitedLabel') + ': ' });

        if (this.metrics.lastVisited) {
            const lastVisitedDate = new Date(this.metrics.lastVisited);
            lastVisited.createEl('span', {
                cls: 'stat-value',
                text: lastVisitedDate.toLocaleString()
            });
        } else {
            lastVisited.createEl('span', { cls: 'stat-value', text: i18n.t('metrics.neverVisited') });
        }
    }

    private createWeightBreakdown(breakdown: HTMLElement) {
        breakdown.createEl('h5', { text: i18n.t('metrics.weightBreakdown') });
        const breakdownList = breakdown.createEl('div', { cls: 'breakdown-list' });
        this.createWeightBreakdownContent(breakdownList);
    }

    private calculatePriority(metrics: DocumentMetrics): number {
        const customMetrics = this.plugin.settings.customMetrics;
        const weights = this.plugin.settings.metricWeights;

        let totalScore = 0;
        let totalWeight = 0;

        for (const metric of customMetrics) {
            const metricValue = metrics[metric.id] || 5.0;
            const metricWeight = weights[metric.id] || metric.weight;
            const normalizedWeight = metricWeight / 100;

            const score = metricValue * normalizedWeight;
            totalScore += score;
            totalWeight += normalizedWeight;
        }

        return totalWeight > 0 ? (totalScore / totalWeight) * 10 : 0;
    }

    /**
     * 更新指标数据和文件
     */
    public updateMetrics(fileOrMetrics: TFile | DocumentMetrics, metrics?: DocumentMetrics): void {
        if (fileOrMetrics instanceof TFile && metrics) {
            // 新的重载：updateMetrics(file, metrics)
            console.log(`DocumentMetricsDisplay 更新: ${this.file.basename} -> ${fileOrMetrics.basename}`);
            this.file = fileOrMetrics;
            this.metrics = metrics;
        } else if (fileOrMetrics && !metrics) {
            // 旧的重载：updateMetrics(metrics)
            console.log(`DocumentMetricsDisplay 更新指标: ${this.file.basename}`);
            this.metrics = fileOrMetrics as DocumentMetrics;
        }

        // 强制重新渲染以确保状态正确更新
        this.container.empty();
        this.render();
    }
}