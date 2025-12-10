import { TFile } from 'obsidian';
import { DocumentMetrics } from './metrics';

export interface RankingEntry {
    file: TFile;
    metrics: DocumentMetrics;
    priority: number;
    rank: number;
    metricValue?: number; // When sorting by specific metric
    weightBreakdown?: Array<{
        name: string;
        value: number;
        weight: number;
        contribution: number;
    }>;
    rankChange?: number; // Positive = moved up, Negative = moved down
}

export interface RankingOptions {
    limit?: number;
    sortBy?: 'priority' | 'visitCount' | 'lastVisited' | string;
    sortOrder?: 'asc' | 'desc';
    includeEmptyMetrics?: boolean;
}

export interface RankingFilters {
    minPriority?: number;
    maxPriority?: number;
    minVisitCount?: number;
    maxVisitCount?: number;
    fileTypes?: string[];
    searchTerm?: string;
}

export interface RankingStatistics {
    totalDocuments: number;
    averagePriority: number;
    topPriority: number;
    bottomPriority: number;
    distribution: {
        high: number;      // >= 8
        mediumHigh: number; // 6-7.9
        medium: number;    // 4-5.9
        low: number;       // < 4
    };
}

export interface RankingUpdateEvent {
    type: 'add' | 'remove' | 'update' | 'reorder';
    filePath: string;
    newRank?: number;
    oldRank?: number;
    timestamp: number;
}