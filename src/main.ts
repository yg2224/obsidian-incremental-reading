import { App, Plugin, PluginSettingTab, Setting, TFile, Notice, WorkspaceLeaf } from 'obsidian';
import { IncrementalReadingView, VIEW_TYPE_INCREMENTAL_READING } from './views/IncrementalReadingView';
import { RecommendationService } from './services/RecommendationService';
import { DocumentMetrics, IncrementalReadingSettings, DEFAULT_SETTINGS } from './models/Settings';
import { SharedUtils } from './utils/SharedUtils';

// 导入服务
import { FileManagementService } from './services/FileManagementService';
import { DocumentScoringService } from './services/DocumentScoringService';

// 导入设置组件
import { CustomMetricsSettings } from './settings/CustomMetricsSettings';
import { RecommendationSettings } from './settings/RecommendationSettings';
import { FilterSettings } from './settings/FilterSettings';
import { DataManagementSettings } from './settings/DataManagementSettings';

// 导入国际化
import { i18n } from './i18n';

export default class IncrementalReadingPlugin extends Plugin {
    settings: IncrementalReadingSettings;
    recommendationService: RecommendationService;
    fileManagementService: FileManagementService;
    documentScoringService: DocumentScoringService;
    leaf: WorkspaceLeaf | null = null;
    private isUpdatingSettings = false;

    async onload(): Promise<void> {
        console.log('Loading Incremental Reading plugin');

        // 加载设置
        await this.loadSettings();

        // 初始化语言
        i18n.setLanguage(this.settings.language || 'en');

        // 初始化服务
        this.recommendationService = new RecommendationService(this.app, this.settings);
        this.fileManagementService = new FileManagementService(this.app, this.settings);
        this.documentScoringService = new DocumentScoringService(this.settings);

        // 注册视图
        this.registerView(
            VIEW_TYPE_INCREMENTAL_READING,
            (leaf) => new IncrementalReadingView(leaf, this)
        );

        // 添加图标
        this.addRibbonIcon('book-open', 'Incremental Reading', () => {
            this.activateView();
        });

        // 添加命令
        this.addCommands();

        // 添加设置标签页
        this.addSettingTab(new IncrementalReadingSettingTab(this.app, this));
    }

    onunload(): void {
        console.log('Unloading Incremental Reading plugin');
    }

    async loadSettings(): Promise<void> {
        try {
            const savedSettings = await this.loadData();
            const validatedSettings = SharedUtils.validateSettings(savedSettings);
            this.settings = Object.assign({}, DEFAULT_SETTINGS, validatedSettings);

            
            // 检查是否首次运行新版本
            if (!this.settings.version || this.settings.version !== DEFAULT_SETTINGS.version) {
                // 升级版本时，重置漫游列表为空，让用户重新手动添加
                this.settings.roamingDocs = [];
                this.settings.version = DEFAULT_SETTINGS.version;
                await this.saveData(this.settings);

                // 显示升级提示
                new Notice('Plugin upgraded! Please re-add documents to roaming list using "Add to Roaming"');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            new Notice(i18n.t('notices.errorLoadingSettings'));
            this.settings = { ...DEFAULT_SETTINGS };
        }
    }

    async saveSettings(): Promise<void> {
        if (this.isUpdatingSettings) {
            console.warn('Settings update already in progress, skipping');
            return;
        }

        this.isUpdatingSettings = true;
        try {
            // 验证设置
            const validatedSettings = SharedUtils.validateSettings(this.settings);
            Object.assign(this.settings, validatedSettings);

            await this.saveData(this.settings);
            // 重新初始化服务
            this.recommendationService = new RecommendationService(this.app, this.settings);
            this.fileManagementService = new FileManagementService(this.app, this.settings);
            this.documentScoringService = new DocumentScoringService(this.settings);

            // 通知所有视图刷新
            this.notifyViewsRefresh();
        } catch (error) {
            console.error('Error saving settings:', error);
            new Notice(i18n.t('notices.errorSavingSettings'));
        } finally {
            this.isUpdatingSettings = false;
        }
    }

    /**
     * 通知所有增量阅读视图刷新UI（用于语言切换）
     */
    notifyViewsRefreshUI(): void {
        try {
            // 获取所有打开的增量阅读视图
            const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_INCREMENTAL_READING);

            leaves.forEach(leaf => {
                const view = leaf.view as any;
                if (view && typeof view.refreshUI === 'function') {
                    view.refreshUI();
                    console.log('已通知增量阅读视图刷新UI');
                }
            });
        } catch (error) {
            console.error('通知视图刷新UI时出错:', error);
        }
    }

