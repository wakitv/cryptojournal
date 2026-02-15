# ₿ CryptoTrader Pro v2

A Progressive Web App (PWA) for crypto trading journaling & analytics with **real-time Google Sheets integration** using Google Apps Script.

![Version](https://img.shields.io/badge/version-2.0-green)
![Platform](https://img.shields.io/badge/platform-Web%20%7C%20iOS%20%7C%20Android-blue)

## ✨ Features

### 📊 6 Main Tabs

1. **Dashboard** - Portfolio overview at a glance
   - Total P&L, Win Rate, Profit Factor
   - Portfolio growth chart (Chart.js)
   - Recent trades feed
   - Active reminders widget

2. **Trade Journal** - Full trade logging with CRUD
   - Date range filter with Flatpickr
   - LONG/SHORT with auto P&L calculation
   - Entry/Exit, Quantity, Stop Loss, Take Profit
   - Strategy tagging & trade notes
   - Edit, View Details, Delete actions

3. **Open Positions** - Live position tracking
   - Unrealized P&L with color-coded cards
   - SL → TP visual progress bar
   - Close position → auto-converts to trade
   - Entry, Current, SL, TP grid display

4. **Strategies** - Trading strategy management
   - Name, Description, Timeframe, Indicators
   - Win rate bar & total trade count
   - Auto-updates from trade history

5. **Reminders & Alerts** - Never miss a setup
   - 5 types: Price Alert, News, Event, Strategy, General
   - Active/Dismissed status
   - Date + Time scheduling
   - Pair tagging

6. **Analytics** - Deep performance breakdown
   - Cumulative P&L chart
   - Win/Loss ratio bar
   - P&L by Pair breakdown
   - P&L by Strategy breakdown
   - Avg Win, Avg Loss, Best/Worst trade

### 🔥 Key Features

- ✅ **Real-time sync** with Google Sheets
- ✅ **Full CRUD** (Create, Read, Update, Delete) on all data
- ✅ **Offline support** - works without internet via Service Worker
- ✅ **PWA installable** - add to home screen
- ✅ **Mobile-first design** - responsive sidebar + bottom nav
- ✅ **Auto P&L calculation** - LONG/SHORT supported
- ✅ **Dark trading theme** - green/red color coding
- ✅ **Demo mode** - works without Google Sheets setup
- ✅ **Screenshot upload** - save charts to Google Drive
- ✅ **Date filtering** - Flatpickr date range on trades
- ✅ **Auto strategy stats** - daily trigger updates win rates

---

## 🚀 Setup Instructions

### Step 1: Create Google Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```

### Step 2: Create Google Drive Folder (for screenshots)

1. In Google Drive, create a new folder (e.g., "CryptoTrader Screenshots")
2. Copy the **Folder ID** from the URL:
   ```
   https://drive.google.com/drive/folders/[FOLDER_ID]
   ```

### Step 3: Setup Google Apps Script

1. Go to [Google Apps Script](https://script.google.com)
2. Click **"New Project"**
3. Delete any existing code
4. Copy the entire content from `google-apps-script/Code.gs`
5. Paste it into the editor
6. **Replace** the constants at the top:
   ```javascript
   const SPREADSHEET_ID = 'your-actual-spreadsheet-id';
   const DRIVE_FOLDER_ID = 'your-actual-folder-id';
   ```

### Step 4: Initialize Sheets

1. In the Apps Script editor, select `setup` function from dropdown
2. Click **Run** ▶️
3. Grant permissions when prompted
4. This creates all 5 sheets with proper headers:
   - Trades, Open Positions, Strategies, Reminders, Portfolio

### Step 5: Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ → Select **Web app**
3. Configure:
   - **Description**: CryptoTrader Pro API v2
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click **Deploy**
5. **Copy the Web App URL**

### Step 6: Configure the App

1. Open CryptoTrader Pro
2. Click **Settings** ⚙️
3. Paste the **Web App URL**
4. Click **Test Connection**
5. If successful, click **Save Settings**

### Step 7: (Optional) Auto Strategy Stats

1. In Apps Script, run `setupDailyTrigger()`
2. This auto-updates strategy win rates daily at 11 PM

---

## 📱 Installation (PWA)

### Android (Chrome)
1. Open the app in Chrome
2. Tap the **⋮** menu → **"Add to Home Screen"**

### iOS (Safari)
1. Open in Safari → Tap **Share** → **"Add to Home Screen"**

### Desktop (Chrome/Edge)
1. Click the **install icon** in the address bar

---

## 📁 Project Structure

```
crypto-journal/
├── index.html              # Main HTML (sidebar, tabs, modals)
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (offline)
├── css/
│   └── styles.css          # Dark trading theme
├── js/
│   ├── config.js           # Configuration & helpers
│   ├── api.js              # Google Apps Script API layer
│   └── app.js              # Main application class
├── assets/
│   ├── icon-192.png        # PWA icon (small)
│   └── icon-512.png        # PWA icon (large)
├── google-apps-script/
│   └── Code.gs             # Backend (paste in Apps Script)
└── README.md               # This file
```

---

## 📊 Google Sheets Structure

### Trades
| Date | Pair | Type | Strategy | Entry Price | Exit Price | Quantity | Stop Loss | Take Profit | PnL ($) | PnL (%) | Status | Notes | Screenshot URL |

### Open Positions
| Date Opened | Pair | Type | Strategy | Entry Price | Current Price | Quantity | Stop Loss | Take Profit | Notes | Screenshot URL |

### Strategies
| Name | Description | Timeframe | Indicators | Win Rate (%) | Total Trades | Created Date |

### Reminders
| Date | Time | Pair | Message | Type | Status | Created |

### Portfolio
| Date | Balance |

---

## 📊 Architecture Pattern (Same as CHIPS v2)

```
┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
│  index.html  │    │   styles.css │    │  manifest.json   │
│  (UI Layout) │    │ (Dark Theme) │    │  (PWA Config)    │
└──────┬───────┘    └──────────────┘    └──────────────────┘
       │
       ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
│  config.js   │◄───│    api.js    │◄───│     app.js       │
│  (Settings,  │    │ (API Layer,  │    │ (Main App Class, │
│   Helpers)   │    │  Cache Mgr)  │    │  CRUD, Render)   │
└──────────────┘    └──────┬───────┘    └──────────────────┘
                           │
                           ▼
                   ┌──────────────────┐
                   │  Google Apps     │
                   │  Script (Code.gs)│
                   │  ┌─ Sheets API  │
                   │  ├─ Drive API   │
                   │  └─ Triggers    │
                   └──────────────────┘
```

**config.js** → Settings, formatters, helpers (exported to window)
**api.js** → CryptoAPI class + CacheManager (same pattern as ChipsAPI)
**app.js** → CryptoTraderApp class with init, sync, render, CRUD, toast
**Code.gs** → doGet handler, CRUD operations, screenshot upload

---

## 🔧 Customization

### Change Currency
```javascript
// js/config.js
CURRENCY: '₱',  // Change from $ to ₱
```

### Change Sync Interval
```javascript
// js/config.js
AUTO_SYNC_INTERVAL: 60000,  // 60 seconds
```

### Add More Trading Pairs
```javascript
// js/config.js
PAIRS: ['BTC/USDT', 'ETH/USDT', ...],  // Add your pairs
```

### Change Theme Colors
```css
/* css/styles.css */
:root {
    --green: #00ff88;    /* Profit / accent */
    --red: #ff4757;      /* Loss */
    --blue: #4facfe;     /* Info */
}
```

---

## ⚠️ Troubleshooting

### "Connection Failed"
1. Check Web App URL is correct
2. Deploy with "Anyone" access
3. Redeploy after code changes (new deployment each time)

### Data Not Syncing
1. Check internet connection
2. Click refresh button
3. Check browser console (F12)

### Demo Mode Won't Switch
1. Paste your Web App URL in Settings
2. Click "Test Connection" first
3. Save Settings → data auto-syncs

---

## 🖥️ Deployment

### GitHub Pages (Free)
```bash
git init && git add . && git commit -m "CryptoTrader Pro v2"
git remote add origin https://github.com/YOU/crypto-journal.git
git push -u origin main
```
Then: Settings → Pages → main / root → Save

### Netlify (Free)
Drag & drop the folder → instant URL

### Vercel (Free)
```bash
npm i -g vercel && vercel
```

---

## 📝 API Reference

| Action | Description | Parameters |
|--------|-------------|------------|
| `getData` | Get all data | - |
| `addTrade` | Log new trade | `data` (JSON) |
| `updateTrade` | Edit trade | `data` (JSON with rowIndex) |
| `deleteTrade` | Remove trade | `rowIndex` |
| `addPosition` | Open position | `data` (JSON) |
| `closePosition` | Close → trade | `data` (rowIndex, exitPrice) |
| `addStrategy` | New strategy | `data` (JSON) |
| `addReminder` | New reminder | `data` (JSON) |
| `dismissReminder` | Mark done | `rowIndex` |
| `uploadScreenshot` | Save to Drive | `data` (base64, fileName) |

---

Made with 📈 for crypto traders
