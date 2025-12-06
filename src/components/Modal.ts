import { App, Modal as ObsidianModal, Setting, Notice } from 'obsidian';

export interface ModalOptions {
	title: string;
	content: string;
	onConfirm?: () => void | Promise<void>;
	onCancel?: () => void;
	confirmText?: string;
	cancelText?: string;
	showCancel?: boolean;
	width?: string;
}

/**
 * Improved modal component with accessibility and error handling
 */
export class Modal extends ObsidianModal {
	private options: ModalOptions;
	private isProcessing = false;

	constructor(app: App, options: ModalOptions) {
		super(app);
		this.options = {
			confirmText: 'Confirm',
			cancelText: 'Cancel',
			showCancel: true,
			width: '400px',
			...options
		};
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('incremental-reading-modal');

		// Set modal attributes for accessibility
		contentEl.setAttribute('role', 'dialog');
		contentEl.setAttribute('aria-modal', 'true');
		contentEl.setAttribute('aria-labelledby', 'modal-title');
		contentEl.setAttribute('aria-describedby', 'modal-content');

		// Set modal width
		if (this.options.width) {
			(contentEl as HTMLElement).style.width = this.options.width;
			(contentEl as HTMLElement).style.maxWidth = '90vw';
		}

		// Create title
		const titleEl = contentEl.createEl('h2', {
			text: this.options.title,
			cls: 'modal-title'
		});
		titleEl.id = 'modal-title';

		// Create content
		const contentDiv = contentEl.createEl('div', {
			cls: 'modal-content',
			text: this.options.content
		});
		contentDiv.id = 'modal-content';

		// Create button container
		const buttonContainer = contentEl.createEl('div', {
			cls: 'modal-button-container'
		});

		// Create confirm button
		const confirmBtn = buttonContainer.createEl('button', {
			text: this.options.confirmText!,
			cls: 'mod-cta'
		});
		confirmBtn.setAttribute('aria-label', `Confirm ${this.options.title}`);

		// Create cancel button if needed
		let cancelBtn: HTMLButtonElement | null = null;
		if (this.options.showCancel) {
			cancelBtn = buttonContainer.createEl('button', {
				text: this.options.cancelText!,
				cls: 'mod-cancel'
			});
			cancelBtn.setAttribute('aria-label', `Cancel ${this.options.title}`);
		}

		// Add event listeners
		const handleConfirm = async () => {
			if (this.isProcessing) return;

			try {
				this.isProcessing = true;
				confirmBtn.textContent = 'Processing...';
				confirmBtn.disabled = true;

				if (cancelBtn) {
					cancelBtn.disabled = true;
				}

				if (this.options.onConfirm) {
					await this.options.onConfirm();
				}
				this.close();
			} catch (error) {
				console.error('Error in modal confirm action:', error);
				new Notice('An error occurred. Please try again.');

				// Reset button state
				confirmBtn.textContent = this.options.confirmText!;
				confirmBtn.disabled = false;

				if (cancelBtn) {
					cancelBtn.disabled = false;
				}
			} finally {
				this.isProcessing = false;
			}
		};

		const handleCancel = () => {
			if (this.isProcessing) return;

			if (this.options.onCancel) {
				this.options.onCancel();
			}
			this.close();
		};

		confirmBtn.onclick = handleConfirm;

		if (cancelBtn) {
			cancelBtn.onclick = handleCancel;
		}

		// Add keyboard support
		this.scope.register([], 'Enter', handleConfirm);
		this.scope.register([], 'Escape', handleCancel);

		// Focus management
		setTimeout(() => confirmBtn.focus(), 100);

		// Add click outside to close (only if cancel is shown)
		if (this.options.showCancel) {
			contentEl.addEventListener('click', (e) => {
				if (e.target === contentEl) {
					handleCancel();
				}
			});
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.removeClass('incremental-reading-modal');
	}
}

/**
 * Slider modal for adjusting numeric values
 */
export class SliderModal extends ObsidianModal {
	private value: number;
	private options: {
		title: string;
		label: string;
		min: number;
		max: number;
		step: number;
		onConfirm: (value: number) => void | Promise<void>;
	};
	private slider: HTMLInputElement | null = null;
	private valueDisplay: HTMLElement | null = null;
	private isProcessing = false;

