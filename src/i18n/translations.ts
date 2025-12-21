export interface Translation {
    // 通用
    common: {
        ok: string;
        cancel: string;
        save: string;
        delete: string;
        edit: string;
        add: string;
        remove: string;
        confirm: string;
        close: string;
        reset: string;
        search: string;
        loading: string;
        error: string;
        success: string;
        warning: string;
    };

    // 主视图
    view: {
        title: string;
        subtitle: string;
        statusTemplate: string;
        noDocuments: string;
        openDocument: string;
        actionBar: {
            continue: string;
            smartRecommend: string;
            refresh: string;
            random: string;
            addCurrent: string;
            addFolder: string;
            multiSelect: string;
            noDocuments: string;
            alreadyInRoaming: string;
            smartTooltip: string;
        };
        nonRoaming: {
            title: string;
            description: string;
            benefits: string[];
            action: string;
        };
    };

    // 选项卡
    tabs: {
        metrics: string;
        ranking: string;
        recommendations: string;
        visualization: string;
    };

    // 文档指标
    metrics: {
        title: string;
        importance: string;
        urgency: string;
        completion: string;
        lastVisited: string;
        visitCount: string;
        totalScore: string;
        updateMetrics: string;
        noFileOpen: string;
        currentDocument: string;
        priorityLabel: string;
        customMetricsTitle: string;
        visitStatsTitle: string;
        visitCountLabel: string;
        lastVisitedLabel: string;
        neverVisited: string;
        weightBreakdown: string;
        totalLabel: string;
    };

    // 排行榜
    ranking: {
        title: string;
        emptyMessage: string;
        score: string;
        visits: string;
        lastVisit: string;
        priorityToggle: string;
        visitsToggle: string;
        refreshButton: string;
        openButton: string;
    };

    // 推荐
    recommendations: {
        title: string;
        emptyMessage: string;
        similarity: string;
        openRecommended: string;
        refreshing: string;
        refreshButton: string;
        smartJumpButton: string;
        smartJumpFailed: string;
        smartJumpNotice: string;
        priorityLabel: string;
        visitCountLabel: string;
        openButton: string;
    };

    // 可视化
    visualization: {
        title: string;
        xAxis: string;
        yAxis: string;
        refresh: string;
        emptyMessage: string;
    };

    // 操作栏
    actions: {
        addFile: string;
        addFolder: string;
        addMultiple: string;
        removeFromRoaming: string;
        clearHistory: string;
        refresh: string;
    };

    // 设置
    settings: {
        title: string;
        general: {
            title: string;
            language: string;
            languageDesc: string;
        };
        customMetrics: {
            title: string;
            description: string;
            addMetric: string;
            metricName: string;
            metricWeight: string;
            removeMetric: string;
            minMetricsWarning: string;
            maxMetricsWarning: string;
        };
        recommendation: {
            title: string;
            description: string;
            recentCount: string;
            recentCountDesc: string;
            topCount: string;
            topCountDesc: string;
            topK: string;
            topKDesc: string;
            maxCandidates: string;
            maxCandidatesDesc: string;
            maxParagraphs: string;
            maxParagraphsDesc: string;
        };
        filter: {
            title: string;
            description: string;
            excludeVisited: string;
            excludeVisitedDesc: string;
            excludedPaths: string;
            excludedPathsDesc: string;
            excludedPathsPlaceholder: string;
        };
        dataManagement: {
            title: string;
            description: string;
            clearHistory: string;
            clearHistoryDesc: string;
            clearButton: string;
            clearConfirm: string;
            exportData: string;
            exportDataDesc: string;
            exportButton: string;
            importData: string;
            importDataDesc: string;
            importButton: string;
        };
    };

    // 通知消息
    notices: {
        addedToRoaming: string;
        removedFromRoaming: string;
        historyCleared: string;
        onlyMarkdownFiles: string;
        noActiveFile: string;
        filesAdded: string;
        noFilesAdded: string;
        settingsSaved: string;
        errorSavingSettings: string;
        errorLoadingSettings: string;
        dataExported: string;
        dataImported: string;
        invalidData: string;
        continueFailed: string;
        randomRoaming: string;
        randomRoamingFailed: string;
        selectionProbability: string;
        documentOpenFailed: string;
        editMetricsFailed: string;
        fileSwitchError: string;
        smartRecommendationFailed: string;
    };

    // 命令
    commands: {
        startReading: string;
        openRandom: string;
        addToRoaming: string;
        addFolder: string;
        addMultiple: string;
        clearHistory: string;
    };
}

