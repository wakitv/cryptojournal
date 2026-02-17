// ===================================
// CryptoTrader Pro v2 - API Handler
// ===================================

class CryptoAPI {
    constructor() {
        this.settings = getSettings();
    }
    
    updateSettings() {
        this.settings = getSettings();
    }
    
    isConfigured() {
        return this.settings.webAppUrl && this.settings.webAppUrl.length > 0;
    }
    
    async request(action, params = {}) {
        if (!this.isConfigured()) {
            throw new Error('Configure Web App URL in Settings');
        }
        
        const url = new URL(this.settings.webAppUrl);
        url.searchParams.append('action', action);
        
        for (const [key, value] of Object.entries(params)) {
            if (typeof value === 'object') {
                url.searchParams.append(key, JSON.stringify(value));
            } else {
                url.searchParams.append(key, value);
            }
        }
        
        try {
            const response = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
            if (!response.ok) throw new Error('Network error');
            const data = await response.json();
            if (data.success === false) throw new Error(data.error || 'Unknown error');
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    
    async postRequest(action, payload = {}) {
        if (!this.isConfigured()) {
            throw new Error('Configure Web App URL in Settings');
        }
        
        const url = this.settings.webAppUrl;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                redirect: 'follow',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action, ...payload })
            });
            if (!response.ok) throw new Error('Network error');
            const data = await response.json();
            if (data.success === false) throw new Error(data.error || 'Unknown error');
            return data;
        } catch (error) {
            console.error('API POST Error:', error);
            throw error;
        }
    }
    
    // ===== GET DATA =====
    async getAllData() { return await this.request('getData'); }
    async getTradesData() { return await this.request('getTradesData'); }
    async getPositionsData() { return await this.request('getPositionsData'); }
    async getStrategiesData() { return await this.request('getStrategiesData'); }
    async getRemindersData() { return await this.request('getRemindersData'); }
    async getPortfolioData() { return await this.request('getPortfolioData'); }
    
    // ===== TRADES =====
    async addTrade(data) { return await this.request('addTrade', { data }); }
    async updateTrade(data) { return await this.request('updateTrade', { data }); }
    async deleteTrade(rowIndex) { return await this.request('deleteTrade', { rowIndex }); }
    
    // ===== POSITIONS =====
    async addPosition(data) { return await this.request('addPosition', { data }); }
    async updatePosition(data) { return await this.request('updatePosition', { data }); }
    async deletePosition(rowIndex) { return await this.request('deletePosition', { rowIndex }); }
    async closePosition(data) { return await this.request('closePosition', { data }); }
    
    // ===== STRATEGIES =====
    async addStrategy(data) { return await this.request('addStrategy', { data }); }
    async updateStrategy(data) { return await this.request('updateStrategy', { data }); }
    async deleteStrategy(rowIndex) { return await this.request('deleteStrategy', { rowIndex }); }
    
    // ===== REMINDERS =====
    async addReminder(data) { return await this.request('addReminder', { data }); }
    async updateReminder(data) { return await this.request('updateReminder', { data }); }
    async deleteReminder(rowIndex) { return await this.request('deleteReminder', { rowIndex }); }
    async dismissReminder(rowIndex) { return await this.request('dismissReminder', { rowIndex }); }
    
    // ===== PORTFOLIO =====
    async updatePortfolio(data) { return await this.request('updatePortfolio', { data }); }
    
    // ===== LIVE PRICES (OKX) =====
    async getLivePrices(pairs) { return await this.request('getLivePrices', { pairs }); }
    async refreshPositionPrices() { return await this.request('refreshPositionPrices'); }
    
    // ===== OKX TRADE SYNC =====
    async setOKXCredentials(data) { return await this.postRequest('setOKXCredentials', data); }
    async getOKXStatus() { return await this.request('getOKXStatus'); }
    async testOKXConnection() { return await this.request('testOKXConnection'); }
    async syncOKXData() { return await this.request('syncOKXData'); }
    async getOKXBalance() { return await this.request('getOKXBalance'); }
    async debugOKXPositions() { return await this.request('debugOKXPositions'); }
    
    // ===== SCREENSHOT (POST - base64 too large for GET) =====
    async uploadScreenshot(data) { return await this.postRequest('uploadScreenshot', data); }
    
    // ===== CLOSE POSITION WITH SCREENSHOT =====
    async closePositionWithScreenshot(data) { return await this.postRequest('closePositionWithScreenshot', data); }
    
    // ===== TEST =====
    async testConnection() {
        try {
            await this.request('getData');
            return { success: true, message: 'Connected!' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

// Cache manager
class CacheManager {
    constructor() { this.key = CONFIG.STORAGE_KEYS.CACHE; }
    
    save(data) {
        try {
            localStorage.setItem(this.key, JSON.stringify({ timestamp: Date.now(), data }));
        } catch (e) { console.warn('Cache save failed:', e); }
    }
    
    load() {
        try {
            const cached = localStorage.getItem(this.key);
            if (cached) return JSON.parse(cached);
        } catch (e) { console.warn('Cache load failed:', e); }
        return null;
    }
    
    clear() { localStorage.removeItem(this.key); }
}

window.cryptoAPI = new CryptoAPI();
window.cacheManager = new CacheManager();
