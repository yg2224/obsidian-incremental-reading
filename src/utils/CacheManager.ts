import { TFile, App } from 'obsidian';

interface CacheEntry<T> {
	value: T;
	timestamp: number;
	expires: number;
}

interface FileContent {
	text: string;
	tokens: string[];
	lastModified: number;
}

interface DocumentVector {
	vector: Map<string, number>;
	magnitude: number;
}

/**
 * Cache manager for improving performance
 */
export class CacheManager {
	private cache = new Map<string, CacheEntry<any>>();
	private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
	private maxCacheSize = 1000;

	/**
	 * Get value from cache
	 */
	get<T>(key: string): T | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		if (Date.now() > entry.expires) {
			this.cache.delete(key);
			return null;
		}

		return entry.value;
	}

	/**
	 * Set value in cache with optional TTL
	 */
	set<T>(key: string, value: T, ttl: number = this.defaultTTL): void {
		// Evict oldest entries if cache is full
		if (this.cache.size >= this.maxCacheSize) {
			this.evictOldest();
		}

		this.cache.set(key, {
			value,
			timestamp: Date.now(),
			expires: Date.now() + ttl
		});
	}

	/**
	 * Delete cache entry
	 */
	delete(key: string): boolean {
		return this.cache.delete(key);
	}

	/**
	 * Clear all cache entries
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Evict expired entries
	 */
	evictExpired(): void {
		const now = Date.now();
		for (const [key, entry] of this.cache.entries()) {
			if (now > entry.expires) {
				this.cache.delete(key);
			}
		}
	}

	/**
	 * Evict oldest entries
	 */
	private evictOldest(): void {
		const entries = Array.from(this.cache.entries());
		entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

		const toDelete = entries.slice(0, Math.floor(this.maxCacheSize * 0.1)); // Delete 10%
		toDelete.forEach(([key]) => this.cache.delete(key));
	}

	/**
	 * Get cache statistics
	 */
	getStats(): { size: number; expired: number } {
		const now = Date.now();
		let expired = 0;

		for (const entry of this.cache.values()) {
			if (now > entry.expires) {
				expired++;
			}
		}

		return {
			size: this.cache.size,
			expired
		};
	}
}

/**
 * File content cache with tokenization
 */
export class FileContentCache {
	private cache = new CacheManager();
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Get file content with caching
	 */
	async getFileContent(file: TFile, maxLength: number = 50000): Promise<FileContent> {
		const cacheKey = `content:${file.path}:${file.stat.mtime}`;
		const cached = this.cache.get<FileContent>(cacheKey);

		if (cached) {
			return cached;
		}

		try {
			const text = await this.app.vault.read(file);
			const truncatedText = text.length > maxLength ? text.substr(0, maxLength) : text;
			const tokens = this.tokenize(truncatedText);

			const content: FileContent = {
				text: truncatedText,
				tokens,
				lastModified: file.stat.mtime
			};

			this.cache.set(cacheKey, content, 10 * 60 * 1000); // 10 minutes cache
			return content;
		} catch (error) {
			console.error('Error reading file:', file.path, error);
			return {
				text: '',
				tokens: [],
				lastModified: 0
			};
		}
	}

	/**
	 * Simple tokenization for caching
	 */
	private tokenize(text: string): string[] {
		return text
			.toLowerCase()
			.replace(/[^\w\s\u4e00-\u9fff]/g, ' ') // Keep word characters, spaces, and Chinese
			.split(/\s+/)
			.filter(token => token.length > 2); // Filter out very short tokens
	}

	/**
	 * Clear cache for specific file
	 */
	clearFileCache(file: TFile): void {
		// Find and delete all cache entries for this file
		const stats = this.cache.getStats();
		// For simplicity, just clear all cache when clearing a specific file
		// In a more optimized implementation, we could track keys per file
		this.cache.clear();
	}

	/**
	 * Get cache statistics
	 */
	getStats(): { size: number; expired: number } {
		return this.cache.getStats();
	}
}

/**
 * Vector cache for TF-IDF calculations
 */
export class VectorCache {
	private cache = new CacheManager();

	/**
	 * Get cached vector
	 */
	getVector(key: string): DocumentVector | null {
		return this.cache.get<DocumentVector>(key);
	}

	/**
	 * Cache a vector
	 */
	setVector(key: string, vector: Map<string, number>): void {
		// Calculate magnitude for faster similarity calculations
		const magnitude = Math.sqrt(
			Array.from(vector.values()).reduce((sum, val) => sum + val * val, 0)
		);

		const documentVector: DocumentVector = {
			vector: new Map(vector), // Create copy
			magnitude
		};

		this.cache.set(key, documentVector, 15 * 60 * 1000); // 15 minutes cache
	}

	/**
	 * Calculate cosine similarity using cached magnitudes
	 */
	cosineSimilarity(vectorA: DocumentVector, vectorB: DocumentVector): number {
		if (vectorA.magnitude === 0 || vectorB.magnitude === 0) return 0;

		let dotProduct = 0;
		const smallerVector = vectorA.vector.size < vectorB.vector.size ? vectorA.vector : vectorB.vector;
		const largerVector = vectorA.vector.size >= vectorB.vector.size ? vectorA.vector : vectorB.vector;

		for (const [term, valueA] of smallerVector) {
			const valueB = largerVector.get(term) || 0;
			dotProduct += valueA * valueB;
		}

		return dotProduct / (vectorA.magnitude * vectorB.magnitude);
	}

	/**
	 * Clear all cached vectors
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Get cache statistics
	 */
	getStats(): { size: number; expired: number } {
		return this.cache.getStats();
	}
}