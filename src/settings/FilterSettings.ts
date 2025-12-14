import { Setting } from 'obsidian';
import IncrementalReadingPlugin from '../main';
import { i18n } from '../i18n';

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
        this.containerEl.createEl('h3', { text: i18n.t('settings.filter.title') });

        // 排除路径设置
        new Setting(this.containerEl)
            .setName(i18n.t('settings.filter.excludedPaths'))
            .setDesc(i18n.t('settings.filter.excludedPathsDesc'))
            .addTextArea(text => text
                .setPlaceholder(i18n.t('settings.filter.excludedPathsPlaceholder'))
                .setValue(this.plugin.settings.excludedPaths.join('\n'))
                .onChange(async (value) => {
                    this.plugin.settings.excludedPaths = value.split('\n').filter(p => p.trim());
                    await this.plugin.saveSettings();
                }));
    }
}
