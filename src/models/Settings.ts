import { TFile } from 'obsidian';

export interface DocumentMetrics {
	difficulty: number; // 0-10, how difficult the content is
	importance: number; // 0-10, how important it is to learn this
	urgency: number; // 0-10, how urgent it is to read this
	interest: number; // 0-10, how interesting the content is to you
	priority: number; // 0-10, manual priority override
	lastVisited: number; // timestamp
	visitCount: number; // number of times visited
}

export interface MetricWeights {
	difficulty: number;
	importance: number;
	urgency: number;
	interest: number;
	priority: number;
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
	metricWeights: MetricWeights;
	recommendationSettings: RecommendationSettings;
	excludedPaths: string[];
	maxCandidates: number;
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
	metricWeights: {
		difficulty: 2.0,
		importance: 3.0,
		urgency: 2.5,
		interest: 2.0,
		priority: 2.5
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
	version: '1.0.0' // 当前版本
};