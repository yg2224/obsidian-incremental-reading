import { TFile } from 'obsidian';
import { DocumentMetrics, MetricWeights, IncrementalReadingSettings, LegacyIncrementalReadingSettings, CustomMetric } from '../models/Settings';

/**
 * Shared utility functions for the incremental reading plugin
 */
export class SharedUtils {
	/**
	 * Calculate priority score for a document based on custom metrics and weights
	 */
	static calculatePriority(metrics: DocumentMetrics, weights: MetricWeights, customMetrics: CustomMetric[]): number {
		let totalScore = 0;
		let totalWeight = 0;

		for (const metric of customMetrics) {
			const metricValue = metrics[metric.id] || 0; // Default to 0 if not set
			const metricWeight = weights[metric.id] || metric.weight;

			totalScore += metricValue * (metricWeight / 100); // Convert weight percentage to decimal
			totalWeight += metricWeight / 100;
		}

		// Return normalized score (0-10)
		return totalWeight > 0 ? (totalScore / totalWeight) * 10 : 0;
	}

	/**
	 * Safely get document metrics with defaults for custom metrics
	 */
	static getDocumentMetrics(file: TFile, settings: IncrementalReadingSettings): DocumentMetrics {
		const filePath = file.path;
		const stored = settings.documentMetrics[filePath];

		if (stored) {
			return stored;
		}

		// Return default metrics for custom metrics
		const defaultMetrics: DocumentMetrics = {
			lastVisited: 0,
			visitCount: 0
		};

		// Add default values for each custom metric
		for (const metric of settings.customMetrics) {
			defaultMetrics[metric.id] = 5; // Default score of 5 for each metric
		}

		return defaultMetrics;
	}

	/**
	 * Update document metrics with validation
	 */
	static updateDocumentMetrics(
		file: TFile,
		settings: IncrementalReadingSettings,
		metrics: Partial<DocumentMetrics>
	): DocumentMetrics {
		const filePath = file.path;
		const currentMetrics = this.getDocumentMetrics(file, settings);

		const updatedMetrics: DocumentMetrics = {
			...currentMetrics,
			...metrics,
			lastVisited: Date.now()
		};

		// Check if any custom metric was updated (indicates user interaction)
		const hasMetricUpdate = Object.keys(metrics).some(key =>
			key !== 'lastVisited' && key !== 'visitCount' && metrics[key] !== undefined
		);

		if (hasMetricUpdate) {
			updatedMetrics.visitCount = currentMetrics.visitCount + 1;
		}

		return updatedMetrics;
	}

	/**
	 * Check if file should be included based on excluded paths
	 */
	static shouldIncludeFile(file: TFile, excludedPaths: string[]): boolean {
		try {
			const excludedPatterns = excludedPaths.map(pattern =>
				new RegExp(pattern.replace(/\*/g, '.*'), 'i')
			);

			return !excludedPatterns.some(pattern => pattern.test(file.path));
		} catch (error) {
			console.warn('Invalid regex pattern in excluded paths:', error);
			return true; // Include file if pattern is invalid
		}
	}

	/**
	 * Get priority color based on score
	 */
	static getPriorityColor(priority: number): string {
		if (priority >= 8) return '#dc3545'; // red
		if (priority >= 6) return '#fd7e14'; // orange
		if (priority >= 4) return '#ffc107'; // yellow
		if (priority >= 2) return '#28a745'; // green
		return '#6c757d'; // gray
	}

	/**
	 * Safe JSON stringify with error handling
	 */
	static safeStringify(obj: any): string {
		try {
			return JSON.stringify(obj, null, 2);
		} catch (error) {
			console.error('Error stringifying object:', error);
			return '{}';
		}
	}

	/**
	 * Safe JSON parse with error handling
	 */
	static safeParse<T>(json: string, defaultValue: T): T {
		try {
			return JSON.parse(json);
		} catch (error) {
			console.error('Error parsing JSON:', error);
			return defaultValue;
		}
	}

	/**
	 * Debounce function for performance optimization
	 */
	static debounce<T extends (...args: any[]) => any>(
		func: T,
		wait: number
	): (...args: Parameters<T>) => void {
		let timeout: NodeJS.Timeout;
		return (...args: Parameters<T>) => {
			clearTimeout(timeout);
			timeout = setTimeout(() => func(...args), wait);
		};
	}