    /**
     * 通知所有增量阅读视图刷新数据
     */
    notifyViewsRefresh(): void {
        try {
            // 获取所有打开的增量阅读视图
            const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_INCREMENTAL_READING);

            leaves.forEach(leaf => {
                const view = leaf.view as any;
                if (view && typeof view.refreshData === 'function') {
                    view.refreshData();
                    console.log('已通知增量阅读视图刷新数据');
                }
            });
        } catch (error) {
            console.error('通知视图刷新时出错:', error);
        }
    }

    async activateView(): Promise<void> {
        const { workspace } = this.app;

        if (this.leaf) {
            workspace.revealLeaf(this.leaf);
        } else {
            this.leaf = workspace.getRightLeaf(false);
            await this.leaf?.setViewState({ type: VIEW_TYPE_INCREMENTAL_READING, active: true });
        }

        workspace.revealLeaf(this.leaf!);
    }

    private addCommands(): void {
        this.addCommand({
            id: 'start-incremental-reading',
            name: i18n.t('commands.startReading'),
            callback: () => {
                this.activateView();
            }
        });

        this.addCommand({
            id: 'open-random-document',
            name: i18n.t('commands.openRandom'),
            callback: () => {
                this.openRandomDocument();
            }
        });

        this.addCommand({
            id: 'add-to-roaming',
            name: i18n.t('commands.addToRoaming'),
            callback: async () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    new Notice(i18n.t('notices.noActiveFile'));
                    return;
                }

                try {
                    if (activeFile.extension !== 'md') {
                        new Notice(i18n.t('notices.onlyMarkdownFiles'));
                        return;
                    }

                    if (!this.settings.roamingDocs.includes(activeFile.path)) {
                        this.settings.roamingDocs.push(activeFile.path);
                    }

                    const defaultMetrics = this.fileManagementService.createDefaultMetricsForFile(activeFile);
                    await this.updateDocumentMetrics(activeFile, defaultMetrics);

                    await this.saveSettings();
                    new Notice(i18n.t('notices.addedToRoaming', { filename: activeFile.basename }));
                } catch (error) {
                    console.error('加入漫游失败:', error);
                    new Notice(i18n.t('notices.errorSavingSettings'));
                }
            }
        });

        this.addCommand({
            id: 'add-folder-to-roaming',
            name: i18n.t('commands.addFolder'),
            callback: async () => {
                // 这里可以添加文件夹选择对话框
                new Notice(i18n.t('view.actionBar.addFolder'));
            }
        });

        this.addCommand({
            id: 'add-multiple-files-to-roaming',
            name: i18n.t('commands.addMultiple'),
            callback: async () => {
                // 这里可以添加多选文件对话框
                new Notice(i18n.t('view.actionBar.multiSelect'));
            }
        });

        this.addCommand({
            id: 'reset-visited-documents',
            name: i18n.t('commands.clearHistory'),
            callback: async () => {
                this.settings.roamingDocs = [];
                for (const [path] of Object.entries(this.settings.documentMetrics)) {
                    this.settings.documentMetrics[path].visitCount = 0;
                    this.settings.documentMetrics[path].lastVisited = 0;
                }
                await this.saveSettings();
                new Notice(i18n.t('notices.historyCleared'));
            }
        });
    }

    private async openRandomDocument(): Promise<void> {
        try {
            const randomFile = this.fileManagementService.getRandomUnvisitedFile();

            if (!randomFile) {
                new Notice(i18n.t('view.actionBar.noDocuments'));
                return;
            }

            await this.app.workspace.getLeaf().openFile(randomFile);
        } catch (error) {
            console.error('Error opening random document:', error);
            new Notice(i18n.t('notices.documentOpenFailed'));
        }
    }

    // 公共方法供视图组件使用
    getDocumentMetrics(file: TFile): DocumentMetrics {
        return this.documentScoringService.getDocumentMetrics(file);
    }

    async updateDocumentMetrics(file: TFile, metrics: Partial<DocumentMetrics>): Promise<void> {
        try {
            const validatedMetrics = this.documentScoringService.validateMetrics(metrics);
            const updatedMetrics = this.documentScoringService.updateDocumentMetrics(file, validatedMetrics);

            this.settings.documentMetrics[file.path] = updatedMetrics;
            await this.saveSettings();
        } catch (error) {
            console.error('Error updating document metrics:', error);
            new Notice(i18n.t('notices.errorSavingSettings'));
        }
    }

    getRecommendedDocuments(limit: number = 10): TFile[] {
        try {
            const validRoamingPaths = this.fileManagementService.getValidRoamingPaths();
            const validRoamingFiles = this.fileManagementService.getValidRoamingFiles();

            // 只包含有效的漫游文档
            const filteredFiles = validRoamingFiles.filter(file =>
                this.fileManagementService.shouldIncludeFile(file)
            );

            return this.documentScoringService.getRecommendedDocuments(filteredFiles, limit);
        } catch (error) {
            console.error('Error getting recommended documents:', error);
            return [];
        }
    }

    // 公开服务实例
    get FileManagementService() {
        return this.fileManagementService;
    }

    get DocumentScoringService() {
        return this.documentScoringService;
    }

    // 向后兼容的方法
    getValidRoamingFiles(): TFile[] {
        return this.fileManagementService.getValidRoamingFiles();
    }

    getValidRoamingPaths(): string[] {
        return this.fileManagementService.getValidRoamingPaths();
    }

    async addFoldersToRoaming(folderPaths: string[]): Promise<void> {
        try {
            const addedCount = await this.fileManagementService.addFoldersToRoaming(folderPaths);
            await this.saveSettings();
            new Notice(i18n.t('notices.filesAdded', { count: addedCount }));
        } catch (error) {
            console.error('添加文件夹失败:', error);
            new Notice(i18n.t('notices.errorSavingSettings'));
        }
    }

    async addMultipleFilesToRoaming(files: TFile[]): Promise<void> {
        try {
            const addedCount = await this.fileManagementService.addMultipleFilesToRoaming(files);
            await this.saveSettings();
            new Notice(i18n.t('notices.filesAdded', { count: addedCount }));
        } catch (error) {
            console.error('添加文件失败:', error);
            new Notice(i18n.t('notices.errorSavingSettings'));
        }
    }
}

