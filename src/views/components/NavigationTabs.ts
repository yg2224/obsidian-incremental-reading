import { i18n } from '../../i18n';

/**
 * 导航标签组件 - 处理不同视图之间的切换
 */
export class NavigationTabs {
    private container: HTMLElement;
    private tabSlider: HTMLElement | null = null;
    private tabButtons: HTMLButtonElement[] = [];
    private currentActiveTab: string = '';
    private currentTabIndex: number = 0;
    private onTabChange: (tabId: string, index: number) => void;

    constructor(
        container: HTMLElement,
        onTabChange: (tabId: string, index: number) => void,
        initialTab: string = 'metrics'
    ) {
        this.container = container;
        this.onTabChange = onTabChange;
        this.currentActiveTab = initialTab;
        this.create();
    }

    private create() {
        const navSection = this.container.createEl('div', { cls: 'sliding-navigation' });

        const tabContainer = navSection.createEl('div', { cls: 'tabs-wrapper' });

        // Create sliding indicator
        this.tabSlider = tabContainer.createEl('div', { cls: 'tab-slider' });

        const tabs = [
            { id: 'metrics', label: i18n.t('tabs.metrics') },
            { id: 'recommendations', label: i18n.t('tabs.recommendations') },
            { id: 'ranking', label: i18n.t('tabs.ranking') },
            { id: 'visualization', label: i18n.t('tabs.visualization') }
        ];

        // Create tab buttons
        this.tabButtons = [];
        tabs.forEach((tab, index) => {
            const tabBtn = tabContainer.createEl('button', {
                cls: 'tab-btn',
                text: tab.label
            });
            tabBtn.setAttribute('data-target', tab.id);
            tabBtn.onclick = () => this.switchToTab(tab.id, index);

            // Set initial active state
            if (tab.id === this.currentActiveTab) {
                tabBtn.addClass('active');
                this.currentTabIndex = index;
            }

            this.tabButtons.push(tabBtn);
        });

        // Initialize slider position
        this.updateTabSlider();
    }

    public switchToTab(tabId: string, index: number) {
        if (this.currentActiveTab === tabId) return;

        // Update active states
        this.tabButtons.forEach((btn, i) => {
            btn.toggleClass('active', i === index);
        });

        this.currentActiveTab = tabId;
        this.currentTabIndex = index;

        // Update slider position
        this.updateTabSlider();

        // Call callback
        this.onTabChange(tabId, index);
    }

    private updateTabSlider() {
        if (!this.tabSlider || !this.tabButtons[this.currentTabIndex]) return;

        const activeTab = this.tabButtons[this.currentTabIndex];
        const tabRect = activeTab.getBoundingClientRect();
        const containerRect = activeTab.parentElement!.getBoundingClientRect();

        // Update slider position and width
        this.tabSlider.style.width = `${tabRect.width}px`;
        this.tabSlider.style.left = `${tabRect.left - containerRect.left}px`;
    }

    /**
     * 获取当前激活的标签ID
     */
    public getCurrentTab(): string {
        return this.currentActiveTab;
    }

    /**
     * 获取当前激活的标签索引
     */
    public getCurrentTabIndex(): number {
        return this.currentTabIndex;
    }

    /**
     * 切换到指定标签
     */
    public setActiveTab(tabId: string): void {
        const tabIndex = this.tabButtons.findIndex(btn => btn.getAttribute('data-target') === tabId);
        if (tabIndex !== -1) {
            this.switchToTab(tabId, tabIndex);
        }
    }

    /**
     * 刷新标签文本（语言切换时使用）
     */
    public refresh(): void {
        // Re-create the navigation with updated translations
        this.container.empty();
        this.create();
    }
}
