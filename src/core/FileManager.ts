import { TFile, TFolder, App, Notice } from 'obsidian';
import { FileManagerSettings } from '../types/file';

/**
 * 文件管理核心 - 统一处理文件相关操作
 */
export class FileManager {
    private app: App;
    private settings: FileManagerSettings;

    constructor(app: App, settings: FileManagerSettings) {
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
     * 批量添加文件夹到漫游列表（带限制）
     */
    public async addFoldersToRoaming(folderPaths: string[]): Promise<{
        addedCount: number;
        skippedCount: number;
        errors: string[];
    }> {
        const result = {
            addedCount: 0,
            skippedCount: 0,
            errors: [] as string[]
        };

        const MAX_FILES = 1000;

        for (const folderPath of folderPaths) {
            try {
                const files = await this.getFilesInFolder(folderPath);

                for (const file of files) {
                    if (result.addedCount >= MAX_FILES) {
                        new Notice(`已达到最大文件数量限制 (${MAX_FILES})`);
                        result.errors.push(`达到文件数量限制`);
                        return result;
                    }

                    if (this.settings.roamingDocs.includes(file.path)) {
                        result.skippedCount++;
                        continue;
                    }

                    this.settings.roamingDocs.push(file.path);
                    result.addedCount++;
                }
            } catch (error) {
                const errorMsg = `添加文件夹 ${folderPath} 失败: ${error}`;
                result.errors.push(errorMsg);
                console.error(errorMsg);
            }
        }

        return result;
    }

    /**
     * 批量添加文件到漫游列表
     */
    public async addFilesToRoaming(files: TFile[]): Promise<{
        addedCount: number;
        skippedCount: number;
    }> {
        let addedCount = 0;
        let skippedCount = 0;

        for (const file of files) {
            if (this.settings.roamingDocs.includes(file.path)) {
                skippedCount++;
            } else {
                this.settings.roamingDocs.push(file.path);
                addedCount++;
            }
        }

        return { addedCount, skippedCount };
    }

    /**
     * 获取有效的漫游文档
     */
    public getValidRoamingFiles(): TFile[] {
        return this.settings.roamingDocs
            .map(path => this.app.vault.getAbstractFileByPath(path))
            .filter((file): file is TFile =>
                file instanceof TFile && file.extension === 'md'
            );
    }

    /**
     * 获取可漫游的文档（排除已在漫游中的）
     */
    public getAvailableFilesForRoaming(): TFile[] {
        const allFiles = this.app.vault.getMarkdownFiles();
        const validRoamingPaths = this.getValidRoamingFiles().map(file => file.path);

        return allFiles.filter(file =>
            !validRoamingPaths.includes(file.path) &&
            !this.settings.excludedPaths.some(pattern =>
                new RegExp(pattern.replace(/\*/g, '.*'), 'i').test(file.path)
            )
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
}