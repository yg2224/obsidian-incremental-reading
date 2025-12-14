import { App, TFile } from 'obsidian';
import { IncrementalReadingSettings, DocumentMetrics } from '../models/Settings';
import { SharedUtils } from '../utils/SharedUtils';
import { FileContentCache, VectorCache } from '../utils/CacheManager';

interface TfIdfVector extends Map<string, number> {}

export class RecommendationService {
	private app: App;
	private settings: IncrementalReadingSettings;
	private fileCache: FileContentCache;
	private vectorCache: VectorCache;
	private documentCache: Map<string, { content: string; tokens: string[] }> = new Map();

	constructor(app: App, settings: IncrementalReadingSettings) {
		this.app = app;
		this.settings = settings;
		this.fileCache = new FileContentCache(app);
		this.vectorCache = new VectorCache();
	}

	/**
	 * Get recommended documents based on Text Cosine Similarity
	 */
	async getRecommendations(excludeFile?: TFile): Promise<Array<{ file: TFile; score: number }>> {
		try {
			console.log('开始智能推荐算法...');

			const files = this.app.vault.getMarkdownFiles();
			// Only include documents that have been manually added to roaming
			const roamingFiles = files.filter(file =>
				SharedUtils.shouldIncludeFile(file, this.settings.excludedPaths) &&
				file !== excludeFile &&
				this.settings.roamingDocs.includes(file.path) // Only include roaming documents
			);

			console.log(`找到 ${roamingFiles.length} 个漫游文档`);

			if (roamingFiles.length === 0) {
				console.log('没有漫游文档，返回空推荐');
				return [];
			}

			// 获取当前文档作为参考点
			const currentFile = excludeFile || this.app.workspace.getActiveFile();
			if (!currentFile) {
				console.log('没有当前文档，按优先级排序推荐漫游文档');
				return this.getPriorityBasedRecommendations(roamingFiles);
			}

			console.log(`当前参考文档: ${currentFile.basename}`);

			// 简化逻辑：计算所有漫游文档与当前文档的文本相似度
			const similarityScores: Array<{ file: TFile; score: number }> = [];

			for (const roamingFile of roamingFiles) {
				if (roamingFile.path === currentFile.path) continue; // 跳过当前文档

				try {
					const similarity = await this.calculateTextSimilarity(currentFile, roamingFile);
					console.log(`${roamingFile.basename} 相似度: ${similarity.toFixed(4)}`);

					if (similarity > 0) { // 只保留有相似度的文档
						similarityScores.push({ file: roamingFile, score: similarity });
					}
				} catch (error) {
					console.error(`计算 ${roamingFile.basename} 相似度失败:`, error);
				}
			}

			// 按相似度排序
			similarityScores.sort((a, b) => b.score - a.score);
			console.log(`找到 ${similarityScores.length} 个有相似度的文档`);

			// 如果没有找到相似文档，返回基于优先级的推荐
			if (similarityScores.length === 0) {
				console.log('没有相似文档，按优先级排序推荐');
				return this.getPriorityBasedRecommendations(roamingFiles);
			}

			// 返回前K个最相似的文档
			const topK = Math.min(this.settings.recommendationSettings.topK, similarityScores.length);
			const result = similarityScores.slice(0, topK);
			console.log(`推荐完成，返回 ${result.length} 个文档`);

			// 去重逻辑 - 确保每个文档只出现一次
			console.log(`去重前的推荐结果:`, result.map(r => ({ name: r.file.basename, path: r.file.path, score: r.score })));
			const uniqueResults = this.deduplicateRecommendations(result);
			console.log(`去重后的推荐结果:`, uniqueResults.map(r => ({ name: r.file.basename, path: r.file.path, score: r.score })));
			console.log(`去重后返回 ${uniqueResults.length} 个文档`);

			return uniqueResults;
		} catch (error) {
			console.error('智能推荐算法出错:', error);
			return [];
		}
	}

