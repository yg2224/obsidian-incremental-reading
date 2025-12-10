import { TFile } from 'obsidian';

export interface CustomMetric {
	id: string;
	name: string;
	weight: number; // 0-100, percentage weight
}

export interface DocumentMetrics {
	[key: string]: number; // Dynamic metrics based on custom metrics
	lastVisited: number; // timestamp
	visitCount: number; // number of times visited
	totalScore?: number; // Calculated total score (weighted average)
}

export interface MetricWeights {
	[key: string]: number; // Dynamic weights based on custom metrics
}

export interface RecommendationSettings {
	recentCount: number; // Number of recently visited docs to use as anchors
	topCount: number; // Number of top priority docs to use as anchors
	topK: number; // Number of recommendations to return
	maxCandidates: number; // Maximum number of documents to consider
	maxParagraphs: number; // Maximum paragraphs to sample from each document
}

export interface IncrementalReadingSettings {
	excludeVisited: boolean;
	roamingDocs: string[]; // 手动添加的漫游文档
	documentMetrics: Record<string, DocumentMetrics>;
	customMetrics: CustomMetric[]; // 自定义指标列表
	metricWeights: MetricWeights;
	recommendationSettings: RecommendationSettings;
	excludedPaths: string[];
	maxCandidates: number;
	language: string; // 界面语言 (en, zh, ja, ko, es, fr, de, ru)
	version?: string; // 插件版本，用于数据迁移
}

// For migration purposes only
export interface LegacyIncrementalReadingSettings extends IncrementalReadingSettings {
	visitedDocs?: string[]; // 旧版本的 visitedDocs，用于数据迁移
}

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
	language: 'en', // 默认英语
	version: '2.0.0' // 当前版本 - 更新版本号表示重大更新
};