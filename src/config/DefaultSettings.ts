import { IncrementalReadingSettings } from '../models/Settings';

export const DEFAULT_SETTINGS: IncrementalReadingSettings = {
    excludeVisited: true,
    roamingDocs: [], // 手动添加的漫游文档
    documentMetrics: {},
    customMetrics: [
        { id: 'importance', name: '重要性', weight: 40 },
        { id: 'urgency', name: '紧急度', weight: 30 },
        { id: 'completion', name: '完成度', weight: 30 }
    ],
    metricWeights: {
        importance: 40.0,
        urgency: 30.0,
        completion: 30.0
    },
    recommendationSettings: {
        recentCount: 5,
        topCount: 5,
        topK: 10,
        maxCandidates: 100,
        maxParagraphs: 5
    },
    excludedPaths: [
        'Templates/**',
        'Scripts/**',
        'Archive/**',
        '.obsidian/**',
        '**/.git/**'
    ],
    maxCandidates: 100,
    language: 'en', // 界面语言
    version: '2.0.0' // 当前版本
};