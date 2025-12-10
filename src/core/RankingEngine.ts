import { TFile } from 'obsidian';
import { DocumentMetrics } from '../types/metrics';
import { RankingEntry, RankingOptions } from '../types/ranking';

/**
 * 排行榜引擎 - 统一处理排行榜相关逻辑
 */
export class RankingEngine {
    private metricsEngine: any; // MetricsEngine instance

    constructor(metricsEngine: any) {
        this.metricsEngine = metricsEngine;
    }

    /**
     * 生成文档排行榜
     */
    public generateRanking(
        files: TFile[],
        fileMetrics: Map<string, DocumentMetrics>,
        options: RankingOptions = {}
    ): RankingEntry[] {
        const {
            limit = 10,
            sortBy = 'priority',
            sortOrder = 'desc',
            includeEmptyMetrics = false
        } = options;

        // 过滤文件
        let entries = files.map(file => {
            const metrics = fileMetrics.get(file.path) || this.metricsEngine.getDocumentMetrics(file);
            const priority = this.metricsEngine.calculatePriority(metrics);

            return {
                file,
                metrics,
                priority,
                rank: 0, // Will be set after sorting
                weightBreakdown: this.metricsEngine.getWeightBreakdown(metrics)
            };
        });

        // 过滤空指标（如果需要）
        if (!includeEmptyMetrics) {
            entries = entries.filter(entry => entry.priority > 0);
        }

        // 排序
        entries.sort((a, b) => {
            const aValue = a[sortBy as keyof RankingEntry];
            const bValue = b[sortBy as keyof RankingEntry];

            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
            }

            return 0;
        });

        // 设置排名
        entries.forEach((entry, index) => {
            entry.rank = index + 1;
        });

        // 限制结果数量
        return entries.slice(0, limit);
    }

    /**
     * 获取Top N文档
     */
    public getTopDocuments(
        files: TFile[],
        fileMetrics: Map<string, DocumentMetrics>,
        n: number = 10
    ): RankingEntry[] {
        return this.generateRanking(files, fileMetrics, { limit: n });
    }

    /**
     * 按特定指标排序
     */
    public sortByMetric(
        files: TFile[],
        fileMetrics: Map<string, DocumentMetrics>,
        metricId: string,
        order: 'asc' | 'desc' = 'desc'
    ): RankingEntry[] {
        const entries = files.map(file => {
            const metrics = fileMetrics.get(file.path) || this.metricsEngine.getDocumentMetrics(file);
            const priority = this.metricsEngine.calculatePriority(metrics);
            const metricValue = metrics[metricId] ?? 0;

            return {
                file,
                metrics,
                priority,
                rank: 0,
                metricValue,
                weightBreakdown: this.metricsEngine.getWeightBreakdown(metrics)
            };
        });

        entries.sort((a, b) => {
            const comparison = (a.metricValue || 0) - (b.metricValue || 0);
            return order === 'asc' ? comparison : -comparison;
        });

        entries.forEach((entry, index) => {
            entry.rank = index + 1;
        });

        return entries;
    }

    /**
     * 获取排名变化
     */
    public getRankChange(
        currentRanking: RankingEntry[],
        previousRanking: RankingEntry[],
        filePath: string
    ): number {
        const current = currentRanking.find(entry => entry.file.path === filePath);
        const previous = previousRanking.find(entry => entry.file.path === filePath);

        if (!current || !previous) {
            return 0; // 新文件或已删除文件
        }

        return previous.rank - current.rank; // 正数表示排名上升
    }

    /**
     * 分析排行榜统计信息
     */
    public analyzeRanking(ranking: RankingEntry[]): {
        totalDocuments: number;
        averagePriority: number;
        topPriority: number;
        bottomPriority: number;
        distribution: Record<string, number>;
    } {
        if (ranking.length === 0) {
            return {
                totalDocuments: 0,
                averagePriority: 0,
                topPriority: 0,
                bottomPriority: 0,
                distribution: {}
            };
        }

        const priorities = ranking.map(entry => entry.priority);
        const averagePriority = priorities.reduce((sum, p) => sum + p, 0) / priorities.length;
        const topPriority = Math.max(...priorities);
        const bottomPriority = Math.min(...priorities);

        // 按优先级区间分布
        const distribution = {
            high: priorities.filter((p: number) => p >= 8).length,
            mediumHigh: priorities.filter((p: number) => p >= 6 && p < 8).length,
            medium: priorities.filter((p: number) => p >= 4 && p < 6).length,
            low: priorities.filter((p: number) => p < 4).length
        };

        return {
            totalDocuments: ranking.length,
            averagePriority,
            topPriority,
            bottomPriority,
            distribution
        };
    }

    /**
     * 搜索文档（按文件名或路径）
     */
    public searchRanking(
        ranking: RankingEntry[],
        query: string
    ): RankingEntry[] {
        if (!query.trim()) {
            return ranking;
        }

        const lowercaseQuery = query.toLowerCase();
        return ranking.filter(entry =>
            entry.file.basename.toLowerCase().includes(lowercaseQuery) ||
            entry.file.path.toLowerCase().includes(lowercaseQuery)
        );
    }

    /**
     * 过滤排行榜
     */
    public filterRanking(
        ranking: RankingEntry[],
        filters: {
            minPriority?: number;
            maxPriority?: number;
            minVisitCount?: number;
            fileTypes?: string[];
        }
    ): RankingEntry[] {
        return ranking.filter(entry => {
            if (filters.minPriority && entry.priority < filters.minPriority) {
                return false;
            }
            if (filters.maxPriority && entry.priority > filters.maxPriority) {
                return false;
            }
            if (filters.minVisitCount && entry.metrics.visitCount < filters.minVisitCount) {
                return false;
            }
            if (filters.fileTypes && !filters.fileTypes.includes(entry.file.extension)) {
                return false;
            }
            return true;
        });
    }
}