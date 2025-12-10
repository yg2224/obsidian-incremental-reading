import { App, TFolder, TFile, TAbstractFile } from 'obsidian';
import { FolderSelectionOptions } from '../../../../types/file';

/**
 * 文件夹选择器
 */
export class FolderSelector {
    private app: App;
    private container: HTMLElement;
    private onSelectionChange: (selectedFolders: string[]) => void;
    private selectedFolders: Set<string> = new Set();

    constructor(
        app: App,
        container: HTMLElement,
        onSelectionChange: (selectedFolders: string[]) => void
    ) {
        this.app = app;
        this.container = container;
        this.onSelectionChange = onSelectionChange;
        this.render();
    }

    private render() {
        this.container.empty();
        this.container.addClass('folder-selector');

        // 标题
        const title = this.container.createEl('h3', {
            text: '选择文件夹',
            cls: 'selector-title'
        });

        // 说明
        const description = this.container.createEl('p', {
            text: '选择要添加到漫游列表的文件夹（将递归包含所有Markdown文件）',
            cls: 'selector-description'
        });

        // 文件夹列表容器
        const listContainer = this.container.createEl('div', {
            cls: 'folder-list-container'
        });

        this.createFolderList(listContainer);

        // 选择信息
        const selectionInfo = this.container.createEl('div', {
            cls: 'selection-info'
        });
        this.updateSelectionInfo(selectionInfo);

        // 操作按钮
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

    private createFolderList(container: HTMLElement) {
        const folderList = container.createEl('div', { cls: 'folder-list' });

        // 获取所有文件夹
        const files = this.app.vault.getAllLoadedFiles();
        const folders = files.filter(file => file instanceof TFolder) as TFolder[];

        // 按路径排序
        folders.sort((a, b) => a.path.localeCompare(b.path));

        // 创建文件夹项
        folders.forEach(folder => {
            this.createFolderItem(folderList, folder);
        });
    }

    private createFolderItem(container: HTMLElement, folder: TFolder) {
        const item = container.createEl('div', { cls: 'folder-item' });

        // 复选框
        const checkbox = item.createEl('input', {
            type: 'checkbox',
            cls: 'folder-checkbox'
        });

        // 文件夹信息
        const folderInfo = item.createEl('div', { cls: 'folder-info' });

        const folderName = folderInfo.createEl('div', {
            text: folder.name || '(根目录)',
            cls: 'folder-name'
        });

        const folderPath = folderInfo.createEl('div', {
            text: folder.path,
            cls: 'folder-path'
        });

        // 文件夹统计
        const fileCount = this.countMarkdownFiles(folder);
        const fileStats = folderInfo.createEl('div', {
            text: `${fileCount} 个Markdown文件`,
            cls: 'folder-stats'
        });

        // 事件处理
        item.onclick = (e) => {
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
            }
            this.toggleFolder(folder.path, checkbox.checked);
        };

        checkbox.onchange = () => {
            this.toggleFolder(folder.path, checkbox.checked);
        };
    }

    private countMarkdownFiles(folder: TFolder): number {
        const allFiles = this.app.vault.getAllLoadedFiles();
        return allFiles.filter(file =>
            file instanceof TFile &&
            file.extension === 'md' &&
            (file.path.startsWith(folder.path + '/') || file.path === folder.path)
        ).length;
    }

    private toggleFolder(folderPath: string, selected: boolean) {
        if (selected) {
            this.selectedFolders.add(folderPath);
        } else {
            this.selectedFolders.delete(folderPath);
        }

        // 更新选择信息
        const selectionInfo = this.container.querySelector('.selection-info') as HTMLElement;
        if (selectionInfo) {
            this.updateSelectionInfo(selectionInfo);
        }

        // 触发选择变化回调
        this.onSelectionChange(Array.from(this.selectedFolders));
    }

    private updateSelectionInfo(infoElement: HTMLElement) {
        const count = this.selectedFolders.size;
        const totalFiles = Array.from(this.selectedFolders).reduce((total, path) => {
            const folder = this.app.vault.getAbstractFileByPath(path);
            if (folder && folder instanceof TFolder) {
                return total + this.countMarkdownFiles(folder);
            }
            return total;
        }, 0);

        infoElement.textContent = `已选择 ${count} 个文件夹，包含约 ${totalFiles} 个Markdown文件`;
    }

    private selectAll() {
        const checkboxes = this.container.querySelectorAll('.folder-checkbox') as NodeListOf<HTMLInputElement>;
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });

        const folders = this.app.vault.getAllLoadedFiles()
            .filter(file => file instanceof TFolder) as TFolder[];

        this.selectedFolders = new Set(folders.map(folder => folder.path));
        this.onSelectionChange(Array.from(this.selectedFolders));

        const selectionInfo = this.container.querySelector('.selection-info') as HTMLElement;
        if (selectionInfo) {
            this.updateSelectionInfo(selectionInfo);
        }
    }

    private clearSelection() {
        const checkboxes = this.container.querySelectorAll('.folder-checkbox') as NodeListOf<HTMLInputElement>;
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        this.selectedFolders.clear();
        this.onSelectionChange([]);

        const selectionInfo = this.container.querySelector('.selection-info') as HTMLElement;
        if (selectionInfo) {
            this.updateSelectionInfo(selectionInfo);
        }
    }

    public getSelectedFolders(): string[] {
        return Array.from(this.selectedFolders);
    }
}