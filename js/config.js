// ===================================
// CryptoTrader Pro v2 - Configuration
// ===================================

const CONFIG = {
    APP: {
        NAME: 'CryptoTrader Pro',
        VERSION: '2.0',
        AUTO_SYNC_INTERVAL: 30000,
        CURRENCY: '$',
        DATE_FORMAT: 'en-US'
    },
    
    STORAGE_KEYS: {
        SETTINGS: 'ctp_v2_settings',
        CACHE: 'ctp_v2_cache',
        LAST_SYNC: 'ctp_v2_last_sync'
    },
    
    PAIRS: [
        'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT',
        'DOGE/USDT', 'ADA/USDT', 'AVAX/USDT', 'DOT/USDT', 'LINK/USDT',
        'MATIC/USDT', 'NEAR/USDT', 'UNI/USDT', 'ATOM/USDT', 'FTM/USDT',
        'ARB/USDT', 'OP/USDT', 'APT/USDT', 'SUI/USDT', 'INJ/USDT'
    ],
    
    PAIR_COLORS: {
        'BTC/USDT': '#f7931a', 'ETH/USDT': '#627eea', 'SOL/USDT': '#9945ff',
        'BNB/USDT': '#f3ba2f', 'XRP/USDT': '#00aae4', 'DOGE/USDT': '#c2a633',
        'ADA/USDT': '#0033ad', 'AVAX/USDT': '#e84142', 'DOT/USDT': '#e6007a',
        'LINK/USDT': '#2a5ada'
    },
    
    TIMEFRAMES: ['1M', '5M', '15M', '30M', '1H', '4H', '1D', '1W'],
    
    REMINDER_TYPES: ['PRICE_ALERT', 'NEWS', 'EVENT', 'STRATEGY', 'GENERAL']
};

// Default settings
const DEFAULT_SETTINGS = {
    webAppUrl: '',
    autoSync: true,
    wallpaper: '',
    customIcon: '',
    transactions: []
};

// ===== HELPER FUNCTIONS =====

function getSettings() {
    const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.SETTINGS);
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    return DEFAULT_SETTINGS;
}

function saveSettings(settings) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

function formatCurrency(value) {
    const num = parseFloat(value) || 0;
    return CONFIG.APP.CURRENCY + num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatNumber(value) {
    const num = parseFloat(value) || 0;
    return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatWithCommas(num) {
    if (num === null || num === undefined || num === '') return '0';
    const n = parseFloat(String(num).replace(/,/g, '')) || 0;
    return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

function parseFormattedNumber(str) {
    if (!str) return 0;
    return parseFloat(String(str).replace(/,/g, '')) || 0;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString(CONFIG.APP.DATE_FORMAT, {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

function formatDateLong(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

function formatDateForInput(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
}

function getDateStr(dateValue) {
    if (!dateValue) return '';
    if (typeof dateValue === 'string') {
        const cleaned = dateValue.split('T')[0].trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
        if (cleaned.includes('/')) {
            const parts = cleaned.split('/');
            if (parts.length === 3) {
                const month = parts[0].padStart(2, '0');
                const day = parts[1].padStart(2, '0');
                const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
                return `${year}-${month}-${day}`;
            }
        }
        return cleaned;
    }
    if (dateValue instanceof Date) return dateValue.toISOString().split('T')[0];
    return '';
}

function getTodayStr() {
    const now = new Date();
    return now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0');
}

function getValueClass(value) {
    const num = parseFloat(value) || 0;
    if (num > 0) return 'positive';
    if (num < 0) return 'negative';
    return '';
}

function getPairColor(pair) {
    return CONFIG.PAIR_COLORS[pair] || '#4facfe';
}

function formatPercent(value) {
    const num = parseFloat(value) || 0;
    return (num >= 0 ? '+' : '') + num.toFixed(2) + '%';
}

function setupCommaInput(input) {
    if (!input) return;
    input.addEventListener('input', function(e) {
        let value = this.value.replace(/[^0-9.]/g, '');
        if (value) {
            const parts = value.split('.');
            parts[0] = parseInt(parts[0] || 0).toLocaleString('en-US');
            this.value = parts.length > 1 ? parts[0] + '.' + parts[1].slice(0, 8) : parts[0];
        }
    });
    input.addEventListener('blur', function() {
        if (this.value) this.value = formatWithCommas(this.value);
    });
}

// Export globals
window.CONFIG = CONFIG;
window.getSettings = getSettings;
window.saveSettings = saveSettings;
window.formatCurrency = formatCurrency;
window.formatNumber = formatNumber;
window.formatWithCommas = formatWithCommas;
window.parseFormattedNumber = parseFormattedNumber;
window.formatDate = formatDate;
window.formatDateLong = formatDateLong;
window.formatDateForInput = formatDateForInput;
window.getDateStr = getDateStr;
window.getTodayStr = getTodayStr;
window.getValueClass = getValueClass;
window.getPairColor = getPairColor;
window.formatPercent = formatPercent;
window.setupCommaInput = setupCommaInput;
