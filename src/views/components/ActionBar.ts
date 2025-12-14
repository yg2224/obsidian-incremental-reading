import { Notice } from 'obsidian';
import IncrementalReadingPlugin from '../../main';
import { FolderSelectionModal, MultiFileSelectionModal } from '../../components/Modal';
import { i18n } from '../../i18n';

/**
 * 操作栏组件 - 包含主要操作按钮
 */
export class ActionBar {
    private container: HTMLElement;
    private plugin: IncrementalReadingPlugin;
    private continueBtn: HTMLButtonElement | null = null;
    private addRoamingBtn: HTMLButtonElement | null = null;
    private removeRoamingBtn: HTMLButtonElement | null = null;

    // 回调函数
    private onContinueReading: () => void;
    private onGetSmartRecommendations: () => void;
    private onRefreshData: () => void;
    private onRandomRoaming: () => void;
    private onAddCurrentToRoaming: () => void;
    private onRemoveCurrentFromRoaming: () => void;

    constructor(
        container: HTMLElement,
        plugin: IncrementalReadingPlugin,
        callbacks: {
            onContinueReading: () => void;
            onGetSmartRecommendations: () => void;
            onRefreshData: () => void;
            onRandomRoaming: () => void;
            onAddCurrentToRoaming: () => void;
            onRemoveCurrentFromRoaming: () => void;
        }
    ) {
        this.container = container;
        this.plugin = plugin;
        this.onContinueReading = callbacks.onContinueReading;
        this.onGetSmartRecommendations = callbacks.onGetSmartRecommendations;
        this.onRefreshData = callbacks.onRefreshData;
        this.onRandomRoaming = callbacks.onRandomRoaming;
        this.onAddCurrentToRoaming = callbacks.onAddCurrentToRoaming;
        this.onRemoveCurrentFromRoaming = callbacks.onRemoveCurrentFromRoaming;

        this.create();
    }

    private create() {
        const actionBar = this.container.createEl('div', { cls: 'action-bar' });

        // Continue Reading button (primary)
        this.continueBtn = actionBar.createEl('button', { cls: 'btn primary' });
        this.continueBtn.textContent = i18n.t('view.actionBar.continue');
        this.continueBtn.onclick = () => this.onContinueReading();
        this.updateContinueButtonState();

        // Smart Recommendations button
        const recommendBtn = actionBar.createEl('button', { cls: 'btn' });
        recommendBtn.innerHTML = `<span>🧠</span><span>${i18n.t('view.actionBar.smartRecommend')}</span>`;
        recommendBtn.title = i18n.t('view.actionBar.smartTooltip');
        recommendBtn.onclick = () => this.onGetSmartRecommendations();

        // Refresh Data button
        const refreshDataBtn = actionBar.createEl('button', { cls: 'btn' });
        refreshDataBtn.innerHTML = `<span>🔄</span><span>${i18n.t('view.actionBar.refresh')}</span>`;
        refreshDataBtn.onclick = () => this.onRefreshData();

        // Random Roaming button
        const randomRoamBtn = actionBar.createEl('button', { cls: 'btn' });
        randomRoamBtn.innerHTML = `<span>🎲</span><span>${i18n.t('view.actionBar.random')}</span>`;
        randomRoamBtn.onclick = () => this.onRandomRoaming();

        // Add to Roaming button
        this.addRoamingBtn = actionBar.createEl('button', { cls: 'btn' });
        this.addRoamingBtn.innerHTML = `<span>➕</span><span>${i18n.t('view.actionBar.addCurrent')}</span>`;
        this.addRoamingBtn.onclick = () => this.onAddCurrentToRoaming();
        this.updateAddRoamingButtonState();

        // Remove from Roaming button
        this.removeRoamingBtn = actionBar.createEl('button', { cls: 'btn' });
        this.removeRoamingBtn.innerHTML = `<span>➖</span><span>${i18n.t('actions.removeFromRoaming')}</span>`;
        this.removeRoamingBtn.onclick = () => this.onRemoveCurrentFromRoaming();
        this.updateRemoveRoamingButtonState();

        // Add Folder button (primary style)
        const addFolderBtn = actionBar.createEl('button', { cls: 'btn primary' });
        addFolderBtn.innerHTML = `<span>📁</span><span>${i18n.t('view.actionBar.addFolder')}</span>`;
        addFolderBtn.onclick = () => this.addFolderToRoaming();

        // Multi-select Files button (primary style)
        const multiSelectBtn = actionBar.createEl('button', { cls: 'btn primary' });
        multiSelectBtn.innerHTML = `<span>📄</span><span>${i18n.t('view.actionBar.multiSelect')}</span>`;
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
        this.continueBtn.textContent = hasValidFiles ? i18n.t('view.actionBar.continue') : i18n.t('view.actionBar.noDocuments');
    }

    private updateAddRoamingButtonState() {
        if (!this.addRoamingBtn) return;

        const activeFile = this.plugin.app.workspace.getActiveFile();
        const isInRoaming = activeFile && this.plugin.settings.roamingDocs.includes(activeFile.path);

        // 如果在漫游列表中，隐藏"加入漫游"按钮
        if (isInRoaming) {
            this.addRoamingBtn.style.display = 'none';
        } else {
            this.addRoamingBtn.style.display = 'flex';
            this.addRoamingBtn.disabled = !activeFile;
            this.addRoamingBtn.innerHTML = activeFile
                ? `<span>➕</span><span>${i18n.t('view.actionBar.addCurrent')}</span>`
                : `<span>➕</span><span>${i18n.t('view.actionBar.noDocuments')}</span>`;
        }
    }

    private updateRemoveRoamingButtonState() {
        if (!this.removeRoamingBtn) return;

        const activeFile = this.plugin.app.workspace.getActiveFile();
        const isInRoaming = activeFile && this.plugin.settings.roamingDocs.includes(activeFile.path);

        // 如果在漫游列表中，显示"移除漫游"按钮
        if (isInRoaming) {
            this.removeRoamingBtn.style.display = 'flex';
            this.removeRoamingBtn.disabled = false;
            this.removeRoamingBtn.innerHTML = `<span>➖</span><span>${i18n.t('actions.removeFromRoaming')}</span>`;
        } else {
            this.removeRoamingBtn.style.display = 'none';
        }
    }

    /**
     * 更新按钮状态（当文件变化时调用）
     */
    public updateButtonStates() {
        this.updateContinueButtonState();
        this.updateAddRoamingButtonState();
        this.updateRemoveRoamingButtonState();
    }
}