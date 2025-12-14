import { Setting, Notice } from 'obsidian';
import IncrementalReadingPlugin from '../main';
import { CustomMetric } from '../models/Settings';
import { i18n } from '../i18n';

/**
 * 自定义指标设置组件
 */
export class CustomMetricsSettings {
    private containerEl: HTMLElement;
    private plugin: IncrementalReadingPlugin;
    private contentEl: HTMLElement;

    constructor(containerEl: HTMLElement, plugin: IncrementalReadingPlugin) {
        this.containerEl = containerEl;
        this.plugin = plugin;
        // 不在构造函数中创建contentEl，而是在render时创建或清空
    }

    public render(): void {
        // 如果内容容器不存在，创建它
        if (!this.contentEl) {
            this.contentEl = this.containerEl.createEl('div', { cls: 'custom-metrics-settings-content' });
        } else {
            // 清空内容容器
            this.contentEl.empty();
        }

        // 在内容容器中渲染
        this.contentEl.createEl('h3', { text: '📊 ' + i18n.t('settings.customMetrics.title') });

        // 指标管理说明
        this.createMetricManagementHeader();

        // 自定义指标列表
        this.createCustomMetricsList();
    }

    private createMetricManagementHeader(): void {
        // 添加新指标的设置项
        new Setting(this.contentEl)
            .setName(i18n.t('settings.customMetrics.title'))
            .setDesc(i18n.t('settings.customMetrics.description'))
            .addButton(button => button
                .setButtonText('+ ' + i18n.t('settings.customMetrics.addMetric'))
                .setCta()
                .onClick(() => this.addNewMetric()));
    }

    private createCustomMetricsList(): void {
        const metricsContainer = this.contentEl.createEl('div', { cls: 'custom-metrics-container' });

        metricsContainer.createEl('h4', { text: i18n.t('settings.customMetrics.title') });
        metricsContainer.createEl('p', {
            text: i18n.t('settings.customMetrics.description'),
            cls: 'setting-item-description'
        });

        const metricsList = metricsContainer.createEl('div', { cls: 'metrics-list' });

        // 为每个自定义指标创建设置项
        this.plugin.settings.customMetrics?.forEach((metric, index) => {
            this.createMetricSetting(metricsList, metric, index);
        });
    }

