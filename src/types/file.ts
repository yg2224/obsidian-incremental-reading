import { TFile } from 'obsidian';

export interface FileManagerSettings {
    roamingDocs: string[];
    excludedPaths: string[];
}

export interface FileOperationResult {
    success: boolean;
    message: string;
    data?: any;
}

export interface FileSelectionOptions {
    multiple?: boolean;
    searchable?: boolean;
    maxSelection?: number;
    filter?: (file: TFile) => boolean;
}

export interface FolderSelectionOptions {
    recursive?: boolean;
    includeSubfolders?: boolean;
}