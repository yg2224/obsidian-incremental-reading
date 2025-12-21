import { Setting } from 'obsidian';
import IncrementalReadingPlugin from '../main';
import { COLOR_SCHEMES, ColorScheme } from '../models/Settings';
import { i18n } from '../i18n';

/**
 * 颜色主题设置组件
 */
export class ColorSchemeSettings {
    private containerEl: HTMLElement;
    private plugin: IncrementalReadingPlugin;
    private applyThemeTimeout: NodeJS.Timeout | null = null;

    constructor(containerEl: HTMLElement, plugin: IncrementalReadingPlugin) {
        this.containerEl = containerEl;
        this.plugin = plugin;
    }

    public render(): void {
        const colorSchemeContainer = this.containerEl.createEl('div', { cls: 'color-scheme-settings-content' });

        colorSchemeContainer.createEl('h3', { text: 'Color Theme' });

        // 主题选择设置
        new Setting(colorSchemeContainer)
            .setName('Color Theme')
            .setDesc('Select your preferred color scheme for the plugin interface')
            .addDropdown(dropdown => {
                COLOR_SCHEMES.forEach(scheme => {
                    const displayName = i18n.getLanguage() === 'zh' ? scheme.name.zh : scheme.name.en;
                    dropdown.addOption(scheme.id, displayName);
                });

                dropdown
                    .setValue(this.plugin.settings.colorScheme || 'arctic')
                    .onChange(async (value) => {
                        this.plugin.settings.colorScheme = value;
                        await this.plugin.saveSettings();
                        this.applyColorScheme(value);

                        // 使用防抖来避免频繁的UI刷新
                        clearTimeout(this.applyThemeTimeout);
                        this.applyThemeTimeout = setTimeout(() => {
                            this.plugin.notifyViewsRefreshUI();
                        }, 100);
                    });
            });

        // 主题预览区域
        this.createColorSchemePreview(colorSchemeContainer);
    }

    private createColorSchemePreview(container: HTMLElement): void {
        const previewContainer = container.createEl('div', { cls: 'color-scheme-preview' });
        previewContainer.createEl('h4', { text: 'Theme Preview' });

        const previewGrid = previewContainer.createEl('div', { cls: 'preview-grid' });

        COLOR_SCHEMES.forEach(scheme => {
            const previewCard = previewGrid.createEl('div', { cls: 'preview-card' });

            // 主题颜色展示
            const colorDisplay = previewCard.createEl('div', { cls: 'color-display' });
            colorDisplay.style.background = scheme.bgGradient;

            // 主题色块
            const primaryColor = colorDisplay.createEl('div', { cls: 'color-swatch primary' });
            primaryColor.style.backgroundColor = scheme.primaryColor;

            const accentColor = colorDisplay.createEl('div', { cls: 'color-swatch accent' });
            accentColor.style.backgroundColor = scheme.accentColor;

            // 主题名称
            const schemeName = i18n.getLanguage() === 'zh' ? scheme.name.zh : scheme.name.en;
            const nameLabel = previewCard.createEl('div', { cls: 'scheme-name', text: schemeName });

            // 点击选择主题
            previewCard.addEventListener('click', async () => {
                this.plugin.settings.colorScheme = scheme.id;
                await this.plugin.saveSettings();
                this.applyColorScheme(scheme.id);

                // 更新下拉菜单
                const dropdown = container.querySelector('.dropdown') as HTMLSelectElement;
                if (dropdown) {
                    dropdown.value = scheme.id;
                }

                // 更新选中状态
                previewGrid.querySelectorAll('.preview-card').forEach(card => {
                    card.classList.remove('selected');
                });
                previewCard.classList.add('selected');

                // 使用防抖来避免频繁的UI刷新
                clearTimeout(this.applyThemeTimeout);
                this.applyThemeTimeout = setTimeout(() => {
                    this.plugin.notifyViewsRefreshUI();
                }, 100);
            });

            // 设置当前选中状态
            if (scheme.id === (this.plugin.settings.colorScheme || 'arctic')) {
                previewCard.classList.add('selected');
            }
        });
    }

    private applyColorScheme(schemeId: string): void {
        const scheme = COLOR_SCHEMES.find(s => s.id === schemeId);
        if (!scheme) return;

        // 获取或创建主题样式元素
        let styleEl = document.getElementById('incremental-reading-color-scheme') as HTMLStyleElement;
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'incremental-reading-color-scheme';
            document.head.appendChild(styleEl);
        }

        // 解析颜色值，生成RGB版本的变量
        const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : { r: 142, g: 68, b: 173 };
        };

        const accentRgb = hexToRgb(scheme.accentColor);
        const primaryRgb = hexToRgb(scheme.primaryColor);

        // 生成CSS变量定义
        const cssVariables = `
            :root {
                /* Primary Color Scheme */
                --primary-color: ${scheme.primaryColor};
                --accent-color: ${scheme.accentColor};
                --accent-light: ${scheme.primaryColor};
                --accent-dark: ${scheme.accentColor};

                /* Background Colors */
                --bg-gradient: ${scheme.bgGradient};
                --card-bg: ${scheme.cardBg};
                --card-hover-bg: ${scheme.cardBg};

                /* Text Colors */
                --text-main: ${scheme.textMain};
                --text-secondary: ${scheme.textSecondary};

                /* Accent Variations */
                --accent-transparent: rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.1);
                --accent-light-transparent: rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.1);
                --accent-dark-transparent: rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.1);

                /* Box Shadows */
                --accent-shadow: rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.3);
                --accent-shadow-hover: rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.5);
                --accent-shadow-light: rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.1);
                --accent-shadow-heavy: rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.6);

                /* Borders */
                --accent-border: rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.3);
                --accent-border-hover: rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.4);
                --light-border: rgba(0,0,0,0.05);
                --medium-border: rgba(0,0,0,0.08);

                /* Gradients */
                --accent-gradient: linear-gradient(135deg, var(--accent-light) 0%, var(--accent-color) 100%);
                --accent-gradient-vertical: linear-gradient(180deg, var(--accent-light) 0%, var(--accent-color) 100%);
                --accent-gradient-horizontal: linear-gradient(90deg, var(--accent-light) 0%, var(--accent-color) 100%);

                /* Dimensions */
                --border-radius: 16px;
                --small-border-radius: 8px;
            }
        `;

        styleEl.textContent = cssVariables;

        // 更新插件容器背景
        const pluginContainers = document.querySelectorAll('.plugin-container');
        pluginContainers.forEach(container => {
            (container as HTMLElement).style.background = scheme.bgGradient;
        });
    }
}