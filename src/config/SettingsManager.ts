import { IncrementalReadingSettings, CustomMetric, DocumentMetrics } from '../models/Settings';
import { DEFAULT_SETTINGS } from './DefaultSettings';
import { SharedUtils } from '../utils/SharedUtils';

/**
 * 设置管理器 - 统一处理设置相关操作
 */
export class SettingsManager {
    private settings: IncrementalReadingSettings;

    constructor(initialSettings?: Partial<IncrementalReadingSettings>) {
        this.settings = this.validateAndMergeSettings(initialSettings);
    }

    /**
     * 获取完整设置
     */
    public getSettings(): IncrementalReadingSettings {
        return { ...this.settings };
    }

    /**
     * 更新设置
     */
    public updateSettings(updates: Partial<IncrementalReadingSettings>): void {
        this.settings = this.validateAndMergeSettings({ ...this.settings, ...updates });
    }

    /**
     * 添加自定义指标
     */
    public addCustomMetric(metric: CustomMetric): void {
        this.settings.customMetrics.push(metric);
        this.normalizeMetricWeights();
    }

    /**
     * 移除自定义指标
     */
    public removeCustomMetric(metricId: string): void {
        this.settings.customMetrics = this.settings.customMetrics.filter(m => m.id !== metricId);
        this.normalizeMetricWeights();
    }

    /**
     * 更新自定义指标
     */
    public updateCustomMetric(metricId: string, updates: Partial<CustomMetric>): void {
        const metric = this.settings.customMetrics.find(m => m.id === metricId);
        if (metric) {
            Object.assign(metric, updates);
            this.normalizeMetricWeights();
        }
    }

    /**
     * 设置指标数量
     */
    public setMetricsCount(count: number): void {
        const currentCount = this.settings.customMetrics.length;

        if (count > currentCount) {
            // 添加新指标
            for (let i = currentCount; i < count; i++) {
                this.settings.customMetrics.push({
                    id: this.generateMetricId(`指标${i + 1}`),
                    name: { en: `Metric ${i + 1}`, zh: `指标${i + 1}` },
                    weight: Math.floor(100 / count)
                });
            }
        } else if (count < currentCount) {
            // 删除多余指标
            this.settings.customMetrics = this.settings.customMetrics.slice(0, count);
        }

        this.normalizeMetricWeights();
    }

    /**
     * 归一化指标权重
     */
    private normalizeMetricWeights(): void {
        const metrics = this.settings.customMetrics;
        const totalWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0);

        if (totalWeight > 0) {
            metrics.forEach(metric => {
                metric.weight = Math.round((metric.weight / totalWeight) * 100);
            });
        }

        // 更新权重映射
        this.settings.metricWeights = {};
        for (const metric of metrics) {
            this.settings.metricWeights[metric.id] = metric.weight;
        }
    }

    /**
     * 生成指标ID
     */
    private generateMetricId(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^\w\u4e00-\u9fff]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '') || 'metric';
    }

    /**
     * 验证并合并设置
     */
    private validateAndMergeSettings(settings?: Partial<IncrementalReadingSettings>): IncrementalReadingSettings {
        const validated = SharedUtils.validateSettings(settings);
        return Object.assign({}, DEFAULT_SETTINGS, validated);
    }

    /**
     * 添加文档到漫游列表
     */
    public addToRoamingDocs(filePath: string): boolean {
        if (!this.settings.roamingDocs.includes(filePath)) {
            this.settings.roamingDocs.push(filePath);
            return true;
        }
        return false;
    }

    /**
     * 从漫游列表移除文档
     */
    public removeFromRoamingDocs(filePath: string): boolean {
        const index = this.settings.roamingDocs.indexOf(filePath);
        if (index > -1) {
            this.settings.roamingDocs.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * 更新文档指标
     */
    public updateDocumentMetrics(filePath: string, metrics: Partial<DocumentMetrics>): void {
        const currentMetrics = this.settings.documentMetrics[filePath] || {
            lastVisited: 0,
            visitCount: 0
        };

        this.settings.documentMetrics[filePath] = {
            ...currentMetrics,
            ...metrics,
            lastVisited: Date.now()
        };
    }

    /**
     * 获取文档指标
     */
    public getDocumentMetrics(filePath: string): DocumentMetrics {
        return this.settings.documentMetrics[filePath] || {
            lastVisited: 0,
            visitCount: 0
        };
    }

    /**
     * 清空漫游历史
     */
    public clearRoamingHistory(): void {
        this.settings.roamingDocs = [];
        for (const [path] of Object.entries(this.settings.documentMetrics)) {
            this.settings.documentMetrics[path].visitCount = 0;
            this.settings.documentMetrics[path].lastVisited = 0;
        }
    }

    /**
     * 导出设置
     */
    public exportSettings(): string {
        return SharedUtils.safeStringify(this.settings);
    }

    /**
     * 导入设置
     */
    public importSettings(settingsJson: string): boolean {
        try {
            const importedSettings = JSON.parse(settingsJson);
            this.settings = this.validateAndMergeSettings(importedSettings);
            return true;
        } catch (error) {
            console.error('Failed to import settings:', error);
            return false;
        }
    }

    /**
     * 重置为默认设置
     */
    public resetToDefaults(): void {
        this.settings = { ...DEFAULT_SETTINGS };
    }

    /**
     * 获取设置统计信息
     */
    public getSettingsStats(): {
        roamingDocsCount: number;
        totalDocumentsWithMetrics: number;
        customMetricsCount: number;
        lastUpdated: number;
    } {
        return {
            roamingDocsCount: this.settings.roamingDocs.length,
            totalDocumentsWithMetrics: Object.keys(this.settings.documentMetrics).length,
            customMetricsCount: this.settings.customMetrics.length,
            lastUpdated: Date.now()
        };
    }
}