class IncrementalReadingSettingTab extends PluginSettingTab {
    plugin: IncrementalReadingPlugin;

    constructor(app: App, plugin: IncrementalReadingPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    async display(): Promise<void> {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('setting-tab-content');
        containerEl.addClass('incremental-reading-settings');
        containerEl.addClass('incremental-reading-plugin-root'); // Add root scope class

        containerEl.createEl('h2', { text: i18n.t('settings.title') });

        // 通用设置
        containerEl.createEl('h3', { text: i18n.t('settings.general.title') });

        // 语言设置
        new Setting(containerEl)
            .setName(i18n.t('settings.general.language'))
            .setDesc(i18n.t('settings.general.languageDesc'))
            .addDropdown(dropdown => {
                const languages = i18n.getAvailableLanguages();
                languages.forEach(lang => {
                    dropdown.addOption(lang.code, lang.name);
                });
                dropdown
                    .setValue(this.plugin.settings.language || 'en')
                    .onChange(async (value) => {
                        this.plugin.settings.language = value;
                        i18n.setLanguage(value);
                        await this.plugin.saveSettings();
                        // 刷新设置页面以应用新语言
                        this.display();
                        // 通知视图刷新UI（完全重建）
                        this.plugin.notifyViewsRefreshUI();
                        new Notice(i18n.t('notices.settingsSaved'));
                    });
            });

        // 自定义指标设置
        const customMetricsSettings = new CustomMetricsSettings(containerEl, this.plugin);
        customMetricsSettings.render();

        // 智能推荐设置
        const recommendationSettings = new RecommendationSettings(containerEl, this.plugin);
        recommendationSettings.render();

        // 文档过滤设置
        const filterSettings = new FilterSettings(containerEl, this.plugin);
        filterSettings.render();

        // 数据管理
        const dataManagementSettings = new DataManagementSettings(containerEl, this.plugin);
        dataManagementSettings.render();
    }
}