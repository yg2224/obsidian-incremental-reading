import { Notice } from 'obsidian';
import IncrementalReadingPlugin from '../../main';
import { FolderSelectionModal, MultiFileSelectionModal } from '../../components/Modal';

/**
 * 操作栏组件 - 包含主要操作按钮
 */
export class ActionBar {
    private container: HTMLElement;
    private plugin: IncrementalReadingPlugin;
    private continueBtn: HTMLButtonElement | null = null;
    private addRoamingBtn: HTMLButtonElement | null = null;

    // 回调函数
    private onContinueReading: () => void;
    private onGetSmartRecommendations: () => void;
    private onRefreshData: () => void;
    private onRandomRoaming: () => void;
    private onAddCurrentToRoaming: () => void;

    constructor(
        container: HTMLElement,
        plugin: IncrementalReadingPlugin,
        callbacks: {
            onContinueReading: () => void;
            onGetSmartRecommendations: () => void;
            onRefreshData: () => void;
            onRandomRoaming: () => void;
            onAddCurrentToRoaming: () => void;
        }
    ) {
        this.container = container;
        this.plugin = plugin;
        this.onContinueReading = callbacks.onContinueReading;
        this.onGetSmartRecommendations = callbacks.onGetSmartRecommendations;
        this.onRefreshData = callbacks.onRefreshData;
        this.onRandomRoaming = callbacks.onRandomRoaming;
        this.onAddCurrentToRoaming = callbacks.onAddCurrentToRoaming;

        this.create();
    }

    private create() {
        const actionBar = this.container.createEl('div', { cls: 'action-bar' });

        // Continue Reading button
        this.continueBtn = actionBar.createEl('button', {
            cls: 'btn primary',
            text: '继续漫游'
        });
        this.continueBtn.onclick = () => this.onContinueReading();
        this.updateContinueButtonState();

        // Smart Recommendations button
        const recommendBtn = actionBar.createEl('button', {
            cls: 'btn',
            text: '🧠 智能推荐'
        });
        recommendBtn.title = '跳转到相似度最高的文档';
        recommendBtn.onclick = () => this.onGetSmartRecommendations();

        // Status Update button
        const refreshDataBtn = actionBar.createEl('button', {
            cls: 'btn',
            text: '状态更新'
        });
        refreshDataBtn.onclick = () => this.onRefreshData();

        // Random Roaming button
        const randomRoamBtn = actionBar.createEl('button', {
            cls: 'btn',
            text: '随机漫游'
        });
        randomRoamBtn.onclick = () => this.onRandomRoaming();

        // Add to Roaming button
        this.addRoamingBtn = actionBar.createEl('button', {
            cls: 'btn',
            text: '加入漫游'
        });
        this.addRoamingBtn.onclick = () => this.onAddCurrentToRoaming();
        this.updateAddRoamingButtonState();

        // Add Folder button
        const addFolderBtn = actionBar.createEl('button', {
            cls: 'btn',
            text: '添加文件夹'
        });
        addFolderBtn.onclick = () => this.addFolderToRoaming();

        // Multi-select Files button
        const multiSelectBtn = actionBar.createEl('button', {
            cls: 'btn',
            text: '多选文件'
        });
        multiSelectBtn.onclick = () => this.multiSelectFilesToRoaming();
    }

    private addFolderToRoaming() {
        const folderModal = new FolderSelectionModal(this.plugin.app, async (folderPaths) => {
            await this.plugin.addFoldersToRoaming(folderPaths);
            this.onRefreshData(); // 刷新界面
        });
        folderModal.open();
    }

    private multiSelectFilesToRoaming() {
        const fileModal = new MultiFileSelectionModal(this.plugin.app, async (files) => {
            await this.plugin.addMultipleFilesToRoaming(files);
            this.onRefreshData(); // 刷新界面
        });
        fileModal.open();
    }

    private updateContinueButtonState() {
        if (!this.continueBtn) return;

        const validRoamingFiles = this.plugin.getValidRoamingFiles();
        const hasValidFiles = validRoamingFiles.length > 0;

        this.continueBtn.disabled = !hasValidFiles;
        this.continueBtn.textContent = hasValidFiles ? '继续漫游' : '暂无漫游文档';
    }

    private updateAddRoamingButtonState() {
        if (!this.addRoamingBtn) return;

        const activeFile = this.plugin.app.workspace.getActiveFile();
        const isInRoaming = activeFile && this.plugin.settings.roamingDocs.includes(activeFile.path);

        this.addRoamingBtn.disabled = isInRoaming;
        this.addRoamingBtn.textContent = isInRoaming ? '已在漫游中' : '加入漫游';
    }

    /**
     * 更新按钮状态（当文件变化时调用）
     */
    public updateButtonStates() {
        this.updateContinueButtonState();
        this.updateAddRoamingButtonState();
    }
}