    private createMetricSetting(container: HTMLElement, metric: CustomMetric, index: number): void {
        const metricItem = container.createEl('div', { cls: 'metric-setting-item' });

        // 指标标题
        const titleSetting = new Setting(metricItem)
            .setName(`${i18n.t('settings.customMetrics.title')} ${index + 1}`)
            .setDesc(`${i18n.t('settings.customMetrics.metricName')}: ${metric.name}`)
            .addButton(button => button
                .setButtonText(i18n.t('settings.customMetrics.removeMetric'))
                .setWarning()
                .onClick(() => this.deleteMetric(index)));

        // 指标名称设置
        new Setting(metricItem)
            .setName(i18n.t('settings.customMetrics.metricName'))
            .setDesc(i18n.t('settings.customMetrics.description'))
            .addText(text => text
                .setPlaceholder(i18n.t('settings.customMetrics.metricName'))
                .setValue(metric.name)
                .onChange(async (value) => {
                    const newName = value || `${i18n.t('settings.customMetrics.metricName')}${index + 1}`;
                    const oldId = this.plugin.settings.customMetrics![index].id;
                    const newId = this.generateMetricId(newName);

                    this.plugin.settings.customMetrics![index].name = newName;
                    this.plugin.settings.customMetrics![index].id = newId;

                    // 如果ID改变了，需要更新所有文档中的指标ID
                    if (oldId !== newId) {
                        await this.updateMetricIdInAllDocuments(oldId, newId);
                    }

                    await this.saveSettings();

                    // 更新权重设置的名称显示
                    this.refresh();
                }));

        // 指标权重设置
        new Setting(metricItem)
            .setName(i18n.t('settings.customMetrics.metricWeight'))
            .setDesc(i18n.t('settings.customMetrics.description'))
            .addSlider(slider => slider
                .setLimits(0, 100, 1)
                .setValue(metric.weight)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.customMetrics![index].weight = Math.floor(value);
                    await this.normalizeMetricWeights();
                    await this.saveSettings();
                    this.refresh(); // 刷新显示以更新权重显示
                }));
    }

    /**
     * 添加新指标
     */
    private async addNewMetric(): Promise<void> {
        const currentCount = this.plugin.settings.customMetrics?.length || 0;

        if (currentCount >= 10) {
            new Notice(i18n.t('settings.customMetrics.maxMetricsWarning'));
            return;
        }

        try {
            const newMetric: CustomMetric = {
                id: this.generateMetricId(`${i18n.t('settings.customMetrics.metricName')}${currentCount + 1}`),
                name: `${i18n.t('settings.customMetrics.metricName')}${currentCount + 1}`,
                weight: Math.floor(100 / (currentCount + 1))
            };

            this.plugin.settings.customMetrics!.push(newMetric);

            // 重新归一化所有权重
            await this.normalizeMetricWeights();

            // 为现有文档添加新指标的默认值
            await this.addDefaultValuesForNewMetrics(currentCount, currentCount + 1);

            await this.saveSettings();
            this.refresh();

            new Notice(i18n.t('notices.settingsSaved'));

        } catch (error) {
            console.error('添加指标失败:', error);
            new Notice(i18n.t('notices.errorSavingSettings'));
        }
    }

    /**
     * 删除指标
     */
    private async deleteMetric(index: number): Promise<void> {
        const metricToDelete = this.plugin.settings.customMetrics![index];

        if (!metricToDelete) {
            console.warn('要删除的指标不存在，index:', index);
            return;
        }

        try {
            console.log(`开始删除指标: ${metricToDelete.name} (ID: ${metricToDelete.id})`);

            // 确认删除
            const confirmed = await this.showDeleteConfirmation(metricToDelete.name);
            if (!confirmed) {
                console.log('用户取消了删除操作');
                return;
            }

            // 从设置中删除指标
            this.plugin.settings.customMetrics!.splice(index, 1);
            console.log('已从设置中删除指标');

            // 从所有文档中删除该指标的数据
            await this.removeMetricFromAllDocuments(metricToDelete.id);
            console.log('已从所有文档中删除指标数据');

            // 重新归一化权重
            await this.normalizeMetricWeights();
            console.log('已重新归一化权重');

            // 保存设置
            await this.saveSettings();
            console.log('已保存设置');

            // 刷新界面
            this.refresh();
            console.log('已刷新界面');

            new Notice(`✅ 已删除指标"${metricToDelete.name}"`);

        } catch (error) {
            console.error('删除指标失败:', error);
            new Notice('删除指标失败');

            // 出现错误时恢复界面状态
            try {
                this.refresh();
            } catch (refreshError) {
                console.error('刷新界面失败:', refreshError);
            }
        }
    }

    /**
     * 显示删除确认对话框
     */
    private async showDeleteConfirmation(metricName: string): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'delete-confirmation-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            `;

            const content = document.createElement('div');
            content.className = 'modal-content';
            content.style.cssText = `
                background-color: var(--background-primary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 6px;
                padding: 20px;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            `;

            content.innerHTML = `
                <h3 style="margin-top: 0; color: var(--text-normal);">${i18n.t('common.confirm')}</h3>
                <p style="color: var(--text-normal);">${i18n.t('settings.customMetrics.removeMetric')} "${metricName}"?</p>
                <p class="warning" style="color: var(--text-error); font-weight: bold;">⚠️ ${i18n.t('settings.dataManagement.clearConfirm')}</p>
                <div class="modal-buttons" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                    <button class="cancel-btn" style="padding: 8px 16px; border: 1px solid var(--background-modifier-border); background-color: var(--interactive-normal); color: var(--text-normal); border-radius: 4px; cursor: pointer;">${i18n.t('common.cancel')}</button>
                    <button class="confirm-btn" style="padding: 8px 16px; border: none; background-color: var(--interactive-destructive); color: var(--text-on-accent); border-radius: 4px; cursor: pointer;">${i18n.t('common.delete')}</button>
                </div>
            `;

            modal.appendChild(content);
            document.body.appendChild(modal);

            const cancelBtn = content.querySelector('.cancel-btn') as HTMLButtonElement;
            const confirmBtn = content.querySelector('.confirm-btn') as HTMLButtonElement;

            const cleanup = () => {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
            };

            cancelBtn.onclick = () => {
                cleanup();
                resolve(false);
            };

            confirmBtn.onclick = () => {
                cleanup();
                resolve(true);
            };

            // 点击背景取消
            modal.onclick = (e) => {
                if (e.target === modal) {
                    cleanup();
                    resolve(false);
                }
            };

            // ESC键取消
            const handleEsc = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', handleEsc);
                    cleanup();
                    resolve(false);
                }
            };
            document.addEventListener('keydown', handleEsc);
        });
    }

    /**
     * 从所有文档中删除指标数据
     */
    private async removeMetricFromAllDocuments(metricId: string): Promise<void> {
        try {
            const roamingFiles = this.plugin.fileManagementService.getValidRoamingFiles();
            let removedCount = 0;
            let errorCount = 0;

            console.log(`开始从 ${roamingFiles.length} 个文档中删除指标数据: ${metricId}`);

            for (const file of roamingFiles) {
                try {
                    const currentMetrics = this.plugin.settings.documentMetrics[file.path];
                    if (currentMetrics && currentMetrics.hasOwnProperty(metricId)) {
                        delete currentMetrics[metricId];
                        removedCount++;

                        // 如果删除后文档没有其他指标数据，保留基本信息
                        const remainingKeys = Object.keys(currentMetrics).filter(key =>
                            key !== 'lastVisited' && key !== 'visitCount'
                        );
                        if (remainingKeys.length === 0) {
                            // 只保留基本访问信息
                            const basicInfo = {
                                lastVisited: currentMetrics.lastVisited || Date.now(),
                                visitCount: currentMetrics.visitCount || 0
                            };
                            this.plugin.settings.documentMetrics[file.path] = basicInfo;
                        }
                    }
                } catch (fileError) {
                    console.error(`处理文件 ${file.path} 时出错:`, fileError);
                    errorCount++;
                }
            }

            console.log(`指标删除完成: 从 ${removedCount} 个文档中删除了数据，${errorCount} 个文档处理失败`);

            if (errorCount > 0) {
                console.warn(`删除指标时遇到 ${errorCount} 个错误，但操作继续完成`);
            }

        } catch (error) {
            console.error(`删除所有文档中的指标数据时发生严重错误:`, error);
            throw error;
        }
    }

    /**
     * 更新所有文档中的指标ID（当指标重命名时）
     */
    private async updateMetricIdInAllDocuments(oldId: string, newId: string): Promise<void> {
        const roamingFiles = this.plugin.fileManagementService.getValidRoamingFiles();
        let updatedCount = 0;

        for (const file of roamingFiles) {
            const currentMetrics = this.plugin.settings.documentMetrics[file.path];
            if (currentMetrics && oldId in currentMetrics) {
                currentMetrics[newId] = currentMetrics[oldId];
                delete currentMetrics[oldId];
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            console.log(`已在 ${updatedCount} 个文档中更新指标ID: ${oldId} -> ${newId}`);
        }
    }

    /**
     * 为现有文档添加新指标的默认值
     */
    private async addDefaultValuesForNewMetrics(oldCount: number, newCount: number): Promise<void> {
        try {
            const roamingFiles = this.plugin.fileManagementService.getValidRoamingFiles();
            const allMetrics = this.plugin.settings.customMetrics!;
            const newMetrics = allMetrics.slice(oldCount);

            if (newMetrics.length === 0) return;

            let updatedCount = 0;

            for (const file of roamingFiles) {
                let hasUpdates = false;
                const currentMetrics = this.plugin.settings.documentMetrics[file.path] || {
                    lastVisited: Date.now(),
                    visitCount: 0
                };

                // 为每个新指标添加默认值5.0
                for (const metric of newMetrics) {
                    if (!(metric.id in currentMetrics)) {
                        currentMetrics[metric.id] = 5.0;
                        hasUpdates = true;
                    }
                }

                // 如果有更新，保存文档指标
                if (hasUpdates) {
                    this.plugin.settings.documentMetrics[file.path] = currentMetrics;
                    updatedCount++;
                }
            }

            if (updatedCount > 0) {
                await this.plugin.saveSettings();
                new Notice(i18n.t('notices.settingsSaved'));
            }

        } catch (error) {
            console.error('为新指标添加默认值失败:', error);
            new Notice(i18n.t('notices.errorSavingSettings'));
        }
    }

    private async normalizeMetricWeights(): Promise<void> {
        try {
            const metrics = this.plugin.settings.customMetrics;

            if (!metrics || metrics.length === 0) {
                console.log('没有自定义指标，跳过权重归一化');
                return;
            }

            const totalWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0);

            if (totalWeight > 0) {
                metrics.forEach(metric => {
                    metric.weight = Math.round((metric.weight / totalWeight) * 100);
                });
                console.log(`已归一化 ${metrics.length} 个指标的权重，总权重: 100%`);
            } else {
                // 如果总权重为0，平均分配权重
                const equalWeight = Math.floor(100 / metrics.length);
                metrics.forEach(metric => {
                    metric.weight = equalWeight;
                });
                console.log(`总权重为0，已平均分配权重: ${equalWeight}%`);
            }

            // 更新权重映射
            this.plugin.settings.metricWeights = {};
            for (const metric of metrics) {
                this.plugin.settings.metricWeights[metric.id] = metric.weight;
            }

        } catch (error) {
            console.error('归一化权重时出错:', error);
            throw error;
        }
    }

    private generateMetricId(name: string): string {
        // 将中文和空格转换为下划线，移除特殊字符
        return name
            .toLowerCase()
            .replace(/[^\w\u4e00-\u9fff]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '') || 'metric';
    }

    private async saveSettings(): Promise<void> {
        await this.plugin.saveSettings();
    }

    private refresh(): void {
        try {
            console.log('开始刷新自定义指标设置界面');

            // 只清空我们自己的内容容器
            if (this.contentEl) {
                this.render();
                console.log('自定义指标设置界面刷新完成');
            } else {
                console.warn('内容容器不存在，尝试重新创建');
                this.contentEl = this.containerEl.createEl('div', { cls: 'custom-metrics-settings-content' });
                this.render();
            }
        } catch (error) {
            console.error('刷新自定义指标设置界面时出错:', error);
            // 尝试重新渲染
            try {
                if (!this.contentEl) {
                    this.contentEl = this.containerEl.createEl('div', { cls: 'custom-metrics-settings-content' });
                }
                this.render();
            } catch (renderError) {
                console.error('重新渲染也失败:', renderError);
            }
        }
    }
}