export const translations: Record<string, Translation> = {
    en: {
        common: {
            ok: 'OK',
            cancel: 'Cancel',
            save: 'Save',
            delete: 'Delete',
            edit: 'Edit',
            add: 'Add',
            remove: 'Remove',
            confirm: 'Confirm',
            close: 'Close',
            reset: 'Reset',
            search: 'Search',
            loading: 'Loading...',
            error: 'Error',
            success: 'Success',
            warning: 'Warning',
        },
        view: {
            title: 'Incremental Reading',
            subtitle: '"Unfold the scroll of silent affection: With the <span class="chance">chance of waiting and roaming...</span><br>Through stars we meet, three autumns\' frost prints on the hooves."',
            statusTemplate: 'Roaming through {count} documents',
            noDocuments: 'No documents in roaming list',
            openDocument: 'Open Document',
            actionBar: {
                continue: 'Continue Reading',
                smartRecommend: 'Smart Recommendations',
                refresh: 'Refresh Data',
                random: 'Random Roaming',
                addCurrent: 'Add to Roaming',
                addFolder: 'Add Folder',
                multiSelect: 'Add Multiple Files',
                noDocuments: 'No roaming documents yet',
                alreadyInRoaming: 'Already in roaming',
                smartTooltip: 'Jump to the most similar document',
            },
            nonRoaming: {
                title: 'This document is not in your roaming list yet',
                description: 'Add it to unlock custom metrics, priority tuning, and smart recommendations.',
                benefits: [
                    'Set custom metric scores',
                    'Fine-tune document priority',
                    'Receive intelligent recommendations',
                    'Appear in ranking insights'
                ],
                action: 'Add to Roaming List',
            },
        },
        tabs: {
            metrics: 'Document Metrics',
            ranking: 'Priority Ranking',
            recommendations: 'Smart Recommendations',
            visualization: 'Priority Visualization',
        },
        metrics: {
            title: 'Current Document Metrics',
            importance: 'Importance',
            urgency: 'Urgency',
            completion: 'Completion',
            lastVisited: 'Last Visited',
            visitCount: 'Visit Count',
            totalScore: 'Total Score',
            updateMetrics: 'Update Metrics',
            noFileOpen: 'No file is currently open',
            currentDocument: 'Current Document',
            priorityLabel: 'Priority',
            customMetricsTitle: 'Custom Metrics',
            visitStatsTitle: 'Visit Statistics',
            visitCountLabel: 'Visit Count',
            lastVisitedLabel: 'Last Visited',
            neverVisited: 'Never visited',
            weightBreakdown: 'Weight Breakdown',
            totalLabel: 'Total',
        },
        ranking: {
            title: 'Document Priority Ranking',
            emptyMessage: 'No documents in roaming list',
            score: 'Score',
            visits: 'Visits',
            lastVisit: 'Last Visit',
            priorityToggle: 'By Priority',
            visitsToggle: 'By Visits',
            refreshButton: 'Refresh Ranking',
            openButton: 'Open',
        },
        recommendations: {
            title: 'Intelligent Document Recommendations',
            emptyMessage: 'No recommendations available',
            similarity: 'Similarity',
            openRecommended: 'Open Recommended',
            refreshing: 'Refreshing recommendations...',
            refreshButton: 'Refresh Recommendations',
            smartJumpButton: 'Jump to Top Match',
            smartJumpFailed: 'Smart jump failed, please try again',
            smartJumpNotice: 'Smart recommendation: {filename} (similarity {similarity}%)',
            priorityLabel: 'Priority',
            visitCountLabel: 'Visits',
            openButton: 'Open',
        },
        visualization: {
            title: 'Priority Visualization',
            xAxis: 'Document Rank (by priority)',
            yAxis: 'Priority Score',
            refresh: 'Refresh',
            emptyMessage: 'No documents to visualize',
        },
        actions: {
            addFile: 'Add Current File',
            addFolder: 'Add Folder',
            addMultiple: 'Add Multiple Files',
            removeFromRoaming: 'Remove from Roaming',
            clearHistory: 'Clear History',
            refresh: 'Refresh',
        },
        settings: {
            title: 'Incremental Reading Settings',
            general: {
                title: 'General Settings',
                language: 'Language',
                languageDesc: 'Select the interface language',
            },
            customMetrics: {
                title: 'Custom Metrics',
                description: 'Define your own evaluation metrics (1-10 indicators). Weights are automatically normalized.',
                addMetric: 'Add Metric',
                metricName: 'Metric Name',
                metricWeight: 'Weight',
                removeMetric: 'Remove',
                minMetricsWarning: 'At least one metric is required',
                maxMetricsWarning: 'Maximum 10 metrics allowed',
            },
            recommendation: {
                title: 'Recommendation Settings',
                description: 'Configure intelligent recommendation algorithm parameters',
                recentCount: 'Recent Documents Count',
                recentCountDesc: 'Number of recently visited documents to use as reference',
                topCount: 'Top Priority Count',
                topCountDesc: 'Number of high-priority documents to use as reference',
                topK: 'Recommendation Count',
                topKDesc: 'Number of recommendations to display',
                maxCandidates: 'Max Candidates',
                maxCandidatesDesc: 'Maximum number of documents to analyze',
                maxParagraphs: 'Max Paragraphs',
                maxParagraphsDesc: 'Maximum paragraphs to analyze per document',
            },
            filter: {
                title: 'Filter Settings',
                description: 'Configure document filtering rules',
                excludeVisited: 'Exclude Visited Documents',
                excludeVisitedDesc: 'Do not recommend documents you\'ve already visited',
                excludedPaths: 'Excluded Paths',
                excludedPathsDesc: 'Path patterns to exclude (one per line, supports wildcards)',
                excludedPathsPlaceholder: 'Templates/**\nArchive/**',
            },
            dataManagement: {
                title: 'Data Management',
                description: 'Manage your reading history and settings data',
                clearHistory: 'Clear Reading History',
                clearHistoryDesc: 'Remove all documents from roaming list and reset visit counts',
                clearButton: 'Clear History',
                clearConfirm: 'Are you sure you want to clear all reading history?',
                exportData: 'Export Data',
                exportDataDesc: 'Export all settings and metrics to a JSON file',
                exportButton: 'Export',
                importData: 'Import Data',
                importDataDesc: 'Import settings and metrics from a JSON file',
                importButton: 'Import',
            },
        },
        notices: {
            addedToRoaming: 'Added "{filename}" to roaming',
            removedFromRoaming: 'Removed "{filename}" from roaming',
            historyCleared: 'Reading history cleared',
            onlyMarkdownFiles: 'Only Markdown files can be added to roaming list',
            noActiveFile: 'No active file',
            filesAdded: 'Successfully added {count} files to roaming list',
            noFilesAdded: 'No files were added',
            settingsSaved: 'Settings saved',
            errorSavingSettings: 'Error saving settings',
            errorLoadingSettings: 'Error loading settings, using defaults',
            dataExported: 'Data exported successfully',
            dataImported: 'Data imported successfully',
            invalidData: 'Invalid data format',
            continueFailed: 'Continue reading failed',
            randomRoaming: '🎲 Random roaming: {filename}',
            randomRoamingFailed: 'Random roaming failed',
            selectionProbability: 'Selected: {filename} (probability: {probability}%)',
            documentOpenFailed: 'Failed to open document',
            editMetricsFailed: 'Failed to edit document metrics',
            fileSwitchError: 'Error switching files',
            smartRecommendationFailed: 'Smart recommendation failed, please try again',
        },
        commands: {
            startReading: 'Start Incremental Reading',
            openRandom: 'Open Random Document',
            addToRoaming: 'Add to Roaming',
            addFolder: 'Add Folder to Roaming',
            addMultiple: 'Add Multiple Files to Roaming',
            clearHistory: 'Clear Reading History',
        },
    },
    zh: {
        common: {
            ok: '确定',
            cancel: '取消',
            save: '保存',
            delete: '删除',
            edit: '编辑',
            add: '添加',
            remove: '移除',
            confirm: '确认',
            close: '关闭',
            reset: '重置',
            search: '搜索',
            loading: '加载中...',
            error: '错误',
            success: '成功',
            warning: '警告',
        },
        view: {
            title: '漫游式渐进阅读',
            subtitle: '"展卷乃无言的情意：以<span class="chance">等待漫游...</span>的机遇，<br>穿越星辰遇见你，三秋霜雪印马蹄。"',
            statusTemplate: '已漫游 {count} 个文档',
            noDocuments: '漫游列表为空',
            openDocument: '打开文档',
            actionBar: {
                continue: '继续阅读',
                smartRecommend: '智能推荐',
                refresh: '刷新数据',
                random: '随机漫游',
                addCurrent: '加入漫游',
                addFolder: '添加文件夹',
                multiSelect: '批量添加',
                noDocuments: '暂无漫游文档',
                alreadyInRoaming: '已在漫游列表',
                smartTooltip: '跳转到最相似的文档',
            },
            nonRoaming: {
                title: '此文档尚未加入漫游列表',
                description: '将其添加到漫游列表，解锁自定义指标、优先级调整和智能推荐功能。',
                benefits: [
                    '设置自定义指标评分',
                    '调整文档优先级',
                    '获得智能推荐',
                    '出现在排行榜中'
                ],
                action: '添加到漫游列表',
            },
        },
        tabs: {
            metrics: '文档指标',
            ranking: '优先级排行',
            recommendations: '智能推荐',
            visualization: '优先级可视化',
        },
        metrics: {
            title: '当前文档指标',
            importance: '重要性',
            urgency: '紧急度',
            completion: '完成度',
            lastVisited: '最后访问',
            visitCount: '访问次数',
            totalScore: '综合评分',
            updateMetrics: '更新指标',
            noFileOpen: '当前没有打开的文件',
            currentDocument: '当前文档',
            priorityLabel: '优先级',
            customMetricsTitle: '自定义指标',
            visitStatsTitle: '访问统计',
            visitCountLabel: '访问次数',
            lastVisitedLabel: '最后访问',
            neverVisited: '从未访问',
            weightBreakdown: '权重分解',
            totalLabel: '总计',
        },
        ranking: {
            title: '文档优先级排行',
            emptyMessage: '漫游列表为空',
            score: '评分',
            visits: '访问',
            lastVisit: '最后访问',
            priorityToggle: '按优先级',
            visitsToggle: '按访问量',
            refreshButton: '刷新排行',
            openButton: '打开',
        },
        recommendations: {
            title: '智能文档推荐',
            emptyMessage: '暂无推荐',
            similarity: '相似度',
            openRecommended: '打开推荐',
            refreshing: '正在刷新推荐...',
            refreshButton: '刷新推荐',
            smartJumpButton: '跳转到最佳匹配',
            smartJumpFailed: '智能跳转失败，请重试',
            smartJumpNotice: '智能推荐：{filename}（相似度 {similarity}%）',
            priorityLabel: '优先级',
            visitCountLabel: '访问量',
            openButton: '打开',
        },
        visualization: {
            title: '优先级可视化',
            xAxis: '文档排名（按优先级）',
            yAxis: '优先级分数',
            refresh: '刷新',
            emptyMessage: '没有可视化的文档',
        },
        actions: {
            addFile: '加入当前文档',
            addFolder: '添加文件夹',
            addMultiple: '批量添加',
            removeFromRoaming: '移出漫游',
            clearHistory: '清除历史',
            refresh: '刷新',
        },
        settings: {
            title: '增量阅读 插件设置',
            general: {
                title: '通用设置',
                language: '界面语言',
                languageDesc: '选择界面显示语言',
            },
            customMetrics: {
                title: '自定义指标',
                description: '自定义评估指标（1-10个），权重会自动标准化',
                addMetric: '添加指标',
                metricName: '指标名称',
                metricWeight: '权重',
                removeMetric: '删除',
                minMetricsWarning: '至少需要一个指标',
                maxMetricsWarning: '最多只能添加10个指标',
            },
            recommendation: {
                title: '推荐设置',
                description: '配置智能推荐算法参数',
                recentCount: '最近文档数',
                recentCountDesc: '用作参考的最近访问文档数量',
                topCount: '高优先级文档数',
                topCountDesc: '用作参考的高优先级文档数量',
                topK: '推荐数量',
                topKDesc: '显示的推荐文档数量',
                maxCandidates: '最大候选数',
                maxCandidatesDesc: '分析的最大文档数量',
                maxParagraphs: '最大段落数',
                maxParagraphsDesc: '每个文档分析的最大段落数',
            },
            filter: {
                title: '过滤设置',
                description: '配置文档过滤规则',
                excludeVisited: '排除已访问文档',
                excludeVisitedDesc: '不推荐已经访问过的文档',
                excludedPaths: '排除路径',
                excludedPathsDesc: '要排除的路径模式（每行一个，支持通配符）',
                excludedPathsPlaceholder: 'Templates/**\nArchive/**',
            },
            dataManagement: {
                title: '数据管理',
                description: '管理你的阅读历史和设置数据',
                clearHistory: '清除阅读历史',
                clearHistoryDesc: '从漫游列表中移除所有文档并重置访问计数',
                clearButton: '清除历史',
                clearConfirm: '确定要清除所有阅读历史吗？',
                exportData: '导出数据',
                exportDataDesc: '将所有设置和指标导出到JSON文件',
                exportButton: '导出',
                importData: '导入数据',
                importDataDesc: '从JSON文件导入设置和指标',
                importButton: '导入',
            },
        },
        notices: {
            addedToRoaming: '已将 "{filename}" 加入漫游',
            removedFromRoaming: '已将 "{filename}" 移出漫游',
            historyCleared: '阅读历史已清除',
            onlyMarkdownFiles: '只能添加Markdown文档到漫游列表',
            noActiveFile: '没有打开的文档',
            filesAdded: '成功添加 {count} 个文件到漫游列表',
            noFilesAdded: '没有文件被添加',
            settingsSaved: '设置已保存',
            errorSavingSettings: '保存设置时出错',
            errorLoadingSettings: '加载设置时出错，使用默认设置',
            dataExported: '数据导出成功',
            dataImported: '数据导入成功',
            invalidData: '无效的数据格式',
            continueFailed: '继续漫游失败',
            randomRoaming: '🎲 随机漫游：{filename}',
            randomRoamingFailed: '随机漫游失败',
            selectionProbability: '已选择：{filename}（选择概率：{probability}%）',
            documentOpenFailed: '打开文档失败',
            editMetricsFailed: '编辑文档得分失败',
            fileSwitchError: '文件切换时出现错误',
            smartRecommendationFailed: '智能推荐失败，请重试',
        },
        commands: {
            startReading: '开始增量阅读',
            openRandom: '打开随机文档',
            addToRoaming: '添加至漫游',
            addFolder: '添加文件夹到漫游',
            addMultiple: '批量添加文件到漫游',
            clearHistory: '清除阅读历史',
        },
    },
};
