import { TFile } from 'obsidian';
import IncrementalReadingPlugin from '../../main';
import { SharedUtils } from '../../utils/SharedUtils';
import { i18n } from '../../i18n';

/**
 * 优先级可视化组件 - 显示文件优先级散点图
 */
export class PriorityVisualization {
    private container: HTMLElement;
    private plugin: IncrementalReadingPlugin;
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private onOpenDocument: (file: TFile) => void;
    private hoveredPoint: { file: TFile; x: number; y: number; priority: number } | null = null;

    constructor(
        container: HTMLElement,
        plugin: IncrementalReadingPlugin,
        onOpenDocument: (file: TFile) => void
    ) {
        this.container = container;
        this.plugin = plugin;
        this.onOpenDocument = onOpenDocument;
        this.render();
    }

    public render(): void {
        this.container.empty();

        const vizSection = this.container.createEl('div', { cls: 'priority-visualization-section' });

        // 标题
        const header = vizSection.createEl('div', { cls: 'viz-header' });
        header.createEl('h3', { text: i18n.t('visualization.title') });

        const refreshBtn = header.createEl('button', {
            cls: 'viz-refresh-btn',
            text: i18n.t('visualization.refresh')
        });
        refreshBtn.onclick = () => this.render();

        // Canvas 容器
        const canvasContainer = vizSection.createEl('div', { cls: 'viz-canvas-container' });

        this.canvas = canvasContainer.createEl('canvas', { cls: 'priority-viz-canvas' });
        this.ctx = this.canvas.getContext('2d');

        // 设置 canvas 尺寸
        const width = canvasContainer.clientWidth || 800;
        const height = 400;
        this.canvas.width = width;
        this.canvas.height = height;

        // 绘制图表
        this.drawChart();

        // 添加交互事件
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredPoint = null;
            this.drawChart();
        });
    }

    private drawChart(): void {
        if (!this.ctx || !this.canvas) return;

        const files = this.plugin.getValidRoamingFiles();
        if (files.length === 0) {
            this.drawEmptyState();
            return;
        }

        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 计算所有文件的优先级
        const dataPoints = files.map(file => {
            const metrics = this.plugin.getDocumentMetrics(file);
            const priority = SharedUtils.calculatePriority(
                metrics,
                this.plugin.settings.metricWeights,
                this.plugin.settings.customMetrics
            );
            return { file, priority };
        }).sort((a, b) => b.priority - a.priority);

        // 图表边距
        const padding = { top: 40, right: 40, bottom: 60, left: 60 };
        const chartWidth = this.canvas.width - padding.left - padding.right;
        const chartHeight = this.canvas.height - padding.top - padding.bottom;

        // 计算优先级范围
        const maxPriority = Math.max(...dataPoints.map(d => d.priority));
        const minPriority = Math.min(...dataPoints.map(d => d.priority));
        const priorityRange = maxPriority - minPriority || 1;

        // 绘制背景网格
        this.drawGrid(padding, chartWidth, chartHeight, maxPriority, minPriority);

        // 绘制坐标轴
        this.drawAxes(padding, chartWidth, chartHeight, dataPoints.length, maxPriority, minPriority);

        // 绘制数据点
        dataPoints.forEach((point, index) => {
            const x = padding.left + (index / Math.max(1, dataPoints.length - 1)) * chartWidth;
            const y = padding.top + chartHeight - ((point.priority - minPriority) / priorityRange) * chartHeight;

            this.drawPoint(x, y, point, index);
        });

        // 绘制悬停提示
        if (this.hoveredPoint) {
            this.drawTooltip(this.hoveredPoint);
        }
    }

    private drawGrid(padding: any, width: number, height: number, maxPriority: number, minPriority: number): void {
        if (!this.ctx) return;

        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;

        // 水平网格线（5条）
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + (i / 5) * height;
            this.ctx.beginPath();
            this.ctx.moveTo(padding.left, y);
            this.ctx.lineTo(padding.left + width, y);
            this.ctx.stroke();
        }

        // 垂直网格线（10条）
        for (let i = 0; i <= 10; i++) {
            const x = padding.left + (i / 10) * width;
            this.ctx.beginPath();
            this.ctx.moveTo(x, padding.top);
            this.ctx.lineTo(x, padding.top + height);
            this.ctx.stroke();
        }
    }

    private drawAxes(padding: any, width: number, height: number, fileCount: number, maxPriority: number, minPriority: number): void {
        if (!this.ctx) return;

        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.font = '12px sans-serif';
        this.ctx.fillStyle = '#333';

        // Y轴
        this.ctx.beginPath();
        this.ctx.moveTo(padding.left, padding.top);
        this.ctx.lineTo(padding.left, padding.top + height);
        this.ctx.stroke();

        // X轴
        this.ctx.beginPath();
        this.ctx.moveTo(padding.left, padding.top + height);
        this.ctx.lineTo(padding.left + width, padding.top + height);
        this.ctx.stroke();

        // Y轴标签（优先级）
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'middle';
        for (let i = 0; i <= 5; i++) {
            const value = maxPriority - (i / 5) * (maxPriority - minPriority);
            const y = padding.top + (i / 5) * height;
            this.ctx.fillText(value.toFixed(0), padding.left - 10, y);
        }

        // Y轴标题
        this.ctx.save();
        this.ctx.translate(20, padding.top + height / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#8e44ad';
        this.ctx.font = 'bold 14px sans-serif';
        this.ctx.fillText(i18n.t('visualization.yAxis'), 0, 0);
        this.ctx.restore();

        // X轴标签（文档索引）
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        const step = Math.ceil(fileCount / 10);
        for (let i = 0; i < fileCount; i += step) {
            const x = padding.left + (i / Math.max(1, fileCount - 1)) * width;
            this.ctx.fillText(`#${i + 1}`, x, padding.top + height + 10);
        }

        // X轴标题
        this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#8e44ad';
        this.ctx.font = 'bold 14px sans-serif';
        this.ctx.fillText(i18n.t('visualization.xAxis'), padding.left + width / 2, padding.top + height + 40);
    }

    private drawPoint(x: number, y: number, point: { file: TFile; priority: number }, index: number): void {
        if (!this.ctx) return;

        const isHovered = this.hoveredPoint?.file.path === point.file.path;
        const radius = isHovered ? 8 : 5;

        // 绘制点
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);

        // 根据优先级设置颜色
        const color = this.getPriorityColor(point.priority);
        this.ctx.fillStyle = color;
        this.ctx.fill();

        // 边框
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#8e44ad';
        this.ctx.strokeStyle = isHovered ? accentColor : '#fff';
        this.ctx.lineWidth = isHovered ? 3 : 2;
        this.ctx.stroke();

        // 存储点的位置用于交互
        if (!isHovered) {
            // 仅在非悬停状态下更新，避免闪烁
        }
    }

    private drawTooltip(point: { file: TFile; x: number; y: number; priority: number }): void {
        if (!this.ctx || !this.canvas) return;

        const padding = 10;
        const lineHeight = 18;
        const fileName = point.file.basename;
        const priorityText = `${i18n.t('metrics.priorityLabel')}: ${point.priority.toFixed(1)}`;

        // 测量文本宽度
        this.ctx.font = '12px sans-serif';
        const fileNameWidth = this.ctx.measureText(fileName).width;
        const priorityWidth = this.ctx.measureText(priorityText).width;
        const tooltipWidth = Math.max(fileNameWidth, priorityWidth) + padding * 2;
        const tooltipHeight = lineHeight * 2 + padding * 2;

        // 计算提示框位置（避免超出画布）
        let tooltipX = point.x + 10;
        let tooltipY = point.y - tooltipHeight - 10;

        if (tooltipX + tooltipWidth > this.canvas.width) {
            tooltipX = point.x - tooltipWidth - 10;
        }
        if (tooltipY < 0) {
            tooltipY = point.y + 10;
        }

        // 绘制背景
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#8e44ad';
        this.ctx.strokeStyle = accentColor;
        this.ctx.lineWidth = 2;

        // 绘制圆角矩形（手动实现）
        const radius = 8;
        this.ctx.beginPath();
        this.ctx.moveTo(tooltipX + radius, tooltipY);
        this.ctx.lineTo(tooltipX + tooltipWidth - radius, tooltipY);
        this.ctx.arcTo(tooltipX + tooltipWidth, tooltipY, tooltipX + tooltipWidth, tooltipY + radius, radius);
        this.ctx.lineTo(tooltipX + tooltipWidth, tooltipY + tooltipHeight - radius);
        this.ctx.arcTo(tooltipX + tooltipWidth, tooltipY + tooltipHeight, tooltipX + tooltipWidth - radius, tooltipY + tooltipHeight, radius);
        this.ctx.lineTo(tooltipX + radius, tooltipY + tooltipHeight);
        this.ctx.arcTo(tooltipX, tooltipY + tooltipHeight, tooltipX, tooltipY + tooltipHeight - radius, radius);
        this.ctx.lineTo(tooltipX, tooltipY + radius);
        this.ctx.arcTo(tooltipX, tooltipY, tooltipX + radius, tooltipY, radius);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // 绘制文本
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.fillText(fileName, tooltipX + padding, tooltipY + padding);
        this.ctx.font = '12px sans-serif';
        this.ctx.fillStyle = accentColor;
        this.ctx.fillText(priorityText, tooltipX + padding, tooltipY + padding + lineHeight);
    }

    private getPriorityColor(priority: number): string {
        // 根据优先级返回不同的颜色
        if (priority >= 80) return '#dc3545'; // 红色 - 非常高
        if (priority >= 60) return '#fd7e14'; // 橙色 - 高
        if (priority >= 40) return '#ffc107'; // 黄色 - 中等
        if (priority >= 20) return '#28a745'; // 绿色 - 低
        return '#6c757d'; // 灰色 - 非常低
    }

    private drawEmptyState(): void {
        if (!this.ctx || !this.canvas) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#7f8c8d';
        this.ctx.font = '16px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            i18n.t('visualization.emptyMessage'),
            this.canvas.width / 2,
            this.canvas.height / 2
        );
    }

    private handleMouseMove(event: MouseEvent): void {
        if (!this.canvas) return;

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const files = this.plugin.getValidRoamingFiles();
        if (files.length === 0) return;

        const dataPoints = files.map(file => {
            const metrics = this.plugin.getDocumentMetrics(file);
            const priority = SharedUtils.calculatePriority(
                metrics,
                this.plugin.settings.metricWeights,
                this.plugin.settings.customMetrics
            );
            return { file, priority };
        }).sort((a, b) => b.priority - a.priority);

        const padding = { top: 40, right: 40, bottom: 60, left: 60 };
        const chartWidth = this.canvas.width - padding.left - padding.right;
        const chartHeight = this.canvas.height - padding.top - padding.bottom;

        const maxPriority = Math.max(...dataPoints.map(d => d.priority));
        const minPriority = Math.min(...dataPoints.map(d => d.priority));
        const priorityRange = maxPriority - minPriority || 1;

        // 检查鼠标是否在某个点附近
        let foundPoint = null;
        for (let i = 0; i < dataPoints.length; i++) {
            const point = dataPoints[i];
            const x = padding.left + (i / Math.max(1, dataPoints.length - 1)) * chartWidth;
            const y = padding.top + chartHeight - ((point.priority - minPriority) / priorityRange) * chartHeight;

            const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
            if (distance < 10) {
                foundPoint = { file: point.file, x, y, priority: point.priority };
                break;
            }
        }

        if (foundPoint !== this.hoveredPoint) {
            this.hoveredPoint = foundPoint;
            this.canvas.style.cursor = foundPoint ? 'pointer' : 'default';
            this.drawChart();
        }
    }

    private handleClick(event: MouseEvent): void {
        if (this.hoveredPoint) {
            this.onOpenDocument(this.hoveredPoint.file);
        }
    }

    public refresh(): void {
        this.render();
    }
}
