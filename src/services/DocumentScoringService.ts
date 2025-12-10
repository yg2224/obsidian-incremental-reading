import { TFile } from 'obsidian';
import { DocumentMetrics, IncrementalReadingSettings, CustomMetric } from '../models/Settings';
import { SharedUtils } from '../utils/SharedUtils';

/**
 * 文档评分服务 - 处理文档评分、优先级计算等
 */
export class DocumentScoringService {
    private settings: IncrementalReadingSettings;

    constructor(settings: IncrementalReadingSettings) {
        this.settings = settings;
    }

    /**
     * 计算文档的优先级分数
     */
    public calculatePriority(metrics: DocumentMetrics, customMetrics: CustomMetric[]): number {
        let totalScore = 0;
        let totalWeight = 0;

        for (const metric of customMetrics) {
            // 为新增指标设置合理的默认值（5分，中等水平）
            const metricValue = metrics[metric.id] ?? 5; // 默认值为5而不是0
            const metricWeight = this.settings.metricWeights[metric.id] || metric.weight;

            totalScore += metricValue * (metricWeight / 100); // 转换权重百分比为小数
            totalWeight += metricWeight / 100;
        }

        // 返回归一化分数 (0-10)
        return totalWeight > 0 ? (totalScore / totalWeight) * 10 : 0;
    }

    /**
     * 获取文档指标（带默认值）
     */
    public getDocumentMetrics(file: TFile): DocumentMetrics {
        const filePath = file.path;
        const stored = this.settings.documentMetrics[filePath];

        if (stored) {
            return stored;
        }

        // 返回默认指标
        const defaultMetrics: DocumentMetrics = {
            lastVisited: 0,
            visitCount: 0
        };

        // 为每个自定义指标添加默认值
        for (const metric of this.settings.customMetrics) {
            defaultMetrics[metric.id] = 5; // 默认分数为5
        }

        return defaultMetrics;
    }

    /**
     * 更新文档指标
     */
    public updateDocumentMetrics(
        file: TFile,
        metrics: Partial<DocumentMetrics>
    ): DocumentMetrics {
        const filePath = file.path;
        const currentMetrics = this.getDocumentMetrics(file);

        const updatedMetrics: DocumentMetrics = {
            ...currentMetrics,
            ...metrics,
            lastVisited: Date.now()
        };

        // 检查是否有任何指标更新（表示用户交互）
        const hasMetricUpdate = Object.keys(metrics).some(key =>
            key !== 'lastVisited' && key !== 'visitCount' && metrics[key] !== undefined
        );

        if (hasMetricUpdate) {
            updatedMetrics.visitCount = currentMetrics.visitCount + 1;
        }

        return updatedMetrics;
    }

    /**
     * 验证指标值是否在有效范围内
     */
    public validateMetrics(metrics: Partial<DocumentMetrics>): Partial<DocumentMetrics> {
        const validated: Partial<DocumentMetrics> = {};

        // 验证自定义指标值
        for (const metric of this.settings.customMetrics) {
            if (metrics[metric.id] !== undefined) {
                validated[metric.id] = Math.max(0, Math.min(10, Number(metrics[metric.id])));
            }
        }

        if (metrics.lastVisited !== undefined) {
            validated.lastVisited = Math.max(0, Number(metrics.lastVisited));
        }

        if (metrics.visitCount !== undefined) {
            validated.visitCount = Math.max(0, Math.floor(Number(metrics.visitCount)));
        }

        return validated;
    }

    /**
     * 获取优先级颜色
     */
    public getPriorityColor(priority: number): string {
        if (priority >= 8) return '#dc3545'; // red
        if (priority >= 6) return '#fd7e14'; // orange
        if (priority >= 4) return '#ffc107'; // yellow
        if (priority >= 2) return '#28a745'; // green
        return '#6c757d'; // gray
    }

    /**
     * 获取文档的详细权重分析
     */
    public getWeightBreakdown(metrics: DocumentMetrics): Array<{
        name: string;
        value: number;
        weight: number;
        score: number;
    }> {
        const breakdown = [];

        for (const metric of this.settings.customMetrics) {
            const metricValue = metrics[metric.id] || 5.0;
            const metricWeight = this.settings.metricWeights[metric.id] || metric.weight;
            const normalizedWeight = metricWeight / 100;
            const score = metricValue * normalizedWeight;

            breakdown.push({
                name: metric.name,
                value: metricValue,
                weight: metricWeight,
                score: score
            });
        }

        return breakdown;
    }

    /**
     * 比较两个文档的优先级
     */
    public compareDocumentPriority(file1: TFile, file2: TFile): number {
        const metrics1 = this.getDocumentMetrics(file1);
        const metrics2 = this.getDocumentMetrics(file2);

        const priority1 = this.calculatePriority(metrics1, this.settings.customMetrics);
        const priority2 = this.calculatePriority(metrics2, this.settings.customMetrics);

        return priority2 - priority1; // 降序排列
    }

    /**
     * 获取推荐文档（按优先级排序）
     */
    public getRecommendedDocuments(files: TFile[], limit: number = 10): TFile[] {
        // 计算每个文档的优先级
        const documentsWithPriority = files.map(file => {
            const metrics = this.getDocumentMetrics(file);
            const priority = this.calculatePriority(metrics, this.settings.customMetrics);
            return { file, priority };
        });

        // 按优先级降序排序
        documentsWithPriority.sort((a, b) => b.priority - a.priority);

        // 返回前N个文档
        return documentsWithPriority
            .slice(0, limit)
            .map(item => item.file);
    }
}