export interface CustomMetric {
    id: string;
    name: string;
    weight: number; // 0-100, percentage weight
}

export interface DocumentMetrics {
    [key: string]: number; // Dynamic metrics based on custom metrics
    lastVisited: number; // timestamp
    visitCount: number; // number of times visited
}

export interface MetricWeights {
    [key: string]: number; // Dynamic weights based on custom metrics
}

export interface MetricsConfig {
    count: number; // 1-10 metrics
    items: CustomMetric[];
}

export interface MetricsValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export interface MetricsUpdateOptions {
    realTime?: boolean; // Whether to update in real-time
    validate?: boolean; // Whether to validate values
    silent?: boolean;   // Whether to show notifications
}