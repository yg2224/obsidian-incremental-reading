import { translations, Translation } from './translations';

export class I18n {
    private static instance: I18n;
    private currentLanguage: string = 'en';
    private translations: Record<string, Translation>;

    private constructor() {
        this.translations = translations;
    }

    static getInstance(): I18n {
        if (!I18n.instance) {
            I18n.instance = new I18n();
        }
        return I18n.instance;
    }

    setLanguage(language: string): void {
        if (this.translations[language]) {
            this.currentLanguage = language;
        } else {
            console.warn(`Language ${language} not found, falling back to English`);
            this.currentLanguage = 'en';
        }
    }

    getLanguage(): string {
        return this.currentLanguage;
    }

    t(key: string, replacements?: Record<string, string | number>): string {
        const keys = key.split('.');
        let value: any = this.translations[this.currentLanguage];

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                console.warn(`Translation key not found: ${key}`);
                return key;
            }
        }

        if (typeof value !== 'string') {
            console.warn(`Translation value is not a string: ${key}`);
            return key;
        }

        // Replace placeholders like {count}, {filename}, etc.
        if (replacements) {
            Object.keys(replacements).forEach(replaceKey => {
                value = value.replace(new RegExp(`\\{${replaceKey}\\}`, 'g'), String(replacements[replaceKey]));
            });
        }

        return value;
    }

    // Convenience method to get the entire translation object
    getTranslation(): Translation {
        return this.translations[this.currentLanguage];
    }

    // Get localized metric name
    getMetricName(metric: { name: { en: string; zh: string } }): string {
        const lang = this.currentLanguage;
        if (metric.name && metric.name[lang]) {
            return metric.name[lang];
        }
        // Fallback to English if current language not available
        return metric.name?.en || metric.name?.zh || 'Unknown';
    }

    // Get available languages
    getAvailableLanguages(): Array<{ code: string; name: string }> {
        return [
            { code: 'en', name: 'English' },
            { code: 'zh', name: '中文' },
        ];
    }
}

// Export singleton instance
export const i18n = I18n.getInstance();
