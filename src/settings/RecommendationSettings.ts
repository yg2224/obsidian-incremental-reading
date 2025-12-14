import { Setting } from 'obsidian';
import IncrementalReadingPlugin from '../main';
import { i18n } from '../i18n';

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
        this.containerEl.createEl('h3', { text: i18n.t('settings.recommendation.title') });

        // 最近浏览锚点数量
        new Setting(this.containerEl)
            .setName(i18n.t('settings.recommendation.recentCount'))
            .setDesc(i18n.t('settings.recommendation.recentCountDesc'))
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
            .setName(i18n.t('settings.recommendation.topCount'))
            .setDesc(i18n.t('settings.recommendation.topCountDesc'))
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
            .setName(i18n.t('settings.recommendation.topK'))
            .setDesc(i18n.t('settings.recommendation.topKDesc'))
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
            .setName(i18n.t('settings.recommendation.maxCandidates'))
            .setDesc(i18n.t('settings.recommendation.maxCandidatesDesc'))
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
            .setName(i18n.t('settings.recommendation.maxParagraphs'))
            .setDesc(i18n.t('settings.recommendation.maxParagraphsDesc'))
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
