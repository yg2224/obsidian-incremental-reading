import { Setting } from 'obsidian';
import IncrementalReadingPlugin from '../main';

/**
 * 文档过滤设置组件
 */
export class FilterSettings {
    private containerEl: HTMLElement;
    private plugin: IncrementalReadingPlugin;

    constructor(containerEl: HTMLElement, plugin: IncrementalReadingPlugin) {
        this.containerEl = containerEl;
        this.plugin = plugin;
    }

    public render(): void {
        this.containerEl.createEl('h3', { text: '过滤设置' });

        // 排除路径设置
        new Setting(this.containerEl)
            .setName('排除路径')
            .setDesc('要从漫游中排除的文件夹路径（每行一个，支持*通配符匹配）')
            .addTextArea(text => text
                .setPlaceholder('示例：\nTemplates/*\nArchive/**\n.obsidian/**\n**/*.excalidraw')
                .setValue(this.plugin.settings.excludedPaths.join('\n'))
                .onChange(async (value) => {
                    this.plugin.settings.excludedPaths = value.split('\n').filter(p => p.trim());
                    await this.plugin.saveSettings();
                }));
    }
}