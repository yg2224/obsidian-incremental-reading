import { TFile } from 'obsidian';
import { CustomMetric, DocumentMetrics, MetricWeights } from '../types/metrics';

/**
 * 指标计算引擎 - 统一处理所有指标相关计算
 */
export class MetricsEngine {
    private customMetrics: CustomMetric[];
    private metricWeights: MetricWeights;

    constructor(customMetrics: CustomMetric[], metricWeights: MetricWeights) {
        this.customMetrics = customMetrics;
        this.metricWeights = metricWeights;
    }

    /**
     * 计算文档的综合优先级分数
     */
    public calculatePriority(metrics: DocumentMetrics): number {
        let totalScore = 0;
        let totalWeight = 0;

        for (const metric of this.customMetrics) {
            const metricValue = metrics[metric.id] ?? 5; // 默认值为5
            const metricWeight = this.metricWeights[metric.id] ?? metric.weight;

            totalScore += metricValue * (metricWeight / 100);
            totalWeight += metricWeight / 100;
        }

        return totalWeight > 0 ? (totalScore / totalWeight) * 10 : 0;
    }

    /**
     * 获取文档的指标（带默认值）
     */
    public getDocumentMetrics(file: TFile, storedMetrics?: DocumentMetrics): DocumentMetrics {
        if (storedMetrics) {
            return this.validateMetrics(storedMetrics);
        }

        // 返回默认指标
        const defaultMetrics: DocumentMetrics = {
            lastVisited: 0,
            visitCount: 0
        };

        // 为每个自定义指标添加默认值
        for (const metric of this.customMetrics) {
            defaultMetrics[metric.id] = 5;
        }

        return defaultMetrics;
    }

    /**
     * 更新文档指标
     */
    public updateDocumentMetrics(
        currentMetrics: DocumentMetrics,
        updates: Partial<DocumentMetrics>
    ): DocumentMetrics {
        const updatedMetrics: DocumentMetrics = {
            ...currentMetrics,
            ...updates,
            lastVisited: Date.now()
        };

        // 检查是否有指标更新（表示用户交互）
        const hasMetricUpdate = Object.keys(updates).some(key =>
            key !== 'lastVisited' && key !== 'visitCount' && updates[key] !== undefined
        );

        if (hasMetricUpdate) {
            updatedMetrics.visitCount = currentMetrics.visitCount + 1;
        }

        return this.validateMetrics(updatedMetrics);
    }

    /**
     * 验证指标值是否在有效范围内
     */
    public validateMetrics(metrics: DocumentMetrics): DocumentMetrics {
        const validated: DocumentMetrics = { ...metrics };

        // 验证自定义指标值
        for (const metric of this.customMetrics) {
            if (metrics[metric.id] !== undefined) {
                validated[metric.id] = Math.max(0, Math.min(10, Number(metrics[metric.id])));
            }
        }

        // 验证系统指标
        validated.lastVisited = Math.max(0, Number(validated.lastVisited));
        validated.visitCount = Math.max(0, Math.floor(Number(validated.visitCount)));

        return validated;
    }

    /**
     * 获取指标的权重分布
     */
    public getWeightBreakdown(metrics: DocumentMetrics): Array<{
        name: string;
        value: number;
        weight: number;
        contribution: number;
    }> {
        return this.customMetrics.map(metric => {
            const metricValue = metrics[metric.id] ?? 5;
            const metricWeight = this.metricWeights[metric.id] ?? metric.weight;
            const contribution = metricValue * (metricWeight / 100);

            return {
                name: metric.name,
                value: metricValue,
                weight: metricWeight,
                contribution
            };
        });
    }

    /**
     * 归一化权重
     */
    public normalizeWeights(): void {
        const totalWeight = this.customMetrics.reduce((sum, metric) => sum + metric.weight, 0);

        if (totalWeight > 0) {
            this.customMetrics.forEach(metric => {
                metric.weight = Math.round((metric.weight / totalWeight) * 100);
            });
        }

        // 更新权重映射
        this.metricWeights = {};
        for (const metric of this.customMetrics) {
            this.metricWeights[metric.id] = metric.weight;
        }
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
     * 比较两个文档的优先级
     */
    public comparePriority(metrics1: DocumentMetrics, metrics2: DocumentMetrics): number {
        const priority1 = this.calculatePriority(metrics1);
        const priority2 = this.calculatePriority(metrics2);
        return priority2 - priority1; // 降序排列
    }
}