	constructor(
		app: App,
		initialValue: number,
		options: SliderModal['options']
	) {
		super(app);
		this.value = initialValue;
		this.options = options;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('incremental-reading-modal', 'slider-modal');

		// Create title
		contentEl.createEl('h2', { text: this.options.title });

		// Create slider container
		const sliderContainer = contentEl.createEl('div', { cls: 'slider-container' });

		// Create value display
		this.valueDisplay = sliderContainer.createEl('div', {
			cls: 'value-display',
			text: `${this.options.label}: ${this.value.toFixed(1)}`
		});

		// Create slider
		this.slider = sliderContainer.createEl('input', {
			type: 'range',
			cls: 'slider'
		});
		this.slider.min = this.options.min.toString();
		this.slider.max = this.options.max.toString();
		this.slider.step = this.options.step.toString();
		this.slider.value = this.value.toString();

		// Add slider event listener
		this.slider.addEventListener('input', () => {
			this.value = parseFloat(this.slider!.value);
			if (this.valueDisplay) {
				this.valueDisplay.textContent = `${this.options.label}: ${this.value.toFixed(1)}`;
			}
		});

		// Create button container
		const buttonContainer = contentEl.createEl('div', { cls: 'modal-button-container' });

		// Create buttons
		const confirmBtn = buttonContainer.createEl('button', {
			text: 'Save',
			cls: 'mod-cta'
		});
		const cancelBtn = buttonContainer.createEl('button', {
			text: 'Cancel',
			cls: 'mod-cancel'
		});

		// Add event listeners
		confirmBtn.onclick = async () => {
			if (this.isProcessing) return;

			try {
				this.isProcessing = true;
				confirmBtn.textContent = 'Saving...';
				confirmBtn.disabled = true;
				cancelBtn.disabled = true;

				await this.options.onConfirm(this.value);
				this.close();
			} catch (error) {
				console.error('Error saving slider value:', error);
				new Notice('Error saving value');

				confirmBtn.textContent = 'Save';
				confirmBtn.disabled = false;
				cancelBtn.disabled = false;
			} finally {
				this.isProcessing = false;
			}
		};

		cancelBtn.onclick = () => this.close();

		// Keyboard support
		this.scope.register([], 'Enter', () => confirmBtn.click());
		this.scope.register([], 'Escape', () => cancelBtn.click());

		// Focus slider
		setTimeout(() => this.slider?.focus(), 100);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.removeClass('incremental-reading-modal', 'slider-modal');
	}
}

/**
 * Loading indicator component
 */
export class LoadingIndicator {
	private container: HTMLElement;
	private message: string;
	private isActive = false;

	constructor(container: HTMLElement, message: string = 'Loading...') {
		this.container = container;
		this.message = message;
	}

	show(): void {
		if (this.isActive) return;

		this.isActive = true;

		const loadingEl = this.container.createEl('div', {
			cls: 'loading-indicator'
		});

		loadingEl.setAttribute('role', 'status');
		loadingEl.setAttribute('aria-live', 'polite');

		// Create spinner
		const spinner = loadingEl.createEl('div', { cls: 'loading-spinner' });

		// Create message
		const messageEl = loadingEl.createEl('div', {
			cls: 'loading-message',
			text: this.message
		});

		// Store reference for removal
		(this.container as any)._loadingElement = loadingEl;
	}

	hide(): void {
		if (!this.isActive) return;

		this.isActive = false;
		const loadingEl = (this.container as any)._loadingElement;

		if (loadingEl) {
			loadingEl.remove();
			delete (this.container as any)._loadingElement;
		}
	}

	updateMessage(message: string): void {
		this.message = message;
		const loadingEl = (this.container as any)._loadingElement;

		if (loadingEl) {
			const messageEl = loadingEl.querySelector('.loading-message');
			if (messageEl) {
				messageEl.textContent = message;
			}
		}
	}
}

/**
 * Document Metrics Modal for adjusting all document metrics
 */
export class DocumentMetricsModal extends ObsidianModal {
	private file: any;
	private initialMetrics: any;
	private onSave: (metrics: any) => void | Promise<void>;
	private sliders: Map<string, HTMLInputElement> = new Map();
	private valueDisplays: Map<string, HTMLElement> = new Map();
	private isProcessing = false;

