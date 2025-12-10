import { Setting } from 'obsidian';
import IncrementalReadingPlugin from '../main';

/**
 * 智能推荐设置组件
 */
export class RecommendationSettings {
    private containerEl: HTMLElement;
    private plugin: IncrementalReadingPlugin;

    constructor(containerEl: HTMLElement, plugin: IncrementalReadingPlugin) {
        this.containerEl = containerEl;
        this.plugin = plugin;
    }

    public render(): void {
        this.containerEl.createEl('h3', { text: '推荐设置' });

        // 最近浏览锚点数量
        new Setting(this.containerEl)
            .setName('最近浏览锚点数量')
            .setDesc('智能推荐时使用的最近浏览文档数量（作为推荐基准）')
            .addSlider(slider => slider
                .setLimits(1, 20, 1)
                .setValue(this.plugin.settings.recommendationSettings.recentCount)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.recommendationSettings.recentCount = Math.floor(value);
                    await this.plugin.saveSettings();
                }));

        // 高频访问锚点数量
        new Setting(this.containerEl)
            .setName('高频访问锚点数量')
            .setDesc('智能推荐时使用的漫游次数最多的文档数量（作为推荐基准）')
            .addSlider(slider => slider
                .setLimits(1, 20, 1)
                .setValue(this.plugin.settings.recommendationSettings.topCount)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.recommendationSettings.topCount = Math.floor(value);
                    await this.plugin.saveSettings();
                }));

        // 推荐结果数量
        new Setting(this.containerEl)
            .setName('推荐结果数量')
            .setDesc('智能推荐算法返回的推荐文档数量')
            .addSlider(slider => slider
                .setLimits(5, 50, 1)
                .setValue(this.plugin.settings.recommendationSettings.topK)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.recommendationSettings.topK = Math.floor(value);
                    await this.plugin.saveSettings();
                }));

        // 最大候选文档数
        new Setting(this.containerEl)
            .setName('最大候选文档数')
            .setDesc('智能推荐算法考虑的最大文档数量（影响性能和推荐质量）')
            .addSlider(slider => slider
                .setLimits(50, 500, 10)
                .setValue(this.plugin.settings.maxCandidates)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.maxCandidates = Math.floor(value);
                    await this.plugin.saveSettings();
                }));

        // 文档段落采样数量
        new Setting(this.containerEl)
            .setName('文档段落采样数量')
            .setDesc('智能推荐时从每个文档采样的段落数量（包含标题+头/中/尾段落）')
            .addSlider(slider => slider
                .setLimits(3, 10, 1)
                .setValue(this.plugin.settings.recommendationSettings.maxParagraphs)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.recommendationSettings.maxParagraphs = Math.floor(value);
                    await this.plugin.saveSettings();
                }));
    }
}