	/**
	 * Validate metric values are within acceptable ranges for custom metrics
	 */
	static validateMetrics(metrics: Partial<DocumentMetrics>, customMetrics: CustomMetric[]): Partial<DocumentMetrics> {
		const validated: Partial<DocumentMetrics> = {};

		// Validate custom metric values
		for (const metric of customMetrics) {
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
	 * Validate settings values
	 */
	static validateSettings(settings: Partial<LegacyIncrementalReadingSettings> | null | undefined): Partial<IncrementalReadingSettings> {
		const validated: Partial<IncrementalReadingSettings> = {};

		// 如果 settings 为 null 或 undefined，直接返回空对象
		if (!settings) {
			return validated;
		}

		if (settings.excludeVisited !== undefined) {
			validated.excludeVisited = Boolean(settings.excludeVisited);
		}

		// 检查是否是新用户或首次使用新版本
		const isNewUser = !settings.version || settings.version !== '2.0.0';

		if (settings.roamingDocs !== undefined) {
			validated.roamingDocs = Array.isArray(settings.roamingDocs)
				? settings.roamingDocs.filter(path => typeof path === 'string')
				: [];
		} else {
			// 如果没有 roamingDocs 设置，从空数组开始
			validated.roamingDocs = [];
		}

		// 如果是新用户但发现了旧版本的 visitedDocs 数据，提供清理选项
		if (isNewUser && settings.visitedDocs && Array.isArray(settings.visitedDocs) && settings.visitedDocs.length > 0) {
			// 不自动迁移，让用户手动选择是否要迁移到漫游列表
			// 这里可以添加一个通知让用户知道有历史数据可以迁移
			console.log(`发现 ${settings.visitedDocs.length} 个历史访问记录，请使用"添加至漫游"功能手动添加需要的文档`);
		}

		if (settings.excludedPaths !== undefined) {
			validated.excludedPaths = Array.isArray(settings.excludedPaths)
				? settings.excludedPaths.filter(path => typeof path === 'string')
				: [];
		}

		if (settings.maxCandidates !== undefined) {
			validated.maxCandidates = Math.max(10, Math.min(1000, Number(settings.maxCandidates)));
		}

		// Validate custom metrics
		if (settings.customMetrics !== undefined && Array.isArray(settings.customMetrics)) {
			validated.customMetrics = settings.customMetrics
				.filter(metric =>
					metric &&
					typeof metric.id === 'string' &&
					(typeof metric.name === 'string' || (typeof metric.name === 'object' && metric.name.en && metric.name.zh)) &&
					typeof metric.weight === 'number'
				)
				.map(metric => {
					// Handle migration from string to bilingual object
					let name: { en: string; zh: string };
					if (typeof metric.name === 'string') {
						// Migrate old string format to bilingual object
						const chineseName = metric.name;
						const englishName = this.getEnglishTranslation(chineseName) || chineseName;
						name = { en: englishName, zh: chineseName };
					} else {
						name = metric.name;
					}

					return {
						id: metric.id,
						name: name,
						weight: Math.max(0, Math.min(100, metric.weight))
					};
				});
		} else {
			// Use default custom metrics if none are provided
			validated.customMetrics = [
				{ id: 'importance', name: { en: 'Importance', zh: '重要性' }, weight: 40 },
				{ id: 'urgency', name: { en: 'Urgency', zh: '紧急度' }, weight: 30 },
				{ id: 'completion', name: { en: 'Completion', zh: '完成度' }, weight: 30 }
			];
		}

		// Normalize metric weights to ensure they sum to 100%
		if (validated.customMetrics && validated.customMetrics.length > 0) {
			const totalWeight = validated.customMetrics.reduce((sum, metric) => sum + metric.weight, 0);
			if (totalWeight > 0) {
				validated.customMetrics = validated.customMetrics.map(metric => ({
					...metric,
					weight: Math.round((metric.weight / totalWeight) * 100)
				}));
			}
		}

		// Generate metric weights from custom metrics
		if (validated.customMetrics) {
			validated.metricWeights = {};
			for (const metric of validated.customMetrics) {
				validated.metricWeights[metric.id] = metric.weight;
			}
		}

		return validated;
	}

	/**
	 * Create a safe element getter with null checks
	 */
	static safeElementQuery<T extends Element>(
		container: Element | null,
		selector: string
	): T | null {
		if (!container) return null;

		try {
			return container.querySelector(selector) as T | null;
		} catch (error) {
			console.warn('Invalid selector:', selector, error);
			return null;
		}
	}

	/**
	 * Generate a unique ID for DOM elements
	 */
	static generateId(prefix: string = 'ir'): string {
		return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Format file size in human readable format
	 */
	static formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 B';

		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));

		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	/**
	 * Truncate text with ellipsis
	 */
	static truncateText(text: string, maxLength: number): string {
		if (text.length <= maxLength) return text;
		return text.substr(0, maxLength - 3) + '...';
	}

	/**
	 * Check if a value is a valid number
	 */
	static isValidNumber(value: any): value is number {
		return typeof value === 'number' && !isNaN(value) && isFinite(value);
	}

	/**
	 * Get English translation for Chinese metric names
	 */
	static getEnglishTranslation(chineseName: string): string | null {
		const translations: Record<string, string> = {
			'重要性': 'Importance',
			'紧急度': 'Urgency',
			'完成度': 'Completion',
			'难度': 'Difficulty',
			'兴趣度': 'Interest',
			'实用性': 'Practicality',
			'优先级': 'Priority',
			'复杂度': 'Complexity',
			'价值度': 'Value',
			'时效性': 'Timeliness'
		};
		return translations[chineseName] || null;
	}
}