	/**
	 * 去重逻辑 - 根据文档ID移除重复项
	 */
	private deduplicateRecommendations(recommendations: Array<{ file: TFile; score: number }>): Array<{ file: TFile; score: number }> {
		const seenFiles = new Map<string, { file: TFile; score: number }>(); // 使用Map获取最高分版本
		const duplicates: string[] = [];

		console.log(`开始去重，输入文档数量: ${recommendations.length}`);

		for (const recommendation of recommendations) {
			const fileId = recommendation.file.path; // 使用文件路径作为唯一标识

			if (!seenFiles.has(fileId)) {
				seenFiles.set(fileId, recommendation);
			} else {
				const existing = seenFiles.get(fileId)!;
				// 如果新的分数更高，替换现有的
				if (recommendation.score > existing.score) {
					console.log(`去重: 发现重复文档 ${recommendation.file.basename}，保留更高分数 ${recommendation.score.toFixed(4)} > ${existing.score.toFixed(4)}`);
					seenFiles.set(fileId, recommendation);
				} else {
					console.log(`去重: 发现重复文档 ${recommendation.file.basename}，保留原分数 ${existing.score.toFixed(4)} > ${recommendation.score.toFixed(4)}`);
				}
				duplicates.push(fileId);
			}
		}

		const uniqueRecommendations = Array.from(seenFiles.values());
		console.log(`去重完成: 发现 ${duplicates.length} 个重复项，最终 ${uniqueRecommendations.length} 个唯一文档`);

		return uniqueRecommendations;
	}

	/**
	 * 基于优先级的简单推荐（回退方案）
	 */
	private getPriorityBasedRecommendations(roamingFiles: TFile[]): Array<{ file: TFile; score: number }> {
		const priorityRecs = roamingFiles
			.sort((a, b) => {
				const aMetrics = this.getDocumentMetrics(a);
				const bMetrics = this.getDocumentMetrics(b);
				return bMetrics.priority - aMetrics.priority;
			})
			.slice(0, this.settings.recommendationSettings.topK)
			.map(file => ({
				file,
				score: this.getDocumentMetrics(file).priority / 10
			}));

		// 应用去重逻辑
		return this.deduplicateRecommendations(priorityRecs);
	}

	/**
	 * 计算两个文档之间的文本余弦相似度
	 */
	private async calculateTextSimilarity(file1: TFile, file2: TFile): Promise<number> {
		try {
			console.log(`开始计算 ${file1.basename} 与 ${file2.basename} 的文本相似度...`);

			// 提取文本内容
			const content1 = await this.extractSimpleTextContent(file1);
			const content2 = await this.extractSimpleTextContent(file2);

			console.log(`文档1内容长度: ${content1.length}, 文档2内容长度: ${content2.length}`);

			if (!content1 || !content2 || content1.length < 10 || content2.length < 10) {
				console.log('文档内容太短，跳过相似度计算');
				return 0;
			}

			// 分词
			const tokens1 = this.simpleTokenize(content1);
			const tokens2 = this.simpleTokenize(content2);

			console.log(`文档1词数: ${tokens1.length}, 文档2词数: ${tokens2.length}`);

			if (tokens1.length === 0 || tokens2.length === 0) {
				console.log('分词结果为空，跳过相似度计算');
				return 0;
			}

			// 计算词频
			const freq1 = this.calculateWordFrequency(tokens1);
			const freq2 = this.calculateWordFrequency(tokens2);

			// 计算余弦相似度
			const similarity = this.cosineSimilarityFromFreq(freq1, freq2);

			// 确保返回值在 0-1 之间，并且是有效数字
			const validSimilarity = (!isFinite(similarity) || isNaN(similarity)) ? 0 : Math.max(0, Math.min(1, similarity));

			console.log(`最终相似度: ${validSimilarity.toFixed(4)}`);
			return validSimilarity;
		} catch (error) {
			console.error(`计算文本相似度失败:`, error);
			return 0;
		}
	}

