// ==UserScript==
// @name         CEC功能強化
// @namespace    CEC Enhanced
// @version      V117
// @description  快捷操作按鈕、自動指派、IVP/官網快速查詢、聯繫人彈窗優化、按鈕警示色、賬戶檢測(含Suspended)、組件屏蔽、設置菜單、自動IVP/Web查詢、URL精準匹配、快捷按鈕可編輯、(Related Cases)數據提取與增強排序、跟進面板、繁簡轉換、I Want To自動化、開查/預付提示、快過期提示、自動加載Updates、模版插入優化、全局暫停/恢復功能。
// @author       Jerry Law
// @match        https://upsdrive.lightning.force.com/*
// @exclude      https://upsdrive.lightning.force.com/lightning/r/Contact/*
// @exclude      https://upsdrive.lightning.force.com/lightning/r/Dashboard/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @grant        GM_deleteValue
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/Jerry199022/Work/refs/heads/main/CEC.js
// @downloadURL  https://raw.githubusercontent.com/Jerry199022/Work/refs/heads/main/CEC.js
// ==/UserScript==

/*
V90 > V117
-架構重構：單一引擎化
-強化跟進面板
-優化攔截提示
-模版功能修正
-開查預付優化
-優化I Want to功能
-自動加載 Updates 全部內容

V84 > V90
更新內容：
-優化跟進面板
-模版插入優化

V79 > V84
更新內容：
-優化跟進面板 添加追蹤號識別
-模版插入定位優化
-頁面自動滾動
-聯繫人彈窗邏輯修復
-LinkUP窗口名稱複製功能

V74 > V79
更新內容：
-優化開查/預付case提示
-優化跟進面板
-優化模版插入

V62 > V74
更新內容：
-添加開查/預付case提示
-添加跟進面板
-一堆性能優化

V58 > V62
更新內容：
-優化完善繁簡轉換

V56 > V58
更新內容：
-自動繁簡轉換
-快過期case提示
-添加官網快速查詢

V55 > V56
更新內容：
-添加Suspended A/C识别
-添加回覆case繁简自动切换
-优化脚本执行逻辑

V54 > V55
更新內容：
-設置面板添加 選擇模版插入位置 選項

V53 > V54
更新內容：
-優化提示已回覆過的 Case 功能
-優化腳本對new case性能損耗
-優化Close this Case (auto)
*/

(function() {
    'use strict';

    // =================================================================================
    // SECTION: 專業級日誌記錄器 (Professional Logger)
    // =================================================================================


    const Log = {
        levels: {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3,
            NONE: 4
        },
        level: 0, // 默認日誌級別：INFO。設為 0 可查看 DEBUG 信息。


        _log(level, levelStr, module, message, logFn) {
            if (level >= this.level) {
                const timestamp = new Date().toLocaleTimeString('en-US', {
                    hour12: false
                });
                logFn(`[${timestamp}] [${levelStr}] [CEC Enhanced] [${module}] ${message}`);
            }
        },

        debug(module, message) {
            this._log(this.levels.DEBUG, 'DEBUG', module, message, console.log);
        },
        info(module, message) {
            this._log(this.levels.INFO, 'INFO', module, message, console.info);
        },
        warn(module, message) {
            this._log(this.levels.WARN, 'WARN', module, message, console.warn);
        },
        error(module, message) {
            this._log(this.levels.ERROR, 'ERROR', module, message, console.error);
        }
    };


    // =================================================================================
    // SECTION: 全局配置與狀態管理 (Global Configuration & State)
    // =================================================================================


    const DEFAULTS = {
        followUpPanelEnabled: true,
        notifyOnRepliedCaseEnabled: false,
        pcaDoNotClosePromptEnabled: false,
        pcaCaseListHintEnabled: false,
        highlightExpiringCasesEnabled: false,
        autoSwitchEnabled: true,
        autoScrollAfterActionButtons: false,
        autoAssignUser: '',
        sentinelCloseEnabled: true,
        blockIVPCard: false,
        autoIVPQueryEnabled: false,
        autoWebQueryEnabled: false,
        autoLoadAllUpdates: true,
        accountHighlightMode: 'pca',
        richTextEditorHeight: 500,
        caseDescriptionHeight: 160,
        caseHistoryHeight: 208,
        iwtAutoFillTexts: {
            reOpen: ['Reopen'],
            closeCase: ['Close'],
            documentContact: ['Call customer and explain']
        },
        iWantToButtonStyles: {
            marginTop: '-7px',
            marginBottom: '5px',
            marginLeft: '0px',
            marginRight: '0px',
        },
        postInsertionEnhancementsEnabled: false,
        templateInsertionMode: 'logo', // [新增] 模板插入模式，'logo' 或 'cursor'
        cursorPositionBrIndex: 5,
        actionButtons: [{
            id: "btn-1",
            name: "運輸",
            category: ["Tracking - In Transit"],
            subCategory: ["Exception Explanations"],
            role: ["Shipper"]
        }, {
            id: "btn-2",
            name: "清關",
            category: ["Brokerage - Customs Clearance"],
            subCategory: ["Status Explanations / Instructions", "Import - Status Expl / Instructions", "General Information"],
            role: ["Shipper"]
        }, {
            id: "btn-3",
            name: "派送",
            category: ["Tracking - Delivery Attempt"],
            subCategory: ["Explanations / Instructions"],
            role: ["Shipper"]
        }, {
            id: "btn-4",
            name: "POD",
            category: ["Tracking - Delivered Package"],
            subCategory: ["Delivery Explanation / POD"],
            role: ["Shipper"]
        }, {
            id: "btn-5",
            name: "開查",
            category: ["Claims"],
            subCategory: ["Lost Package Investigation"],
            role: ["Shipper"]
        }, {
            id: "btn-6",
            name: "預付",
            category: ["Billing / Invoice - Transportation"],
            subCategory: ["Bill Terms - Rebill / Chargeback"],
            role: ["Shipper"]
        }, {
            id: "btn-7",
            name: "落單",
            category: ["Pickup / Collection"],
            subCategory: ["New Pickup Scheduled"],
            role: ["Shipper"]
        }, {
            id: "btn-8",
            name: "ERN",
            category: ["Tracking - In Transit"],
            subCategory: ["Intl Undelivered - ERN"],
            role: ["Shipper"]
        }, ],
        cleanModeEnabled: false,
        cleanModeConfig: [{
            id: 'north_panel',
            label: '頂部信息面板',
            selector: 'c-cec_contextual-alerts-panel-list > .slds-grid',
            enabled: false,
            isCore: false
        }, {
            id: 'left_panel_component_1',
            label: 'Knowledge',
            selector: '.slds-p-left_x-small.slds-size_1-of-4.slds-container > .uiScrollerWrapper.customScrollerStyle.slds-scrollable_y.scrollable > .slds-m-bottom_medium > .forcegenerated-flexipage-region > flexipage-component2 > slot > flexipage-aura-wrapper',
            enabled: false,
            isCore: false
        }, {
            id: 'left_panel_tabs',
            label: 'ACTIVITY',
            selector: '.slds-p-left_x-small.slds-size_1-of-4.slds-container > .uiScrollerWrapper.customScrollerStyle.slds-scrollable_y.scrollable > .slds-m-bottom_medium > .forcegenerated-flexipage-region > flexipage-component2:nth-of-type(4) > slot > flexipage-tabset2 > .slds-tabs_card',
            enabled: false,
            isCore: false
        }, {
            id: 'stacked_card',
            label: 'Customer Local Time',
            selector: '.stacked.slds-var-p-around_medium.custom-background.slds-wrap.slds-card',
            enabled: false,
            isCore: false
        }, {
            id: 'right_panel_card',
            label: 'Related Quick Links',
            selector: '.slds-p-right_x-small.slds-size_1-of-4.slds-container > .uiScrollerWrapper.customScrollerStyle.slds-scrollable_y.scrollable > .slds-m-bottom_medium > .forcegenerated-flexipage-region > flexipage-component2 > slot > flexipage-aura-wrapper > div > .slds-card',
            enabled: false,
            isCore: false
        }, {
            id: 'feed_tabs',
            label: 'Submitter Details',
            selector: 'flexipage-component2:nth-of-type(6) > slot > flexipage-tabset2 > .slds-tabs_card',
            enabled: false,
            isCore: false
        }, {
            id: 'utility_bar',
            label: '底部工具欄',
            selector: '.slds-utility-bar.utilitybar',
            enabled: false,
            isCore: false
        }, {
            id: 'south_panel',
            label: '懸浮提示',
            selector: '.active.open.south.positioned.forceHoverPanel.uiPanel.uiPanel--default, .active.open.north.positioned.forceHoverPanel.uiPanel.uiPanel--default, .active.open.east.positioned.forceHoverPanel.uiPanel.uiPanel--default, lightning-button-icon.hover-button-icon-element',
            enabled: true,
            isCore: false
        }, {
            id: 'remove_top_padding',
            label: '移除Associate Contact按鈕頂部間距',
            selector: '.slds-p-top_medium, .slds-p-top--medium',
            customRule: 'padding-top: 0px !important;',
            enabled: false,
            isCore: false
        }, ]
    };


    // [設定/狀態持久化] 功能：`PERF_CONFIG`。
    const PERF_CONFIG = {
        HEARTBEAT_INTERVAL_MS: 10000, // 10000ms: 心跳檢測間隔。用於捕獲由非標準事件觸發的URL變化，作為事件監聽器的補充。
        URL_CHANGE_DEBOUNCE_MS: 350, // 350ms: URL變化事件的防抖延遲。防止因URL在短時間內多次變化（如重定向）導致主邏輯重複執行。
    };

    // 全局狀態變量
    let isScriptPaused = GM_getValue('isScriptPaused', false);
    let lastUrl = '';
    let foundCaseNumber = null;
    let foundTrackingNumber = null;
    let ivpWindowHandle = null;
    let webWindowHandle = null;
    let globalToastTimer = null;
    let globalScannerId = null;
    let sendButtonBypassNextClick = false;
    let sendButtonPendingSpecialType = null;
    let pcaCaseListOriginalRowKeys = null;
    let pcaCaseListIsSorted = false;
    let ivpFocusTimeoutId = null;
    const completedTasksRegister = new Set();
    let DOM_PATH_CACHE = {};

    // [優化] 運行時配置緩存，避免高頻調用 GM_getValue
    let RUNTIME_CONFIG = {};

    // 數據緩存：用於跨 Tab 瞬間恢復 Case 數據，消除面板顯示延遲
    const CASE_DATA_CACHE = new Map();

    // =================================================================================
    // SECTION: 頁面級資源註冊與清理 (Page Resource Registry)
    // =================================================================================

    const PageResourceRegistry = {
        observers: new Set(),
        timeouts: new Set(),
        intervals: new Set(),

        addObserver(observer) {
            if (observer && typeof observer.disconnect === 'function') {
                this.observers.add(observer);
            }
            return observer;
        },

        addTimeout(timeoutId) {
            if (timeoutId) {
                this.timeouts.add(timeoutId);
            }
            return timeoutId;
        },

        addInterval(intervalId) {
            if (intervalId) {
                this.intervals.add(intervalId);
            }
            return intervalId;
        },

        cleanup(reason = 'unknown') {
            const observerCount = this.observers.size;
            const timeoutCount = this.timeouts.size;
            const intervalCount = this.intervals.size;

            // 1) disconnect observers
            this.observers.forEach(obs => {
                try { obs.disconnect(); } catch (e) { /* ignore */ }
            });
            this.observers.clear();

            // 2) clear timeouts
            this.timeouts.forEach(id => {
                try { clearTimeout(id); } catch (e) { /* ignore */ }
            });
            this.timeouts.clear();

            // 3) clear intervals
            this.intervals.forEach(id => {
                try { clearInterval(id); } catch (e) { /* ignore */ }
            });
            this.intervals.clear();

            Log.info('Core.Registry', `頁面級資源已清理完成 (reason: ${reason}) [observers: ${observerCount}, timeouts: ${timeoutCount}, intervals: ${intervalCount}]。`);
        }
    };

    // =================================================================================
    // SECTION: 跟進面板模塊（Follow-Up Panel Module）- (ID直連匹配版)
    // =================================================================================
    const FollowUpPanel = (() => {
        const FOLLOW_UP_DEBUG = false;

        // -----------------------------
        // 用戶設置
        // -----------------------------
        const PANEL_RIGHT = 12;
        const PANEL_BOTTOM = 60;
        const DEFAULT_PANEL_WIDTH = 510;
        const MIN_PANEL_WIDTH = 320;
        const MAX_PANEL_WIDTH_RATIO = 0.8;
        const DEFAULT_PANEL_HEIGHT = 420;
        const MIN_PANEL_HEIGHT = 180;
        const MAX_PANEL_HEIGHT_RATIO = 0.8;

        // -----------------------------
        // 鍵值定義
        // -----------------------------
        const KEY_ITEMS = 'FU_PANEL_ITEMS_V1';
        const KEY_UI = 'FU_PANEL_UI_V4';
        const PANEL_ID = 'fuPanelRoot';
        const BTN_ID_PREFIX = 'fu_caseFollowTimeBtn';
        const POPOVER_ID = 'fuPopover';
        const DROPDOWN_ID = 'fuFollowTimeMenu';

        const QUICK_DAYS_CASE_OTHER = [0, 1, 7, 14];
        const QUICK_DAYS_PANEL_PICKER = [1, 2, 3, 7];

        // -----------------------------
        // 狀態變量
        // -----------------------------
        const UW = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
        let wsReady = false; let wsInit = false; let wsCmp = null; let wsQueue = [];
        let stylesInjected = false; let sanitizedOnce = false;

        let __fuRenderTimer = null; let __fuRenderRaf = null; let __fuWatchBound = false;

        // [聯動變量] 列表頁匹配集合 (Map<CaseNo, Color>)
        let listPageMatches = new Map();

        // [狀態柵欄] 當前頁面是否匹配跟進記錄的快照
        let _currentMatchState = {
            isMatched: false,
            matchType: null, // 'case' | 'tracking'
            matchedRecordId: null, // 用於刪除操作
            color: null // 用於彈窗顏色
        };

        // -----------------------------
        // 基礎工具函數
        // -----------------------------
        const gmGet = (key, fallback) => {
            try { return GM_getValue(key, fallback); } catch (e) { return fallback; }
        };

        // [設定/狀態持久化 / 事件監聽 / 定時/防抖] 功能：`gmSet`。
        const gmSet = (key, val) => {
            try { GM_setValue(key, val); } catch (e) { }
        };

        // [事件監聽 / 定時/防抖] 功能：`scheduleRenderPanel`。
        const scheduleRenderPanel = (delayMs = 0) => {
            if (!document.getElementById(PANEL_ID)) return;
            if (__fuRenderTimer) clearTimeout(__fuRenderTimer);
            __fuRenderTimer = setTimeout(() => {
                __fuRenderTimer = null;
                if (__fuRenderRaf) cancelAnimationFrame(__fuRenderRaf);
                __fuRenderRaf = requestAnimationFrame(() => {
                    try { renderPanel(); } catch (e) { console.error('Render Error:', e); }
                });
            }, delayMs);
        };

        // [事件監聽] 功能：`bindFollowUpPanelWatchers`。
        const bindFollowUpPanelWatchers = () => {
            if (__fuWatchBound) return;
            __fuWatchBound = true;
            window.addEventListener('urlchange', () => scheduleRenderPanel(0), true);
            window.addEventListener('popstate', () => scheduleRenderPanel(0), true);
            window.addEventListener('hashchange', () => scheduleRenderPanel(0), true);
        };

        // -----------------------------
        // 日期計算邏輯
        // -----------------------------
        const startOfDay = (d) => {
            const x = d ? new Date(d) : new Date();
            x.setHours(0, 0, 0, 0);
            return x;
        };

        // 功能：`calcSmartDueDate`。
        const calcSmartDueDate = (offsetDays) => {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            if (offsetDays === 0) {
                while (d.getDay() === 0 || d.getDay() === 6) {
                    d.setDate(d.getDate() + 1);
                }
            } else {
                let added = 0;
                while (added < offsetDays) {
                    d.setDate(d.getDate() + 1);
                    if (d.getDay() !== 0 && d.getDay() !== 6) {
                        added++;
                    }
                }
            }
            d.setHours(23, 59, 59, 999);
            return d.getTime();
        };

        // 功能：`dayDiffFromToday`。
        const dayDiffFromToday = (dueAtMs) => {
            const today0 = startOfDay(new Date()).getTime();
            const due0 = startOfDay(new Date(dueAtMs)).getTime();
            return Math.round((due0 - today0) / 86400000);
        };

        // 功能：`bucketOf`。
        const bucketOf = (dueAtMs) => {
            const diff = dayDiffFromToday(dueAtMs);
            if (diff <= 0) return 'today';
            if (diff === 1) return 'tomorrow';
            if (diff === 2) return 'dayafter';
            return 'later';
        };

        // 功能：`bucketTitle`。
        const bucketTitle = (key) => {
            if (key === 'today') return '今天跟進';
            if (key === 'tomorrow') return '明天跟進';
            if (key === 'dayafter') return '後天跟進';
            if (key === 'later') return '往後跟進';
            return key;
        };

        // 功能：`formatDueAtDDMon`。
        const formatDueAtDDMon = (ms) => {
            const d = new Date(ms);
            const day = String(d.getDate()).padStart(2, '0');
            const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
            return `${day} ${mon}`;
        };

        // -----------------------------
        // Case 相關邏輯
        // -----------------------------
        const getCaseId = () => getCaseIdFromUrl(location.href);

        // [Console 分頁] 功能：`normalizeCaseNo`。
        const normalizeCaseNo = (raw) => {
            if (!raw) return null;
            const s = String(raw).trim();
            const m = s.match(/C-\d{10}/i);
            if (m && m[0]) {
                const digits0 = m[0].replace(/c-/i, '').replace(/[^0-9]/g, '');
                return 'C-' + digits0.slice(0, 10);
            }
            const m2 = s.match(/C-(\d+)/i);
            if (m2 && m2[1]) {
                const digits = String(m2[1]).replace(/[^0-9]/g, '');
                if (digits.length >= 10) return 'C-' + digits.slice(0, 10);
            }
            return null;
        };

        // [Console 分頁 / 定時/防抖] 功能：`buildCaseUrl`。
        const buildCaseUrl = (caseId) => caseId ? `${location.origin}/lightning/r/Case/${caseId}/view` : null;

        // -----------------------------
        // Workspace API
        // -----------------------------
        const auraCb = (fn) => {
            try {
                if (UW.$A && typeof UW.$A.getCallback === 'function') return UW.$A.getCallback(fn);
            } catch (e) { }
            return fn;
        };

        // [Console 分頁 / 定時/防抖] 功能：`wsFlush`。
        const wsFlush = () => {
            if (!wsReady || !wsQueue.length) return;
            const q = wsQueue.slice();
            wsQueue = [];
            q.forEach((f) => { try { f(); } catch (e) { } });
        };

        // [Console 分頁 / 定時/防抖] 功能：`wsEnsure`。
        const wsEnsure = () => {
            if (wsReady || wsInit) return;
            wsInit = true;
            try {
                if (!UW.$A || typeof UW.$A.createComponent !== 'function' || typeof UW.$A.getRoot !== 'function') {
                    wsInit = false; return;
                }
                UW.$A.createComponent('lightning:workspaceAPI', {}, auraCb((cmp, status) => {
                    if (status !== 'SUCCESS' || !cmp) { wsInit = false; return; }
                    wsCmp = cmp;
                    try {
                        const root = UW.$A.getRoot();
                        if (root && typeof root.get === 'function' && typeof root.set === 'function') {
                            let body = root.get('v.body');
                            if (!Array.isArray(body)) body = body ? [body] : [];
                            body.push(cmp);
                            root.set('v.body', body);
                        }
                    } catch (e2) { }
                    wsReady = true; wsInit = false; wsFlush();
                }));
                setTimeout(() => { if (!wsReady && wsInit) wsInit = false; }, 2000);
            } catch (e) { wsInit = false; }
        };

        // [Console 分頁] 功能：`openCaseInConsoleTab`。
        const openCaseInConsoleTab = (caseId, focus = true) => {
            if (!caseId) return;
            wsEnsure();
            const url = `/lightning/r/Case/${caseId}/view`;
            // [Console 分頁] 功能：`doOpen`。
            const doOpen = () => {
                try {
                    if (wsReady && wsCmp && typeof wsCmp.openTab === 'function') {
                        wsCmp.openTab({ url, focus: focus !== false });
                        return true;
                    }
                } catch (e) { }
                return false;
            };
            if (wsReady) { if (!doOpen()) window.open(buildCaseUrl(caseId), '_blank'); return; }
            wsQueue.push(() => { if (!doOpen()) window.open(buildCaseUrl(caseId), '_blank'); });
        };

        // -----------------------------
        // 數據存儲邏輯
        // -----------------------------
        const sanitizeItems = (items) => {
            const map = Object.create(null);
            for (const it of (items || [])) {
                if (!it || !it.caseId || !it.dueAt) continue;
                const cid = String(it.caseId);
                const score = Number(it.updatedAt || it.createdAt || 0);
                const cn = normalizeCaseNo(it.caseNo) || it.caseNo || '';
                // 功能：`clean`。
                const clean = {
                    id: it.id || (cid + '_' + score),
                    caseId: cid,
                    caseNo: cn,
                    note: it.note || '',
                    trackingNo: it.trackingNo || '',
                    dueAt: Number(it.dueAt),
                    createdAt: Number(it.createdAt || score || Date.now()),
                    updatedAt: Number(it.updatedAt || score || Date.now())
                };
                if (!map[cid] || score >= map[cid].__score) {
                    clean.__score = score;
                    map[cid] = clean;
                }
            }
            const out = [];
            for (const k in map) { if (map[k]) { delete map[k].__score; out.push(map[k]); } }
            out.sort((a, b) => (a.dueAt - b.dueAt) || (a.createdAt - b.createdAt));
            return out;
        };

        // 功能：`loadItems`。
        const loadItems = () => {
            const raw = gmGet(KEY_ITEMS, '[]');
            let arr;
            try { arr = JSON.parse(raw); if (!Array.isArray(arr)) arr = []; } catch (e) { arr = []; }
            if (!sanitizedOnce) {
                sanitizedOnce = true;
                const clean = sanitizeItems(arr);
                gmSet(KEY_ITEMS, JSON.stringify(clean));
                return clean;
            }
            return arr;
        };

        // 功能：`saveItems`。
        const saveItems = (items) => gmSet(KEY_ITEMS, JSON.stringify(items || []));

        // 功能：`upsertItem`。
        const upsertItem = ({ caseId, caseNo, dueAt }) => {
            if (!caseId || !caseNo || !dueAt) return;
            const items = sanitizeItems(loadItems());
            const now = Date.now();
            const cn = normalizeCaseNo(caseNo) || caseNo;
            const idx = items.findIndex((x) => x && x.caseId === caseId);
            const autoTrackingNote = foundTrackingNumber ? (foundTrackingNumber + " - ") : '';

            if (idx >= 0) {
                items[idx].dueAt = dueAt;
                items[idx].caseNo = cn;
                items[idx].updatedAt = now;
                if (autoTrackingNote) items[idx].trackingNo = autoTrackingNote;
                if (!items[idx].note && autoTrackingNote) {
                    items[idx].note = autoTrackingNote;
                }
            } else {
                items.push({
                    id: `${caseId}_${now}`,
                    caseId,
                    caseNo: cn,
                    note: autoTrackingNote,
                    trackingNo: autoTrackingNote,
                    dueAt,
                    createdAt: now,
                    updatedAt: now
                });
            }
            saveItems(sanitizeItems(items));
        };

        // [定時/防抖] 功能：`deleteItem`。
        const deleteItem = (caseId) => {
            const items = sanitizeItems(loadItems());
            saveItems(items.filter((it) => it && it.caseId !== caseId));
        };

        // [事件監聽 / 定時/防抖] 功能：`updateNote`。
        const updateNote = (caseId, note) => {
            const items = sanitizeItems(loadItems());
            for (const it of items) {
                if (it && it.caseId === caseId) { it.note = note || ''; it.updatedAt = Date.now(); break; }
            }
            saveItems(items);
        };

        // [事件監聽 / 定時/防抖] 功能：`updateDueAt`。
        const updateDueAt = (caseId, dueAt) => {
            const items = sanitizeItems(loadItems());
            for (const it of items) {
                if (it && it.caseId === caseId) { it.dueAt = dueAt; it.updatedAt = Date.now(); break; }
            }
            saveItems(items);
        };

        // -----------------------------
        // UI 懸浮工具
        // -----------------------------
        const removePopover = () => { const el = document.getElementById(POPOVER_ID); if (el) el.remove(); };
        // [事件監聽 / 定時/防抖] 功能：`removeDropdown`。
        const removeDropdown = () => { const el = document.getElementById(DROPDOWN_ID); if (el) el.remove(); };
        // [事件監聽 / 定時/防抖] 功能：`removeAllFloating`。
        const removeAllFloating = () => { removePopover(); removeDropdown(); };

        // [事件監聽 / 定時/防抖] 功能：`placeNear`。
        const placeNear = (a, p, up, w = 260, h = 240) => {
            const r = a.getBoundingClientRect();
            const l = Math.max(10, Math.min(window.innerWidth - (w + 10), r.left));
            let t;
            if (up) {
                t = r.top - h;
                if (t < 10) t = r.bottom + 8;
            } else {
                t = r.bottom + 8;
                if (t + h > window.innerHeight - 10) t = Math.max(10, r.top - h);
            }
            p.style.left = `${l}px`;
            p.style.top = `${t}px`;
        };

        // [事件監聽 / 定時/防抖] 功能：`attachOutsideClose`。
        const attachOutsideClose = (p, a, fn) => {
            setTimeout(() => {
                // [事件監聽 / 定時/防抖] 功能：`f`。
                const f = (e) => {
                    if (!p.contains(e.target) && e.target !== a) {
                        fn();
                        document.removeEventListener('mousedown', f, true);
                    }
                };
                document.addEventListener('mousedown', f, true);
            }, 0);
        };

        // [事件監聽 / 定時/防抖] 功能：`attachOutsideCloseWithin`。
        const attachOutsideCloseWithin = (p, c, fn) => {
            setTimeout(() => {
                // [事件監聽] 功能：`f`。
                const f = (e) => {
                    if (c && !c.contains(e.target)) {
                        fn();
                        document.removeEventListener('mousedown', f, true);
                    }
                };
                document.addEventListener('mousedown', f, true);
            }, 0);
        };

        // -----------------------------
        // 日期選擇器 UI (完整)
        // -----------------------------
        const buildLaterPickerContent = (onPickTimestamp, quickDays) => {
            const wrap = document.createElement('div');
            const title = document.createElement('div');
            title.className = 'fu-pop-title';
            title.textContent = '選擇跟進日期';
            wrap.appendChild(title);

            const days = (Array.isArray(quickDays) && quickDays.length) ? quickDays : [3, 4, 7, 14];
            const grid = document.createElement('div');
            grid.className = 'fu-pop-grid';
            days.forEach((d) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'fu-pill';
                btn.textContent = (d === 0) ? 'Today' : `T+${d}`;
                btn.addEventListener('click', () => {
                    const targetTs = calcSmartDueDate(d);
                    onPickTimestamp(targetTs);
                });
                grid.appendChild(btn);
            });
            wrap.appendChild(grid);

            const calContainer = document.createElement('div');
            calContainer.className = 'fu-cal-wrap';

            let currDate = new Date();
            let viewYear = currDate.getFullYear();
            let viewMonth = currDate.getMonth();
            const todayStr = `${currDate.getFullYear()}-${currDate.getMonth()}-${currDate.getDate()}`;

            // 功能：`renderCalendar`。
            const renderCalendar = () => {
                calContainer.innerHTML = '';
                const header = document.createElement('div');
                header.className = 'fu-cal-header';
                const btnPrev = document.createElement('button');
                btnPrev.className = 'fu-cal-nav';
                btnPrev.textContent = '◂';
                btnPrev.onclick = (e) => { e.stopPropagation(); changeMonth(-1); };
                const label = document.createElement('span');
                label.className = 'fu-cal-title';
                label.textContent = `${viewYear}年 ${viewMonth + 1}月`;
                const btnNext = document.createElement('button');
                btnNext.className = 'fu-cal-nav';
                btnNext.textContent = '▸';
                btnNext.onclick = (e) => { e.stopPropagation(); changeMonth(1); };
                header.appendChild(btnPrev);
                header.appendChild(label);
                header.appendChild(btnNext);
                calContainer.appendChild(header);

                const weekdays = document.createElement('div');
                weekdays.className = 'fu-cal-weekdays';
                ['日', '一', '二', '三', '四', '五', '六'].forEach(d => {
                    const span = document.createElement('span');
                    span.textContent = d;
                    weekdays.appendChild(span);
                });
                calContainer.appendChild(weekdays);

                const calGrid = document.createElement('div');
                calGrid.className = 'fu-cal-grid';
                const firstDay = new Date(viewYear, viewMonth, 1).getDay();
                const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

                for (let i = 0; i < firstDay; i++) {
                    calGrid.appendChild(document.createElement('div'));
                }
                for (let d = 1; d <= daysInMonth; d++) {
                    const cell = document.createElement('div');
                    cell.className = 'fu-cal-day';
                    cell.textContent = d;
                    const thisDateObj = new Date(viewYear, viewMonth, d);
                    const thisDateStr = `${viewYear}-${viewMonth}-${d}`;
                    if (thisDateStr === todayStr) {
                        cell.classList.add('today');
                        cell.title = '今天';
                    }
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    if (thisDateObj < now) {
                        cell.classList.add('disabled');
                    } else {
                        cell.onclick = (e) => {
                            e.stopPropagation();
                            while (thisDateObj.getDay() === 0 || thisDateObj.getDay() === 6) {
                                thisDateObj.setDate(thisDateObj.getDate() + 1);
                            }
                            thisDateObj.setHours(23, 59, 59, 999);
                            onPickTimestamp(thisDateObj.getTime());
                        };
                    }
                    calGrid.appendChild(cell);
                }
                calContainer.appendChild(calGrid);
            };

            // [事件監聽] 功能：`changeMonth`。
            const changeMonth = (offset) => {
                viewMonth += offset;
                if (viewMonth > 11) { viewMonth = 0; viewYear++; }
                else if (viewMonth < 0) { viewMonth = 11; viewYear--; }
                renderCalendar();
            };

            renderCalendar();
            wrap.appendChild(calContainer);
            return wrap;
        };

        // [事件監聽] 功能：`showChangeMenu`。
        const showChangeMenu = (anchorEl, onPickTimestamp) => {
            removePopover();
            removeDropdown();
            const pop = document.createElement('div');
            pop.id = POPOVER_ID;
            pop.className = 'fu-popover-global';
            placeNear(anchorEl, pop, true, 280, 260);
            pop.appendChild(buildLaterPickerContent((pickedTs) => {
                onPickTimestamp(pickedTs);
                removePopover();
            }, QUICK_DAYS_PANEL_PICKER));
            document.body.appendChild(pop);
            attachOutsideClose(pop, anchorEl, removePopover);
        };

        // [事件監聽] 功能：`renderOtherPickerInMenu`。
        const renderOtherPickerInMenu = (menuEl, anchorEl, onPickTimestamp) => {
            while (menuEl.firstChild) menuEl.removeChild(menuEl.firstChild);
            const head = document.createElement('div');
            head.className = 'fu-ddhead';
            const back = document.createElement('span');
            back.className = 'fu-ddback';
            back.textContent = '←';
            back.title = '返回';
            const title = document.createElement('span');
            title.className = 'fu-ddtitle';
            title.textContent = 'Other';
            head.appendChild(back);
            head.appendChild(title);
            menuEl.appendChild(head);
            back.addEventListener('click', (e) => {
                e.stopPropagation();
                buildFollowTimeMenu(menuEl, anchorEl, menuEl.__onPick);
            });
            const content = buildLaterPickerContent((pickedTs) => {
                removeDropdown();
                onPickTimestamp(pickedTs);
            }, QUICK_DAYS_CASE_OTHER);
            content.className = 'fu-ddcontent';
            menuEl.appendChild(content);
            menuEl.style.minWidth = '250px';
        };

        // [事件監聽] 功能：`buildFollowTimeMenu`。
        const buildFollowTimeMenu = (menuEl, anchorEl, onPick) => {
            while (menuEl.firstChild) menuEl.removeChild(menuEl.firstChild);
            menuEl.style.minWidth = '';
            menuEl.style.width = '';
            menuEl.__onPick = onPick;
            // [事件監聽 / 元素定位] 功能：`addItem`。
            const addItem = (label, value) => {
                const item = document.createElement('div');
                item.className = 'fu-dditem';
                item.textContent = label;
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (value === 'other') {
                        renderOtherPickerInMenu(menuEl, anchorEl, (timestamp) => onPick('other', timestamp));
                        return;
                    }
                    removeDropdown();
                    onPick(value, null);
                });
                menuEl.appendChild(item);
            };
            addItem('T+2', 2);
            addItem('T+3', 3);
            addItem('T+10', 10);
            addItem('Other', 'other');
        };

        // [定時/防抖 / 元素定位] 功能：`showFollowTimeDropdown`。
        const showFollowTimeDropdown = (anchorEl, onPick) => {
            removeDropdown();
            removePopover();
            let wrap = (anchorEl && anchorEl.closest) ? anchorEl.closest('.fu-follow-ddwrap') : null;
            if (!wrap) wrap = (anchorEl && anchorEl.parentElement) ? anchorEl.parentElement : null;
            const menu = document.createElement('div');
            menu.id = DROPDOWN_ID;
            menu.className = 'fu-ddmenu';
            menu.style.boxSizing = 'border-box';
            buildFollowTimeMenu(menu, anchorEl, onPick);
            if (wrap) {
                wrap.appendChild(menu);
                attachOutsideCloseWithin(menu, wrap, removeDropdown);
            } else {
                document.body.appendChild(menu);
                attachOutsideClose(menu, anchorEl, removeDropdown);
            }
        };

        // -----------------------------
        // 標題閃爍
        // -----------------------------
        let __fuHeaderHintTimer1 = null; let __fuHeaderHintTimer2 = null; let __fuHeaderHintTimer3 = null; let __fuHeaderOriginalTitle = null;

        // [定時/防抖 / 元素定位] 功能：`getHeaderTitleEl`。
        const getHeaderTitleEl = () => {
            const root = document.getElementById(PANEL_ID);
            if (!root) return null;
            return root.querySelector('.fu-title');
        };

        // [定時/防抖] 功能：`flashHeaderHint`。
        const flashHeaderHint = (message) => {
            ensurePanel();
            const titleEl = getHeaderTitleEl();
            if (!titleEl) return;
            if (__fuHeaderHintTimer1) clearTimeout(__fuHeaderHintTimer1);
            if (__fuHeaderHintTimer2) clearTimeout(__fuHeaderHintTimer2);
            if (__fuHeaderHintTimer3) clearTimeout(__fuHeaderHintTimer3);
            if (__fuHeaderOriginalTitle == null) {
                __fuHeaderOriginalTitle = titleEl.textContent || '跟進面板';
            }
            titleEl.style.transition = 'opacity 200ms ease';
            titleEl.textContent = message;
            titleEl.style.opacity = '0';
            requestAnimationFrame(() => { titleEl.style.opacity = '1'; });
            __fuHeaderHintTimer1 = setTimeout(() => { titleEl.style.opacity = '0'; }, 1800);
            __fuHeaderHintTimer2 = setTimeout(() => {
                titleEl.textContent = __fuHeaderOriginalTitle || '跟進面板';
                titleEl.style.opacity = '1';
            }, 2000);
            __fuHeaderHintTimer3 = setTimeout(() => { titleEl.style.transition = ''; }, 1050);
        };

        // 功能：`flashHeaderHintByDueAt`。
        const flashHeaderHintByDueAt = (dueAt) => {
            const key = bucketOf(dueAt);
            const title = bucketTitle(key);
            flashHeaderHint(`+1 ${title}`);
        };

        // -----------------------------
        // CSS 樣式注入
        // -----------------------------
        const injectStyles = () => {
            if (stylesInjected) return;
            stylesInjected = true;
            const css = [
                `#${PANEL_ID} { position: fixed; right: ${PANEL_RIGHT}px; bottom: ${PANEL_BOTTOM}px; z-index: 999999; color: #1f1f1f; }`,
                `#${PANEL_ID} .fu-panel { position: absolute; right: 0; bottom: 0; background: #fff; border: 1px solid rgba(0,0,0,.12); border-radius: 12px; box-shadow: 0 12px 30px rgba(0,0,0,.18); overflow: hidden; }`,
                `#${PANEL_ID} .fu-resize-top { position: absolute; left: 0; right: 0; top: 0; height: 8px; cursor: ns-resize; background: linear-gradient(to bottom, rgba(0,0,0,.10), rgba(0,0,0,0)); z-index: 4; }`,
                `#${PANEL_ID} .fu-resize-left { position: absolute; left: 0; top: 0; bottom: 0; width: 8px; cursor: ew-resize; background: transparent; z-index: 3; }`,
                `#${PANEL_ID} .fu-header { opacity: 1; }`,
                `#${PANEL_ID} .fu-panel.fu-collapsed { opacity: 0.75; }`,
                `#${PANEL_ID} .fu-panel.fu-collapsed .fu-resize-top { display: none !important; }`,
                `#${PANEL_ID} .fu-panel.fu-collapsed .fu-resize-left { display: none !important; }`,
                `#${PANEL_ID} .fu-header { position: relative; background: #0176D3; color: #fff; display: grid; grid-template-columns: 1fr auto; align-items: center; padding: 5px 10px; user-select: none; cursor: pointer; }`,
                `#${PANEL_ID} .fu-header-inner { grid-column: 1; justify-self: center; display: inline-flex; align-items: center; justify-content: center; gap: 8px; max-width: 100%; white-space: nowrap; overflow: hidden; }`,
                `#${PANEL_ID} .fu-title { font-weight: 700; font-size: 14px; letter-spacing: .4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; writing-mode: horizontal-tb; }`,
                `#${PANEL_ID} .fu-arrow { grid-column: 2; justify-self: end; width: 26px; height: 26px; border-radius: 8px; border: 0px solid rgba(255,255,255,.45); display: inline-flex; align-items: center; justify-content: center; font-size: 28px; pointer-events: none; }`,
                `#${PANEL_ID} .fu-body { padding: 8px 8px 10px; overflow: auto; }`,
                `#${PANEL_ID} .fu-panel.fu-collapsed { width: 150px !important; }`,
                `#${PANEL_ID} .fu-panel.fu-collapsed .fu-body { height: 0 !important; opacity: 0; padding: 0 !important; overflow: hidden; }`,
                `#${PANEL_ID} .fu-section { margin-top: 8px; }`,
                `#${PANEL_ID} .fu-section-title { font-weight: 700; font-size: 13px; color: rgba(0,0,0,.72); padding: 6px 6px; background: rgba(0,0,0,.03); border-radius: 10px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }`,
                `#${PANEL_ID} .fu-section-title:hover { background: rgba(0,0,0,.05); }`,
                `#${PANEL_ID} .fu-list { margin-top: 6px; display: flex; flex-direction: column; gap: 8px; }`,
                `#${PANEL_ID} .fu-row { display: flex; gap: 8px; align-items: center; padding: 4px; border: 1px solid rgba(0,0,0,.08); border-radius: 12px; background: #fff; }`,
                `#${PANEL_ID} .fu-case { font-weight: 700; font-size: 14px; color: #0b5cab; text-decoration: none; display: inline-block; flex: 0 0 auto; max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }`,
                `#${PANEL_ID} .fu-note { flex: 1 1 auto; min-width: 110px; font-size: 12px; padding: 6px 8px; border-radius: 10px; border: 1px solid rgba(0,0,0,.12); outline: none; }`,
                `#${PANEL_ID} .fu-note:focus { border-color: rgba(1,118,211,.7); box-shadow: 0 0 0 2px rgba(1,118,211,.12); }`,
                `#${PANEL_ID} .fu-iconbtn { width: 28px; height: 28px; border-radius: 10px; border: 1px solid rgba(0,0,0,.12); background: #fff; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; line-height: 1; flex: 0 0 auto; }`,
                '.fu-popover-global, .fu-ddmenu { position: fixed; z-index: 2147483647; background: #fff; border: 1px solid rgba(0,0,0,.12); border-radius: 12px; box-shadow: 0 12px 30px rgba(0,0,0,.18); padding: 12px; pointer-events: auto; }',
                '.fu-pop-title { font-weight: 800; font-size: 12px; margin-bottom: 8px; color: rgba(0,0,0,.78); }',
                '.fu-pop-chips { display: flex; gap: 8px; margin-bottom: 10px; }',
                '.fu-chip { flex: 1 1 auto; border: 1px solid rgba(1,118,211,.35); background: rgba(1,118,211,.08); color: #014486; border-radius: 999px; padding: 6px 10px; cursor: pointer; font-size: 12px; font-weight: 700; }',
                '.fu-chip:hover { background: rgba(1,118,211,.12); }',
                '.fu-pop-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }',
                '.fu-pill { border: 1px solid rgba(1,118,211,.28); background: rgba(1,118,211,.06); color: #014486; border-radius: 10px; padding: 7px 4px; cursor: pointer; font-size: 12px; font-weight: 800; }',
                '.fu-pill:hover { background: rgba(1,118,211,.12); }',
                '.fu-pop-row { display: flex; gap: 8px; align-items: center; }',
                '.fu-pop-row input { flex: 1; font-size: 12px; padding: 8px 10px; border-radius: 10px; border: 1px solid rgba(0,0,0,.12); }',
                '.fu-btn-primary { font-size: 12px; padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(1,118,211,.35); background: #0176D3; color: #fff; cursor: pointer; font-weight: 800; }',
                '.fu-btn-primary:hover { filter: brightness(1.03); }',
                '.fu-ddmenu { padding: 7px; overflow: hidden; }',
                '.fu-follow-ddwrap { position: relative; display: inline-block; overflow: visible; }',
                '.fu-follow-ddwrap > .fu-ddmenu { position: absolute !important; left: 0 !important; top: 105% !important; width: 100% !important; margin-top: 0 !important; z-index: 2147483647; }',
                '.fu-dditem { padding: 10px 10px; border-radius: 10px; font-size: 12px; cursor: pointer; font-weight: 700; background: #f5f9ff; border: 1px solid rgba(1,118,211,.22); color: #0a376e; text-align: center; }',
                '.fu-dditem + .fu-dditem { margin-top: 2px; }',
                '.fu-dditem:hover { background: #ebf5ff; }',
                '.fu-ddhead { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }',
                '.fu-ddback { width: 28px; height: 28px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; background: rgba(0,0,0,.04); cursor: pointer; font-weight: 900; }',
                '.fu-ddback:hover { background: rgba(0,0,0,.07); }',
                '.fu-ddtitle { font-size: 12px; font-weight: 900; color: rgba(0,0,0,.72); }',
                '.fu-ddcontent { padding: 0; }',
                `#${PANEL_ID} .fu-section-title[data-sec="today"] { background: #c81810 !important; color: #fff !important; }`,
                `#${PANEL_ID} .fu-section-title[data-sec="tomorrow"] { background: #f8d840 !important; color: #fff !important; }`,
                `#${PANEL_ID} .fu-section-title[data-sec="dayafter"] { background: #f87800 !important; color: #fff !important; }`,
                `#${PANEL_ID} .fu-section-title[data-sec="later"] { background: #006860 !important; color: #fff !important; }`,
                `#${PANEL_ID} .fu-section-title[data-sec]:hover { filter: brightness(1.05); }`,
                `#${PANEL_ID} .fu-header.fu-active { background: #00ff11 !important; color: #000000 !important; }`,
                `#${PANEL_ID} .fu-header.fu-tracking-match { background: #ff9900 !important; color: #000000 !important; }`,
                `#${PANEL_ID} .fu-row.fu-active { background: #00ff11 !important; border-color: rgba(0,0,0,.18) !important; }`,
                `#${PANEL_ID} .fu-row.fu-tracking-match { background: #ff9900 !important; border-color: rgba(0,0,0,.18) !important; }`,
                `#${PANEL_ID} .fu-row.fu-list-match { border-color: rgba(0,0,0,.18) !important; }`,
                `#${PANEL_ID} .fu-row.fu-active .fu-case, #${PANEL_ID} .fu-row.fu-tracking-match .fu-case, #${PANEL_ID} .fu-row.fu-list-match .fu-case { color: #000000 !important; }`,
                `#${PANEL_ID} .fu-row.fu-list-match .fu-case { color: #0b5cab !important; }`,
                `#${PANEL_ID} .fu-row.fu-active .fu-iconbtn, #${PANEL_ID} .fu-row.fu-tracking-match .fu-iconbtn { background: rgba(0,0,0,.08) !important; color: #000000 !important; border-color: rgba(0,0,0,.18) !important; }`,
                `#${PANEL_ID} .fu-row.fu-list-match .fu-iconbtn { background: rgba(255,255,255,.4) !important; border-color: transparent !important; color: #fff !important; }`,
                `#${PANEL_ID} .fu-row.fu-active .fu-note, #${PANEL_ID} .fu-row.fu-tracking-match .fu-note { background: rgba(255,255,255,.92) !important; border-color: rgba(0,0,0,.18) !important; }`,
                `#${PANEL_ID} .fu-row.fu-list-match .fu-note { background: rgba(255,255,255,.95) !important; color: #000000 !important; }`,
                `#${PANEL_ID} .fu-due { font-size: 12px; font-weight: 800; padding: 2px 6px; border-radius: 10px; background: rgba(0,0,0,.04); color: rgba(0,0,0,.72); flex: 0 0 auto; }`,
                `#${PANEL_ID} .fu-row.fu-active .fu-due { background: rgba(0,0,0,.10); color: #000000; }`,
                '.fu-cal-wrap { width: 100%; user-select: none; border: 1px solid #dddbda; border-radius: 4px; overflow: hidden; background: #fff; }',
                '.fu-cal-header { display: flex; justify-content: space-between; align-items: center; background: #f3f2f2; padding: 5px 10px; border-bottom: 1px solid #dddbda; }',
                '.fu-cal-title { font-weight: 700; font-size: 13px; color: #080707; }',
                '.fu-cal-nav { background: none; border: none; cursor: pointer; color: #0070d2; padding: 0 8px; font-size: 16px; line-height: 1; }',
                '.fu-cal-nav:hover { color: #005fb2; background: rgba(0,0,0,0.05); border-radius: 4px; }',
                '.fu-cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 11px; color: #514f4d; background: #fafaf9; padding: 4px 0; border-bottom: 1px solid #dddbda; }',
                '.fu-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); padding: 4px; gap: 2px; }',
                '.fu-cal-day { height: 28px; display: flex; align-items: center; justify-content: center; font-size: 12px; cursor: pointer; border-radius: 3px; color: #181818; transition: all 0.1s; border: 1px solid transparent; }',
                '.fu-cal-day:hover:not(.disabled) { background: #f3f9ff; color: #0176d3; font-weight: bold; border-color: #d8e6f3; }',
                '.fu-cal-day.today { font-weight: bold; color: #0176d3; border: 1px solid #0176d3; }',
                '.fu-cal-day.disabled { color: #ccc; cursor: default; }',
            ].join('\n');

            try {
                if (typeof GM_addStyle !== 'undefined') {
                    GM_addStyle(css);
                } else {
                    const style = document.createElement('style');
                    style.textContent = css;
                    document.head.appendChild(style);
                }
            } catch(e) { console.error('Style Inject Failed', e); }
        };

        // -----------------------------
        // 面板渲染
        // -----------------------------
        const loadUI = () => {
            const raw = gmGet(KEY_UI, '{}');
            try { const obj = JSON.parse(raw); return (obj && typeof obj === 'object') ? obj : {}; } catch (e) { return {}; }
        };

        // 功能：`saveUI`。
        const saveUI = (ui) => gmSet(KEY_UI, JSON.stringify(ui || {}));

        // 功能：`ensurePanel`。
        const ensurePanel = () => {
            injectStyles();
            if (document.getElementById(PANEL_ID)) return;

            const ui = loadUI();
            const collapsed = !!ui.collapsed;
            const maxW = Math.floor(window.innerWidth * MAX_PANEL_WIDTH_RATIO);
            let width = Number(ui.width || DEFAULT_PANEL_WIDTH);
            width = Math.max(MIN_PANEL_WIDTH, Math.min(maxW, width));
            const maxH = Math.floor(window.innerHeight * MAX_PANEL_HEIGHT_RATIO);
            let height = Number(ui.height || DEFAULT_PANEL_HEIGHT);
            height = Math.max(MIN_PANEL_HEIGHT, Math.min(maxH, height));

            const root = document.createElement('div');
            root.id = PANEL_ID;

            const panel = document.createElement('div');
            panel.className = 'fu-panel';
            panel.style.width = `${width}px`;

            const resizeTop = document.createElement('div');
            resizeTop.className = 'fu-resize-top';
            panel.appendChild(resizeTop);

            const resizeLeft = document.createElement('div');
            resizeLeft.className = 'fu-resize-left';
            panel.appendChild(resizeLeft);

            const header = document.createElement('div');
            header.className = 'fu-header';

            const headerInner = document.createElement('div');
            headerInner.className = 'fu-header-inner';

            const title = document.createElement('div');
            title.className = 'fu-title';
            title.textContent = '跟進面板';
            headerInner.appendChild(title);
            header.appendChild(headerInner);

            const arrow = document.createElement('div');
            arrow.className = 'fu-arrow';
            arrow.textContent = '▾';
            header.appendChild(arrow);

            panel.appendChild(header);

            const body = document.createElement('div');
            body.className = 'fu-body';
            body.style.display = 'block';
            body.style.height = collapsed ? '0px' : `${height}px`;
            body.style.opacity = collapsed ? '0' : '1';

            if (collapsed) panel.classList.add('fu-collapsed');
            panel.appendChild(body);

            root.appendChild(panel);
            document.body.appendChild(root);

            header.addEventListener('click', () => {
                const ui2 = loadUI();
                ui2.collapsed = !ui2.collapsed;
                saveUI(ui2);
                renderPanel();
            });

            // Width resize
            let resizingW = false; let startX = 0; let startW = 0;
            // [事件監聽] 功能：`onMoveW`。
            const onMoveW = (ev) => {
                if (!resizingW) return;
                const dx = startX - ev.clientX;
                const maxW2 = Math.floor(window.innerWidth * MAX_PANEL_WIDTH_RATIO);
                let newW = startW + dx;
                newW = Math.max(MIN_PANEL_WIDTH, Math.min(maxW2, newW));
                panel.style.width = `${newW}px`;
            };
            // [事件監聽] 功能：`onUpW`。
            const onUpW = () => {
                if (!resizingW) return;
                resizingW = false;
                document.removeEventListener('mousemove', onMoveW, true);
                document.removeEventListener('mouseup', onUpW, true);
                const ui3 = loadUI();
                ui3.width = parseInt(panel.style.width, 10) || DEFAULT_PANEL_WIDTH;
                saveUI(ui3);
            };
            resizeLeft.addEventListener('mousedown', (ev) => {
                const uiNow = loadUI();
                if (uiNow && uiNow.collapsed) return;
                resizingW = true; startX = ev.clientX; startW = panel.getBoundingClientRect().width;
                document.addEventListener('mousemove', onMoveW, true);
                document.addEventListener('mouseup', onUpW, true);
                ev.preventDefault(); ev.stopPropagation();
            });

            // Height resize
            let resizingH = false; let startY = 0; let startH = 0;
            // [事件監聽] 功能：`onMoveH`。
            const onMoveH = (ev) => {
                if (!resizingH) return;
                const dy = startY - ev.clientY;
                const maxH2 = Math.floor(window.innerHeight * MAX_PANEL_HEIGHT_RATIO);
                let newH = startH + dy;
                newH = Math.max(MIN_PANEL_HEIGHT, Math.min(maxH2, newH));
                body.style.height = `${newH}px`;
            };
            // [事件監聽] 功能：`onUpH`。
            const onUpH = () => {
                if (!resizingH) return;
                resizingH = false;
                document.removeEventListener('mousemove', onMoveH, true);
                document.removeEventListener('mouseup', onUpH, true);
                const ui4 = loadUI();
                ui4.height = parseInt(body.style.height, 10) || DEFAULT_PANEL_HEIGHT;
                saveUI(ui4);
            };
            resizeTop.addEventListener('mousedown', (ev) => {
                const uiNow = loadUI();
                if (uiNow && uiNow.collapsed) return;
                resizingH = true; startY = ev.clientY; startH = body.getBoundingClientRect().height;
                document.addEventListener('mousemove', onMoveH, true);
                document.addEventListener('mouseup', onUpH, true);
                ev.preventDefault(); ev.stopPropagation();
            });

            wsEnsure();
        };

        // 渲染單個行
        const buildRow = (it, activeCaseNo, activeTrackingNo) => {
            const row = document.createElement('div');
            row.className = 'fu-row';

            const thisNo = normalizeCaseNo(it.caseNo) || (it.caseNo || '');
            const pureNo = thisNo.replace(/[^0-9]/g, '');

            // [修改] 增加 ID 匹配邏輯
            const currentCaseId = getCaseId();
            const isIdMatch = (currentCaseId && it.caseId && it.caseId.slice(0,15) === currentCaseId.slice(0,15));
            const isTextMatch = (activeCaseNo && thisNo && thisNo === activeCaseNo);

            const isCaseMatch = isIdMatch || isTextMatch;

            let isTrackingMatch = false;
            if (!isCaseMatch && activeTrackingNo) {
                const noteVal = (it.note || '').trim();
                const trackVal = (it.trackingNo || '').trim();
                const targetVal = activeTrackingNo.trim();
                if (noteVal === targetVal || trackVal === targetVal) {
                    isTrackingMatch = true;
                }
            }

            // [關鍵] 從 Map 中獲取分配到的顏色
            const listMatchColor = listPageMatches.get(pureNo);

            // 樣式優先級
            if (isCaseMatch) {
                row.classList.add('fu-active');
                row.style.backgroundColor = '';
            } else if (isTrackingMatch) {
                row.classList.add('fu-tracking-match');
                row.style.backgroundColor = '';
            } else if (listMatchColor) {
                // [動態配色] 應用從列表頁傳來的顏色
                row.style.backgroundColor = listMatchColor;
                row.style.color = '#ffffff';
                row.style.borderColor = 'rgba(0,0,0,.18)';
                row.classList.add('fu-list-match');
            } else {
                // 重置樣式
                row.style.backgroundColor = '';
                row.style.color = '';
                row.style.borderColor = '';
                row.classList.remove('fu-list-match');
            }

            const caseNoDisplay = thisNo || '(unknown)';
            const link = document.createElement('a');
            link.className = 'fu-case';
            link.href = buildCaseUrl(it.caseId) || '#';
            link.textContent = caseNoDisplay;
            link.addEventListener('click', (e) => { e.preventDefault(); openCaseInConsoleTab(it.caseId, true); });
            row.appendChild(link);

            if (bucketOf(it.dueAt) === 'later') {
                const due = document.createElement('span');
                due.className = 'fu-due';
                due.textContent = formatDueAtDDMon(it.dueAt);
                row.appendChild(due);
            }

            const note = document.createElement('input');
            note.className = 'fu-note';
            note.type = 'text';
            note.value = it.note || '';
            note.placeholder = '備註';
            note.addEventListener('blur', () => updateNote(it.caseId, note.value));
            row.appendChild(note);

            const btnChange = document.createElement('button');
            btnChange.type = 'button';
            btnChange.className = 'fu-iconbtn';
            btnChange.textContent = '📅';
            btnChange.addEventListener('click', (ev) => {
                ev.stopPropagation();
                showChangeMenu(btnChange, (ts) => { updateDueAt(it.caseId, ts); renderPanel(); });
            });
            row.appendChild(btnChange);

            const btnDel = document.createElement('button');
            btnDel.type = 'button';
            btnDel.className = 'fu-iconbtn';
            btnDel.textContent = '✕';
            btnDel.addEventListener('click', () => { deleteItem(it.caseId); renderPanel(); });
            row.appendChild(btnDel);

            // 返回匹配記錄的 ID，用於狀態柵欄
            return { rowElement: row, isCaseMatch, isTrackingMatch, recordId: it.caseId };
        };

        // [元素定位] 功能：`renderPanel`。
        const renderPanel = () => {
            ensurePanel();
            const root = document.getElementById(PANEL_ID);
            if (!root) return;

            const panel = root.querySelector('.fu-panel');
            const arrow = root.querySelector('.fu-arrow');
            const body = root.querySelector('.fu-body');
            const headerEl = root.querySelector('.fu-header');
            const titleEl = root.querySelector('.fu-title');
            const ui = loadUI();
            const collapsed = !!ui.collapsed;
            const secCollapsed = ui.secCollapsed || {};

            if (panel) {
                if (collapsed) panel.classList.add('fu-collapsed');
                else panel.classList.remove('fu-collapsed');
            }
            if (arrow) arrow.textContent = '▾';
            if (!body) return;

            const isCaseRecordPage = /\/Case\/[a-zA-Z0-9]{18}/.test(location.href);
            // [新增] 獲取 URL 中的 ID，這是最快的信息源
            const currentCaseId = isCaseRecordPage ? getCaseId() : null;

            let activeCaseNo = null;
            let activeTrackingNo = null;

            if (isCaseRecordPage) {
                // 優先使用 Scanner 提取的全局變量 (如果有的話)
                if (foundTrackingNumber) {
                    activeTrackingNo = foundTrackingNumber;
                }
                if (foundCaseNumber) {
                    activeCaseNo = foundCaseNumber;
                }
            }

            // [狀態柵欄] 重置當前匹配狀態
            _currentMatchState = { isMatched: false, matchType: null, matchedRecordId: null, color: null };

            let hasCaseMatch = false;
            let hasTrackingMatch = false;
            let matchedRecordId = null;

            while (body.firstChild) body.removeChild(body.firstChild);

            const items = sanitizeItems(loadItems());

            if (!collapsed) {
                body.style.opacity = '1';
                body.style.height = `${Number(ui.height || DEFAULT_PANEL_HEIGHT)}px`;

                // [事件監聽] 功能：`groups`。
                const groups = { today: [], tomorrow: [], dayafter: [], later: [] };

                items.forEach((it) => {
                    const k = bucketOf(it.dueAt);
                    if (!groups[k]) groups[k] = [];
                    groups[k].push(it);
                });

                const order = ['today', 'tomorrow', 'dayafter', 'later'];

                order.forEach((key) => {
                    const list = groups[key] || [];
                    const sec = document.createElement('div');
                    sec.className = 'fu-section';

                    const secTitle = document.createElement('div');
                    secTitle.className = 'fu-section-title';
                    secTitle.setAttribute('data-sec', key);

                    const left = document.createElement('span');
                    left.textContent = bucketTitle(key);
                    const right = document.createElement('span');
                    right.textContent = `(${list.length})${secCollapsed[key] ? ' ▸' : ' ▾'}`;

                    secTitle.appendChild(left);
                    secTitle.appendChild(right);
                    sec.appendChild(secTitle);

                    const ul = document.createElement('div');
                    ul.className = 'fu-list';
                    ul.style.display = secCollapsed[key] ? 'none' : 'flex';

                    list.forEach((it) => {
                        const { rowElement, isCaseMatch, isTrackingMatch: isTrk, recordId } = buildRow(it, activeCaseNo, activeTrackingNo);
                        if (isCaseMatch) { hasCaseMatch = true; matchedRecordId = recordId; }
                        if (isTrk) { hasTrackingMatch = true; if(!hasCaseMatch) matchedRecordId = recordId; }
                        ul.appendChild(rowElement);
                    });

                    sec.appendChild(ul);
                    body.appendChild(sec);

                    secTitle.addEventListener('click', () => {
                        const ui2 = loadUI();
                        ui2.secCollapsed = ui2.secCollapsed || {};
                        ui2.secCollapsed[key] = !ui2.secCollapsed[key];
                        saveUI(ui2);
                        renderPanel();
                    });
                });
            } else {
                // 摺疊狀態下也要計算匹配，但不渲染 DOM
                items.forEach(it => {
                    const thisNo = normalizeCaseNo(it.caseNo) || (it.caseNo || '');
                    // [修改] 摺疊狀態下的判斷也加入 ID 匹配
                    const isIdMatch = (currentCaseId && it.caseId && it.caseId.slice(0,15) === currentCaseId.slice(0,15));
                    if (isIdMatch || (activeCaseNo && thisNo === activeCaseNo)) {
                        hasCaseMatch = true; matchedRecordId = it.caseId;
                    }
                    else if (activeTrackingNo) {
                        const noteVal = (it.note || '').trim();
                        const trackVal = (it.trackingNo || '').trim();
                        const targetVal = activeTrackingNo.trim();
                        if (noteVal === targetVal || trackVal === targetVal) { hasTrackingMatch = true; if(!hasCaseMatch) matchedRecordId = it.caseId; }
                    }
                });
                body.style.opacity = '0';
                body.style.height = '0px';
            }

            // 更新 Header 樣式與文本，同時更新 _currentMatchState
            if (headerEl && titleEl) {
                headerEl.classList.remove('fu-active', 'fu-tracking-match');

                if (hasCaseMatch) {
                    headerEl.classList.add('fu-active');
                    titleEl.textContent = 'Case已在列表中';
                    _currentMatchState = { isMatched: true, matchType: 'case', matchedRecordId: matchedRecordId, color: '#04844b' }; // 綠色
                } else if (hasTrackingMatch) {
                    headerEl.classList.add('fu-tracking-match');
                    titleEl.textContent = '追蹤號已在列表中';
                     // 如果沒有Case匹配，才認為是追蹤號匹配
                    if(!hasCaseMatch) {
                        _currentMatchState = { isMatched: true, matchType: 'tracking', matchedRecordId: matchedRecordId, color: '#ff9900' }; // 橙色
                    }
                } else {
                    titleEl.textContent = '跟進面板';
                }
            }
        };

        // 外部調用接口
        const highlightListMatches = (matchedCaseMap) => {
            let isChanged = false;

            if (!matchedCaseMap || matchedCaseMap.size === 0) {
                if (listPageMatches.size > 0) {
                    listPageMatches.clear();
                    isChanged = true;
                }
            } else {
                if (matchedCaseMap.size !== listPageMatches.size) {
                    isChanged = true;
                } else {
                    for (const [key, val] of matchedCaseMap) {
                        if (listPageMatches.get(key) !== val) {
                            isChanged = true;
                            break;
                        }
                    }
                }
                if (isChanged) {
                    listPageMatches = new Map(matchedCaseMap);
                }
            }

            if (isChanged) {
                requestAnimationFrame(() => renderPanel());
            }
        };

        // [事件監聽 / 元素定位] 功能：`getActiveFollowWrap`。
        const getActiveFollowWrap = () => {
            const selector = 'div[data-target-selection-name="sfdc:StandardButton.Case.Follow"]';
            const firstVisible = findElementInShadows(document.body, selector);
            if (firstVisible) return firstVisible;
            const all = findAllElementsInShadows(document.body, selector);
            for (const el of all) { try { if (isElementVisible(el)) return el; } catch (e) { } }
            return null;
        };

        // [事件監聽 / 元素定位] 功能：`ensureCaseFollowTimeButton`。
        const ensureCaseFollowTimeButton = () => {
            const caseId = getCaseId();
            if (!caseId) return false;
            const followWrap = getActiveFollowWrap();
            if (!followWrap || !followWrap.parentElement) return false;
            const btnId = `${BTN_ID_PREFIX}_${caseId}`;
            if (followWrap.parentElement.querySelector(`#${CSS.escape(btnId)}`)) return true;

            try {
                followWrap.style.display = 'inline-block';
                followWrap.style.verticalAlign = 'middle';
                followWrap.parentElement.style.whiteSpace = 'nowrap';
                followWrap.parentElement.style.display = 'inline-flex';
                followWrap.parentElement.style.alignItems = 'center';
                followWrap.parentElement.style.gap = '6px';
            } catch (e) { }

            const btn = document.createElement('button');
            btn.id = btnId;
            btn.type = 'button';
            btn.className = 'slds-button slds-button_neutral uiButton';
            btn.style.height = '32px';
            btn.style.lineHeight = '32px';
            btn.style.padding = '0 10px';
            btn.style.background = '#0176D3';
            btn.style.color = '#fff';
            btn.textContent = '設定跟進時間';
            btn.dataset.caseId = caseId;

            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                if (document.getElementById(DROPDOWN_ID)) { removeDropdown(); return; }

                showFollowTimeDropdown(btn, (choice, resultValue) => {
                    const currentCaseId = btn.dataset.caseId || getCaseId();
                    // [修改] 使用全局變量，如果沒有則嘗試 Scanner 提取，不再依賴本地函數
                    const caseNo = foundCaseNumber || (typeof extractCaseNumberFromHeader === 'function' ? extractCaseNumberFromHeader() : null) ? foundCaseNumber : null;
                    if (!currentCaseId || !caseNo) {
                        showGlobalToast('未能取得 Case 號碼，請稍後再試');
                        return;
                    }
                    let dueAt;
                    if (choice === 'other') {
                        dueAt = resultValue;
                    } else {
                        dueAt = calcSmartDueDate(choice);
                    }
                    upsertItem({ caseId: currentCaseId, caseNo, dueAt });
                    renderPanel();
                    flashHeaderHintByDueAt(dueAt);
                });
            });

            const wrap = document.createElement('div');
            wrap.className = 'fu-follow-ddwrap';
            wrap.appendChild(btn);
            followWrap.parentElement.insertBefore(wrap, followWrap);
            return true;
        };

        // 功能：`ensureCaseButton`。
        const ensureCaseButton = async () => {
            if (ensureCaseFollowTimeButton()) return true;
            try { await waitForElementWithObserver(document.body, 'div[data-target-selection-name="sfdc:StandardButton.Case.Follow"]', 12000); } catch (e) { }
            return ensureCaseFollowTimeButton();
        };

        // 功能：`ensureMounted`。
        const ensureMounted = () => {
            ensurePanel();
            bindFollowUpPanelWatchers();
            scheduleRenderPanel(0);
        };

        // 功能：`unmount`。
        const unmount = () => {
            removeAllFloating();
            const root = document.getElementById(PANEL_ID);
            if (root) root.remove();
            if (__fuRenderTimer) { try { clearTimeout(__fuRenderTimer); } catch (e) { } }
            if (__fuRenderRaf) { try { cancelAnimationFrame(__fuRenderRaf); } catch (e) { } }
            __fuRenderTimer = null;
            __fuRenderRaf = null;
        };

        return {
            ensureMounted,
            render: renderPanel,
            ensureCaseButton,
            removeAllFloating,
            unmount,
            highlightListMatches,
            // [新增] 獲取當前頁面匹配狀態
            getMatchState: () => ({ ..._currentMatchState }),
            // [新增] 對外暴露刪除方法
            deleteItem: (caseId) => { deleteItem(caseId); renderPanel(); },
            // [新增] 對外暴露刷新方法
            refresh: () => scheduleRenderPanel(0)
        };
    })();

    const processedModals = new WeakSet();
    const processedCaseUrlsInSession = new Set();
    let injectedIWTButtons = {};
    let assignButtonObserver = null;
    let iwtModuleObserver = null;
    const fieldsInDesiredOrder = ['Link Contact', 'Editable', 'Contact Source', 'First Name', 'Last Name', 'Account Number', 'Email', 'Phone', 'Mobile Phone', 'Other Phone', 'Account Name'];


    // =================================================================================
    // SECTION: 核心工具函數 (Core Utilities)
    // =================================================================================


    function getCaseIdFromUrl(urlString) {
        if (!urlString) return null;
        const match = urlString.match(/\/Case\/([a-zA-Z0-9]{18})/);
        if (match && match[1]) {
            return match[1];
        }
        Log.warn('Core.Utils', `未能從 URL 中提取 Case ID: ${urlString}`);
        return null;
    }


    // [元素定位] 功能：`normalizeCaseUrl`。
    function normalizeCaseUrl(urlString) {
        try {
            const url = new URL(urlString, location.origin);
            const caseRecordPagePattern = /^\/lightning\/r\/Case\/[a-zA-Z0-9]{18}\/view$/;
            let pathname = url.pathname.replace(/\/$/, '');
            if (caseRecordPagePattern.test(pathname)) {
                return `${url.origin}${pathname}`;
            }
            return null;
        } catch (e) {
            Log.error('Core.Utils', `URL 規範化失敗: ${e.message} for URL: ${urlString}`);
            return null;
        }
    }


    // [元素定位] 功能：`isElementVisible`。
    function isElementVisible(el) {
        return el.offsetParent !== null;
    }


    // [元素定位] 功能：`findElementInShadows`。
    function findElementInShadows(root, selector) {
        if (!root) return null;

        // ---------------------------------------------------------
        // 1. 緩存路徑嘗試 (Cache Attempt)
        // ---------------------------------------------------------
        // 僅當從 document.body 開始查找時才使用緩存，確保路徑的絕對性
        if (root === document.body && DOM_PATH_CACHE[selector]) {
            const cachedPath = DOM_PATH_CACHE[selector];
            let current = root;
            let isValidPath = true;

            // 沿著緩存的路徑“瞬移”
            try {
                for (const step of cachedPath) {
                    if (step === 'shadow') {
                        if (current.shadowRoot) {
                            current = current.shadowRoot;
                        } else {
                            isValidPath = false;
                            break;
                        }
                    } else if (typeof step === 'number') {
                        if (current.children && current.children[step]) {
                            current = current.children[step];
                        } else {
                            isValidPath = false;
                            break;
                        }
                    } else {
                        isValidPath = false;
                        break;
                    }
                }
            } catch (e) {
                isValidPath = false;
            }

            // 懶惰驗證 (Lazy Validation): 確保元素還活著且符合選擇器
            if (isValidPath && current && current.isConnected) {
                // 額外檢查：元素是否真的匹配選擇器（防止結構變位但索引碰巧對上的情況）
                // 注意：如果 current 是 shadowRoot 容器本身，matches 可能不可用，需防禦
                if (current.matches && current.matches(selector) && isElementVisible(current)) {
                    return current; // 緩存命中！直接返回
                }
            }

            // 如果走到這裡，說明緩存失效 (DOM 結構變了)，清除該條緩存
            delete DOM_PATH_CACHE[selector];
        }

        // ---------------------------------------------------------
        // 2. 遞歸遍歷查找 (Recursive Fallback) - 原有邏輯
        // ---------------------------------------------------------
        // 內部遞歸函數，用於執行深度優先搜索
        const executeDeepSearch = (currentNode) => {
            if (currentNode.shadowRoot) {
                const found = executeDeepSearch(currentNode.shadowRoot);
                if (found) return found;
            }
            const el = currentNode.querySelector(selector);
            if (el && isElementVisible(el)) {
                return el;
            }
            // 遍歷所有子節點，查找是否有更深層的 Shadow Root
            const children = currentNode.querySelectorAll('*');
            for (const child of children) {
                if (child.shadowRoot) {
                    const nestedEl = executeDeepSearch(child.shadowRoot);
                    if (nestedEl) return nestedEl;
                }
            }
            return null;
        };

        const result = executeDeepSearch(root);

        // ---------------------------------------------------------
        // 3. 構建並寫入緩存 (Cache Construction)
        // ---------------------------------------------------------
        if (result && root === document.body) {
            try {
                const path = [];
                let curr = result;
                let stop = false;

                // 回溯路徑：從目標元素一直往上找，直到 document.body
                while (curr !== document.body) {
                    const parent = curr.parentNode;

                    if (parent) {
                        // 普通 DOM 層級：記錄索引
                        // 注意：Array.from 可能有性能開銷，但在“寫入緩存”這一步是值得的
                        const index = Array.prototype.indexOf.call(parent.children, curr);
                        if (index === -1) { stop = true; break; } // 異常情況
                        path.unshift(index);
                        curr = parent;
                    } else if (curr.host) {
                        // Shadow DOM 邊界：記錄跨越標記
                        path.unshift('shadow');
                        curr = curr.host;
                    } else {
                        // 斷路了（可能是在 DocumentFragment 中但未掛載）
                        stop = true;
                        break;
                    }
                }

                if (!stop) {
                    DOM_PATH_CACHE[selector] = path;
                }
            } catch (e) {
                // 生成路徑失敗不影響主邏輯返回結果
            }
        }

        return result;
    }


    // [定時/防抖 / 元素定位] 功能：`findAllElementsInShadows`。
    function findAllElementsInShadows(root, selector) {
        let results = [];
        if (!root) return results;
        results.push(...Array.from(root.querySelectorAll(selector)).filter(isElementVisible));
        for (const el of root.querySelectorAll('*')) {
            if (el.shadowRoot) {
                results.push(...findAllElementsInShadows(el.shadowRoot, selector));
            }
        }
        return results;
    }


    // [定時/防抖 / 元素定位] 功能：`waitForElement`。
    function waitForElement(root, selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const intervalId = setInterval(() => {
                PageResourceRegistry.addInterval(intervalId);
                const el = findElementInShadows(root, selector);
                if (el) {
                    clearInterval(intervalId);
                    resolve(el);
                    return;
                }
                if (Date.now() - startTime > timeout) {
                    clearInterval(intervalId);
                    reject(new Error(`Timeout waiting for selector: ${selector}`));
                }
            }, 500); // 500ms: 輪詢間隔，平衡性能與響應速度。
        });
    }


    // [定時/防抖 / 元素定位] 功能：`debounce`。
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }


    // [元素定位] 功能：`purgeExpiredCacheEntries`。
    function purgeExpiredCacheEntries(cacheObj, ttlMs) {
        if (!cacheObj || typeof cacheObj !== 'object') {
            return { cache: {}, changed: false, removed: 0 };
        }
        const now = Date.now();
        let changed = false;
        let removed = 0;
        for (const [key, entry] of Object.entries(cacheObj)) {
            if (!entry || typeof entry !== 'object' || typeof entry.timestamp !== 'number') {
                continue;
            }
            if (now - entry.timestamp > ttlMs) {
                delete cacheObj[key];
                changed = true;
                removed++;
            }
        }
        return { cache: cacheObj, changed, removed };
    }


    // [元素定位] 功能：`findFirstElementInShadows`。
    function findFirstElementInShadows(root, selectors) {
        if (!Array.isArray(selectors) || selectors.length === 0) return null;
        for (const selector of selectors) {
            const el = findElementInShadows(root, selector);
            if (el) return el;
        }
        return null;
    }


    // 功能：`CACHE_POLICY`。
    const CACHE_POLICY = {
        REPLIED: {
            KEY: 'sendButtonClickLog',
            TTL_MS: 10 * 60 * 60 * 1000,        // 10小時: 詳情頁提示使用
            LIST_TTL_MS: 24 * 60 * 60 * 1000,   // 24小時: 列表頁注釋使用
            PURGE_MS: 24 * 60 * 60 * 1000       // 24小時: 統一清理窗口
        },
        CLAIMS_LOST_PKG: {
            KEY: 'claimsLostPkgSendLog',
            TTL_MS: 12 * 24 * 60 * 60 * 1000, // 12天
            LIST_TTL_MS: 12 * 24 * 60 * 60 * 1000, // 12天: 列表頁注釋使用
            PURGE_MS: 12 * 24 * 60 * 60 * 1000 // 12天: 統一清理窗口
        },
        BILLING_REBILL: {
            KEY: 'billingRebillSendLog',
            TTL_MS: 12 * 24 * 60 * 60 * 1000, // 12天
            LIST_TTL_MS: 12 * 24 * 60 * 60 * 1000, // 12天: 列表頁注釋使用
            PURGE_MS: 12 * 24 * 60 * 60 * 1000 // 12天: 統一清理窗口
        },
        TRACKING: {
            KEY: 'trackingNumberLog',
            TTL_MS: 60 * 60 * 1000 // 60分鐘
        },
        ASSIGNMENT: {
            KEY: 'assignmentLog',
            TTL_MS: 60 * 60 * 1000 // 60分鐘
        }
    };



    // 功能：`ChineseConverter`。
    const ChineseConverter = {
        s2t_map: null,
        t2s_map: null,
        isInitialized: false, // 標記是否已初始化

        // 簡 轉 繁 修正字典
        s2t_fix: {
            '繫統': '系統',
            '頭發': '頭髮',
        },

        // 繁 轉 簡 修正字典
        t2s_fix: {},


        _getData: function() {
            return {
                s: '复系为尝钟万与丑专业丛东丝丢两严丧个丬丰临为丽举么义乌乐乔习乡书买乱争于亏云亘亚产亩亲亵亸亿仅从仑仓仪们价众优伙会伛伞伟传伤伥伦伧伪伫体余佣佥侠侣侥侦侧侨侩侪侬俣俦俨俩俪俭债倾偬偻偾偿傥傧储傩儿兑兖党兰关兴兹养兽冁内冈册写军农冢冯冲决况冻净凄凉凌减凑凛几凤凫凭凯击凼凿刍划刘则刚创删别刬刭刽刿剀剂剐剑剥剧劝办务劢动励劲劳势勋勐勚匀匦匮区医华协单卖卢卤卧卫却卺厂厅历厉压厌厍厕厢厣厦厨厩厮县参叆叇双发变叙叠叶号叹叽吁后吓吕吗吣吨听启吴呒呓呕呖呗员呙呛呜咏咔咙咛咝咤咴咸哌响哑哒哓哔哕哗哙哜哝哟唛唝唠唡唢唣唤唿啧啬啭啮啰啴啸喷喽喾嗫呵嗳嘘嘤嘱噜噼嚣嚯团园囱围囵国图圆圣圹场坂坏块坚坛坜坝坞坟坠垄垅垆垒垦垧垩垫垭垯垱垲垴埘埙埚埝埯堑堕塆墙壮声壳壶壸处备复够头夸夹夺奁奂奋奖奥妆妇妈妩妪妫姗姜娄娅娆娇娈娱娲娴婳婴婵婶媪嫒嫔嫱嬷孙学孪宁宝实宠审宪宫宽宾寝对寻导寿将尔尘尧尴尸尽层屃屉届属屡屦屿岁岂岖岗岘岙岚岛岭岳岽岿峃峄峡峣峤峥峦崂崃崄崭嵘嵚嵛嵝嵴巅巩巯币帅师帏帐帘帜带帧帮帱帻帼幂幞干并广庄庆庐庑库应庙庞废庼廪开异弃张弥弪弯弹强归当录彟彦彻径徕御忆忏忧忾怀态怂怃怄怅怆怜总怼怿恋恳恶恸恹恺恻恼恽悦悫悬悭悯惊惧惨惩惫惬惭惮惯愍愠愤愦愿慑慭憷懑懒懔戆戋戏戗战戬户扎扑扦执扩扪扫扬扰抚抛抟抠抡抢护报担拟拢拣拥拦拧拨择挂挚挛挜挝挞挟挠挡挢挣挤挥挦捞损捡换捣据捻掳掴掷掸掺掼揸揽揿搀搁搂搅携摄摅摆摇摈摊撄撑撵撷撸撺擞攒敌敛数斋斓斗斩断无旧时旷旸昙昼昽显晋晒晓晔晕晖暂暧札术朴机杀杂权条来杨杩杰极构枞枢枣枥枧枨枪枫枭柜柠柽栀栅标栈栉栊栋栌栎栏树栖样栾桊桠桡桢档桤桥桦桧桨桩梦梼梾检棂椁椟椠椤椭楼榄榇榈榉槚槛槟槠横樯樱橥橱橹橼檐檩欢欤欧歼殁殇残殒殓殚殡殴毁毂毕毙毡毵氇气氢氩氲汇汉污汤汹沓沟没沣沤沥沦沧沨沩沪沵泞泪泶泷泸泺泻泼泽泾洁洒洼浃浅浆浇浈浉浊测浍济浏浐浑浒浓浔浕涂涌涛涝涞涟涠涡涢涣涤润涧涨涩淀渊渌渍渎渐渑渔渖渗温游湾湿溃溅溆溇滗滚滞滟滠满滢滤滥滦滨滩滪漤潆潇潋潍潜潴澜濑濒灏灭灯灵灾灿炀炉炖炜炝点炼炽烁烂烃烛烟烦烧烨烩烫烬热焕焖焘煅煳熘爱爷牍牦牵牺犊犟状犷犸犹狈狍狝狞独狭狮狯狰狱狲猃猎猕猡猪猫猬献獭玑玙玚玛玮环现玱玺珉珏珐珑珰珲琎琏琐琼瑶瑷璇璎瓒瓮瓯电画畅畲畴疖疗疟疠疡疬疮疯疱疴痈痉痒痖痨痪痫痴瘅瘆瘗瘘瘪瘫瘾瘿癞癣癫癯皑皱皲盏盐监盖盗盘眍眦眬着睁睐睑瞒瞩矫矶矾矿砀码砖砗砚砜砺砻砾础硁硅硕硖硗硙硚确硷碍碛碜碱碹磙礼祎祢祯祷祸禀禄禅离秃秆种积称秽秾稆税稣稳穑穷窃窍窑窜窝窥窦窭竖竞笃笋笔笕笺笼笾筑筚筛筜筝筹签简箓箦箧箨箩箪箫篑篓篮篱簖籁籴类籼粜粝粤粪粮糁糇紧絷纟纠纡红纣纤纥约级纨纩纪纫纬纭纮纯纰纱纲纳纴纵纶纷纸纹纺纻纼纽纾线绀绁绂练组绅细织终绉绊绋绌绍绎经绐绑绒结绔绕绖绗绘给绚绛络绝绞统绠绡绢绣绤绥绦继绨绩绪绫绬续绮绯绰绱绲绳维绵绶绷绸绹绺绻综绽绾绿缀缁缂缃缄缅缆缇缈缉缊缋缌缍缎缏缐缑缒缓缔缕编缗缘缙缚缛缜缝缞缟缠缡缢缣缤缥缦缧缨缩缪缫缬缭缮缯缰缱缲缳缴缵罂网罗罚罢罴羁羟羡翘翙翚耢耧耸耻聂聋职聍联聩聪肃肠肤肷肾肿胀胁胆胜胧胨胪胫胶脉脍脏脐脑脓脔脚脱脶脸腊腌腘腭腻腼腽腾膑臜舆舣舰舱舻艰艳艹艺节芈芗芜芦苁苇苈苋苌苍苎苏苘苹茎茏茑茔茕茧荆荐荙荚荛荜荞荟荠荡荣荤荥荦荧荨荩荪荫荬荭荮药莅莜莱莲莳莴莶获莸莹莺莼萚萝萤营萦萧萨葱蒇蒉蒋蒌蓝蓟蓠蓣蓥蓦蔷蔹蔺蔼蕲蕴薮藁藓虏虑虚虫虬虮虽虾虿蚀蚁蚂蚕蚝蚬蛊蛎蛏蛮蛰蛱蛲蛳蛴蜕蜗蜡蝇蝈蝉蝎蝼蝾螀螨蟏衅衔补衬衮袄袅袆袜袭袯装裆裈裢裣裤裥褛褴襁襕见观觃规觅视觇览觉觊觋觌觍觎觏觐觑觞触觯詟誉誊讠计订讣认讥讦讧讨让讪讫训议讯记讱讲讳讴讵讶讷许讹论讻讼讽设访诀证诂诃评诅识诇诈诉诊诋诌词诎诏诐译诒诓诔试诖诗诘诙诚诛诜话诞诟诠诡询诣诤该详诧诨诩诪诫诬语诮误诰诱诲诳说诵诶请诸诹诺读诼诽课诿谀谁谂调谄谅谆谇谈谊谋谌谍谎谏谐谑谒谓谔谕谖谗谘谙谚谛谜谝谞谟谠谡谢谣谤谥谦谧谨谩谪谫谬谭谮谯谰谱谲谳谴谵谶谷豮贝贞负贠贡财责贤败账货质贩贪贫贬购贮贯贰贱贲贳贴贵贶贷贸费贺贻贼贽贾贿赀赁赂赃资赅赆赇赈赉赊赋赌赍赎赏赐赑赒赓赔赕赖赗赘赙赚赛赜赝赞赟赠赡赢赣赪赵赶趋趱趸跃跄跖跞践跶跷跸跹跻踊踌踪踬踯蹑蹒蹰蹿躏躜躯车轧轨轩轪轫转轭轮软轰轱轲轳轴轵轶轷轸轹轺轻轼载轾轿辀辁辂较辄辅辆辇辈辉辊辋辌辍辎辏辐辑辒输辔辕辖辗辘辙辚辞辩辫边辽达迁过迈运还这进远违连迟迩迳迹适选逊递逦逻遗遥邓邝邬邮邹邺邻郁郄郏郐郑郓郦郧郸酝酦酱酽酾酿释里鉅鉴銮錾钆钇针钉钊钋钌钍钎钏钐钑钒钓钔钕钖钗钘钙钚钛钝钞钟钠钡钢钣钤钥钦钧钨钩钪钫钬钭钮钯钰钱钲钳钴钵钶钷钸钹钺钻钼钽钾钿铀铁铂铃铄铅铆铈铉铊铋铍铎铏铐铑铒铕铗铘铙铚铛铜铝铞铟铠铡铢铣铤铥铦铧铨铪铫铬铭铮铯铰铱铲铳铴铵银铷铸铹铺铻铼铽链铿销锁锂锃锄锅锆锇锈锉锊锋锌锍锎锏锐锑锒锓锔锕锖锗错锚锜锞锟锠锡锢锣锤锥锦锨锩锫锬锭键锯锰锱锲锳锴锵锶锷锸锹锺锻锼锽锾锿镀镁镂镃镆镇镈镉镊镌镍镎镏镐镑镒镕镖镗镙镚镛镜镝镞镟镠镡镢镣镤镥镦镧镨镩镪镫镬镭镮镯镰镱镲镳镴镶长门闩闪闫闬闭问闯闰闱闲闳间闵闶闷闸闹闺闻闼闽闾闿阀阁阂阃阄阅阆阇阈阉阊阋阌阍阎阏阐阑阒阓阔阕阖阗阘阙阚阛队阳阴阵阶际陆陇陈陉陕陧陨险随隐隶隽难雏雠雳雾霁霉霭靓静靥鞑鞒鞯鞴韦韧韨韩韪韫韬韵页顶顷顸项顺须顼顽顾顿颀颁颂颃预颅领颇颈颉颊颋颌颍颎颏颐频颒颓颔颕颖颗题颙颚颛颜额颞颟颠颡颢颣颤颥颦颧风飏飐飑飒飓飔飕飖飗飘飙飚飞飨餍饤饥饦饧饨饩饪饫饬饭饮饯饰饱饲饳饴饵饶饷饸饹饺饻饼饽饾饿馀馁馂馃馄馅馆馇馈馉馊馋馌馍馎馏馐馑馒馓馔馕马驭驮驯驰驱驲驳驴驵驶驷驸驹驺驻驼驽驾驿骀骁骂骃骄骅骆骇骈骉骊骋验骍骎骏骐骑骒骓骔骕骖骗骘骙骚骛骜骝骞骟骠骡骢骣骤骥骦骧髅髋髌鬓魇魉鱼鱽鱾鱿鲀鲁鲂鲄鲅鲆鲇鲈鲉鲊鲋鲌鲍鲎鲏鲐鲑鲒鲓鲔鲕鲖鲗鲘鲙鲚鲛鲜鲝鲞鲟鲠鲡鲢鲣鲤鲥鲦鲧鲨鲩鲪鲫鲬鲭鲮鲯鲰鲱鲲鲳鲴鲵鲶鲷鲸鲹鲺鲻鲼鲽鲾鲿鳀鳁鳂鳃鳄鳅鳆鳇鳈鳉鳊鳋鳌鳍鳎鳏鳐鳑鳒鳓鳔鳕鳖鳗鳘鳙鳛鳜鳝鳞鳟鳠鳡鳢鳣鸟鸠鸡鸢鸣鸤鸥鸦鸧鸨鸩鸪鸫鸬鸭鸮鸯鸰鸱鸲鸳鸴鸵鸶鸷鸸鸹鸺鸻鸼鸽鸾鸿鹀鹁鹂鹃鹄鹅鹆鹇鹈鹉鹊鹋鹌鹍鹎鹏鹐鹑鹒鹓鹔鹕鹖鹗鹘鹚鹛鹜鹝鹞鹟鹠鹡鹢鹣鹤鹥鹦鹧鹨鹩鹪鹫鹬鹭鹯鹰鹱鹲鹳鹴鹾麦麸黄黉黡黩黪黾鼋鼌鼍鼗鼹齄齐齑齿龀龁龂龃龄龅龆龇龈龉龊龋龌龙龚龛龟志制咨只里范松没闹面准钟别闲乾尽脏拼',
                t: '覆繫為嘗鐘萬與醜專業叢東絲丟兩嚴喪個丬豐臨爲麗舉麼義烏樂喬習鄉書買亂爭於虧雲亙亞產畝親褻嚲億僅從侖倉儀們價衆優夥會傴傘偉傳傷倀倫傖僞佇體餘傭僉俠侶僥偵側僑儈儕儂俁儔儼倆儷儉債傾傯僂僨償儻儐儲儺兒兌兗黨蘭關興茲養獸囅內岡冊寫軍農冢馮沖決況凍淨淒涼凌減湊凜幾鳳鳧憑凱擊凼鑿芻劃劉則剛創刪別剗剄劊劌剴劑剮劍剝劇勸辦務勱動勵勁勞勢勳勐勩勻匭匱區醫華協單賣盧滷臥衛卻巹廠廳歷厲壓厭厙廁廂厴廈廚廄廝縣參靉靆雙發變敘疊葉號嘆嘰籲後嚇呂嗎唚噸聽啓吳嘸囈嘔嚦唄員咼嗆嗚詠咔嚨嚀噝吒咴鹹哌響啞噠嘵嗶噦譁噲嚌噥喲嘜嗊嘮啢嗩唣喚唿嘖嗇囀齧囉嘽嘯噴嘍嚳囁呵噯噓嚶囑嚕噼囂嚯團園囪圍圇國圖圓聖壙場阪壞塊堅壇壢壩塢墳墜壟壠壚壘墾垧堊墊埡墶壋塏堖塒壎堝埝垵塹墮壪牆壯聲殼壺壼處備復夠頭誇夾奪奩奐奮獎奧妝婦媽嫵嫗嬀姍姜婁婭嬈嬌孌娛媧嫺嫿嬰嬋嬸媼嬡嬪嬙嬤孫學孿寧寶實寵審憲宮寬賓寢對尋導壽將爾塵堯尷屍盡層屓屜屆屬屢屨嶼歲豈嶇崗峴嶴嵐島嶺嶽崬巋嶨嶧峽嶢嶠崢巒嶗崍嶮嶄嶸嶔嵛嶁嵴巔鞏巰幣帥師幃帳簾幟帶幀幫幬幘幗冪襆幹並廣莊慶廬廡庫應廟龐廢廎廩開異棄張彌弳彎彈強歸當錄彠彥徹徑徠御憶懺憂愾懷態慫憮慪悵愴憐總懟懌戀懇惡慟懨愷惻惱惲悅愨懸慳憫驚懼慘懲憊愜慚憚慣愍慍憤憒願懾憖憷懣懶懍戇戔戲戧戰戩戶扎撲扦執擴捫掃揚擾撫拋摶摳掄搶護報擔擬攏揀擁攔擰撥擇掛摯攣掗撾撻挾撓擋撟掙擠揮撏撈損撿換搗據捻擄摑擲撣摻摜揸攬撳攙擱摟攪攜攝攄擺搖擯攤攖撐攆擷擼攛擻攢敵斂數齋斕鬥斬斷無舊時曠暘曇晝曨顯晉曬曉曄暈暉暫曖札術樸機殺雜權條來楊榪傑極構樅樞棗櫪梘棖槍楓梟櫃檸檉梔柵標棧櫛櫳棟櫨櫟欄樹棲樣欒桊椏橈楨檔榿橋樺檜槳樁夢檮棶檢櫺槨櫝槧欏橢樓欖櫬櫚櫸檟檻檳櫧橫檣櫻櫫櫥櫓櫞檐檁歡歟歐殲歿殤殘殞殮殫殯毆毀轂畢斃氈毿氌氣氫氬氳匯漢污湯洶沓溝沒灃漚瀝淪滄渢潙滬沵濘淚澩瀧瀘濼瀉潑澤涇潔灑窪浹淺漿澆湞溮濁測澮濟瀏滻渾滸濃潯濜塗涌濤澇淶漣潿渦溳渙滌潤澗漲澀澱淵淥漬瀆漸澠漁瀋滲溫遊灣溼潰濺漵漊潷滾滯灩灄滿瀅濾濫灤濱灘澦漤瀠瀟瀲濰潛瀦瀾瀨瀕灝滅燈靈災燦煬爐燉煒熗點煉熾爍爛烴燭煙煩燒燁燴燙燼熱煥燜燾煅煳熘愛爺牘犛牽犧犢犟狀獷獁猶狽狍獮獰獨狹獅獪猙獄猻獫獵獼玀豬貓蝟獻獺璣璵瑒瑪瑋環現瑲璽珉珏琺瓏璫琿璡璉瑣瓊瑤璦璇瓔瓚甕甌電畫暢畲疇癤療瘧癘瘍癧瘡瘋皰痾癰痙癢瘂癆瘓癇癡癉瘮瘞瘻癟癱癮癭癩癬癲癯皚皺皸盞鹽監蓋盜盤瞘眥矓着睜睞瞼瞞矚矯磯礬礦碭碼磚硨硯碸礪礱礫礎硜硅碩硤磽磑礄確礆礙磧磣鹼碹磙禮禕禰禎禱禍稟祿禪離禿稈種積稱穢穠穭稅穌穩穡窮竊竅窯竄窩窺竇窶豎競篤筍筆筧箋籠籩築篳篩簹箏籌籤簡籙簀篋籜籮簞簫簣簍籃籬籪籟糴類秈糶糲粵糞糧糝餱緊縶糹糾紆紅紂纖紇約級紈纊紀紉緯紜紘純紕紗綱納紝縱綸紛紙紋紡紵紖紐紓線紺紲紱練組紳細織終縐絆紼絀紹繹經紿綁絨結絝繞絰絎繪給絢絳絡絕絞統綆綃絹繡綌綏絛繼綈績緒綾緓續綺緋綽鞝緄繩維綿綬繃綢綯綹綣綜綻綰綠綴緇緙緗緘緬纜緹緲緝縕繢緦綞緞緶線緱縋緩締縷編緡緣縉縛縟縝縫縗縞纏縭縊縑繽縹縵縲纓縮繆繅纈繚繕繒繮繾繰繯繳纘罌網羅罰罷羆羈羥羨翹翽翬耮耬聳恥聶聾職聹聯聵聰肅腸膚肷腎腫脹脅膽勝朧腖臚脛膠脈膾髒臍腦膿臠腳脫腡臉臘醃膕齶膩靦膃騰臏臢輿艤艦艙艫艱豔艹藝節羋薌蕪蘆蓯葦藶莧萇蒼苧蘇檾蘋莖蘢蔦塋煢繭荊薦薘莢蕘蓽蕎薈薺蕩榮葷滎犖熒蕁藎蓀蔭蕒葒葤藥蒞莜萊蓮蒔萵薟獲蕕瑩鶯蓴蘀蘿螢營縈蕭薩蔥蕆蕢蔣蔞藍薊蘺蕷鎣驀薔蘞藺藹蘄蘊藪藁蘚虜慮虛蟲虯蟣雖蝦蠆蝕蟻螞蠶蠔蜆蠱蠣蟶蠻蟄蛺蟯螄蠐蛻蝸蠟蠅蟈蟬蠍螻蠑螿蟎蠨釁銜補襯袞襖嫋褘襪襲襏裝襠褌褳襝褲襉褸襤襁襴見觀覎規覓視覘覽覺覬覡覿覥覦覯覲覷觴觸觶讋譽謄訁計訂訃認譏訐訌討讓訕訖訓議訊記訒講諱謳詎訝訥許訛論訩訟諷設訪訣證詁訶評詛識詗詐訴診詆謅詞詘詔詖譯詒誆誄試詿詩詰詼誠誅詵話誕詬詮詭詢詣諍該詳詫諢詡譸誡誣語誚誤誥誘誨誑說誦誒請諸諏諾讀諑誹課諉諛誰諗調諂諒諄誶談誼謀諶諜謊諫諧謔謁謂諤諭諼讒諮諳諺諦謎諞諝謨讜謖謝謠謗諡謙謐謹謾謫譾謬譚譖譙讕譜譎讞譴譫讖谷豶貝貞負貟貢財責賢敗賬貨質販貪貧貶購貯貫貳賤賁貰貼貴貺貸貿費賀貽賊贄賈賄貲賃賂贓資賅贐賕賑賚賒賦賭齎贖賞賜贔賙賡賠賧賴賵贅賻賺賽賾贗贊贇贈贍贏贛赬趙趕趨趲躉躍蹌跖躒踐躂蹺蹕躚躋踊躊蹤躓躑躡蹣躕躥躪躦軀車軋軌軒軑軔轉軛輪軟轟軲軻轤軸軹軼軤軫轢軺輕軾載輊轎輈輇輅較輒輔輛輦輩輝輥輞輬輟輜輳輻輯轀輸轡轅轄輾轆轍轔辭辯辮邊遼達遷過邁運還這進遠違連遲邇逕跡適選遜遞邐邏遺遙鄧鄺鄔郵鄒鄴鄰鬱郄郟鄶鄭鄆酈鄖鄲醞醱醬釅釃釀釋裏鉅鑑鑾鏨釓釔針釘釗釙釕釷釺釧釤鈒釩釣鍆釹鍚釵鈃鈣鈈鈦鈍鈔鍾鈉鋇鋼鈑鈐鑰欽鈞鎢鉤鈧鈁鈥鈄鈕鈀鈺錢鉦鉗鈷鉢鈳鉕鈽鈸鉞鑽鉬鉭鉀鈿鈾鐵鉑鈴鑠鉛鉚鈰鉉鉈鉍鈹鐸鉶銬銠鉺銪鋏鋣鐃銍鐺銅鋁銱銦鎧鍘銖銑鋌銩銛鏵銓鉿銚鉻銘錚銫鉸銥鏟銃鐋銨銀銣鑄鐒鋪鋙錸鋱鏈鏗銷鎖鋰鋥鋤鍋鋯鋨鏽銼鋝鋒鋅鋶鐦鐗銳銻鋃鋟鋦錒錆鍺錯錨錡錁錕錩錫錮鑼錘錐錦杴錈錇錟錠鍵鋸錳錙鍥鍈鍇鏘鍶鍔鍤鍬鍾鍛鎪鍠鍰鎄鍍鎂鏤鎡鏌鎮鎛鎘鑷鐫鎳鎿鎦鎬鎊鎰鎔鏢鏜鏍鏰鏞鏡鏑鏃鏇鏐鐔钁鐐鏷鑥鐓鑭鐠鑹鏹鐙鑊鐳鐶鐲鐮鐿鑔鑣鑞鑲長門閂閃閆閈閉問闖閏闈閒閎間閔閌悶閘鬧閨聞闥閩閭闓閥閣閡閫鬮閱閬闍閾閹閶鬩閿閽閻閼闡闌闃闠闊闋闔闐闒闕闞闤隊陽陰陣階際陸隴陳陘陝隉隕險隨隱隸雋難雛讎靂霧霽黴靄靚靜靨韃鞽韉鞴韋韌韍韓韙韞韜韻頁頂頃頇項順須頊頑顧頓頎頒頌頏預顱領頗頸頡頰頲頜潁熲頦頤頻頮頹頷頴穎顆題顒顎顓顏額顳顢顛顙顥纇顫顬顰顴風颺颭颮颯颶颸颼颻飀飄飆飈飛饗饜飣飢飥餳飩餼飪飫飭飯飲餞飾飽飼飿飴餌饒餉餄餎餃餏餅餑餖餓餘餒餕餜餛餡館餷饋餶餿饞饁饃餺餾饈饉饅饊饌饢馬馭馱馴馳驅馹駁驢駔駛駟駙駒騶駐駝駑駕驛駘驍罵駰驕驊駱駭駢驫驪騁驗騂駸駿騏騎騍騅騌驌驂騙騭騤騷騖驁騮騫騸驃騾驄驏驟驥驦驤髏髖髕鬢魘魎魚魛魢魷魨魯魴魺鮁鮃鮎鱸鮋鮓鮒鮊鮑鱟鮍鮐鮭鮚鮳鮪鮞鮦鰂鮜鱠鱭鮫鮮鮺鯗鱘鯁鱺鰱鰹鯉鰣鰷鯀鯊鯇鮶鯽鯒鯖鯪鯕鯫鯡鯤鯧鯝鯢鮎鯛鯨鰺鯴鯔鱝鰈鰏鱨鯷鰮鰃鰓鱷鰍鰒鰉鰁鱂鯿鰠鰲鰭鰨鰥鰩鰟鰜鰳鰾鱈鱉鰻鰵鱅鰼鱖鱔鱗鱒鱯鱤鱧鱣鳥鳩雞鳶鳴鳲鷗鴉鶬鴇鴆鴣鶇鸕鴨鴞鴦鴒鴟鴝鴛鷽鴕鷥鷙鴯鴰鵂鴴鵃鴿鸞鴻鵐鵓鸝鵑鵠鵝鵒鷳鵜鵡鵲鶓鵪鵾鵯鵬鵮鶉鶊鵷鷫鶘鶡鶚鶻鶿鶥鶩鷊鷂鶲鶹鶺鷁鶼鶴鷖鸚鷓鷚鷯鷦鷲鷸鷺鸇鷹鸌鸏鸛鸘鹺麥麩黃黌黶黷黲黽黿鼂鼉鞀鼴齇齊齏齒齔齕齗齟齡齙齠齜齦齬齪齲齷龍龔龕龜志制諮只裏範鬆沒鬧面準鍾別閒乾盡髒拼'
};
        },


        _ensureInit: function() {
            if (this.isInitialized) return;

            const data = this._getData();
            this.s2t_map = {};
            this.t2s_map = {};

            for (let i = 0; i < data.s.length; i++) {
                this.s2t_map[data.s[i]] = data.t[i];
                this.t2s_map[data.t[i]] = data.s[i];
            }

            this.isInitialized = true;
            Log.info('Converter', '繁簡轉換字典已構建完成 (初始化成功)。');
        },

        getS2TMap: function() {
            this._ensureInit();
            return this.s2t_map;
        },

        getT2SMap: function() {
            this._ensureInit();
            return this.t2s_map;
        },

        /**
        * 執行文本轉換 (含詞組修正)
        * @param {string} text - 需要轉換的文本.
        * @param {'s2t'|'t2s'} mode - 轉換模式.
        * @returns {string} 轉換後的文本.
        */
        convert: function(text, mode) {
            if (!text) return '';
            const map = (mode === 's2t') ? this.getS2TMap() : this.getT2SMap();
            let result = '';

            // 1. 基礎字對字轉換
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                result += map[char] || char;
            }

            // 2. 詞組修正 (Phrase Patching)
            const fixes = (mode === 's2t') ? this.s2t_fix : this.t2s_fix;
            for (const [wrong, right] of Object.entries(fixes)) {
                if (result.includes(wrong)) {
                    // 使用 split+join 替換所有出現的錯誤詞組
                    result = result.split(wrong).join(right);
                }
            }

            return result;
        },


        schedulePreload: function() {
            setTimeout(() => {
                if (isScriptPaused || this.isInitialized) return;

                // 如果當前分頁可見，立即初始化
                if (!document.hidden) {
                    this._ensureInit();
                } else {
                    // 如果當前分頁不可見，掛起監聽器，等待切換到前台的那一瞬間初始化
                    const initOnVisible = () => {
                        if (document.hidden) return;
                        this._ensureInit();
                        document.removeEventListener('visibilitychange', initOnVisible);
                    };
                    document.addEventListener('visibilitychange', initOnVisible);
                }
            }, 15000); // 15秒延遲
        }
    };

    // 啟動 15 秒智能預載調度
    ChineseConverter.schedulePreload();


    // [DOM 觀察 / 定時/防抖 / 元素定位] 功能：`waitForElementWithObserver`。
    function waitForElementWithObserver(rootNode, selector, timeout) {
        return new Promise((resolve, reject) => {
            const existingElement = findElementInShadows(rootNode, selector);
            if (existingElement) {
                resolve(existingElement);
                return;
            }
            let timeoutHandle = null;
            const observer = new MutationObserver((mutations, obs) => {
                const targetElement = findElementInShadows(rootNode, selector);
                if (targetElement) {
                    clearTimeout(timeoutHandle);
                    obs.disconnect();
                    resolve(targetElement);
                }
            });
            timeoutHandle = setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout waiting for selector: ${selector}`));
            }, timeout);
            observer.observe(rootNode, {
                childList: true,
                subtree: true
            });
        });
    }


    // [DOM 觀察 / 定時/防抖] 功能：`simulateTyping`。
    function simulateTyping(element, value) {
        element.value = value;
        element.dispatchEvent(new Event('input', {
            bubbles: true
        }));
        element.dispatchEvent(new Event('change', {
            bubbles: true
        }));
    }


    // [DOM 觀察 / 定時/防抖] 功能：`simulateKeyEvent`。
    function simulateKeyEvent(element, key, keyCode) {
        // [DOM 觀察 / 定時/防抖] 功能：`eventOptions`。
        const eventOptions = {
            key: key,
            code: key,
            keyCode: keyCode,
            which: keyCode,
            bubbles: true,
            composed: true
        };
        element.dispatchEvent(new KeyboardEvent('keydown', eventOptions));
        element.dispatchEvent(new KeyboardEvent('keyup', eventOptions));
    }


    // [DOM 觀察 / 定時/防抖] 功能：`waitForAttributeChange`。
    function waitForAttributeChange(element, attributeName, targetValue, timeout) {
        return new Promise((resolve, reject) => {
            if (element.getAttribute(attributeName) === targetValue) {
                resolve();
                return;
            }
            let timeoutHandle = null;
            const observer = new MutationObserver(() => {
                if (element.getAttribute(attributeName) === targetValue) {
                    clearTimeout(timeoutHandle);
                    observer.disconnect();
                    resolve();
                }
            });
            timeoutHandle = setTimeout(() => {
                observer.disconnect();
                reject(new Error(`在 ${timeout}ms 內等待屬性 "${attributeName}" 變為 "${targetValue}" 超時。`));
            }, timeout);
            observer.observe(element, {
                attributes: true,
                attributeFilter: [attributeName]
            });
        });
    }


    async function waitForButtonToBeEnabled(selector) {
        const button = await waitForElementWithObserver(document.body, selector, 5000); // 5000ms: 等待按鈕出現的超時。
        await waitForAttributeChange(button, 'aria-disabled', 'false', 5000); // 5000ms: 等待按鈕變為可用的超時。
        return button;
    }


    async function selectComboboxOption(container, buttonSelector, optionValue) {
        const comboboxButton = await waitForElementWithObserver(container, buttonSelector, 5000); // 5000ms: 等待下拉框按鈕出現的超時。
        comboboxButton.click();
        const optionSelector = `lightning-base-combobox-item[data-value="${optionValue}"]`;
        const optionElement = await waitForElementWithObserver(document.body, optionSelector, 5000); // 5000ms: 等待選項出現的超時。
        optionElement.click();
    }


    // [元素定位] 功能：`getSelectedValue`。
    function getSelectedValue(buttonEl) {
        if (!buttonEl) return null;

        // 主方案：aria-label 里通常包含 “Current Selection: xxx”
        const aria = buttonEl.getAttribute('aria-label') || '';
        const match = aria.match(/Current Selection:\s*([^,]+)/i);
        if (match && match[1]) {
            const v = match[1].trim();
            if (v) return v;
        }

        // 備援 1：讀 button 內顯示的 span（常見是 span.slds-truncate 或帶 title 的 span）
        const span = buttonEl.querySelector('span.slds-truncate, span[title]');
        if (span) {
            const v = (span.getAttribute('title') || span.textContent || '').trim();
            if (v) return v;
        }

        // 備援 2（最後手段）：讀 button textContent 並清洗掉前綴
        const raw = (buttonEl.textContent || '').replace(/\s+/g, ' ').trim();
        if (!raw) return null;
        return raw
            .replace(/^Case Category\s*/i, '')
            .replace(/^Case Sub Category\s*/i, '')
            .trim() || null;
    }



    // [定時/防抖] 功能：`showCompletionToast`。
    function showCompletionToast(componentElement, message) {
        if (getComputedStyle(componentElement).position === 'static') {
            componentElement.style.position = 'relative';
        }
        const overlay = document.createElement('div');
        overlay.className = 'cec-completion-overlay';
        const toast = document.createElement('div');
        toast.className = 'slds-notify slds-notify_toast slds-theme_success';
        toast.innerHTML = `
            <span class="slds-assistive-text">Success</span>
            <span class="slds-icon_container slds-icon-utility-success slds-m-right_small slds-no-flex slds-align-top" title="Success">
                <svg class="slds-icon slds-icon_small" aria-hidden="true">
                    <use xlink:href="/_slds/icons/utility-sprite/svg/symbols.svg#success"></use>
                </svg>
            </span>
            <div class="slds-notify__content">
                <h2 class="slds-text-heading_small">${message}</h2>
            </div>
        `;
        overlay.appendChild(toast);
        componentElement.appendChild(overlay);
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });
        setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 300); // 300ms: 等待淡出動畫完成後再移除元素，避免視覺突兀。
        }, 2500); // 2500ms: 提示顯示的總時長。
    }


    // [定時/防抖] 功能：`showGlobalToast`。
    function showGlobalToast(message, iconName) {
        const existingToast = document.getElementById('cec-global-toast');
        if (existingToast) {
            existingToast.remove();
        }
        if (globalToastTimer) {
            clearTimeout(globalToastTimer);
        }
        const iconHTML = `
            <span class="slds-icon_container slds-icon-utility-${iconName} slds-m-right_small slds-no-flex slds-align-top" title="${message}">
                <svg class="slds-icon slds-icon_small" aria-hidden="true">
                    <use xlink:href="/_slds/icons/utility-sprite/svg/symbols.svg#${iconName}"></use>
                </svg>
            </span>`;
        const toast = document.createElement('div');
        toast.id = 'cec-global-toast';
        toast.className = 'cec-global-toast';
        toast.innerHTML = `${iconHTML} <div class="slds-notify__content"><h2 class="slds-text-heading_small">${message}</h2></div>`;
        document.body.appendChild(toast);
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        globalToastTimer = setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300); // 300ms: 等待淡出動畫完成後再移除元素，避免視覺突兀。
        }, 2500); // 2500ms: 提示顯示的總時長。
    }


    // 功能：`formatTimeAgo`。
    function formatTimeAgo(timestamp) {
        const diffMs = Date.now() - timestamp;
        const diffMinutes = Math.round(diffMs / (1000 * 60));

        if (diffMinutes < 1) {
            return '剛剛';
        }
        if (diffMinutes < 60) {
            return `你 在 ${diffMinutes} 分 鐘 前 已 回 覆 過 此 Case`;
        }

        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;

        return `你 在 ${hours} 小 時 ${minutes} 分 鐘 前 已 回 覆 過 此 Case`;
    }


    // [設定/狀態持久化] 功能：`formatTimeAgoSimple`。
    function formatTimeAgoSimple(timestamp) {
        const diffMs = Date.now() - timestamp;
        const diffMinutes = Math.round(diffMs / (1000 * 60));

        if (diffMinutes < 1) {
            return '（剛剛）';
        }
        if (diffMinutes < 60) {
            return `（${diffMinutes}分鐘）`;
        }

        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;

        if (minutes === 0) {
            return `（${hours}小時）`;
        }
        return `（${hours}小時${minutes}分鐘）`;
    }


    // [設定/狀態持久化] 功能：`formatTimeAgoDaysHoursMinutes`。
    function formatTimeAgoDaysHoursMinutes(timestamp) {
        const diffMs = Date.now() - timestamp;
        const diffMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));
        const days = Math.floor(diffMinutes / (60 * 24));
        const hours = Math.floor((diffMinutes % (60 * 24)) / 60);
        const minutes = diffMinutes % 60;
        return `${days}天${hours}時${minutes}分`;
    }



    // [設定/狀態持久化] 功能：`checkAndNotifyForRecentSend`。
    function checkAndNotifyForRecentSend(caseUrl) {
        if (!GM_getValue('notifyOnRepliedCaseEnabled', DEFAULTS.notifyOnRepliedCaseEnabled)) {
            return;
        }

        const SEND_BUTTON_CACHE_KEY = 'sendButtonClickLog';
        const CACHE_TTL_MS = 10 * 60 * 60 * 1000; // 10小時: 已回覆記錄的緩存有效期。

        const caseId = getCaseIdFromUrl(caseUrl);
        if (!caseId) {
            Log.warn('Feature.NotifyReplied', `無法從 URL (${caseUrl}) 提取 Case ID，跳過近期處理檢查。`);
            return;
        }

        const cache = GM_getValue(SEND_BUTTON_CACHE_KEY, {});

        const PURGE_TTL_MS = CACHE_POLICY.REPLIED.PURGE_MS; // 24小時: 用於統一清理已回覆記錄緩存（兼容列表頁更長 TTL）。
        const purgeResult = purgeExpiredCacheEntries(cache, PURGE_TTL_MS);
        if (purgeResult.changed) {
            GM_setValue(SEND_BUTTON_CACHE_KEY, purgeResult.cache);
            Log.info('Feature.NotifyReplied', `已清理過期的已回覆 Case 緩存條目（removed: ${purgeResult.removed}）。`);
        }
        const entry = cache[caseId];

        if (entry && (Date.now() - entry.timestamp < CACHE_TTL_MS)) {
            const timeAgoString = formatTimeAgo(entry.timestamp);
            showGlobalCompletionNotification(timeAgoString, {
                fontSize: '20px',
                minWidth: '500px'
            });
            Log.info('Feature.NotifyReplied', `檢測到 Case ID ${caseId} 的近期處理記錄，已顯示通知: "${timeAgoString}"`);
        }
    }


    // [事件監聽 / 定時/防抖] 功能：`showGlobalCompletionNotification`。
    function showGlobalCompletionNotification(message, options = {}) {
        const {
            theme = 'success',
            fontSize = '30px',
            boxWidth = 'auto',
            minWidth = '450px'
        } = options;

        const NOTIFICATION_ID = 'cec-global-completion-notification';
        let existingOverlay = document.getElementById(NOTIFICATION_ID);
        if (existingOverlay) {
            existingOverlay.remove();
        }

        const overlay = document.createElement('div');
        overlay.id = NOTIFICATION_ID;
        overlay.className = 'cec-global-completion-overlay';
        overlay.innerHTML = `
            <div class="slds-notify slds-notify_toast slds-theme_${theme}" style="width: ${boxWidth}; min-width: ${minWidth};">
                <div class="slds-notify__content" style="text-align: center; width: 100%;">
                    <h2 class="slds-text-heading_small" style="font-size: ${fontSize}; font-weight: bold; font-family: 'Microsoft YaHei', sans-serif;">${message}</h2>
                </div>
            </div>
        `;

        let autoDismissTimer = null;
        let isDismissed = false;

        // 定義一個統一的、只執行一次的關閉函數
        const dismissNotification = () => {
            if (isDismissed) return; // 防止重複執行
            isDismissed = true;

            // 清理資源：定時器和事件監聽器
            clearTimeout(autoDismissTimer);
            overlay.removeEventListener('click', dismissNotification);

            // 執行關閉動畫和 DOM 移除
            overlay.classList.remove('show');
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 100); // 300ms: 等待淡出動畫完成。
        };

        // 綁定定時器和點擊事件
        autoDismissTimer = setTimeout(dismissNotification, 1000); // 1800ms: 通知顯示的總時長。
        overlay.addEventListener('click', dismissNotification);

        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.classList.add('show');
        });
    }


    // =================================================================================
    // SECTION: 樣式注入與UI創建 (Styles & UI)
    // =================================================================================


    function injectGlobalCustomStyles() {
        const styleId = 'cec-global-custom-styles';
        if (document.getElementById(styleId)) return;

        const css = `
            .cec-iwt-dropdown-trigger {
                position: relative;
                display: inline-block;
                width: 100%;
            }
            .cec-iwt-dropdown-menu {
                display: none;
                position: absolute;
                top: 100%;
                left: 0;
                background-color: #0070d2;
                min-width: 100%;
                box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
                z-index: 1001;
                border-radius: .25rem;
                border: 1px solid #005fb2;
                list-style: none;
                padding: 4px 0;
                margin-top: 4px;
                max-height: 200px;
                overflow-y: auto;
            }
            .cec-global-completion-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.4);
                z-index: 10001;
                display: flex;
                justify-content: center;
                align-items: center;
                opacity: 0;
                transition: opacity 0.3s ease;
                /* [核心修正] 已移除 pointer-events: none; */
            }
            .cec-global-completion-overlay.show {
                opacity: 1;
            }
            .cec-global-completion-overlay .slds-notify_toast {
                pointer-events: all;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            }
            .cec-iwt-dropdown-menu.show {
                display: block;
            }
            .cec-iwt-dropdown-item {
                color: #ffffff;
                padding: 8px 12px;
                text-decoration: none;
                display: block;
                cursor: pointer;
                font-size: 13px;
                white-space: nowrap;
                text-align: left;
            }
            .cec-iwt-dropdown-item:hover {
                background-color: #005fb2;
            }
            .cec-dropdown-arrow {
                margin-left: 8px;
                font-size: 10px;
                vertical-align: middle;
            }
            .cec-iwt-button-override,
            .custom-action-button-container .slds-button,
            .custom-s-button,
            .cec-template-shortcut-button,
            .cec-settings-action-button {
                font-family: "Segoe UI Variable Display Semib", "PingFang TC", sans-serif !important;
            }
            .cec-global-toast {
                position: fixed;
                top: 15%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(0, 0, 0, 0.75);
                color: #ffffff;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 10000;
                display: flex;
                align-items: center;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                opacity: 0;
                transition: opacity 0.3s ease, transform 0.3s ease;
            }
            .cec-global-toast.show {
                opacity: 1;
                transform: translate(-50%, -40%);
            }
            .cec-global-toast .slds-icon {
                fill: #ffffff;
            }
            .cec-header-button {
                background-color: transparent;
                border: 0px solid transparent;
                border-radius: 50%;
                transition: background-color 0.2s ease;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .cec-header-button:hover, .cec-header-button:focus {
                background-color: rgba(0, 0, 0, 0.1);
            }
            .cec-header-button .slds-button__icon {
                fill: #0070d2;
                width: 24px;
                height: 24px;
            }
            .cec-iwt-button-override {
                background-color: #0070d2 !important;
                border-color: #0070d2 !important;
                color: #ffffff !important;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                transition: background-color 0.2s ease, border-color 0.2s ease;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .cec-iwt-button-override:hover, .cec-iwt-button-override:focus {
                background-color: #005fb2 !important;
                border-color: #005fb2 !important;
            }
            .cec-iwt-button-override:active {
                background-color: #003e75 !important;
                border-color: #003e75 !important;
            }
            .cec-iwt-button-override:disabled,
            .cec-iwt-button-override[disabled] {
                background-color: var(--slds-g-color-neutral-base-80, var(--lwc-brandDisabled, rgb(201, 199, 197))) !important;
                border-color: var(--slds-g-color-neutral-base-80, var(--lwc-brandDisabled, rgb(201, 199, 197))) !important;
                color: var(--slds-g-color-neutral-base-100, var(--lwc-colorTextButtonBrandDisabled, rgb(255, 255, 255))) !important;
                cursor: default !important;
                box-shadow: none !important;
            }
            c-cec-i-want-to-container span.shortcutlabel {
                display: none !important;
            }
            .cec-completion-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.4);
                z-index: 1000;
                display: flex;
                justify-content: center;
                align-items: center;
                opacity: 0;
                transition: opacity 0.3s ease;
                border-radius: .25rem;
            }
            .uiTooltipAdvanced,
            .tooltip.advanced-wrapper {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
            }
        `;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = css;
        document.head.appendChild(style);
    }


    // [設定/狀態持久化 / 樣式注入] 功能：`injectStyleOverrides`。
    function injectStyleOverrides() {
        const styleId = 'pro-style-overrides';
        if (document.getElementById(styleId)) {
            document.getElementById(styleId).remove();
        }
        const height = GM_getValue('caseHistoryHeight', DEFAULTS.caseHistoryHeight);
        const css = `
            div[c-cecshipmentidentifierdisplayrows_cecshipmentidentifierdisplayrows].tableScroll {
                min-height: ${height}px !important;
            }
        `;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = css;
        document.head.appendChild(style);
    }


    // [設定/狀態持久化] 功能：`toggleCleanModeStyles`。
    function toggleCleanModeStyles() {
        const STYLE_ID = 'clean-mode-styles';
        const isEnabled = GM_getValue('cleanModeEnabled', DEFAULTS.cleanModeEnabled);

        const existingStyle = document.getElementById(STYLE_ID);
        if (existingStyle) {
            existingStyle.remove();
        }

        if (!isEnabled) {
            return;
        }

        const defaultConfig = DEFAULTS.cleanModeConfig.reduce((acc, item) => {
            acc[item.id] = item.enabled;
            return acc;
        }, {});

        const userConfig = GM_getValue('cleanModeUserConfig', defaultConfig);

        // 分離：普通屏蔽項 (隱藏) vs 自定義樣式項 (修改)
        const hideSelectors = [];
        let customCssRules = '';

        DEFAULTS.cleanModeConfig.forEach(item => {
            // 只有當用戶勾選了該項時才處理
            if (userConfig[item.id]) {
                if (item.customRule) {
                    // [新功能] 如果配置了 customRule，則應用特定的 CSS 規則 (例如 padding: 0)
                    customCssRules += `${item.selector} { ${item.customRule} } \n`;
                } else {
                    // [舊邏輯] 否則默認為隱藏元素
                    hideSelectors.push(item.selector);
                }
            }
        });

        let finalCss = customCssRules;

        // 將所有需要隱藏的選擇器合併，統一應用 display: none
        if (hideSelectors.length > 0) {
            finalCss += hideSelectors.join(',\n') + ' { display: none !important; }';
        }

        if (!finalCss.trim()) {
            return;
        }

        const styleElement = document.createElement('style');
        styleElement.id = STYLE_ID;
        styleElement.textContent = finalCss;
        document.head.appendChild(styleElement);
    }


    // 功能：`createSettingsUI`。
    function createSettingsUI() {
        if (document.getElementById('cec-settings-modal')) return;

        const modalHTML = `
            <div id="cec-settings-modal" class="cec-settings-backdrop">
                <div class="cec-settings-content">
                    <div id="cec-refresh-banner" class="cec-settings-refresh-banner">
                        <span class="slds-icon_container slds-icon-utility-warning slds-m-right_x-small">
                            <svg class="slds-icon slds-icon_x-small slds-icon-text-default" aria-hidden="true" style="fill: #744210;">
                                <use xlink:href="/_slds/icons/utility-sprite/svg/symbols.svg#warning"></use>
                            </svg>
                        </span>
                        <span>部分設置已更改，請 <a href="javascript:void(0);" id="cec-refresh-link">刷新頁面</a> 以生效。</span>
                    </div>
                    <div class="cec-settings-header">
                        <h2>腳本設定</h2>
                        <button id="cec-settings-close" title="關閉 (Esc)">&times;</button>
                    </div>
                    <div class="cec-settings-body">
                        <div class="cec-settings-tabs">
                            <button class="cec-settings-tab-button active" data-tab="general">核心配置</button>
                            <button class="cec-settings-tab-button" data-tab="interface">界面</button>
                            <button class="cec-settings-tab-button" data-tab="automation">自動化</button>
                            <button class="cec-settings-tab-button" data-tab="buttons">快捷按鈕</button>
                            <button class="cec-settings-tab-button" data-tab="pca">PCA</button>
                        </div>

                        <!-- 核心配置 Tab -->
                        <div id="tab-general" class="cec-settings-tab-content active">
                           <div class="cec-settings-section">
                                <h3 class="cec-settings-section-title">核心配置</h3>
                                <div class="cec-settings-option">
                                    <label for="autoAssignUserInput" class="cec-settings-label">操作者用戶名 (Case Owner) <span class="cec-badge-instant">無需刷新</span></label>
                                    <input type="text" id="autoAssignUserInput" class="cec-settings-input" placeholder="輸入完整用戶名">
                                </div>
                                <p class="cec-settings-description">用於自動指派功能，請確保姓名與系統完全匹配。</p>
                            </div>
                        </div>

                        <!-- 界面 Tab -->
                        <div id="tab-interface" class="cec-settings-tab-content">
                            <div class="cec-settings-section">
                                <h3 class="cec-settings-section-title">跟進面板</h3>
                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main">
                                        <label for="followUpPanelToggle" class="cec-settings-label">啟用跟進面板 <span class="cec-badge-refresh">需刷新</span></label>
                                        <label class="cec-settings-switch">
                                            <input type="checkbox" id="followUpPanelToggle">
                                            <span class="cec-settings-slider"></span>
                                        </label>
                                    </div>
                                    <p class="cec-settings-description">在頁面右下角顯示常駐跟進面板，並在 Case 詳情頁加入「設定跟進時間」按鈕。</p>
                                </div>
                            </div>

                            <div class="cec-settings-section">
                                <h3 class="cec-settings-section-title">通知與提示</h3>
                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main">
                                        <label for="notifyOnRepliedCaseToggle" class="cec-settings-label">提示已回覆過的 Case <span class="cec-badge-refresh">需刷新</span></label>
                                        <label class="cec-settings-switch"><input type="checkbox" id="notifyOnRepliedCaseToggle"><span class="cec-settings-slider"></span></label>
                                    </div>
                                    <p class="cec-settings-description">在 Case 詳情頁和列表頁，對近期已回覆的 Case 進行醒目提示。</p>
                                </div>
                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main">
                                        <label for="highlightExpiringCasesToggle" class="cec-settings-label">快過期 Case 紅色高亮提示 <span class="cec-badge-refresh">需刷新</span></label>
                                        <label class="cec-settings-switch"><input type="checkbox" id="highlightExpiringCasesToggle"><span class="cec-settings-slider"></span></label>
                                    </div>
                                    <p class="cec-settings-description">在列表頁檢測 Importance 列，若非 "Priority" 狀態或空白，將該單元格標紅。</p>
                                </div>
                            </div>

                            <div class="cec-settings-section">
                                <h3 class="cec-settings-section-title">組件屏蔽</h3>
                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main">
                                        <label for="cleanModeToggle" class="cec-settings-label">啟用組件屏蔽 (Clean Mode) <span class="cec-badge-instant">無需刷新</span></label>
                                        <label class="cec-settings-switch"><input type="checkbox" id="cleanModeToggle"><span class="cec-settings-slider"></span></label>
                                    </div>
                                    <p class="cec-settings-description">隱藏頁面上的特定元素，提供更簡潔的視野。</p>
                                </div>
                                <div class="cec-settings-option">
                                    <div class="cec-settings-button-bar-inline">
                                        <button id="cleanModeCustomToggle" class="cec-settings-link-button">自定義屏蔽項...</button>
                                        <button id="resetCleanMode" class="cec-settings-link-button danger">恢復默認</button>
                                    </div>
                                    <div id="cleanModeCustomContainer" class="cec-settings-custom-container">
                                        <div class="cec-settings-custom-content">
                                            <div id="clean-mode-custom-list" class="cec-settings-custom-list"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="cec-settings-divider">
                            <div class="cec-settings-section">
                                <h3 class="cec-settings-section-title">賬戶高亮模式</h3>
                                <div class="cec-settings-radio-group" id="accountHighlightModeGroup">
                                    <label><input type="radio" name="highlightMode" value="off"> 關閉 <span class="cec-badge-instant">無需刷新</span></label>
                                    <p class="cec-settings-description">不對任何賬戶進行高亮。</p>
                                    <label><input type="radio" name="highlightMode" value="pca"> 識別Non PCA A/C <span class="cec-badge-instant">無需刷新</span></label>
                                    <p class="cec-settings-description">當 Case 聯繫人 "Preferred" 為 "No" 時，將其背景高亮。</p>
                                    <label><input type="radio" name="highlightMode" value="dispatch"> 識別PCA A/C <span class="cec-badge-instant">無需刷新</span></label>
                                    <p class="cec-settings-description">當 Case 聯繫人 "Preferred" 為 "Yes" 時，將其背景高亮。</p>
                                </div>
                            </div>

                            <hr class="cec-settings-divider">
                            <div class="cec-settings-section">
                                <h3 class="cec-settings-section-title">界面元素高度 (單位: px)</h3>
                                <div class="cec-settings-option-grid">
                                    <label for="caseHistoryHeightInput">Related Cases 列表高度 (默認：208) <span class="cec-badge-instant">無需刷新</span></label>
                                    <div class="cec-settings-input-group"><input type="number" min="0" id="caseHistoryHeightInput" class="cec-settings-input"></div>

                                    <label for="caseDescriptionHeightInput">Case 描述框高度 (默認：80) <span class="cec-badge-refresh">需刷新</span></label>
                                    <div class="cec-settings-input-group"><input type="number" min="0" id="caseDescriptionHeightInput" class="cec-settings-input"></div>

                                    <label for="richTextEditorHeightInput">覆 case 編輯器高度 (默認：500) <span class="cec-badge-refresh">需刷新</span></label>
                                    <div class="cec-settings-input-group"><input type="number" min="0" id="richTextEditorHeightInput" class="cec-settings-input"></div>
                                </div>
                            </div>

                            <hr class="cec-settings-divider">
                            <div class="cec-settings-section">
                                <h3 class="cec-settings-section-title">窗口與流程</h3>
                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main"><label for="sentinelCloseToggle" class="cec-settings-label">關聯聯繫人後快速關閉窗口 <span class="cec-badge-instant">無需刷新</span></label><label class="cec-settings-switch"><input type="checkbox" id="sentinelCloseToggle"><span class="cec-settings-slider"></span></label></div>
                                </div>
                            </div>
                        </div>

                        <!-- 自動化 Tab -->
                        <div id="tab-automation" class="cec-settings-tab-content">
                            <div class="cec-settings-section">
                                <h3 class="cec-settings-section-title">IVP 查詢優化</h3>
                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main"><label for="autoWebQueryToggle" class="cec-settings-label">進入Case頁面自動查詢Web <span class="cec-badge-refresh">需刷新</span></label><label class="cec-settings-switch"><input type="checkbox" id="autoWebQueryToggle"><span class="cec-settings-slider"></span></label></div>
                                </div>
                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main"><label for="autoIVPQueryToggle" class="cec-settings-label">進入Case頁面自動查詢IVP <span class="cec-badge-refresh">需刷新</span></label><label class="cec-settings-switch"><input type="checkbox" id="autoIVPQueryToggle"><span class="cec-settings-slider"></span></label></div>
                                </div>
                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main"><label for="autoSwitchToggle" class="cec-settings-label">檢測到追蹤號自動切換至IVP窗口 <span class="cec-badge-instant">無需刷新</span></label><label class="cec-settings-switch"><input type="checkbox" id="autoSwitchToggle"><span class="cec-settings-slider"></span></label></div>
                                </div>
                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main"><label for="blockIVPToggle" class="cec-settings-label">屏蔽原生IVP卡片自動加載 <span class="cec-badge-refresh">需刷新</span></label><label class="cec-settings-switch"><input type="checkbox" id="blockIVPToggle"><span class="cec-settings-slider"></span></label></div>
                                </div>
                            </div>

                            <div class="cec-settings-section">
                                <h3 class="cec-settings-section-title">模板插入優化</h3>
                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main">
                                        <label for="postInsertionEnhancementsToggle" class="cec-settings-label">啟用模板插入後增強處理 <span class="cec-badge-instant">無需刷新</span></label>
                                        <label class="cec-settings-switch"><input type="checkbox" id="postInsertionEnhancementsToggle"><span class="cec-settings-slider"></span></label>
                                    </div>
                                    <p class="cec-settings-description">啟用後，將自動附加智能粘貼、精準定位光標並應用視覺偏移。</p>
                                </div>
                                <div class="cec-settings-option">
                                    <label class="cec-settings-label" style="margin-bottom: 8px;">模板插入位置策略 <span class="cec-badge-instant">無需刷新</span></label>
                                    <div class="cec-settings-radio-group" id="templateInsertionModeGroup">
                                        <label><input type="radio" name="insertionMode" value="logo"> UPS Logo 圖標下方插入</label>
                                        <p class="cec-settings-description">自動將模板插入到簽名檔下方，確保位置統一（推薦）。</p>
                                        <label><input type="radio" name="insertionMode" value="cursor"> 隨光標位置插入</label>
                                        <p class="cec-settings-description">將模板插入到您當前光標所在的位置。</p>
                                    </div>
                                </div>
                                <div class="cec-settings-option">
                                    <label for="cursorPositionInput" class="cec-settings-label">光標定位於第 N 個換行符前 <span class="cec-badge-instant">無需刷新</span></label>
                                    <input type="number" min="1" id="cursorPositionInput" class="cec-settings-input" style="width: 80px; margin-top: 4px;">
                                    <p class="cec-settings-description">默認為 5。此設置僅在“增強處理”啟用時生效。</p>
                                </div>
                            </div>

                            <!-- [位置調整] 其他輔助移至上方 -->
                            <hr class="cec-settings-divider">
                            <div class="cec-settings-section">
                                <h3 class="cec-settings-section-title">其他輔助</h3>
                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main">
                                        <label for="autoScrollActionButtonsToggle" class="cec-settings-label">快捷按鈕注入後自動下移網頁 <span class="cec-badge-instant">無需刷新</span></label>
                                        <label class="cec-settings-switch">
                                            <input type="checkbox" id="autoScrollActionButtonsToggle">
                                            <span class="cec-settings-slider"></span>
                                        </label>
                                    </div>
                                    <p class="cec-settings-description">在注入快捷按鈕後，自動將網頁下移 111px，以便查看被遮擋的內容。</p>
                                </div>
                                <hr class="cec-settings-divider">
                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main">
                                        <label for="autoLoadAllUpdatesToggle" class="cec-settings-label">自動加載 Updates 全部內容 (背景無感) <span class="cec-badge-refresh">需刷新</span></label>
                                        <label class="cec-settings-switch">
                                            <input type="checkbox" id="autoLoadAllUpdatesToggle">
                                            <span class="cec-settings-slider"></span>
                                        </label>
                                    </div>
                                    <p class="cec-settings-description">進入 Case 頁面 2 秒後，自動背景觸發 Updates 歷史內容加載（最多 5 次）。</p>
                                </div>
                            </div>

                            <!-- [位置調整] 自動化評論文本移至下方 (因為需刷新頁面生效) -->
                            <hr class="cec-settings-divider">
                            <div class="cec-settings-section">
                                <h3 class="cec-settings-section-title">自動化評論文本 <span class="cec-badge-refresh">需刷新</span></h3>
                                <p class="cec-settings-description" style="margin-top:-12px; margin-bottom:12px;">為 "I Want To..." 自動化按鈕設置多個評論選項。</p>
                                <div class="cec-settings-comment-group">
                                    <label class="cec-settings-label">Re-Open Case</label>
                                    <ul id="reOpen-list" class="cec-settings-comment-list"></ul>
                                    <button class="cec-settings-add-comment-button" data-key="reOpen">+ 添加選項</button>
                                </div>
                                <div class="cec-settings-comment-group">
                                    <label class="cec-settings-label">Close this Case</label>
                                    <ul id="closeCase-list" class="cec-settings-comment-list"></ul>
                                    <button class="cec-settings-add-comment-button" data-key="closeCase">+ 添加選項</button>
                                </div>
                                <div class="cec-settings-comment-group">
                                    <label class="cec-settings-label">Document Customer Contact</label>
                                    <ul id="docContact-list" class="cec-settings-comment-list"></ul>
                                    <button class="cec-settings-add-comment-button" data-key="documentContact">+ 添加選項</button>
                                </div>
                            </div>
                        </div>

                        <!-- 快捷按鈕 Tab -->
                        <div id="tab-buttons" class="cec-settings-tab-content">
                            <div class="cec-settings-section">
                                <h3 class="cec-settings-section-title">按鈕列表 <span class="cec-badge-refresh">需刷新</span></h3>
                                <p class="cec-settings-description" style="margin-top:-12px; margin-bottom:12px;">拖拽 &#9776; 可排序。所有修改需刷新頁面後生效。</p>
                                <ul id="button-config-list" class="cec-settings-button-list"></ul>
                                <div class="cec-settings-button-bar">
                                    <button id="add-new-button" class="cec-settings-action-button">+ 添加新按鈕</button>
                                    <button id="reset-buttons" class="cec-settings-action-button secondary">恢復默認</button>
                                </div>
                            </div>
                        </div>

                        <!-- PCA Tab -->
                        <div id="tab-pca" class="cec-settings-tab-content">
                            <div class="cec-settings-section">
                                <h3 class="cec-settings-section-title">預付 / 開查 case</h3>

                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main">
                                        <label for="pcaDoNotClosePromptToggle" class="cec-settings-label">Do Not Close提醒 <span class="cec-badge-instant">無需刷新</span></label>
                                        <label class="cec-settings-switch"><input type="checkbox" id="pcaDoNotClosePromptToggle"><span class="cec-settings-slider"></span></label>
                                    </div>
                                    <p class="cec-settings-description">命中【預付/開查】時彈窗提示是否勾選 “Send and Do Not Close”。</p>
                                </div>

                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main">
                                        <label for="pcaCaseListHintToggle" class="cec-settings-label">Case列表提示 <span class="cec-badge-refresh">需刷新</span></label>
                                        <label class="cec-settings-switch"><input type="checkbox" id="pcaCaseListHintToggle"><span class="cec-settings-slider"></span></label>
                                    </div>
                                    <p class="cec-settings-description">在 Case 列表頁，優先顯示「開查/預付 + X天X時X分」。</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Toast Container -->
                    <div id="cec-settings-toast" class="cec-settings-toast"></div>
                </div>
            </div>
        `;

        const modalCSS = `
            .cec-badge-refresh {
                display: inline-block;
                background: #fff03f;
                color: #555;
                font-size: 10px;
                padding: 1px 4px;
                border-radius: 4px;
                vertical-align: middle;
                margin-left: 6px;
                font-weight: bold;
                border: 1px solid #e6d306;
            }
            .cec-badge-instant {
                display: inline-block;
                background: #e6fffa;
                color: #047481;
                font-size: 10px;
                padding: 1px 4px;
                border-radius: 4px;
                vertical-align: middle;
                margin-left: 6px;
                font-weight: bold;
                border: 1px solid #b2f5ea;
            }
            .cec-settings-refresh-banner {
                background-color: #fef3c7;
                color: #744210;
                padding: 10px 16px;
                font-size: 0.9rem;
                border-radius: 8px 8px 0 0;
                display: none; /* 默認隱藏 */
                align-items: center;
                border-bottom: 1px solid #fcd34d;
                animation: slideDown 0.3s ease;
            }
            .cec-settings-refresh-banner.show {
                display: flex;
            }
            .cec-settings-refresh-banner a {
                color: #0070d2;
                font-weight: bold;
                text-decoration: underline;
                cursor: pointer;
            }
            @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .cec-settings-comment-group {
                margin-bottom: 20px;
                padding: 12px;
                background: #f8f9fa;
                border-radius: 6px;
                border: 1px solid #eee;
            }
            .cec-settings-comment-group .cec-settings-label {
                font-weight: 700;
                margin-bottom: 8px;
                display: block;
                color: #333;
                font-size: 0.95rem;
            }
            .cec-settings-comment-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            .cec-settings-comment-item {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
                transition: background 0.2s;
            }
            .cec-settings-comment-item input {
                flex-grow: 1;
                margin-right: 8px;
            }
            .cec-settings-delete-comment-button {
                background: white;
                border: 1px solid #ddd;
                cursor: pointer;
                color: #c23934;
                width: 30px;
                height: 30px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            .cec-settings-delete-comment-button:hover {
                background: #c23934;
                color: white;
                border-color: #c23934;
            }
            .cec-settings-add-comment-button {
                background: white;
                border: 1px dashed #0070d2;
                color: #0070d2;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 6px;
                width: 100%;
                text-align: center;
                transition: background 0.2s;
            }
            .cec-settings-add-comment-button:hover {
                background: #f0f8ff;
            }
            .cec-settings-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                z-index: 9999;
                display: flex;
                justify-content: center;
                align-items: center;
                opacity: 0;
                transition: opacity .3s ease;
                font-size: 14px;
            }
            .cec-settings-content {
                background: #f3f3f3;
                border-radius: 8px;
                box-shadow: 0 5px 25px rgba(0, 0, 0, 0.2);
                width: 90%;
                max-width: 620px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                transform: scale(.95);
                transition: transform .3s ease;
                display: flex;
                flex-direction: column;
                max-height: 85vh;
                position: relative;
            }
            .cec-settings-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 24px;
                border-bottom: 1px solid #e0e0e0;
                background: #fff;
            }
            .cec-settings-refresh-banner + .cec-settings-header {
                 border-radius: 0;
            }
            .cec-settings-header:first-child {
                 border-radius: 8px 8px 0 0;
            }

            .cec-settings-header h2 {
                margin: 0;
                font-size: 1.25rem;
                color: #333;
                font-weight: 600;
            }
            #cec-settings-close {
                background: 0 0;
                border: 0;
                font-size: 2rem;
                color: #888;
                cursor: pointer;
                line-height: 1;
                padding: 0 0 4px 0;
                transition: color 0.2s;
            }
            #cec-settings-close:hover {
                color: #333;
            }
            .cec-settings-body {
                padding: 16px 24px 24px;
                overflow-y: auto;
                flex-grow: 1;
            }
            .cec-settings-tabs {
                display: flex;
                border-bottom: 2px solid #e0e0e0;
                margin-bottom: 20px;
                gap: 5px;
            }
            .cec-settings-tab-button {
                background: none;
                border: none;
                padding: 10px 14px;
                cursor: pointer;
                font-size: 0.95rem;
                color: #666;
                border-bottom: 3px solid transparent;
                margin-bottom: -2px;
                transition: all 0.2s;
                font-weight: 500;
                border-radius: 4px 4px 0 0;
            }
            .cec-settings-tab-button:hover {
                background-color: rgba(0,0,0,0.03);
                color: #0070d2;
            }
            .cec-settings-tab-button.active {
                color: #0070d2;
                border-bottom-color: #0070d2;
                font-weight: 700;
                background-color: #fff;
            }
            .cec-settings-tab-content {
                display: none;
            }
            .cec-settings-tab-content.active {
                display: block;
                animation: fadeIn .25s ease;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(5px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .cec-settings-section {
                background: #fff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                margin-bottom: 20px;
                border: 1px solid #e5e5e5;
            }
            .cec-settings-section-title {
                font-size: 1rem;
                font-weight: 700;
                color: #2c3e50;
                margin: 0 0 16px;
                padding-bottom: 10px;
                border-bottom: 1px solid #f0f0f0;
            }
            .cec-settings-divider {
                border: 0;
                border-top: 1px solid #e0e0e0;
                margin: 20px 0;
            }
            .cec-settings-option {
                padding: 10px 0;
            }
            .cec-settings-option-main {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .cec-settings-label {
                color: #333;
                flex-grow: 1;
                font-weight: 500;
            }
            .cec-settings-description {
                color: #666;
                font-size: 0.85rem;
                margin-top: 6px;
                line-height: 1.4;
            }
            .cec-settings-input {
                width: 100%;
                padding: 8px 10px;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-size: .95rem;
                box-sizing: border-box;
                transition: border 0.2s, box-shadow 0.2s;
            }
            .cec-settings-input:focus {
                border-color: #0070d2;
                outline: none;
                box-shadow: 0 0 0 1px #0070d2;
            }
            .cec-settings-input.cec-input-success {
                border-color: #2e844a;
                background-color: #f0fff4;
                animation: flashGreen 1s;
            }
            .cec-settings-input.cec-input-error {
                border-color: #c23934;
                background-color: #fff0f0;
            }
            @keyframes flashGreen {
                0% { box-shadow: 0 0 5px #2e844a; }
                100% { box-shadow: none; }
            }
            .cec-settings-input-group {
                display: flex;
                align-items: center;
            }
            .cec-settings-input-group input {
                width: 90px;
                text-align: right;
            }
            .cec-settings-option-grid {
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 15px;
                align-items: center;
            }
            /* Switch Styles */
            .cec-settings-switch {
                position: relative;
                display: inline-block;
                width: 44px;
                height: 24px;
                flex-shrink: 0;
            }
            .cec-settings-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            .cec-settings-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #ccc;
                border-radius: 24px;
                transition: .3s cubic-bezier(0.4, 0.0, 0.2, 1);
            }
            .cec-settings-slider:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 3px;
                bottom: 3px;
                background-color: #fff;
                border-radius: 50%;
                transition: .3s cubic-bezier(0.4, 0.0, 0.2, 1);
                box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            }
            input:checked + .cec-settings-slider {
                background-color: #0070d2;
            }
            input:checked + .cec-settings-slider:before {
                transform: translateX(20px);
            }
            /* Radio Group */
            .cec-settings-radio-group label {
                display: block;
                margin-bottom: 6px;
                font-weight: 500;
                cursor: pointer;
            }
            .cec-settings-radio-group input {
                margin-right: 8px;
                vertical-align: middle;
            }
            .cec-settings-radio-group .cec-settings-description {
                margin-left: 24px;
                margin-bottom: 14px;
            }
            /* Links & Buttons */
            .cec-settings-link-button {
                background: none;
                border: none;
                color: #0070d2;
                cursor: pointer;
                text-decoration: none;
                padding: 0;
                font-size: 14px;
                border-bottom: 1px dashed #0070d2;
            }
            .cec-settings-link-button:hover {
                color: #005fb2;
                border-bottom-style: solid;
            }
            .cec-settings-link-button.danger {
                color: #c23934;
                border-bottom-color: #c23934;
            }
            .cec-settings-link-button.danger:hover {
                color: #8b0000;
            }
            .cec-settings-button-bar-inline {
                display: flex;
                align-items: center;
                gap: 20px;
                margin-top: 8px;
            }
            /* Custom Clean Mode List */
            .cec-settings-custom-container {
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.3s ease-out;
            }
            .cec-settings-custom-container.expanded {
                max-height: 400px;
                margin-top: 15px;
            }
            .cec-settings-custom-content {
                background-color: #f9f9f9;
                border-radius: 4px;
                border: 1px solid #eee;
            }
            .cec-settings-custom-list {
                padding: 15px;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
            }
            .cec-settings-custom-item {
                display: flex;
                align-items: center;
                font-size: 13px;
                cursor: pointer;
            }
            .cec-settings-custom-item input {
                margin-right: 8px;
            }
            /* Button List & Drag */
            .cec-settings-button-list {
                list-style: none;
                padding: 0;
                margin: 0;
                min-height: 100px;
                max-height: 500px;
                overflow-y: auto;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                padding: 8px;
                background: #fafafa;
            }
            .cec-settings-button-item {
                display: flex;
                align-items: center;
                padding: 10px 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
                margin-bottom: 8px;
                background: #fff;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            .cec-settings-button-item:last-child {
                margin-bottom: 0;
            }
            .cec-settings-button-item.dragging {
                opacity: 0.5;
                background: #e0f0ff;
                border: 1px dashed #0070d2;
            }
            .cec-settings-drop-placeholder {
                height: 44px;
                background: #f0f8ff;
                border: 2px dashed #0070d2;
                border-radius: 6px;
                margin-bottom: 8px;
            }
            .cec-settings-button-drag-handle {
                cursor: grab;
                color: #bbb;
                margin-right: 12px;
                font-size: 18px;
                user-select: none;
            }
            .cec-settings-button-drag-handle:hover {
                color: #666;
            }
            .cec-settings-button-name {
                font-weight: 600;
                flex-grow: 1;
                color: #333;
            }
            .cec-settings-button-actions button {
                background: none;
                border: none;
                cursor: pointer;
                margin-left: 8px;
                padding: 6px;
                border-radius: 4px;
                transition: background 0.2s;
            }
            .cec-settings-button-actions button:hover {
                background: #f0f0f0;
            }
            .cec-settings-button-edit { color: #0070d2; }
            .cec-settings-button-delete { color: #c23934; }
            .cec-settings-button-bar {
                display: flex;
                gap: 12px;
                margin-top: 16px;
            }
            .cec-settings-action-button {
                flex-grow: 1;
                padding: 10px;
                font-size: 1rem;
                border-radius: 6px;
                cursor: pointer;
                background-color: #0070d2;
                color: white;
                border: 1px solid #0070d2;
                font-weight: 600;
                transition: background 0.2s;
            }
            .cec-settings-action-button:hover {
                background-color: #005fb2;
            }
            .cec-settings-action-button.secondary {
                background-color: #fff;
                color: #555;
                border: 1px solid #ccc;
            }
            .cec-settings-action-button.secondary:hover {
                background-color: #f8f8f8;
                color: #333;
            }

            /* Edit Modal (Nested) */
            .cec-edit-modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.4);
                z-index: 10000;
                display: flex;
                justify-content: center;
                align-items: center;
                border-radius: 8px; /* Match parent content */
                animation: fadeIn 0.2s ease;
            }
            .cec-edit-modal-content {
                background: #fff;
                padding: 24px;
                border-radius: 8px;
                width: 90%;
                max-width: 480px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            }
            .cec-edit-modal-content h3 {
                margin: 0 0 20px;
                font-size: 1.2rem;
                color: #333;
            }
            .cec-edit-form {
                display: grid;
                grid-template-columns: 100px 1fr;
                gap: 15px;
                align-items: start;
            }
            .cec-edit-form label {
                padding-top: 8px;
                font-weight: 600;
                color: #555;
            }
            .cec-edit-form .input-wrapper {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .cec-edit-form .input-row {
                display: flex;
                align-items: center;
                gap: 5px;
            }
            .cec-edit-form .input-row input {
                flex-grow: 1;
            }
            .cec-edit-form-buttons {
                grid-column: 1 / -1;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 24px;
            }
            /* Toast */
            .cec-settings-toast {
                position: absolute;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%) translateY(20px);
                background-color: #333;
                color: #fff;
                padding: 12px 24px;
                border-radius: 30px;
                font-size: 0.95rem;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                z-index: 20000;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .cec-settings-toast.show {
                opacity: 1;
                visibility: visible;
                transform: translateX(-50%) translateY(0);
            }
            .cec-settings-toast.warning {
                background-color: #ffb75d;
                color: #333;
                font-weight: bold;
            }
            .cec-settings-toast.success {
                background-color: #2e844a;
            }
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const styleSheet = document.createElement("style");
        styleSheet.textContent = modalCSS;
        document.head.appendChild(styleSheet);
    }


    // [定時/防抖 / 元素定位] 功能：`openSettingsModal`。
    function openSettingsModal() {
        if (!document.getElementById('cec-settings-modal')) {
            createSettingsUI();
        }

        const modal = document.getElementById('cec-settings-modal');
        const content = modal.querySelector('.cec-settings-content');
        const toast = document.getElementById('cec-settings-toast');
        const refreshBanner = document.getElementById('cec-refresh-banner');
        const refreshLink = document.getElementById('cec-refresh-link');

        // ---------------------------------------------------------
        // 核心邏輯：綁定事件與數據刷新
        // ---------------------------------------------------------
        if (!modal.dataset.cecSettingsBound) {
            modal.dataset.cecSettingsBound = 'true';

            // --- 狀態管理 ---
            let isRefreshNeeded = false;
            let toastTimer;

            // --- 輔助函數：Toast 提示 ---
            const showToast = (message = '設置已保存', type = 'success') => {
                clearTimeout(toastTimer);
                toast.textContent = message;
                toast.className = 'cec-settings-toast'; // Reset classes
                if (type === 'warning') toast.classList.add('warning');
                else toast.classList.add('success');

                // 添加圖標
                const iconMap = {
                    'success': '✓',
                    'warning': '!'
                };
                toast.innerHTML = `<span style="font-weight:bold; font-size:1.2em;">${iconMap[type] || ''}</span> ${message}`;

                toast.classList.add('show');
                toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
            };

            // --- 輔助函數：標記需要刷新 ---
            const markAsRefreshNeeded = () => {
                if (!isRefreshNeeded) {
                    isRefreshNeeded = true;
                    refreshBanner.classList.add('show');
                }
            };

            // --- 刷新頁面鏈接 ---
            if (refreshLink) {
                refreshLink.addEventListener('click', () => location.reload());
            }

            // --- 輔助函數：處理通用設置變更 ---
            const handleSettingChange = (key, value, needsRefresh = false) => {
                GM_setValue(key, value);
                // 同步更新運行時配置
                RUNTIME_CONFIG[key] = value;

                if (needsRefresh) {
                    markAsRefreshNeeded();
                    showToast('設置已保存 (需刷新頁面生效)', 'warning');
                } else {
                    showToast('設置已保存', 'success');
                }
                Log.info('UI.Settings', `設置已保存: ${key} = ${value} (Refresh: ${needsRefresh})`);
            };

            // [事件監聽 / 元素定位] 功能：`settings`。
            const settings = {
                // ---- 標籤頁 ----
                initTabs: () => {
                    const tabs = modal.querySelectorAll('.cec-settings-tab-button');
                    const tabContents = modal.querySelectorAll('.cec-settings-tab-content');
                    tabs.forEach(tab => {
                        tab.addEventListener('click', () => {
                            tabs.forEach(t => t.classList.remove('active'));
                            tab.classList.add('active');
                            tabContents.forEach(c => c.classList.remove('active'));
                            modal.querySelector(`#tab-${tab.dataset.tab}`).classList.add('active');
                        });
                    });
                },

                // ---- 組件屏蔽模式 ----
                defaultCleanModeConfig: DEFAULTS.cleanModeConfig.reduce((acc, item) => {
                    acc[item.id] = item.enabled;
                    return acc;
                }, {}),

                currentUserConfig: null,
                renderCleanModeList: null,

                // ---- 自動填充文本 ----
                autoFillTexts: null,
                migrateAutoFillTexts: null,
                renderCommentList: null,
                setupCommentListHandlers: null,

                // ---- 按鈕配置 ----
                currentButtons: null,
                renderButtonList: null,
                saveButtons: null,
                draggedItem: null,
                placeholderElement: null, // 用於拖拽占位
                getDragAfterElement: null,

                refresh: null
            };

            // 初始化標籤頁
            settings.initTabs();

            // 關閉事件
            const closeBtn = document.getElementById('cec-settings-close');
            closeBtn.addEventListener('click', closeSettingsModal);

            // 點擊遮罩關閉
            let mouseDownTarget = null;
            modal.addEventListener('mousedown', (e) => {
                if (e.target === modal) mouseDownTarget = e.target;
                else mouseDownTarget = null;
            });
            modal.addEventListener('mouseup', (e) => {
                if (e.target === mouseDownTarget && e.target === modal) closeSettingsModal();
                mouseDownTarget = null;
            });

            // ESC 鍵關閉
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.style.display === 'flex') {
                    // 確保沒有打開編輯子窗口時才關閉主窗口
                    if (!document.querySelector('.cec-edit-modal-backdrop')) {
                        closeSettingsModal();
                    }
                }
            });

            // -----------------------
            // 組件屏蔽處理器
            // -----------------------
            const cleanModeToggle = document.getElementById('cleanModeToggle');
            const cleanModeCustomToggle = document.getElementById('cleanModeCustomToggle');
            const cleanModeCustomContainer = document.getElementById('cleanModeCustomContainer');
            const cleanModeList = document.getElementById('clean-mode-custom-list');
            const resetCleanModeButton = document.getElementById('resetCleanMode');

            settings.renderCleanModeList = () => {
                cleanModeList.innerHTML = '';
                settings.currentUserConfig = GM_getValue('cleanModeUserConfig', { ...settings.defaultCleanModeConfig });
                DEFAULTS.cleanModeConfig.forEach(item => {
                    const isChecked = settings.currentUserConfig[item.id] || false;
                    cleanModeList.insertAdjacentHTML('beforeend', `<label class="cec-settings-custom-item"><input type="checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}><span>${item.label}</span></label>`);
                });
            };

            cleanModeToggle.onchange = () => {
                handleSettingChange('cleanModeEnabled', cleanModeToggle.checked, true); // 需要刷新才能完全清除/應用某些樣式
                toggleCleanModeStyles();
            };

            cleanModeCustomToggle.addEventListener('click', () => {
                cleanModeCustomContainer.classList.toggle('expanded');
            });

            cleanModeList.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                    settings.currentUserConfig = GM_getValue('cleanModeUserConfig', { ...settings.defaultCleanModeConfig });
                    settings.currentUserConfig[e.target.dataset.id] = e.target.checked;
                    GM_setValue('cleanModeUserConfig', settings.currentUserConfig);
                    toggleCleanModeStyles();
                    showToast('自定義屏蔽項已更新', 'success');
                }
            });

            // [優化] 使用自定義確認
            resetCleanModeButton.addEventListener('click', () => {
                if (confirm('確定要將組件屏蔽列表恢復為默認嗎？此操作不可撤銷。')) {
                    settings.currentUserConfig = { ...settings.defaultCleanModeConfig };
                    GM_setValue('cleanModeUserConfig', settings.currentUserConfig);
                    settings.renderCleanModeList();
                    toggleCleanModeStyles();
                    showToast('組件屏蔽已恢復默認', 'success');
                }
            });

            // -----------------------
            // 自動填充文本處理器 (優化交互)
            // -----------------------
            settings.migrateAutoFillTexts = () => {
                let current = GM_getValue('iwtAutoFillTexts', DEFAULTS.iwtAutoFillTexts);
                let changed = false;
                for (const key in current) {
                    if (typeof current[key] === 'string') {
                        current[key] = [current[key]];
                        changed = true;
                    }
                }
                if (changed) GM_setValue('iwtAutoFillTexts', current);
                return current;
            };

            settings.renderCommentList = (key, listElement) => {
                listElement.innerHTML = '';
                const items = settings.autoFillTexts[key] || [];
                items.forEach((text, index) => {
                    const li = document.createElement('li');
                    li.className = 'cec-settings-comment-item';
                    // [優化] 添加動畫類
                    li.style.animation = 'fadeIn 0.3s ease';
                    li.innerHTML = `
                        <input type="text" class="cec-settings-input" data-index="${index}" value="${text}" placeholder="輸入評論文本...">
                        <button class="cec-settings-delete-comment-button" data-index="${index}" title="刪除">
                           <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </button>
                    `;
                    listElement.appendChild(li);
                });
            };

            settings.setupCommentListHandlers = (key, listElement, addButton) => {
                settings.renderCommentList(key, listElement);

                addButton.addEventListener('click', () => {
                    settings.autoFillTexts[key].push('');
                    GM_setValue('iwtAutoFillTexts', settings.autoFillTexts);
                    settings.renderCommentList(key, listElement);
                    // [優化] 自動聚焦最後一個輸入框
                    const inputs = listElement.querySelectorAll('input');
                    if(inputs.length > 0) inputs[inputs.length - 1].focus();
                    showToast('已添加新選項', 'success');
                });

                listElement.addEventListener('change', (e) => {
                    if (e.target.tagName === 'INPUT') {
                        const index = parseInt(e.target.dataset.index, 10);
                        settings.autoFillTexts[key][index] = e.target.value;
                        GM_setValue('iwtAutoFillTexts', settings.autoFillTexts);
                        e.target.classList.add('cec-input-success');
                        setTimeout(() => e.target.classList.remove('cec-input-success'), 1000);
                        showToast('選項已保存', 'success');
                    }
                });

                listElement.addEventListener('click', (e) => {
                    const btn = e.target.closest('.cec-settings-delete-comment-button');
                    if (btn) {
                        // [優化] 刪除確認
                        if (confirm('確定要刪除這條評論選項嗎？')) {
                            const index = parseInt(btn.dataset.index, 10);
                            const li = btn.closest('li');
                            // 簡單的刪除動畫
                            li.style.opacity = '0';
                            li.style.transform = 'translateX(20px)';
                            setTimeout(() => {
                                settings.autoFillTexts[key].splice(index, 1);
                                GM_setValue('iwtAutoFillTexts', settings.autoFillTexts);
                                settings.renderCommentList(key, listElement);
                                showToast('選項已刪除', 'success');
                            }, 200);
                        }
                    }
                });
            };

            settings.autoFillTexts = settings.migrateAutoFillTexts();
            settings.setupCommentListHandlers('reOpen', document.getElementById('reOpen-list'), document.querySelector('[data-key=\"reOpen\"]'));
            settings.setupCommentListHandlers('closeCase', document.getElementById('closeCase-list'), document.querySelector('[data-key=\"closeCase\"]'));
            settings.setupCommentListHandlers('documentContact', document.getElementById('docContact-list'), document.querySelector('[data-key=\"documentContact\"]'));

            // -----------------------
            // 按鈕配置處理器 (拖拽與視覺優化)
            // -----------------------
            const buttonList = document.getElementById('button-config-list');

            settings.saveButtons = () => {
                GM_setValue('actionButtons', settings.currentButtons);
                markAsRefreshNeeded();
                showToast('按鈕配置已保存 (需刷新)', 'warning');
            };

            settings.renderButtonList = () => {
                buttonList.innerHTML = '';
                settings.currentButtons.forEach((button) => {
                    const listItem = document.createElement('li');
                    listItem.className = 'cec-settings-button-item';
                    listItem.draggable = true;
                    listItem.dataset.id = button.id;
                    listItem.innerHTML = `
                        <span class="cec-settings-button-drag-handle">&#9776;</span>
                        <span class="cec-settings-button-name">${button.name}</span>
                        <div class="cec-settings-button-actions">
                            <button class="cec-settings-button-edit" title="編輯">✏️</button>
                            <button class="cec-settings-button-delete" title="刪除">🗑️</button>
                        </div>`;
                    buttonList.appendChild(listItem);

                    listItem.querySelector('.cec-settings-button-edit').addEventListener('click', () => openButtonEditModal(button, settings.renderButtonList, settings.saveButtons));
                    listItem.querySelector('.cec-settings-button-delete').addEventListener('click', () => {
                        if (confirm(`確定要刪除按鈕 "${button.name}" 嗎？`)) {
                            settings.currentButtons = settings.currentButtons.filter(b => b.id !== button.id);
                            settings.saveButtons();
                            settings.renderButtonList();
                        }
                    });
                });
            };

            settings.getDragAfterElement = (container, y) => {
                const draggableElements = [...container.querySelectorAll('.cec-settings-button-item:not(.dragging)')];
                return draggableElements.reduce((closest, child) => {
                    const box = child.getBoundingClientRect();
                    const offset = y - box.top - box.height / 2;
                    if (offset < 0 && offset > closest.offset) {
                        return { offset: offset, element: child };
                    } else {
                        return closest;
                    }
                }, { offset: Number.NEGATIVE_INFINITY }).element;
            };

            // 拖拽邏輯優化
            buttonList.addEventListener('dragstart', (e) => {
                if (e.target.classList.contains('cec-settings-button-item')) {
                    settings.draggedItem = e.target;
                    setTimeout(() => e.target.classList.add('dragging'), 0);
                    // 創建佔位符
                    settings.placeholderElement = document.createElement('div');
                    settings.placeholderElement.className = 'cec-settings-drop-placeholder';
                } else {
                    e.preventDefault();
                }
            });

            buttonList.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (!settings.draggedItem) return;
                const afterElement = settings.getDragAfterElement(buttonList, e.clientY);
                if (afterElement) {
                    buttonList.insertBefore(settings.placeholderElement, afterElement);
                } else {
                    buttonList.appendChild(settings.placeholderElement);
                }
            });

            buttonList.addEventListener('dragend', () => {
                if (settings.draggedItem) {
                    settings.draggedItem.classList.remove('dragging');
                    if (settings.placeholderElement && settings.placeholderElement.parentNode) {
                        settings.placeholderElement.parentNode.insertBefore(settings.draggedItem, settings.placeholderElement);
                        settings.placeholderElement.remove();
                    }
                    settings.draggedItem = null;
                    settings.placeholderElement = null;

                    // 排序並保存
                    const newOrder = Array.from(buttonList.children).map(item => item.dataset.id);
                    settings.currentButtons.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
                    settings.saveButtons();
                }
            });

            document.getElementById('add-new-button').addEventListener('click', () => {
                // [設定/狀態持久化 / 事件監聽 / 定時/防抖] 功能：`newButton`。
                const newButton = {
                    id: `btn-${Date.now()}`,
                    name: 'NEW BUTTON',
                    category: [''],
                    subCategory: [''],
                    role: ['']
                };
                settings.currentButtons.push(newButton);
                settings.saveButtons();
                settings.renderButtonList();
                // 立即打開編輯
                openButtonEditModal(newButton, settings.renderButtonList, settings.saveButtons);
            });

            document.getElementById('reset-buttons').addEventListener('click', () => {
                if (confirm('確定要恢復為默認的快捷按鈕配置嗎？自定義按鈕將丟失。')) {
                    settings.currentButtons = JSON.parse(JSON.stringify(DEFAULTS.actionButtons));
                    settings.saveButtons();
                    settings.renderButtonList();
                    showToast('按鈕已恢復默認', 'success');
                }
            });

            // -----------------------
            // 刷新函數 (每次打開時執行)
            // -----------------------
            settings.refresh = () => {
                // 如果有未刷新的更改，保持 banner 顯示
                if (isRefreshNeeded) refreshBanner.classList.add('show');

                // 綁定輸入框通用邏輯 (數字校驗與樣式)
                const bindInput = (id, key, minVal, allowText = false) => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    el.value = GM_getValue(key, DEFAULTS[key] || '');

                    el.onchange = () => {
                        let val = el.value;
                        if (!allowText) {
                            val = parseInt(val, 10);
                            // 校驗：如果小於最小值，還原並報錯
                            if (isNaN(val) || val < minVal) {
                                el.classList.add('cec-input-error');
                                setTimeout(() => el.classList.remove('cec-input-error'), 1000);
                                el.value = GM_getValue(key, DEFAULTS[key]); // 還原
                                showToast('輸入值無效', 'warning');
                                return;
                            }
                        } else {
                            val = val.trim();
                        }

                        el.classList.add('cec-input-success');
                        setTimeout(() => el.classList.remove('cec-input-success'), 1000);
                        handleSettingChange(key, val, false); // 大部分輸入框不需要刷新，或即時生效

                        // 特殊處理：高度改變後觸發重繪
                        if (id === 'caseHistoryHeightInput') injectStyleOverrides();
                    };
                };

                // [設定/狀態持久化 / 元素定位] 功能：`bindToggle`。
                const bindToggle = (id, key, needsRefresh) => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    el.checked = GM_getValue(key, DEFAULTS[key]);
                    el.onchange = () => handleSettingChange(key, el.checked, needsRefresh);
                };

                // [設定/狀態持久化 / 元素定位] 功能：`bindRadio`。
                const bindRadio = (groupName, key) => {
                    const group = document.getElementById(groupName); // 其實是用 container 監聽
                    if (!group) return;
                    const currentVal = GM_getValue(key, 'pca');
                    const radio = group.querySelector(`input[value="${currentVal}"]`);
                    if (radio) radio.checked = true;

                    group.onchange = (e) => {
                        if (e.target.name === 'highlightMode' || e.target.name === 'insertionMode') { // 根據 name 屬性判斷
                             handleSettingChange(key, e.target.value, false);
                        }
                    };
                };

                // --- 綁定核心配置 ---
                bindInput('autoAssignUserInput', 'autoAssignUser', 0, true);

                // --- 綁定界面開關 ---
                bindToggle('followUpPanelToggle', 'followUpPanelEnabled', true); // Panel 需要刷新重建
                bindToggle('notifyOnRepliedCaseToggle', 'notifyOnRepliedCaseEnabled', true); // Cache 依賴刷新
                bindToggle('highlightExpiringCasesEnabled', 'highlightExpiringCasesEnabled', true); // Observer 依賴
                bindToggle('cleanModeToggle', 'cleanModeEnabled', false); // CSS 即時生效

                // --- 綁定界面高度 ---
                bindInput('caseHistoryHeightInput', 'caseHistoryHeight', 0);
                bindInput('caseDescriptionHeightInput', 'caseDescriptionHeight', 0);
                bindInput('richTextEditorHeightInput', 'richTextEditorHeight', 0);

                // --- 綁定其他開關 ---
                bindToggle('sentinelCloseToggle', 'sentinelCloseEnabled', false);
                bindToggle('autoWebQueryToggle', 'autoWebQueryEnabled', false);
                bindToggle('autoIVPQueryToggle', 'autoIVPQueryEnabled', false);
                bindToggle('autoSwitchToggle', 'autoSwitchEnabled', false);
                bindToggle('blockIVPToggle', 'blockIVPCard', true); // Observer 依賴，最好刷新
                bindToggle('postInsertionEnhancementsToggle', 'postInsertionEnhancementsEnabled', false);

                // --- 綁定單選 ---
                bindRadio('accountHighlightModeGroup', 'accountHighlightMode');

                // Template Insertion Mode Group logic
                const tplGroup = document.getElementById('templateInsertionModeGroup');
                const tplCurrent = GM_getValue('templateInsertionMode', DEFAULTS.templateInsertionMode);
                const tplRadio = tplGroup.querySelector(`input[value="${tplCurrent}"]`);
                if(tplRadio) tplRadio.checked = true;
                tplGroup.onchange = (e) => handleSettingChange('templateInsertionMode', e.target.value, false);

                bindInput('cursorPositionInput', 'cursorPositionBrIndex', 1);

                // --- 綁定輔助開關 ---
                bindToggle('autoScrollActionButtonsToggle', 'autoScrollAfterActionButtons', false);
                bindToggle('autoLoadAllUpdatesToggle', 'autoLoadAllUpdates', false);

                // --- 綁定 PCA ---
                bindToggle('pcaDoNotClosePromptToggle', 'pcaDoNotClosePromptEnabled', false);
                bindToggle('pcaCaseListHintToggle', 'pcaCaseListHintEnabled', true); // Observer 依賴

                // --- 刷新列表 ---
                settings.renderCleanModeList();
                settings.autoFillTexts = settings.migrateAutoFillTexts();
                settings.renderCommentList('reOpen', document.getElementById('reOpen-list'));
                settings.renderCommentList('closeCase', document.getElementById('closeCase-list'));
                settings.renderCommentList('documentContact', document.getElementById('docContact-list'));

                settings.currentButtons = GM_getValue('actionButtons', JSON.parse(JSON.stringify(DEFAULTS.actionButtons)));
                settings.renderButtonList();
            };

            // 存儲設置對象以便再次調用刷新
            modal._cecSettings = settings;
        }

        // 每次打開都刷新一次UI數據
        if (modal._cecSettings && typeof modal._cecSettings.refresh === 'function') {
            modal._cecSettings.refresh();
        }

        // 顯示模態框
        modal.style.display = 'flex';
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            content.style.transform = 'scale(1)';
        });
    }



    // [事件監聽] 功能：`openButtonEditModal`。
    function openButtonEditModal(button, onSaveCallback, saveFn) {
        const modalContainer = document.getElementById('cec-settings-modal');
        const editModal = document.createElement('div');
        editModal.className = 'cec-edit-modal-backdrop';
        // [事件監聽] 功能：`fields`。
        const fields = {
            name: '按鈕名稱',
            category: 'Category',
            subCategory: 'Sub Category',
            role: 'Role'
        };
        let formHTML = `<h3>編輯按鈕: "${button.name}"</h3><div class="cec-edit-form">`;
        formHTML += `<label>${fields.name}</label><input type="text" data-field="name" value="${button.name}">`;
        ['category', 'subCategory', 'role'].forEach(field => {
            formHTML += `<label>${fields[field]}</label><div class="input-wrapper" data-wrapper-for="${field}">`;
            const values = Array.isArray(button[field]) ? button[field] : [button[field] || ''];
            values.forEach((value, index) => {
                formHTML += `<div class="input-row"><input type="text" data-field="${field}" data-index="${index}" value="${value}"><button class="cec-settings-remove-option">-</button></div>`;
            });
            formHTML += `<button class="cec-settings-add-option">+</button></div>`;
        });
        formHTML += `
            <div class="cec-edit-form-buttons">
                <button id="cancel-edit" class="cec-settings-action-button secondary">取消</button>
                <button id="save-edit" class="cec-settings-action-button">保存更改</button>
            </div>
        </div>`;
        editModal.innerHTML = `<div class="cec-edit-modal-content">${formHTML}</div>`;
        modalContainer.appendChild(editModal);
        const tempButton = JSON.parse(JSON.stringify(button));

        editModal.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT') {
                const field = e.target.dataset.field;
                if (field === 'name') {
                    tempButton.name = e.target.value;
                } else {
                    const index = parseInt(e.target.dataset.index, 10);
                    if (!Array.isArray(tempButton[field])) tempButton[field] = [];
                    tempButton[field][index] = e.target.value;
                }
            }
        });

        editModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('cec-settings-add-option')) {
                e.preventDefault();
                const wrapper = e.target.closest('.input-wrapper');
                const field = wrapper.dataset.wrapperFor;

                if (!Array.isArray(tempButton[field])) {
                    tempButton[field] = [];
                }
                const newIndex = tempButton[field].length;
                tempButton[field].push('');

                const newRow = document.createElement('div');
                newRow.className = 'input-row';
                newRow.innerHTML = `<input type="text" data-field="${field}" data-index="${newIndex}" value=""><button class="cec-settings-remove-option">-</button>`;
                wrapper.insertBefore(newRow, e.target);
            }

            if (e.target.classList.contains('cec-settings-remove-option')) {
                e.preventDefault();
                const rowToRemove = e.target.closest('.input-row');
                const input = rowToRemove.querySelector('input');
                const field = input.dataset.field;
                const indexToRemove = parseInt(input.dataset.index, 10);

                if (Array.isArray(tempButton[field])) {
                    tempButton[field].splice(indexToRemove, 1);
                }

                const wrapper = rowToRemove.parentElement;
                rowToRemove.remove();

                const remainingRows = wrapper.querySelectorAll('.input-row');
                remainingRows.forEach((row, newIndex) => {
                    if (newIndex >= indexToRemove) {
                        row.querySelector('input').dataset.index = newIndex;
                    }
                });
            }
        });

        editModal.querySelector('#save-edit').addEventListener('click', () => {
            Object.keys(tempButton).forEach(key => {
                if (Array.isArray(tempButton[key])) {
                    tempButton[key] = tempButton[key].filter(item => item.trim() !== '');
                }
            });
            Object.assign(button, tempButton);
            saveFn();
            onSaveCallback();
            editModal.remove();
        });

        editModal.querySelector('#cancel-edit').addEventListener('click', () => {
            editModal.remove();
        });
    }


    // [設定/狀態持久化 / 定時/防抖 / 元素定位] 功能：`closeSettingsModal`。
    function closeSettingsModal() {
        const modal = document.getElementById('cec-settings-modal');
        const content = modal.querySelector('.cec-settings-content');
        modal.style.opacity = '0';
        content.style.transform = 'scale(0.95)';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); // 300ms: 等待關閉動畫完成後再隱藏元素，避免視覺突兀。
    }


    // =================================================================================
    // SECTION: 核心功能邏輯 (Feature Logic)
    // =================================================================================


    function injectPcaCaseListSortButtons(tableBody) {
        try {
            const listHintEnabled = GM_getValue('pcaCaseListHintEnabled', DEFAULTS.pcaCaseListHintEnabled);
            const BAR_ID = 'cec-pca-sort-button-bar';

            // 若功能關閉，則移除按鈕並清理狀態
            if (!listHintEnabled) {
                const existing = document.getElementById(BAR_ID);
                if (existing) existing.remove();
                pcaCaseListOriginalRowKeys = null;
                pcaCaseListIsSorted = false;
                return;
            }

            // 先清理舊位置的按鈕（避免殘留）
            const existingBar = document.getElementById(BAR_ID);
            if (existingBar) {
                existingBar.remove();
            }

            // 定位 Search 容器（search-in-list 本身通常是 relative，不改動其原有佈局）
            const searchInList = findFirstElementInShadows(document.body, [
                'div.search-in-list.slds-is-relative',
                'force-list-view-manager-search-bar div.search-in-list'
            ]);
            if (!searchInList) {
                Log.warn('Feature.CaseList.Sort', '未找到列表 Search 容器，PCA排序按鈕未注入。');
                return;
            }

            // 參考腳本按鈕樣式：li + a.forceActionLink（但用「絕對定位」掛到左邊，不推動搜索框）
            const bar = document.createElement('ul');
            bar.id = BAR_ID;
            bar.style.display = 'flex';
            bar.style.alignItems = 'center';
            bar.style.gap = '6px';
            bar.style.margin = '0';
            bar.style.padding = '0';
            bar.style.listStyle = 'none';

            // 核心修復：不改 searchInList 的排版，直接把按鈕絕對定位到左邊
            bar.style.position = 'absolute';
            bar.style.right = '100%';
            bar.style.top = '50%';
            bar.style.transform = 'translateY(-50%)';
            bar.style.marginRight = '8px';
            bar.style.zIndex = '1';

            // [事件監聽 / 元素定位] 功能：`createLiButton`。
            const createLiButton = (id, label, title, handler) => {
                const li = document.createElement('li');
                li.className = 'slds-button slds-button--neutral slds-button_neutral';
                li.id = id;
                li.style.cssText = 'width: 110px; text-align: center; margin-left: 0.25rem;';
                li.innerHTML = `<a href="javascript:void(0);" role="button" class="forceActionLink" style="display:flex;justify-content:center;align-items:center;height:1.9rem;padding:0 0rem;color:var(--slds-c-button-text-color);"><div title="${title}">${label}</div></a>`;
                li.addEventListener('click', (e) => {
                    e.preventDefault();
                    handler();
                });
                return li;
            };

            const sortLi = createLiButton(
                'cec-pca-sort-btn',
                'PCA提示排序',
                '按預付/開查分類，再按時間倒序排序（僅當前已渲染行）',
                () => { sortPcaHintRowsInCaseList(tableBody); }
            );

            const restoreLi = createLiButton(
                'cec-pca-restore-btn',
                '還原排序',
                '還原到本次排序前的原始順序',
                () => { restorePcaHintRowsInCaseList(tableBody); }
            );

            bar.appendChild(sortLi);
            bar.appendChild(restoreLi);

            // 掛載到 searchInList 內（絕對定位，不影響搜索框原位置）
            searchInList.appendChild(bar);

            Log.info('Feature.CaseList.Sort', 'PCA排序按鈕已成功顯示在 Search 輸入框左側（不影響搜索框位置）。');

        } catch (e) {
            Log.warn('Feature.CaseList.Sort', `注入 PCA 排序按鈕失敗: ${e.message}`);
        }
    }



    // [元素定位] 功能：`snapshotPcaCaseListOriginalOrder`。
    function snapshotPcaCaseListOriginalOrder(tableBody) {
        if (pcaCaseListOriginalRowKeys && pcaCaseListOriginalRowKeys.length > 0) {
            return;
        }
        const rows = tableBody ? Array.from(tableBody.querySelectorAll('tr[data-row-key-value]')) : [];
        pcaCaseListOriginalRowKeys = rows.map(r => r.getAttribute('data-row-key-value')).filter(Boolean);
    }


    // [元素定位] 功能：`sortPcaHintRowsInCaseList`。
    function sortPcaHintRowsInCaseList(tableBody) {
        if (!tableBody) return;

        snapshotPcaCaseListOriginalOrder(tableBody);

        const rows = Array.from(tableBody.querySelectorAll('tr[data-row-key-value]'));
        if (rows.length === 0) return;

        // 功能：`typeRank`。
        const typeRank = (t) => {
            if (t === 'billing') return 0;
            if (t === 'claims') return 1;
            return 99;
        };

        const originalIndex = new Map();
        rows.forEach((r, i) => {
            const id = r.getAttribute('data-row-key-value');
            if (id) originalIndex.set(id, i);
        });

        rows.sort((a, b) => {
            const ta = a.dataset.cecPcaType || '';
            const tb = b.dataset.cecPcaType || '';
            const ra = typeRank(ta);
            const rb = typeRank(tb);
            if (ra !== rb) return ra - rb;

            const tsa = parseInt(a.dataset.cecPcaTimestamp || '', 10);
            const tsb = parseInt(b.dataset.cecPcaTimestamp || '', 10);

            const va = Number.isFinite(tsa) ? tsa : Number.MAX_SAFE_INTEGER;
            const vb = Number.isFinite(tsb) ? tsb : Number.MAX_SAFE_INTEGER;
            if (va !== vb) return va - vb; // timestamp 越小代表越久，排前（倒序：越久越前）

            const ida = a.getAttribute('data-row-key-value');
            const idb = b.getAttribute('data-row-key-value');
            const ia = originalIndex.has(ida) ? originalIndex.get(ida) : 0;
            const ib = originalIndex.has(idb) ? originalIndex.get(idb) : 0;
            return ia - ib;
        });

        const fragment = document.createDocumentFragment();
        rows.forEach(r => fragment.appendChild(r));
        tableBody.appendChild(fragment);

        pcaCaseListIsSorted = true;
        Log.info('Feature.CaseList.Sort', 'PCA提示排序已執行完成（僅當前已渲染行）。');
    }


    // [設定/狀態持久化 / 元素定位] 功能：`processCaseListRows`。
    function processCaseListRows(tableBody) {
        // [優化] 使用內存配置
        const repliedEnabled = RUNTIME_CONFIG.notifyOnRepliedCaseEnabled;
        const listHintEnabled = RUNTIME_CONFIG.pcaCaseListHintEnabled;
        const expiringHighlightEnabled = RUNTIME_CONFIG.highlightExpiringCasesEnabled;
        const followUpPanelEnabled = RUNTIME_CONFIG.followUpPanelEnabled;

        if (!repliedEnabled && !listHintEnabled && !expiringHighlightEnabled && !followUpPanelEnabled) return;

        // [配置] 高對比度色譜 (深色/高飽和度，適合白字)
        const COLOR_PALETTE = [
            '#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF'
        ];

        const SEND_BUTTON_CACHE_KEY = CACHE_POLICY.REPLIED.KEY;
        const CACHE_TTL_MS = CACHE_POLICY.REPLIED.LIST_TTL_MS;
        const CLAIMS_CACHE_KEY = CACHE_POLICY.CLAIMS_LOST_PKG.KEY;
        const CLAIMS_TTL_MS = CACHE_POLICY.CLAIMS_LOST_PKG.LIST_TTL_MS;
        const BILLING_CACHE_KEY = CACHE_POLICY.BILLING_REBILL.KEY;
        const BILLING_TTL_MS = CACHE_POLICY.BILLING_REBILL.LIST_TTL_MS;
        const FU_ITEMS_KEY = 'FU_PANEL_ITEMS_V1';
        const ANNOTATION_CLASS = 'cec-replied-annotation';

        // 緩存讀取仍需使用 GM_getValue，因為這些數據是動態寫入的，不適合放入靜態 RUNTIME_CONFIG
        const repliedCache = repliedEnabled ? GM_getValue(SEND_BUTTON_CACHE_KEY, {}) : {};
        if (repliedEnabled) purgeExpiredCacheEntries(repliedCache, CACHE_TTL_MS);
        const claimsCache = listHintEnabled ? GM_getValue(CLAIMS_CACHE_KEY, {}) : {};
        if (listHintEnabled) purgeExpiredCacheEntries(claimsCache, CLAIMS_TTL_MS);
        const billingCache = listHintEnabled ? GM_getValue(BILLING_CACHE_KEY, {}) : {};
        if (listHintEnabled) purgeExpiredCacheEntries(billingCache, BILLING_TTL_MS);

        const followUpSet = new Set();
        if (followUpPanelEnabled) {
            try {
                const rawItems = GM_getValue(FU_ITEMS_KEY, '[]');
                const items = JSON.parse(rawItems);
                if (Array.isArray(items)) {
                    items.forEach(it => {
                        if (it.caseNo) {
                            const pureNo = String(it.caseNo).replace(/[^0-9]/g, '');
                            if (pureNo) followUpSet.add(pureNo);
                        }
                    });
                }
            } catch (e) { }
        }

        const allRows = tableBody.querySelectorAll('tr[data-row-key-value]');
        let isAnyCaseExpiring = false;

        // [新增] 顏色分配計數器與映射表
        let colorIndex = 0;
        const currentViewMap = new Map(); // Key: CaseNo, Value: ColorString

        allRows.forEach(row => {
            const caseId = row.getAttribute('data-row-key-value');
            if (!caseId) return;

            const caseNumberLink = findElementInShadows(row, `a[href*="${caseId}"]`);
            let caseNumberText = '';
            if (caseNumberLink) {
                caseNumberText = caseNumberLink.textContent.replace(/[^0-9]/g, '');
            }

            if (row.dataset.cecProcessed !== 'true') {
                row.dataset.cecProcessed = 'true';

                const isFollowUp = (followUpPanelEnabled && caseNumberText && followUpSet.has(caseNumberText));

                // [新增] 動態顏色分配邏輯
                let assignedColor = null;
                if (isFollowUp) {
                    if (!currentViewMap.has(caseNumberText)) {
                        assignedColor = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
                        currentViewMap.set(caseNumberText, assignedColor);
                        colorIndex++;
                    } else {
                        assignedColor = currentViewMap.get(caseNumberText);
                    }
                }

                let annotationText = null;
                let annotationMeta = null;

                if (isFollowUp) {
                    annotationText = " 跟進中";
                    annotationMeta = { type: 'followup', color: assignedColor };
                } else if (listHintEnabled) {
                    const claimsEntry = claimsCache[caseId];
                    const billingEntry = billingCache[caseId];

                    if (claimsEntry && (Date.now() - claimsEntry.timestamp < CLAIMS_TTL_MS)) {
                        annotationText = ` 開查 - ${formatTimeAgoDaysHoursMinutes(claimsEntry.timestamp)}`;
                        annotationMeta = { type: 'claims', timestamp: claimsEntry.timestamp };
                    } else if (billingEntry && (Date.now() - billingEntry.timestamp < BILLING_TTL_MS)) {
                        annotationText = ` 預付 - ${formatTimeAgoDaysHoursMinutes(billingEntry.timestamp)}`;
                        annotationMeta = { type: 'billing', timestamp: billingEntry.timestamp };
                    }
                }

                if (!annotationText && repliedEnabled) {
                    const repliedEntry = repliedCache[caseId];
                    if (repliedEntry && (Date.now() - repliedEntry.timestamp < CACHE_TTL_MS)) {
                        annotationText = ` ${formatTimeAgoSimple(repliedEntry.timestamp)}`;
                        annotationMeta = { type: 'replied', timestamp: repliedEntry.timestamp };
                    }
                }

                if (annotationMeta && annotationMeta.type === 'followup') {
                    row.dataset.cecPcaType = 'followup';
                    row.dataset.cecPcaTimestamp = String(Date.now());
                } else if (annotationMeta && (annotationMeta.type === 'claims' || annotationMeta.type === 'billing')) {
                    row.dataset.cecPcaType = annotationMeta.type;
                    row.dataset.cecPcaTimestamp = String(annotationMeta.timestamp);
                } else {
                    delete row.dataset.cecPcaType;
                    delete row.dataset.cecPcaTimestamp;
                }

                if (caseNumberLink) {
                    // 重置樣式
                    caseNumberLink.style.backgroundColor = '';
                    caseNumberLink.style.color = '';
                    caseNumberLink.style.padding = '';
                    caseNumberLink.style.borderRadius = '';
                    caseNumberLink.style.textDecoration = '';
                    caseNumberLink.title = '';

                    const injectionTarget = caseNumberLink.parentElement;
                    if (injectionTarget) {
                        const existingAnnotation = injectionTarget.querySelector(`.${ANNOTATION_CLASS}`);
                        if (existingAnnotation) existingAnnotation.remove();

                        if (annotationText) {
                            const annotationSpan = document.createElement('span');
                            annotationSpan.className = ANNOTATION_CLASS;
                            annotationSpan.textContent = annotationText;
                            annotationSpan.style.fontSize = 'inherit';
                            annotationSpan.style.marginLeft = '6px';
                            annotationSpan.style.borderRadius = '4px';
                            annotationSpan.style.padding = '0px 6px';
                            annotationSpan.style.display = 'inline-block';

                            if (annotationMeta.type === 'followup') {
                                annotationSpan.style.backgroundColor = annotationMeta.color;
                                annotationSpan.style.color = '#ffffff';
                                annotationSpan.style.fontWeight = 'bold';
                            } else if (annotationMeta.type === 'claims' || annotationMeta.type === 'billing') {
                                const CLAIMS_BASE_COLOR = '#2e844a';
                                const BILLING_BASE_COLOR = '#0070d2';
                                let bgColor = (annotationMeta.type === 'claims') ? CLAIMS_BASE_COLOR : BILLING_BASE_COLOR;
                                if (annotationMeta.type === 'claims' || annotationMeta.type === 'billing') {
                                    const diffMs = Date.now() - annotationMeta.timestamp;
                                    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
                                    if (diffDays >= 10) bgColor = 'red';
                                }
                                annotationSpan.style.backgroundColor = bgColor;
                                annotationSpan.style.color = '#ffffff';
                                annotationSpan.style.fontWeight = 'normal';
                            } else {
                                annotationSpan.style.color = '#000000';
                                annotationSpan.style.fontWeight = 'normal';
                                annotationSpan.style.padding = '0';
                            }
                            injectionTarget.appendChild(annotationSpan);
                        }
                    }
                }
            } else {
                const caseNumberLink = findElementInShadows(row, `a[href*="${caseId}"]`);
                if (caseNumberLink) {
                    const text = caseNumberLink.textContent.replace(/[^0-9]/g, '');
                    if (followUpPanelEnabled && text && followUpSet.has(text)) {
                         if (!currentViewMap.has(text)) {
                             const color = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
                             currentViewMap.set(text, color);
                             colorIndex++;
                         }
                    }
                }
            }

            if (expiringHighlightEnabled && !isAnyCaseExpiring) {
                const importanceCell = row.querySelector('td[data-label="Importance"]');
                if (importanceCell) {
                    const richText = findElementInShadows(importanceCell, 'lightning-formatted-rich-text');
                    if (richText) {
                        const img = findElementInShadows(richText, 'img');
                        if (img) {
                            const altText = img.getAttribute('src');
                            if (altText && altText !== '/resource/CEC_Commitment_Priority_4_IMG') {
                                isAnyCaseExpiring = true;
                            }
                        }
                    }
                }
            }
        });

        if (followUpPanelEnabled) {
            FollowUpPanel.highlightListMatches(currentViewMap);
        }

        if (expiringHighlightEnabled) {
            const table = tableBody.parentElement;
            const thead = table ? table.querySelector('thead') : null;
            if (thead) {
                const importanceTitleSpan = findElementInShadows(thead, 'span[title="Importance"]');
                if (importanceTitleSpan) {
                    const headerAction = importanceTitleSpan.closest('a.slds-th__action');
                    if (headerAction) {
                        if (isAnyCaseExpiring) {
                            headerAction.style.setProperty('background-color', 'red', 'important');
                            headerAction.style.setProperty('color', 'white', 'important');
                            const icon = headerAction.querySelector('lightning-primitive-icon svg');
                            if(icon) icon.style.fill = 'white';
                        } else {
                            headerAction.style.removeProperty('background-color');
                            headerAction.style.removeProperty('color');
                            const icon = headerAction.querySelector('lightning-primitive-icon svg');
                            if(icon) icon.style.fill = '';
                        }
                    }
                }
            }
        }
    }


    async function initCaseListMonitor() {
        const repliedEnabled = GM_getValue('notifyOnRepliedCaseEnabled', DEFAULTS.notifyOnRepliedCaseEnabled);
        const listHintEnabled = GM_getValue('pcaCaseListHintEnabled', DEFAULTS.pcaCaseListHintEnabled);
        const expiringHighlightEnabled = GM_getValue('highlightExpiringCasesEnabled', false);

        if (!repliedEnabled && !listHintEnabled && !expiringHighlightEnabled) {
            return;
        }

        try {
            const dataTableSelector = 'lightning-datatable';
            const dataTable = await waitForElementWithObserver(document.body, dataTableSelector, 20000); // 20000ms: 等待列表組件出現的超時。
            Log.info('Feature.CaseList', 'lightning-datatable 組件已找到。');

            const tableBody = await new Promise((resolve, reject) => {
                const startTime = Date.now();
                const intervalId = setInterval(() => {
                    const tbody = findElementInShadows(dataTable, 'tbody');
                    if (tbody) {
                        clearInterval(intervalId);
                        resolve(tbody);
                    } else if (Date.now() - startTime > 10000) { // 10000ms: 等待 tbody 出現的超時。
                        clearInterval(intervalId);
                        reject(new Error('在 lightning-datatable 內部等待 tbody 超時。'));
                    }
                }, 300); // 300ms: 輪詢間隔。
            });
            Log.info('Feature.CaseList', '表格 tbody 元素已找到，準備處理行數據。');

            // [新增強化] 狀態重置：在處理前，移除所有舊的 "processed" 標記。
            // 這確保了即使在 SPA 導航中 DOM 被重用，也能進行一次全新的掃描。
            const previouslyProcessedRows = tableBody.querySelectorAll('tr[data-cec-processed="true"]');
            if (previouslyProcessedRows.length > 0) {
                previouslyProcessedRows.forEach(row => row.removeAttribute('data-cec-processed'));
                Log.info('Feature.CaseList', `狀態已重置，清除了 ${previouslyProcessedRows.length} 個舊的處理標記。`);
            }

            processCaseListRows(tableBody);
            injectPcaCaseListSortButtons(tableBody);
            Log.info('Feature.CaseList', '首次行數據處理完成。');

            const debouncedProcess = debounce(() => {
                Log.info('Feature.CaseList', '檢測到列表更新，執行處理...');
                processCaseListRows(tableBody);
                injectPcaCaseListSortButtons(tableBody);
            }, 300); // 300ms: 防抖延遲，應對列表快速刷新。

            const observer = new MutationObserver(() => {
                debouncedProcess();
            });

            PageResourceRegistry.addObserver(observer);

            observer.observe(tableBody, {
                childList: true,
                subtree: true,
            });

            Log.info('Feature.CaseList', 'Case 列表頁監控器已成功啟動並持續監控中。');

        } catch (error) {
            Log.warn('Feature.CaseList', `啟動 Case 列表頁監控器失敗: ${error.message}`);
        }
    }


    async function getAndLogTemplateOptions() {
        const BUTTON_ICON_SELECTOR = 'lightning-icon[icon-name="utility:insert_template"]';
        const MENU_ITEM_SELECTOR = 'li.uiMenuItem a[role="menuitem"]';
        const TIMEOUT = 5000; // 5000ms: 等待模板菜單相關元素出現的超時。
        let clickableButton = null;
        try {
            const iconElement = await waitForElementWithObserver(document.body, BUTTON_ICON_SELECTOR, TIMEOUT);
            clickableButton = iconElement.closest('a[role="button"]');
            if (!clickableButton) {
                throw new Error('未能找到 "插入模板" 按鈕的可點擊父級元素。');
            }
            clickableButton.click();
            await waitForAttributeChange(clickableButton, 'aria-expanded', 'true', TIMEOUT);
            const menuId = clickableButton.getAttribute('aria-controls');
            if (!menuId) {
                throw new Error('按鈕已展開，但缺少 aria-controls 屬性，無法定位菜單。');
            }
            const specificMenuSelector = `[id="${menuId}"]`;
            const menuContainer = await waitForElementWithObserver(document.body, specificMenuSelector, TIMEOUT);
            const optionElements = findAllElementsInShadows(menuContainer, MENU_ITEM_SELECTOR);
            if (optionElements.length === 0) {
                return null;
            }
            const templateTitles = optionElements.map(a => a.getAttribute('title'));
            return templateTitles;
        } catch (error) {
            return null;
        } finally {
            if (clickableButton && clickableButton.getAttribute('aria-expanded') === 'true') {
                clickableButton.click();
            }
        }
    }


    async function handleEditorReadyForTemplateButtons() {
        try {
            // 1. 等待編輯器核心加載
            const editorSelector = ".slds-rich-text-editor .tox-tinymce";
            const editor = await waitForElementWithObserver(document.body, editorSelector, 15000);

            // 調整高度
            const desiredHeight = GM_getValue("richTextEditorHeight", DEFAULTS.richTextEditorHeight) + "px";
            if (editor.style.height !== desiredHeight) {
                editor.style.height = desiredHeight;
            }

            // --- [新增] 同步等待 Send 按鈕並綁定攔截器 ---
            // 因為編輯器出來時，Send 按鈕通常也出來了，這裡做一個快速查找
            // 我們使用一個輕量級的 Promise Race 或並行等待，確保不會因為找不到 Send 按鈕而阻塞模版加載
            waitForElementWithObserver(document.body, 'button.slds-button--brand.cuf-publisherShareButton', 5000)
                .then(sendButton => {
                    setupSendButtonListener(sendButton);
                })
                .catch(() => {
                    Log.warn('UI.Enhancement', '模版加載完成，但未找到 Send 按鈕 (可能非 Compose 模式)。');
                });
            // ----------------------------------------------

            // 2. [核心步驟] 獲取最新模板列表 (實時抓取，不緩存)
            const templates = await getAndLogTemplateOptions();

            if (templates && templates.length > 1) {
                const anchorIconSelector = 'lightning-icon[icon-name="utility:new_window"]';
                const anchorIcon = await waitForElementWithObserver(document.body, anchorIconSelector, 5000);
                const anchorLi = anchorIcon.closest('li.cuf-attachmentsItem');
                const toolbarContainer = anchorLi ? anchorLi.parentElement : null;

                if (anchorLi && toolbarContainer) {
                    // 3. [第一次注入]
                    injectTemplateShortcutButtons(anchorLi, templates);

                    // 4. 啟動 Observer 守護按鈕
                    if (!toolbarContainer.dataset.cecObserverAttached) {
                        const observer = new MutationObserver((mutations) => {
                            const myButtons = toolbarContainer.querySelector('.cec-template-shortcut-button');
                            if (!myButtons) {
                                const currentAnchorIcon = toolbarContainer.querySelector(anchorIconSelector);
                                const currentAnchorLi = currentAnchorIcon ? currentAnchorIcon.closest('li.cuf-attachmentsItem') : null;
                                if (currentAnchorLi) {
                                    toolbarContainer.dataset.shortcutsInjected = 'false';
                                    Log.info('UI.Enhancement', '檢測到按鈕丟失，正在重新注入...');
                                    injectTemplateShortcutButtons(currentAnchorLi, templates);
                                }
                            }
                        });

                        PageResourceRegistry.addObserver(observer);
                        observer.observe(toolbarContainer, { childList: true, subtree: true });
                        toolbarContainer.dataset.cecObserverAttached = 'true';
                        toolbarContainer._cecObserver = observer;
                    }
                } else {
                    Log.warn('UI.Enhancement', `未能找到用於注入快捷按鈕的錨點元素。`);
                }
            }
        } catch (error) {
            Log.warn('UI.Enhancement', `初始化模板快捷按鈕時出錯: ${error.message}`);
        }
    }


    async function setupSendButtonListener(sendButton) {
        const doNotCloseEnabled = GM_getValue('pcaDoNotClosePromptEnabled', DEFAULTS.pcaDoNotClosePromptEnabled);
        const listHintEnabled = GM_getValue('pcaCaseListHintEnabled', DEFAULTS.pcaCaseListHintEnabled);
        const repliedEnabled = GM_getValue('notifyOnRepliedCaseEnabled', DEFAULTS.notifyOnRepliedCaseEnabled);
        const followUpEnabled = GM_getValue('followUpPanelEnabled', DEFAULTS.followUpPanelEnabled);

        // 如果所有相關功能都關閉，則不部署
        if (!doNotCloseEnabled && !listHintEnabled && !repliedEnabled && !followUpEnabled) {
            return;
        }

        // 安全檢查：確保傳入的是正確的按鈕
        if (!sendButton) return;
        const buttonLabel = findElementInShadows(sendButton, 'span.label');
        if (!buttonLabel || buttonLabel.textContent.trim() !== 'Send') return;

        // 防止重複綁定
        if (sendButton.dataset.cecSendInterceptBound === 'true') return;
        sendButton.dataset.cecSendInterceptBound = 'true';

        const SEND_BUTTON_CACHE_KEY = CACHE_POLICY.REPLIED.KEY;
        const REPLIED_PURGE_MS = CACHE_POLICY.REPLIED.PURGE_MS;
        const CLAIMS_CACHE_KEY = CACHE_POLICY.CLAIMS_LOST_PKG.KEY;
        const CLAIMS_TTL_MS = CACHE_POLICY.CLAIMS_LOST_PKG.TTL_MS;
        const BILLING_CACHE_KEY = CACHE_POLICY.BILLING_REBILL.KEY;
        const BILLING_TTL_MS = CACHE_POLICY.BILLING_REBILL.TTL_MS;

        // [狀態柵欄標記] 用於跳過跟進面板檢查
        let sendButtonBypassFollowUp = false;

        // --- 緩存寫入：已回覆 ---
        const updateRepliedCache = (caseId) => {
            if (!caseId) return;
            const cache = GM_getValue(SEND_BUTTON_CACHE_KEY, {});
            const purgeResult = purgeExpiredCacheEntries(cache, REPLIED_PURGE_MS);
            if (purgeResult.changed) {
                Log.info('Feature.NotifyReplied', `已清理過期的已回覆 Case 緩存條目（寫入前, removed: ${purgeResult.removed}）。`);
            }
            cache[caseId] = { timestamp: Date.now() };
            GM_setValue(SEND_BUTTON_CACHE_KEY, cache);
        };

        // --- 緩存寫入：A/B ---
        const updateSpecialCache = (caseId, type) => {
            if (!caseId || !type) return;
            const now = Date.now();
            const claimsCache = GM_getValue(CLAIMS_CACHE_KEY, {});
            const billingCache = GM_getValue(BILLING_CACHE_KEY, {});
            const claimsPurgeResult = purgeExpiredCacheEntries(claimsCache, CLAIMS_TTL_MS);
            const billingPurgeResult = purgeExpiredCacheEntries(billingCache, BILLING_TTL_MS);
            let changed = false;

            if (type === 'A') {
                const entry = claimsCache[caseId];
                if (entry && (now - entry.timestamp < CLAIMS_TTL_MS)) { } else {
                    if (billingCache[caseId]) { delete billingCache[caseId]; changed = true; }
                    claimsCache[caseId] = { timestamp: now };
                    changed = true;
                }
            } else if (type === 'B') {
                const entry = billingCache[caseId];
                if (entry && (now - entry.timestamp < BILLING_TTL_MS)) { } else {
                    if (claimsCache[caseId]) { delete claimsCache[caseId]; changed = true; }
                    billingCache[caseId] = { timestamp: now };
                    changed = true;
                }
            }
            if (claimsPurgeResult.changed || changed) GM_setValue(CLAIMS_CACHE_KEY, claimsCache);
            if (billingPurgeResult.changed || changed) GM_setValue(BILLING_CACHE_KEY, billingCache);
        };

        // --- UI 讀取：Case Category / Case Sub Category ---
        const detectSpecialType = () => {
            const categoryButton = findFirstElementInShadows(document.body, ['button[aria-label*="Case Category"]', 'button[title*="Case Category"]']);
            const subCategoryButton = findFirstElementInShadows(document.body, ['button[aria-label*="Case Sub Category"]', 'button[title*="Case Sub Category"]']);
            const category = getSelectedValue(categoryButton);
            const subCategory = getSelectedValue(subCategoryButton);
            const c = (category || '').toLowerCase();
            const s = (subCategory || '').toLowerCase();
            if (c.includes('claims') || s.includes('claim')) return { type: 'A', category, subCategory };
            if (c.includes('bill') || s.includes('bill') || s.includes('rebill')) return { type: 'B', category, subCategory };
            return null;
        };

        // --- 勾選/取消勾選 “Send and Do Not Close” ---
        const ensureSendAndDoNotCloseChecked = () => {
            try {
                const container = findElementInShadows(document.body, '[data-target-selection-name="sfdc:RecordField.EmailMessage.CEC_Send_and_Do_Not_Close__c"]');
                const checkbox = container ? container.querySelector('input[type="checkbox"]') : null;
                if (!checkbox) return;
                if (!checkbox.checked) { checkbox.click(); checkbox.dispatchEvent(new Event('change', { bubbles: true })); }
            } catch (e) { }
        };

        // [元素定位] 功能：`ensureSendAndDoNotCloseUnchecked`。
        const ensureSendAndDoNotCloseUnchecked = () => {
            try {
                const container = findElementInShadows(document.body, '[data-target-selection-name="sfdc:RecordField.EmailMessage.CEC_Send_and_Do_Not_Close__c"]');
                const checkbox = container ? container.querySelector('input[type="checkbox"]') : null;
                if (!checkbox) return;
                if (checkbox.checked) { checkbox.click(); checkbox.dispatchEvent(new Event('change', { bubbles: true })); }
            } catch (e) { }
        };

        // --- 通用攔截彈窗生成器 ---
        const showGenericInterceptDialog = (options) => {
            return new Promise((resolve) => {
                const { accentColor, iconText, title, subtitle, btnNoText, btnYesText } = options;

                const overlay = document.createElement('div');
                overlay.className = 'cec-global-completion-overlay show';
                overlay.style.zIndex = '10002';

                const box = document.createElement('div');
                box.className = 'cec-send-intercept-modal';
                Object.assign(box.style, {
                    width: 'min(860px, calc(100vw - 140px))',
                    boxSizing: 'border-box',
                    padding: '20px 24px 18px',
                    borderRadius: '20px',
                    backgroundColor: '#ffffff',
                    border: '3px solid rgba(206, 230, 248, 1)',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: 'Segoe UI, Microsoft YaHei, PingFang TC, sans-serif'
                });

                const accentBar = document.createElement('div');
                Object.assign(accentBar.style, {
                    position: 'absolute', left: '0', top: '0', bottom: '0', width: '10px',
                    borderTopLeftRadius: '18px', borderBottomLeftRadius: '18px',
                    backgroundColor: accentColor
                });
                box.appendChild(accentBar);

                const closeBtn = document.createElement('div');
                closeBtn.textContent = '×';
                Object.assign(closeBtn.style, {
                    position: 'absolute', right: '14px', top: '10px', cursor: 'pointer',
                    fontSize: '30px', lineHeight: '1', color: '#62666a', padding: '6px'
                });
                box.appendChild(closeBtn);

                const iconCircle = document.createElement('div');
                Object.assign(iconCircle.style, {
                    position: 'absolute', left: '24px', top: '14px', width: '34px', height: '34px',
                    borderRadius: '50%', backgroundColor: accentColor, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: '#ffffff',
                    fontSize: '18px', fontWeight: '800'
                });
                iconCircle.textContent = iconText || '!';
                box.appendChild(iconCircle);

                const messageWrapper = document.createElement('div');
                Object.assign(messageWrapper.style, {
                    flex: '1 1 auto', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                    padding: '32px 16px 20px'
                });

                const line1 = document.createElement('div');
                Object.assign(line1.style, { fontSize: '28px', fontWeight: '800', color: '#1a1a1a', lineHeight: '1.25' });
                line1.textContent = title;

                const line2 = document.createElement('div');
                Object.assign(line2.style, {
                    fontSize: '24px', fontWeight: '800', color: '#1a1a1a', lineHeight: '1.25',
                    marginTop: '10px', whiteSpace: 'nowrap'
                });
                line2.textContent = subtitle;

                messageWrapper.appendChild(line1);
                messageWrapper.appendChild(line2);
                box.appendChild(messageWrapper);

                const btnBar = document.createElement('div');
                Object.assign(btnBar.style, {
                    display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '6px', paddingBottom: '6px'
                });

                // [事件監聽] 功能：`createBtn`。
                const createBtn = (text, isPrimary) => {
                    const btn = document.createElement('button');
                    btn.className = isPrimary ? 'slds-button slds-button_brand' : 'slds-button slds-button_neutral';
                    btn.textContent = text;
                    Object.assign(btn.style, {
                        minWidth: '200px', height: '54px', borderRadius: '12px',
                        fontFamily: 'Segoe UI, Microsoft YaHei, PingFang TC, sans-serif', fontWeight: '700'
                    });
                    if (isPrimary) {
                        btn.style.backgroundColor = accentColor;
                        btn.style.borderColor = accentColor;
                        if (accentColor.toLowerCase() === '#00ff11') {
                            btn.style.color = '#000000';
                        }
                    }
                    return btn;
                };

                const btnNo = createBtn(btnNoText, false);
                const btnYes = createBtn(btnYesText, true);

                // [事件監聽] 功能：`onKeyDown`。
                const onKeyDown = (e) => { if (e.key === 'Escape') { cleanup(); resolve(null); } };
                // [事件監聽] 功能：`cleanup`。
                const cleanup = () => {
                    try { document.removeEventListener('keydown', onKeyDown); } catch (e) {}
                    try { overlay.remove(); } catch (e) {}
                };

                btnNo.addEventListener('click', () => { cleanup(); resolve('NO'); });
                btnYes.addEventListener('click', () => { cleanup(); resolve('YES'); });
                closeBtn.addEventListener('click', () => { cleanup(); resolve(null); });
                overlay.addEventListener('click', (e) => { if (e.target === overlay) { cleanup(); resolve(null); } });
                document.addEventListener('keydown', onKeyDown);

                btnBar.appendChild(btnNo);
                btnBar.appendChild(btnYes);
                box.appendChild(btnBar);
                overlay.appendChild(box);
                document.body.appendChild(overlay);
            });
        };

        sendButton.addEventListener('click', async (event) => {
            // =========================================================
            // 第一優先級：全局放行邏輯 (Global Bypass)
            // =========================================================
            // 這是由【攔截器2：開查/預付】觸發的最終點擊，必須擁有最高優先級。
            // 只要此標誌為 true，直接無視所有其他攔截器，執行發送並記錄緩存。
            if (sendButtonBypassNextClick) {
                sendButtonBypassNextClick = false;
                sendButtonBypassFollowUp = false; // 徹底重置狀態，防止污染下一次手動點擊

                const caseId = getCaseIdFromUrl(location.href);
                if (caseId) {
                    const shouldSkipRepliedCache = (listHintEnabled && !!sendButtonPendingSpecialType);
                    if (repliedEnabled && !shouldSkipRepliedCache) updateRepliedCache(caseId);
                    if (listHintEnabled && sendButtonPendingSpecialType) updateSpecialCache(caseId, sendButtonPendingSpecialType);
                }
                sendButtonPendingSpecialType = null;
                return; // 允許原生點擊事件繼續傳播 -> 發送郵件
            }

            // =========================================================
            // 第二優先級：跟進面板攔截器 (Follow-Up Panel Intercept)
            // =========================================================
            // 只有在【沒有】被本攔截器放行過的情況下才執行檢查
            if (!sendButtonBypassFollowUp && followUpEnabled && FollowUpPanel && FollowUpPanel.getMatchState) {
                const matchState = FollowUpPanel.getMatchState();
                if (matchState.isMatched) {
                    event.preventDefault();
                    event.stopImmediatePropagation();

                    let dialogAccentColor = '#0070d2';
                    let dialogTitle = '這是【跟進中】的 Case';

                    if (matchState.matchType === 'case') {
                        dialogAccentColor = '#00ff11';
                        dialogTitle = '這 Case# 在跟進列表中';
                    } else if (matchState.matchType === 'tracking') {
                        dialogAccentColor = '#ff9900';
                        dialogTitle = '這 追蹤號 在跟進列表中';
                    }

                    const userChoice = await showGenericInterceptDialog({
                        accentColor: dialogAccentColor,
                        iconText: '!',
                        title: dialogTitle,
                        subtitle: '是否需要刪除跟進列表中記錄？',
                        btnNoText: '保留記錄',
                        btnYesText: '刪除記錄'
                    });

                    if (!userChoice) {
                         return; // 用戶關閉了窗口，終止操作
                    }

                    if (userChoice === 'YES') {
                        if (matchState.matchedRecordId) {
                            FollowUpPanel.deleteItem(matchState.matchedRecordId);
                            Log.info('Feature.SendIntercept', `用戶選擇刪除跟進記錄 (ID: ${matchState.matchedRecordId})`);
                        }
                    } else {
                        Log.info('Feature.SendIntercept', `用戶選擇保留跟進記錄`);
                    }

                    // 設置放行標誌，觸發第二次點擊（程序點擊）
                    sendButtonBypassFollowUp = true;
                    setTimeout(() => { try { sendButton.click(); } catch (e) {} }, 0);
                    return;
                }
            }

            // =========================================================
            // 狀態過渡清理 (State Transition)
            // =========================================================
            // 如果程序運行到這裡，說明：
            // 1. 要麼是第一次點擊且沒有命中跟進面板。
            // 2. 要麼是第二次點擊（已經過了跟進面板的攔截）。
            // 無論哪種情況，我們都已經「消費」了跟進面板的放行資格，
            // 必須立即重置該標誌，確保下一次手動點擊時（如果本次流程被取消）能重新觸發檢查。
            if (sendButtonBypassFollowUp) {
                sendButtonBypassFollowUp = false;
            }

            // =========================================================
            // 第三優先級：開查/預付攔截器 (Claims/Billing Intercept)
            // =========================================================
            const special = detectSpecialType();

            // 如果不是特殊類型，說明沒有攔截需求，記錄普通回覆緩存後直接放行
            if (!special) {
                const caseId = getCaseIdFromUrl(location.href);
                if (caseId && repliedEnabled) updateRepliedCache(caseId);
                return;
            }

            // 如果命中特殊類型，且功能開啟
            if (doNotCloseEnabled || listHintEnabled) {
                event.preventDefault();
                event.stopImmediatePropagation();

                const typeLabel = (special.type === 'A') ? '開查' : '預付';
                if (doNotCloseEnabled) {
                    const userChoice = await showGenericInterceptDialog({
                        accentColor: (special.type === 'A') ? '#2e844a' : '#0070d2',
                        iconText: '!',
                        title: `這是【${typeLabel}】Case`,
                        subtitle: '是否需要勾選“Send and Do Not Close”',
                        btnNoText: '否（直接發送）',
                        btnYesText: '是（勾選後發送）'
                    });

                    if (!userChoice) return; // 用戶關閉窗口
                    if (userChoice === 'YES') ensureSendAndDoNotCloseChecked();
                    else if (userChoice === 'NO') ensureSendAndDoNotCloseUnchecked();
                }

                // 設置最終放行標誌，觸發第三次點擊（程序點擊）
                sendButtonPendingSpecialType = special.type;
                sendButtonBypassNextClick = true;
                setTimeout(() => { try { sendButton.click(); } catch (e) {} }, 0);
                return;
            }

        }, true);

        Log.info('Feature.NotifyReplied', `"Send" 按鈕監聽器已成功部署 (集成跟進面板攔截)。`);
    }


        async function clickTemplateOptionByTitle(templateTitle, buttonText) {
            // [DOM 觀察 / 定時/防抖 / 元素定位] 功能：`delay`。
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            const logPrefix = 'UI.Enhancement';

            // [設定/狀態持久化 / DOM 觀察 / 定時/防抖 / 元素定位] 功能：`safeQuery`。
            const safeQuery = (root, selector) => {
                try { return root.querySelector(selector); } catch (e) { return null; }
            };

            // [設定/狀態持久化 / DOM 觀察 / 定時/防抖] 功能：`waitForContentChange`。
            const waitForContentChange = (iframe, timeout) => {
                return new Promise((resolve) => {
                    const observer = new MutationObserver((mutations) => {
                        if (mutations.some(m => (m.type === 'childList' && m.addedNodes.length > 0) || m.type === 'characterData')) {
                            observer.disconnect();
                            resolve(true);
                        }
                    });
                    if (iframe.contentDocument && iframe.contentDocument.body) {
                        observer.observe(iframe.contentDocument.body, { childList: true, subtree: true, characterData: true });
                    }
                    setTimeout(() => { observer.disconnect(); resolve(false); }, timeout);
                });
            };

            const BUTTON_ICON_SELECTOR = 'lightning-icon[icon-name="utility:insert_template"]';
            const MENU_ITEM_SELECTOR = `li.uiMenuItem a[role="menuitem"][title="${templateTitle}"]`;
            const EDITOR_IFRAME_SELECTOR = 'iframe.tox-edit-area__iframe';
            const TIMEOUT = 5000;

            let clickableButton = null;

            try {
                const iframe = await waitForElementWithObserver(document.body, EDITOR_IFRAME_SELECTOR, TIMEOUT);
                if (!iframe || !iframe.contentDocument) {
                    Log.warn(logPrefix, '找不到編輯器 iframe，流程中止。');
                    return;
                }

                const iframeWindow = iframe.contentWindow;
                const iframeDocument = iframe.contentDocument;
                const editorBody = iframeDocument.body;

                // 1. 設置轉換模式標記 (雙重存儲：DOM + Window)
                let conversionMode = 'off';
                if (buttonText) {
                    if (buttonText.includes('繁')) conversionMode = 's2t';
                    else if (buttonText.includes('簡') || buttonText.includes('简')) conversionMode = 't2s';
                }

                editorBody.dataset.cecConversionMode = conversionMode;
                // [關鍵] 將模式存入 Window 對象，使其在 Ctrl+Z 時倖存
                iframeWindow.cecMode = conversionMode;

                const insertionMode = GM_getValue('templateInsertionMode', DEFAULTS.templateInsertionMode);

                // 2. 光標預定位 ( 頂層遍歷鎖定)
                if (insertionMode === 'logo') {
                    iframeWindow.focus();
                    const range = iframeDocument.createRange();

                    let logoTable = null;
                    const children = Array.from(editorBody.children);
                    for (const child of children) {
                        if (child.tagName === 'TABLE' && (child.classList.contains('mce-item-table') || child.querySelector('img[src*="ups-shield.png"]'))) {
                            logoTable = child;
                            break;
                        }
                    }
                    if (!logoTable) logoTable = safeQuery(editorBody, 'table.mce-item-table');

                    let targetContainer = null;

                    if (logoTable) {
                        // [元素定位] 功能：`isOccupied`。
                        const isOccupied = (node) => {
                            if (!node || node.nodeType !== 1) return false;
                            if (node.textContent.trim() !== '') return true;
                            if (node.hasAttribute('style')) return true;
                            if (['HR', 'BLOCKQUOTE', 'TABLE'].includes(node.tagName)) return true;
                            return false;
                        };

                        let spacerDiv = logoTable.nextElementSibling;
                        if (!spacerDiv || spacerDiv.tagName !== 'DIV' || isOccupied(spacerDiv) || spacerDiv.querySelectorAll('br').length < 2) {
                            const newSpacer = iframeDocument.createElement('div');
                            newSpacer.innerHTML = '<br><br><br><br>';
                            if (spacerDiv) editorBody.insertBefore(newSpacer, spacerDiv);
                            else editorBody.appendChild(newSpacer);
                            spacerDiv = newSpacer;
                        }

                        let bogus1 = spacerDiv.nextElementSibling;
                        if (!bogus1 || bogus1.tagName !== 'DIV' || isOccupied(bogus1)) {
                            const newBogus1 = iframeDocument.createElement('div');
                            newBogus1.innerHTML = '<br data-mce-bogus="1">';
                            if (bogus1) editorBody.insertBefore(newBogus1, bogus1);
                            else editorBody.appendChild(newBogus1);
                            bogus1 = newBogus1;
                        }

                        let targetP = bogus1.nextElementSibling;
                        if (!targetP || targetP.tagName !== 'P' || isOccupied(targetP)) {
                            const newP = iframeDocument.createElement('p');
                            newP.innerHTML = '<br>';
                            if (targetP) editorBody.insertBefore(newP, targetP);
                            else editorBody.appendChild(newP);
                            targetP = newP;
                        }

                        targetP.removeAttribute('style');
                        targetP.removeAttribute('class');
                        targetP.removeAttribute('data-mce-bogus');
                        targetP.innerHTML = '<br>';

                        targetContainer = targetP;
                    } else {
                        const newP = iframeDocument.createElement('p');
                        newP.innerHTML = '<br>';
                        editorBody.prepend(newP);
                        targetContainer = newP;
                    }

                    if (targetContainer) {
                        range.selectNodeContents(targetContainer);
                        range.collapse(true);
                        const sel = iframeWindow.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(range);
                        targetContainer.scrollIntoView({ behavior: 'auto', block: 'center' });

                        try {
                            const win = iframeWindow;
                            targetContainer.dispatchEvent(new MouseEvent('mousedown', { view: win, bubbles: true, cancelable: true }));
                            targetContainer.dispatchEvent(new MouseEvent('mouseup', { view: win, bubbles: true, cancelable: true }));
                        } catch (e) {}
                    }
                    iframeWindow.focus();
                }


                // 3. 執行插入 (Mutation Tracking)
                const iconElement = await waitForElementWithObserver(document.body, BUTTON_ICON_SELECTOR, TIMEOUT);
                clickableButton = iconElement.closest('a[role="button"]');
                if (clickableButton.getAttribute('aria-expanded') !== 'true') {
                    clickableButton.click();
                    await waitForAttributeChange(clickableButton, 'aria-expanded', 'true', TIMEOUT);
                }

                const menuId = clickableButton.getAttribute('aria-controls');
                const menuContainer = await waitForElementWithObserver(document.body, `[id="${menuId}"]`, TIMEOUT);
                const targetOption = findElementInShadows(menuContainer, MENU_ITEM_SELECTOR);

                if (targetOption) {
                    const changePromise = waitForContentChange(iframe, 5000);
                    targetOption.click();
                    const addedNodes = await changePromise;

                    // 4. Post Insertion (僅處理新增節點)
                    if (GM_getValue('postInsertionEnhancementsEnabled', DEFAULTS.postInsertionEnhancementsEnabled) && addedNodes) {
                        // [樣式同步 & 轉換]：只針對 addedNodes (新插入的模版) 進行
                        if (conversionMode !== 'off') {
                            try {
                                addedNodes.forEach(node => {
                                    const walker = iframeDocument.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
                                    let textNode;
                                    while(textNode = walker.nextNode()) {
                                        const originalText = textNode.nodeValue;
                                        const convertedText = ChineseConverter.convert(originalText, conversionMode);
                                        if (originalText !== convertedText) {
                                            textNode.nodeValue = convertedText;
                                        }
                                    }
                                    // 處理頂層文本節點
                                    if (node.nodeType === 3) {
                                        const originalText = node.nodeValue;
                                        const convertedText = ChineseConverter.convert(originalText, conversionMode);
                                        if (originalText !== convertedText) node.nodeValue = convertedText;
                                    }
                                });
                            } catch (e) { }
                        }

                        // 光標跳轉 (重新掃描物理路徑)
                        let currentLogo = null;
                        const children = Array.from(editorBody.children);
                        for (const child of children) {
                            if (child.tagName === 'TABLE' && (child.classList.contains('mce-item-table') || child.querySelector('img[src*="ups-shield.png"]'))) {
                                currentLogo = child;
                                break;
                            }
                        }
                        if (!currentLogo) currentLogo = safeQuery(editorBody, 'table.mce-item-table');

                        let finalContainer = null;
                        if (currentLogo) {
                            const el1 = currentLogo.nextElementSibling;
                            const el2 = el1 ? el1.nextElementSibling : null;
                            const el3 = el2 ? el2.nextElementSibling : null;
                            finalContainer = el3;
                        } else {
                            finalContainer = editorBody.lastElementChild;
                        }

                        if (finalContainer) {
                            const allBrTags = [];
                            let brScanNode = finalContainer;
                            let siblingsLimit = 10;
                            while (brScanNode && siblingsLimit > 0) {
                                const brs = brScanNode.querySelectorAll('br');
                                allBrTags.push(...brs);
                                if (brScanNode.tagName === 'BR') allBrTags.push(brScanNode);
                                brScanNode = brScanNode.nextElementSibling;
                                siblingsLimit--;
                            }

                            const userBrPosition = GM_getValue('cursorPositionBrIndex', DEFAULTS.cursorPositionBrIndex);
                            const brIndex = userBrPosition - 1;

                            if (allBrTags.length > brIndex && brIndex >= 0) {
                                const targetPositionNode = allBrTags[brIndex];
                                const range = iframeDocument.createRange();
                                range.setStartBefore(targetPositionNode);
                                range.collapse(true);
                                iframeWindow.getSelection().removeAllRanges();
                                iframeWindow.getSelection().addRange(range);
                                targetPositionNode.scrollIntoView({ behavior: 'auto', block: 'center' });
                            }
                        }

                        // 綁定全局事件 (傳遞 iframeWindow 以便內部綁定狀態)
                        if (!editorBody.dataset.cecGlobalHandlersAttached) {
                            setupGlobalEnhancements(iframeWindow, iframeDocument, editorBody);
                        }
                        editorBody.dataset.cecConversionMode = conversionMode;
                        // [關鍵] 再次確認狀態同步
                        iframeWindow.cecMode = conversionMode;
                    }
                    iframeWindow.focus();
                } else {
                    Log.warn(logPrefix, `未找到菜單選項 "${templateTitle}"`);
                }

            } catch (error) {
                Log.warn(logPrefix, `模版操作警告: ${error.message}`);
                if (clickableButton && clickableButton.getAttribute('aria-expanded') === 'true') clickableButton.click();
            }
        }


        // [事件監聽] 功能：`setupGlobalEnhancements`。
        function setupGlobalEnhancements(iframeWindow, iframeDocument, editorBody) {
             if (editorBody.dataset.cecGlobalHandlersAttached) return;

             // [事件監聽] 功能：`isCursorInTemplate`。
             const isCursorInTemplate = () => true;

             // 初始化真理之源 (Source of Truth)
             // 如果 Window 上沒有記錄，嘗試從 DOM 讀取，默認為 off
             if (!iframeWindow.cecMode) {
                 iframeWindow.cecMode = editorBody.dataset.cecConversionMode || 'off';
             }

             // A. 粘貼攔截器 (Paste Interceptor)
             editorBody.addEventListener('paste', (event) => {
                if (isCursorInTemplate()) {
                    const clipboardData = event.clipboardData || iframeWindow.clipboardData;
                    const items = clipboardData.items;

                    // 1. [優先] 圖片保護
                    let hasImage = false;
                    for (let i = 0; i < items.length; i++) {
                        if (items[i].type.indexOf("image") !== -1) {
                            hasImage = true;
                            break;
                        }
                    }
                    if (hasImage) return;

                    // 2. [嚴格] Excel/表格數據保護
                    const htmlData = clipboardData.getData('text/html');
                    if (htmlData && htmlData.indexOf('<table') !== -1) {
                        return;
                    }

                    // 3. 強制攔截
                    event.preventDefault();
                    event.stopPropagation();

                    const textToPaste = clipboardData.getData('text/plain');

                    // [關鍵修復] 從 Window 對象讀取模式，無視 DOM 是否被撤銷
                    const currentMode = iframeWindow.cecMode;

                    const finalPasteText = (currentMode && currentMode !== 'off')
                        ? ChineseConverter.convert(textToPaste, currentMode)
                        : textToPaste;

                    const selection = iframeWindow.getSelection();
                    if (!selection.rangeCount) return;
                    const range = selection.getRangeAt(0);
                    range.deleteContents();

                    const fragment = iframeDocument.createDocumentFragment();
                    const lines = finalPasteText.split('\n');
                    lines.forEach((line, index) => {
                        fragment.appendChild(iframeDocument.createTextNode(line));
                        if (index < lines.length - 1) fragment.appendChild(iframeDocument.createElement('br'));
                    });

                    range.insertNode(fragment);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }, true);

            // B. Enter 鍵攔截器
            editorBody.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    if (isCursorInTemplate()) {
                        event.preventDefault();
                        event.stopPropagation();
                        const selection = iframeWindow.getSelection();
                        const range = selection.getRangeAt(0);
                        range.deleteContents();
                        const br = iframeDocument.createElement('br');
                        range.insertNode(br);
                        range.setStartAfter(br);
                        range.setEndAfter(br);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        br.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }
            }, true);

            // C. 實時轉換與狀態守護監聽器 (State Guardian)
            const processQueue = new Set();
            let isProcessing = false;

            // [DOM 觀察] 功能：`processMutations`。
            const processMutations = () => {
                isProcessing = false;
                const mode = iframeWindow.cecMode; // 始終讀取真理之源
                if (!mode || mode === 'off' || processQueue.size === 0) {
                    processQueue.clear();
                    return;
                }
                processQueue.forEach(textNode => {
                    if (!textNode.isConnected) return;
                    const original = textNode.nodeValue;
                    const converted = ChineseConverter.convert(original, mode);
                    if (original === converted) return;
                    const selection = iframeWindow.getSelection();
                    let savedOffset = null;
                    if (selection.rangeCount > 0 && selection.anchorNode === textNode) {
                        savedOffset = selection.anchorOffset;
                    }
                    textNode.nodeValue = converted;
                    if (savedOffset !== null) {
                        const newRange = iframeDocument.createRange();
                        const safeOffset = Math.min(savedOffset, converted.length);
                        newRange.setStart(textNode, safeOffset);
                        newRange.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                    }
                });
                processQueue.clear();
            };

            // [DOM 觀察] 功能：`scheduleProcessing`。
            const scheduleProcessing = () => {
                if (!isProcessing) {
                    isProcessing = true;
                    requestAnimationFrame(processMutations);
                }
            };

            const globalObserver = new MutationObserver((mutations) => {
                const mode = iframeWindow.cecMode;

                let hasWork = false;
                for (const mutation of mutations) {
                    // [核心修復] 狀態守護：檢測 DOM 屬性是否與內部狀態不一致 (例如 Ctrl+Z 導致屬性丟失)
                    if (mutation.type === 'attributes' && mutation.attributeName === 'data-cec-conversion-mode') {
                        const currentDomMode = editorBody.dataset.cecConversionMode;
                        // 如果 DOM 狀態與 JS 狀態不符 (且 JS 狀態不是 off)，強制恢復 DOM 狀態
                        // 這確保了 CSS 樣式和 dataset 始終正確
                        if (mode && mode !== 'off' && currentDomMode !== mode) {
                            editorBody.dataset.cecConversionMode = mode;
                        }
                    }

                    if (!mode || mode === 'off') continue;

                    if (mutation.type === 'characterData') {
                        const node = mutation.target;
                        if (node.nodeType === 3) {
                            const text = node.nodeValue;
                            if (text !== ChineseConverter.convert(text, mode)) {
                                processQueue.add(node);
                                hasWork = true;
                            }
                        }
                    } else if (mutation.type === 'childList') {
                        if (mutation.addedNodes.length > 0) {
                            mutation.addedNodes.forEach(addedNode => {
                                if (addedNode.nodeType === 3) {
                                    const text = addedNode.nodeValue;
                                    if (text !== ChineseConverter.convert(text, mode)) {
                                        processQueue.add(addedNode);
                                        hasWork = true;
                                    }
                                } else if (addedNode.nodeType === 1) {
                                    const walker = iframeDocument.createTreeWalker(addedNode, NodeFilter.SHOW_TEXT, null, false);
                                    let subNode;
                                    while(subNode = walker.nextNode()) {
                                        const text = subNode.nodeValue;
                                        if (text !== ChineseConverter.convert(text, mode)) {
                                            processQueue.add(subNode);
                                            hasWork = true;
                                        }
                                    }
                                }
                            });
                        }
                    }
                }
                if (hasWork) scheduleProcessing();
            });

            // 監聽屬性變化以守護狀態
            PageResourceRegistry.addObserver(globalObserver);
            globalObserver.observe(editorBody, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['data-cec-conversion-mode'] });

            editorBody.dataset.cecGlobalHandlersAttached = 'true';
        }



    // 功能：`injectTemplateShortcutButtons`。
    function injectTemplateShortcutButtons(anchorLiElement, templates) {
        const BOTTOM_OFFSET_PIXELS = 50;

        const parentList = anchorLiElement.parentElement;
        if (!parentList || parentList.dataset.shortcutsInjected === 'true') {
            return;
        }

        parentList.style.display = 'flex';
        parentList.style.flexWrap = 'nowrap';
        parentList.style.height = 'auto';
        parentList.style.alignItems = 'center';

        anchorLiElement.style.borderRight = '1px solid #dddbda';
        anchorLiElement.style.paddingRight = '0px';

        const templatesToShow = templates.slice(1, 6);

        // --- 0. 建立內層容器，令換行後每行起點對齊「最左模板按鈕」 ---
        const shortcutWrapperLi = document.createElement('li');
        Object.assign(shortcutWrapperLi.style, {
            listStyle: 'none',
            padding: '0',
            margin: '0',
            flex: '1 1 auto',
            minWidth: '0'
        });

        const shortcutFlex = document.createElement('div');
        Object.assign(shortcutFlex.style, {
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            paddingLeft: '12px',
            columnGap: '5px',
            rowGap: '4px',
            minWidth: '0'
        });

        shortcutWrapperLi.appendChild(shortcutFlex);
        parentList.insertBefore(shortcutWrapperLi, anchorLiElement.nextSibling);

        // --- 1. 注入 5 個模板快捷按鈕 ---
        templatesToShow.reverse().forEach((templateTitle, index) => {
            const newLi = anchorLiElement.cloneNode(true);
            newLi.style.borderRight = 'none';
            newLi.style.paddingRight = '0';
            newLi.style.marginTop = '2px';
            newLi.style.marginBottom = '2px';

            const button = newLi.querySelector('button');
            button.classList.add('cec-template-shortcut-button');
            button.innerHTML = '';
            const buttonText = templateTitle.substring(0, 10);
            button.textContent = buttonText;
            button.title = `Insert Template: ${templateTitle}`;

            Object.assign(button.style, {
                marginLeft: '0px',
                width: '100px',
                height: '25px',
                padding: '0 8px',
                fontSize: '13px',
                backgroundColor: '#0070d2',
                color: '#ffffff',
                border: '1px solid #0070d2',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                borderRadius: '0px'
            });

            button.addEventListener('click', () => {
                clickTemplateOptionByTitle(templateTitle, buttonText);
            });

            shortcutFlex.insertBefore(newLi, shortcutFlex.firstChild);
        });

        // --- 2. 注入 [繁] [簡] 手動轉換按鈕 ---
        const handleManualConvert = (targetMode) => {
            const iframe = findElementInShadows(document.body, 'iframe.tox-edit-area__iframe');
            if (!iframe || !iframe.contentDocument) return;

            const win = iframe.contentWindow;
            const doc = iframe.contentDocument;
            const editorBody = doc.body;

            const selection = win.getSelection();
            const hasSelection = selection.rangeCount > 0 && !selection.isCollapsed;

            // 獲取當前的全局轉換模式 (從 DOM 或 Window)
            const currentGlobalMode = win.cecMode || editorBody.dataset.cecConversionMode;

            if (hasSelection) {
                // 如果當前有全局模式，且與目標模式不一致，則視為衝突，關閉全局模式
                if (currentGlobalMode && currentGlobalMode !== 'off' && currentGlobalMode !== targetMode) {
                    editorBody.dataset.cecConversionMode = 'off';
                    win.cecMode = 'off'; // 同步更新真理
                    Log.info('Converter', `手動模式(${targetMode})與全局模式(${currentGlobalMode})衝突，已關閉全局自動轉換。`);
                } else {
                    // 即使模式一致，也強制重新賦值，確保狀態被 DOM 正確記錄
                    editorBody.dataset.cecConversionMode = targetMode;
                    win.cecMode = targetMode; // 同步更新真理
                    Log.info('Converter', `手動模式(${targetMode})與全局模式一致，全局自動轉換確認開啟。`);
                }

                const range = selection.getRangeAt(0);
                const fragment = range.extractContents();

                let firstNode = fragment.firstChild;
                let lastNode = fragment.lastChild;

                // [事件監聽 / 元素定位] 功能：`processNode`。
                const processNode = (node) => {
                    if (node.nodeType === 3) {
                        node.nodeValue = ChineseConverter.convert(node.nodeValue, targetMode);
                    } else if (node.childNodes) {
                        node.childNodes.forEach(processNode);
                    }
                };
                processNode(fragment);

                range.insertNode(fragment);

                if (firstNode && lastNode) {
                    const newRange = doc.createRange();
                    newRange.setStartBefore(firstNode);
                    newRange.setEndAfter(lastNode);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                }
            } else {
                // 如果沒有選中文字，則直接切換全局模式
                editorBody.dataset.cecConversionMode = targetMode;
                win.cecMode = targetMode; // 同步更新真理
                Log.info('Converter', `未選中文字，已切換全局轉換模式為 ${targetMode}。`);
            }
        };

        // [事件監聽 / 定時/防抖 / 元素定位] 功能：`createConvertButton`。
        const createConvertButton = (text, mode) => {
            const li = anchorLiElement.cloneNode(true);
            li.style.borderRight = 'none';
            li.style.paddingRight = '0';
            li.style.marginTop = '2px';
            li.style.marginBottom = '2px';

            const btn = li.querySelector('button');
            btn.textContent = text;
            btn.title = `將選中文字轉換為${text}，並設置全局模式`;

            Object.assign(btn.style, {
                marginLeft: '0px',
                width: '45px',
                height: '25px',
                padding: '0',
                fontSize: '13px',
                backgroundColor: '#2e844a',
                color: '#ffffff',
                border: '1px solid #2e844a',
                borderRadius: '0px'
            });

            btn.addEventListener('mousedown', (e) => {
                e.preventDefault(); // 防止失去焦點
                handleManualConvert(mode);
            });

            return li;
        };

        const btnS2T = createConvertButton('轉繁', 's2t');
        const btnT2S = createConvertButton('轉簡', 't2s');

        shortcutFlex.appendChild(btnS2T);
        shortcutFlex.appendChild(btnT2S);

        parentList.dataset.shortcutsInjected = 'true';
        Log.info('UI.Enhancement', `模板快捷按鈕及 [繁][簡] 按鈕注入成功。`);

        setTimeout(() => repositionComposerToBottom(BOTTOM_OFFSET_PIXELS), 100);
    }



    // [元素定位] 功能：`repositionComposerToBottom`。
    function repositionComposerToBottom(offset = 0) {
        const composerContainer = findElementInShadows(document.body, 'flexipage-component2[data-component-id="flexipage_tabset7"]');

        if (composerContainer && composerContainer.dataset.cecScrolled !== 'true') {
            try {
                composerContainer.scrollIntoView({
                    block: 'end',
                    inline: 'nearest'
                });

                if (offset !== 0) {
                    window.scrollBy(0, offset);
                }

                composerContainer.dataset.cecScrolled = 'true';
                Log.info('UI.Enhancement', `回覆郵件框架已滾動至窗口底部 (額外偏移量: ${offset}px)。`);
            } catch (error) {
                Log.error('UI.Enhancement', `嘗試滾動郵件框架時出錯: ${error.message}`);
            }
        }
    }


    // 功能：`extractCaseNumberFromHeader`。
    function extractCaseNumberFromHeader() {
        // 如果已經提取過，直接返回 true (任務完成)
        if (foundCaseNumber) return true;

        const caseId = getCaseIdFromUrl(location.href);
        if (!caseId) return true; // 非 Case 頁面，視為完成

        const selectors = [
            'records-formula-output[slot="primaryField"] lightning-formatted-text',
            'div.primaryFieldRow lightning-formatted-text',
            'h1.slds-page-header__title lightning-formatted-text',
            'slot[name="primaryField"] lightning-formatted-text'
        ];

        // 策略 A: 嘗試從 DOM 提取
        const el = findFirstElementInShadows(document.body, selectors);

        if (el && el.textContent) {
            const match = el.textContent.match(/C-\d{10}/i);
            if (match) {
                foundCaseNumber = match[0].toUpperCase();
                Log.info('Feature.Extractor', `從 DOM 成功提取 Case 號碼: ${foundCaseNumber}`);

                // [寫入緩存]
                const cachedData = CASE_DATA_CACHE.get(caseId) || {};
                cachedData.caseNo = foundCaseNumber;
                CASE_DATA_CACHE.set(caseId, cachedData);

                if (typeof FollowUpPanel !== 'undefined' && FollowUpPanel.refresh) {
                    FollowUpPanel.refresh();
                }
                return true;
            }
        }

        // 策略 B: [新增保底] 嘗試從瀏覽器標題提取
        if (document.title) {
            const titleMatch = document.title.match(/C-\d{10}/i);
            if (titleMatch) {
                foundCaseNumber = titleMatch[0].toUpperCase();
                Log.info('Feature.Extractor', `從 Document Title 提取 Case 號碼: ${foundCaseNumber}`);

                // [寫入緩存]
                const cachedData = CASE_DATA_CACHE.get(caseId) || {};
                cachedData.caseNo = foundCaseNumber;
                CASE_DATA_CACHE.set(caseId, cachedData);

                if (typeof FollowUpPanel !== 'undefined' && FollowUpPanel.refresh) {
                    FollowUpPanel.refresh();
                }
                return true;
            }
        }

        return false;
    }


    async function extractTrackingNumberAndTriggerIVP() {
        const TRACKING_CACHE_KEY = CACHE_POLICY.TRACKING.KEY;
        const CACHE_TTL_MS = CACHE_POLICY.TRACKING.TTL_MS;
        const caseId = getCaseIdFromUrl(location.href);

        if (!caseId) return true;

        // 輔助函數：統一處理成功邏輯
        const handleSuccess = (trackingNo) => {
            foundTrackingNumber = trackingNo;

            // [寫入內存緩存]
            const cachedData = CASE_DATA_CACHE.get(caseId) || {};
            cachedData.trackingNo = trackingNo;
            CASE_DATA_CACHE.set(caseId, cachedData);

            if (typeof FollowUpPanel !== 'undefined' && FollowUpPanel.refresh) {
                FollowUpPanel.refresh();
            }
            triggerAutoQueries();
        };

        const cache = GM_getValue(TRACKING_CACHE_KEY, {});
        const purgeResult = purgeExpiredCacheEntries(cache, CACHE_TTL_MS);
        if (purgeResult.changed) {
            GM_setValue(TRACKING_CACHE_KEY, purgeResult.cache);
        }

        const entry = cache[caseId];

        // [設定/狀態持久化 / 定時/防抖] 功能：`triggerAutoQueries`。
        const triggerAutoQueries = async () => {
            await autoQueryWebOnLoad();
            await autoQueryIVPOnLoad();

            if (GM_getValue('autoIVPQueryEnabled', DEFAULTS.autoIVPQueryEnabled) &&
                GM_getValue('autoSwitchEnabled', DEFAULTS.autoSwitchEnabled) &&
                GM_getValue('autoWebQueryEnabled', DEFAULTS.autoWebQueryEnabled) &&
                ivpWindowHandle && !ivpWindowHandle.closed) {

                if (ivpFocusTimeoutId) {
                    clearTimeout(ivpFocusTimeoutId);
                    ivpFocusTimeoutId = null;
                }
                ivpFocusTimeoutId = setTimeout(() => {
                    try {
                        if (ivpWindowHandle && !ivpWindowHandle.closed) ivpWindowHandle.focus();
                    } catch (e) {} finally { ivpFocusTimeoutId = null; }
                }, 1200);
            }
        };

        // 1. 檢查 GM 緩存
        if (entry && (Date.now() - entry.timestamp < CACHE_TTL_MS)) {
            handleSuccess(entry.trackingNumber);
            return true;
        }

        // 2. 檢查 DOM
        const trackingRegex = /(1Z[A-Z0-9]{16})/;
        const candidates = [
            'td[data-label="IDENTIFIER VALUE"] a',
            'a[href*="/lightning/r/Shipment_Identifier"]',
            'lightning-formatted-text[title^="1Z"]'
        ];

        const element = findFirstElementInShadows(document.body, candidates);

        if (element && element.textContent) {
            const match = element.textContent.trim().match(trackingRegex);
            if (match) {
                const extractedNumber = match[0];
                Log.info('Feature.Query', `成功提取追踪號: ${extractedNumber}`);

                cache[caseId] = {
                    trackingNumber: extractedNumber,
                    timestamp: Date.now()
                };
                GM_setValue(TRACKING_CACHE_KEY, cache);

                handleSuccess(extractedNumber);
                return true;
            }
        }

        return false;
    }


    // [DOM 觀察 / 定時/防抖 / 元素定位] 功能：`initIWantToModuleWatcher`。
    function initIWantToModuleWatcher() {
        const ANCHOR_SELECTOR = 'c-cec-i-want-to-container lightning-layout.slds-var-p-bottom_small';

        // [DOM 觀察 / 定時/防抖 / 元素定位] 功能：`checkAndReInject`。
        const checkAndReInject = () => {
            if (isScriptPaused) return;
            const anchorElement = findElementInShadows(document.body, ANCHOR_SELECTOR);
            // 這裡直接調用 injectIWantToButtons，因為該函數內部已經具備了「存在性檢查」
            // 如果按鈕已存在，它會自動返回；如果按鈕丟失，它會重新注入
            if (anchorElement) {
                injectIWantToButtons(anchorElement);
            }
        };

        iwtModuleObserver = new MutationObserver(debounce(checkAndReInject, 350)); // 350ms: 防抖延遲
        PageResourceRegistry.addObserver(iwtModuleObserver);
        iwtModuleObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }


    async function handleStageTwoReOpen(comment) {
        // 1. 等待並填寫
        const reOpenCaseComponent = await waitForElementWithObserver(document.body, 'c-cec-re-open-case', 10000);

        if (comment) {
            const commentBox = await waitForElementWithObserver(reOpenCaseComponent, 'textarea[name="commentField"]', 8000);
            simulateTyping(commentBox, comment);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const finalSubmitButton = await waitForButtonToBeEnabled('c-cec-re-open-case .slds-card__footer button.slds-button_brand');

        // 2. [核心優化] 定義一個臨時的「刺客」監聽器
        // 它只會在提交後運行，找到 Footer 或超時後立即自我銷毀
        const spawnTemporaryFooterWatcher = () => {
            Log.info('Feature.IWT', 'Re-Open 提交，啟動臨時 Footer 監聽器 (10s)...');

            const tempObserver = new MutationObserver((mutations, obs) => {
                const footer = findElementInShadows(document.body, 'footer.slds-modal__footer');
                if (footer) {
                    // 找到目標，注入按鈕，然後立即停止監聽
                    addModalActionButtons(footer);
                    obs.disconnect();
                    Log.info('Feature.IWT', '快捷按鈕注入成功，臨時監聽器已釋放。');
                }
            });

            tempObserver.observe(document.body, { childList: true, subtree: true });

            // 設置 10 秒超時自動銷毀，防止內存洩漏
            setTimeout(() => {
                tempObserver.disconnect();
            }, 10000);
        };

        // 3. 先啟動監聽，再點擊 (防止點擊後頁面刷新太快錯過)
        spawnTemporaryFooterWatcher();
        finalSubmitButton.click();

        showCompletionToast(reOpenCaseComponent, 'Re-Open Case: 操作成功！請等待網頁更新！');
    }


    async function handleStageTwoCloseCase(comment, mode = 'normal') {
        // 根據模式確定提交前的基礎延時
        const baseDelay = mode === 'fast' ? 50 : 300;

        const closeCaseComponent = await waitForElementWithObserver(document.body, 'c-cec-close-case', 10000);

        // 確保下拉框按鈕已渲染且可點擊
        const comboBtnSelector = 'button[aria-label="Case Sub Status"]';
        const comboBtn = await waitForElementWithObserver(closeCaseComponent, comboBtnSelector, 8000);

        // 嘗試選擇，帶有自動重試機制
        try {
            await selectComboboxOption(closeCaseComponent, comboBtnSelector, 'Request Completed');
        } catch (e) {
            Log.warn('Feature.IWT', '首次選擇失敗，嘗試重試...');
            await new Promise(r => setTimeout(r, 500));
            await selectComboboxOption(closeCaseComponent, comboBtnSelector, 'Request Completed');
        }

        // [新增] 選擇 "Request Completed" 後強制等待 1 秒
        // 確保 Salesforce 完成字段依賴檢查或狀態更新
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (comment) {
            const commentBox = await waitForElementWithObserver(closeCaseComponent, 'textarea.slds-textarea', 5000);
            simulateTyping(commentBox, comment);
        }

        // 提交前的基礎緩衝
        await new Promise(resolve => setTimeout(resolve, baseDelay));

        const finalSubmitButton = await waitForButtonToBeEnabled('c-cec-close-case .slds-card__footer button.slds-button_brand');
        finalSubmitButton.click();

        showCompletionToast(closeCaseComponent, 'Close Case: 操作成功！請等待網頁更新！');
    }


    async function handleStageTwoDocumentContact(comment) {
        const docContactComponent = await waitForElementWithObserver(document.body, 'c-cec-document-customer-contact', 10000);

        const radioButtonSelector = 'input[value="Spoke with customer"]';
        // 等待單選按鈕出現
        const radioButton = await waitForElementWithObserver(docContactComponent, radioButtonSelector, 8000);

        // 確保元素可交互並點擊
        radioButton.click();

        // [新增] 點擊單選按鈕後強制等待 500ms
        // 確保界面響應（例如展開評論框或更新狀態）完成
        await new Promise(resolve => setTimeout(resolve, 500));

        if (comment) {
            try {
                // 評論框有時候加載較慢，給予獨立等待
                const commentBox = await waitForElementWithObserver(docContactComponent, 'textarea.slds-textarea', 5000);
                simulateTyping(commentBox, comment);
            } catch (error) {
                // 忽略錯誤，某些情況下可能沒有評論框
            }
        }

        const finalSubmitButton = await waitForButtonToBeEnabled('c-cec-document-customer-contact .slds-card__footer button.slds-button_brand');
        finalSubmitButton.click();

        showCompletionToast(docContactComponent, 'Document Contact: 操作成功！請等待網頁更新！');
    }


    async function automateIWantToAction(config) {
        const { searchText, stageTwoHandler, finalComment } = config;
        Log.info('Feature.IWT', `啟動自動化流程: "${searchText}" (網絡適應模式)。`);

        try {
            // 1. 獲取並聚焦輸入框
            const searchInput = await waitForElementWithObserver(document.body, 'c-ceclookup input.slds-combobox__input', 10000);
            const dropdownTrigger = searchInput.closest('.slds-dropdown-trigger');
            if (!dropdownTrigger) throw new Error('無法找到下拉列表的觸發容器');

            searchInput.focus();
            searchInput.click(); // 確保觸發焦點事件

            // 2. 模擬輸入並等待下拉菜單展開
            simulateTyping(searchInput, searchText);

            // [優化] 等待下拉菜單展開 (aria-expanded="true")
            // 這裡給予較長的超時 (8秒)，以應對慢網速下的搜索請求
            try {
                await waitForAttributeChange(dropdownTrigger, 'aria-expanded', 'true', 8000);
            } catch (e) {
                // 如果超時，嘗試再次觸發輸入事件
                Log.warn('Feature.IWT', '等待下拉菜單超時，嘗試重新觸發輸入...');
                simulateTyping(searchInput, searchText + ' ');
                await waitForAttributeChange(dropdownTrigger, 'aria-expanded', 'true', 5000);
            }

            // [優化] 等待至少一個選項出現
            await waitForElementWithObserver(dropdownTrigger, 'li.slds-listbox__item', 5000);

            // 3. 選擇項目
            simulateKeyEvent(searchInput, 'ArrowDown', 40);
            await new Promise(resolve => setTimeout(resolve, 150)); // 短暫渲染緩衝
            simulateKeyEvent(searchInput, 'Enter', 13);

            // [優化] 等待輸入框的值被確認（下拉菜單收起）
            await waitForAttributeChange(dropdownTrigger, 'aria-expanded', 'false', 5000);

            // 4. 點擊提交
            const firstSubmitButton = await waitForButtonToBeEnabled('lightning-button.submit_button button');
            firstSubmitButton.click();

            // 5. 進入第二階段
            if (stageTwoHandler && typeof stageTwoHandler === 'function') {
                await stageTwoHandler(finalComment);
                Log.info('Feature.IWT', `自動化流程: "${searchText}" 已成功完成。`);
            }

        } catch (error) {
            Log.error('Feature.IWT', `流程 "${searchText}" 在 "第一階段" 失敗: ${error.message}`);
            showGlobalToast(`自動化失敗: 網絡響應超時`, 'error');
        }
    }


    // [設定/狀態持久化 / 定時/防抖 / 元素定位] 功能：`injectIWantToButtons`。
    function injectIWantToButtons(anchorElement) {
        const WRAPPER_CLASS = 'cec-iwt-buttons-wrapper';

        // 1. 檢查直接兄弟節點 (最快)
        const nextSibling = anchorElement.nextElementSibling;
        if (nextSibling && nextSibling.classList.contains(WRAPPER_CLASS)) {
            return;
        }

        // 2. [新增] 檢查父容器範圍 (雙保險)
        // 防止因 DOM 引用變化導致 nextSibling 檢查失效，但按鈕其實已經在父容器裡了
        if (anchorElement.parentElement && anchorElement.parentElement.querySelector(`.${WRAPPER_CLASS}`)) {
            return;
        }

        const buttonContainer = document.createElement('div');
        buttonContainer.className = `slds-grid slds-wrap ${WRAPPER_CLASS}`; // 添加標識類
        const styles = GM_getValue('iWantToButtonStyles', DEFAULTS.iWantToButtonStyles);
        Object.assign(buttonContainer.style, styles);

        let settings = GM_getValue('iwtAutoFillTexts', DEFAULTS.iwtAutoFillTexts);
        if (settings && settings.reOpen && typeof settings.reOpen === 'string') {
            Log.info('Feature.IWT', '檢測到舊版 IWT 按鈕數據格式，正在動態遷移。');
            for (const key in settings) {
                if (typeof settings[key] === 'string') {
                    settings[key] = [settings[key]];
                }
            }
        }
        const autoFillTexts = settings;

        // [事件監聽 / 定時/防抖] 功能：`handleOutsideClick`。
        const handleOutsideClick = (e, dropdownMenu, trigger) => {
            if (!trigger.contains(e.target)) {
                dropdownMenu.classList.remove('show');
                document.removeEventListener('click', trigger.__outsideClickListener);
                delete trigger.__outsideClickListener;
            }
        };

        // [事件監聽 / 定時/防抖] 功能：`applyLongPressHandler`。
        const applyLongPressHandler = (element, config, comment) => {
            let pressTimer = null;
            let longPressTriggered = false;

            // [事件監聽 / 定時/防抖] 功能：`startPress`。
            const startPress = (event) => {
                if (event.button !== 0) return;
                longPressTriggered = false;
                pressTimer = setTimeout(() => {
                    longPressTriggered = true;
                    Log.info('Feature.IWT.LongPress', '長按觸發快速模式。');
                    automateIWantToAction({
                        searchText: config.searchText,
                        stageTwoHandler: (c) => config.handler(c, 'fast'),
                        finalComment: comment
                    });
                    const dropdownMenu = element.closest('.cec-iwt-dropdown-menu');
                    if (dropdownMenu) {
                        dropdownMenu.classList.remove('show');
                    }
                }, 1500);
            };

            // [事件監聽] 功能：`cancelPress`。
            const cancelPress = () => {
                clearTimeout(pressTimer);
            };

            // [事件監聽] 功能：`endPress`。
            const endPress = (event) => {
                if (event.button !== 0) return;
                clearTimeout(pressTimer);
                if (!longPressTriggered) {
                    Log.info('Feature.IWT.LongPress', '單擊觸發普通模式。');
                    automateIWantToAction({
                        searchText: config.searchText,
                        stageTwoHandler: (c) => config.handler(c, 'normal'),
                        finalComment: comment
                    });
                }
            };

            element.addEventListener('mousedown', startPress);
            element.addEventListener('mouseup', endPress);
            element.addEventListener('mouseleave', cancelPress);
        };

        const buttonConfigs = [{
            name: 'Re-Open Case (Auto)',
            title: '自動執行 "Re-Open Case"',
            actionKey: 'reOpen',
            searchText: 'Re-Open Case',
            handler: handleStageTwoReOpen
        }, {
            name: 'Close this Case (Auto)',
            title: '單擊: 普通模式 | 長按2秒: 極速模式',
            actionKey: 'closeCase',
            searchText: 'Close this Case',
            handler: handleStageTwoCloseCase
        }, {
            name: 'Document Customer Contact (Auto)',
            title: '自動執行 "Document Customer Contact"',
            actionKey: 'documentContact',
            searchText: 'Document Customer Contact',
            handler: handleStageTwoDocumentContact
        }];

        buttonConfigs.forEach(config => {
            const layoutItem = document.createElement('div');
            layoutItem.className = 'slds-var-p-right_xx-small slds-size_4-of-12';
            const commentOptions = autoFillTexts[config.actionKey] || [];

            if (commentOptions.length === 1) {
                const directButton = document.createElement('button');
                directButton.title = config.title;
                directButton.className = 'slds-button slds-button_stretch cec-iwt-button-override';
                directButton.textContent = config.name;

                if (config.actionKey === 'closeCase') {
                    applyLongPressHandler(directButton, config, commentOptions[0]);
                } else {
                    directButton.addEventListener('click', () => {
                        automateIWantToAction({
                            searchText: config.searchText,
                            stageTwoHandler: config.handler,
                            finalComment: commentOptions[0]
                        });
                    });
                }

                layoutItem.appendChild(directButton);
                injectedIWTButtons[config.name] = directButton;

            } else {
                const dropdownTrigger = document.createElement('div');
                dropdownTrigger.className = 'cec-iwt-dropdown-trigger';

                const mainButton = document.createElement('button');
                mainButton.title = config.title;
                mainButton.className = 'slds-button slds-button_stretch cec-iwt-button-override';
                mainButton.innerHTML = `${config.name} <span class="cec-dropdown-arrow">▼</span>`;

                const dropdownMenu = document.createElement('ul');
                dropdownMenu.className = 'cec-iwt-dropdown-menu';

                if (commentOptions.length > 1) {
                    commentOptions.forEach(comment => {
                        const item = document.createElement('li');
                        item.className = 'cec-iwt-dropdown-item';
                        item.textContent = comment;

                        if (config.actionKey === 'closeCase') {
                            item.addEventListener('mousedown', (e) => e.stopPropagation());
                            applyLongPressHandler(item, config, comment);
                        } else {
                            item.addEventListener('click', () => {
                                automateIWantToAction({
                                    searchText: config.searchText,
                                    stageTwoHandler: config.handler,
                                    finalComment: comment
                                });
                                dropdownMenu.classList.remove('show');
                            });
                        }
                        dropdownMenu.appendChild(item);
                    });
                } else {
                    const disabledItem = document.createElement('li');
                    disabledItem.className = 'cec-iwt-dropdown-item';
                    disabledItem.textContent = '無可用評論';
                    disabledItem.style.color = '#ccc';
                    disabledItem.style.cursor = 'not-allowed';
                    dropdownMenu.appendChild(disabledItem);
                }

                mainButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    document.querySelectorAll('.cec-iwt-dropdown-menu.show').forEach(menu => {
                        if (menu !== dropdownMenu) menu.classList.remove('show');
                    });
                    dropdownMenu.classList.toggle('show');
                    if (dropdownMenu.classList.contains('show')) {
                        if (!dropdownTrigger.__outsideClickListener) {
                            dropdownTrigger.__outsideClickListener = (event) => handleOutsideClick(event, dropdownMenu, dropdownTrigger);
                            document.addEventListener('click', dropdownTrigger.__outsideClickListener);
                        }
                    } else {
                        if (dropdownTrigger.__outsideClickListener) {
                            document.removeEventListener('click', dropdownTrigger.__outsideClickListener);
                            delete dropdownTrigger.__outsideClickListener;
                        }
                    }
                });

                dropdownTrigger.appendChild(mainButton);
                dropdownTrigger.appendChild(dropdownMenu);
                layoutItem.appendChild(dropdownTrigger);
                injectedIWTButtons[config.name] = mainButton;
            }
            buttonContainer.appendChild(layoutItem);
        });

        anchorElement.insertAdjacentElement('afterend', buttonContainer);
        anchorElement.dataset.customButtonsInjected = 'true';
        Log.info('Feature.IWT', `"I Want To..." 自動化按鈕注入成功（Close Case 已全面支持長按）。`);
        initAssignButtonMonitor();
    }


    // [DOM 觀察] 功能：`updateIWTButtonStates`。
    function updateIWTButtonStates(isAssignButtonDisabled) {
        const buttonsToUpdate = [injectedIWTButtons['Close this Case (Auto)'], injectedIWTButtons['Document Customer Contact (Auto)']];
        buttonsToUpdate.forEach(button => {
            if (button) {
                button.disabled = isAssignButtonDisabled;
            }
        });
        const state = isAssignButtonDisabled ? '禁用' : '啟用';
        Log.info('Feature.IWT', `聯動狀態更新，自動化按鈕已設置為 ${state} 狀態。`);
    }


    async function initAssignButtonMonitor() {
        const ASSIGN_BUTTON_SELECTORS = [
            'button[title="Assign Case to Me"]',
            'button[aria-label="Assign Case to Me"]',
            'button[title="Assign Case to Me"], button[aria-label="Assign Case to Me"]'
        ];
        try {
            const assignButton = await waitForElementWithObserver(document.body, ASSIGN_BUTTON_SELECTORS[0], 20000);
            // [增強] Selector 回退，提升抗 UI 變動能力
            const finalAssignButton = assignButton || findFirstElementInShadows(document.body, ASSIGN_BUTTON_SELECTORS);
            if (!finalAssignButton) {
                throw new Error('未找到 "Assign Case to Me" 按鈕（已嘗試回退選擇器）。');
            } // 20000ms: 等待指派按鈕出現的超時。
            const initialStateDisabled = finalAssignButton.disabled || finalAssignButton.getAttribute('aria-disabled') === 'true';
            updateIWTButtonStates(initialStateDisabled);
            assignButtonObserver = new MutationObserver(() => {
                if (isScriptPaused) return;
                const currentStateDisabled = finalAssignButton.disabled || finalAssignButton.getAttribute('aria-disabled') === 'true';
                updateIWTButtonStates(currentStateDisabled);
            });
            PageResourceRegistry.addObserver(assignButtonObserver);
            assignButtonObserver.observe(finalAssignButton, {
                attributes: true,
                attributeFilter: ['disabled', 'aria-disabled']
            });
            Log.info('Feature.IWT', `"Assign Case to Me" 按鈕狀態監控已啟動，實現狀態聯動。`);
        } catch (error) {
            Log.warn('Feature.IWT', `未找到 "Assign Case to Me" 按鈕，狀態聯動功能未啟動。`);
            updateIWTButtonStates(false);
        }
    }


    async function safeClickWithOptions(modalRoot, buttonSelector, itemValues) {
        if (!itemValues || !Array.isArray(itemValues)) {
            return true;
        }
        const options = itemValues.filter(item => item !== null && item !== undefined);
        if (options.length === 0) {
            return true;
        }

        for (const option of options) {
            try {
                const itemSelector = `lightning-base-combobox-item[data-value="${option}"]`;
                for (let i = 0; i < 2; i++) {
                    try {
                        const button = await waitForElementWithObserver(modalRoot, buttonSelector, 10); // 10ms: 快速查找按鈕。
                        button.dispatchEvent(new MouseEvent("click", {
                            bubbles: true
                        }));
                        await new Promise(resolve => setTimeout(resolve, 5)); // 5ms: 等待菜單渲染。

                        const item = await waitForElementWithObserver(document.body, itemSelector, 10); // 10ms: 快速查找選項。
                        item.dispatchEvent(new MouseEvent("click", {
                            bubbles: true
                        }));
                        await new Promise(resolve => setTimeout(resolve, 5)); // 5ms: 點擊後的UI反應延遲。
                        return true;
                    } catch (error) {
                        if (i === 1) throw error;
                        document.body.click();
                        await new Promise(resolve => setTimeout(resolve, 5));
                    }
                }
            } catch (error) {
                Log.warn('UI.ModalButtons', `選擇選項 "${option}" 失敗，將嘗試下一個備選項。錯誤: ${error.message}`);
            }
        }
        throw new Error(`所有備選選項 [${options.join(', ')}] 都選擇失敗`);
    }


    // [設定/狀態持久化 / 元素定位] 功能：`addModalActionButtons`。
    function addModalActionButtons(footer) {
        // 1. 存在性檢查：如果按鈕已經存在，說明本函數已經執行過並成功，直接退出，防止後續滾動代碼被重複觸發
        if (footer.querySelector(".custom-action-button-container")) {
            return;
        }

        const modalRoot = footer.getRootNode()?.host;
        if (!modalRoot) return;

        // 2. 獲取 Salesforce 原生 Save 按鈕作為錨點
        const saveButtonWrapper = findElementInShadows(footer, 'lightning-button[variant="brand"]');
        if (!saveButtonWrapper) {
            return; // 基礎組件未加載完畢，等待 Scanner 下次輪詢
        }

        // 3. 配置 Footer 佈局
        footer.style.display = 'flex';
        footer.style.justifyContent = 'flex-end';
        footer.style.alignItems = 'center';

        // 4. 創建按鈕容器
        const buttonContainer = document.createElement("div");
        buttonContainer.className = "custom-action-button-container";
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexWrap = 'wrap';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.marginRight = '0px';

        const styleString = `
                font-size: 13px;
                padding: 1.5px 4px;
                margin: 4px;
                border-radius: 4px;
                width: 40px;
                height: 33px;
                background-color: #0070d2;
                color: #ffffff;
                border: 1px solid #0070d2;
                cursor: pointer;
                display: flex;
                align-items: center;
                margin-right: 2px;
                justify-content: center;
            `;

        const buttonsConfig = GM_getValue('actionButtons', DEFAULTS.actionButtons);

        buttonsConfig.forEach((config, index) => {
            const btn = document.createElement("button");
            btn.textContent = config.name;
            btn.className = "slds-button";
            btn.style.cssText = styleString;

            btn.addEventListener("click", async () => {
                try {
                    await safeClickWithOptions(modalRoot, 'button[aria-label*="Case Category"]', config.category);
                    await safeClickWithOptions(modalRoot, 'button[aria-label*="Case Sub Category"]', config.subCategory);
                    await safeClickWithOptions(modalRoot, 'button[aria-label*="Inquirer Role"]', config.role);
                } catch (error) { }
            });
            buttonContainer.appendChild(btn);

            if ((index + 1) % 7 === 0 && (index + 1) < buttonsConfig.length) {
                const flexBreaker = document.createElement('div');
                flexBreaker.style.flexBasis = '100%';
                flexBreaker.style.height = '0';
                buttonContainer.appendChild(flexBreaker);
            }
        });

        // 5. 執行按鈕注入
        footer.insertBefore(buttonContainer, saveButtonWrapper);
        Log.info('UI.ModalButtons', `快捷操作按鈕注入成功。`);

        // 6. [核心修復邏輯] 單次滾動鎖定
        // 只有在啟動了自動滾動功能，且該 footer 元素尚未執行過滾動時才執行
        if (GM_getValue('autoScrollAfterActionButtons', DEFAULTS.autoScrollAfterActionButtons)) {
            if (footer.dataset.cecScrollExecuted !== 'true') {
                // 立即標記為已執行，防止 setTimeout 排隊期間被再次觸發
                footer.dataset.cecScrollExecuted = 'true';

                setTimeout(() => {
                    // 執行物理滾動
                    window.scrollBy({
                        top: 111,
                        behavior: 'smooth'
                    });
                    Log.info('UI.Scroll', '執行一次性自動下移 111px。');
                }, 500); // 500ms 延遲以確保 Salesforce 完成高度重算
            }
        }
    }


    // [設定/狀態持久化 / 事件監聽 / 定時/防抖] 功能：`sendMessageWithRetries`。
    function sendMessageWithRetries(windowHandle, messagePayload, targetOrigin) {
        const MAX_RETRIES = 120;
        const RETRY_INTERVAL = 2000; // 2000ms: 每次重試發送消息的間隔，確保目標窗口有足夠時間加載和響應。
        let attempt = 0;
        let intervalId = null;
        // [設定/狀態持久化 / 事件監聽 / 定時/防抖] 功能：`trySendMessage`。
        const trySendMessage = () => {
            if (attempt >= MAX_RETRIES || !windowHandle || windowHandle.closed) {
                if (attempt >= MAX_RETRIES) {
                    Log.error('Feature.IVP', `發送消息至 IVP 窗口達到最大重試次數，已停止。`);
                }
                if (intervalId) clearInterval(intervalId);
                window.removeEventListener('message', confirmationListener);
                return;
            }
            windowHandle.postMessage(messagePayload, targetOrigin);
            attempt++;
        };
        trySendMessage();
        intervalId = setInterval(trySendMessage, RETRY_INTERVAL);
        // [設定/狀態持久化 / 事件監聽] 功能：`confirmationListener`。
        const confirmationListener = (event) => {
            if (event.origin !== targetOrigin) return;
            if (event.data && event.data.type === 'CEC_REQUEST_RECEIVED' && event.data.payload && event.data.payload.timestamp === messagePayload.payload.timestamp) {
                if (intervalId) clearInterval(intervalId);
                Log.info('Feature.IVP', `收到 IVP 窗口的接收確認。`);
                window.removeEventListener('message', confirmationListener);
            }
        };
        window.addEventListener('message', confirmationListener);
    }


    async function autoQueryIVPOnLoad() {
        if (!GM_getValue('autoIVPQueryEnabled', DEFAULTS.autoIVPQueryEnabled)) {
            Log.warn('Feature.IVP', `未啟用自動 IVP 查詢功能。`);
            return;
        }
        if (!foundTrackingNumber) {
            return;
        }
        Log.info('Feature.IVP', `檢測到追踪號: ${foundTrackingNumber}，觸發自動查詢。`);
        try {
            if (!ivpWindowHandle || ivpWindowHandle.closed) {
                ivpWindowHandle = window.open('https://ivp.inside.ups.com/internal-visibility-portal', 'ivp_window');
            }
            if (!ivpWindowHandle) {
                Log.error('Feature.IVP', `打開 IVP 窗口失敗，可能已被瀏覽器攔截。`);
                alert('CEC 功能強化：打開 IVP 窗口失敗，可能已被瀏覽器攔截。請為此網站允許彈窗。');
                return;
            }
            // [設定/狀態持久化] 功能：`messagePayload`。
            const messagePayload = {
                type: 'CEC_SEARCH_REQUEST',
                payload: {
                    trackingNumber: foundTrackingNumber,
                    timestamp: Date.now()
                }
            };
            sendMessageWithRetries(ivpWindowHandle, messagePayload, 'https://ivp.inside.ups.com');
            Log.info('Feature.IVP', `查詢請求已發送至 IVP 窗口。`);
            if (GM_getValue('autoSwitchEnabled', DEFAULTS.autoSwitchEnabled)) {
                ivpWindowHandle.focus();
            }
        } catch (err) {
            Log.error('Feature.IVP', `自動查詢IVP時發生未知錯誤: ${err.message}`);
        }
    }


    async function autoQueryWebOnLoad() {
        if (!GM_getValue('autoWebQueryEnabled', DEFAULTS.autoWebQueryEnabled)) {
            return;
        }
        if (!foundTrackingNumber) {
            return;
        }
        Log.info('Feature.Web', `檢測到追踪號: ${foundTrackingNumber}，觸發自動 Web 查詢。`);
        try {
            const webUrl = 'https://www.ups.com/track?loc=zh_HK&requester=ST/';

            if (!webWindowHandle || webWindowHandle.closed) {
                webWindowHandle = window.open(webUrl, 'ups_web_window');
            }
            if (!webWindowHandle) {
                Log.error('Feature.Web', `打開 UPS Web 窗口失敗，可能已被瀏覽器攔截。`);
                return;
            }

            // [設定/狀態持久化 / 元素定位] 功能：`messagePayload`。
            const messagePayload = {
                type: 'CEC_SEARCH_REQUEST',
                payload: {
                    trackingNumber: foundTrackingNumber,
                    timestamp: Date.now()
                }
            };

            sendMessageWithRetries(webWindowHandle, messagePayload, 'https://www.ups.com');
            Log.info('Feature.Web', `查詢請求已發送至 UPS Web 窗口。`);

            // 注意：自動查詢通常不強制奪取焦點，以免干擾用戶在 Case 頁面的操作
            // 如果需要強制聚焦，可以取消下面這行的註釋
            // webWindowHandle.focus();

        } catch (err) {
            Log.error('Feature.Web', `自動查詢 Web 時發生未知錯誤: ${err.message}`);
        }
    }


    // [設定/狀態持久化 / 元素定位] 功能：`adjustCaseDescriptionHeight`。
    function adjustCaseDescriptionHeight() {
        const desiredHeight = GM_getValue("caseDescriptionHeight", DEFAULTS.caseDescriptionHeight) + "px";

        const descriptionComponent = findElementInShadows(document.body, 'lightning-textarea[data-field="DescriptionValue"]');
        if (descriptionComponent) {
            const textarea = findElementInShadows(descriptionComponent, 'textarea.slds-textarea');
            if (textarea && !textarea.dataset.heightAdjusted) {
                textarea.style.height = desiredHeight;
                textarea.style.resize = 'vertical';
                textarea.dataset.heightAdjusted = 'true';
                Log.info('UI.HeightAdjust', `Case 描述框高度已調整為 ${desiredHeight}。`);
                return;
            }
        }

        const allLabels = findAllElementsInShadows(document.body, 'div.slds-form-element__label');
        for (const label of allLabels) {
            if (label.textContent.trim() === 'Description') {
                const fieldContainer = label.closest('.slds-form-element');
                if (fieldContainer) {
                    const valueContainer = findElementInShadows(fieldContainer, 'lightning-formatted-rich-text, .slds-form-element__static');
                    if (valueContainer && !valueContainer.dataset.heightAdjusted) {
                        valueContainer.style.display = 'block';
                        valueContainer.style.maxHeight = desiredHeight;
                        valueContainer.style.height = desiredHeight;
                        valueContainer.style.overflowY = 'auto';
                        valueContainer.dataset.heightAdjusted = 'true';
                        Log.info('UI.HeightAdjust', `Case 描述顯示區域高度已調整為 ${desiredHeight}。`);
                        return;
                    }
                }
            }
        }
    }


    // [設定/狀態持久化 / 定時/防抖 / 元素定位] 功能：`processContactCard`。
    function processContactCard(card) {
        const highlightMode = GM_getValue('accountHighlightMode', 'pca');
        if (highlightMode === 'off') {
        }
        const isPcaModeOn = (highlightMode === 'pca');
        const isDispatchModeOn = (highlightMode === 'dispatch');
        const PREFERRED_LOG_KEY = 'preferredLog';
        const now = Date.now();
        const caseId = getCaseIdFromUrl(location.href);

        if (!caseId) {
            Log.warn('UI.ContactCard', `無法從當前 URL 提取 Case ID，聯繫人狀態緩存功能跳過。`);
            return;
        }

        const allLogs = GM_getValue(PREFERRED_LOG_KEY, {});
        const CACHE_TTL = 60 * 60 * 1000;
        const cleanedLog = Object.fromEntries(Object.entries(allLogs).filter(([_, data]) => now - data.timestamp < CACHE_TTL));

        // --- [修改] findAndDisablePickupButton 函數，增加延遲和輪詢 ---
        const findAndDisablePickupButton = () => {
            const POLLING_INTERVAL_MS = 500;
            const TIMEOUT_MS = 5000; // 最多等待 5 秒
            const startTime = Date.now();
            let buttonFound = false;

            const intervalId = setInterval(() => {
                if (Date.now() - startTime > TIMEOUT_MS) {
                    clearInterval(intervalId);
                    if (!buttonFound) {
                        Log.warn('UI.ContactCard', `檢測到 SUSPENDED 狀態，但在 10 秒內未能找到 "Schedule a Pickup" 按鈕。`);
                    }
                    return;
                }

                const pickupButton = findElementInShadows(document.body, 'button[title="Schedule a Pickup"]');
                if (pickupButton) {
                    buttonFound = true;
                    clearInterval(intervalId);
                    if (!pickupButton.disabled) {
                        pickupButton.style.backgroundColor = 'red';
                        pickupButton.style.color = 'white';
                        pickupButton.disabled = true;
                        Log.info('UI.ContactCard', `檢測到賬戶狀態為 "SUSPENDED"，已高亮並禁用 "Schedule a Pickup" 按鈕。`);
                    }
                }
            }, POLLING_INTERVAL_MS);
        };

        if (cleanedLog[caseId]) {
            const cachedData = cleanedLog[caseId];
            const cachedIsPreferred = cachedData.isPreferred;
            const shouldHighlight = (isPcaModeOn && !cachedIsPreferred) || (isDispatchModeOn && cachedIsPreferred);

            if (highlightMode !== 'off' && shouldHighlight) {
                card.style.setProperty('background-color', 'moccasin', 'important');
                findAllElementsInShadows(card, 'div').forEach(div => {
                    div.style.setProperty('background-color', 'moccasin', 'important');
                });
            }
            Log.info('UI.ContactCard', `[緩存命中] 聯繫人卡片高亮規則已應用。`);

            if (cachedData.accountStatus === 'SUSPENDED') {
                findAndDisablePickupButton();
            }
            return;
        }

        const container = card.closest('div.cCEC_ContactPersonAccount');
        if (container) {
            const hiddenContainer = findElementInShadows_Aggressive(container, '.slds-grid.slds-wrap.slds-hide');
            if (hiddenContainer) {
                hiddenContainer.classList.remove('slds-hide');
            }
        }

        let isPreferred = true;
        let accountStatus = 'NOT_FOUND';

        try {
            const allLabels = findAllElementsInShadows(card, 'span.slds-form-element__label');
            for (const label of allLabels) {
                const labelText = label.textContent.trim();
                let currentParent = label.parentElement;
                let valueElement = null;
                let searchDepth = 0;

                while (currentParent && searchDepth < 5 && !valueElement) {
                    valueElement = findElementInShadows(currentParent, '.slds-form-element__static');
                    currentParent = currentParent.parentElement;
                    searchDepth++;
                }

                if (valueElement) {
                    const valueText = valueElement.textContent.trim();
                    if (labelText === 'Preferred') {
                        const lowerCaseValue = valueText.toLowerCase();
                        if (lowerCaseValue === 'yes' || lowerCaseValue === 'no') {
                            isPreferred = (lowerCaseValue === 'yes');
                        }
                    } else if (labelText === 'Account Status') {
                        accountStatus = valueText.toUpperCase();
                    }
                }
            }
        } catch (e) {
            Log.warn('UI.ContactCard', `在 DOM 提取期間發生錯誤: ${e.message}`);
        }

        if (accountStatus === 'SUSPENDED') {
            findAndDisablePickupButton();
        }

        cleanedLog[caseId] = {
            isPreferred: isPreferred,
            accountStatus: accountStatus,
            timestamp: now
        };
        GM_setValue(PREFERRED_LOG_KEY, cleanedLog);

        const shouldHighlight = (isPcaModeOn && !isPreferred) || (isDispatchModeOn && isPreferred);
        if (highlightMode !== 'off' && shouldHighlight) {
            card.style.setProperty('background-color', 'moccasin', 'important');
            findAllElementsInShadows(card, 'div').forEach(div => {
                div.style.setProperty('background-color', 'moccasin', 'important');
            });
        }
        Log.info('UI.ContactCard', `[首次加載] 聯繫人卡片高亮規則已應用。`);
    }


    // [設定/狀態持久化 / 事件監聽 / 元素定位] 功能：`findElementInShadows_Aggressive`。
    function findElementInShadows_Aggressive(root, selector) {
        if (!root) return null;
        if (root.shadowRoot) {
            const el = findElementInShadows_Aggressive(root.shadowRoot, selector);
            if (el) return el;
        }
        const el = root.querySelector(selector);
        if (el) {
            return el;
        }
        for (const child of root.querySelectorAll('*')) {
            if (child.shadowRoot) {
                const nestedEl = findElementInShadows_Aggressive(child.shadowRoot, selector);
                if (nestedEl) return nestedEl;
            }
        }
        return null;
    }


    // [設定/狀態持久化 / 事件監聽 / 元素定位] 功能：`handleIVPCardBlocking`。
    function handleIVPCardBlocking(cardElement) {
        const shouldBlock = GM_getValue('blockIVPCard', DEFAULTS.blockIVPCard);
        if (!shouldBlock) return;
        if (cardElement.dataset.ivpObserverAttached === 'true') {
            return;
        }
        cardElement.dataset.ivpObserverAttached = 'true';
        // [DOM 觀察 / 事件監聽 / 元素定位] 功能：`ivpState`。
        const ivpState = {
            iframe: null,
            parent: null,
            isReady: false
        };
        const relaunchButton = findElementInShadows(cardElement, 'button[title="Relauch IVP"]');
        if (relaunchButton) {
            relaunchButton.disabled = false;
            relaunchButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (ivpState.isReady) {
                    if (ivpState.parent.contains(ivpState.iframe)) {
                        try {
                            ivpState.iframe.src = ivpState.iframe.src;
                        } catch (e) {
                            // 忽略錯誤
                        }
                    } else {
                        ivpState.parent.appendChild(ivpState.iframe);
                        Log.info('Feature.IVP', `已恢復被攔截的 IVP 內容。`);
                    }
                }
            }, true);
        }
        // [DOM 觀察 / 定時/防抖 / 元素定位] 功能：`findIframeBulldozer`。
        const findIframeBulldozer = (root) => {
            let iframe = root.querySelector('iframe');
            if (iframe) return iframe;
            const descendants = root.querySelectorAll('*');
            for (const el of descendants) {
                if (el.shadowRoot) {
                    iframe = el.shadowRoot.querySelector('iframe');
                    if (iframe) return iframe;
                }
            }
            return null;
        };
        // [DOM 觀察 / 定時/防抖] 功能：`findAndStoreTask`。
        const findAndStoreTask = () => {
            const iframe = findIframeBulldozer(cardElement);
            if (iframe) {
                ivpState.iframe = iframe;
                ivpState.parent = iframe.parentElement;
                ivpState.isReady = true;
                iframe.remove();
                Log.info('Feature.IVP', `原生 IVP 卡片已被成功攔截並隱藏。`);
                return true;
            }
            return false;
        };
        const localObserver = new MutationObserver(() => {
            if (findAndStoreTask()) {
                localObserver.disconnect();
                clearTimeout(timeoutHandle);
            }
        });
        const timeoutHandle = setTimeout(() => {
            PageResourceRegistry.addTimeout(timeoutHandle);
            localObserver.disconnect();
            if (!findAndStoreTask()) {
                Log.warn('Feature.IVP', `攔截 IVP 卡片時，等待 iframe 超時。`);
            }
        }, 15000); // 15000ms: 等待 iframe 出現的超時。
        localObserver.observe(cardElement, {
            childList: true,
            subtree: true
        });
        if (findAndStoreTask()) {
            localObserver.disconnect();
            clearTimeout(timeoutHandle);
        }
    }


    async function handleAutoAssign(caseUrl) {
        const ASSIGNMENT_CACHE_KEY = 'assignmentLog';
        const caseId = getCaseIdFromUrl(caseUrl);
        if (!caseId) return true; // 無法處理，視為結束

        // --- [優化] 狀態緩存檢查 (Case Closed) ---
        // 避免每次循環都去掃描 records-highlights-details-item
        const cachedData = CASE_DATA_CACHE.get(caseId) || {};

        if (cachedData.isClosed === true) {
            return true; // 已知已關閉，直接結束
        }

        // 如果緩存中沒有狀態，則掃描一次
        if (cachedData.isClosed === undefined) {
            const highlights = findAllElementsInShadows(document.body, 'records-highlights-details-item');
            // 只有當 highlights 存在時才判斷，否則可能是還沒加載出來
            if (highlights.length > 0) {
                const isClosed = highlights.some(el => {
                    const text = el.innerText || '';
                    return text.includes('Status') && text.includes('Closed');
                });

                if (isClosed) {
                    cachedData.isClosed = true;
                    CASE_DATA_CACHE.set(caseId, cachedData);
                    return true; // 任務結束
                }
                // 注意：如果不 Closed，我們先不緩存 false，因為狀態可能從 Loading 變為 Open
            }
        }

        // --- 緩存檢查 (視覺反饋修復) ---
        const cache = GM_getValue(ASSIGNMENT_CACHE_KEY, {});
        const CACHE_EXPIRATION_MS = 60 * 60 * 1000;
        const entry = cache[caseId];

        if (entry && (Date.now() - entry.timestamp < CACHE_EXPIRATION_MS)) {
            // [修復] 即使緩存命中，也必須確保按鈕被染色，才算任務完成
            const assignButton = findFirstElementInShadows(document.body, ['button[title="Assign Case to Me"]', 'button[aria-label="Assign Case to Me"]']);

            if (assignButton) {
                if (!assignButton.disabled) {
                    assignButton.style.setProperty('background-color', '#0070d2', 'important');
                    assignButton.style.setProperty('color', '#fff', 'important');
                }
                // 只有找到了按鈕（無論是否禁用，只要DOM有了），才視為任務真正完成
                return true;
            }

            // 如果緩存說「已指派」，但按鈕還沒渲染出來，返回 false
            // 讓 Scanner 繼續運行，直到按鈕出現並被我們染色
            return false;
        }

        // --- 以下是正常的指派邏輯 ---

        // 檢查目標用戶設置
        const targetUser = RUNTIME_CONFIG.autoAssignUser; // [優化] 使用內存配置
        if (!targetUser) return true; // 未設置用戶，任務結束

        // 查找 Owner 元素
        const ownerElement = findFirstElementInShadows(document.body, ['force-owner-lookup .owner-name span', 'span.test-id__field-value']);
        if (!ownerElement) return false; // Owner 沒出來，繼續等待

        const currentOwner = ownerElement.innerText?.trim() || '';
        if (!currentOwner) return false; // 內容為空，繼續等待

        // 檢查 Owner 是否匹配
        if (currentOwner.toLowerCase() !== targetUser.toLowerCase()) {
            return true; // Owner 不匹配，不需要指派，任務結束
        }

        // 查找 Assign 按鈕
        const assignButton = findFirstElementInShadows(document.body, ['button[title="Assign Case to Me"]', 'button[aria-label="Assign Case to Me"]']);
        if (!assignButton) return false; // 按鈕沒出來，繼續等待

        // 執行指派
        if (!assignButton.disabled) {
            assignButton.click();
            assignButton.style.setProperty('background-color', '#0070d2', 'important');
            assignButton.style.setProperty('color', '#fff', 'important');

            // 更新緩存
            cache[caseId] = { timestamp: Date.now() };
            GM_setValue(ASSIGNMENT_CACHE_KEY, cache);

            Log.info('Feature.AutoAssign', `自動指派成功 (Case ID: ${caseId})。`);

            // 延遲檢查 Compose 按鈕 (作為副作用)
            setTimeout(() => checkAndColorComposeButton(), 8000);

            return true; // 任務完成
        }

        return false; // 按鈕可能暫時禁用，繼續等待
    }


    // [設定/狀態持久化 / DOM 觀察 / 定時/防抖 / 元素定位] 功能：`processAssociateContactModal`。
    function processAssociateContactModal(modal) {
        if (processedModals.has(modal)) return;

        // 1. 定義觸發關閉的邏輯
        const triggerCloseSequence = () => {
            Log.info('UI.ContactModal', '檢測到 Link 按鈕狀態改變 (Sentinel Triggered)。');
            waitForElementWithObserver(document.body, 'article.cCEC_ContactSummary', 15000)
                .then(card => processContactCard(card))
                .catch(() => {});

            if (GM_getValue('sentinelCloseEnabled', DEFAULTS.sentinelCloseEnabled)) {
                setTimeout(() => {
                    const selectors = ['.uiModal', '.slds-modal', '.slds-backdrop', '.cCEC_ModalLinkAccount'];
                    selectors.forEach(sel => {
                        document.querySelectorAll(sel).forEach(el => {
                            if (getComputedStyle(el).display !== 'none') {
                                el.style.setProperty('display', 'none', 'important');
                            }
                        });
                    });
                    Log.info('UI.ContactModal', '已執行全局強制隱藏。');
                }, 500);
            }
        };

        // 2. 創建範圍哨兵
        const scopedSentinel = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.target.tagName === 'BUTTON') {
                    const btn = mutation.target;
                    if (btn.classList.contains('slds-button_brand')) {
                        triggerCloseSequence();
                        scopedSentinel.disconnect();
                        return;
                    }
                }
            }
        });

        scopedSentinel.observe(modal, {
            attributes: true,
            subtree: true,
            attributeFilter: ['class', 'disabled', 'data-aura-class']
        });

        // 3. 清理邏輯
        const cleanupObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const removedNode of mutation.removedNodes) {
                    if (removedNode === modal || removedNode.contains(modal)) {
                        processedModals.delete(modal);
                        scopedSentinel.disconnect();
                        cleanupObserver.disconnect();
                        return;
                    }
                }
            }
        });
        cleanupObserver.observe(document.body, { childList: true, subtree: true });

        // 4. 表格 UI 優化
        modal.style.visibility = 'hidden';
        try {
            const table = modal.querySelector('table');
            if (!table) return;
            const headerRow = table.querySelector('thead tr');
            const tableBody = table.querySelector('tbody');
            if (!headerRow || !tableBody) return;

            const labelToOriginalIndexMap = new Map();
            const originalHeaders = Array.from(headerRow.children);
            originalHeaders.forEach((h, i) => {
                const l = h.getAttribute('aria-label') || (h.getAttribute('data-col-key-value')?.split('-')[0] === 'Link' ? 'Link Contact' : null);
                if (l) labelToOriginalIndexMap.set(l, i);
            });

            // [事件監聽 / 元素定位] 功能：`setModalMaxHeight`。
            const setModalMaxHeight = (m) => {
                m.style.maxHeight = '80vh';
                m.style.overflowY = 'auto';
            };

            // [事件監聽 / 元素定位] 功能：`matchAndHighlightRow`。
            const matchAndHighlightRow = (row) => {
                if (!foundTrackingNumber) return;
                const extractedValue = foundTrackingNumber.substring(2, 8);
                const accountCell = row.querySelector('td[data-label="Account Number"]');
                if (accountCell) {
                    const accountValue = accountCell.getAttribute('data-cell-value') || accountCell.textContent.trim();
                    if (accountValue && accountValue.replace(/^0+/, '') === extractedValue.replace(/^0+/, '')) {
                        accountCell.style.backgroundColor = 'yellow';
                    }
                }
            };

            // 確保點擊修改圖標時絕對不觸發複製
            const applyClickToCopy = (cell) => {
                if (cell.dataset.copyBound === 'true') return;
                cell.dataset.copyBound = 'true';

                cell.style.cursor = 'pointer';
                cell.title = '點擊文字進行複製';

                cell.addEventListener('click', (e) => {
                    // 1. [終極過濾] 檢查事件冒泡路徑
                    // 使用 composedPath 穿透 Shadow DOM，獲取點擊經過的所有節點
                    const path = e.composedPath();
                    const isEditAction = path.some(node => {
                        if (node.nodeType !== 1) return false; // 過濾非元素節點

                        return (
                            node.classList.contains('slds-cell-edit__button') || // 標準編輯按鈕類
                            node.getAttribute('data-key') === 'edit' ||          // 修改圖標特徵
                            node.tagName === 'BUTTON' ||                         // 所有的按鈕容器
                            node.tagName === 'LIGHTNING-PRIMITIVE-ICON'          // 圖標組件
                        );
                    });

                    // 如果判定為編輯動作，直接退出，交由 Salesforce 原生邏輯處理
                    if (isEditAction) {
                        return;
                    }

                    // 2. 只有確定不是點擊圖標後，才阻止冒泡
                    e.stopPropagation();

                    // 3. 獲取原始數據
                    const stableValue = cell.getAttribute('data-cell-value') || cell.textContent.trim();

                    // 4. 執行複製與懸浮提示 (保持 穩定的 UI 邏輯)
                    navigator.clipboard.writeText(stableValue).then(() => {
                        const tip = document.createElement('span');
                        tip.textContent = '已複製！';

                        Object.assign(tip.style, {
                            position: 'fixed',
                            left: `${e.clientX - 20}px`,
                            top: `${e.clientY - 25}px`,
                            backgroundColor: '#0070d2',
                            color: '#ffffff',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            zIndex: '10000',
                            pointerEvents: 'none',
                            transition: 'opacity 0.3s, transform 0.3s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            transform: 'translateY(0)'
                        });

                        document.body.appendChild(tip);

                        requestAnimationFrame(() => {
                            tip.style.opacity = '1';
                            tip.style.transform = 'translateY(-10px)';
                        });

                        setTimeout(() => {
                            tip.style.opacity = '0';
                            setTimeout(() => tip.remove(), 300);
                        }, 500);

                        Log.info('UI.ContactModal', `精準複製成功: ${stableValue}`);
                    }).catch(err => {
                        Log.error('UI.ContactModal', `複製失敗: ${err}`);
                    });
                });
            };

            // [DOM 觀察 / 元素定位] 功能：`reorderRow`。
            const reorderRow = (row, isHeader = false) => {
                const cells = Array.from(row.children);
                const fragment = document.createDocumentFragment();

                fieldsInDesiredOrder.forEach(label => {
                    if (labelToOriginalIndexMap.has(label)) {
                        const originalIndex = labelToOriginalIndexMap.get(label);
                        const cell = cells[originalIndex];

                        if (cell) {
                            if (!isHeader && (label === 'First Name' || label === 'Last Name')) {
                                applyClickToCopy(cell);
                            }
                            fragment.appendChild(cell);
                        }
                    }
                });

                row.innerHTML = '';
                row.appendChild(fragment);

                if (!isHeader) {
                    matchAndHighlightRow(row);
                }
            };

            if (table.dataset.reordered !== 'true') {
                reorderRow(headerRow, true);
                Array.from(tableBody.querySelectorAll('tr')).forEach(row => reorderRow(row));
                table.dataset.reordered = 'true';
                Log.info('UI.ContactModal', `"Associate Contact" 彈窗表格已按預設順序重新排列。`);
            }

            const obs = new MutationObserver((mutations) => {
                if (isScriptPaused) return;
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && node.tagName === 'TR') {
                            reorderRow(node);
                        }
                    });
                });
            });
            obs.observe(tableBody, { childList: true });

            setModalMaxHeight(modal);
            processedModals.add(modal);

        } catch (error) {
            Log.error('UI.ContactModal', `處理 "Associate Contact" 彈窗時出錯: ${error.message}`);
            scopedSentinel.disconnect();
        } finally {
            requestAnimationFrame(() => {
                modal.style.visibility = 'visible';
            });
        }
    }


    // [元素定位] 功能：`checkAndColorComposeButton`。
    function checkAndColorComposeButton() {
        // 1. [新增] 檢查 Case 是否已關閉 (Closed Case 不需要標紅，也可能沒有計時器)
        // 使用高效的文本檢測，避免複雜的 DOM 遍歷
        const highlights = findAllElementsInShadows(document.body, 'records-highlights-details-item');
        const isClosed = highlights.some(el => {
            const text = el.innerText || '';
            return text.includes('Status') && text.includes('Closed');
        });
        if (isClosed) return true; // Case 已關閉，任務結束

        // 2. [新增] 檢查郵件編輯器是否已打開
        // 如果能找到編輯器框架或 Send 按鈕，說明 Compose 按鈕已經被點擊消失了
        const editorOrSendBtn = findFirstElementInShadows(document.body, [
            'div.slds-rich-text-editor',
            'button.cuf-publisherShareButton', // Send 按鈕
            'c-email-composer'
        ]);
        if (editorOrSendBtn) return true; // 編輯器已打開，任務結束

        // --- 原有邏輯 ---
        const timerTextEl = findElementInShadows(document.body, ".milestoneTimerText");
        const noTimerEl = findElementInShadows(document.body, ".noPendingMilestoneMessage");

        // 如果計時器組件完全沒出來，返回 false 讓引擎繼續掃描
        if (!timerTextEl && !noTimerEl) return false;

        // 情況 A: 確認為無計時器狀態 (No Pending Milestone)
        if (noTimerEl) {
            return true; // 任務完成，無需操作
        }

        // 情況 B: 發現計時器，現在尋找 Compose 按鈕
        const composeButton = findElementInShadows(document.body, "button.testid__dummy-button-submit-action");

        if (!composeButton) {
            return false; // 計時器在，編輯器沒開，但按鈕還沒渲染出來 -> 繼續等待
        }

        // 按鈕已找到，執行高亮邏輯
        const isOverdue = timerTextEl.textContent.includes("overdue");
        const isAlreadyRed = composeButton.style.backgroundColor === "red";

        if (isOverdue && !isAlreadyRed) {
            composeButton.style.backgroundColor = "red";
            composeButton.style.color = "white";
            Log.info('UI.ButtonAlert', `"Compose" 按鈕已因計時器超期標紅。`);
        } else if (!isOverdue && isAlreadyRed) {
            composeButton.style.backgroundColor = "";
            composeButton.style.color = "";
        }

        return true; // 邏輯執行完畢，任務完成
    }


    // [元素定位] 功能：`checkAndColorAssociateButton`。
    function checkAndColorAssociateButton() {
        // 1. 獲取元素
        const relatedCasesTab = findElementInShadows(document.body, 'li[data-label^="Related Cases ("]');
        const associateButton = findElementInShadows(document.body, 'button[title="Associate Contact"]');

        // 2. 判斷條件：是否存在關聯案件
        // 邏輯：檢查 Tab 的 title 屬性是否不等於 "Related Cases (0)"
        const tabTitle = relatedCasesTab ? relatedCasesTab.getAttribute("title") : null;
        const hasRelatedCases = relatedCasesTab && tabTitle && tabTitle !== "Related Cases (0)";

        // 3. 執行動作 A：處理 "Associate Contact" 按鈕 (原有功能)
        if (associateButton) {
            if (hasRelatedCases) {
                // 變紅
                if (associateButton.style.backgroundColor !== "red") {
                    associateButton.style.backgroundColor = "red";
                    associateButton.style.color = "white";  //可刪除變成黑色字體
                }
            } else {
                // 還原
                if (associateButton.style.backgroundColor === "red") {
                    associateButton.style.backgroundColor = "";
                    associateButton.style.color = "";
                }
            }
        }

        // 4. 執行動作 B：處理 "Related Cases" 標籤頁 (新增功能)
        if (relatedCasesTab) {
            // Salesforce 的 Tab 樣式通常在內部的 <a> 標籤上，直接改 li 背景會很醜
            const tabLink = relatedCasesTab.querySelector('a');

            if (tabLink) {
                if (hasRelatedCases) {
                    // 變紅 (使用 setProperty 和 !important 確保覆蓋原生樣式)
                    tabLink.style.setProperty('background-color', 'red', 'important');
                    tabLink.style.setProperty('color', 'white', 'important'); //可刪除變成黑色字體
                } else {
                    // 還原
                    tabLink.style.removeProperty('background-color');
                    tabLink.style.removeProperty('color');
                    tabLink.style.removeProperty('border-radius');
                    tabLink.style.removeProperty('box-shadow');
                }
            }
        }
    }


    // [DOM 觀察 / 定時/防抖] 功能：`determineCaseStatus`。
    function determineCaseStatus() {
        return new Promise((resolve) => {
            // [DOM 觀察 / 定時/防抖] 功能：`checkStatus`。
            const checkStatus = () => {
                const highlightItems = findAllElementsInShadows(document.body, 'records-highlights-details-item');
                for (const item of highlightItems) {
                    const fullText = item.innerText;
                    if (fullText && fullText.includes('Current Status')) {
                        if (fullText.includes('In Progress') || fullText.includes('New')) {
                            return 'ACTIVE_OR_NEW';
                        }
                        if (fullText.includes('Closed')) {
                            return 'CLOSED';
                        }
                    }
                }
                return null;
            };

            const initialStatus = checkStatus();
            if (initialStatus) {
                Log.info('Feature.AutoAssign', `Case 狀態已確定: ${initialStatus}`);
                resolve(initialStatus);
                return;
            }

            const timeout = 15000; // 15000ms: 等待狀態字段出現的超時。
            let timeoutHandle = setTimeout(() => {
                observer.disconnect();
                Log.error('Feature.AutoAssign', `確定 Case 狀態時超時或失敗。`);
                resolve('UNKNOWN');
            }, timeout);

            const observer = new MutationObserver(() => {
                if (isScriptPaused) return;
                const currentStatus = checkStatus();
                if (currentStatus) {
                    clearTimeout(timeoutHandle);
                    observer.disconnect();
                    Log.info('Feature.AutoAssign', `Case 狀態已確定: ${currentStatus}`);
                    resolve(currentStatus);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }


    async function areRequiredFieldsEmpty() {
        const CHECK_TIMEOUT = 15000; // 15000ms: 檢查超時。
        const POLL_INTERVAL = 300; // 300ms: 輪詢間隔。
        const MIN_FIELDS_THRESHOLD = 3;
        const fieldsToCheck = ['Substatus', 'Case Category', 'Case Sub Category'];

        // [定時/防抖] 功能：`dissectAndFindText`。
        const dissectAndFindText = (rootNode, fieldTitle) => {
            let foundText = null;
            const processedNodes = new Set();

            // [定時/防抖] 功能：`traverse`。
            function traverse(node) {
                if (!node || processedNodes.has(node) || foundText) return;
                processedNodes.add(node);
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = (node.nodeValue || '').trim();
                    if (text) {
                        const parent = node.parentElement;
                        const isTitleNode = parent && parent.classList && parent.classList.contains('slds-text-title');
                        if (!isTitleNode && text !== fieldTitle) {
                            foundText = text;
                            return;
                        }
                    }
                }
                if (node.shadowRoot) {
                    traverse(node.shadowRoot);
                    if (foundText) return;
                }
                if (node.childNodes && node.childNodes.length > 0) {
                    for (const child of node.childNodes) {
                        traverse(child);
                        if (foundText) return;
                    }
                }
            }
            traverse(rootNode);
            return foundText;
        };

        try {
            const fieldItems = await new Promise((resolve, reject) => {
                const startTime = Date.now();
                const intervalId = setInterval(() => {
                    if (Date.now() - startTime > CHECK_TIMEOUT) {
                        clearInterval(intervalId);
                        reject(new Error(`等待 'records-highlights-details-item' 渲染超時。`));
                        return;
                    }
                    const items = findAllElementsInShadows(document.body, 'records-highlights-details-item');
                    if (items.length >= MIN_FIELDS_THRESHOLD) {
                        clearInterval(intervalId);
                        resolve(items);
                    }
                }, POLL_INTERVAL);
            });

            // [元素定位] 功能：`fieldValues`。
            const fieldValues = {};
            fieldsToCheck.forEach(key => {
                fieldValues[key] = null;
            });

            for (const item of fieldItems) {
                const titleElement = findElementInShadows(item, 'p.slds-text-title');
                if (!titleElement) continue;

                const title = titleElement.getAttribute('title');
                if (fieldsToCheck.includes(title)) {
                    let value = null;
                    const standardValueElement = findElementInShadows(item, 'lightning-formatted-text');
                    if (standardValueElement && standardValueElement.textContent.trim()) {
                        value = standardValueElement.textContent.trim();
                    } else {
                        value = dissectAndFindText(item, title);
                    }
                    fieldValues[title] = value;
                }
            }

            const isSubstatusEmpty = !fieldValues['Substatus'];
            const isCategoryEmpty = !fieldValues['Case Category'];
            const isSubCategoryEmpty = !fieldValues['Case Sub Category'];

            if (isSubstatusEmpty && isCategoryEmpty && isSubCategoryEmpty) {
                Log.info('Feature.AutoAssign', `所有關鍵字段 (Substatus, Category, Sub Category) 同時為空，中止指派。`);
                return true;
            }

            Log.info('Feature.AutoAssign', `至少有一個關鍵字段有值，繼續執行指派流程。 [Substatus: ${fieldValues['Substatus'] || '空'}, Category: ${fieldValues['Case Category'] || '空'}, SubCategory: ${fieldValues['Case Sub Category'] || '空'}]`);
            return false;

        } catch (error) {
            Log.error('Feature.AutoAssign', `檢查關鍵字段時發生錯誤: ${error.message}。為安全起見，中止指派。`);
            return true;
        }
    }


    // =================================================================================
    // SECTION: 關聯案件提取器模塊 (Related Cases Extractor Module)
    // =================================================================================


    const relatedCasesExtractorModule = {
        CASE_ROWS_CONTAINER_SELECTOR: 'c-cec-shipment-identifier-display-rows',
        EXTRACTION_TIMEOUT_MS: 8000, // 8000ms: 等待單個案件詳細信息行加載的超時。
        hasExecuted: false,
        currentSort: {
            columnId: null,
            direction: 'none'
        },
        columnDefinitions: [{
            id: 'case',
            title: 'Case',
            dataId: 'CEC_Case__r.CEC_Case_Number_Origin__c',
            defaultWidth: 112
        }, {
            id: 'createdDate',
            title: 'DATE & TIME CREATED',
            dataId: 'CEC_Case__r.CreatedDate',
            defaultWidth: 111
        }, {
            id: 'subCategory',
            title: 'Case Sub Category',
            dataId: 'CEC_Case__r.CEC_Case_Sub_Category__c',
            defaultWidth: 93
        }, {
            id: 'identifier',
            title: 'Identifier Value',
            dataId: 'CEC_Values__c',
            defaultWidth: 123
        }, {
            id: 'status',
            title: 'Status',
            dataId: 'CEC_Case__r.Status',
            defaultWidth: 80
        }, {
            id: 'queue',
            title: 'Case Owner',
            defaultWidth: 112,
            isAdded: true
        }, {
            id: 'owner',
            title: 'Queues',
            defaultWidth: 104,
            isAdded: true
        }],


        handleTabClick(tabLink) {
            if (this.hasExecuted) return;
            this.hasExecuted = true;
            Log.info('Feature.RelatedCases', `"Related Cases" 標籤頁被點擊，開始數據提取流程。`);
            const panelId = tabLink.getAttribute('aria-controls');
            if (!panelId) {
                return;
            }
            let attempts = 0;
            const maxAttempts = 30;
            const interval = setInterval(() => {
                if (isScriptPaused) {
                    clearInterval(interval);
                    return;
                }
                attempts++;
                const contentPanel = findElementInShadows(document, `#${panelId}`);
                if (contentPanel) {
                    const caseRowsContainer = findElementInShadows(contentPanel, this.CASE_ROWS_CONTAINER_SELECTOR);
                    if (caseRowsContainer) {
                        clearInterval(interval);
                        const rootNode = caseRowsContainer.shadowRoot || caseRowsContainer;
                        this.setupUIAndProcessCases(rootNode);
                        return;
                    }
                }
                if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    Log.error('Feature.RelatedCases', `等待案件列表容器超時，提取流程終止。`);
                }
            }, 100); // 100ms: 輪詢間隔，快速檢測面板內容是否加載。
        },


        setupUIAndProcessCases(container) {
            this.injectStyles();
            this.processAllCases(container);
        },


        injectStyles() {
            GM_addStyle(`
                .gm-sortable-header {
                    cursor: pointer;
                }
                .gm-sort-icon {
                    display: inline-block;
                    margin-left: 8px;
                    width: 0;
                    height: 0;
                    border-left: 4px solid transparent;
                    border-right: 4px solid transparent;
                    opacity: 0.4;
                    vertical-align: middle;
                }
                .gm-sortable-header .gm-sort-icon {
                    border-top: 4px solid currentColor;
                }
                .gm-sortable-header.sorted-asc .gm-sort-icon {
                    border-bottom: 4px solid currentColor;
                    border-top: 0;
                }
                .gm-sortable-header.sorted-desc .gm-sort-icon {
                    border-top: 4px solid currentColor;
                    border-bottom: 0;
                }
                .gm-sortable-header.sorted .gm-sort-icon {
                    opacity: 1;
                    color: #0070d2;
                }
            `);
        },


        enhanceTableHeaders(table) {
            const headerRow = table.querySelector('thead tr');
            if (!headerRow || headerRow.dataset.enhanced) return;
            table.style.tableLayout = 'fixed';
            table.style.width = '100%';

            headerRow.querySelectorAll('th').forEach(th => {
                th.querySelector('.slds-resizable')?.remove();
                th.classList.remove('slds-is-resizable');

                const innerFixedDiv = th.querySelector('.slds-cell-fixed');
                if (innerFixedDiv) {
                    innerFixedDiv.style.width = 'auto';
                }

                const thDataId = th.getAttribute('data-id');
                const colDef = this.columnDefinitions.find(c => c.dataId && c.dataId === thDataId);
                if (colDef) {
                    th.dataset.colId = colDef.id;
                    th.style.width = `${colDef.defaultWidth}px`;
                }
            });

            const newHeaders = [];
            this.columnDefinitions.filter(c => c.isAdded).reverse().forEach(col => {
                const header = headerRow.children[2].cloneNode(true);
                header.querySelector('.slds-resizable')?.remove();
                header.classList.remove('slds-is-resizable');

                const innerFixedDiv = header.querySelector('.slds-cell-fixed');
                if (innerFixedDiv) {
                    innerFixedDiv.style.width = 'auto';
                }

                const anchor = header.querySelector('a');
                anchor.innerHTML = `<span class="slds-truncate">${col.title}</span><span class="gm-sort-icon"></span>`;
                anchor.classList.add('gm-sortable-header');
                header.title = col.title;
                header.dataset.colId = col.id;
                header.style.width = `${col.defaultWidth}px`;
                header.addEventListener('click', () => this.sortTableByColumn(table, col.id));
                newHeaders.push(header);
            });
            const referenceHeader = headerRow.children[4];
            newHeaders.forEach(h => headerRow.insertBefore(h, referenceHeader));
            headerRow.dataset.enhanced = 'true';
            Log.info('Feature.RelatedCases', `表格頭部已增強，添加了 "Case Owner" 和 "Queues" 列。`);
        },


        sortTableByColumn(table, columnId) {
            const tbody = table.querySelector('tbody');
            if (!tbody) return;
            const rows = Array.from(tbody.querySelectorAll('tr.caseSummary'));
            if (rows.length === 0) return;
            const isAsc = this.currentSort.columnId === columnId && this.currentSort.direction === 'asc';
            this.currentSort.direction = isAsc ? 'desc' : 'asc';
            this.currentSort.columnId = columnId;
            rows.sort((a, b) => {
                const valA = a.querySelector(`td[data-col-id="${columnId}"]`)?.textContent.trim() || '';
                const valB = b.querySelector(`td[data-col-id="${columnId}"]`)?.textContent.trim() || '';
                const comparison = valA.localeCompare(valB, undefined, {
                    numeric: true,
                    sensitivity: 'base'
                });
                return this.currentSort.direction === 'asc' ? comparison : -comparison;
            });
            const detailsMap = new Map();
            tbody.querySelectorAll('tr.caseDetail').forEach(detail => {
                const summary = detail.previousElementSibling;
                if (summary) detailsMap.set(summary, detail);
            });
            rows.forEach(row => {
                tbody.appendChild(row);
                if (detailsMap.has(row)) tbody.appendChild(detailsMap.get(row));
            });
            table.querySelectorAll('thead th a.gm-sortable-header').forEach(a => {
                a.classList.remove('sorted', 'sorted-asc', 'sorted-desc');
            });
            const activeHeader = table.querySelector(`thead th[data-col-id="${columnId}"] a`);
            if (activeHeader) {
                activeHeader.classList.add('sorted', `sorted-${this.currentSort.direction}`);
            }
            Log.info('Feature.RelatedCases', `表格已按 "${columnId}" 列 (${this.currentSort.direction}) 排序。`);
        },


        async processAllCases(container) {
            const table = container.querySelector('table.slds-table');
            if (!table) {
                return;
            }
            this.enhanceTableHeaders(table);
            const summaryRows = table.querySelectorAll('tbody tr.caseSummary');
            if (summaryRows.length === 0) return;
            const CONCURRENCY_LIMIT = 7;
            const rowsArray = Array.from(summaryRows);
            const results = new Array(rowsArray.length);
            let nextIndex = 0;

            // [元素定位] 功能：`worker`。
            const worker = async () => {
                while (nextIndex < rowsArray.length) {
                    const current = nextIndex++;
                    try {
                        const value = await this.processSingleRow(rowsArray[current], current + 1);
                        results[current] = { status: 'fulfilled', value };
                    } catch (error) {
                        results[current] = { status: 'rejected', reason: error };
                    }
                }
            };

            const workerCount = Math.min(CONCURRENCY_LIMIT, rowsArray.length);
            const workers = [];
            for (let i = 0; i < workerCount; i++) {
                workers.push(worker());
            }

            await Promise.all(workers);

            const clickTargetsToClose = results
            .filter(r => r && r.status === 'fulfilled' && r.value)
            .map(r => r.value);
            if (clickTargetsToClose.length > 0) {
                clickTargetsToClose.forEach(target => {
                    const icon = target.querySelector('lightning-icon');
                    if (icon && icon.iconName.includes('chevrondown')) {
                        target.click();
                    }
                });
            }
            Log.info('Feature.RelatedCases', `成功處理 ${summaryRows.length} 個關聯案件，數據已提取並增強。`);
        },


        async processSingleRow(summaryRow, rowIndex) {
            if (summaryRow.dataset.processed) return summaryRow.querySelector('td:first-child');
            const clickTarget = summaryRow.querySelector('td:first-child');
            if (!clickTarget) throw new Error(`案件 #${rowIndex}: 無法找到點擊目標。`);
            try {
                clickTarget.click();
                const detailRow = await this.waitForDetailRow(summaryRow);
                const caseOwnerData = this.extractDataByLabel(detailRow, 'Most Recent Queue');
                const queuesData = this.extractDataByLabel(detailRow, 'Case Owner');
                const referenceCell = summaryRow.children[4];
                const queueCell = this.createCell(caseOwnerData, 'queue');
                const ownerCell = this.createCell(queuesData, 'owner');
                summaryRow.insertBefore(ownerCell, referenceCell);
                summaryRow.insertBefore(queueCell, ownerCell);
                const detailCell = detailRow.querySelector('td');
                if (detailCell && !detailCell.dataset.colspanUpdated) {
                    detailCell.setAttribute('colspan', this.columnDefinitions.length);
                    detailCell.dataset.colspanUpdated = 'true';
                }
                summaryRow.dataset.processed = 'true';
                return clickTarget;
            } catch (error) {
                Log.error('Feature.RelatedCases', `處理案件行 #${rowIndex} 時失敗: ${error.message}`);
                throw new Error(`案件 #${rowIndex}: ${error.message}`);
            }
        },


        createCell(text, colId) {
            const cell = document.createElement('td');
            cell.dataset.colId = colId;

            const contentDiv = document.createElement('div');
            contentDiv.className = 'slds-truncate';
            contentDiv.textContent = text;
            contentDiv.title = text;

            if (colId === 'owner') {
                contentDiv.style.cursor = 'pointer';
                contentDiv.title = 'Click to copy Case Owner';

                contentDiv.addEventListener('click', (event) => {
                    event.stopPropagation();

                    navigator.clipboard.writeText(text).then(() => {
                        const originalText = text;
                        contentDiv.textContent = '已複製！';
                        contentDiv.style.color = '#0070d2';

                        setTimeout(() => {
                            contentDiv.textContent = originalText;
                            contentDiv.style.color = '';
                        }, 1500); // 1500ms: 複製成功提示的顯示時長。
                    }).catch(err => {
                        Log.error('Feature.RelatedCases', `複製 "${text}" 失敗: ${err}`);
                        const originalText = text;
                        contentDiv.textContent = 'Copy Failed!';

                        setTimeout(() => {
                            contentDiv.textContent = originalText;
                        }, 2000); // 2000ms: 複製失敗提示的顯示時長。
                    });
                });
            }

            cell.appendChild(contentDiv);
            return cell;
        },


        extractDataByLabel(container, labelText) {
            for (const b of container.querySelectorAll('b')) {
                if (b.textContent.trim() === labelText) {
                    return b.parentElement.textContent.replace(b.textContent, '').trim() || 'N/A';
                }
            }
            return 'N/A';
        },


        waitForDetailRow(summaryRow) {
            return new Promise((resolve, reject) => {
                const parentTbody = summaryRow.parentElement;
                if (!parentTbody) return reject(new Error('找不到 tbody'));
                const timeout = setTimeout(() => {
                    observer.disconnect();
                    reject(new Error('等待詳細信息行超時'));
                }, this.EXTRACTION_TIMEOUT_MS);
                const observer = new MutationObserver(() => {
                    if (isScriptPaused) {
                        observer.disconnect();
                        clearTimeout(timeout);
                        return;
                    }
                    const detailRow = summaryRow.nextElementSibling;
                    if (detailRow && detailRow.classList.contains('caseDetail')) {
                        clearTimeout(timeout);
                        observer.disconnect();
                        resolve(detailRow);
                    }
                });
                observer.observe(parentTbody, {
                    childList: true
                });
            });
        }
    };


    // =================================================================================
    // SECTION: 頁面任務執行器 (Page Task Runner)
    // =================================================================================


    function startHighFrequencyScanner(caseUrl) {
        const SCAN_INTERVAL = 500; // [優化] 調整為 500ms，響應更快且依然安全
        const MAX_ACTIVE_DURATION = 15000; // 15秒
        const START_TIME = Date.now();

        // 初始化任務隊列：深拷貝配置
        let tasksToRun = CASE_PAGE_CHECKS_CONFIG.map(t => ({...t}));

        // 如果初始隊列為空（理論上不應發生），直接標記處理完成
        if (tasksToRun.length === 0) {
            processedCaseUrlsInSession.add(caseUrl);
            return;
        }

        // 提取 Case ID 用於緩存鍵生成
        const currentCaseId = getCaseIdFromUrl(caseUrl);

        // 用於防止重複處理同一元素的 WeakSet
        const processedElements = new WeakSet();

        Log.info('Core.Scanner', `單一引擎啟動 (目標有效時長: 15秒, 任務數: ${tasksToRun.length})`);

        // 定義遞歸執行函數
        const runScannerLoop = async () => {
            // 1. 停止條件檢查 (外部強制停止)
            if (globalScannerId === null) return;

            // 腳本暫停
            if (isScriptPaused) {
                globalScannerId = null;
                Log.warn('Core.Scanner', `檢測到腳本暫停，引擎強制停止。`);
                return;
            }

            // 超時檢查
            if (Date.now() - START_TIME > MAX_ACTIVE_DURATION) {
                globalScannerId = null;
                const pendingTasks = tasksToRun.map(t => t.id).join(', ');
                Log.warn('Core.Scanner', `有效掃描時間已達 15秒，引擎停止。未完成任務: [${pendingTasks}]`);
                return;
            }

            // 2. [性能優化] 頁面不可見時，暫停執行邏輯，推遲檢查
            if (document.hidden) {
                globalScannerId = setTimeout(runScannerLoop, 2000);
                return;
            }

            // 3. 執行任務循環 (倒序遍歷以便安全刪除)
            for (let i = tasksToRun.length - 1; i >= 0; i--) {
                const task = tasksToRun[i];
                const taskCacheKey = currentCaseId ? `${currentCaseId}_${task.id}` : null;
                let isTaskComplete = false;

                try {
                    // --- 記憶體豁免邏輯 ---
                    if (taskCacheKey && completedTasksRegister.has(taskCacheKey)) {
                        tasksToRun.splice(i, 1);
                        continue;
                    }

                    // --- 執行任務 Handler ---
                    if (task.selector) {
                        // 利用 的 DOM 路徑緩存查找
                        const elements = findAllElementsInShadows(document, task.selector);
                        if (elements.length > 0) {
                            let anySuccess = false;
                            for (const el of elements) {
                                if (processedElements.has(el)) continue;
                                const result = task.handler(el);
                                if (result) {
                                    processedElements.add(el);
                                    anySuccess = true;
                                }
                            }
                            if (anySuccess) isTaskComplete = true;
                        }
                    } else {
                        // 普通邏輯任務
                        isTaskComplete = await task.handler();
                    }

                    // --- 處理結果 ---
                    if (isTaskComplete) {
                        //  移除單個任務成功日誌，保持控制台整潔
                        if (taskCacheKey) completedTasksRegister.add(taskCacheKey);
                        tasksToRun.splice(i, 1);
                    }

                } catch (e) {
                    // 任務異常不應崩潰引擎
                }
            }

            // 4. [修復] 循環結束後立即檢查隊列狀態
            if (tasksToRun.length === 0) {
                // 任務全部完成，執行結束邏輯
                globalScannerId = null;
                processedCaseUrlsInSession.add(caseUrl);

                //  計算並顯示耗時
                const duration = ((Date.now() - START_TIME) / 1000).toFixed(1);
                Log.info('Core.Scanner', `所有任務處理完畢，引擎主動停止 (用時: ${duration}秒)。`);
                return; // 終止遞歸
            }

            // 5. 隊列仍有任務，安排下一次執行 (呼吸機制)
            globalScannerId = setTimeout(runScannerLoop, SCAN_INTERVAL);
        };

        // 啟動循環
        globalScannerId = setTimeout(runScannerLoop, SCAN_INTERVAL);
        PageResourceRegistry.addTimeout(globalScannerId); // 註冊以便清理
    }


    const CASE_PAGE_CHECKS_CONFIG = [
        {
            id: 'case_number_extraction',
            type: 'CONTINUOUS', // 持續嘗試直到 DOM 加載完成
            handler: async () => {
                return extractCaseNumberFromHeader();
            }
        },
        {
            id: 'tracking_extraction',
            type: 'CONTINUOUS', // 持續嘗試直到成功 (依賴 DOM 加載)
            handler: async () => {
                return await extractTrackingNumberAndTriggerIVP();
            }
        },
        {
            id: 'auto_assign',
            type: 'RETRY', // 持續嘗試直到成功或條件不符 (依賴 Owner 欄位和按鈕)
            handler: async () => {
                return await handleAutoAssign(location.href);
            }
        },
        {
            id: 'auto_load_all_feed',
            type: 'RETRY',
            handler: async () => {
                if (!RUNTIME_CONFIG.autoLoadAllUpdates) return true;

                const feed = findElementInShadows(document.body, 'flexipage-component2[data-component-id="forceChatter_exposedFeed"]');
                if (!feed) return false;

                const now = Date.now();

                // 1. 初始化狀態機
                if (!feed.dataset.cecLoadInit) {
                    feed.dataset.cecLoadCycles = '0';
                    feed.dataset.cecLastItemCount = '0';
                    feed.dataset.cecIsWaiting = 'false';
                    feed.dataset.cecLastTriggerTime = '0';
                    feed.dataset.cecStartTime = String(now);
                    feed.dataset.cecRetryCount = '0'; // 新增：單頁重試計數器
                    feed.dataset.cecTotalRetries = '0'; // 新增：總重試累計
                    feed.dataset.cecLoadInit = 'true';
                }

                // 2. 首次啟算延時 (2秒)
                const startTime = parseInt(feed.dataset.cecStartTime);
                if (now - startTime < 2000) return false;

                const trigger = findElementInShadows(feed, '.loadMoreTrigger');
                const viewMoreBtn = findElementInShadows(feed, 'button.cuf-showMore');
                const spinner = findElementInShadows(feed, '.forceInlineSpinner');
                const isCurrentlyLoading = spinner && !spinner.closest('.hideSpinner');

                let cycles = parseInt(feed.dataset.cecLoadCycles);
                let lastCount = parseInt(feed.dataset.cecLastItemCount);
                let isWaiting = feed.dataset.cecIsWaiting === 'true';
                let lastTriggerTime = parseInt(feed.dataset.cecLastTriggerTime);
                let retryCount = parseInt(feed.dataset.cecRetryCount);
                let totalRetries = parseInt(feed.dataset.cecTotalRetries);

                // 3. 數據增量結算
                const currentCount = findAllElementsInShadows(feed, '.cuf-feedElement').length;
                if (isWaiting && currentCount > lastCount) {
                    cycles++;
                    totalRetries += retryCount;
                    feed.dataset.cecLoadCycles = String(cycles);
                    feed.dataset.cecLastItemCount = String(currentCount);
                    feed.dataset.cecTotalRetries = String(totalRetries);
                    feed.dataset.cecIsWaiting = 'false';
                    feed.dataset.cecRetryCount = '0'; // 重置單頁計數

                    // 聚合日誌：清晰展示該頁加載質量
                    const retryHint = retryCount > 0 ? ` (經過 ${retryCount} 次自動重試)` : '';
                    Log.info('Feature.AutoLoad', `第 ${cycles} 頁加載成功，總記錄: ${currentCount}${retryHint}。`);
                    isWaiting = false;
                }

                // 4. 終止判斷
                if (cycles >= 5) {
                    Log.info('Feature.AutoLoad', `加載上限已達 (總計重試: ${totalRetries})，移除背景任務。`);
                    return true;
                }

                if (!trigger && !viewMoreBtn && !isCurrentlyLoading) {
                    const endMarker = findElementInShadows(feed, '.skip-feed-endpoint');
                    if (endMarker && endMarker.textContent.includes('End of Feed')) {
                        Log.info('Feature.AutoLoad', `內容完全讀取 (總 Cycles: ${cycles + (isWaiting?1:0)}, 總重試: ${totalRetries + retryCount})，任務結束。`);
                        return true;
                    }
                }

                // 5. 等待態處理（靜默計數）
                if (isWaiting) {
                    if (isCurrentlyLoading) {
                        feed.dataset.cecLastTriggerTime = String(now);
                    } else if (now - lastTriggerTime > 1000) {
                        // 1秒超時，執行內部重置，不輸出日誌
                        retryCount++;
                        feed.dataset.cecRetryCount = String(retryCount);
                        feed.dataset.cecIsWaiting = 'false';

                        // 僅在極慢時輸出一次警告
                        if (retryCount === 10) {
                            Log.warn('Feature.AutoLoad', `當前網絡響應異常緩慢，已自動重試 10 次...`);
                        }
                    }
                    return false;
                }

                // 6. 觸發態
                if (!isCurrentlyLoading) {
                    if (viewMoreBtn) {
                        feed.dataset.cecLastItemCount = String(currentCount);
                        feed.dataset.cecIsWaiting = 'true';
                        feed.dataset.cecLastTriggerTime = String(now);
                        viewMoreBtn.click();
                        return false;
                    }

                    if (trigger) {
                        feed.dataset.cecLastItemCount = String(currentCount);
                        feed.dataset.cecIsWaiting = 'true';
                        feed.dataset.cecLastTriggerTime = String(now);

                        const originalStyle = trigger.style.cssText;
                        trigger.style.setProperty('position', 'fixed', 'important');
                        trigger.style.setProperty('top', '50%', 'important');
                        trigger.style.setProperty('left', '0px', 'important');
                        trigger.style.setProperty('width', '100px', 'important');
                        trigger.style.setProperty('height', '100px', 'important');
                        trigger.style.setProperty('opacity', '0', 'important');
                        trigger.style.setProperty('z-index', '9999', 'important');
                        trigger.style.setProperty('pointer-events', 'none', 'important');
                        trigger.style.setProperty('cursor', 'inherit', 'important');

                        setTimeout(() => {
                            if (trigger) trigger.style.cssText = originalStyle;
                        }, 400);

                        return false;
                    }
                }

                return false;
            }
        },
        {
            id: 'handleContactLogic',
            selector: 'article.cCEC_ContactSummary, button[title="Associate Contact"]',
            type: 'ONCE',
            handler: (element) => {
                if (window.contactLogicDone) return true;
                if (element.matches('article.cCEC_ContactSummary')) {
                    window.contactLogicDone = true;
                    processContactCard(element);
                    return true;
                }
                if (element.matches('button[title="Associate Contact"]')) {
                    return true;
                }
                return false;
            }
        },
        {
            id: 'initComposeButtonWatcher',
            type: 'RETRY', // 持續重試，直到邏輯內部返回 true (找到按鈕或確認無需處理)
            handler: async () => {
                return checkAndColorComposeButton();
            }
        },
        {
            id: 'setupTabClickTriggers',
            selector: 'a.slds-tabs_scoped__link[data-label^="Related Cases"]',
            type: 'ONCE',
            handler: (tabLink) => {
                const tabParent = tabLink.closest('li');
                if (!tabParent) return false;
                if (tabParent.dataset.listenerAttached === 'true') return true;
                tabParent.addEventListener('click', () => {
                    relatedCasesExtractorModule.handleTabClick(tabLink);
                }, { once: true });
                tabParent.dataset.listenerAttached = 'true';
                return true;
            }
        },
        {
            id: 'initRelatedCasesWatcherForButton',
            selector: 'li[data-label^="Related Cases ("]',
            type: 'ONCE',
            handler: () => {
                checkAndColorAssociateButton();
                return true;
            }
        },
        {
            id: 'adjustCaseDescription',
            selector: 'lightning-textarea[data-field="DescriptionValue"], div.slds-form-element__label',
            type: 'ONCE',
            handler: () => {
                adjustCaseDescriptionHeight();
                return true;
            }
        },
        {
            id: 'blockIVPCard',
            selector: 'article.cCEC_IVPCanvasContainer',
            type: 'ONCE',
            handler: (cardElement) => {
                handleIVPCardBlocking(cardElement);
                return true;
            }
        },
        {
            id: 'injectFollowUpButton',
            selector: 'div[data-target-selection-name="sfdc:StandardButton.Case.Follow"]',
            type: 'ONCE',
            handler: (element) => {
                if (GM_getValue('followUpPanelEnabled', DEFAULTS.followUpPanelEnabled)) {
                    return FollowUpPanel.ensureCaseButton();
                }
                return true;
            }
        },
        {
            id: 'injectActionButtons',
            // [優化] 移除 selector，改為邏輯驅動的 RETRY 任務
            // 這樣我們可以在 handler 內部判斷 "Case Closed" 的情況
            type: 'RETRY',
            handler: async () => {
                // 1. 嘗試尋找 Footer 並注入
                const footer = findElementInShadows(document.body, 'footer.slds-modal__footer');
                if (footer) {
                    addModalActionButtons(footer);
                    return true; // 找到了，注入成功，任務結束
                }

                // 2. [新增] 如果沒找到 Footer，檢查 Case 是否已關閉
                // 遍歷狀態欄，查找包含 "Status" 和 "Closed" 的文本
                const highlights = findAllElementsInShadows(document.body, 'records-highlights-details-item');
                const isClosed = highlights.some(el => {
                    const text = el.innerText || '';
                    return text.includes('Status') && text.includes('Closed');
                });

                if (isClosed) {
                    // Case 已關閉，不需要 Footer，視為任務完成（避免超時報警）
                    return true;
                }

                // 3. 既沒找到 Footer，也不是 Closed 狀態 -> 繼續等待
                return false;
            }
        },
        {
            id: 'injectIWT_Initial',
            selector: 'c-cec-i-want-to-container lightning-layout.slds-var-p-bottom_small',
            type: 'ONCE',
            handler: (element) => {
                injectIWantToButtons(element);
                return true;
            }
        },
        {
            id: 'addIVPButtons',
            selector: 'c-cec-datatable',
            type: 'ONCE',
            handler: (datatableContainer) => {
                const shadowRoot = datatableContainer.shadowRoot;
                if (!shadowRoot) return false;
                if (datatableContainer.dataset.ivpBtnsAdded === 'true') return true;

                const copyButtons = findAllElementsInShadows(shadowRoot, 'button[name="copyIdentifier"]');
                if (copyButtons.length > 0) {
                    let injectedCount = 0;
                    const MAX_BUTTONS = 10;
                    const allRows = findAllElementsInShadows(shadowRoot, 'tr');

                    for (const row of allRows) {
                        if (injectedCount >= MAX_BUTTONS) break;
                        if (row.hasAttribute('data-ivp-processed')) continue;

                        const copyButtonInRow = findElementInShadows(row, 'button[name="copyIdentifier"]');
                        if (copyButtonInRow) {
                            const cellWrapper = copyButtonInRow.closest("lightning-primitive-cell-button");
                            if (cellWrapper && !cellWrapper.parentElement.querySelector('.custom-s-button')) {
                                const ivpButton = document.createElement("button");
                                ivpButton.textContent = "IVP";
                                ivpButton.className = "slds-button slds-button_icon slds-button_icon-brand custom-s-button";
                                ivpButton.dataset.target = "ivp";
                                ivpButton.style.marginRight = "-2px";
                                ivpButton.style.fontWeight = 'bold';

                                const webButton = document.createElement("button");
                                webButton.textContent = "Web";
                                webButton.className = "slds-button slds-button_icon slds-button_icon-brand custom-s-button";
                                webButton.dataset.target = "web";
                                webButton.style.marginRight = "2px";
                                webButton.style.fontWeight = 'bold';

                                cellWrapper.parentElement.insertBefore(webButton, cellWrapper);
                                cellWrapper.parentElement.insertBefore(ivpButton, webButton);

                                row.setAttribute('data-ivp-processed', 'true');
                                injectedCount++;
                            }
                        }
                    }

                    const targetSelectors = ['th[aria-label="COPY"]', 'th[aria-label="DATE ADDED"]'];
                    targetSelectors.forEach(selector => {
                        const th = shadowRoot.querySelector(selector);
                        if (th) {
                            const TARGET_WIDTH = '90px';
                            th.style.width = TARGET_WIDTH;
                            th.style.minWidth = TARGET_WIDTH;
                            th.style.maxWidth = TARGET_WIDTH;
                            const factory = th.querySelector('lightning-primitive-header-factory');
                            if (factory) factory.style.width = TARGET_WIDTH;
                            th.querySelectorAll('[style*="width"]').forEach(el => {
                                if (el.style.width.includes('94px') || el.style.width.includes('95px')) {
                                    el.style.width = TARGET_WIDTH;
                                }
                            });
                        }
                    });

                    datatableContainer.dataset.ivpBtnsAdded = 'true';
                    return true;
                }
                return false;
            }
        }
    ];


    // =================================================================================
    // SECTION: 主控制器與初始化 (Main Controller & Initialization)
    // =================================================================================


    function handleSettingsMigration() {
        const MIGRATION_KEY = 'settingsMigrationV34';
        if (GM_getValue(MIGRATION_KEY, false)) {
            return;
        }
        const isPca = GM_getValue('isPcaCaseModeEnabled', null);
        const isDispatch = GM_getValue('isDispatchCaseModeEnabled', null);
        if (isPca !== null || isDispatch !== null) {
            let newMode = 'off';
            if (isPca) newMode = 'pca';
            else if (isDispatch) newMode = 'dispatch';
            GM_setValue('accountHighlightMode', newMode);
            Log.info('Core.Migration', `舊版本設置已成功遷移。`);
        }
        GM_setValue(MIGRATION_KEY, true);
    }


    // [設定/狀態持久化 / 事件監聽 / 元素定位] 功能：`injectControlButtons`。
    function injectControlButtons(logoElement) {
        const SETTINGS_BUTTON_ID = 'cec-settings-gear-button';
        const PAUSE_BUTTON_ID = 'cec-pause-toggle-button';
        if (document.getElementById(SETTINGS_BUTTON_ID)) {
            return;
        }
        // [設定/狀態持久化 / 事件監聽 / 元素定位] 功能：`createSldsIcon`。
        const createSldsIcon = (iconName) => {
            return `
                <svg class="slds-button__icon" focusable="false" aria-hidden="true">
                    <use xlink:href="/_slds/icons/utility-sprite/svg/symbols.svg#${iconName}"></use>
                </svg>
            `;
        };
        logoElement.style.position = 'relative';
        logoElement.style.overflow = 'visible';
        const settingsButton = document.createElement('button');
        settingsButton.id = SETTINGS_BUTTON_ID;
        settingsButton.title = '腳本設定';
        settingsButton.className = 'slds-button slds-button_icon cec-header-button';
        settingsButton.style.cssText = `position: absolute; top: 50%; left: 28%; transform: translate(-50%, -50%); z-index: 10;`;
        settingsButton.innerHTML = createSldsIcon('settings') + '<span class="slds-assistive-text">腳本設定</span>';
        settingsButton.addEventListener('click', (event) => {
            event.stopPropagation();
            openSettingsModal();
        });
        const pauseButton = document.createElement('button');
        pauseButton.id = PAUSE_BUTTON_ID;
        pauseButton.className = 'slds-button slds-button_icon cec-header-button';
        pauseButton.style.cssText = `position: absolute; top: 50%; left: 45%; transform: translate(-50%, -50%); z-index: 10;`;
        pauseButton.innerHTML = createSldsIcon('pause') + '<span class="slds-assistive-text"></span>';
        // [設定/狀態持久化 / DOM 觀察 / 事件監聽 / 元素定位] 功能：`updatePauseButtonUI`。
        const updatePauseButtonUI = () => {
            const useElement = pauseButton.querySelector('use');
            const text = pauseButton.querySelector('.slds-assistive-text');
            if (isScriptPaused) {
                useElement.setAttribute('xlink:href', '/_slds/icons/utility-sprite/svg/symbols.svg#play');
                pauseButton.title = '恢復腳本運行';
                text.textContent = '恢復腳本運行';
            } else {
                useElement.setAttribute('xlink:href', '/_slds/icons/utility-sprite/svg/symbols.svg#pause');
                pauseButton.title = '暫停腳本運行';
                text.textContent = '暫停腳本運行';
            }
        };
        pauseButton.addEventListener('click', (event) => {
            event.stopPropagation();
            isScriptPaused = !isScriptPaused;
            GM_setValue('isScriptPaused', isScriptPaused);
            updatePauseButtonUI();
            if (isScriptPaused) {
                showGlobalToast('腳本已暫停', 'pause');
                Log.warn('Core.Control', `腳本已暫停，所有自動化功能停止。`);
                PageResourceRegistry.cleanup('pause');
                FollowUpPanel.unmount(); // 完全隱藏跟進面板
            } else {
                showGlobalToast('腳本已恢復運行', 'check');
                Log.info('Core.Control', `腳本已恢復運行，正在重新初始化頁面。`);
                lastUrl = '';

                // Follow-Up Panel (恢復顯示)
                if (GM_getValue('followUpPanelEnabled', DEFAULTS.followUpPanelEnabled)) {
                    FollowUpPanel.ensureMounted();
                    FollowUpPanel.render();
                }
                monitorUrlChanges();
            }
        });
        logoElement.appendChild(settingsButton);
        logoElement.appendChild(pauseButton);
        updatePauseButtonUI();
        Log.info('UI.Controls', `頂部控制按鈕 (設置/暫停) 注入成功。`);
    }


    // [DOM 觀察 / 事件監聽 / 定時/防抖 / 元素定位] 功能：`initHeaderObserver`。
    function initHeaderObserver() {
        if (window.__cecHeaderObserverInitialized) return;
        window.__cecHeaderObserverInitialized = true;
        const HEADER_LOGO_SELECTOR = '#oneHeader .slds-global-header__item .slds-global-header__logo';
        const observer = new MutationObserver((mutations, obs) => {
            const logoElement = findElementInShadows(document.body, HEADER_LOGO_SELECTOR);
            if (logoElement) {
                injectControlButtons(logoElement);
                obs.disconnect();
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        setTimeout(() => {
            observer.disconnect();
        }, 15000); // 15000ms: 等待頂部Header出現的超時。
    }


    // [事件監聽 / 定時/防抖] 功能：`initGlobalClickListener`。
    function initGlobalClickListener() {
        if (window.__cecGlobalClickListenerInitialized) return;
        window.__cecGlobalClickListenerInitialized = true;
        document.body.addEventListener('click', (event) => {
            if (isScriptPaused) return;

            // --- 1. 處理郵件編輯器觸發按鈕 (Compose, Reply All, Write email) ---
            const composeButton = event.target.closest('button.testid__dummy-button-submit-action');
            const replyAllButton = event.target.closest('a[title="Reply All"]');
            const writeEmailButton = event.target.closest('button[title="Write an email..."]');

            if (composeButton || replyAllButton || writeEmailButton) {
                let triggerName = composeButton ? '"Compose"' : (replyAllButton ? '"Reply All"' : '"Write an email..."');
                Log.info('UI.Enhancement', `檢測到 ${triggerName} 按鈕點擊，準備注入模板快捷按鈕。`);
                setTimeout(() => {
                    handleEditorReadyForTemplateButtons();
                }, 300);
            }

            // --- 2. 處理關聯聯繫人按鈕 (Associate Contact) ---
            const associateButton = event.target.closest('button[title="Associate Contact"], a[title="Associate Contact"]');
            if (associateButton) {
                waitForElementWithObserver(document.body, '.slds-modal__container', 10000).then(modal => {
                    processAssociateContactModal(modal);
                }).catch(error => { /* 忽略錯誤 */ });
                return;
            }

            // --- 3. 處理自定義查詢按鈕 (IVP / Web) ---
            const actionButton = event.target.closest('.custom-s-button');
            if (actionButton) {
                const row = actionButton.closest('tr');
                if (!row) return;

                let trackingNumber = null;
                for (const link of findAllElementsInShadows(row, 'a')) {
                    const match = link.textContent.match(/1Z[A-Z0-9]{16}/);
                    if (match) {
                        trackingNumber = match[0];
                        break;
                    }
                }

                if (!trackingNumber) {
                    Log.warn('Feature.Query', '未在當前行提取到有效的 1Z 追踪號。');
                    return;
                }

                const targetType = actionButton.dataset.target;
                const timestamp = Date.now();
                // [設定/狀態持久化] 功能：`messagePayload`。
                const messagePayload = {
                    type: 'CEC_SEARCH_REQUEST',
                    payload: { trackingNumber, timestamp }
                };

                // 分支 A: 執行 IVP 查詢
                if (targetType === 'ivp') {
                    Log.info('Feature.IVP', `手動點擊 IVP 按鈕，查詢追踪號: ${trackingNumber}。`);
                    try {
                        if (!ivpWindowHandle || ivpWindowHandle.closed) {
                            ivpWindowHandle = window.open('https://ivp.inside.ups.com/internal-visibility-portal', 'ivp_window');
                        }
                        if (!ivpWindowHandle) {
                            alert('CEC 功能強化：打開 IVP 窗口失敗，請允許彈窗。');
                            return;
                        }
                        sendMessageWithRetries(ivpWindowHandle, messagePayload, 'https://ivp.inside.ups.com');

                        // [修改點] 移除 GM_getValue 檢查，改為強制聚焦，與 Web 按鈕保持一致
                        ivpWindowHandle.focus();

                    } catch (err) { Log.error('Feature.IVP', err.message); }
                }
                // 分支 B: 執行 UPS Web 查詢
                else if (targetType === 'web') {
                    Log.info('Feature.Web', `手動點擊 Web 按鈕，查詢追踪號: ${trackingNumber}。`);
                    try {
                        const webUrl = 'https://www.ups.com/track?loc=zh_HK&requester=ST/';
                        if (!webWindowHandle || webWindowHandle.closed) {
                            webWindowHandle = window.open(webUrl, 'ups_web_window');
                        }
                        if (!webWindowHandle) {
                            alert('CEC 功能強化：打開 UPS Web 窗口失敗，請允許彈窗。');
                            return;
                        }
                        sendMessageWithRetries(webWindowHandle, messagePayload, 'https://www.ups.com');

                        // Web 模式強制聚焦
                        webWindowHandle.focus();

                    } catch (err) { Log.error('Feature.Web', err.message); }
                }
            }
        }, true);
    }


    async function monitorUrlChanges() {
        if (isScriptPaused) {
            return;
        }
        if (location.href === lastUrl) return;

        if (globalScannerId) {
            clearInterval(globalScannerId);
            Log.info('Core.Router', `上一個頁面的掃描器 (ID: ${globalScannerId}) 已被終止。`);
            globalScannerId = null;
        }

        Log.info('Core.Router', `URL 變更，開始處理新頁面: ${location.href}`);
        lastUrl = location.href;

        // --- 1. 基礎狀態清理 ---
        // 清空 DOM 路徑緩存與任務記憶 (無論去哪，舊頁面的緩存都必須清空)
        DOM_PATH_CACHE = {};
        completedTasksRegister.clear();

        // 資源清理
        PageResourceRegistry.cleanup('urlchange');
        if (typeof FollowUpPanel !== 'undefined') FollowUpPanel.removeAllFloating();

        injectedIWTButtons = {};
        if (assignButtonObserver) assignButtonObserver.disconnect();
        if (iwtModuleObserver) iwtModuleObserver.disconnect();
        assignButtonObserver = null;
        iwtModuleObserver = null;
        if (relatedCasesExtractorModule) relatedCasesExtractorModule.hasExecuted = false;
        window.contactLogicDone = false;

        // --- 2. 路由匹配與精準處理 ---
        const caseRecordPagePattern = /^https:\/\/upsdrive\.lightning\.force\.com\/lightning\/r\/Case\/[a-zA-Z0-9]{18}\/.*/;
        const myOpenCasesListPagePattern = /^https:\/\/upsdrive\.lightning\.force\.com\/lightning\/o\/Case\/list\?.*filterName=My_Open_Cases_CEC.*/;

        // 分支 A: Case 詳情頁
        if (caseRecordPagePattern.test(location.href)) {
            const caseUrl = location.href;

            // [核心修復] 僅在確認是 Case 頁面後才嘗試提取 ID 和恢復緩存
            const currentCaseId = getCaseIdFromUrl(caseUrl);

            if (currentCaseId) {
                // 嘗試恢復 Case Number 搶跑數據
                const caseNoCache = GM_getValue('caseNumberLog', {});
                const caseNoEntry = caseNoCache[currentCaseId];
                const CASE_TTL = 30 * 24 * 60 * 60 * 1000;

                if (caseNoEntry && (Date.now() - caseNoEntry.timestamp < CASE_TTL)) {
                    foundCaseNumber = caseNoEntry.caseNo;
                } else {
                    foundCaseNumber = null;
                }

                // 嘗試恢復 Tracking Number 搶跑數據
                const trackCache = GM_getValue(CACHE_POLICY.TRACKING.KEY, {});
                const trackEntry = trackCache[currentCaseId];
                if (trackEntry && (Date.now() - trackEntry.timestamp < CACHE_POLICY.TRACKING.TTL_MS)) {
                    foundTrackingNumber = trackEntry.trackingNumber;
                } else {
                    foundTrackingNumber = null;
                }
            }

            // 數據就緒後立刻渲染一次面板 (實現 0 延遲變色)
            if (GM_getValue('followUpPanelEnabled', DEFAULTS.followUpPanelEnabled) && typeof FollowUpPanel !== 'undefined') {
                FollowUpPanel.highlightListMatches(new Map());
                FollowUpPanel.render();
            }

            // 啟動單一引擎掃描器處理 DOM 任務
            Log.info('Core.Router', `啟動單一引擎掃描器。`);
            startHighFrequencyScanner(caseUrl);

            // 等待核心 UI 加載完成後執行次要初始化
            const PAGE_READY_SELECTOR = 'c-cec-case-categorization';
            const PAGE_READY_TIMEOUT = 20000;
            try {
                await waitForElementWithObserver(document.body, PAGE_READY_SELECTOR, PAGE_READY_TIMEOUT);
                checkAndNotifyForRecentSend(caseUrl);
                initIWantToModuleWatcher();
                if (GM_getValue('followUpPanelEnabled', DEFAULTS.followUpPanelEnabled)) {
                    FollowUpPanel.ensureMounted();
                    FollowUpPanel.render(); // 再次渲染以確保按鈕位置正確
                }
            } catch (error) {
                Log.warn('Core.Router', `等待詳情頁核心元素超時。`);
            }

        // 分支 B: Case 列表頁
        } else if (myOpenCasesListPagePattern.test(location.href)) {
            // 重置提取變量，避免舊數據污染列表頁
            foundCaseNumber = null;
            foundTrackingNumber = null;

            if (GM_getValue('followUpPanelEnabled', DEFAULTS.followUpPanelEnabled) && typeof FollowUpPanel !== 'undefined') {
                FollowUpPanel.highlightListMatches(new Map());
                FollowUpPanel.render();
            }

            Log.info('Core.Router', `"My Open Cases CEC" 列表頁已識別。`);
            initCaseListMonitor();

        // 分支 C: 其他頁面 (Dashboard 等)
        } else {
            foundCaseNumber = null;
            foundTrackingNumber = null;
            if (typeof FollowUpPanel !== 'undefined' && GM_getValue('followUpPanelEnabled', DEFAULTS.followUpPanelEnabled)) {
                FollowUpPanel.render();
            }
            Log.info('Core.Router', `非目標頁面，已重置狀態。`);
        }
    }


    // [設定/狀態持久化 / 事件監聽 / 定時/防抖] 功能：`startUrlMonitoring`。
    function startUrlMonitoring() {
        if (window.__cecUrlMonitoringInitialized) return;
        window.__cecUrlMonitoringInitialized = true;
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        history.pushState = function() {
            originalPushState.apply(this, arguments);
            window.dispatchEvent(new Event('urlchange'));
        };
        history.replaceState = function() {
            originalReplaceState.apply(this, arguments);
            window.dispatchEvent(new Event('urlchange'));
        };
        const debouncedMonitor = debounce(monitorUrlChanges, PERF_CONFIG.URL_CHANGE_DEBOUNCE_MS);
        window.addEventListener('urlchange', debouncedMonitor);
        window.addEventListener('popstate', debouncedMonitor);
        setInterval(() => {
            if (isScriptPaused) return;
            if (location.href !== lastUrl) {
                if (document.visibilityState === 'visible') {
                    debouncedMonitor();
                } else {
                    lastUrl = location.href;
                }
            }
        }, PERF_CONFIG.HEARTBEAT_INTERVAL_MS);
        document.addEventListener('visibilitychange', () => {
            if (isScriptPaused) return;
            if (document.visibilityState === 'visible' && location.href !== lastUrl) {
                debouncedMonitor();
            }
        });
    }


    // [設定/狀態持久化] 功能：`start`。
    function start() {
        Log.info('Core.Init', `腳本啟動 (Version: ${GM_info.script.version})。`);

        // [優化] 初始化配置快照 (Config Memory)
        // 將常用配置一次性讀入內存，避免高頻調用 GM_getValue
        try {
            RUNTIME_CONFIG = {
                followUpPanelEnabled: GM_getValue('followUpPanelEnabled', DEFAULTS.followUpPanelEnabled),
                notifyOnRepliedCaseEnabled: GM_getValue('notifyOnRepliedCaseEnabled', DEFAULTS.notifyOnRepliedCaseEnabled),
                pcaDoNotClosePromptEnabled: GM_getValue('pcaDoNotClosePromptEnabled', DEFAULTS.pcaDoNotClosePromptEnabled),
                pcaCaseListHintEnabled: GM_getValue('pcaCaseListHintEnabled', DEFAULTS.pcaCaseListHintEnabled),
                highlightExpiringCasesEnabled: GM_getValue('highlightExpiringCasesEnabled', false),
                autoSwitchEnabled: GM_getValue('autoSwitchEnabled', DEFAULTS.autoSwitchEnabled),
                autoScrollAfterActionButtons: GM_getValue('autoScrollAfterActionButtons', DEFAULTS.autoScrollAfterActionButtons),
                autoAssignUser: GM_getValue('autoAssignUser', DEFAULTS.autoAssignUser),
                sentinelCloseEnabled: GM_getValue('sentinelCloseEnabled', DEFAULTS.sentinelCloseEnabled),
                blockIVPCard: GM_getValue('blockIVPCard', DEFAULTS.blockIVPCard),
                autoIVPQueryEnabled: GM_getValue('autoIVPQueryEnabled', DEFAULTS.autoIVPQueryEnabled),
                autoWebQueryEnabled: GM_getValue('autoWebQueryEnabled', DEFAULTS.autoWebQueryEnabled),
                accountHighlightMode: GM_getValue('accountHighlightMode', 'pca'),
                richTextEditorHeight: GM_getValue('richTextEditorHeight', DEFAULTS.richTextEditorHeight),
                caseDescriptionHeight: GM_getValue('caseDescriptionHeight', DEFAULTS.caseDescriptionHeight),
                caseHistoryHeight: GM_getValue('caseHistoryHeight', DEFAULTS.caseHistoryHeight),
                postInsertionEnhancementsEnabled: GM_getValue('postInsertionEnhancementsEnabled', DEFAULTS.postInsertionEnhancementsEnabled),
                templateInsertionMode: GM_getValue('templateInsertionMode', DEFAULTS.templateInsertionMode),
                cursorPositionBrIndex: GM_getValue('cursorPositionBrIndex', DEFAULTS.cursorPositionBrIndex),
                autoLoadAllUpdates: GM_getValue('autoLoadAllUpdates', DEFAULTS.autoLoadAllUpdates),
                cleanModeEnabled: GM_getValue('cleanModeEnabled', DEFAULTS.cleanModeEnabled)
            };
            Log.info('Core.Init', `運行時配置快照已加載。`);
        } catch(e) {
            Log.warn('Core.Init', `配置加載異常: ${e.message}`);
        }

        handleSettingsMigration();
        initHeaderObserver();
        if (isScriptPaused) {
            Log.warn('Core.Init', `腳本處於暫停狀態，核心功能未啟動。`);
            return;
        }
        injectStyleOverrides();
        toggleCleanModeStyles();
        injectGlobalCustomStyles();

        // Follow-Up Panel (常駐)
        if (GM_getValue('followUpPanelEnabled', DEFAULTS.followUpPanelEnabled)) {
            FollowUpPanel.ensureMounted();
            FollowUpPanel.render();
        }
        Log.info('UI.Init', `所有自定義樣式 (全局/高度/組件屏蔽) 已應用。`);

        // [設定/狀態持久化] 功能：`CACHE_KEYS`。
        const CACHE_KEYS = {
            ASSIGNMENT: 'assignmentLog',
            REPLIED: 'sendButtonClickLog',
            CLAIMS_LOST_PKG: 'claimsLostPkgSendLog',
            BILLING_REBILL: 'billingRebillSendLog',
            TRACKING: 'trackingNumberLog',
            PREFERRED: 'preferredLog'
        };

        GM_registerMenuCommand("清理所有緩存", () => {
            if (!confirm("您確定要清理所有腳本緩存嗎？\n\n這將重置「自動指派」、「聯繫人高亮」和「近期已回复」的歷史記錄。")) {
                Log.info('Core.Cache', '用戶取消了清理緩存操作。');
                return;
            }

            try {
                const allCacheKeys = Object.values(CACHE_KEYS);
                let clearedCount = 0;

                allCacheKeys.forEach(key => {
                    if (GM_getValue(key) !== undefined) {
                        GM_deleteValue(key);
                        clearedCount++;
                    }
                });

                //  同時清理內存中的狀態
                DOM_PATH_CACHE = {};
                completedTasksRegister.clear();

                const message = `成功清理了 ${clearedCount} 個緩存項及當前內存狀態。`;
                showGlobalToast(message, 'check');
                Log.info('Core.Cache', `用戶手動清理緩存，共清理 ${clearedCount} 個項目: [${allCacheKeys.join(', ')}]`);

            } catch (error) {
                const errorMessage = "清理緩存時發生錯誤。";
                showGlobalToast(errorMessage, 'error');
                Log.error('Core.Cache', `清理緩存時發生錯誤: ${error.message}`);
            }
        });
        GM_registerMenuCommand("設置", openSettingsModal);
        initGlobalClickListener();
        startUrlMonitoring();
        monitorUrlChanges();
        Log.info('Core.Init', `核心功能初始化完成。`);
    }

    start();
})();
