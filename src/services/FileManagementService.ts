import { App, TFile, TFolder, Notice } from 'obsidian';
import { DocumentMetrics, IncrementalReadingSettings } from '../models/Settings';
import { SharedUtils } from '../utils/SharedUtils';

/**
 * 文件管理服务 - 处理文件添加、文件夹递归等操作
 */
export class FileManagementService {
    private app: App;
    private settings: IncrementalReadingSettings;

    constructor(app: App, settings: IncrementalReadingSettings) {
        this.app = app;
        this.settings = settings;
    }

    /**
     * 递归获取文件夹中的所有Markdown文件
     */
    public async getFilesInFolder(folderPath: string): Promise<TFile[]> {
        const files: TFile[] = [];
        const folder = this.app.vault.getAbstractFileByPath(folderPath);

        if (!folder || !(folder instanceof TFolder)) {
            return files;
        }

        // 递归遍历文件夹
        const allFiles = this.app.vault.getAllLoadedFiles();
        for (const file of allFiles) {
            if (file instanceof TFile &&
                file.extension === 'md' &&
                (file.path.startsWith(folder.path + '/') || file.path === folder.path)) {
                files.push(file);
            }
        }

        return files;
    }

    /**
     * 批量添加文件夹到漫游列表
     */
    public async addFoldersToRoaming(folderPaths: string[]): Promise<number> {
        let addedCount = 0;
        const MAX_FILES = 1000; // 限制最大文件数量以避免性能问题

        for (const folderPath of folderPaths) {
            try {
                const files = await this.getFilesInFolder(folderPath);

                for (const file of files) {
                    if (addedCount >= MAX_FILES) {
                        new Notice(`已达到最大文件数量限制 (${MAX_FILES})，停止添加更多文件`);
                        break;
                    }

                    if (!this.settings.roamingDocs.includes(file.path)) {
                        this.settings.roamingDocs.push(file.path);

                        // 为文件创建默认指标（如果不存在）
                        if (!this.settings.documentMetrics[file.path]) {
                            this.settings.documentMetrics[file.path] = this.createDefaultMetricsForFile(file) as DocumentMetrics;
                        }

                        addedCount++;
                    }
                }
            } catch (error) {
                console.error(`添加文件夹 ${folderPath} 失败:`, error);
                new Notice(`添加文件夹 ${folderPath} 失败`);
            }
        }

        return addedCount;
    }

    /**
     * 批量添加文件到漫游列表
     */
    public async addMultipleFilesToRoaming(files: TFile[]): Promise<number> {
        let addedCount = 0;

        for (const file of files) {
            if (!this.settings.roamingDocs.includes(file.path)) {
                this.settings.roamingDocs.push(file.path);

                // 为文件创建默认指标（如果不存在）
                if (!this.settings.documentMetrics[file.path]) {
                    this.settings.documentMetrics[file.path] = this.createDefaultMetricsForFile(file) as DocumentMetrics;
                }

                addedCount++;
            }
        }

        return addedCount;
    }

    /**
     * 获取有效的漫游文档列表
     */
    public getValidRoamingFiles(): TFile[] {
        return this.settings.roamingDocs
            .map(path => this.app.vault.getAbstractFileByPath(path))
            .filter((file): file is TFile => {
                // 验证文件存在且是Markdown文件
                return file instanceof TFile && file.extension === 'md';
            });
    }

    /**
     * 获取有效的漫游文档路径列表
     */
    public getValidRoamingPaths(): string[] {
        return this.getValidRoamingFiles().map(file => file.path);
    }

    /**
     * 检查文件是否应该被包含
     */
    public shouldIncludeFile(file: TFile): boolean {
        return SharedUtils.shouldIncludeFile(file, this.settings.excludedPaths);
    }

    /**
     * 获取所有Markdown文件（排除漫游文档）
     */
    public getAvailableFilesForRoaming(): TFile[] {
        const allFiles = this.app.vault.getMarkdownFiles();
        const validRoamingPaths = this.getValidRoamingPaths();

        return allFiles.filter(file =>
            this.shouldIncludeFile(file) &&
            !validRoamingPaths.includes(file.path)
        );
    }

    /**
     * 随机选择一个未访问的文档
     */
    public getRandomUnvisitedFile(): TFile | null {
        const availableFiles = this.getAvailableFilesForRoaming();

        if (availableFiles.length === 0) {
            return null;
        }

        const randomIndex = Math.floor(Math.random() * availableFiles.length);
        return availableFiles[randomIndex];
    }

    /**
     * 创建文档的默认指标
     */
    public createDefaultMetricsForFile(file: TFile): Partial<DocumentMetrics> {
        const defaultMetrics: Partial<DocumentMetrics> = {
            lastVisited: Date.now(),
            visitCount: 0
        };

        // 为每个自定义指标添加默认值
        for (const metric of this.settings.customMetrics) {
            defaultMetrics[metric.id] = 5.0;
        }

        return defaultMetrics;
    }
}