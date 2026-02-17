// ===================================
// CryptoTrader Pro v2 - Main App
// ===================================

class CryptoTraderApp {
    constructor() {
        this.data = {
            trades: [],
            positions: [],
            strategies: [],
            reminders: [],
            portfolio: []
        };
        
        this.chart = null;
        this.pnlChart = null;
        this.syncInterval = null;
        this.filterStartDate = null;
        this.filterEndDate = null;
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        this.setupAmountInputs();
        this.closePositionData = null;
        this.closeScreenshotFile = null;
        this.tradeScreenshotFile = null;
        this.tradeScreenshotUrl = '';
        this.isSaving = false;
        this.livePrices = {};
        this.lastPriceRefresh = 0;
        this.priceRefreshInterval = null;
        this.strategyRotatorIndex = 0;
        this.strategyRotatorInterval = null;
        this.loadFromCache();
        await this.syncData();
        this.setupAutoSync();
        this.applyCustomizations();
        this.renderDashboard();
        this.startStrategyRotator();
        this.renderReminderTicker();
    }
    
    setupAmountInputs() {
        document.querySelectorAll('.amount-input').forEach(input => setupCommaInput(input));
    }
    
    setupEventListeners() {
        // Menu button (mobile)
        document.getElementById('menuBtn').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
            document.getElementById('sidebarOverlay').classList.toggle('active');
        });
        
        document.getElementById('sidebarOverlay').addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('active');
            document.getElementById('sidebarOverlay').classList.remove('active');
        });
        
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => this.handleNavigation(item));
        });
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            item.addEventListener('click', () => this.handleNavigation(item));
        });
        
        // Refresh
        document.getElementById('refreshBtn').addEventListener('click', () => this.handleRefresh());
        
        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
        document.getElementById('settingsClose').addEventListener('click', () => this.closeSettings());
        document.getElementById('settingsCancel').addEventListener('click', () => this.closeSettings());
        document.getElementById('settingsSave').addEventListener('click', () => this.handleSaveSettings());
        document.getElementById('testConnection').addEventListener('click', () => this.handleTestConnection());
        document.getElementById('hardRefreshBtn')?.addEventListener('click', () => this.hardRefresh());
        
        // Wallpaper & Icon
        document.getElementById('wallpaperUpload')?.addEventListener('change', (e) => this.handleWallpaperUpload(e));
        document.getElementById('removeWallpaper')?.addEventListener('click', () => this.handleRemoveWallpaper());
        document.getElementById('iconUpload')?.addEventListener('change', (e) => this.handleIconUpload(e));
        document.getElementById('resetIcon')?.addEventListener('click', () => this.handleResetIcon());
        document.getElementById('addPairBtn')?.addEventListener('click', () => this.handleAddPair());
        document.getElementById('newPairInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.handleAddPair(); });
        document.getElementById('tradeScreenshot')?.addEventListener('change', (e) => this.handleTradeScreenshot(e));
        document.getElementById('tradeScreenshotRemove')?.addEventListener('click', () => this.removeTradeScreenshot());
        
        // Deposit/Withdraw
        document.getElementById('depositBtn')?.addEventListener('click', () => this.handleDeposit());
        document.getElementById('withdrawBtn')?.addEventListener('click', () => this.handleWithdraw());
        document.getElementById('clearTransactionsBtn')?.addEventListener('click', () => this.clearTransactions());
        
        // Close position screenshot
        document.getElementById('closeScreenshot')?.addEventListener('change', (e) => this.handleCloseScreenshot(e));
        document.getElementById('closeExitPrice')?.addEventListener('input', () => this.updateClosePnLPreview());
        
        // Add buttons (no addTradeBtn - trades only come from closed positions)
        document.getElementById('addPositionBtn')?.addEventListener('click', () => this.openPositionModal());
        document.getElementById('refreshPricesBtn')?.addEventListener('click', () => this.refreshLivePrices());
        document.getElementById('addStrategyBtn')?.addEventListener('click', () => this.openStrategyModal());
        document.getElementById('addReminderBtn')?.addEventListener('click', () => this.openReminderModal());
        
        // Filter
        document.getElementById('applyFilterBtn')?.addEventListener('click', () => this.applyDateFilter());
        document.getElementById('resetFilterBtn')?.addEventListener('click', () => this.resetDateFilter());
    }
    
    handleNavigation(item) {
        const tab = item.dataset.tab;
        
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll(`.nav-item[data-tab="${tab}"]`).forEach(i => i.classList.add('active'));
        document.querySelectorAll('.bottom-nav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll(`.bottom-nav-item[data-tab="${tab}"]`).forEach(i => i.classList.add('active'));
        
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        const tabEl = document.getElementById(`tab-${tab}`);
        if (tabEl) tabEl.classList.add('active');
        
        document.getElementById('sidebar').classList.remove('active');
        document.getElementById('sidebarOverlay').classList.remove('active');
        
        this.renderTab(tab);
    }
    
    renderTab(tab) {
        // Stop price refresh when leaving positions
        if (tab !== 'positions' && this.priceRefreshInterval) {
            clearInterval(this.priceRefreshInterval);
            this.priceRefreshInterval = null;
        }
        
        switch (tab) {
            case 'dashboard': this.renderDashboard(); break;
            case 'trades': this.renderTradesTab(); break;
            case 'positions': 
                this.renderPositionsTab();
                this.startPriceAutoRefresh();
                break;
            case 'strategies': this.renderStrategiesTab(); break;
            case 'reminders': this.renderRemindersTab(); break;
        }
    }
    
    async handleRefresh() {
        const btn = document.getElementById('refreshBtn');
        if (btn) btn.classList.add('spinning');
        await this.syncData();
        setTimeout(() => { if (btn) btn.classList.remove('spinning'); }, 1000);
    }
    
    // ===== DATA SYNC =====
    
    async syncData() {
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) {
            syncStatus.classList.add('syncing');
            const syncText = syncStatus.querySelector('.sync-text');
            if (syncText) syncText.textContent = 'Syncing...';
        }
        
        try {
            if (!cryptoAPI.isConfigured()) {
                this.loadDemoData();
                if (syncStatus) {
                    syncStatus.classList.remove('syncing');
                    const syncText = syncStatus.querySelector('.sync-text');
                    if (syncText) syncText.textContent = 'Demo Mode';
                }
                this.showToast('Running in Demo Mode', 'warning');
                return;
            }
            
            const result = await cryptoAPI.getAllData();
            
            this.data = {
                trades: result.data.trades || [],
                positions: result.data.positions || [],
                strategies: result.data.strategies || [],
                reminders: result.data.reminders || [],
                portfolio: result.data.portfolio || []
            };
            
            cacheManager.save(this.data);
            
            if (syncStatus) {
                syncStatus.classList.remove('syncing', 'error');
                const syncText = syncStatus.querySelector('.sync-text');
                if (syncText) syncText.textContent = 'Synced';
            }
            
            const activeTab = document.querySelector('.nav-item.active')?.dataset.tab || 'dashboard';
            this.renderTab(activeTab);
            
            this.showToast('Data synced!', 'success');
        } catch (error) {
            console.error('Sync error:', error);
            if (syncStatus) {
                syncStatus.classList.remove('syncing');
                syncStatus.classList.add('error');
                const syncText = syncStatus.querySelector('.sync-text');
                if (syncText) syncText.textContent = 'Error';
            }
            this.showToast(error.message, 'error');
        }
    }
    
    loadDemoData() {
        const today = getTodayStr();
        const d = (offset) => {
            const dt = new Date();
            dt.setDate(dt.getDate() - offset);
            return getDateStr(dt);
        };

        this.data = {
            trades: [
                { rowIndex: 2, date: d(0), pair: 'BTC/USDT', type: 'LONG', strategy: 'Breakout', entryPrice: 87200, exitPrice: 88450, quantity: 0.05, stopLoss: 86500, takeProfit: 89000, pnl: 62.50, pnlPercent: 1.43, status: 'CLOSED', notes: 'Clean breakout above 87k resistance' },
                { rowIndex: 3, date: d(1), pair: 'ETH/USDT', type: 'SHORT', strategy: 'Mean Reversion', entryPrice: 3420, exitPrice: 3380, quantity: 2, stopLoss: 3480, takeProfit: 3350, pnl: 80.00, pnlPercent: 1.17, status: 'CLOSED', notes: 'Faded the pump at daily resistance' },
                { rowIndex: 4, date: d(1), pair: 'SOL/USDT', type: 'LONG', strategy: 'Trend Following', entryPrice: 185.5, exitPrice: 178.2, quantity: 10, stopLoss: 180, takeProfit: 200, pnl: -73.00, pnlPercent: -3.94, status: 'CLOSED', notes: 'Stopped out - overall market dumped' },
                { rowIndex: 5, date: d(2), pair: 'BTC/USDT', type: 'LONG', strategy: 'Breakout', entryPrice: 86100, exitPrice: 87500, quantity: 0.08, stopLoss: 85500, takeProfit: 89000, pnl: 112.00, pnlPercent: 1.63, status: 'CLOSED', notes: 'Strong 4H candle close above MA' },
                { rowIndex: 6, date: d(3), pair: 'DOGE/USDT', type: 'LONG', strategy: 'Momentum', entryPrice: 0.168, exitPrice: 0.175, quantity: 5000, stopLoss: 0.16, takeProfit: 0.19, pnl: 35.00, pnlPercent: 4.17, status: 'CLOSED', notes: 'Quick scalp on momentum' },
                { rowIndex: 7, date: d(4), pair: 'ETH/USDT', type: 'LONG', strategy: 'Support Bounce', entryPrice: 3350, exitPrice: 3290, quantity: 1.5, stopLoss: 3300, takeProfit: 3500, pnl: -90.00, pnlPercent: -1.79, status: 'CLOSED', notes: 'Support broke' },
                { rowIndex: 8, date: d(5), pair: 'BNB/USDT', type: 'LONG', strategy: 'Breakout', entryPrice: 620, exitPrice: 645, quantity: 2, stopLoss: 610, takeProfit: 660, pnl: 50.00, pnlPercent: 4.03, status: 'CLOSED', notes: 'Binance announcement catalyst' },
                { rowIndex: 9, date: d(6), pair: 'XRP/USDT', type: 'SHORT', strategy: 'Mean Reversion', entryPrice: 2.35, exitPrice: 2.28, quantity: 500, stopLoss: 2.42, takeProfit: 2.20, pnl: 35.00, pnlPercent: 2.98, status: 'CLOSED', notes: 'Overbought on RSI' },
                { rowIndex: 10, date: d(7), pair: 'SOL/USDT', type: 'LONG', strategy: 'Trend Following', entryPrice: 175, exitPrice: 186, quantity: 8, stopLoss: 170, takeProfit: 195, pnl: 88.00, pnlPercent: 6.29, status: 'CLOSED', notes: 'Trend continuation after pullback' },
                { rowIndex: 11, date: d(8), pair: 'AVAX/USDT', type: 'LONG', strategy: 'Momentum', entryPrice: 38, exitPrice: 36.5, quantity: 30, stopLoss: 36, takeProfit: 42, pnl: -45.00, pnlPercent: -3.95, status: 'CLOSED', notes: 'Lost momentum' },
            ],
            positions: [
                { rowIndex: 2, dateOpened: d(0), pair: 'BTC/USDT', type: 'LONG', strategy: 'Trend Following', entryPrice: 87800, currentPrice: 88200, quantity: 0.1, stopLoss: 86500, takeProfit: 92000, notes: 'Riding the daily trend' },
                { rowIndex: 3, dateOpened: d(1), pair: 'ETH/USDT', type: 'LONG', strategy: 'Breakout', entryPrice: 3400, currentPrice: 3455, quantity: 3, stopLoss: 3300, takeProfit: 3700, notes: 'Breakout above descending trendline' },
                { rowIndex: 4, dateOpened: d(0), pair: 'SOL/USDT', type: 'SHORT', strategy: 'Resistance Rejection', entryPrice: 190.5, currentPrice: 188.2, quantity: 15, stopLoss: 195, takeProfit: 178, notes: 'Double top at 190 resistance' },
            ],
            strategies: [
                { rowIndex: 2, name: 'Breakout', description: 'Trade breakouts above key resistance with volume confirmation.', timeframe: '4H', indicators: 'Volume, RSI, Bollinger Bands', winRate: 68, totalTrades: 18, createdDate: d(60) },
                { rowIndex: 3, name: 'Mean Reversion', description: 'Fade extreme moves back to VWAP or moving average.', timeframe: '1H', indicators: 'VWAP, RSI, Stochastic', winRate: 62, totalTrades: 12, createdDate: d(45) },
                { rowIndex: 4, name: 'Trend Following', description: 'Ride momentum with trailing stops. Enter on pullbacks to EMA.', timeframe: '1D', indicators: 'EMA 20/50, MACD, ADX', winRate: 58, totalTrades: 10, createdDate: d(30) },
                { rowIndex: 5, name: 'Momentum', description: 'Catch momentum surges. Quick in/out based on volume spike.', timeframe: '15M', indicators: 'RSI, Volume, OBV', winRate: 71, totalTrades: 7, createdDate: d(20) },
            ],
            reminders: [
                { rowIndex: 2, date: d(0), time: '09:00', pair: 'BTC/USDT', message: 'Check BTC daily close above 88k resistance', type: 'PRICE_ALERT', status: 'ACTIVE' },
                { rowIndex: 3, date: d(0), time: '14:00', pair: 'ETH/USDT', message: 'ETH upgrade - potential volatility', type: 'NEWS', status: 'ACTIVE' },
                { rowIndex: 4, date: d(-1), time: '20:30', pair: '', message: 'FOMC Meeting Minutes Release', type: 'EVENT', status: 'ACTIVE' },
                { rowIndex: 5, date: d(-2), time: '08:00', pair: 'SOL/USDT', message: 'Check SOL if it reclaims 190 level', type: 'STRATEGY', status: 'ACTIVE' },
            ],
            portfolio: [
                { date: d(30), balance: 5000 },
                { date: d(27), balance: 5180 },
                { date: d(24), balance: 5320 },
                { date: d(21), balance: 5150 },
                { date: d(18), balance: 5640 },
                { date: d(15), balance: 5890 },
                { date: d(12), balance: 5720 },
                { date: d(9), balance: 6280 },
                { date: d(6), balance: 6530 },
                { date: d(3), balance: 7100 },
                { date: d(0), balance: 7354.50 },
            ]
        };
    }
    
    loadFromCache() {
        const cached = cacheManager.load();
        if (cached && cached.data) this.data = cached.data;
    }
    
    setupAutoSync() {
        const settings = getSettings();
        if (this.syncInterval) clearInterval(this.syncInterval);
        if (settings.autoSync && cryptoAPI.isConfigured()) {
            this.syncInterval = setInterval(() => this.syncData(), CONFIG.APP.AUTO_SYNC_INTERVAL);
        }
    }
    
    // ===== PORTFOLIO BALANCE UPDATE =====
    
    getComputedBalance() {
        const settings = getSettings();
        const totalDeposits = (settings.transactions || []).filter(t => t.type === 'DEPOSIT').reduce((s, t) => s + parseFloat(t.amount), 0);
        const totalWithdrawals = (settings.transactions || []).filter(t => t.type === 'WITHDRAW').reduce((s, t) => s + parseFloat(t.amount), 0);
        const netDeposited = totalDeposits - totalWithdrawals;
        
        const closed = (this.data.trades || []).filter(t => t.status === 'CLOSED');
        const totalPnL = closed.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
        
        return Math.round((netDeposited + totalPnL) * 100) / 100;
    }
    
    updatePortfolioBalance() {
        const newBalance = this.getComputedBalance();
        const today = getTodayStr();
        const portfolio = this.data.portfolio || [];
        
        const todayEntry = portfolio.find(p => getDateStr(p.date) === today);
        if (todayEntry) {
            todayEntry.balance = newBalance;
        } else {
            portfolio.push({ date: today, balance: newBalance });
        }
        
        this.data.portfolio = portfolio;
        
        if (cryptoAPI.isConfigured()) {
            cryptoAPI.updatePortfolio({ date: today, balance: newBalance }).catch(err => {
                console.warn('Portfolio sync failed:', err);
            });
        }
        
        cacheManager.save(this.data);
    }
    
    // ===== COMPUTED STATS =====
    
    getStats() {
        const trades = this.data.trades || [];
        const closed = trades.filter(t => t.status === 'CLOSED');
        const wins = closed.filter(t => (parseFloat(t.pnl) || 0) > 0);
        const losses = closed.filter(t => (parseFloat(t.pnl) || 0) <= 0);
        
        const totalPnL = closed.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
        const winRate = closed.length > 0 ? (wins.length / closed.length * 100) : 0;
        
        const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + parseFloat(t.pnl), 0) / wins.length : 0;
        const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + parseFloat(t.pnl), 0) / losses.length) : 0;
        const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;
        const bestTrade = closed.length > 0 ? Math.max(...closed.map(t => parseFloat(t.pnl))) : 0;
        const worstTrade = closed.length > 0 ? Math.min(...closed.map(t => parseFloat(t.pnl))) : 0;
        
        // Today's P&L
        const today = getTodayStr();
        const todayTrades = closed.filter(t => getDateStr(t.date) === today);
        const todayPnL = todayTrades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
        
        // Unrealized P&L from open positions
        const positions = this.data.positions || [];
        const unrealizedPnL = positions.reduce((s, p) => {
            const entry = parseFloat(p.entryPrice) || 0;
            const current = parseFloat(p.currentPrice) || entry;
            const qty = parseFloat(p.quantity) || 0;
            return s + (p.type === 'LONG' ? (current - entry) * qty : (entry - current) * qty);
        }, 0);
        
        // Win/Loss streaks
        const sortedClosed = [...closed].sort((a, b) => new Date(a.date) - new Date(b.date));
        let winStreak = 0, lossStreak = 0, currentWinStreak = 0, currentLossStreak = 0;
        sortedClosed.forEach(t => {
            if ((parseFloat(t.pnl) || 0) > 0) {
                currentWinStreak++;
                currentLossStreak = 0;
                winStreak = Math.max(winStreak, currentWinStreak);
            } else {
                currentLossStreak++;
                currentWinStreak = 0;
                lossStreak = Math.max(lossStreak, currentLossStreak);
            }
        });
        
        const portfolio = this.data.portfolio || [];
        const currentBalance = this.getComputedBalance();
        
        return {
            totalTrades: closed.length, openPositions: positions.length,
            totalPnL, winRate, wins: wins.length, losses: losses.length,
            avgWin, avgLoss, profitFactor, bestTrade, worstTrade,
            todayPnL, unrealizedPnL, winStreak, lossStreak, currentBalance
        };
    }
    
    // ===== DASHBOARD (with Analytics merged in) =====
    
    renderDashboard() {
        const stats = this.getStats();
        const el = (id) => document.getElementById(id);
        
        // Main stat cards
        if (el('currentBalance')) el('currentBalance').textContent = formatCurrency(stats.currentBalance);
        if (el('totalPnL')) {
            el('totalPnL').textContent = formatCurrency(stats.totalPnL);
            el('totalPnL').className = `stat-value ${getValueClass(stats.totalPnL)}`;
        }
        if (el('todayPnL')) {
            el('todayPnL').textContent = (stats.todayPnL >= 0 ? '+' : '') + formatCurrency(stats.todayPnL);
            el('todayPnL').className = `stat-value ${getValueClass(stats.todayPnL)}`;
        }
        if (el('winRate')) el('winRate').textContent = stats.winRate.toFixed(1) + '%';
        if (el('totalTrades')) el('totalTrades').textContent = stats.totalTrades;
        if (el('openPositions')) el('openPositions').textContent = stats.openPositions;
        
        // Analytics mini cards
        if (el('profitFactor')) {
            el('profitFactor').textContent = stats.profitFactor.toFixed(2);
            el('profitFactor').className = `analytics-value ${stats.profitFactor >= 1 ? 'positive' : 'negative'}`;
        }
        if (el('aAvgWin')) el('aAvgWin').textContent = formatCurrency(stats.avgWin);
        if (el('aAvgLoss')) el('aAvgLoss').textContent = formatCurrency(stats.avgLoss);
        if (el('aBestTrade')) el('aBestTrade').textContent = formatCurrency(stats.bestTrade);
        if (el('aWorstTrade')) el('aWorstTrade').textContent = formatCurrency(stats.worstTrade);
        if (el('unrealizedPnL')) {
            el('unrealizedPnL').textContent = (stats.unrealizedPnL >= 0 ? '+' : '') + formatCurrency(stats.unrealizedPnL);
            el('unrealizedPnL').className = `analytics-value ${getValueClass(stats.unrealizedPnL)}`;
        }
        if (el('winStreak')) {
            el('winStreak').textContent = stats.winStreak;
            el('winStreak').className = 'analytics-value positive';
        }
        if (el('lossStreak')) {
            el('lossStreak').textContent = stats.lossStreak;
            el('lossStreak').className = 'analytics-value negative';
        }
        
        // Win/Loss bar
        const winBar = el('winLossBar');
        if (winBar && stats.totalTrades > 0) {
            const winPct = (stats.wins / stats.totalTrades * 100);
            winBar.innerHTML = `
                <div class="wl-bar">
                    <div class="wl-win" style="width:${winPct}%">${stats.wins}W</div>
                    <div class="wl-loss" style="width:${100 - winPct}%">${stats.losses}L</div>
                </div>
            `;
        } else if (winBar) {
            winBar.innerHTML = '<div class="wl-bar"><div class="wl-win" style="width:50%;opacity:0.3">0W</div><div class="wl-loss" style="width:50%;opacity:0.3">0L</div></div>';
        }
        
        // Charts
        this.renderPortfolioChart();
        this.renderPnLChart();
        
        // Breakdowns
        this.renderPairBreakdown();
        this.renderStrategyBreakdown();
        
        // Recent + Reminders
        this.renderRecentTrades();
        this.renderActiveReminders();
        
        // Refresh header ticker + sidebar rotator
        this.renderReminderTicker();
        this.renderStrategyRotator();
    }
    
    renderPortfolioChart() {
        const ctx = document.getElementById('portfolioChart');
        if (!ctx) return;
        if (this.chart) this.chart.destroy();
        
        const portfolio = this.data.portfolio || [];
        const labels = portfolio.map(p => formatDate(p.date));
        const balances = portfolio.map(p => parseFloat(p.balance));
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Portfolio',
                    data: balances,
                    borderColor: '#00ff88',
                    backgroundColor: 'rgba(0, 255, 136, 0.08)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: '#00ff88',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#606070', maxRotation: 45, font: { size: 10 } } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#606070', callback: v => '$' + v.toLocaleString(), font: { size: 10 } } }
                }
            }
        });
    }
    
    renderPnLChart() {
        const ctx = document.getElementById('pnlChart');
        if (!ctx) return;
        if (this.pnlChart) this.pnlChart.destroy();
        
        const trades = (this.data.trades || []).filter(t => t.status === 'CLOSED').sort((a, b) => new Date(a.date) - new Date(b.date));
        
        let cumPnL = 0;
        const data = trades.map(t => {
            cumPnL += parseFloat(t.pnl) || 0;
            return { date: formatDate(t.date), pnl: cumPnL };
        });
        
        this.pnlChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.date),
                datasets: [{
                    label: 'Cumulative P&L',
                    data: data.map(d => d.pnl),
                    borderColor: '#4facfe',
                    backgroundColor: 'rgba(79, 172, 254, 0.08)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: data.map(d => d.pnl >= 0 ? '#00ff88' : '#ff4757'),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#606070', maxRotation: 45, font: { size: 10 } } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#606070', callback: v => '$' + v, font: { size: 10 } } }
                }
            }
        });
    }
    
    renderPairBreakdown() {
        const container = document.getElementById('pairBreakdown');
        if (!container) return;
        
        const trades = (this.data.trades || []).filter(t => t.status === 'CLOSED');
        if (trades.length === 0) { container.innerHTML = '<div class="empty-state"><p>No trades yet</p></div>'; return; }
        
        const pairStats = {};
        trades.forEach(t => {
            if (!pairStats[t.pair]) pairStats[t.pair] = { pnl: 0, count: 0, wins: 0 };
            pairStats[t.pair].pnl += parseFloat(t.pnl) || 0;
            pairStats[t.pair].count++;
            if ((parseFloat(t.pnl) || 0) > 0) pairStats[t.pair].wins++;
        });
        
        container.innerHTML = Object.entries(pairStats).sort((a, b) => b[1].pnl - a[1].pnl).map(([pair, data]) => `
            <div class="pair-stat-row">
                <span class="pair-name" style="color:${getPairColor(pair)}">${pair}</span>
                <span class="pair-trades">${data.count} trades (${(data.wins / data.count * 100).toFixed(0)}% WR)</span>
                <span class="pair-pnl ${getValueClass(data.pnl)}">${data.pnl >= 0 ? '+' : ''}${formatCurrency(data.pnl)}</span>
            </div>
        `).join('');
    }
    
    renderStrategyBreakdown() {
        const container = document.getElementById('strategyBreakdown');
        if (!container) return;
        
        const trades = (this.data.trades || []).filter(t => t.status === 'CLOSED');
        if (trades.length === 0) { container.innerHTML = '<div class="empty-state"><p>No trades yet</p></div>'; return; }
        
        const stratStats = {};
        trades.forEach(t => {
            const key = t.strategy || 'Unknown';
            if (!stratStats[key]) stratStats[key] = { pnl: 0, count: 0, wins: 0 };
            stratStats[key].pnl += parseFloat(t.pnl) || 0;
            stratStats[key].count++;
            if ((parseFloat(t.pnl) || 0) > 0) stratStats[key].wins++;
        });
        
        container.innerHTML = Object.entries(stratStats).sort((a, b) => b[1].pnl - a[1].pnl).map(([strat, data]) => `
            <div class="pair-stat-row">
                <span class="pair-name">${strat}</span>
                <span class="pair-trades">${data.count} trades (${(data.wins / data.count * 100).toFixed(0)}% WR)</span>
                <span class="pair-pnl ${getValueClass(data.pnl)}">${data.pnl >= 0 ? '+' : ''}${formatCurrency(data.pnl)}</span>
            </div>
        `).join('');
    }
    
    renderRecentTrades() {
        const container = document.getElementById('recentTrades');
        if (!container) return;
        
        const trades = this.data.trades || [];
        if (trades.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No trades yet</p></div>';
            return;
        }
        
        const recent = [...trades].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        
        container.innerHTML = recent.map(t => {
            const pnl = parseFloat(t.pnl) || 0;
            return `
                <div class="recent-item">
                    <div class="recent-icon" style="color:${getPairColor(t.pair)}">●</div>
                    <div class="recent-info">
                        <div class="recent-title">${t.pair} <span class="type-badge ${t.type.toLowerCase()}">${t.type}</span></div>
                        <div class="recent-date">${formatDate(t.date)} · ${t.strategy || '-'}</div>
                    </div>
                    <div class="recent-amount ${getValueClass(pnl)}">${pnl >= 0 ? '+' : ''}${formatCurrency(pnl)}</div>
                </div>
            `;
        }).join('');
    }
    
    renderActiveReminders() {
        const container = document.getElementById('activeReminders');
        if (!container) return;
        
        const reminders = (this.data.reminders || []).filter(r => r.status === 'ACTIVE');
        const icons = { PRICE_ALERT: '📊', NEWS: '📰', EVENT: '📅', STRATEGY: '⚡', GENERAL: '💡' };
        
        if (reminders.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No active reminders</p></div>';
            return;
        }
        
        container.innerHTML = reminders.slice(0, 4).map(r => `
            <div class="reminder-card">
                <div class="reminder-icon">${icons[r.type] || '💡'}</div>
                <div class="reminder-info">
                    <div class="reminder-msg">${r.message}</div>
                    <div class="reminder-meta">${r.pair ? r.pair + ' · ' : ''}${formatDate(r.date)} ${r.time || ''}</div>
                </div>
            </div>
        `).join('');
    }
    
    // ===== TRADES TAB =====
    
    renderTradesTab() {
        if (!this.filterStartDate || !this.filterEndDate) {
            const now = new Date();
            const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
            this.filterStartDate = getDateStr(twoWeeksAgo);
            this.filterEndDate = getDateStr(now);
        }
        
        this.setupFilterDates();
        
        const trades = this.filterByDateRange(this.data.trades || [], this.filterStartDate, this.filterEndDate);
        const tbody = document.getElementById('tradesTableBody');
        if (!tbody) return;
        
        const totalPnL = trades.filter(t => t.status === 'CLOSED').reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
        const wins = trades.filter(t => (parseFloat(t.pnl) || 0) > 0).length;
        const losses = trades.filter(t => t.status === 'CLOSED' && (parseFloat(t.pnl) || 0) <= 0).length;
        
        const el = (id) => document.getElementById(id);
        if (el('filterPnL')) {
            el('filterPnL').textContent = formatCurrency(totalPnL);
            el('filterPnL').className = `summary-value ${getValueClass(totalPnL)}`;
        }
        if (el('filterWins')) el('filterWins').textContent = wins;
        if (el('filterLosses')) el('filterLosses').textContent = losses;
        if (el('filterTotal')) el('filterTotal').textContent = trades.length;
        
        if (trades.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="empty-cell">No trades for selected date range</td></tr>';
            return;
        }
        
        const sorted = [...trades].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        tbody.innerHTML = sorted.map(t => {
            const pnl = parseFloat(t.pnl) || 0;
            const pnlPct = parseFloat(t.pnlPercent) || 0;
            const hasScreenshot = !!(t.screenshotUrl || localStorage.getItem(`ctp_screenshot_${t.rowIndex}`));
            return `
                <tr>
                    <td class="mono-text">${formatDate(t.date)}</td>
                    <td><span class="pair-badge" style="color:${getPairColor(t.pair)}">${t.pair}</span></td>
                    <td><span class="type-badge ${t.type.toLowerCase()}">${t.type === 'LONG' ? '↑ LONG' : '↓ SHORT'}</span></td>
                    <td class="mono-text">${t.strategy || '-'}</td>
                    <td class="mono-text">${formatWithCommas(t.entryPrice)}</td>
                    <td class="mono-text">${t.exitPrice ? formatWithCommas(t.exitPrice) : '—'}</td>
                    <td class="mono-text ${getValueClass(pnl)}">${pnl >= 0 ? '+' : ''}$${formatNumber(Math.abs(pnl))}</td>
                    <td class="mono-text">${t.duration || '-'}</td>
                    <td class="mono-text">${hasScreenshot ? '<span class="screenshot-badge" title="Has chart screenshot">📸</span>' : ''}</td>
                    <td class="actions-cell">
                        <button class="action-btn view" onclick="app.viewTradeDetails(${t.rowIndex})">👁</button>
                        <button class="action-btn edit" onclick="app.editTrade(${t.rowIndex})">✎</button>
                        <button class="action-btn delete" onclick="app.deleteTrade(${t.rowIndex})">✕</button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    setupFilterDates() {
        const startInput = document.getElementById('filterStartDate');
        const endInput = document.getElementById('filterEndDate');
        if (startInput && !startInput._flatpickr) {
            flatpickr(startInput, { dateFormat: 'Y-m-d', altInput: true, altFormat: 'M d', theme: 'dark', defaultDate: this.filterStartDate, onChange: (s, d) => { this.filterStartDate = d; } });
        }
        if (endInput && !endInput._flatpickr) {
            flatpickr(endInput, { dateFormat: 'Y-m-d', altInput: true, altFormat: 'M d', theme: 'dark', defaultDate: this.filterEndDate, onChange: (s, d) => { this.filterEndDate = d; } });
        }
    }
    
    filterByDateRange(data, startDate, endDate) {
        if (!data || data.length === 0 || !startDate || !endDate) return data || [];
        return data.filter(item => {
            const itemDate = getDateStr(item.date || item.dateOpened);
            return itemDate >= startDate && itemDate <= endDate;
        });
    }
    
    applyDateFilter() {
        const s = document.getElementById('filterStartDate');
        const e = document.getElementById('filterEndDate');
        if (s && e) {
            this.filterStartDate = s.value;
            this.filterEndDate = e.value;
            if (this.filterStartDate > this.filterEndDate) { this.showToast('Start date must be before end date', 'warning'); return; }
            this.renderTradesTab();
            this.showToast('Filter applied!', 'success');
        }
    }
    
    resetDateFilter() {
        const now = new Date();
        const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
        this.filterStartDate = getDateStr(twoWeeksAgo);
        this.filterEndDate = getDateStr(now);
        const s = document.getElementById('filterStartDate');
        const e = document.getElementById('filterEndDate');
        if (s?._flatpickr) s._flatpickr.setDate(this.filterStartDate, true);
        if (e?._flatpickr) e._flatpickr.setDate(this.filterEndDate, true);
        this.renderTradesTab();
        this.showToast('Filter reset', 'info');
    }
    
    // ===== TRADE MODAL =====
    
    // ===== PAIR HELPERS =====
    
    getAllPairs() {
        const settings = getSettings();
        const custom = settings.customPairs || [];
        const removed = settings.removedPairs || [];
        const all = [...CONFIG.PAIRS.filter(p => !removed.includes(p)), ...custom];
        return [...new Set(all)].sort();
    }
    
    populatePairDropdown(selectId, selectedValue) {
        const select = document.getElementById(selectId);
        if (!select) return;
        const pairs = this.getAllPairs();
        // If current value isn't in list (e.g. removed pair), still include it
        const options = [...pairs];
        if (selectedValue && !options.includes(selectedValue)) options.unshift(selectedValue);
        select.innerHTML = '<option value="">Select pair</option>' +
            options.map(p => `<option value="${p}"${p === selectedValue ? ' selected' : ''}>${p}</option>`).join('');
    }
    
    openTradeModal(editData = null) {
        const el = (id) => document.getElementById(id);
        if (el('tradeForm')) el('tradeForm').reset();
        if (el('tradeRowIndex')) el('tradeRowIndex').value = '';
        this.tradeScreenshotFile = null;
        this.tradeScreenshotUrl = '';
        
        // Populate pair dropdown
        this.populatePairDropdown('tradePair', editData?.pair || '');
        
        // Populate strategy dropdown
        const stratSelect = el('tradeStrategy');
        if (stratSelect) {
            const strategies = this.data.strategies || [];
            stratSelect.innerHTML = '<option value="">Select strategy</option>' +
                strategies.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
        }
        
        const dateInput = el('tradeDate');
        if (dateInput && !dateInput._flatpickr) {
            flatpickr(dateInput, { dateFormat: 'Y-m-d', altInput: true, altFormat: 'M d, Y', theme: 'dark' });
        }
        
        // Screenshot preview
        const previewEl = el('tradeScreenshotPreview');
        const removeBtn = el('tradeScreenshotRemove');
        if (previewEl) previewEl.innerHTML = '';
        if (removeBtn) removeBtn.style.display = 'none';
        
        if (editData) {
            if (el('tradeModalTitle')) el('tradeModalTitle').textContent = 'Edit Trade';
            if (el('tradeRowIndex')) el('tradeRowIndex').value = editData.rowIndex;
            if (dateInput?._flatpickr) dateInput._flatpickr.setDate(formatDateForInput(editData.date), true);
            else if (dateInput) dateInput.value = formatDateForInput(editData.date);
            if (el('tradePair')) el('tradePair').value = editData.pair;
            if (el('tradeType')) el('tradeType').value = editData.type;
            if (stratSelect) stratSelect.value = editData.strategy || '';
            if (el('tradeEntry')) el('tradeEntry').value = editData.entryPrice;
            if (el('tradeExit')) el('tradeExit').value = editData.exitPrice || '';
            if (el('tradeQty')) el('tradeQty').value = editData.quantity;
            if (el('tradeSL')) el('tradeSL').value = editData.stopLoss || '';
            if (el('tradeTP')) el('tradeTP').value = editData.takeProfit || '';
            if (el('tradeDuration')) el('tradeDuration').value = editData.duration || '';
            if (el('tradeNotes')) el('tradeNotes').value = editData.notes || '';
            
            // Load existing screenshot
            const ssUrl = editData.screenshotUrl || localStorage.getItem(`ctp_screenshot_${editData.rowIndex}`) || '';
            if (ssUrl && previewEl) {
                this.tradeScreenshotUrl = ssUrl;
                previewEl.innerHTML = `<img src="${ssUrl}" class="trade-ss-thumb" alt="Screenshot">`;
                if (removeBtn) removeBtn.style.display = 'inline-block';
            }
        } else {
            if (el('tradeModalTitle')) el('tradeModalTitle').textContent = 'New Trade';
            if (dateInput?._flatpickr) dateInput._flatpickr.setDate(getTodayStr(), true);
            else if (dateInput) dateInput.value = getTodayStr();
        }
        
        if (el('tradeModal')) el('tradeModal').classList.add('active');
        setTimeout(() => this.setupAmountInputs(), 100);
    }
    
    closeTradeModal() {
        document.getElementById('tradeModal')?.classList.remove('active');
    }
    
    async saveTradeEntry() {
        if (this.isSaving) return;
        const el = (id) => document.getElementById(id);
        const rowIndex = el('tradeRowIndex')?.value;
        const date = el('tradeDate')?.value;
        const pair = el('tradePair')?.value;
        const type = el('tradeType')?.value;
        const entryPrice = parseFormattedNumber(el('tradeEntry')?.value);
        
        if (!date || !pair || entryPrice <= 0) {
            this.showToast('Fill required fields (Date, Pair, Entry)', 'warning');
            return;
        }
        
        const exitPrice = parseFormattedNumber(el('tradeExit')?.value) || 0;
        const quantity = parseFormattedNumber(el('tradeQty')?.value) || 1;
        
        let pnl = 0, pnlPercent = 0;
        if (exitPrice > 0) {
            pnl = type === 'LONG' ? (exitPrice - entryPrice) * quantity : (entryPrice - exitPrice) * quantity;
            pnlPercent = type === 'LONG' ? ((exitPrice - entryPrice) / entryPrice * 100) : ((entryPrice - exitPrice) / entryPrice * 100);
        }
        
        // Handle screenshot
        let screenshotUrl = this.tradeScreenshotUrl || '';
        if (this.tradeScreenshotFile) {
            const base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(this.tradeScreenshotFile);
            });
            const fullDataUrl = `data:${this.tradeScreenshotFile.type};base64,${base64Data}`;
            screenshotUrl = fullDataUrl;
            
            if (cryptoAPI.isConfigured()) {
                try {
                    const uploadResult = await cryptoAPI.uploadScreenshot({
                        base64Data, mimeType: this.tradeScreenshotFile.type,
                        fileName: `${pair.replace('/', '-')}_trade_${date}_${Date.now()}.${this.tradeScreenshotFile.name.split('.').pop()}`
                    });
                    screenshotUrl = uploadResult.downloadUrl || uploadResult.fileUrl || fullDataUrl;
                } catch (e) { console.warn('Screenshot upload failed:', e); }
            }
        }
        
        const data = {
            date, pair, type,
            strategy: el('tradeStrategy')?.value || '',
            entryPrice, exitPrice: exitPrice || '',
            quantity,
            stopLoss: parseFormattedNumber(el('tradeSL')?.value) || '',
            takeProfit: parseFormattedNumber(el('tradeTP')?.value) || '',
            pnl: pnl.toFixed(2),
            pnlPercent: pnlPercent.toFixed(2),
            status: exitPrice > 0 ? 'CLOSED' : 'OPEN',
            notes: el('tradeNotes')?.value || '',
            duration: el('tradeDuration')?.value || '',
            screenshotUrl: screenshotUrl
        };
        
        if (rowIndex) data.rowIndex = parseInt(rowIndex);
        
        this.isSaving = true;
        try {
            this.showToast('Saving...', 'info');
            if (cryptoAPI.isConfigured()) {
                if (rowIndex) await cryptoAPI.updateTrade(data);
                else await cryptoAPI.addTrade(data);
                this.closeTradeModal();
                await this.syncData();
            } else {
                if (rowIndex) {
                    const idx = this.data.trades.findIndex(t => t.rowIndex == rowIndex);
                    if (idx > -1) this.data.trades[idx] = { ...this.data.trades[idx], ...data };
                } else {
                    data.rowIndex = Date.now();
                    this.data.trades.push(data);
                }
                // Save screenshot locally
                if (screenshotUrl && data.rowIndex) {
                    try { localStorage.setItem(`ctp_screenshot_${data.rowIndex || rowIndex}`, screenshotUrl); } catch (e) {}
                }
                cacheManager.save(this.data);
                this.updatePortfolioBalance();
                this.closeTradeModal();
                this.renderDashboard();
                this.renderTab(document.querySelector('.nav-item.active')?.dataset.tab || 'trades');
            }
            this.showToast('Trade saved!', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally { this.isSaving = false; }
    }
    
    editTrade(rowIndex) {
        const item = this.data.trades.find(t => t.rowIndex === rowIndex);
        if (item) this.openTradeModal(item);
    }
    
    async deleteTrade(rowIndex) {
        if (!confirm('Delete this trade?')) return;
        try {
            if (cryptoAPI.isConfigured()) {
                await cryptoAPI.deleteTrade(rowIndex);
                await this.syncData();
            } else {
                this.data.trades = this.data.trades.filter(t => t.rowIndex !== rowIndex);
                cacheManager.save(this.data);
                this.updatePortfolioBalance();
                this.renderDashboard();
                this.renderTab(document.querySelector('.nav-item.active')?.dataset.tab || 'trades');
            }
            this.showToast('Deleted!', 'success');
        } catch (error) { this.showToast(error.message, 'error'); }
    }
    
    viewTradeDetails(rowIndex) {
        const t = this.data.trades.find(tr => tr.rowIndex === rowIndex);
        if (!t) return;
        
        const pnl = parseFloat(t.pnl) || 0;
        const screenshotSrc = t.screenshotUrl || localStorage.getItem(`ctp_screenshot_${t.rowIndex}`) || '';
        
        const container = document.getElementById('detailsList');
        container.innerHTML = `
            <div class="detail-item"><span class="detail-label">Date Closed</span><span>${formatDate(t.date)}</span></div>
            ${t.dateOpened ? `<div class="detail-item"><span class="detail-label">Date Opened</span><span>${formatDate(t.dateOpened)}</span></div>` : ''}
            ${t.duration ? `<div class="detail-item"><span class="detail-label">Duration</span><span class="mono-text" style="color:var(--cyan)">⏱ ${t.duration}</span></div>` : ''}
            <div class="detail-item"><span class="detail-label">Pair</span><span style="color:${getPairColor(t.pair)};font-weight:700">${t.pair}</span></div>
            <div class="detail-item"><span class="detail-label">Direction</span><span class="type-badge ${t.type.toLowerCase()}">${t.type}</span></div>
            <div class="detail-item"><span class="detail-label">Strategy</span><span>${t.strategy || '-'}</span></div>
            <div class="detail-item"><span class="detail-label">Entry</span><span class="mono-text">$${formatWithCommas(t.entryPrice)}</span></div>
            <div class="detail-item"><span class="detail-label">Exit</span><span class="mono-text">${t.exitPrice ? '$' + formatWithCommas(t.exitPrice) : '—'}</span></div>
            <div class="detail-item"><span class="detail-label">Quantity</span><span class="mono-text">${t.quantity}</span></div>
            <div class="detail-item"><span class="detail-label">Stop Loss</span><span class="mono-text negative">${t.stopLoss ? '$' + formatWithCommas(t.stopLoss) : '—'}</span></div>
            <div class="detail-item"><span class="detail-label">Take Profit</span><span class="mono-text positive">${t.takeProfit ? '$' + formatWithCommas(t.takeProfit) : '—'}</span></div>
            <div class="detail-item"><span class="detail-label">P&L</span><span class="mono-text ${getValueClass(pnl)}" style="font-size:1.1rem;font-weight:700">${pnl >= 0 ? '+' : ''}${formatCurrency(pnl)}</span></div>
            <div class="detail-item"><span class="detail-label">P&L %</span><span class="mono-text ${getValueClass(t.pnlPercent)}">${formatPercent(t.pnlPercent)}</span></div>
            ${t.notes ? `<div class="detail-notes"><span class="detail-label">Notes</span><p>${t.notes}</p></div>` : ''}
            ${screenshotSrc ? `
                <div class="detail-screenshot">
                    <span class="detail-label">📸 Trading Chart</span>
                    <div class="detail-screenshot-wrap">
                        <img src="${screenshotSrc}" alt="Trading Chart" class="detail-screenshot-img" onclick="window.open(this.src, '_blank')">
                        <p class="screenshot-hint">Tap image to view full size</p>
                    </div>
                </div>
            ` : ''}
        `;
        
        document.getElementById('viewDetailsModal').classList.add('active');
    }
    
    closeViewDetailsModal() {
        document.getElementById('viewDetailsModal').classList.remove('active');
    }
    
    // ===== POSITIONS TAB =====
    
    // ===== LIVE PRICES (OKX) =====
    
    startPriceAutoRefresh() {
        if (this.priceRefreshInterval) clearInterval(this.priceRefreshInterval);
        
        // Auto-refresh every 30 seconds when on positions tab
        if (cryptoAPI.isConfigured() && (this.data.positions || []).length > 0) {
            // Refresh immediately if stale (>30s)
            if (Date.now() - this.lastPriceRefresh > 30000) {
                this.refreshLivePrices(true);
            }
            this.priceRefreshInterval = setInterval(() => this.refreshLivePrices(true), 30000);
        }
    }
    
    async refreshLivePrices(silent = false) {
        const positions = this.data.positions || [];
        if (positions.length === 0) {
            if (!silent) this.showToast('No open positions to refresh', 'info');
            return;
        }
        
        const btn = document.getElementById('refreshPricesBtn');
        const statusEl = document.getElementById('livePriceStatus');
        
        if (btn) btn.classList.add('refreshing');
        if (!silent) this.showToast('Fetching live prices...', 'info');
        
        try {
            const pairs = [...new Set(positions.map(p => p.pair).filter(p => p))];
            let prices = {};
            
            if (cryptoAPI.isConfigured()) {
                // Use backend (server-side, no CORS issues)
                const result = await cryptoAPI.refreshPositionPrices();
                if (result.success) {
                    prices = result.prices || {};
                    // Sync to get updated current prices from sheet
                    await this.syncData();
                }
            } else {
                // Demo mode: fetch directly from OKX public API
                try {
                    const resp = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SPOT');
                    const json = await resp.json();
                    if (json.code === '0' && json.data) {
                        json.data.forEach(t => {
                            const pair = t.instId.replace('-', '/');
                            if (pairs.includes(pair)) prices[pair] = parseFloat(t.last);
                        });
                    }
                } catch (e) {
                    // CORS fallback — just show last known prices
                    console.warn('Direct OKX fetch failed (CORS):', e);
                }
                
                // Update local positions
                if (Object.keys(prices).length > 0) {
                    positions.forEach(p => {
                        if (prices[p.pair]) p.currentPrice = prices[p.pair];
                    });
                    cacheManager.save(this.data);
                }
            }
            
            this.livePrices = prices;
            this.lastPriceRefresh = Date.now();
            
            // Show live indicator
            if (statusEl && Object.keys(prices).length > 0) {
                statusEl.style.display = 'flex';
            }
            
            // Re-render positions with new prices
            this.renderPositionsTab();
            this.renderDashboard();
            
            if (!silent) {
                const count = Object.keys(prices).length;
                this.showToast(`Updated ${count} pair${count !== 1 ? 's' : ''} from OKX`, 'success');
            }
        } catch (err) {
            console.error('Price refresh error:', err);
            if (!silent) this.showToast('Price refresh failed: ' + err.message, 'error');
        } finally {
            if (btn) btn.classList.remove('refreshing');
        }
    }
    
    renderPositionsTab() {
        const container = document.getElementById('positionsContainer');
        if (!container) return;
        
        const positions = this.data.positions || [];
        
        if (positions.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">◎</div><p>No open positions</p></div>';
            return;
        }
        
        container.innerHTML = positions.map(p => {
            const entry = parseFloat(p.entryPrice) || 0;
            const current = parseFloat(p.currentPrice) || entry;
            const qty = parseFloat(p.quantity) || 0;
            const sl = parseFloat(p.stopLoss) || 0;
            const tp = parseFloat(p.takeProfit) || 0;
            
            const upnl = p.type === 'LONG' ? (current - entry) * qty : (entry - current) * qty;
            const upnlPct = entry > 0 ? (p.type === 'LONG' ? ((current - entry) / entry * 100) : ((entry - current) / entry * 100)) : 0;
            
            const range = tp - sl || 1;
            const progress = Math.min(Math.max(((current - sl) / range) * 100, 0), 100);
            
            return `
                <div class="position-card ${getValueClass(upnl)}">
                    <div class="position-header">
                        <div class="position-pair">
                            <span style="color:${getPairColor(p.pair)};font-weight:800;font-size:1.1rem">${p.pair}</span>
                            <span class="type-badge ${p.type.toLowerCase()}">${p.type}</span>
                            <span class="strategy-tag">${p.strategy || ''}</span>
                        </div>
                        <div class="position-pnl">
                            <div class="pnl-value ${getValueClass(upnl)}">${upnl >= 0 ? '+' : ''}${formatCurrency(upnl)}</div>
                            <div class="pnl-percent ${getValueClass(upnlPct)}">${formatPercent(upnlPct)}</div>
                        </div>
                    </div>
                    <div class="position-grid">
                        <div class="pos-stat"><span class="pos-label">Entry</span><span class="pos-value mono-text">$${formatWithCommas(entry)}</span></div>
                        <div class="pos-stat"><span class="pos-label">Current</span><span class="pos-value mono-text${this.livePrices[p.pair] ? ' price-live' : ''}">$${formatWithCommas(current)}</span></div>
                        <div class="pos-stat"><span class="pos-label">Stop Loss</span><span class="pos-value mono-text negative">$${formatWithCommas(sl)}</span></div>
                        <div class="pos-stat"><span class="pos-label">Take Profit</span><span class="pos-value mono-text positive">$${formatWithCommas(tp)}</span></div>
                    </div>
                    <div class="position-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width:${progress}%"></div>
                            <div class="progress-marker" style="left:${progress}%"></div>
                        </div>
                        <div class="progress-labels">
                            <span class="negative">SL: $${formatWithCommas(sl)}</span>
                            <span class="positive">TP: $${formatWithCommas(tp)}</span>
                        </div>
                    </div>
                    <div class="position-footer">
                        <span class="pos-date">Opened ${formatDate(p.dateOpened)}</span>
                        <div class="pos-actions">
                            <button class="action-btn edit" onclick="app.editPosition(${p.rowIndex})">Edit</button>
                            <button class="action-btn close-pos" onclick="app.closePositionPrompt(${p.rowIndex})">Close</button>
                            <button class="action-btn delete" onclick="app.deletePosition(${p.rowIndex})">✕</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // ===== POSITION MODAL =====
    
    openPositionModal(editData = null) {
        const el = (id) => document.getElementById(id);
        if (el('positionForm')) el('positionForm').reset();
        if (el('positionRowIndex')) el('positionRowIndex').value = '';
        
        // Populate pair dropdown
        this.populatePairDropdown('posPair', editData?.pair || '');
        
        // Populate strategy dropdown from saved strategies
        const stratSelect = el('posStrategy');
        if (stratSelect) {
            const strategies = this.data.strategies || [];
            stratSelect.innerHTML = '<option value="">Select strategy</option>' +
                strategies.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
        }
        
        if (editData) {
            if (el('positionModalTitle')) el('positionModalTitle').textContent = 'Edit Position';
            if (el('positionRowIndex')) el('positionRowIndex').value = editData.rowIndex;
            if (el('posDate')) el('posDate').value = formatDateForInput(editData.dateOpened);
            if (el('posPair')) el('posPair').value = editData.pair;
            if (el('posType')) el('posType').value = editData.type;
            if (el('posStrategy')) el('posStrategy').value = editData.strategy || '';
            if (el('posEntry')) el('posEntry').value = editData.entryPrice;
            if (el('posCurrent')) el('posCurrent').value = editData.currentPrice || '';
            if (el('posQty')) el('posQty').value = editData.quantity;
            if (el('posSL')) el('posSL').value = editData.stopLoss || '';
            if (el('posTP')) el('posTP').value = editData.takeProfit || '';
            if (el('posNotes')) el('posNotes').value = editData.notes || '';
        } else {
            if (el('positionModalTitle')) el('positionModalTitle').textContent = 'New Position';
            if (el('posDate')) el('posDate').value = getTodayStr();
        }
        
        if (el('positionModal')) el('positionModal').classList.add('active');
        setTimeout(() => this.setupAmountInputs(), 100);
    }
    
    closePositionModal() {
        document.getElementById('positionModal')?.classList.remove('active');
    }
    
    async savePositionEntry() {
        if (this.isSaving) return;
        const el = (id) => document.getElementById(id);
        const rowIndex = el('positionRowIndex')?.value;
        const entryPrice = parseFormattedNumber(el('posEntry')?.value);
        
        if (!el('posPair')?.value || entryPrice <= 0) {
            this.showToast('Fill required fields', 'warning'); return;
        }
        
        const data = {
            dateOpened: el('posDate')?.value || getTodayStr(),
            pair: el('posPair')?.value,
            type: el('posType')?.value || 'LONG',
            strategy: el('posStrategy')?.value || '',
            entryPrice,
            currentPrice: parseFormattedNumber(el('posCurrent')?.value) || entryPrice,
            quantity: parseFormattedNumber(el('posQty')?.value) || 1,
            stopLoss: parseFormattedNumber(el('posSL')?.value) || '',
            takeProfit: parseFormattedNumber(el('posTP')?.value) || '',
            notes: el('posNotes')?.value || ''
        };
        
        if (rowIndex) data.rowIndex = parseInt(rowIndex);
        
        this.isSaving = true;
        try {
            this.showToast('Saving...', 'info');
            if (cryptoAPI.isConfigured()) {
                if (rowIndex) await cryptoAPI.updatePosition(data);
                else await cryptoAPI.addPosition(data);
                this.closePositionModal();
                await this.syncData();
            } else {
                if (rowIndex) {
                    const idx = this.data.positions.findIndex(p => p.rowIndex == rowIndex);
                    if (idx > -1) this.data.positions[idx] = { ...this.data.positions[idx], ...data };
                } else {
                    data.rowIndex = Date.now();
                    this.data.positions.push(data);
                }
                cacheManager.save(this.data);
                this.closePositionModal();
                this.renderTab('positions');
            }
            this.showToast('Position saved!', 'success');
        } catch (error) { this.showToast(error.message, 'error'); }
        finally { this.isSaving = false; }
    }
    
    editPosition(rowIndex) {
        const item = this.data.positions.find(p => p.rowIndex === rowIndex);
        if (item) this.openPositionModal(item);
    }
    
    async deletePosition(rowIndex) {
        if (!confirm('Delete this position? This cannot be undone.')) return;
        try {
            if (cryptoAPI.isConfigured()) {
                await cryptoAPI.deletePosition(rowIndex);
                await this.syncData();
            } else {
                this.data.positions = this.data.positions.filter(p => p.rowIndex !== rowIndex);
                cacheManager.save(this.data);
                this.renderTab('positions');
            }
            this.renderDashboard();
            this.showToast('Position deleted!', 'success');
        } catch (error) { this.showToast(error.message, 'error'); }
    }
    
    // ===== CLOSE POSITION → TRADE JOURNAL + UPDATE BALANCE =====
    
    setDurationMode(mode) {
        const autoBtn = document.getElementById('durAutoBtn');
        const manualBtn = document.getElementById('durManualBtn');
        const autoDisplay = document.getElementById('durAutoDisplay');
        const manualInput = document.getElementById('durManualInput');
        
        if (mode === 'manual') {
            autoBtn?.classList.remove('active');
            manualBtn?.classList.add('active');
            if (autoDisplay) autoDisplay.style.display = 'none';
            if (manualInput) manualInput.style.display = 'block';
        } else {
            autoBtn?.classList.add('active');
            manualBtn?.classList.remove('active');
            if (autoDisplay) autoDisplay.style.display = 'block';
            if (manualInput) manualInput.style.display = 'none';
        }
    }
    
    handleTradeScreenshot(e) {
        const file = e.target.files[0];
        if (!file) return;
        this.tradeScreenshotFile = file;
        
        const reader = new FileReader();
        reader.onload = (ev) => {
            const preview = document.getElementById('tradeScreenshotPreview');
            if (preview) preview.innerHTML = `<img src="${ev.target.result}" class="trade-ss-thumb" alt="Screenshot">`;
            const removeBtn = document.getElementById('tradeScreenshotRemove');
            if (removeBtn) removeBtn.style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
    }
    
    removeTradeScreenshot() {
        this.tradeScreenshotFile = null;
        this.tradeScreenshotUrl = '';
        document.getElementById('tradeScreenshot').value = '';
        const preview = document.getElementById('tradeScreenshotPreview');
        if (preview) preview.innerHTML = '';
        const removeBtn = document.getElementById('tradeScreenshotRemove');
        if (removeBtn) removeBtn.style.display = 'none';
    }
    
    async closePositionPrompt(rowIndex) {
        const pos = this.data.positions.find(p => p.rowIndex === rowIndex);
        if (!pos) { this.showToast('Position not found', 'error'); return; }
        
        // Store position data for the modal
        this.closePositionData = pos;
        this.closeScreenshotFile = null;
        
        // Populate modal info
        const info = document.getElementById('closePosInfo');
        info.innerHTML = `
            <div class="pos-pair">${pos.pair} <span style="color:${pos.type === 'LONG' ? 'var(--green)' : 'var(--red)'}">● ${pos.type}</span></div>
            <div class="pos-detail"><span>Entry Price:</span><span>$${formatWithCommas(pos.entryPrice)}</span></div>
            <div class="pos-detail"><span>Quantity:</span><span>${formatWithCommas(pos.quantity)}</span></div>
            <div class="pos-detail"><span>Strategy:</span><span>${pos.strategy || 'N/A'}</span></div>
        `;
        
        // Reset form
        document.getElementById('closeExitPrice').value = '';
        document.getElementById('closeNotes').value = '';
        document.getElementById('closePosPreview').innerHTML = '<span style="color:var(--text-muted)">Enter exit price to see P&L preview</span>';
        document.getElementById('screenshotPlaceholder').style.display = 'flex';
        document.getElementById('screenshotPreviewWrap').style.display = 'none';
        
        // Show modal
        document.getElementById('closePositionModal').classList.add('active');
        
        // Setup comma input on exit price
        setupCommaInput(document.getElementById('closeExitPrice'));
    }
    
    updateClosePnLPreview() {
        if (!this.closePositionData) return;
        const pos = this.closePositionData;
        const exitVal = parseFormattedNumber(document.getElementById('closeExitPrice').value);
        if (!exitVal || exitVal <= 0) {
            document.getElementById('closePosPreview').innerHTML = '<span style="color:var(--text-muted)">Enter exit price to see P&L preview</span>';
            return;
        }
        const entry = parseFloat(pos.entryPrice) || 0;
        const qty = parseFloat(pos.quantity) || 1;
        const pnl = pos.type === 'LONG' ? (exitVal - entry) * qty : (entry - exitVal) * qty;
        const pnlPct = entry > 0 ? (pos.type === 'LONG' ? ((exitVal - entry) / entry * 100) : ((entry - exitVal) / entry * 100)) : 0;
        const color = pnl >= 0 ? 'var(--green)' : 'var(--red)';
        document.getElementById('closePosPreview').innerHTML = `
            <div class="pnl-preview" style="color:${color}">${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)</div>
        `;
    }
    
    handleCloseScreenshot(e) {
        const file = e.target.files[0];
        if (!file) return;
        this.closeScreenshotFile = file;
        
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('screenshotPreviewImg').src = ev.target.result;
            document.getElementById('screenshotPlaceholder').style.display = 'none';
            document.getElementById('screenshotPreviewWrap').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
    
    removeCloseScreenshot() {
        this.closeScreenshotFile = null;
        document.getElementById('closeScreenshot').value = '';
        document.getElementById('screenshotPlaceholder').style.display = 'flex';
        document.getElementById('screenshotPreviewWrap').style.display = 'none';
    }
    
    cancelClosePosition() {
        this.closePositionData = null;
        this.closeScreenshotFile = null;
        document.getElementById('closePositionModal').classList.remove('active');
    }
    
    async confirmClosePosition() {
        if (!this.closePositionData || this.isSaving) return;
        this.isSaving = true;
        const pos = this.closePositionData;
        
        const exitPrice = parseFormattedNumber(document.getElementById('closeExitPrice').value);
        if (!exitPrice || exitPrice <= 0) {
            this.showToast('Enter a valid exit price', 'warning');
            return;
        }
        
        const entry = parseFloat(pos.entryPrice) || 0;
        const qty = parseFloat(pos.quantity) || 1;
        const pnl = pos.type === 'LONG' ? (exitPrice - entry) * qty : (entry - exitPrice) * qty;
        const pnlPct = entry > 0 ? (pos.type === 'LONG' ? ((exitPrice - entry) / entry * 100) : ((entry - exitPrice) / entry * 100)) : 0;
        const closeNotes = document.getElementById('closeNotes').value.trim();
        
        // Duration: auto or manual
        let duration = '';
        const isManual = document.getElementById('durManualBtn')?.classList.contains('active');
        if (isManual) {
            duration = document.getElementById('durManualInput')?.value.trim() || '';
        } else {
            const openDate = new Date(pos.dateOpened + 'T00:00:00');
            const closeDate = new Date();
            const diffMs = closeDate - openDate;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            if (diffDays > 0) duration += `${diffDays}d `;
            if (diffHours > 0) duration += `${diffHours}h `;
            duration += `${diffMins}m`;
            duration = duration.trim() || '0m';
        }
        
        // Capture file reference before closing modal
        const screenshotFile = this.closeScreenshotFile;
        
        // Close modal INSTANTLY
        this.cancelClosePosition();
        this.isSaving = false;
        
        // Optimistic update
        const trade = {
            date: getTodayStr(),
            pair: pos.pair,
            type: pos.type,
            strategy: pos.strategy || '',
            entryPrice: entry,
            exitPrice: exitPrice,
            quantity: qty,
            stopLoss: pos.stopLoss || '',
            takeProfit: pos.takeProfit || '',
            pnl: (Math.round(pnl * 100) / 100).toFixed(2),
            pnlPercent: pnlPct.toFixed(2),
            status: 'CLOSED',
            notes: ((pos.notes || '') + (pos.notes ? ' | ' : '') + 'Closed from position' + (closeNotes ? ' | ' + closeNotes : '')).trim(),
            screenshotUrl: '',
            dateOpened: pos.dateOpened || '',
            dateClosed: getTodayStr(),
            duration: duration,
            rowIndex: Date.now()
        };
        
        this.data.trades.push(trade);
        this.data.positions = this.data.positions.filter(p => p.rowIndex !== pos.rowIndex);
        this.updatePortfolioBalance();
        cacheManager.save(this.data);
        this.renderDashboard();
        const activeTab = document.querySelector('.nav-item.active')?.dataset.tab || 'positions';
        this.renderTab(activeTab);
        
        this.showToast(`Position closed! P&L: ${pnl >= 0 ? '+' : ''}$${(Math.round(pnl * 100) / 100).toFixed(2)} | ${duration}`, pnl >= 0 ? 'success' : 'error');
        
        // Background: upload screenshot + sync API
        (async () => {
            try {
                let screenshotUrl = '';
                if (screenshotFile) {
                    const base64Data = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result.split(',')[1]);
                        reader.onerror = reject;
                        reader.readAsDataURL(screenshotFile);
                    });
                    const fullDataUrl = `data:${screenshotFile.type};base64,${base64Data}`;
                    screenshotUrl = fullDataUrl;
                    
                    if (cryptoAPI.isConfigured()) {
                        try {
                            const uploadResult = await cryptoAPI.uploadScreenshot({
                                base64Data, mimeType: screenshotFile.type,
                                fileName: `${pos.pair.replace('/', '-')}_close_${getTodayStr()}_${Date.now()}.${screenshotFile.name.split('.').pop()}`
                            });
                            screenshotUrl = uploadResult.downloadUrl || uploadResult.fileUrl || uploadResult.url || fullDataUrl;
                        } catch (e) { console.warn('Screenshot upload failed:', e); }
                    }
                    
                    // Update trade with screenshot
                    trade.screenshotUrl = screenshotUrl;
                    try { localStorage.setItem(`ctp_screenshot_${trade.rowIndex}`, screenshotUrl); } catch (e) {}
                    cacheManager.save(this.data);
                }
                
                if (cryptoAPI.isConfigured()) {
                    try {
                        await cryptoAPI.closePosition({
                            rowIndex: pos.rowIndex, exitPrice,
                            screenshotUrl, duration,
                            dateOpened: pos.dateOpened || '', dateClosed: getTodayStr()
                        });
                        await this.syncData();
                        // Write correct computed balance to sheet
                        this.updatePortfolioBalance();
                    } catch (e) { console.warn('API sync failed:', e); }
                }
            } catch (err) { console.error('Background save error:', err); }
        })();
    }
    
    // ===== STRATEGIES TAB =====
    
    renderStrategiesTab() {
        const container = document.getElementById('strategiesContainer');
        if (!container) return;
        
        const strategies = this.data.strategies || [];
        
        if (strategies.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚡</div><p>No strategies yet</p></div>';
            return;
        }
        
        // Compute live stats from trades
        const closedTrades = (this.data.trades || []).filter(t => t.status === 'CLOSED');
        
        container.innerHTML = strategies.map(s => {
            // Compute win rate from actual trades
            const stratTrades = closedTrades.filter(t => t.strategy === s.name);
            const stratWins = stratTrades.filter(t => (parseFloat(t.pnl) || 0) > 0);
            const stratLosses = stratTrades.filter(t => (parseFloat(t.pnl) || 0) <= 0);
            const totalTrades = stratTrades.length;
            const wr = totalTrades > 0 ? (stratWins.length / totalTrades * 100) : 0;
            const totalPnl = stratTrades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
            const wrColor = wr >= 60 ? 'var(--green)' : wr >= 45 ? 'var(--gold)' : 'var(--red)';
            const indicators = (s.indicators || '').split(',').map(i => i.trim()).filter(i => i);
            
            return `
                <div class="strategy-card">
                    <div class="strategy-header">
                        <span class="strategy-name">${s.name}</span>
                        ${s.timeframe ? `<span class="timeframe-badge">${s.timeframe}</span>` : ''}
                    </div>
                    <p class="strategy-desc">${s.description || 'No description'}</p>
                    ${indicators.length ? `<div class="strategy-indicators">${indicators.map(i => `<span class="indicator-tag">${i}</span>`).join('')}</div>` : ''}
                    <div class="strategy-stats">
                        <div class="strategy-winrate">
                            <div class="wr-bar"><div class="wr-fill" style="width:${wr}%;background:${wrColor}"></div></div>
                            <span class="wr-text" style="color:${wrColor}">${wr.toFixed(1)}%</span>
                        </div>
                        <span class="strategy-trades">${totalTrades} trades (${stratWins.length}W / ${stratLosses.length}L)</span>
                    </div>
                    ${totalTrades > 0 ? `<div class="strategy-pnl ${totalPnl >= 0 ? 'positive' : 'negative'}">P&L: ${totalPnl >= 0 ? '+' : ''}$${Math.abs(totalPnl).toFixed(2)}</div>` : ''}
                    <div class="strategy-actions">
                        <button class="action-btn edit" onclick="app.editStrategy(${s.rowIndex})">Edit</button>
                        <button class="action-btn delete" onclick="app.deleteStrategy(${s.rowIndex})">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    openStrategyModal(editData = null) {
        const el = (id) => document.getElementById(id);
        if (el('strategyForm')) el('strategyForm').reset();
        if (el('strategyRowIndex')) el('strategyRowIndex').value = '';
        
        if (editData) {
            if (el('strategyModalTitle')) el('strategyModalTitle').textContent = 'Edit Strategy';
            if (el('strategyRowIndex')) el('strategyRowIndex').value = editData.rowIndex;
            if (el('stratName')) el('stratName').value = editData.name || '';
            if (el('stratDesc')) el('stratDesc').value = editData.description || '';
            if (el('stratTimeframe')) el('stratTimeframe').value = editData.timeframe || '';
            if (el('stratIndicators')) el('stratIndicators').value = editData.indicators || '';
        } else {
            if (el('strategyModalTitle')) el('strategyModalTitle').textContent = 'New Strategy';
        }
        
        if (el('strategyModal')) el('strategyModal').classList.add('active');
    }
    
    closeStrategyModal() {
        document.getElementById('strategyModal')?.classList.remove('active');
    }
    
    async saveStrategyEntry() {
        if (this.isSaving) return;
        const el = (id) => document.getElementById(id);
        const name = el('stratName')?.value?.trim();
        if (!name) { this.showToast('Enter strategy name', 'warning'); return; }
        
        const rowIndex = el('strategyRowIndex')?.value;
        const data = {
            name,
            description: el('stratDesc')?.value || '',
            timeframe: el('stratTimeframe')?.value || '',
            indicators: el('stratIndicators')?.value || '',
            winRate: 0, totalTrades: 0, createdDate: getTodayStr()
        };
        
        if (rowIndex) data.rowIndex = parseInt(rowIndex);
        
        this.isSaving = true;
        try {
            if (cryptoAPI.isConfigured()) {
                if (rowIndex) await cryptoAPI.updateStrategy(data);
                else await cryptoAPI.addStrategy(data);
                this.closeStrategyModal();
                await this.syncData();
            } else {
                if (rowIndex) {
                    const idx = this.data.strategies.findIndex(s => s.rowIndex == rowIndex);
                    if (idx > -1) this.data.strategies[idx] = { ...this.data.strategies[idx], ...data };
                } else {
                    data.rowIndex = Date.now();
                    this.data.strategies.push(data);
                }
                cacheManager.save(this.data);
                this.closeStrategyModal();
                this.renderTab('strategies');
            }
            this.showToast('Strategy saved!', 'success');
        } catch (error) { this.showToast(error.message, 'error'); }
        finally { this.isSaving = false; }
    }
    
    editStrategy(rowIndex) {
        const item = this.data.strategies.find(s => s.rowIndex === rowIndex);
        if (item) this.openStrategyModal(item);
    }
    
    async deleteStrategy(rowIndex) {
        if (!confirm('Delete this strategy?')) return;
        try {
            if (cryptoAPI.isConfigured()) {
                await cryptoAPI.deleteStrategy(rowIndex);
                await this.syncData();
            } else {
                this.data.strategies = this.data.strategies.filter(s => s.rowIndex !== rowIndex);
                cacheManager.save(this.data);
                this.renderTab('strategies');
            }
            this.showToast('Deleted!', 'success');
        } catch (error) { this.showToast(error.message, 'error'); }
    }
    
    // ===== REMINDERS TAB =====
    
    renderRemindersTab() {
        const container = document.getElementById('remindersContainer');
        if (!container) return;
        
        const reminders = this.data.reminders || [];
        const icons = { PRICE_ALERT: '📊', NEWS: '📰', EVENT: '📅', STRATEGY: '⚡', GENERAL: '💡' };
        
        const active = reminders.filter(r => r.status === 'ACTIVE');
        const dismissed = reminders.filter(r => r.status !== 'ACTIVE');
        
        if (reminders.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔔</div><p>No reminders yet</p></div>';
            return;
        }
        
        let html = '';
        
        if (active.length > 0) {
            html += '<h3 class="section-title">Active Reminders</h3>';
            html += '<div class="reminders-grid">';
            html += active.map(r => `
                <div class="reminder-card-full active">
                    <div class="reminder-top">
                        <span class="reminder-type-icon">${icons[r.type] || '💡'}</span>
                        <span class="reminder-type-badge">${(r.type || 'GENERAL').replace('_', ' ')}</span>
                        <div class="reminder-status active"><span class="status-dot"></span> Active</div>
                    </div>
                    <div class="reminder-message">${r.message}</div>
                    <div class="reminder-bottom">
                        <span class="reminder-datetime">${formatDate(r.date)} ${r.time || ''}</span>
                        ${r.pair ? `<span class="reminder-pair" style="color:${getPairColor(r.pair)}">${r.pair}</span>` : ''}
                    </div>
                    <div class="reminder-actions">
                        <button class="action-btn edit" onclick="app.editReminder(${r.rowIndex})">Edit</button>
                        <button class="action-btn dismiss" onclick="app.dismissReminder(${r.rowIndex})">Dismiss</button>
                        <button class="action-btn delete" onclick="app.deleteReminder(${r.rowIndex})">Delete</button>
                    </div>
                </div>
            `).join('');
            html += '</div>';
        }
        
        if (dismissed.length > 0) {
            html += '<h3 class="section-title" style="margin-top:24px">Dismissed</h3>';
            html += '<div class="reminders-grid">';
            html += dismissed.map(r => `
                <div class="reminder-card-full dismissed">
                    <div class="reminder-top">
                        <span class="reminder-type-icon">${icons[r.type] || '💡'}</span>
                        <span class="reminder-type-badge">${(r.type || 'GENERAL').replace('_', ' ')}</span>
                    </div>
                    <div class="reminder-message">${r.message}</div>
                    <div class="reminder-bottom">
                        <span class="reminder-datetime">${formatDate(r.date)} ${r.time || ''}</span>
                        ${r.pair ? `<span class="reminder-pair">${r.pair}</span>` : ''}
                    </div>
                    <div class="reminder-actions">
                        <button class="action-btn delete" onclick="app.deleteReminder(${r.rowIndex})">Delete</button>
                    </div>
                </div>
            `).join('');
            html += '</div>';
        }
        
        container.innerHTML = html;
    }
    
    openReminderModal(editData = null) {
        const el = (id) => document.getElementById(id);
        if (el('reminderForm')) el('reminderForm').reset();
        if (el('reminderRowIndex')) el('reminderRowIndex').value = '';
        
        if (editData) {
            if (el('reminderModalTitle')) el('reminderModalTitle').textContent = 'Edit Reminder';
            if (el('reminderRowIndex')) el('reminderRowIndex').value = editData.rowIndex;
            if (el('remDate')) el('remDate').value = formatDateForInput(editData.date);
            if (el('remTime')) el('remTime').value = editData.time || '';
            if (el('remPair')) el('remPair').value = editData.pair || '';
            if (el('remMessage')) el('remMessage').value = editData.message || '';
            if (el('remType')) el('remType').value = editData.type || 'GENERAL';
        } else {
            if (el('reminderModalTitle')) el('reminderModalTitle').textContent = 'New Reminder';
            if (el('remDate')) el('remDate').value = getTodayStr();
        }
        
        if (el('reminderModal')) el('reminderModal').classList.add('active');
    }
    
    closeReminderModal() {
        document.getElementById('reminderModal')?.classList.remove('active');
    }
    
    async saveReminderEntry() {
        if (this.isSaving) return;
        const el = (id) => document.getElementById(id);
        const message = el('remMessage')?.value?.trim();
        if (!message) { this.showToast('Enter a reminder message', 'warning'); return; }
        
        const rowIndex = el('reminderRowIndex')?.value;
        const data = {
            date: el('remDate')?.value || getTodayStr(),
            time: el('remTime')?.value || '',
            pair: el('remPair')?.value || '',
            message,
            type: el('remType')?.value || 'GENERAL',
            status: 'ACTIVE'
        };
        
        if (rowIndex) data.rowIndex = parseInt(rowIndex);
        
        this.isSaving = true;
        try {
            if (cryptoAPI.isConfigured()) {
                if (rowIndex) await cryptoAPI.updateReminder(data);
                else await cryptoAPI.addReminder(data);
                this.closeReminderModal();
                await this.syncData();
            } else {
                if (rowIndex) {
                    const idx = this.data.reminders.findIndex(r => r.rowIndex == rowIndex);
                    if (idx > -1) this.data.reminders[idx] = { ...this.data.reminders[idx], ...data };
                } else {
                    data.rowIndex = Date.now();
                    this.data.reminders.push(data);
                }
                cacheManager.save(this.data);
                this.closeReminderModal();
                this.renderTab('reminders');
            }
            this.showToast('Reminder saved!', 'success');
        } catch (error) { this.showToast(error.message, 'error'); }
        finally { this.isSaving = false; }
    }
    
    editReminder(rowIndex) {
        const item = this.data.reminders.find(r => r.rowIndex === rowIndex);
        if (item) this.openReminderModal(item);
    }
    
    async dismissReminder(rowIndex) {
        try {
            if (cryptoAPI.isConfigured()) {
                await cryptoAPI.dismissReminder(rowIndex);
                await this.syncData();
            } else {
                const r = this.data.reminders.find(r => r.rowIndex === rowIndex);
                if (r) r.status = 'DISMISSED';
                this.renderTab('reminders');
            }
            this.showToast('Dismissed', 'success');
        } catch (error) { this.showToast(error.message, 'error'); }
    }
    
    async deleteReminder(rowIndex) {
        if (!confirm('Delete this reminder?')) return;
        try {
            if (cryptoAPI.isConfigured()) {
                await cryptoAPI.deleteReminder(rowIndex);
                await this.syncData();
            } else {
                this.data.reminders = this.data.reminders.filter(r => r.rowIndex !== rowIndex);
                cacheManager.save(this.data);
                this.renderTab('reminders');
            }
            this.showToast('Deleted!', 'success');
        } catch (error) { this.showToast(error.message, 'error'); }
    }
    
    // ===== STRATEGY ROTATOR (Sidebar) =====
    
    startStrategyRotator() {
        // Clear any existing interval
        if (this.strategyRotatorInterval) clearInterval(this.strategyRotatorInterval);
        
        // Render first strategy immediately
        this.renderStrategyRotator();
        
        // Rotate every 15 seconds
        this.strategyRotatorInterval = setInterval(() => {
            this.renderStrategyRotator();
        }, 15000);
    }
    
    renderStrategyRotator() {
        const container = document.getElementById('rotatorContent');
        if (!container) return;
        
        const strategies = this.data.strategies || [];
        if (strategies.length === 0) {
            container.innerHTML = '<span class="rotator-text">No strategies yet — add one!</span>';
            return;
        }
        
        // Cycle through strategies
        this.strategyRotatorIndex = this.strategyRotatorIndex % strategies.length;
        const strat = strategies[this.strategyRotatorIndex];
        this.strategyRotatorIndex++;
        
        container.innerHTML = `
            <span class="rotator-text" style="animation:rotatorFadeIn 0.5s ease">
                <span class="rotator-name">⚡ ${strat.name || 'Unnamed Strategy'}</span>
                ${strat.description ? `<span class="rotator-desc">${strat.description.length > 60 ? strat.description.substring(0, 60) + '...' : strat.description}</span>` : ''}
                ${strat.timeframe ? `<span class="rotator-tf">🕐 ${strat.timeframe}</span>` : ''}
                ${strat.indicators ? `<span class="rotator-tf">📈 ${strat.indicators}</span>` : ''}
            </span>
        `;
    }
    
    // ===== REMINDER TICKER (Header) =====
    
    renderReminderTicker() {
        const track = document.getElementById('tickerTrack');
        if (!track) return;
        
        const reminders = (this.data.reminders || []).filter(r => r.status === 'ACTIVE');
        
        if (reminders.length === 0) {
            track.innerHTML = '<span class="ticker-item">No active reminders — Stay sharp, trader!</span>';
            return;
        }
        
        // Build ticker items — duplicate for seamless loop
        const items = reminders.map(r => {
            const typeIcon = { PRICE_ALERT: '💹', NEWS: '📰', EVENT: '📅', STRATEGY: '⚡', GENERAL: '📌' }[r.type] || '📌';
            const pairTag = r.pair ? `<span class="ticker-pair">${r.pair}</span>` : '';
            return `<span class="ticker-item">${typeIcon} <span class="ticker-type">${r.type || 'REMINDER'}</span> ${pairTag} ${r.message || ''}</span>`;
        }).join('');
        
        // Duplicate for infinite scroll effect
        track.innerHTML = items + items;
        
        // Adjust animation speed based on content length (slower = more readable)
        const charCount = reminders.reduce((s, r) => s + (r.message || '').length, 0);
        const duration = Math.max(30, Math.min(120, charCount * 0.5));
        track.style.animationDuration = duration + 's';
    }
    
    // ===== SETTINGS =====
    
    openSettings() {
        const settings = getSettings();
        document.getElementById('webAppUrl').value = settings.webAppUrl || '';
        document.getElementById('autoSync').checked = settings.autoSync !== false;
        
        // Wallpaper preview
        const wp = document.getElementById('wallpaperPreview');
        if (settings.wallpaper) {
            wp.style.backgroundImage = `url(${settings.wallpaper})`;
            wp.innerHTML = '';
        } else {
            wp.style.backgroundImage = '';
            wp.innerHTML = '<span class="wallpaper-placeholder">No wallpaper set</span>';
        }
        
        // Icon preview
        const iconEl = document.getElementById('iconPreview');
        iconEl.src = settings.customIcon || 'assets/logo.png';
        
        // Deposit/Withdraw history
        this.renderTransactionHistory();
        
        // Custom pairs list
        this.renderCustomPairs();
        
        // Amount input
        setupCommaInput(document.getElementById('dwAmount'));
        
        document.getElementById('settingsOverlay').classList.add('active');
    }
    
    closeSettings() {
        document.getElementById('settingsOverlay').classList.remove('active');
    }
    
    async handleTestConnection() {
        const url = document.getElementById('webAppUrl').value;
        if (!url) { this.showToast('Enter URL', 'warning'); return; }
        
        saveSettings({ ...getSettings(), webAppUrl: url });
        cryptoAPI.updateSettings();
        
        this.showToast('Testing...', 'info');
        const result = await cryptoAPI.testConnection();
        this.showToast(result.success ? '✅ Connected!' : '❌ ' + result.message, result.success ? 'success' : 'error');
    }
    
    handleSaveSettings() {
        const settings = getSettings();
        settings.webAppUrl = document.getElementById('webAppUrl').value;
        settings.autoSync = document.getElementById('autoSync').checked;
        
        saveSettings(settings);
        cryptoAPI.updateSettings();
        this.setupAutoSync();
        this.applyCustomizations();
        this.closeSettings();
        this.showToast('Settings saved!', 'success');
        
        if (settings.webAppUrl) this.syncData();
    }
    
    // ===== WALLPAPER =====
    
    handleWallpaperUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const dataUrl = ev.target.result;
            
            // Show immediately
            const wp = document.getElementById('wallpaperPreview');
            wp.style.backgroundImage = `url(${dataUrl})`;
            wp.innerHTML = '';
            
            // Apply preview immediately
            const wallpaperEl = document.getElementById('dashboardWallpaper');
            if (wallpaperEl) wallpaperEl.style.backgroundImage = `url(${dataUrl})`;
            this.showToast('Wallpaper updated!', 'success');
            
            // Upload to Google Drive and save URL
            if (cryptoAPI.isConfigured()) {
                try {
                    const base64 = dataUrl.split(',')[1];
                    const result = await cryptoAPI.uploadScreenshot({
                        base64Data: base64,
                        mimeType: file.type,
                        fileName: `wallpaper_${Date.now()}.${file.name.split('.').pop()}`
                    });
                    const driveUrl = result.downloadUrl || result.fileUrl || '';
                    if (driveUrl) {
                        const settings = getSettings();
                        settings.wallpaper = driveUrl;
                        saveSettings(settings);
                        this.showToast('Wallpaper saved to Drive!', 'success');
                        return;
                    }
                } catch (err) {
                    console.warn('Wallpaper Drive upload failed, saving locally:', err);
                }
            }
            
            // Fallback: save base64 locally
            const settings = getSettings();
            settings.wallpaper = dataUrl;
            saveSettings(settings);
        };
        reader.readAsDataURL(file);
    }
    
    handleRemoveWallpaper() {
        const settings = getSettings();
        settings.wallpaper = '';
        saveSettings(settings);
        
        const wp = document.getElementById('wallpaperPreview');
        wp.style.backgroundImage = '';
        wp.innerHTML = '<span class="wallpaper-placeholder">No wallpaper set</span>';
        
        this.applyCustomizations();
        this.showToast('Wallpaper removed', 'info');
    }
    
    // ===== ICON =====
    
    handleIconUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const dataUrl = ev.target.result;
            
            // Show immediately
            document.getElementById('iconPreview').src = dataUrl;
            const headerLogo = document.querySelector('.logo-icon');
            if (headerLogo) headerLogo.src = dataUrl;
            this.showToast('Icon updated!', 'success');
            
            // Upload to Drive and save URL
            if (cryptoAPI.isConfigured()) {
                try {
                    const base64 = dataUrl.split(',')[1];
                    const result = await cryptoAPI.uploadScreenshot({
                        base64Data: base64,
                        mimeType: file.type,
                        fileName: `app_icon_${Date.now()}.${file.name.split('.').pop()}`
                    });
                    const driveUrl = result.downloadUrl || result.fileUrl || '';
                    if (driveUrl) {
                        const settings = getSettings();
                        settings.customIcon = driveUrl;
                        saveSettings(settings);
                        this.showToast('Icon saved to Drive!', 'success');
                        return;
                    }
                } catch (err) {
                    console.warn('Icon Drive upload failed, saving locally:', err);
                }
            }
            
            // Fallback: save base64 locally
            const settings = getSettings();
            settings.customIcon = dataUrl;
            saveSettings(settings);
        };
        reader.readAsDataURL(file);
    }
    
    handleResetIcon() {
        const settings = getSettings();
        settings.customIcon = '';
        saveSettings(settings);
        
        document.getElementById('iconPreview').src = 'assets/logo.png';
        this.applyCustomizations();
        this.showToast('Icon reset to default', 'info');
    }
    
    // ===== CUSTOM PAIRS =====
    
    handleAddPair() {
        const input = document.getElementById('newPairInput');
        if (!input) return;
        let pair = input.value.trim().toUpperCase().replace(/\s+/g, '');
        if (!pair) { this.showToast('Enter a pair name', 'warning'); return; }
        if (!pair.includes('/')) pair += '/USDT';
        
        const allPairs = this.getAllPairs();
        if (allPairs.includes(pair)) {
            this.showToast(`${pair} already exists`, 'warning');
            input.value = '';
            return;
        }
        
        const settings = getSettings();
        if (!settings.customPairs) settings.customPairs = [];
        // If it was a removed default, restore it
        if (CONFIG.PAIRS.includes(pair)) {
            settings.removedPairs = (settings.removedPairs || []).filter(p => p !== pair);
        } else {
            settings.customPairs.push(pair);
        }
        saveSettings(settings);
        
        input.value = '';
        this.renderCustomPairs();
        this.showToast(`${pair} added!`, 'success');
    }
    
    removePair(pair) {
        const settings = getSettings();
        if (CONFIG.PAIRS.includes(pair)) {
            // It's a default pair — add to removed list
            if (!settings.removedPairs) settings.removedPairs = [];
            if (!settings.removedPairs.includes(pair)) settings.removedPairs.push(pair);
        } else {
            // It's a custom pair — remove from list
            settings.customPairs = (settings.customPairs || []).filter(p => p !== pair);
        }
        saveSettings(settings);
        this.renderCustomPairs();
        this.showToast(`${pair} removed`, 'info');
    }
    
    renderCustomPairs() {
        const container = document.getElementById('customPairsList');
        if (!container) return;
        
        const pairs = this.getAllPairs();
        const custom = (getSettings().customPairs || []);
        
        let html = '<div class="pairs-tag-list">';
        pairs.forEach(p => {
            const isCustom = custom.includes(p);
            html += `<span class="pair-tag ${isCustom ? 'custom' : 'default'}">${p} <button class="pair-remove" onclick="app.removePair('${p}')">✕</button></span>`;
        });
        html += '</div>';
        container.innerHTML = html;
    }
    
    // ===== APPLY CUSTOMIZATIONS =====
    
    applyCustomizations() {
        const settings = getSettings();
        
        // Wallpaper
        const wallpaperEl = document.getElementById('dashboardWallpaper');
        if (wallpaperEl) {
            if (settings.wallpaper) {
                wallpaperEl.style.backgroundImage = `url(${settings.wallpaper})`;
            } else {
                wallpaperEl.style.backgroundImage = '';
            }
        }
        
        // Icon — header logo only (browser favicon stays permanent from assets)
        const iconSrc = settings.customIcon || 'assets/logo.png';
        const headerLogo = document.querySelector('.logo-icon');
        if (headerLogo) headerLogo.src = iconSrc;
    }
    
    // ===== DEPOSIT / WITHDRAW =====
    
    handleDeposit() {
        const amount = parseFormattedNumber(document.getElementById('dwAmount').value);
        if (!amount || amount <= 0) { this.showToast('Enter a valid amount', 'warning'); return; }
        
        const notes = document.getElementById('dwNotes').value.trim();
        const settings = getSettings();
        if (!settings.transactions) settings.transactions = [];
        
        settings.transactions.push({
            type: 'DEPOSIT',
            amount: amount,
            date: getTodayStr(),
            time: new Date().toLocaleTimeString(),
            notes: notes
        });
        saveSettings(settings);
        
        // Update portfolio balance
        this.updatePortfolioBalance();
        
        // Clear inputs
        document.getElementById('dwAmount').value = '';
        document.getElementById('dwNotes').value = '';
        
        this.renderTransactionHistory();
        this.renderDashboard();
        this.showToast(`Deposited +$${amount.toFixed(2)}`, 'success');
    }
    
    handleWithdraw() {
        const amount = parseFormattedNumber(document.getElementById('dwAmount').value);
        if (!amount || amount <= 0) { this.showToast('Enter a valid amount', 'warning'); return; }
        
        // Check if balance is sufficient
        const stats = this.getStats();
        if (amount > stats.currentBalance) {
            this.showToast(`Insufficient balance! Current: $${stats.currentBalance.toFixed(2)}`, 'error');
            return;
        }
        
        const notes = document.getElementById('dwNotes').value.trim();
        const settings = getSettings();
        if (!settings.transactions) settings.transactions = [];
        
        settings.transactions.push({
            type: 'WITHDRAW',
            amount: amount,
            date: getTodayStr(),
            time: new Date().toLocaleTimeString(),
            notes: notes
        });
        saveSettings(settings);
        
        // Update portfolio balance (negative)
        this.updatePortfolioBalance();
        
        // Clear inputs
        document.getElementById('dwAmount').value = '';
        document.getElementById('dwNotes').value = '';
        
        this.renderTransactionHistory();
        this.renderDashboard();
        this.showToast(`Withdrawn -$${amount.toFixed(2)}`, 'info');
    }
    
    renderTransactionHistory() {
        const container = document.getElementById('dwHistory');
        if (!container) return;
        
        const settings = getSettings();
        const transactions = settings.transactions || [];
        
        if (transactions.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:8px;font-size:0.75rem;">No transactions yet</div>';
            return;
        }
        
        // Show last 10 in reverse order
        const recent = [...transactions].reverse().slice(0, 10);
        container.innerHTML = recent.map(t => `
            <div class="dw-history-item">
                <span class="dw-type ${t.type.toLowerCase()}">${t.type === 'DEPOSIT' ? '⬇️ Deposit' : '⬆️ Withdraw'}</span>
                <span>${t.type === 'DEPOSIT' ? '+' : '-'}$${parseFloat(t.amount).toFixed(2)}</span>
                <span style="color:var(--text-muted)">${t.date}</span>
            </div>
        `).join('');
    }
    
    clearTransactions() {
        if (!confirm('Clear ALL transaction history? This will reset your balance to $0. Are you sure?')) return;
        const settings = getSettings();
        settings.transactions = [];
        saveSettings(settings);
        this.data.portfolio = [];
        cacheManager.save(this.data);
        this.updatePortfolioBalance();
        this.renderTransactionHistory();
        this.renderDashboard();
        this.showToast('Transaction history cleared. Balance reset.', 'success');
    }
    
    hardRefresh() {
        this.showToast('Refreshing...', 'info');
        if ('caches' in window) caches.keys().then(names => names.forEach(n => caches.delete(n)));
        localStorage.removeItem(CONFIG.STORAGE_KEYS.CACHE);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.LAST_SYNC);
        setTimeout(() => window.location.reload(true), 500);
    }
    
    // ===== TOAST =====
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
        
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CryptoTraderApp();
});
