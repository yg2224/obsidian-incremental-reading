import { App, TFile, Notice } from 'obsidian';
import { FileSelectionOptions } from '../../../../types/file';

/**
 * 多文件选择器
 */
export class FileSelector {
    private app: App;
    private container: HTMLElement;
    private onSelectionChange: (selectedFiles: TFile[]) => void;
    private selectedFiles: Set<string> = new Set();
    private availableFiles: TFile[] = [];
    private options: FileSelectionOptions;

    constructor(
        app: App,
        container: HTMLElement,
        onSelectionChange: (selectedFiles: TFile[]) => void,
        options: FileSelectionOptions = {}
    ) {
        this.app = app;
        this.container = container;
        this.onSelectionChange = onSelectionChange;
        this.options = {
            multiple: true,
            searchable: true,
            maxSelection: Infinity,
            ...options
        };
        this.render();
    }

    private render() {
        this.container.empty();
        this.container.addClass('file-selector');

        // 标题
        const title = this.container.createEl('h3', {
            text: '选择文件',
            cls: 'selector-title'
        });

        // 搜索框
        if (this.options.searchable) {
            this.createSearchBox();
        }

        // 文件列表容器
        const listContainer = this.container.createEl('div', {
            cls: 'file-list-container'
        });

        this.createFileList(listContainer);

        // 选择信息
        const selectionInfo = this.container.createEl('div', {
            cls: 'selection-info'
        });
        this.updateSelectionInfo(selectionInfo);

        // 操作按钮
        this.createActionButtons();
    }

    private createSearchBox() {
        const searchContainer = this.container.createEl('div', {
            cls: 'search-container'
        });

        const searchInput = searchContainer.createEl('input', {
            type: 'text',
            placeholder: '搜索文件...',
            cls: 'search-input'
        });

        searchInput.addEventListener('input', () => this.filterFiles(searchInput.value));
    }

    private createFileList(container: HTMLElement) {
        const fileList = container.createEl('div', { cls: 'file-list' });

        // 获取可用文件
        this.availableFiles = this.getAvailableFiles();

        // 创建文件项
        this.availableFiles.forEach(file => {
            this.createFileItem(fileList, file);
        });
    }

    private getAvailableFiles(): TFile[] {
        const allFiles = this.app.vault.getMarkdownFiles();

        // 应用过滤器
        if (this.options.filter) {
            return allFiles.filter(this.options.filter);
        }

        return allFiles;
    }

    private createFileItem(container: HTMLElement, file: TFile) {
        const item = container.createEl('div', {
            cls: 'file-item',
            attr: { 'data-file-path': file.path }
        });

        // 复选框
        if (this.options.multiple) {
            const checkbox = item.createEl('input', {
                type: 'checkbox',
                cls: 'file-checkbox'
            });

            item.onclick = (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                }
                this.toggleFile(file, checkbox.checked);
            };

            checkbox.onchange = () => {
                this.toggleFile(file, checkbox.checked);
            };
        } else {
            item.onclick = () => this.selectSingleFile(file);
        }

        // 文件信息
        const fileInfo = item.createEl('div', { cls: 'file-info' });

        const fileName = fileInfo.createEl('div', {
            text: file.basename,
            cls: 'file-name'
        });

        const filePath = fileInfo.createEl('div', {
            text: file.path,
            cls: 'file-path'
        });

        // 文件统计
        const fileStats = fileInfo.createEl('div', {
            text: this.formatFileSizeSize(file.stat.size),
            cls: 'file-stats'
        });

        // 文件状态
        if (this.isFileSelected(file)) {
            item.addClass('selected');
        }
    }

    private formatFileSizeSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    private toggleFile(file: TFile, selected: boolean) {
        if (selected) {
            if (this.selectedFiles.size >= this.options.maxSelection!) {
                new Notice(`最多只能选择 ${this.options.maxSelection} 个文件`);
                return;
            }
            this.selectedFiles.add(file.path);
        } else {
            this.selectedFiles.delete(file.path);
        }

        this.updateFileItemState(file);
        this.updateSelectionInfo();
        this.onSelectionChange(this.getSelectedFiles());
    }

    private selectSingleFile(file: TFile) {
        // 清除之前的选择
        this.selectedFiles.clear();
        this.selectedFiles.add(file.path);

        // 更新UI
        this.updateAllFileItemStates();
        this.updateSelectionInfo();
        this.onSelectionChange(this.getSelectedFiles());
    }

    private isFileSelected(file: TFile): boolean {
        return this.selectedFiles.has(file.path);
    }

    private updateFileItemState(file: TFile) {
        const item = this.container.querySelector(`[data-file-path="${file.path}"]`);
        if (item) {
            const checkbox = item.querySelector('.file-checkbox') as HTMLInputElement;
            if (checkbox) {
                checkbox.checked = this.isFileSelected(file);
            }
            item.classList.toggle('selected', this.isFileSelected(file));
        }
    }

    private updateAllFileItemStates() {
        this.availableFiles.forEach(file => {
            this.updateFileItemState(file);
        });
    }

    private updateSelectionInfo(infoElement?: HTMLElement) {
        const info = infoElement || this.container.querySelector('.selection-info');
        if (info) {
            const count = this.selectedFiles.size;
            info.textContent = `已选择 ${count} 个文件`;
        }
    }

    private createActionButtons() {
        const buttonContainer = this.container.createEl('div', {
            cls: 'button-container'
        });

        const selectAllBtn = buttonContainer.createEl('button', {
            text: '全选',
            cls: 'select-all-btn'
        });
        selectAllBtn.onclick = () => this.selectAll();

        const clearBtn = buttonContainer.createEl('button', {
            text: '清空',
            cls: 'clear-btn'
        });
        clearBtn.onclick = () => this.clearSelection();
    }

    private selectAll() {
        if (this.options.multiple) {
            this.availableFiles.forEach(file => {
                if (this.selectedFiles.size >= this.options.maxSelection!) {
                    return;
                }
                this.selectedFiles.add(file.path);
            });
            this.updateAllFileItemStates();
            this.updateSelectionInfo();
            this.onSelectionChange(this.getSelectedFiles());
        }
    }

    private clearSelection() {
        this.selectedFiles.clear();
        this.updateAllFileItemStates();
        this.updateSelectionInfo();
        this.onSelectionChange([]);
    }

    private filterFiles(searchTerm: string) {
        const items = this.container.querySelectorAll('.file-item');
        const lowerSearchTerm = searchTerm.toLowerCase();

        items.forEach((item, index) => {
            const file = this.availableFiles[index];
            const matches = file.basename.toLowerCase().includes(lowerSearchTerm) ||
                           file.path.toLowerCase().includes(lowerSearchTerm);
            (item as HTMLElement).style.display = matches ? 'block' : 'none';
        });
    }

    public getSelectedFiles(): TFile[] {
        return this.availableFiles.filter(file => this.selectedFiles.has(file.path));
    }

    public setSelectedFiles(files: TFile[]) {
        this.selectedFiles.clear();
        files.forEach(file => this.selectedFiles.add(file.path));
        this.updateAllFileItemStates();
        this.updateSelectionInfo();
    }
}