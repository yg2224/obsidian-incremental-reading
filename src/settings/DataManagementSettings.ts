import { Setting, Notice } from 'obsidian';
import IncrementalReadingPlugin from '../main';
import { i18n } from '../i18n';

/**
 * 数据管理设置组件
 */
export class DataManagementSettings {
    private containerEl: HTMLElement;
    private plugin: IncrementalReadingPlugin;

    constructor(containerEl: HTMLElement, plugin: IncrementalReadingPlugin) {
        this.containerEl = containerEl;
        this.plugin = plugin;
    }

    public render(): void {
        this.containerEl.createEl('h3', { text: i18n.t('settings.dataManagement.title') });

        // 清除漫游历史
        new Setting(this.containerEl)
            .setName(i18n.t('settings.dataManagement.clearHistory'))
            .setDesc(i18n.t('settings.dataManagement.clearHistoryDesc'))
            .addButton(button => button
                .setButtonText(i18n.t('settings.dataManagement.clearButton'))
                .onClick(async () => {
                    // 确认对话框
                    if (confirm(i18n.t('settings.dataManagement.clearConfirm'))) {
                        this.plugin.settings.roamingDocs = [];
                        // 重置所有访问次数为0
                        for (const [path] of Object.entries(this.plugin.settings.documentMetrics)) {
                            this.plugin.settings.documentMetrics[path].visitCount = 0;
                            this.plugin.settings.documentMetrics[path].lastVisited = 0;
                        }
                        await this.plugin.saveSettings();
                        new Notice(i18n.t('notices.historyCleared'));
                    }
                }));
    }
}
