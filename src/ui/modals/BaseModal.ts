import { App, Modal as ObsidianModal } from 'obsidian';
import { Notice } from 'obsidian';

export interface BaseModalOptions {
    title: string;
    width?: string;
    height?: string;
    closable?: boolean;
    showBackdrop?: boolean;
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void;
}

/**
 * 基础Modal类 - 提供通用的Modal功能
 */
export class BaseModal extends ObsidianModal {
    protected options: BaseModalOptions;
    protected isProcessing = false;

    constructor(app: App, options: BaseModalOptions) {
        super(app);
        this.options = {
            width: '400px',
            height: 'auto',
            closable: true,
            showBackdrop: true,
            ...options
        };
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('incremental-reading-plugin-root');
        contentEl.addClass('incremental-reading-modal', 'base-modal');

        // 设置模态框样式
        this.setupModalStyles();

        // 创建标题
        this.createTitle();

        // 创建内容区域
        this.createContent();

        // 创建按钮区域
        this.createButtons();

        // 设置键盘支持
        this.setupKeyboardSupport();

        // 设置焦点
        setTimeout(() => this.focusFirstElement(), 100);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.removeClass('incremental-reading-plugin-root', 'incremental-reading-modal', 'base-modal');
    }

    protected setupModalStyles() {
        const { contentEl } = this;

        if (this.options.width) {
            (contentEl as HTMLElement).style.width = this.options.width;
        }

        if (this.options.height && this.options.height !== 'auto') {
            (contentEl as HTMLElement).style.height = this.options.height;
        }

        contentEl.style.maxWidth = '90vw';
        contentEl.style.maxHeight = '90vh';
        contentEl.style.overflow = 'auto';

        // 设置可访问性属性
        contentEl.setAttribute('role', 'dialog');
        contentEl.setAttribute('aria-modal', 'true');
        contentEl.setAttribute('aria-labelledby', 'modal-title');
    }

    protected createTitle() {
        const { contentEl } = this;
        const titleEl = contentEl.createEl('h2', {
            text: this.options.title,
            cls: 'modal-title'
        });
        titleEl.id = 'modal-title';
    }

    protected createContent() {
        const { contentEl } = this;
        const contentContainer = contentEl.createEl('div', {
            cls: 'modal-content'
        });

        // 子类可以重写此方法来添加具体内容
        this.renderContent(contentContainer);
    }

    protected createButtons() {
        const { contentEl } = this;
        const buttonContainer = contentEl.createEl('div', {
            cls: 'modal-button-container'
        });

        // 确认按钮
        if (this.options.onConfirm) {
            const confirmBtn = buttonContainer.createEl('button', {
                text: '确认',
                cls: 'mod-cta'
            });
            confirmBtn.onclick = () => this.handleConfirm();
        }

        // 取消按钮
        if (this.options.onCancel || this.options.closable) {
            const cancelBtn = buttonContainer.createEl('button', {
                text: '取消',
                cls: 'mod-cancel'
            });
            cancelBtn.onclick = () => this.handleCancel();
        }
    }

    protected setupKeyboardSupport() {
        this.scope.register([], 'Enter', () => this.handleConfirm());
        this.scope.register([], 'Escape', () => this.handleCancel());
    }

    protected async handleConfirm() {
        if (this.isProcessing || !this.options.onConfirm) return;

        try {
            this.isProcessing = true;
            this.showProcessing();

            await this.options.onConfirm();
            this.close();
        } catch (error) {
            console.error('Modal confirm action failed:', error);
            new Notice('操作失败，请重试');
        } finally {
            this.isProcessing = false;
            this.hideProcessing();
        }
    }

    protected handleCancel() {
        if (this.isProcessing) return;

        if (this.options.onCancel) {
            this.options.onCancel();
        }
        this.close();
    }

    protected showProcessing() {
        const confirmBtn = this.containerEl.querySelector('.mod-cta') as HTMLButtonElement;
        if (confirmBtn) {
            confirmBtn.textContent = '处理中...';
            confirmBtn.disabled = true;
        }

        const cancelBtn = this.containerEl.querySelector('.mod-cancel') as HTMLButtonElement;
        if (cancelBtn) {
            cancelBtn.disabled = true;
        }
    }

    protected hideProcessing() {
        const confirmBtn = this.containerEl.querySelector('.mod-cta') as HTMLButtonElement;
        if (confirmBtn) {
            confirmBtn.textContent = '确认';
            confirmBtn.disabled = false;
        }

        const cancelBtn = this.containerEl.querySelector('.mod-cancel') as HTMLButtonElement;
        if (cancelBtn) {
            cancelBtn.disabled = false;
        }
    }

    protected focusFirstElement() {
        const firstInput = this.contentEl.querySelector('input, button, select, textarea') as HTMLElement;
        if (firstInput) {
            firstInput.focus();
        }
    }

    // 子类可以重写这些方法
    protected renderContent(container: HTMLElement): void {
        // 默认实现为空，子类重写
    }

    protected validate(): boolean {
        return true; // 默认验证通过，子类可以重写
    }
}