import { Setting, Notice } from 'obsidian';
import IncrementalReadingPlugin from '../main';

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
        this.containerEl.createEl('h3', { text: '数据管理' });

        // 清除漫游历史
        new Setting(this.containerEl)
            .setName('清除漫游历史')
            .setDesc('清除所有漫游历史记录和访问次数（此操作不可撤销，请谨慎操作）')
            .addButton(button => button
                .setButtonText('🗑️ 清除所有历史')
                .onClick(async () => {
                    // 确认对话框
                    if (confirm('确定要清除所有漫游历史吗？\n这将清空漫游列表并重置所有文档的访问次数。\n\n此操作不可撤销！')) {
                        this.plugin.settings.roamingDocs = [];
                        // 重置所有访问次数为0
                        for (const [path] of Object.entries(this.plugin.settings.documentMetrics)) {
                            this.plugin.settings.documentMetrics[path].visitCount = 0;
                            this.plugin.settings.documentMetrics[path].lastVisited = 0;
                        }
                        await this.plugin.saveSettings();
                        new Notice('✅ 所有漫游历史已清除');
                    }
                }));
    }
}