	constructor(
		app: App,
		file: any,
		metrics: any,
		onSave: (metrics: any) => void | Promise<void>
	) {
		super(app);
		this.file = file;
		this.initialMetrics = { ...metrics };
		this.onSave = onSave;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('incremental-reading-modal', 'document-metrics-modal');

		// Create title
		contentEl.createEl('h2', {
			text: `调整文档得分: ${this.file.basename || '未知文档'}`
		});

		// Create slider container
		const sliderContainer = contentEl.createEl('div', { cls: 'sliders-container' });

		// Define metrics configuration
		const metricConfigs = [
			{ key: 'difficulty', label: '难度', min: 0, max: 10, step: 0.5 },
			{ key: 'importance', label: '重要性', min: 0, max: 10, step: 0.5 },
			{ key: 'urgency', label: '紧急度', min: 0, max: 10, step: 0.5 },
			{ key: 'interest', label: '兴趣度', min: 0, max: 10, step: 0.5 },
			{ key: 'priority', label: '手动优先级', min: 0, max: 10, step: 0.5 }
		];

		// Create sliders for each metric
		for (const config of metricConfigs) {
			const sliderGroup = sliderContainer.createEl('div', { cls: 'slider-group' });

			// Create label and value display
			const labelRow = sliderGroup.createEl('div', { cls: 'label-row' });
			labelRow.createEl('label', {
				text: config.label,
				cls: 'metric-label'
			});

			const valueDisplay = labelRow.createEl('span', {
				text: this.initialMetrics[config.key].toFixed(1),
				cls: 'value-display'
			});
			this.valueDisplays.set(config.key, valueDisplay);

			// Create slider
			const slider = sliderGroup.createEl('input', {
				type: 'range',
				cls: 'slider'
			});
			slider.min = config.min.toString();
			slider.max = config.max.toString();
			slider.step = config.step.toString();
			slider.value = this.initialMetrics[config.key].toString();
			this.sliders.set(config.key, slider);

			// Add event listener
			slider.addEventListener('input', () => {
				const value = parseFloat(slider.value);
				valueDisplay.textContent = value.toFixed(1);
			});
		}

		// Create button container
		const buttonContainer = contentEl.createEl('div', { cls: 'modal-button-container' });

		// Create buttons
		const confirmBtn = buttonContainer.createEl('button', {
			text: '保存',
			cls: 'mod-cta'
		});
		const cancelBtn = buttonContainer.createEl('button', {
			text: '取消',
			cls: 'mod-cancel'
		});

		// Add event listeners
		confirmBtn.onclick = async () => {
			if (this.isProcessing) return;

			try {
				this.isProcessing = true;
				confirmBtn.textContent = '保存中...';
				confirmBtn.disabled = true;
				cancelBtn.disabled = true;

				// Collect updated metrics
				const updatedMetrics: any = { ...this.initialMetrics };
				for (const [key, slider] of this.sliders) {
					updatedMetrics[key] = parseFloat(slider.value);
				}

				await this.onSave(updatedMetrics);
				this.close();
			} catch (error) {
				console.error('保存文档得分失败:', error);
				new Notice('保存失败，请重试');

				confirmBtn.textContent = '保存';
				confirmBtn.disabled = false;
				cancelBtn.disabled = false;
			} finally {
				this.isProcessing = false;
			}
		};

		cancelBtn.onclick = () => this.close();

		// Keyboard support
		this.scope.register([], 'Enter', () => confirmBtn.click());
		this.scope.register([], 'Escape', () => cancelBtn.click());

		// Focus first slider
		setTimeout(() => this.sliders.values().next().value?.focus(), 100);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.removeClass('incremental-reading-modal', 'document-metrics-modal');
	}
}

/**
 * Error boundary component
 */
export class ErrorBoundary {
	private container: HTMLElement;
	private fallback: HTMLElement;

	constructor(container: HTMLElement, fallbackMessage: string = 'Something went wrong') {
		this.container = container;
		this.fallback = this.createFallbackElement(fallbackMessage);
	}

	wrap(operation: () => void | Promise<void>): void {
		try {
			const result = operation();
			if (result instanceof Promise) {
				result.catch(error => this.handleError(error));
			}
		} catch (error) {
			this.handleError(error);
		}
	}

	private handleError(error: any): void {
		console.error('Error in component:', error);

		// Clear container and show fallback
		this.container.empty();
		this.container.appendChild(this.fallback.cloneNode(true));
	}

	private createFallbackElement(message: string): HTMLElement {
		const fallback = document.createElement('div');
		fallback.className = 'error-fallback';
		fallback.innerHTML = `
			<div class="error-icon">⚠️</div>
			<div class="error-message">${message}</div>
			<button class="error-retry" onclick="location.reload()">Retry</button>
		`;
		return fallback;
	}
}