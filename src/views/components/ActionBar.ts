import { setIcon } from 'obsidian';
import IncrementalReadingPlugin from '../../main';
import { FolderSelectionModal, MultiFileSelectionModal } from '../../components/Modal';
import { i18n } from '../../i18n';

interface ActionButton {
    icon: string;
    tooltip: string;
    primary?: boolean;
    onClick: () => void;
    getDisabled?: () => boolean;
    getHidden?: () => boolean;
    getTooltip?: () => string;
}

/**
 * 操作栏组件 - 包含主要操作按钮
 */
export class ActionBar {
    private container: HTMLElement;
    private plugin: IncrementalReadingPlugin;
    private buttonElements: Map<string, HTMLButtonElement> = new Map();
    private buttonConfigs: Map<string, ActionButton> = new Map();
    private statusEl: HTMLElement | null = null;

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
        const actionBar = this.container.createEl('div', { cls: 'action-bar compact' });

        const primaryGroup = actionBar.createEl('div', { cls: 'action-group primary' });
        this.createIconButton(primaryGroup, 'continue', {
            icon: 'play',
            tooltip: i18n.t('view.actionBar.continue'),
            primary: true,
            onClick: () => this.onContinueReading(),
            getDisabled: () => this.plugin.getValidRoamingFiles().length === 0,
            getTooltip: () => {
                const hasDocs = this.plugin.getValidRoamingFiles().length > 0;
                return hasDocs ? i18n.t('view.actionBar.continue') : i18n.t('view.actionBar.noDocuments');
            }
        });

        this.createIconButton(primaryGroup, 'recommend', {
            icon: 'lightbulb',
            tooltip: i18n.t('view.actionBar.smartTooltip'),
            onClick: () => this.onGetSmartRecommendations()
        });

        this.createIconButton(primaryGroup, 'random', {
            icon: 'dice',
            tooltip: i18n.t('view.actionBar.random'),
            onClick: () => this.onRandomRoaming()
        });

        const statusGroup = actionBar.createEl('div', { cls: 'action-group status' });
        this.statusEl = statusGroup.createEl('span', { cls: 'status-indicator' });
        this.updateStatus();

        const managementGroup = actionBar.createEl('div', { cls: 'action-group management' });

        this.createIconButton(managementGroup, 'addCurrent', {
            icon: 'plus',
            tooltip: i18n.t('view.actionBar.addCurrent'),
            onClick: () => this.onAddCurrentToRoaming(),
            getDisabled: () => !this.plugin.app.workspace.getActiveFile(),
            getHidden: () => {
                const activeFile = this.plugin.app.workspace.getActiveFile();
                return activeFile ? this.plugin.settings.roamingDocs.includes(activeFile.path) : false;
            },
            getTooltip: () => {
                const activeFile = this.plugin.app.workspace.getActiveFile();
                return activeFile ? i18n.t('view.actionBar.addCurrent') : i18n.t('view.actionBar.noDocuments');
            }
        });

        this.createIconButton(managementGroup, 'removeCurrent', {
            icon: 'minus',
            tooltip: i18n.t('actions.removeFromRoaming'),
            onClick: () => this.onRemoveCurrentFromRoaming(),
            getHidden: () => {
                const activeFile = this.plugin.app.workspace.getActiveFile();
                return !activeFile || !this.plugin.settings.roamingDocs.includes(activeFile.path);
            }
        });

        this.createIconButton(managementGroup, 'addFolder', {
            icon: 'folder-plus',
            tooltip: i18n.t('view.actionBar.addFolder'),
            onClick: () => this.addFolderToRoaming()
        });

        this.createIconButton(managementGroup, 'multiSelect', {
            icon: 'files',
            tooltip: i18n.t('view.actionBar.multiSelect'),
            onClick: () => this.multiSelectFilesToRoaming()
        });

        this.createIconButton(managementGroup, 'refresh', {
            icon: 'refresh-cw',
            tooltip: i18n.t('view.actionBar.refresh'),
            onClick: () => this.onRefreshData()
        });

        this.updateButtonStates();
    }

    private createIconButton(
        container: HTMLElement,
        id: string,
        config: ActionButton
    ): HTMLButtonElement {
        const tooltip = config.getTooltip ? config.getTooltip() : config.tooltip;
        const btn = container.createEl('button', {
            cls: `icon-btn${config.primary ? ' primary' : ''}`,
            attr: {
                'aria-label': tooltip,
                'data-tooltip': tooltip,
                'type': 'button'
            }
        });

        setIcon(btn, config.icon);
        btn.onclick = config.onClick;

        this.buttonElements.set(id, btn);
        this.buttonConfigs.set(id, config);

        return btn;
    }

    private updateStatus(): void {
        if (!this.statusEl) return;

        const count = this.plugin.settings.roamingDocs.length;
        this.statusEl.textContent = `${count}`;
        this.statusEl.setAttribute('aria-label', i18n.t('view.statusTemplate', { count: count.toString() }));
        this.statusEl.setAttribute('data-tooltip', i18n.t('view.statusTemplate', { count: count.toString() }));
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

    /**
     * 更新按钮状态（当文件变化时调用）
     */
    public updateButtonStates() {
        this.buttonElements.forEach((btn, id) => {
            const config = this.buttonConfigs.get(id);
            if (!config) return;

            if (config.getDisabled) {
                btn.disabled = config.getDisabled();
            }

            if (config.getHidden) {
                btn.style.display = config.getHidden() ? 'none' : 'flex';
            }

            if (config.getTooltip) {
                const tooltip = config.getTooltip();
                btn.setAttribute('aria-label', tooltip);
                btn.setAttribute('data-tooltip', tooltip);
            }
        });
        this.updateStatus();
    }
}