	/**
	 * 简化的文本内容提取
	 */
	private async extractSimpleTextContent(file: TFile): Promise<string> {
		try {
			const content = await this.app.vault.read(file);
			return content
				.replace(/```[\s\S]*?```/g, '') // 移除代码块
				.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 移除链接，保留文本
				.replace(/!\[[^\]]*\]\([^)]+\)/g, '') // 移除图片
				.replace(/#{1,6}\s+/g, ' ') // 移除标题符号
				.replace(/\*\*([^\*]+)\*\*/g, '$1') // 移除粗体标记
				.replace(/\*([^\*]+)\*/g, '$1') // 移除斜体标记
				.replace(/`([^`]+)`/g, '$1') // 移除行内代码标记
				.replace(/^\s*[-*+]\s+/gm, '') // 移除列表标记
				.replace(/^\s*\d+\.\s+/gm, '') // 移除数字列表标记
				.replace(/^\s*>\s+/gm, '') // 移除引用标记
				.replace(/[^\w\s\u4e00-\u9fff]/g, ' ') // 只保留中英文和空格
				.replace(/\s+/g, ' ') // 合并多个空格
				.trim();
		} catch (error) {
			console.error(`提取 ${file.basename} 内容失败:`, error);
			return '';
		}
	}

	/**
	 * 简化的分词方法
	 */
	private simpleTokenize(text: string): string[] {
		const tokens: string[] = [];
		const lowerText = text.toLowerCase();

		for (let i = 0; i < lowerText.length; i++) {
			const char = lowerText[i];

			if (/[\u4e00-\u9fff]/.test(char)) {
				// 中文字符 - 逐字添加
				tokens.push(char);
			} else if (/[a-zA-Z]/.test(char)) {
				// 英文单词 - 收集连续字母
				let word = char;
				while (i + 1 < lowerText.length && /[a-zA-Z]/.test(lowerText[i + 1])) {
					i++;
					word += lowerText[i];
				}
				if (word.length > 1) {
					tokens.push(word);
				}
			}
			// 跳过其他字符
		}

		// 简单停用词过滤
		const stopWords = new Set(['的', '了', '在', '是', '我', '有', '和', '就', '不', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
		return tokens.filter(token => !stopWords.has(token) && token.length > 0);
	}

	/**
	 * 计算词频
	 */
	private calculateWordFrequency(tokens: string[]): Map<string, number> {
		const frequency = new Map<string, number>();
		for (const token of tokens) {
			frequency.set(token, (frequency.get(token) || 0) + 1);
		}
		return frequency;
	}

	/**
	 * 从词频计算余弦相似度
	 */
	private cosineSimilarityFromFreq(freq1: Map<string, number>, freq2: Map<string, number>): number {
		// 获取所有唯一词汇
		const allWords = new Set([...freq1.keys(), ...freq2.keys()]);

		// 如果没有共同词汇，返回 0
		if (allWords.size === 0) {
			return 0;
		}

		let dotProduct = 0;
		let magnitude1 = 0;
		let magnitude2 = 0;

		// 计算点积和模长
		for (const word of allWords) {
			const f1 = freq1.get(word) || 0;
			const f2 = freq2.get(word) || 0;

			dotProduct += f1 * f2;
			magnitude1 += f1 * f1;
			magnitude2 += f2 * f2;
		}

		magnitude1 = Math.sqrt(magnitude1);
		magnitude2 = Math.sqrt(magnitude2);

		// 检查除零错误
		if (magnitude1 === 0 || magnitude2 === 0 || !isFinite(magnitude1) || !isFinite(magnitude2)) {
			return 0;
		}

		const similarity = dotProduct / (magnitude1 * magnitude2);

		// 确保返回值在 0-1 之间，并且是有效数字
		if (!isFinite(similarity) || isNaN(similarity)) {
			return 0;
		}

		return Math.max(0, Math.min(1, similarity));
	}

	/**
	 * Calculate TF-IDF similarity scores between candidates and anchors
	 */
	private async calculateSimilarityScores(
		candidates: TFile[],
		anchors: TFile[]
	): Promise<Array<{ file: TFile; score: number }>> {
		try {
			// Build vocabulary and document frequencies
			const { vocabulary, documentFrequencies, totalDocs } = await this.buildVocabulary([...candidates, ...anchors]);

			// Calculate TF-IDF vectors for anchors
			const anchorVectors: TfIdfVector[] = [];
			for (const anchor of anchors) {
				const vector = await this.getOrCalculateTfIdfVector(anchor, vocabulary, documentFrequencies, totalDocs);
				anchorVectors.push(vector);
			}

			// Calculate similarity scores for each candidate
			const scores: Array<{ file: TFile; score: number }> = [];
			for (const candidate of candidates) {
				const candidateVector = await this.getOrCalculateTfIdfVector(candidate, vocabulary, documentFrequencies, totalDocs);

				// Calculate similarity with each anchor and take average (to reduce single anchor noise)
				let totalSimilarity = 0;
				let validAnchorCount = 0;

				for (let i = 0; i < anchors.length; i++) {
					const similarity = this.cosineSimilarity(candidateVector, anchorVectors[i]);
					if (similarity > 0) {
						totalSimilarity += similarity;
						validAnchorCount++;
					}
				}

				// Average similarity across anchors
				const avgSimilarity = validAnchorCount > 0 ? totalSimilarity / validAnchorCount : 0;

				// Combine with priority metrics for final score
				const metrics = this.getDocumentMetrics(candidate);
				const priorityScore = SharedUtils.calculatePriority(metrics, this.settings.metricWeights, this.settings.customMetrics) / 50; // Normalize to 0-1

				// Recency penalty
				const daysSinceVisit = metrics.lastVisited ?
					(Date.now() - metrics.lastVisited) / (1000 * 60 * 60 * 24) : 999;
				const recencyScore = Math.min(daysSinceVisit / 30, 1);

				// Visit count penalty
				const visitScore = Math.max(0, 1 - (metrics.visitCount * 0.1));

				// Final combined score
				const finalScore = (avgSimilarity * 0.4) + (priorityScore * 0.3) + (recencyScore * 0.2) + (visitScore * 0.1);

				scores.push({ file: candidate, score: finalScore });
			}

			// Sort by score
			scores.sort((a, b) => b.score - a.score);
			return scores;
		} catch (error) {
			console.error('Error calculating similarity scores:', error);
			// Fallback to priority-based scoring instead of random
			return candidates.map(file => {
				const metrics = this.settings.documentMetrics[file.path] || {
					lastVisited: Date.now(),
					visitCount: 0
				};
				const priority = SharedUtils.calculatePriority(metrics, this.settings.metricWeights, this.settings.customMetrics);
				return { file, score: priority / 10 }; // Normalize to 0-1 range
			});
		}
	}

	/**
	 * Build vocabulary and calculate document frequencies
	 */
	private async buildVocabulary(files: TFile[]): Promise<{
		vocabulary: Set<string>;
		documentFrequencies: Map<string, number>;
		totalDocs: number;
	}> {
		const vocabulary = new Set<string>();
		const documentFrequencies = new Map<string, number>();
		const totalDocs = files.length;

		// Count document frequencies for each term
		for (const file of files) {
			const tokens = await this.getDocumentTokens(file);
			const uniqueTokens = new Set(tokens);

			for (const token of uniqueTokens) {
				vocabulary.add(token);
				documentFrequencies.set(token, (documentFrequencies.get(token) || 0) + 1);
			}
		}

		return { vocabulary, documentFrequencies, totalDocs };
	}

	/**
	 * Get or calculate TF-IDF vector with caching
	 */
	private async getOrCalculateTfIdfVector(
		file: TFile,
		vocabulary: Set<string>,
		documentFrequencies: Map<string, number>,
		totalDocs: number
	): Promise<TfIdfVector> {
		const cacheKey = `tfidf:${file.path}:${file.stat.mtime}`;
		const cached = this.vectorCache.getVector(cacheKey);

		if (cached) {
			return cached.vector;
		}

		const tokens = await this.getDocumentTokens(file);
		const vector = this.calculateTfIdfVector(tokens, vocabulary, documentFrequencies, totalDocs);

		this.vectorCache.setVector(cacheKey, vector);
		return vector;
	}

	/**
	 * Get document tokens with caching
	 */
	private async getDocumentTokens(file: TFile): Promise<string[]> {
		const cacheKey = `${file.path}-${file.stat.mtime}`;
		const cached = this.documentCache.get(cacheKey);

		if (cached) {
			return cached.tokens;
		}

		const content = await this.extractTextContent(file);
		const tokens = this.tokenize(content);

		this.documentCache.set(cacheKey, { content, tokens });
		return tokens;
	}

	private async getAnchorDocuments(files: TFile[]): Promise<TFile[]> {
		const anchors: TFile[] = [];

		// Get recently visited roaming documents (recent_roam_N)
		const recentVisited = files.filter(file =>
			this.settings.roamingDocs.includes(file.path)
		);

		// Sort by custom-roaming-last (last visited time) and take top N
		recentVisited.sort((a, b) => {
			const aTime = this.getDocumentMetrics(a).lastVisited || 0;
			const bTime = this.getDocumentMetrics(b).lastVisited || 0;
			return bTime - aTime;
		});

		const recentAnchors = recentVisited.slice(0, this.settings.recommendationSettings.recentCount);

		// Get most visited roaming documents (top_roam_M) based on custom-roaming-count
		const withVisitCount = files.map(file => ({
			file,
			visitCount: this.getDocumentMetrics(file).visitCount
		}));

		withVisitCount.sort((a, b) => b.visitCount - a.visitCount);
		const topVisitedAnchors = withVisitCount
			.slice(0, this.settings.recommendationSettings.topCount)
			.map(item => item.file);

		// 合并去重
		const allAnchors = [...recentAnchors, ...topVisitedAnchors];
		for (const file of allAnchors) {
			if (!anchors.some(a => a.path === file.path)) {
				anchors.push(file);
			}
		}

		return anchors;
	}

	private calculateTfIdfVector(
		tokens: string[],
		vocabulary: Set<string>,
		documentFrequencies: Map<string, number>,
		totalDocs: number
	): TfIdfVector {
		const vector = new Map<string, number>();
		const termFrequencies = new Map<string, number>();

		// Count term frequencies
		for (const token of tokens) {
			termFrequencies.set(token, (termFrequencies.get(token) || 0) + 1);
		}

		// Calculate TF-IDF with length normalization
		let vectorSum = 0;
		for (const [term, tf] of termFrequencies) {
			const df = documentFrequencies.get(term) || 1;
			const idf = Math.log(totalDocs / df);
			// TF length normalization: tf / tokens.length
			const tfidf = (tf / tokens.length) * idf;
			vector.set(term, tfidf);
			vectorSum += tfidf * tfidf;
		}

		// L2 normalization
		const magnitude = Math.sqrt(vectorSum);
		if (magnitude > 0) {
			for (const [term, value] of vector) {
				vector.set(term, value / magnitude);
			}
		}

		return vector;
	}

	private cosineSimilarity(vectorA: TfIdfVector, vectorB: TfIdfVector): number {
		let dotProduct = 0;
		let magnitudeA = 0;
		let magnitudeB = 0;

		// Calculate dot product using only non-zero terms from vectorA
		for (const [term, valueA] of vectorA) {
			const valueB = vectorB.get(term) || 0;
			if (valueB !== 0) {
				dotProduct += valueA * valueB;
			}
		}

		// Recalculate magnitudes from vectors
		for (const valueA of vectorA.values()) {
			magnitudeA += valueA * valueA;
		}
		magnitudeA = Math.sqrt(magnitudeA);

		for (const valueB of vectorB.values()) {
			magnitudeB += valueB * valueB;
		}
		magnitudeB = Math.sqrt(magnitudeB);

		if (magnitudeA === 0 || magnitudeB === 0) return 0;
		return dotProduct / (magnitudeA * magnitudeB);
	}

	private async extractTextContent(file: TFile): Promise<string> {
		const content = await this.app.vault.read(file);

		// Remove markdown noise first
		const cleanContent = content
			.replace(/```[\s\S]*?```/g, ' ') // Code blocks
			.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
			.replace(/!\[[^\]]*\]\([^)]+\)/g, ' ') // Images
			.replace(/^\s*>\s+/gm, ' ') // Blockquotes
			.replace(/\n{3,}/g, '\n\n') // Multiple newlines
			.trim();

		// Extract title (first header)
		const titleMatch = cleanContent.match(/^#{1,6}\s+(.+)$/m);
		const title = titleMatch ? titleMatch[1] : '';

		// Split into paragraphs - 更宽松的过滤条件
		const paragraphs = cleanContent
			.split(/\n\n+/)
			.filter(p => p.trim().length > 5) // 降低最小长度要求
			.map(p => p
				.replace(/#{1,6}\s+/g, '') // Headers
				.replace(/\*\*([^\*]+)\*\*/g, '$1') // Bold
				.replace(/\*([^\*]+)\*/g, '$1') // Italic
				.replace(/`([^`]+)`/g, '$1') // Inline code
				.replace(/^\s*[-*+]\s+/gm, '') // List items
				.replace(/^\s*\d+\.\s+/gm, '') // Numbered lists
				.trim()
			)
			.filter(p => p.length > 3); // 进一步降低最小长度要求

