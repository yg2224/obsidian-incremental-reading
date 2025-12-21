import { TFile } from 'obsidian';

export interface CustomMetric {
	id: string;
	name: {
		en: string;
		zh: string;
	};
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

export interface ColorScheme {
	id: string;
	name: {
		en: string;
		zh: string;
	};
	primaryColor: string;
	accentColor: string;
	bgGradient: string;
	cardBg: string;
	textMain: string;
	textSecondary: string;
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
	colorScheme: string; // 颜色主题 ID
	version?: string; // 插件版本，用于数据迁移
}

// For migration purposes only
export interface LegacyIncrementalReadingSettings extends IncrementalReadingSettings {
	visitedDocs?: string[]; // 旧版本的 visitedDocs，用于数据迁移
}

export const COLOR_SCHEMES: ColorScheme[] = [
	{
		id: 'arctic',
		name: { en: 'Arctic', zh: '极地' },
		primaryColor: '#a855f7',
		accentColor: '#8b5cf6',
		bgGradient: 'linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)',
		cardBg: 'rgba(255, 255, 255, 0.9)',
		textMain: '#1e293b',
		textSecondary: '#64748b'
	},
	{
		id: 'forest',
		name: { en: 'Forest', zh: '森林' },
		primaryColor: '#27ae60',
		accentColor: '#16a085',
		bgGradient: 'linear-gradient(135deg, #f0fff4 0%, #d4f1d4 100%)',
		cardBg: 'rgba(255, 255, 255, 0.9)',
		textMain: '#2c3e50',
		textSecondary: '#7f8c8d'
	},
	{
		id: 'sunset',
		name: { en: 'Sunset', zh: '日落' },
		primaryColor: '#ff6b6b',
		accentColor: '#ff9f43',
		bgGradient: 'linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%)',
		cardBg: 'rgba(255, 255, 255, 0.85)',
		textMain: '#2c3e50',
		textSecondary: '#7f8c8d'
	},
	{
		id: 'ocean',
		name: { en: 'Ocean', zh: '海洋' },
		primaryColor: '#3498db',
		accentColor: '#2980b9',
		bgGradient: 'linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%)',
		cardBg: 'rgba(255, 255, 255, 0.9)',
		textMain: '#2c3e50',
		textSecondary: '#7f8c8d'
	},
	{
		id: 'dark',
		name: { en: 'Dark Mode', zh: '深色模式' },
		primaryColor: '#ecf0f1',
		accentColor: '#3498db',
		bgGradient: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
		cardBg: 'rgba(52, 73, 94, 0.8)',
		textMain: '#ecf0f1',
		textSecondary: '#bdc3c7'
	}
];

export const DEFAULT_SETTINGS: IncrementalReadingSettings = {
	excludeVisited: true,
	roamingDocs: [], // 手动添加的漫游文档
	documentMetrics: {},
	customMetrics: [
		{ id: 'importance', name: { en: 'Importance', zh: '重要性' }, weight: 40 },
		{ id: 'urgency', name: { en: 'Urgency', zh: '紧急度' }, weight: 30 },
		{ id: 'completion', name: { en: 'Completion', zh: '完成度' }, weight: 30 }
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
	colorScheme: 'arctic', // 默认极地主题
	version: '2.0.0' // 当前版本 - 更新版本号表示重大更新
};