		// Sample according to maxParagraphs setting
		const maxParagraphs = this.settings.recommendationSettings.maxParagraphs;
		let selectedTexts: string[] = [];

		if (title) {
			selectedTexts.push(title);
		}

		if (paragraphs.length > 0) {
			const sampleSize = Math.min(maxParagraphs - 1, paragraphs.length);
			if (sampleSize === 1) {
				// Take first paragraph
				selectedTexts.push(paragraphs[0]);
			} else if (sampleSize === 2) {
				// Take first and last
				selectedTexts.push(paragraphs[0]);
				selectedTexts.push(paragraphs[paragraphs.length - 1]);
			} else {
				// Take first, middle, and last
				selectedTexts.push(paragraphs[0]);
				const middleIndex = Math.floor(paragraphs.length / 2);
				selectedTexts.push(paragraphs[middleIndex]);
				selectedTexts.push(paragraphs[paragraphs.length - 1]);
			}
		}

		return selectedTexts.join(' ');
	}

	private tokenize(text: string): string[] {
		// 轻量分词：中文逐字、英文单词，停用词过滤
		const tokens: string[] = [];

		// Convert to lowercase for English
		const lowerText = text.toLowerCase();

		for (let i = 0; i < lowerText.length; i++) {
			const char = lowerText[i];

			if (/[\u4e00-\u9fff]/.test(char)) {
				// Chinese character - add character by character
				tokens.push(char);
			} else if (/[a-zA-Z]/.test(char)) {
				// English word - collect consecutive letters
				let word = char;
				while (i + 1 < lowerText.length && /[a-zA-Z]/.test(lowerText[i + 1])) {
					i++;
					word += lowerText[i];
				}
				if (word.length > 1) { // Filter out single letters
					tokens.push(word);
				}
			}
			// Skip other characters and punctuation
		}

		// Apply stop word filter
		return tokens.filter(token => !this.isStopWord(token));
	}

	private isStopWord(token: string): boolean {
		// Common stop words (can be expanded)
		const stopWords = new Set([
			// English
			'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
			// Chinese
			'的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '里', '就是', '还', '把', '比', '从', '被', '本', '个', '中', '大', '为', '来', '以', '时', '和', '用', '下', '而', '及', '与', '其', '或', '但', '如', '若', '则', '因', '所以', '如果', '虽然', '尽管', '无论', '不管', '除了', '除非', '直到', '当', '在...时候', '关于', '对于', '至于', '由于', '因为', '所以', '以便', '为了', '按照', '根据', '依据'
		]);

		return stopWords.has(token);
	}

	private getDocumentMetrics(file: TFile): DocumentMetrics {
		return SharedUtils.getDocumentMetrics(file, this.settings);
	}

	private calculatePriorityScore(metrics: DocumentMetrics): number {
		return SharedUtils.calculatePriority(metrics, this.settings.metricWeights, this.settings.customMetrics);
	}
}
