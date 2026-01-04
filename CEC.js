// ==UserScript==
// @name         CEC功能強化
// @namespace    CEC Enhanced
// @version      V70
// @description  快捷操作按鈕、自動指派、IVP快速查詢、聯繫人彈窗優化、按鈕警示色、賬戶檢測、組件屏蔽、設置菜單、自動IVP查詢、URL精準匹配、快捷按鈕可編輯、(Related Cases)數據提取與增強排序功能、關聯案件提取器、回覆case快捷按鈕、已跟進case提示、全局暫停/恢復功能。
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
V62 > V70
更新內容：
-添加開查/賬單case提示
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

(function () {
    'use strict';

    // =================================================================================
    // 模塊：專業日誌記錄器
    // 用途：提供分級日誌輸出功能，方便調試與錯誤追蹤
    // =================================================================================
    const Log = {
        levels: {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3,
            NONE: 4
        },
        // 默認日誌級別，0為DEBUG
        level: 0,

        /**
         * 內部日誌處理函數
         * @param {number} level 日誌級別
         * @param {string} levelStr 級別標籤
         * @param {string} module 模塊名稱
         * @param {string} message 日誌內容
         * @param {Function} logFn 控制台輸出函數
         */
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
    // 模塊：全局配置與狀態管理
    // 用途：定義所有功能的默認參數及性能相關配置
    // =================================================================================
    const DEFAULTS = {
        followUpPanelEnabled: false,
        notifyOnRepliedCaseEnabled: false,
        pcaDoNotClosePromptEnabled: false,
        pcaCaseListHintEnabled: false,
        autoSwitchEnabled: true,
        autoAssignUser: '',
        sentinelCloseEnabled: true,
        blockIVPCard: false,
        autoIVPQueryEnabled: false,
        autoWebQueryEnabled: false,
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
        templateInsertionMode: 'logo',
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
            name: "賬單",
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
        }, ]
    };

    // 性能配置參數
    const PERF_CONFIG = {
        // 心跳檢測間隔：10000毫秒 (10秒)
        HEARTBEAT_INTERVAL_MS: 10000,
        // URL變化事件防抖延遲：350毫秒
        URL_CHANGE_DEBOUNCE_MS: 350,
    };

    // 全局狀態變量初始化
    let isScriptPaused = GM_getValue('isScriptPaused', false);
    let lastUrl = '';
    let foundTrackingNumber = null;
    let ivpWindowHandle = null;
    let webWindowHandle = null;
    let globalToastTimer = null;
    let globalScannerId = null;
    let sendButtonBypassNextClick = false;
    let sendButtonPendingSpecialType = null;
    let pcaCaseListOriginalRowKeys = null;
    let pcaCaseListIsSorted = false;

    // =================================================================================
    // 模塊：頁面資源註冊器
    // 用途：統一管理Observer、Timeout和Interval，確保頁面切換時能正確清理資源
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

            this.observers.forEach(obs => {
                try {
                    obs.disconnect();
                } catch (e) {
                    /* 忽略錯誤 */
                }
            });
            this.observers.clear();

            this.timeouts.forEach(id => {
                try {
                    clearTimeout(id);
                } catch (e) {
                    /* 忽略錯誤 */
                }
            });
            this.timeouts.clear();

            this.intervals.forEach(id => {
                try {
                    clearInterval(id);
                } catch (e) {
                }
            });
            this.intervals.clear();

            Log.info('Core.Registry', `頁面級資源已清理完成 (reason: ${reason}) [observers: ${observerCount}, timeouts: ${timeoutCount}, intervals: ${intervalCount}]。`);
        }
    };

    // =================================================================================
    // 模塊：跟進面板 (Follow-Up Panel)
    // 用途：管理右下角懸浮面板及Case詳情頁的跟進時間設置功能
    // =================================================================================
    const FollowUpPanel = (() => {
        const FOLLOW_UP_DEBUG = false;
        const dlog = (msg) => {
            if (FOLLOW_UP_DEBUG) Log.debug('FU.Panel', msg);
        };
        const dwarn = (msg) => {
            if (FOLLOW_UP_DEBUG) Log.warn('FU.Panel', msg);
        };

        const PANEL_RIGHT = 12;
        const PANEL_BOTTOM = 60;
        const DEFAULT_PANEL_WIDTH = 510;
        const MIN_PANEL_WIDTH = 320;
        const MAX_PANEL_WIDTH_RATIO = 0.8;
        const DEFAULT_PANEL_HEIGHT = 420;
        const MIN_PANEL_HEIGHT = 180;
        const MAX_PANEL_HEIGHT_RATIO = 0.8;

        const KEY_ITEMS = 'FU_PANEL_ITEMS_V1';
        const KEY_UI = 'FU_PANEL_UI_V4';
        const PANEL_ID = 'fuPanelRoot';
        const BTN_ID_PREFIX = 'fu_caseFollowTimeBtn';
        const POPOVER_ID = 'fuPopover';
        const DROPDOWN_ID = 'fuFollowTimeMenu';

        const DEFAULT_DUE_HOUR = 23;
        const DEFAULT_DUE_MIN = 59;

        const QUICK_DAYS_CASE_OTHER = [0, 1, 7, 14];
        const QUICK_DAYS_PANEL_PICKER = [1, 3, 7, 14];

        const UW = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
        let wsReady = false;
        let wsInit = false;
        let wsCmp = null;
        let wsQueue = [];

        let stylesInjected = false;
        let sanitizedOnce = false;

        const gmGet = (key, fallback) => {
            try {
                return GM_getValue(key, fallback);
            } catch (e) {
                return fallback;
            }
        };
        const gmSet = (key, val) => {
            try {
                GM_setValue(key, val);
            } catch (e) {
            }
        };

        const startOfDay = (d) => {
            const x = d ? new Date(d) : new Date();
            x.setHours(0, 0, 0, 0);
            return x;
        };
        const endOfDayWithOffsetDays = (offsetDays) => {
            const base = startOfDay(new Date());
            base.setDate(base.getDate() + offsetDays);
            base.setHours(DEFAULT_DUE_HOUR, DEFAULT_DUE_MIN, 59, 999);
            return base.getTime();
        };
        const dayDiffFromToday = (dueAtMs) => {
            const today0 = startOfDay(new Date()).getTime();
            const due0 = startOfDay(new Date(dueAtMs)).getTime();
            return Math.round((due0 - today0) / 86400000);
        };
        const bucketOf = (dueAtMs) => {
            const diff = dayDiffFromToday(dueAtMs);
            if (diff <= 0) return 'today';
            if (diff === 1) return 'tomorrow';
            if (diff === 2) return 'dayafter';
            return 'later';
        };
        const bucketTitle = (key) => {
            if (key === 'today') return '今天跟進';
            if (key === 'tomorrow') return '明天跟進';
            if (key === 'dayafter') return '後天跟進';
            if (key === 'later') return '往後跟進';
            return key;
        };

        const getCaseId = () => getCaseIdFromUrl(location.href);

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

        const getCaseNumberFromVisibleHeader = () => {
            const selectors = [
                'slot[name="primaryField"] lightning-formatted-text',
                'slot[name="primaryField"]',
                '.primaryFieldRow slot[name="primaryField"] lightning-formatted-text',
                '.primaryFieldRow slot[name="primaryField"]',
                'h1 slot[name="primaryField"] lightning-formatted-text',
                'h1 slot[name="primaryField"]'
            ];

            for (const sel of selectors) {
                let candidates = [];
                try {
                    candidates = findAllElementsInShadows(document.body, sel) || [];
                } catch (e) {
                    candidates = [];
                }
                for (const el of candidates) {
                    try {
                        if (!isElementVisible(el)) continue;
                    } catch (e) {
                        // 忽略
                    }
                    const t = (el.textContent || '').trim();
                    const n = normalizeCaseNo(t);
                    if (n) return n;
                }
            }

            const title = (document.title || '').trim();
            if (title) {
                const left = title.split('\n')[0].trim();
                const left2 = left.split(' - ')[0].trim();
                return normalizeCaseNo(left2) || normalizeCaseNo(left);
            }
            return null;
        };

        const buildCaseUrl = (caseId) => caseId ? `${location.origin}/lightning/r/Case/${caseId}/view` : null;

        const auraCb = (fn) => {
            try {
                if (UW.$A && typeof UW.$A.getCallback === 'function') return UW.$A.getCallback(fn);
            } catch (e) {
                /* 忽略錯誤 */
            }
            return fn;
        };

        const wsFlush = () => {
            if (!wsReady || !wsQueue.length) return;
            const q = wsQueue.slice();
            wsQueue = [];
            q.forEach((f) => {
                try {
                    f();
                } catch (e) {
                    /* 忽略錯誤 */
                }
            });
        };

        const wsEnsure = () => {
            if (wsReady || wsInit) return;
            wsInit = true;
            try {
                if (!UW.$A || typeof UW.$A.createComponent !== 'function' || typeof UW.$A.getRoot !== 'function') {
                    wsInit = false;
                    return;
                }
                UW.$A.createComponent('lightning:workspaceAPI', {}, auraCb((cmp, status) => {
                    if (status !== 'SUCCESS' || !cmp) {
                        wsInit = false;
                        return;
                    }
                    wsCmp = cmp;
                    try {
                        const root = UW.$A.getRoot();
                        if (root && typeof root.get === 'function' && typeof root.set === 'function') {
                            let body = root.get('v.body');
                            if (!Array.isArray(body)) body = body ? [body] : [];
                            body.push(cmp);
                            root.set('v.body', body);
                        }
                    } catch (e2) {
                        /* 忽略錯誤 */
                    }
                    wsReady = true;
                    wsInit = false;
                    wsFlush();
                }));
                // 2000毫秒超時重置
                setTimeout(() => {
                    if (!wsReady && wsInit) wsInit = false;
                }, 2000);
            } catch (e) {
                wsInit = false;
            }
        };

        const openCaseInConsoleTab = (caseId, focus = true) => {
            if (!caseId) return;
            wsEnsure();
            const url = `/lightning/r/Case/${caseId}/view`;
            const doOpen = () => {
                try {
                    if (wsReady && wsCmp && typeof wsCmp.openTab === 'function') {
                        wsCmp.openTab({
                            url,
                            focus: focus !== false
                        });
                        return true;
                    }
                } catch (e) {
                    /* 忽略錯誤 */
                }
                return false;
            };
            if (wsReady) {
                if (!doOpen()) window.open(buildCaseUrl(caseId), '_blank');
                return;
            }
            wsQueue.push(() => {
                if (!doOpen()) window.open(buildCaseUrl(caseId), '_blank');
            });
        };

        const sanitizeItems = (items) => {
            const map = Object.create(null);
            for (const it of (items || [])) {
                if (!it || !it.caseId || !it.dueAt) continue;
                const cid = String(it.caseId);
                const score = Number(it.updatedAt || it.createdAt || 0);
                const cn = normalizeCaseNo(it.caseNo) || it.caseNo || '';
                const clean = {
                    id: it.id || (cid + '_' + score),
                    caseId: cid,
                    caseNo: cn,
                    note: it.note || '',
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
            for (const k in map) {
                if (map[k]) {
                    delete map[k].__score;
                    out.push(map[k]);
                }
            }
            out.sort((a, b) => (a.dueAt - b.dueAt) || (a.createdAt - b.createdAt));
            return out;
        };

        const loadItems = () => {
            const raw = gmGet(KEY_ITEMS, '[]');
            let arr;
            try {
                arr = JSON.parse(raw);
                if (!Array.isArray(arr)) arr = [];
            } catch (e) {
                arr = [];
            }
            if (!sanitizedOnce) {
                sanitizedOnce = true;
                const clean = sanitizeItems(arr);
                gmSet(KEY_ITEMS, JSON.stringify(clean));
                return clean;
            }
            return arr;
        };

        const saveItems = (items) => gmSet(KEY_ITEMS, JSON.stringify(items || []));

        const upsertItem = ({
            caseId,
            caseNo,
            dueAt
        }) => {
            if (!caseId || !caseNo || !dueAt) return;
            const items = sanitizeItems(loadItems());
            const now = Date.now();
            const cn = normalizeCaseNo(caseNo) || caseNo;
            const idx = items.findIndex((x) => x && x.caseId === caseId);
            if (idx >= 0) {
                items[idx].dueAt = dueAt;
                items[idx].caseNo = cn;
                items[idx].updatedAt = now;
            } else {
                items.push({
                    id: `${caseId}_${now}`,
                    caseId,
                    caseNo: cn,
                    note: '',
                    dueAt,
                    createdAt: now,
                    updatedAt: now
                });
            }
            saveItems(sanitizeItems(items));
        };

        const deleteItem = (caseId) => {
            const items = sanitizeItems(loadItems());
            saveItems(items.filter((it) => it && it.caseId !== caseId));
        };

        const updateNote = (caseId, note) => {
            const items = sanitizeItems(loadItems());
            for (const it of items) {
                if (it && it.caseId === caseId) {
                    it.note = note || '';
                    it.updatedAt = Date.now();
                    break;
                }
            }
            saveItems(items);
        };

        const updateDueAt = (caseId, dueAt) => {
            const items = sanitizeItems(loadItems());
            for (const it of items) {
                if (it && it.caseId === caseId) {
                    it.dueAt = dueAt;
                    it.updatedAt = Date.now();
                    break;
                }
            }
            saveItems(items);
        };

        const groupedSortedItems = () => {
            const items = sanitizeItems(loadItems());
            const groups = {
                today: [],
                tomorrow: [],
                dayafter: [],
                later: []
            };
            items.forEach((it) => {
                const k = bucketOf(it.dueAt);
                if (!groups[k]) groups[k] = [];
                groups[k].push(it);
            });
            return groups;
        };

        const removePopover = () => {
            const el = document.getElementById(POPOVER_ID);
            if (el) el.remove();
        };
        const removeDropdown = () => {
            const el = document.getElementById(DROPDOWN_ID);
            if (el) el.remove();
        };
        const removeAllFloating = () => {
            removePopover();
            removeDropdown();
        };

        const placeNear = (anchorEl, popEl, preferAbove, width = 260, height = 240) => {
            const rect = anchorEl.getBoundingClientRect();
            const w = width;
            const h = height;
            const left = Math.max(10, Math.min(window.innerWidth - (w + 10), rect.left));
            let top;
            if (preferAbove) {
                top = rect.top - h;
                if (top < 10) top = rect.bottom + 8;
            } else {
                top = rect.bottom + 8;
                if (top + h > window.innerHeight - 10) top = Math.max(10, rect.top - h);
            }
            popEl.style.left = `${left}px`;
            popEl.style.top = `${top}px`;
        };

        const attachOutsideClose = (popEl, anchorEl, removeFn) => {
            // 0毫秒延時確保事件綁定
            setTimeout(() => {
                const onDoc = (evt) => {
                    if (!popEl.contains(evt.target) && evt.target !== anchorEl) {
                        removeFn();
                        document.removeEventListener('mousedown', onDoc, true);
                    }
                };
                document.addEventListener('mousedown', onDoc, true);
            }, 0);
        };

        const attachOutsideCloseWithin = (popEl, containerEl, removeFn) => {
            // 0毫秒延時確保事件綁定
            setTimeout(() => {
                const onDoc = (evt) => {
                    if (containerEl && !containerEl.contains(evt.target)) {
                        removeFn();
                        document.removeEventListener('mousedown', onDoc, true);
                    }
                };
                document.addEventListener('mousedown', onDoc, true);
            }, 0);
        };

        let __fuHeaderHintTimer1 = null;
        let __fuHeaderHintTimer2 = null;
        let __fuHeaderHintTimer3 = null;
        let __fuHeaderOriginalTitle = null;

        const getHeaderTitleEl = () => {
            const root = document.getElementById(PANEL_ID);
            if (!root) return null;
            return root.querySelector('.fu-title');
        };

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

            requestAnimationFrame(() => {
                titleEl.style.opacity = '1';
            });

            // 1800毫秒後開始淡出
            __fuHeaderHintTimer1 = setTimeout(() => {
                titleEl.style.opacity = '0';
            }, 1800);

            // 2000毫秒後恢復標題
            __fuHeaderHintTimer2 = setTimeout(() => {
                titleEl.textContent = __fuHeaderOriginalTitle || '跟進面板';
                titleEl.style.opacity = '1';
            }, 2000);

            // 1050毫秒清理transition
            __fuHeaderHintTimer3 = setTimeout(() => {
                titleEl.style.transition = '';
            }, 1050);
        };

        const flashHeaderHintByDueAt = (dueAt) => {
            const key = bucketOf(dueAt);
            const title = bucketTitle(key);
            flashHeaderHint(`+1 ${title}`);
        };

        const buildLaterPickerContent = (onPickDays, quickDays) => {
            const days = (Array.isArray(quickDays) && quickDays.length) ? quickDays : [3, 4, 7, 14];
            const wrap = document.createElement('div');

            const title = document.createElement('div');
            title.className = 'fu-pop-title';
            title.textContent = '選擇天數';
            wrap.appendChild(title);

            const grid = document.createElement('div');
            grid.className = 'fu-pop-grid';
            days.forEach((d) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'fu-pill';
                btn.textContent = (d === 0) ? 'Today' : `T+${d}`;
                btn.addEventListener('click', () => onPickDays(d));
                grid.appendChild(btn);
            });
            wrap.appendChild(grid);

            const row = document.createElement('div');
            row.className = 'fu-pop-row';

            const input = document.createElement('input');
            input.type = 'number';
            input.step = '1';
            input.placeholder = '自定 N（0=Today，1=T+1）';
            row.appendChild(input);

            const ok = document.createElement('button');
            ok.type = 'button';
            ok.className = 'fu-btn-primary';
            ok.textContent = '確定';

            const commit = () => {
                const n = parseInt(input.value, 10);
                if (!Number.isFinite(n)) {
                    input.focus();
                    return;
                }
                if (n < 0) {
                    input.value = '0';
                    input.focus();
                    return;
                }
                onPickDays(n);
            };

            ok.addEventListener('click', commit);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    commit();
                }
            });

            row.appendChild(ok);
            wrap.appendChild(row);
            return wrap;
        };

        const showChangeMenu = (anchorEl, onPickDays) => {
            removePopover();
            removeDropdown();
            const pop = document.createElement('div');
            pop.id = POPOVER_ID;
            pop.className = 'fu-popover-global';
            placeNear(anchorEl, pop, true, 280, 260);

            const title = document.createElement('div');
            title.className = 'fu-pop-title';
            title.textContent = '更改跟進時間';
            pop.appendChild(title);

            const chips = document.createElement('div');
            chips.className = 'fu-pop-chips';

            const mkChip = (text, days) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'fu-chip';
                b.textContent = text;
                b.addEventListener('click', () => {
                    onPickDays(days);
                    removePopover();
                });
                return b;
            };

            chips.appendChild(mkChip('Today', 0));
            chips.appendChild(mkChip('T+2', 2));
            chips.appendChild(mkChip('T+10', 10));
            pop.appendChild(chips);

            pop.appendChild(buildLaterPickerContent((picked) => {
                onPickDays(picked);
                removePopover();
            }, QUICK_DAYS_PANEL_PICKER));

            document.body.appendChild(pop);
            attachOutsideClose(pop, anchorEl, removePopover);
        };

        const renderOtherPickerInMenu = (menuEl, anchorEl, onPickDays) => {
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

            const content = buildLaterPickerContent((picked) => {
                removeDropdown();
                onPickDays(picked);
            }, QUICK_DAYS_CASE_OTHER);

            content.className = 'fu-ddcontent';
            menuEl.appendChild(content);
            menuEl.style.minWidth = '300px';
        };

        const buildFollowTimeMenu = (menuEl, anchorEl, onPick) => {
            while (menuEl.firstChild) menuEl.removeChild(menuEl.firstChild);
            menuEl.style.minWidth = '';
            menuEl.style.width = '';
            menuEl.__onPick = onPick;

            const addItem = (label, value) => {
                const item = document.createElement('div');
                item.className = 'fu-dditem';
                item.textContent = label;
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (value === 'other') {
                        renderOtherPickerInMenu(menuEl, anchorEl, (days) => onPick('other', days));
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
                `#${PANEL_ID} .fu-header { position: relative; background: #0176D3; color: #fff; display: grid; grid-template-columns: 1fr auto; align-items: center; padding: 5px 10px; user-select: none; cursor: pointer; }`,
                `#${PANEL_ID} .fu-header-inner { grid-column: 1; justify-self: center; display: inline-flex; align-items: center; justify-content: center; gap: 8px; max-width: 100%; white-space: nowrap; overflow: hidden; }`,
                `#${PANEL_ID} .fu-title { font-weight: 700; font-size: 14px; letter-spacing: .4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; writing-mode: horizontal-tb; }`,
                `#${PANEL_ID} .fu-arrow { grid-column: 2; justify-self: end; width: 26px; height: 26px; border-radius: 8px; border: 1px solid rgba(255,255,255,.45); display: inline-flex; align-items: center; justify-content: center; font-size: 14px; pointer-events: none; }`,
                `#${PANEL_ID} .fu-body { padding: 8px 8px 10px; overflow: auto; }`,
                `#${PANEL_ID} .fu-panel.fu-collapsed { width: 150px !important; }`,
                `#${PANEL_ID} .fu-panel.fu-collapsed .fu-body { height: 0 !important; opacity: 0; padding: 0 !important; overflow: hidden; }`,
                `#${PANEL_ID} .fu-section { margin-top: 8px; }`,
                `#${PANEL_ID} .fu-section-title { font-weight: 700; font-size: 12px; color: rgba(0,0,0,.72); padding: 8px 8px; background: rgba(0,0,0,.03); border-radius: 10px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }`,
                `#${PANEL_ID} .fu-section-title:hover { background: rgba(0,0,0,.05); }`,
                `#${PANEL_ID} .fu-list { margin-top: 6px; display: flex; flex-direction: column; gap: 8px; }`,
                `#${PANEL_ID} .fu-row { display: flex; gap: 8px; align-items: center; padding: 6px; border: 1px solid rgba(0,0,0,.08); border-radius: 12px; background: #fff; }`,
                `#${PANEL_ID} .fu-case { font-weight: 700; font-size: 12px; color: #0b5cab; text-decoration: none; display: inline-block; flex: 0 0 auto; max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }`,
                `#${PANEL_ID} .fu-note { flex: 1 1 auto; min-width: 110px; font-size: 12px; padding: 6px 8px; border-radius: 10px; border: 1px solid rgba(0,0,0,.12); outline: none; }`,
                `#${PANEL_ID} .fu-note:focus { border-color: rgba(1,118,211,.7); box-shadow: 0 0 0 2px rgba(1,118,211,.12); }`,
                `#${PANEL_ID} .fu-iconbtn { width: 28px; height: 28px; border-radius: 10px; border: 1px solid rgba(0,0,0,.12); background: #fff; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; line-height: 1; flex: 0 0 auto; }`,
                '.fu-popover-global, .fu-ddmenu { position: fixed; z-index: 2147483647; background: #fff; border: 1px solid rgba(0,0,0,.12); border-radius: 12px; box-shadow: 0 12px 30px rgba(0,0,0,.18); padding: 12px; pointer-events: auto; }',
                '.fu-pop-title { font-weight: 800; font-size: 12px; margin-bottom: 8px; color: rgba(0,0,0,.78); }',
                '.fu-pop-chips { display: flex; gap: 8px; margin-bottom: 10px; }',
                '.fu-chip { flex: 1 1 auto; border: 1px solid rgba(1,118,211,.35); background: rgba(1,118,211,.08); color: #014486; border-radius: 999px; padding: 6px 10px; cursor: pointer; font-size: 12px; font-weight: 700; }',
                '.fu-chip:hover { background: rgba(1,118,211,.12); }',
                '.fu-pop-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }',
                '.fu-pill { border: 1px solid rgba(1,118,211,.28); background: rgba(1,118,211,.06); color: #014486; border-radius: 10px; padding: 8px 0; cursor: pointer; font-size: 12px; font-weight: 800; }',
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
                `#${PANEL_ID} .fu-section-title[data-sec="dayafter"] { background: #f87800 !important; color: #1f1f1f !important; }`,
                `#${PANEL_ID} .fu-section-title[data-sec="later"] { background: #006860 !important; color: #fff !important; }`,
                `#${PANEL_ID} .fu-section-title[data-sec]:hover { filter: brightness(1.05); }`,
            ].join('\n');

            GM_addStyle(css);
        };

        const loadUI = () => {
            const raw = gmGet(KEY_UI, '{}');
            try {
                const obj = JSON.parse(raw);
                return (obj && typeof obj === 'object') ? obj : {};
            } catch (e) {
                return {};
            }
        };
        const saveUI = (ui) => gmSet(KEY_UI, JSON.stringify(ui || {}));

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
            arrow.textContent = collapsed ? '▴' : '▾';
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

            // 寬度調整
            let resizingW = false;
            let startX = 0;
            let startW = 0;
            const onMoveW = (ev) => {
                if (!resizingW) return;
                const dx = startX - ev.clientX;
                const maxW2 = Math.floor(window.innerWidth * MAX_PANEL_WIDTH_RATIO);
                let newW = startW + dx;
                newW = Math.max(MIN_PANEL_WIDTH, Math.min(maxW2, newW));
                panel.style.width = `${newW}px`;
            };
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
                resizingW = true;
                startX = ev.clientX;
                startW = panel.getBoundingClientRect().width;
                document.addEventListener('mousemove', onMoveW, true);
                document.addEventListener('mouseup', onUpW, true);
                ev.preventDefault();
                ev.stopPropagation();
            });

            // 高度調整
            let resizingH = false;
            let startY = 0;
            let startH = 0;
            const onMoveH = (ev) => {
                if (!resizingH) return;
                const dy = startY - ev.clientY;
                const maxH2 = Math.floor(window.innerHeight * MAX_PANEL_HEIGHT_RATIO);
                let newH = startH + dy;
                newH = Math.max(MIN_PANEL_HEIGHT, Math.min(maxH2, newH));
                body.style.height = `${newH}px`;
            };
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
                resizingH = true;
                startY = ev.clientY;
                startH = body.getBoundingClientRect().height;
                document.addEventListener('mousemove', onMoveH, true);
                document.addEventListener('mouseup', onUpH, true);
                ev.preventDefault();
                ev.stopPropagation();
            });

            wsEnsure();
        };

        const buildRow = (it) => {
            const row = document.createElement('div');
            row.className = 'fu-row';

            const caseNoDisplay = normalizeCaseNo(it.caseNo) || it.caseNo || '(unknown)';
            const link = document.createElement('a');
            link.className = 'fu-case';
            link.href = buildCaseUrl(it.caseId) || '#';
            link.textContent = caseNoDisplay;
            link.addEventListener('click', (e) => {
                e.preventDefault();
                openCaseInConsoleTab(it.caseId, true);
            });
            row.appendChild(link);

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
            btnChange.title = '更改跟進時間';
            btnChange.textContent = '📅';
            btnChange.addEventListener('click', (ev) => {
                ev.stopPropagation();
                showChangeMenu(btnChange, (pickedDays) => {
                    const dueAt = endOfDayWithOffsetDays(pickedDays);
                    updateDueAt(it.caseId, dueAt);
                    renderPanel();
                });
            });
            row.appendChild(btnChange);

            const btnDel = document.createElement('button');
            btnDel.type = 'button';
            btnDel.className = 'fu-iconbtn';
            btnDel.title = '刪除';
            btnDel.textContent = '✕';
            btnDel.addEventListener('click', () => {
                deleteItem(it.caseId);
                renderPanel();
            });
            row.appendChild(btnDel);

            return row;
        };

        const renderPanel = () => {
            ensurePanel();
            const root = document.getElementById(PANEL_ID);
            if (!root) return;

            const panel = root.querySelector('.fu-panel');
            const arrow = root.querySelector('.fu-arrow');
            const body = root.querySelector('.fu-body');
            const ui = loadUI();
            const collapsed = !!ui.collapsed;
            const secCollapsed = ui.secCollapsed || {};

            if (panel) {
                if (collapsed) panel.classList.add('fu-collapsed');
                else panel.classList.remove('fu-collapsed');
            }
            if (arrow) arrow.textContent = collapsed ? '▴' : '▾';
            if (!body) return;

            if (collapsed) {
                body.style.opacity = '0';
                body.style.height = '0px';
                while (body.firstChild) body.removeChild(body.firstChild);
                return;
            }

            body.style.opacity = '1';
            body.style.height = `${Number(ui.height || DEFAULT_PANEL_HEIGHT)}px`;
            while (body.firstChild) body.removeChild(body.firstChild);

            const groups = groupedSortedItems();
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
                list.forEach((it) => ul.appendChild(buildRow(it)));
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
        };

        const getActiveFollowWrap = () => {
            const selector = 'div[data-target-selection-name="sfdc:StandardButton.Case.Follow"]';

            const firstVisible = findElementInShadows(document.body, selector);
            if (firstVisible) return firstVisible;

            const all = findAllElementsInShadows(document.body, selector);
            for (const el of all) {
                try {
                    if (isElementVisible(el)) return el;
                } catch (e) {
                    /* 忽略錯誤 */
                }
            }
            return null;
        };

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
            } catch (e) {
                /* 忽略錯誤 */
            }

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

                if (document.getElementById(DROPDOWN_ID)) {
                    removeDropdown();
                    return;
                }

                showFollowTimeDropdown(btn, (choice, otherDays) => {
                    const currentCaseId = btn.dataset.caseId || getCaseId();
                    const caseNo = getCaseNumberFromVisibleHeader();
                    if (!currentCaseId || !caseNo) {
                        showGlobalToast('未能取得 Case 號碼，請稍後再試');
                        dwarn('CaseId/CaseNo missing, skip upsert');
                        return;
                    }
                    const dueAt = (choice === 'other') ? endOfDayWithOffsetDays(otherDays) : endOfDayWithOffsetDays(choice);
                    upsertItem({
                        caseId: currentCaseId,
                        caseNo,
                        dueAt
                    });
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

        const ensureCaseButton = async () => {
            if (ensureCaseFollowTimeButton()) return true;
            try {
                // 12000毫秒等待元素超時
                await waitForElementWithObserver(document.body, 'div[data-target-selection-name="sfdc:StandardButton.Case.Follow"]', 12000);
            } catch (e) {
                // 忽略超時
            }
            return ensureCaseFollowTimeButton();
        };

        const ensureMounted = () => {
            ensurePanel();
        };

        const unmount = () => {
            removeAllFloating();
            const root = document.getElementById(PANEL_ID);
            if (root) root.remove();
        };

        return {
            ensureMounted,
            render: renderPanel,
            ensureCaseButton,
            removeAllFloating,
            unmount,
        };
    })();

    const processedModals = new WeakSet();
    const processedCaseUrlsInSession = new Set();
    let injectedIWTButtons = {};
    let assignButtonObserver = null;
    let iwtModuleObserver = null;
    const fieldsInDesiredOrder = ['Link Contact', 'Editable', 'Contact Source', 'First Name', 'Last Name', 'Account Number', 'Email', 'Phone', 'Mobile Phone', 'Other Phone', 'Account Name'];

    // =================================================================================
    // 模塊：核心工具函數
    // 用途：提供通用的DOM操作、時間處理、URL解析等基礎功能
    // =================================================================================

    /**
     * 從URL中提取18位Case ID
     */
    function getCaseIdFromUrl(urlString) {
        if (!urlString) return null;
        const match = urlString.match(/\/Case\/([a-zA-Z0-9]{18})/);
        if (match && match[1]) {
            return match[1];
        }
        Log.warn('Core.Utils', `未能從 URL 中提取 Case ID: ${urlString}`);
        return null;
    }

    /**
     * 規範化Case URL
     */
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

    /**
     * 檢查元素是否可見
     */
    function isElementVisible(el) {
        return el.offsetParent !== null;
    }

    /**
     * 在Shadow DOM中查找單個元素
     */
    function findElementInShadows(root, selector) {
        if (!root) return null;
        if (root.shadowRoot) {
            const el = findElementInShadows(root.shadowRoot, selector);
            if (el) return el;
        }
        const el = root.querySelector(selector);
        if (el && isElementVisible(el)) {
            return el;
        }
        for (const child of root.querySelectorAll('*')) {
            if (child.shadowRoot) {
                const nestedEl = findElementInShadows(child.shadowRoot, selector);
                if (nestedEl) return nestedEl;
            }
        }
        return null;
    }

    /**
     * 在Shadow DOM中查找所有匹配元素
     */
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

    /**
     * 輪詢等待元素出現
     * @param {number} timeout 超時時間（毫秒），默認10000ms
     */
    function waitForElement(root, selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            // 輪詢間隔：500毫秒
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
            }, 500);
        });
    }

    /**
     * 防抖函數
     * @param {number} wait 延遲執行時間（毫秒）
     */
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    /**
     * 清理過期緩存
     * @param {number} ttlMs 過期時間（毫秒）
     */
    function purgeExpiredCacheEntries(cacheObj, ttlMs) {
        if (!cacheObj || typeof cacheObj !== 'object') {
            return {
                cache: {},
                changed: false,
                removed: 0
            };
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
        return {
            cache: cacheObj,
            changed,
            removed
        };
    }

    /**
     * 查找第一個匹配的Shadow DOM元素
     */
    function findFirstElementInShadows(root, selectors) {
        if (!Array.isArray(selectors) || selectors.length === 0) return null;
        for (const selector of selectors) {
            const el = findElementInShadows(root, selector);
            if (el) return el;
        }
        return null;
    }

    // 緩存策略定義
    const CACHE_POLICY = {
        REPLIED: {
            KEY: 'sendButtonClickLog',
            // 10小時
            TTL_MS: 10 * 60 * 60 * 1000,
            // 24小時
            LIST_TTL_MS: 24 * 60 * 60 * 1000,
            // 24小時
            PURGE_MS: 24 * 60 * 60 * 1000
        },
        CLAIMS_LOST_PKG: {
            KEY: 'claimsLostPkgSendLog',
            // 12天
            TTL_MS: 12 * 24 * 60 * 60 * 1000,
            // 12天
            LIST_TTL_MS: 12 * 24 * 60 * 60 * 1000,
            // 12天
            PURGE_MS: 12 * 24 * 60 * 60 * 1000
        },
        BILLING_REBILL: {
            KEY: 'billingRebillSendLog',
            // 10天
            TTL_MS: 10 * 24 * 60 * 60 * 1000,
            // 10天
            LIST_TTL_MS: 10 * 24 * 60 * 60 * 1000,
            // 10天
            PURGE_MS: 10 * 24 * 60 * 60 * 1000
        },
        TRACKING: {
            KEY: 'trackingNumberLog',
            // 60分鐘
            TTL_MS: 60 * 60 * 1000
        },
        ASSIGNMENT: {
            KEY: 'assignmentLog',
            // 60分鐘
            TTL_MS: 60 * 60 * 1000
        }
    };

    // =================================================================================
    // 模塊：繁簡轉換引擎
    // 用途：處理文本的繁簡體相互轉換，並修正特定詞組
    // =================================================================================
    const ChineseConverter = {
        s_chars: null,
        t_chars: null,
        s2t_map: null,
        t2s_map: null,

        s2t_fix: {
            '繫統': '系統',
            '頭發': '頭髮',
        },

        t2s_fix: {},

        init: function () {
            this.s_chars = '系为尝钟万与丑专业丛东丝丢两严丧个丬丰临为丽举么义乌乐乔习乡书买乱争于亏云亘亚产亩亲亵亸亿仅从仑仓仪们价众优伙会伛伞伟传伤伥伦伧伪伫体余佣佥侠侣侥侦侧侨侩侪侬俣俦俨俩俪俭债倾偬偻偾偿傥傧储傩儿兑兖党兰关兴兹养兽冁内冈册写军农冢冯冲决况冻净凄凉凌减凑凛几凤凫凭凯击凼凿刍划刘则刚创删别刬刭刽刿剀剂剐剑剥剧劝办务劢动励劲劳势勋勐勚匀匦匮区医华协单卖卢卤卧卫却卺厂厅历厉压厌厍厕厢厣厦厨厩厮县参叆叇双发变叙叠叶号叹叽吁后吓吕吗吣吨听启吴呒呓呕呖呗员呙呛呜咏咔咙咛咝咤咴咸哌响哑哒哓哔哕哗哙哜哝哟唛唝唠唡唢唣唤唿啧啬啭啮啰啴啸喷喽喾嗫呵嗳嘘嘤嘱噜噼嚣嚯团园囱围囵国图圆圣圹场坂坏块坚坛坜坝坞坟坠垄垅垆垒垦垧垩垫垭垯垱垲垴埘埙埚埝埯堑堕塆墙壮声壳壶壸处备复够头夸夹夺奁奂奋奖奥妆妇妈妩妪妫姗姜娄娅娆娇娈娱娲娴婳婴婵婶媪嫒嫔嫱嬷孙学孪宁宝实宠审宪宫宽宾寝对寻导寿将尔尘尧尴尸尽层屃屉届属屡屦屿岁岂岖岗岘岙岚岛岭岳岽岿峃峄峡峣峤峥峦崂崃崄崭嵘嵚嵛嵝嵴巅巩巯币帅师帏帐帘帜带帧帮帱帻帼幂幞干并广庄庆庐庑库应庙庞废庼廪开异弃张弥弪弯弹强归当录彟彦彻径徕御忆忏忧忾怀态怂怃怄怅怆怜总怼怿恋恳恶恸恹恺恻恼恽悦悫悬悭悯惊惧惨惩惫惬惭惮惯愍愠愤愦愿慑慭憷懑懒懔戆戋戏戗战戬户扎扑扦执扩扪扫扬扰抚抛抟抠抡抢护报担拟拢拣拥拦拧拨择挂挚挛挜挝挞挟挠挡挢挣挤挥挦捞损捡换捣据捻掳掴掷掸掺掼揸揽揿搀搁搂搅携摄摅摆摇摈摊撄撑撵撷撸撺擞攒敌敛数斋斓斗斩断无旧时旷旸昙昼昽显晋晒晓晔晕晖暂暧札术朴机杀杂权条来杨杩杰极构枞枢枣枥枧枨枪枫枭柜柠柽栀栅标栈栉栊栋栌栎栏树栖样栾桊桠桡桢档桤桥桦桧桨桩梦梼梾检棂椁椟椠椤椭楼榄榇榈榉槚槛槟槠横樯樱橥橱橹橼檐檩欢欤欧歼殁殇残殒殓殚殡殴毁毂毕毙毡毵氇气氢氩氲汇汉污汤汹沓沟没沣沤沥沦沧沨沩沪沵泞泪泶泷泸泺泻泼泽泾洁洒洼浃浅浆浇浈浉浊测浍济浏浐浑浒浓浔浕涂涌涛涝涞涟涠涡涢涣涤润涧涨涩淀渊渌渍渎渐渑渔渖渗温游湾湿溃溅溆溇滗滚滞滟滠满滢滤滥滦滨滩滪漤潆潇潋潍潜潴澜濑濒灏灭灯灵灾灿炀炉炖炜炝点炼炽烁烂烃烛烟烦烧烨烩烫烬热焕焖焘煅煳熘爱爷牍牦牵牺犊犟状犷犸犹狈狍狝狞独狭狮狯狰狱狲猃猎猕猡猪猫猬献獭玑玙玚玛玮环现玱玺珉珏珐珑珰珲琎琏琐琼瑶瑷璇璎瓒瓮瓯电画畅畲畴疖疗疟疠疡疬疮疯疱疴痈痉痒痖痨痪痫痴瘅瘆瘗瘘瘪瘫瘾瘿癞癣癫癯皑皱皲盏盐监盖盗盘眍眦眬着睁睐睑瞒瞩矫矶矾矿砀码砖砗砚砜砺砻砾础硁硅硕硖硗硙硚确硷碍碛碜碱碹磙礼祎祢祯祷祸禀禄禅离秃秆种积称秽秾稆税稣稳穑穷窃窍窑窜窝窥窦窭竖竞笃笋笔笕笺笼笾筑筚筛筜筝筹签简箓箦箧箨箩箪箫篑篓篮篱簖籁籴类籼粜粝粤粪粮糁糇紧絷纟纠纡红纣纤纥约级纨纩纪纫纬纭纮纯纰纱纲纳纴纵纶纷纸纹纺纻纼纽纾线绀绁绂练组绅细织终绉绊绋绌绍绎经绐绑绒结绔绕绖绗绘给绚绛络绝绞统绠绡绢绣绤绥绦继绨绩绪绫绬续绮绯绰绱绲绳维绵绶绷绸绹绺绻综绽绾绿缀缁缂缃缄缅缆缇缈缉缊缋缌缍缎缏缐缑缒缓缔缕编缗缘缙缚缛缜缝缞缟缠缡缢缣缤缥缦缧缨缩缪缫缬缭缮缯缰缱缲缳缴缵罂网罗罚罢罴羁羟羡翘翙翚耢耧耸耻聂聋职聍联聩聪肃肠肤肷肾肿胀胁胆胜胧胨胪胫胶脉脍脏脐脑脓脔脚脱脶脸腊腌腘腭腻腼腽腾膑臜舆舣舰舱舻艰艳艹艺节芈芗芜芦苁苇苈苋苌苍苎苏苘苹茎茏茑茔茕茧荆荐荙荚荛荜荞荟荠荡荣荤荥荦荧荨荩荪荫荬荭荮药莅莜莱莲莳莴莶获莸莹莺莼萚萝萤营萦萧萨葱蒇蒉蒋蒌蓝蓟蓠蓣蓥蓦蔷蔹蔺蔼蕲蕴薮藁藓虏虑虚虫虬虮虽虾虿蚀蚁蚂蚕蚝蚬蛊蛎蛏蛮蛰蛱蛲蛳蛴蜕蜗蜡蝇蝈蝉蝎蝼蝾螀螨蟏衅衔补衬衮袄袅袆袜袭袯装裆裈裢裣裤裥褛褴襁襕见观觃规觅视觇览觉觊觋觌觍觎觏觐觑觞触觯詟誉誊讠计订讣认讥讦讧讨让讪讫训议讯记讱讲讳讴讵讶讷许讹论讻讼讽设访诀证诂诃评诅识诇诈诉诊诋诌词诎诏诐译诒诓诔试诖诗诘诙诚诛诜话诞诟诠诡询诣诤该详诧诨诩诪诫诬语诮误诰诱诲诳说诵诶请诸诹诺读诼诽课诿谀谁谂调谄谅谆谇谈谊谋谌谍谎谏谐谑谒谓谔谕谖谗谘谙谚谛谜谝谞谟谠谡谢谣谤谥谦谧谨谩谪谫谬谭谮谯谰谱谲谳谴谵谶谷豮贝贞负贠贡财责贤败账货质贩贪贫贬购贮贯贰贱贲贳贴贵贶贷贸费贺贻贼贽贾贿赀赁赂赃资赅赆赇赈赉赊赋赌赍赎赏赐赑赒赓赔赕赖赗赘赙赚赛赜赝赞赟赠赡赢赣赪赵赶趋趱趸跃跄跖跞践跶跷跸跹跻踊踌踪踬踯蹑蹒蹰蹿躏躜躯车轧轨轩轪轫转轭轮软轰轱轲轳轴轵轶轷轸轹轺轻轼载轾轿辀辁辂较辄辅辆辇辈辉辊辋辌辍辎辏辐辑辒输辔辕辖辗辘辙辚辞辩辫边辽达迁过迈运还这进远违连迟迩迳迹适选逊递逦逻遗遥邓邝邬邮邹邺邻郁郄郏郐郑郓郦郧郸酝酦酱酽酾酿释里鉅鉴銮錾钆钇针钉钊钋钌钍钎钏钐钑钒钓钔钕钖钗钘钙钚钛钝钞钟钠钡钢钣钤钥钦钧钨钩钪钫钬钭钮钯钰钱钲钳钴钵钶钷钸钹钺钻钼钽钾钿铀铁铂铃铄铅铆铈铉铊铋铍铎铏铐铑铒铕铗铘铙铚铛铜铝铞铟铠铡铢铣铤铥铦铧铨铪铫铬铭铮铯铰铱铲铳铴铵银铷铸铹铺铻铼铽链铿销锁锂锃锄锅锆锇锈锉锊锋锌锍锎锏锐锑锒锓锔锕锖锗错锚锜锞锟锠锡锢锣锤锥锦锨锩锫锬锭键锯锰锱锲锳锴锵锶锷锸锹锺锻锼锽锾锿镀镁镂镃镆镇镈镉镊镌镍镎镏镐镑镒镕镖镗镙镚镛镜镝镞镟镠镡镢镣镤镥镦镧镨镩镪镫镬镭镮镯镰镱镲镳镴镶长门闩闪闫闬闭问闯闰闱闲闳间闵闶闷闸闹闺闻闼闽闾闿阀阁阂阃阄阅阆阇阈阉阊阋阌阍阎阏阐阑阒阓阔阕阖阗阘阙阚阛队阳阴阵阶际陆陇陈陉陕陧陨险随隐隶隽难雏雠雳雾霁霉霭靓静靥鞑鞒鞯鞴韦韧韨韩韪韫韬韵页顶顷顸项顺须顼顽顾顿颀颁颂颃预颅领颇颈颉颊颋颌颍颎颏颐频颒颓颔颕颖颗题颙颚颛颜额颞颟颠颡颢颣颤颥颦颧风飏飐飑飒飓飔飕飖飗飘飙飚飞飨餍饤饥饦饧饨饩饪饫饬饭饮饯饰饱饲饳饴饵饶饷饸饹饺饻饼饽饾饿馀馁馂馃馄馅馆馇馈馉馊馋馌馍馎馏馐馑馒馓馔馕马驭驮驯驰驱驲驳驴驵驶驷驸驹驺驻驼驽驾驿骀骁骂骃骄骅骆骇骈骉骊骋验骍骎骏骐骑骒骓骔骕骖骗骘骙骚骛骜骝骞骟骠骡骢骣骤骥骦骧髅髋髌鬓魇魉鱼鱽鱾鱿鲀鲁鲂鲄鲅鲆鲇鲈鲉鲊鲋鲌鲍鲎鲏鲐鲑鲒鲓鲔鲕鲖鲗鲘鲙鲚鲛鲜鲝鲞鲟鲠鲡鲢鲣鲤鲥鲦鲧鲨鲩鲪鲫鲬鲭鲮鲯鲰鲱鲲鲳鲴鲵鲶鲷鲸鲹鲺鲻鲼鲽鲾鲿鳀鳁鳂鳃鳄鳅鳆鳇鳈鳉鳊鳋鳌鳍鳎鳏鳐鳑鳒鳓鳔鳕鳖鳗鳘鳙鳛鳜鳝鳞鳟鳠鳡鳢鳣鸟鸠鸡鸢鸣鸤鸥鸦鸧鸨鸩鸪鸫鸬鸭鸮鸯鸰鸱鸲鸳鸴鸵鸶鸷鸸鸹鸺鸻鸼鸽鸾鸿鹀鹁鹂鹃鹄鹅鹆鹇鹈鹉鹊鹋鹌鹍鹎鹏鹐鹑鹒鹓鹔鹕鹖鹗鹘鹚鹛鹜鹝鹞鹟鹠鹡鹢鹣鹤鹥鹦鹧鹨鹩鹪鹫鹬鹭鹯鹰鹱鹲鹳鹴鹾麦麸黄黉黡黩黪黾鼋鼌鼍鼗鼹齄齐齑齿龀龁龂龃龄龅龆龇龈龉龊龋龌龙龚龛龟志制咨只里范松没闹面准钟别闲乾尽脏拼';
            this.t_chars = '繫為嘗鐘萬與醜專業叢東絲丟兩嚴喪個丬豐臨爲麗舉麼義烏樂喬習鄉書買亂爭於虧雲亙亞產畝親褻嚲億僅從侖倉儀們價衆優夥會傴傘偉傳傷倀倫傖僞佇體餘傭僉俠侶僥偵側僑儈儕儂俁儔儼倆儷儉債傾傯僂僨償儻儐儲儺兒兌兗黨蘭關興茲養獸囅內岡冊寫軍農冢馮沖決況凍淨淒涼凌減湊凜幾鳳鳧憑凱擊凼鑿芻劃劉則剛創刪別剗剄劊劌剴劑剮劍剝劇勸辦務勱動勵勁勞勢勳勐勩勻匭匱區醫華協單賣盧滷臥衛卻巹廠廳歷厲壓厭厙廁廂厴廈廚廄廝縣參靉靆雙發變敘疊葉號嘆嘰籲後嚇呂嗎唚噸聽啓吳嘸囈嘔嚦唄員咼嗆嗚詠咔嚨嚀噝吒咴鹹哌響啞噠嘵嗶噦譁噲嚌噥喲嘜嗊嘮啢嗩唣喚唿嘖嗇囀齧囉嘽嘯噴嘍嚳囁呵噯噓嚶囑嚕噼囂嚯團園囪圍圇國圖圓聖壙場阪壞塊堅壇壢壩塢墳墜壟壠壚壘墾垧堊墊埡墶壋塏堖塒壎堝埝垵塹墮壪牆壯聲殼壺壼處備復夠頭誇夾奪奩奐奮獎奧妝婦媽嫵嫗嬀姍姜婁婭嬈嬌孌娛媧嫺嫿嬰嬋嬸媼嬡嬪嬙嬤孫學孿寧寶實寵審憲宮寬賓寢對尋導壽將爾塵堯尷屍盡層屓屜屆屬屢屨嶼歲豈嶇崗峴嶴嵐島嶺嶽崬巋嶨嶧峽嶢嶠崢巒嶗崍嶮嶄嶸嶔嵛嶁嵴巔鞏巰幣帥師幃帳簾幟帶幀幫幬幘幗冪襆幹並廣莊慶廬廡庫應廟龐廢廎廩開異棄張彌弳彎彈強歸當錄彠彥徹徑徠御憶懺憂愾懷態慫憮慪悵愴憐總懟懌戀懇惡慟懨愷惻惱惲悅愨懸慳憫驚懼慘懲憊愜慚憚慣愍慍憤憒願懾憖憷懣懶懍戇戔戲戧戰戩戶扎撲扦執擴捫掃揚擾撫拋摶摳掄搶護報擔擬攏揀擁攔擰撥擇掛摯攣掗撾撻挾撓擋撟掙擠揮撏撈損撿換搗據捻擄摑擲撣摻摜揸攬撳攙擱摟攪攜攝攄擺搖擯攤攖撐攆擷擼攛擻攢敵斂數齋斕鬥斬斷無舊時曠暘曇晝曨顯晉曬曉曄暈暉暫曖札術樸機殺雜權條來楊榪傑極構樅樞棗櫪梘棖槍楓梟櫃檸檉梔柵標棧櫛櫳棟櫨櫟欄樹棲樣欒桊椏橈楨檔榿橋樺檜槳樁夢檮棶檢櫺槨櫝槧欏橢樓欖櫬櫚櫸檟檻檳櫧橫檣櫻櫫櫥櫓櫞檐檁歡歟歐殲歿殤殘殞殮殫殯毆毀轂畢斃氈毿氌氣氫氬氳匯漢污湯洶沓溝沒灃漚瀝淪滄渢潙滬沵濘淚澩瀧瀘濼瀉潑澤涇潔灑窪浹淺漿澆湞溮濁測澮濟瀏滻渾滸濃潯濜塗涌濤澇淶漣潿渦溳渙滌潤澗漲澀澱淵淥漬瀆漸澠漁瀋滲溫遊灣溼潰濺漵漊潷滾滯灩灄滿瀅濾濫灤濱灘澦漤瀠瀟瀲濰潛瀦瀾瀨瀕灝滅燈靈災燦煬爐燉煒熗點煉熾爍爛烴燭煙煩燒燁燴燙燼熱煥燜燾煅煳熘愛爺牘犛牽犧犢犟狀獷獁猶狽狍獮獰獨狹獅獪猙獄猻獫獵獼玀豬貓蝟獻獺璣璵瑒瑪瑋環現瑲璽珉珏琺瓏璫琿璡璉瑣瓊瑤璦璇瓔瓚甕甌電畫暢畲疇癤療瘧癘瘍癧瘡瘋皰痾癰痙癢瘂癆瘓癇癡癉瘮瘞瘻癟癱癮癭癩癬癲癯皚皺皸盞鹽監蓋盜盤瞘眥矓着睜睞瞼瞞矚矯磯礬礦碭碼磚硨硯碸礪礱礫礎硜硅碩硤磽磑礄確礆礙磧磣鹼碹磙禮禕禰禎禱禍稟祿禪離禿秆種積稱穢穠穭稅穌穩穡窮竊竅窯竄窩窺竇窶豎競篤筍筆筧箋籠籩築篳篩簹箏籌籤簡籙簀篋籜籮簞簫簣簍籃籬籪籟糴類秈糶糲粵糞糧糝餱緊縶糹糾紆紅紂纖紇約級紈纊紀紉緯紜紘純紕紗綱納紝縱綸紛紙紋紡紵紖紐紓線紺紲紱練組紳細織終縐絆紼絀紹繹經紿綁絨結絝繞絰絎繪給絢絳絡絕絞統綆綃絹繡綌綏絛繼綈績緒綾緓續綺緋綽鞝緄繩維綿綬繃綢綯綹綣綜綻綰綠綴緇緙緗緘緬纜緹緲緝縕繢緦綞緞緶線緱縋緩締縷編緡緣縉縛縟縝縫縗縞纏縭縊縑繽縹縵縲纓縮繆繅纈繚繕繒繮繾繰繯繳纘罌網羅罰罷羆羈羥羨翹翽翬耮耬聳恥聶聾職聹聯聵聰肅腸膚肷腎腫脹脅膽勝朧腖臚脛膠脈膾髒臍腦膿臠腳脫腡臉臘醃膕齶膩靦膃騰臏臢輿艤艦艙艫艱豔艹藝節羋薌蕪蘆蓯葦藶莧萇蒼苧蘇檾蘋莖蘢蔦塋煢繭荊薦薘莢蕘蓽蕎薈薺蕩榮葷滎犖熒蕁藎蓀蔭蕒葒葤藥蒞莜萊蓮蒔萵薟獲蕕瑩鶯蓴蘀蘿螢營縈蕭薩蔥蕆蕢蔣蔞藍薊蘺蕷鎣驀薔蘞藺藹蘄蘊藪藁蘚虜慮虛蟲虯蟣雖蝦蠆蝕蟻螞蠶蠔蜆蠱蠣蟶蠻蟄蛺蟯螄蠐蛻蝸蠟蠅蟈蟬蠍螻蠑螿蟎蠨釁銜補襯袞襖嫋褘襪襲襏裝襠褌褳襝褲襉褸襤襁襴見觀覎規覓視覘覽覺覬覡覿覥覦覯覲覷觴觸觶讋譽謄訁計訂訃認譏訐訌討讓訕訖訓議訊記訒講諱謳詎訝訥許訛論訩訟諷設訪訣證詁訶評詛識詗詐訴診詆謅詞詘詔詖譯詒誆誄試詿詩詰詼誠誅詵話誕詬詮詭詢詣諍該詳詫諢詡譸誡誣語誚誤誥誘誨誑說誦誒請諸諏諾讀諑誹課諉諛誰諗調諂諒諄誶談誼謀諶諜謊諫諧謔謁謂諤諭諼讒諮諳諺諦謎諞諝謨讜謖謝謠謗諡謙謐謹謾謫譾謬譚譖譙讕譜譎讞譴譫讖谷豶貝貞負貟貢財責賢敗賬貨質販貪貧貶購貯貫貳賤贲貰貼貴貺貸貿費賀貽賊贄賈賄貲賃賂贓資賅贐賕賑賚賒賦賭齎贖賞賜贔賙賡賠賧賴賵贅賻賺賽賾贗贊贇贈贍贏贛赬趙趕趨趲躉躍蹌跖躒踐躂蹺蹕躚躋踊躊蹤躓躑躡蹣躕躥躪躦軀車軋軌軒軑軔轉軛輪軟轟軲軻轤軸軹軼軤軫轢軺輕軾載輊轎輈輇輅較輒輔輛輦輩輝輥輞輬輟輜輳輻輯轀輸轡轅轄輾轆轍轔辭辯辮邊遼達遷過邁運還這進遠違連遲邇逕跡適選遜遞邐邏遺遙鄧鄺鄔郵鄒鄴鄰鬱郄郟鄶鄭鄆酈鄖鄲醞醱醬釅釃釀釋裏鉅鑑鑾鏨釓釔針釘釗釙釕釷釺釧釤鈒釩釣鍆釹鍚釵鈃鈣鈈鈦鈍鈔鍾鈉鋇鋼鈑鈐鑰欽鈞鎢鉤鈧鈁鈥鈄鈕鈀鈺錢鉦鉗鈷鉢鈳鉕鈽鈸鉞鑽鉬鉭鉀鈿鈾鐵鉑鈴鑠鉛鉚鈰鉉鉈鉍鈹鐸鉶銬銠鉺銪鋏鋣鐃銍鐺銅鋁銱銦鎧鍘銖銑鋌銩銛鏵銓鉿銚鉻銘錚銫鉸銥鏟銃鐋銨銀銣鑄鐒鋪鋙錸鋱鏈鏗銷鎖鋰鋥鋤鍋锆鋨鏽銼鋝鋒鋅鋶鐦鐗銳銻鋃鋟鋦錒錆鍺錯錨錡錁錕錩錫錮鑼錘錐錦杴錈錇錟錠鍵鋸錳錙鍥鍈鍇鏘鍶鍔鍤鍬鍾鍛鎪鍠鍰鎄鍍鎂鏤鎡鏌鎮鎛鎘鑷鐫鎳鎿鎦鎬鎊鎰鎔鏢鏜鏍鏰鏞鏡鏑鏃鏇鏐鐔钁鐐鏷鑥鐓鑭鐠鑹鏹鐙鑊鐳鐶鐲鐮鐿鑔鑣鑞鑲長門閂閃閆閈閉問闖閏闈閒閎間閔閌悶閘鬧閨聞闥閩閭闓閥閣閡閫鬮閱閬闍閾閹閶鬩閿閽閻閼闡闌闃闠闊闋闔闐闒闕闞闤隊陽陰陣階際陸隴陳陘陝隉隕險隨隱隸雋難雛讎靂霧霽黴靄靚靜靨韃鞽韉鞴韋韌韍韓韙韞韜韻頁頂頃頇項順須頊頑顧頓頎頒頌頏預顱領頗頸頡頰頲頜潁熲頦頤頻頮頹頷頴穎顆題顒顎顓顏額顳顢顛顙顥纇顫顬顰顴風颺颭颮颯颶颸颼颻飀飄飆飈飛饗饜飣飢飥餳飩餼飪飫飭飯飲餞飾飽飼飿飴餌饒餉餄餎餃餏餅餑餖餓餘餒餕餜餛餡館餷饋餶餿饞饁饃餺餾饈饉饅饊饌饢馬馭馱馴馳驅馹駁驢駔駛駟駙駒騶駐駝駑駕驛駘驍罵駰驕驊駱駭駢驫驪騁驗騂駸駿騏騎騍騅騌驌驂騙騭騤騷騖驁騮騫騸驃騾驄驏驟驥驦驤髏髖髕鬢魘魎魚魛魢魷魨魯魴魺鮁鮃鮎鱸鮋鮓鮒鮊鮑鱟鮍鮐鮭鮚鮳鮪鮞鮦鰂鮜鱠鱭鮫鮮鮺鯗鱘鯁鱺鰱鰹鯉鰣鰷鯀鯊鯇鮶鯽鯒鯖鯪鯕鯫鯡鯤鯧鯝鯢鮎鯛鯨鰺鯴鯔鱝鰈鰏鱨鯷鰮鰃鰓鱷鰍鰒鰉鰁鱂鯿鰲鰭鰨鰥鰩鰟鰜鰳鰾鱈鱉鰻鰵鱅鰼鱖鱔鱗鱒鱯鱤鱧鱣鳥鳩雞鳶鳴鳲鷗鴉鶬鴇鴆鴣鶇鸕鴨鴞鴦鴒鴟鴝鴛鷽鴕鷥鷙鴯鴰鵂鴴鵃鴿鸞鴻鵐鵓鸝鵑鵠鵝鵒鷳鵜鵡鵲鶓鵪鵾鵯鵬鵮鶉鶊鵷鷫鶘鶡鶚鶻鶿鶥鶩鷊鷂鶲鶹鶺鷁鶼鶴鷖鸚鷓鷚鷯鷦鷲鷸鷺鸇鷹鸌鸏鸛鸘鹺麥麩黃黌黶黷黲黽黿鼂鼉鞀鼴齇齊齏齒齔齕齗齟齡齙齠齜齦齬齪齲齷龍龔龕龜志制諮只裏範鬆沒鬧面準鍾別閒乾盡髒拼';

            this.s2t_map = null;
            this.t2s_map = null;
        },

        getS2TMap: function () {
            if (!this.s2t_map) {
                this.s2t_map = {};
                for (let i = 0; i < this.s_chars.length; i++) {
                    this.s2t_map[this.s_chars[i]] = this.t_chars[i];
                }
            }
            return this.s2t_map;
        },

        getT2SMap: function () {
            if (!this.t2s_map) {
                this.t2s_map = {};
                for (let i = 0; i < this.t_chars.length; i++) {
                    this.t2s_map[this.t_chars[i]] = this.s_chars[i];
                }
            }
            return this.t2s_map;
        },

        /**
         * 執行文本轉換
         */
        convert: function (text, mode) {
            if (!text) return '';
            const map = (mode === 's2t') ? this.getS2TMap() : this.getT2SMap();
            let result = '';

            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                result += map[char] || char;
            }

            const fixes = (mode === 's2t') ? this.s2t_fix : this.t2s_fix;
            for (const [wrong, right] of Object.entries(fixes)) {
                if (result.includes(wrong)) {
                    result = result.split(wrong).join(right);
                }
            }

            return result;
        }
    };

    // 初始化轉換引擎
    ChineseConverter.init();

    /**
     * 使用Observer等待元素出現
     */
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

    /**
     * 模擬輸入事件
     */
    function simulateTyping(element, value) {
        element.value = value;
        element.dispatchEvent(new Event('input', {
            bubbles: true
        }));
        element.dispatchEvent(new Event('change', {
            bubbles: true
        }));
    }

    /**
     * 模擬鍵盤事件
     */
    function simulateKeyEvent(element, key, keyCode) {
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

    /**
     * 等待屬性變化
     */
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

    /**
     * 等待按鈕啟用
     */
    async function waitForButtonToBeEnabled(selector) {
        // 5000毫秒等待按鈕出現
        const button = await waitForElementWithObserver(document.body, selector, 5000);
        // 5000毫秒等待屬性變更
        await waitForAttributeChange(button, 'aria-disabled', 'false', 5000);
        return button;
    }

    /**
     * 選擇Combobox選項
     */
    async function selectComboboxOption(container, buttonSelector, optionValue) {
        // 5000毫秒等待下拉按鈕
        const comboboxButton = await waitForElementWithObserver(container, buttonSelector, 5000);
        comboboxButton.click();
        const optionSelector = `lightning-base-combobox-item[data-value="${optionValue}"]`;
        // 5000毫秒等待選項
        const optionElement = await waitForElementWithObserver(document.body, optionSelector, 5000);
        optionElement.click();
    }

    /**
     * 獲取選中值
     */
    function getSelectedValue(buttonEl) {
        if (!buttonEl) return null;

        const aria = buttonEl.getAttribute('aria-label') || '';
        const match = aria.match(/Current Selection:\s*([^,]+)/i);
        if (match && match[1]) {
            const v = match[1].trim();
            if (v) return v;
        }

        const span = buttonEl.querySelector('span.slds-truncate, span[title]');
        if (span) {
            const v = (span.getAttribute('title') || span.textContent || '').trim();
            if (v) return v;
        }

        const raw = (buttonEl.textContent || '').replace(/\s+/g, ' ').trim();
        if (!raw) return null;
        return raw
            .replace(/^Case Category\s*/i, '')
            .replace(/^Case Sub Category\s*/i, '')
            .trim() || null;
    }

    /**
     * 顯示局部完成提示
     */
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
        // 2500毫秒後開始淡出
        setTimeout(() => {
            overlay.style.opacity = '0';
            // 300毫秒等待動畫結束
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 300);
        }, 2500);
    }

    /**
     * 顯示全局Toast提示
     */
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
        // 2500毫秒後開始淡出
        globalToastTimer = setTimeout(() => {
            toast.classList.remove('show');
            // 300毫秒等待動畫結束
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 2500);
    }

    /**
     * 格式化時間差（詳細）
     */
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

    /**
     * 格式化時間差（簡潔）
     */
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

    /**
     * 格式化時間差（天時分）
     */
    function formatTimeAgoDaysHoursMinutes(timestamp) {
        const diffMs = Date.now() - timestamp;
        const diffMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));
        const days = Math.floor(diffMinutes / (60 * 24));
        const hours = Math.floor((diffMinutes % (60 * 24)) / 60);
        const minutes = diffMinutes % 60;
        return `${days}天${hours}時${minutes}分`;
    }

    /**
     * 檢查並提示近期回复
     */
    function checkAndNotifyForRecentSend(caseUrl) {
        if (!GM_getValue('notifyOnRepliedCaseEnabled', DEFAULTS.notifyOnRepliedCaseEnabled)) {
            return;
        }

        const SEND_BUTTON_CACHE_KEY = 'sendButtonClickLog';
        // 10小時
        const CACHE_TTL_MS = 10 * 60 * 60 * 1000;

        const caseId = getCaseIdFromUrl(caseUrl);
        if (!caseId) {
            Log.warn('Feature.NotifyReplied', `無法從 URL (${caseUrl}) 提取 Case ID，跳過近期處理檢查。`);
            return;
        }

        const cache = GM_getValue(SEND_BUTTON_CACHE_KEY, {});

        const PURGE_TTL_MS = CACHE_POLICY.REPLIED.PURGE_MS;
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

    /**
     * 顯示全局大型通知
     */
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

        const dismissNotification = () => {
            if (isDismissed) return;
            isDismissed = true;

            clearTimeout(autoDismissTimer);
            overlay.removeEventListener('click', dismissNotification);

            overlay.classList.remove('show');
            // 100毫秒等待動畫
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 100);
        };

        // 1000毫秒後自動關閉
        autoDismissTimer = setTimeout(dismissNotification, 1000);
        overlay.addEventListener('click', dismissNotification);

        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.classList.add('show');
        });
    }

    // =================================================================================
    // 模塊：樣式注入與UI創建
    // 用途：注入全局CSS、設置菜單、提示框等UI元素
    // =================================================================================

    /**
     * 注入全局自定義樣式
     */
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
        `;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = css;
        document.head.appendChild(style);
    }

    /**
     * 注入樣式覆蓋
     */
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

    /**
     * 切換組件屏蔽樣式
     */
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
        const selectors = DEFAULTS.cleanModeConfig
            .filter(item => userConfig[item.id])
            .map(item => item.selector);
        if (selectors.length === 0) {
            return;
        }
        const cssRule = selectors.join(',\n') + ' { display: none !important; }';
        const styleElement = document.createElement('style');
        styleElement.id = STYLE_ID;
        styleElement.textContent = cssRule;
        document.head.appendChild(styleElement);
    }

    /**
     * 創建設置菜單UI
     */
    function createSettingsUI() {
        if (document.getElementById('cec-settings-modal')) return;

        const modalHTML = `
            <div id="cec-settings-modal" class="cec-settings-backdrop">
                <div class="cec-settings-content">
                    <div class="cec-settings-header">
                        <h2>腳本設定</h2>
                        <button id="cec-settings-close" title="關閉">&times;</button>
                    </div>
                    <div class="cec-settings-body">
                        <div class="cec-settings-tabs">
                            <button class="cec-settings-tab-button active" data-tab="general">核心配置</button>
                            <button class="cec-settings-tab-button" data-tab="interface">界面</button>
                            <button class="cec-settings-tab-button" data-tab="automation">自動化</button>
                            <button class="cec-settings-tab-button" data-tab="buttons">快捷按鈕</button>
                    <button class="cec-settings-tab-button" data-tab="pca">PCA</button>
                        </div>
                        <div id="tab-general" class="cec-settings-tab-content active">
                           <div class="cec-settings-section">
                                <h3 class="cec-settings-section-title">核心配置</h3>
                                <div class="cec-settings-option">
                                    <label for="autoAssignUserInput" class="cec-settings-label">操作者用戶名 (Case Owner)</label>
                                    <input type="text" id="autoAssignUserInput" class="cec-settings-input" placeholder="輸入完整用戶名">
                                </div>
                                <p class="cec-settings-description">用於自動指派功能，請確保姓名與系統完全匹配。</p>
                            </div>
                        </div>


                        <div id="tab-interface" class="cec-settings-tab-content">
                            <div class="cec-settings-section">
                                <h3 class="cec-settings-section-title">跟進面板</h3>
                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main">
                                        <label for="followUpPanelToggle" class="cec-settings-label">啟用跟進面板（設置后需刷新頁面）</label>
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
                                        <label for="notifyOnRepliedCaseToggle" class="cec-settings-label">提示已回覆過的 Case （設置后需刷新頁面）</label>
                                        <label class="cec-settings-switch"><input type="checkbox" id="notifyOnRepliedCaseToggle"><span class="cec-settings-slider"></span></label>
                                    </div>
                                    <p class="cec-settings-description">在 Case 詳情頁和列表頁，對近期已回覆的 Case 進行醒目提示。</p>
                                </div>
                            <div class="cec-settings-option">
                                    <div class="cec-settings-option-main">
                                        <label for="highlightExpiringCasesToggle" class="cec-settings-label">快過期 Case 紅色高亮提示</label>
                                        <label class="cec-settings-switch"><input type="checkbox" id="highlightExpiringCasesToggle"><span class="cec-settings-slider"></span></label>
                                    </div>
                                    <p class="cec-settings-description">在列表頁檢測 Importance 列，若非 "Priority" 狀態或空白，將該單元格標紅。</p>
                                </div>
                            </div>
                            <div class="cec-settings-section">
                                <h3 class="cec-settings-section-title">組件屏蔽</h3>
                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main">
                                        <label for="cleanModeToggle" class="cec-settings-label">啟用組件屏蔽</label>
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
                                    <label><input type="radio" name="highlightMode" value="off"> 關閉</label>
                                    <p class="cec-settings-description">不對任何賬戶進行高亮。</p>
                                    <label><input type="radio" name="highlightMode" value="pca"> 識別Non PCA A/C</label>
                                    <p class="cec-settings-description">當 Case 聯繫人 "Preferred" 為 "No" 時，將其背景高亮。</p>
                                    <label><input type="radio" name="highlightMode" value="dispatch"> 識別PCA A/C</label>
                                    <p class="cec-settings-description">當 Case 聯繫人 "Preferred" 為 "Yes" 時，將其背景高亮。</p>
                                </div>
                            </div>
                            <hr class="cec-settings-divider">
                            <div class="cec-settings-section">
                                <h3 class="cec-settings-section-title">界面元素高度</h3>
                                <div class="cec-settings-option-grid">
                                    <label for="caseHistoryHeightInput">Related Cases 列表高度 (默認：208)</label>
                                    <div class="cec-settings-input-group"><input type="number" id="caseHistoryHeightInput" class="cec-settings-input"><span>px</span></div>
                                    <label for="caseDescriptionHeightInput">Case 描述框高度 (默認：80)</label>
                                    <div class="cec-settings-input-group"><input type="number" id="caseDescriptionHeightInput" class="cec-settings-input"><span>px</span></div>
                                    <label for="richTextEditorHeightInput">覆 case 編輯器高度 (默認：500)</label>
                                    <div class="cec-settings-input-group"><input type="number" id="richTextEditorHeightInput" class="cec-settings-input"><span>px</span></div>
                                </div>
                            </div>
                            <hr class="cec-settings-divider">
                            <div class="cec-settings-section">
                                <h3 class="cec-settings-section-title">窗口與流程</h3>
                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main"><label for="sentinelCloseToggle" class="cec-settings-label">關聯聯繫人後快速關閉窗口</label><label class="cec-settings-switch"><input type="checkbox" id="sentinelCloseToggle"><span class="cec-settings-slider"></span></label></div>
                                </div>
                            </div>
                        </div>
                        <div id="tab-automation" class="cec-settings-tab-content">
                            <div class="cec-settings-section">
                                <h3 class="cec-settings-section-title">IVP 查詢優化</h3>
                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main"><label for="autoWebQueryToggle" class="cec-settings-label">進入Case頁面自動查詢Web</label><label class="cec-settings-switch"><input type="checkbox" id="autoWebQueryToggle"><span class="cec-settings-slider"></span></label></div>
                                </div>
                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main"><label for="autoIVPQueryToggle" class="cec-settings-label">進入Case頁面自動查詢IVP</label><label class="cec-settings-switch"><input type="checkbox" id="autoIVPQueryToggle"><span class="cec-settings-slider"></span></label></div>
                                </div>
                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main"><label for="autoSwitchToggle" class="cec-settings-label">點擊IVP按鈕自動切換窗口</label><label class="cec-settings-switch"><input type="checkbox" id="autoSwitchToggle"><span class="cec-settings-slider"></span></label></div>
                                </div>
                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main"><label for="blockIVPToggle" class="cec-settings-label">屏蔽原生IVP卡片自動加載</label><label class="cec-settings-switch"><input type="checkbox" id="blockIVPToggle"><span class="cec-settings-slider"></span></label></div>
                                </div>
                            </div>

                            <div class="cec-settings-section">
                                <h3 class="cec-settings-section-title">模板插入優化</h3>
                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main">
                                        <label for="postInsertionEnhancementsToggle" class="cec-settings-label">啟用模板插入後增強處理</label>
                                        <label class="cec-settings-switch"><input type="checkbox" id="postInsertionEnhancementsToggle"><span class="cec-settings-slider"></span></label>
                                    </div>
                                    <p class="cec-settings-description">啟用後，將自動附加智能粘貼、精準定位光標並應用視覺偏移。</p>
                                </div>
                                <div class="cec-settings-option">
                                    <label class="cec-settings-label" style="margin-bottom: 8px;">模板插入位置策略</label>
                                    <div class="cec-settings-radio-group" id="templateInsertionModeGroup">
                                        <label><input type="radio" name="insertionMode" value="logo"> UPS Logo 圖標下方插入</label>
                                        <p class="cec-settings-description">自動將模板插入到簽名檔下方，確保位置統一（推薦）。</p>
                                        <label><input type="radio" name="insertionMode" value="cursor"> 隨光標位置插入</label>
                                        <p class="cec-settings-description">將模板插入到您當前光標所在的位置。</p>
                                    </div>
                                </div>
                                <div class="cec-settings-option">
                                    <label for="cursorPositionInput" class="cec-settings-label">光標定位於第 N 個換行符前</label>
                                    <input type="number" id="cursorPositionInput" class="cec-settings-input" style="width: 80px; margin-top: 4px;">
                                    <p class="cec-settings-description">默認為 4。此設置僅在“增強處理”啟用時生效。</p>
                                </div>
                            </div>
                            <hr class="cec-settings-divider">
                            <div class="cec-settings-section">
                                <h3 class="cec-settings-section-title">自動化評論文本</h3>
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

                        <div id="tab-buttons" class="cec-settings-tab-content">
                            <div class="cec-settings-section">
                                <h3 class="cec-settings-section-title">按鈕列表 <span class="cec-settings-refresh-hint">(需刷新生效)</span></h3>
                                <p class="cec-settings-description" style="margin-top:-12px; margin-bottom:12px;">拖拽 &#9776; 可排序</p>
                                <ul id="button-config-list" class="cec-settings-button-list"></ul>
                                <div class="cec-settings-button-bar">
                                    <button id="add-new-button" class="cec-settings-action-button">+ 添加新按鈕</button>
                                    <button id="reset-buttons" class="cec-settings-action-button secondary">恢復默認</button>
                                </div>
                            </div>
                        </div>

                        <div id="tab-pca" class="cec-settings-tab-content">
                            <div class="cec-settings-section">
                                <h3 class="cec-settings-section-title">賬單 / 開查 case</h3>

                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main">
                                        <label for="pcaDoNotClosePromptToggle" class="cec-settings-label">Do Not Close提醒</label>
                                        <label class="cec-settings-switch"><input type="checkbox" id="pcaDoNotClosePromptToggle"><span class="cec-settings-slider"></span></label>
                                    </div>
                                    <p class="cec-settings-description">命中【賬單/開查】時彈窗提示是否勾選 “Send and Do Not Close”。</p>
                                </div>

                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main">
                                        <label for="pcaCaseListHintToggle" class="cec-settings-label">Case列表提示</label>
                                        <label class="cec-settings-switch"><input type="checkbox" id="pcaCaseListHintToggle"><span class="cec-settings-slider"></span></label>
                                    </div>
                                    <p class="cec-settings-description">在 Case 列表頁，優先顯示「開查/賬單 + X天X時X分」。</p>
                                </div>
                            </div>
                        </div>
        `;

        const modalCSS = `
            .cec-settings-comment-group {
                margin-bottom: 20px;
            }
            .cec-settings-comment-group .cec-settings-label {
                font-weight: 600;
                margin-bottom: 8px;
                display: block;
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
            }
            .cec-settings-comment-item input {
                flex-grow: 1;
                margin-right: 8px;
            }
            .cec-settings-delete-comment-button {
                background: none;
                border: none;
                cursor: pointer;
                color: #c23934;
                font-size: 1.2rem;
                padding: 0 4px;
            }
            .cec-settings-add-comment-button {
                background: none;
                border: 1px dashed #0070d2;
                color: #0070d2;
                padding: 4px 12px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 4px;
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
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                width: 90%;
                max-width: 600px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                transform: scale(.95);
                transition: transform .3s ease;
                display: flex;
                flex-direction: column;
            }
            .cec-settings-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 24px;
                border-bottom: 1px solid #e0e0e0;
                background: #fff;
                border-radius: 8px 8px 0 0;
            }
            .cec-settings-header h2 {
                margin: 0;
                font-size: 1.15rem;
                color: #333;
            }
            #cec-settings-close {
                background: 0 0;
                border: 0;
                font-size: 2rem;
                color: #888;
                cursor: pointer;
                line-height: 1;
                padding: 0;
            }
            .cec-settings-body {
                padding: 16px 24px 24px;
                max-height: 75vh;
                overflow-y: auto;
            }
            .cec-settings-tabs {
                display: flex;
                border-bottom: 2px solid #e0e0e0;
                margin-bottom: 20px;
            }
            .cec-settings-tab-button {
                background: none;
                border: none;
                padding: 10px 16px;
                cursor: pointer;
                font-size: 1rem;
                color: #555;
                border-bottom: 3px solid transparent;
                margin-bottom: -2px;
            }
            .cec-settings-tab-button.active {
                color: #0070d2;
                border-bottom-color: #0070d2;
                font-weight: 600;
            }
            .cec-settings-tab-content {
                display: none;
            }
            .cec-settings-tab-content.active {
                display: block;
                animation: fadeIn .3s ease;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .cec-settings-section {
                background: #fff;
                padding: 20px;
                border-radius: 6px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                margin-bottom: 20px;
            }
            .cec-settings-section-title {
                font-size: 1rem;
                font-weight: 600;
                color: #333;
                margin: 0 0 16px;
                padding-bottom: 8px;
                border-bottom: 1px solid #eee;
            }
            .cec-settings-divider {
                border: 0;
                border-top: 1px solid #e0e0e0;
                margin: 20px 0;
            }
            .cec-settings-refresh-hint {
                color: #999;
                font-size: 0.8rem;
                font-weight: normal;
                margin-left: 8px;
            }
            .cec-settings-option {
                padding: 8px 0;
            }
            .cec-settings-option-main {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .cec-settings-label {
                color: #333;
                flex-grow: 1;
            }
            .cec-settings-description {
                color: #777;
                font-size: 0.85rem;
                margin-top: 4px;
            }
            .cec-settings-input {
                width: 100%;
                padding: 8px 10px;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-size: .95rem;
                box-sizing: border-box;
            }
            .cec-settings-input-group {
                display: flex;
                align-items: center;
            }
            .cec-settings-input-group input {
                width: 80px;
                text-align: right;
            }
            .cec-settings-input-group span {
                margin-left: 8px;
                color: #777;
            }
            .cec-settings-option-grid {
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 12px;
                align-items: center;
            }
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
                transition: .4s;
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
                transition: .4s;
            }
            input:checked + .cec-settings-slider {
                background-color: #0070d2;
            }
            input:checked + .cec-settings-slider:before {
                transform: translateX(20px);
            }
            .cec-settings-radio-group label {
                display: block;
                margin-bottom: 4px;
            }
            .cec-settings-radio-group input {
                margin-right: 8px;
            }
            .cec-settings-radio-group .cec-settings-description {
                margin-left: 23px;
                margin-bottom: 12px;
            }
            .cec-settings-link-button {
                background: none;
                border: none;
                color: #0070d2;
                cursor: pointer;
                text-decoration: underline;
                padding: 0;
                font-size: 14px;
            }
            .cec-settings-link-button.danger {
                color: #c23934;
            }
            .cec-settings-button-bar-inline {
                display: flex;
                align-items: center;
                gap: 20px;
            }
            .cec-settings-custom-container {
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.3s ease-out;
            }
            .cec-settings-custom-container.expanded {
                max-height: 300px;
                margin-top: 10px;
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
                gap: 10px;
            }
            .cec-settings-button-list {
                list-style: none;
                padding: 0;
                margin: 0;
                min-height: 200px;
                max-height: 600px;
                overflow-y: auto;
                border: 1px solid #eee;
                border-radius: 4px;
                padding: 5px;
            }
            .cec-settings-button-item {
                display: flex;
                align-items: center;
                padding: 8px 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                margin-bottom: 5px;
                background: #fafafa;
                transition: background-color 0.2s;
            }
            .cec-settings-button-item.dragging {
                opacity: 0.5;
                background: #e0f0ff;
            }
            .cec-settings-drop-indicator {
                border-top: 2px solid #0070d2 !important;
            }
            .cec-settings-button-drag-handle {
                cursor: grab;
                color: #888;
                margin-right: 10px;
                user-select: none;
            }
            .cec-settings-button-name {
                font-weight: bold;
                flex-grow: 1;
            }
            .cec-settings-button-actions button {
                background: none;
                border: none;
                cursor: pointer;
                margin-left: 8px;
                padding: 4px;
            }
            .cec-settings-button-edit {
                color: #0070d2;
            }
            .cec-settings-button-delete {
                color: #c23934;
            }
            .cec-settings-button-bar {
                display: flex;
                gap: 10px;
                margin-top: 16px;
            }
            .cec-settings-action-button {
                flex-grow: 1;
                padding: 10px;
                font-size: 1rem;
                border-radius: 4px;
                cursor: pointer;
                background-color: #0070d2;
                color: white;
                border: 1px solid #0070d2;
            }
            .cec-settings-action-button.secondary {
                background-color: #f3f3f3;
                color: #333;
                border: 1px solid #ccc;
            }
            .cec-edit-modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.3);
                z-index: 10000;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .cec-edit-modal-content {
                background: #fff;
                padding: 20px;
                border-radius: 6px;
                width: 90%;
                max-width: 450px;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            }
            .cec-edit-modal-content h3 {
                margin: 0 0 16px;
            }
            .cec-edit-form {
                display: grid;
                grid-template-columns: 100px 1fr;
                gap: 12px;
                align-items: center;
            }
            .cec-edit-form .input-wrapper {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            .cec-edit-form .input-row {
                display: flex;
                align-items: center;
            }
            .cec-edit-form .input-row input {
                flex-grow: 1;
            }
            .cec-edit-form-buttons {
                grid-column: 1 / -1;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 16px;
            }
            .cec-settings-toast {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background-color: #333;
                color: #fff;
                padding: 10px 20px;
                border-radius: 20px;
                font-size: 0.9rem;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s, visibility 0.3s;
            }
            .cec-settings-toast.show {
                opacity: 1;
                visibility: visible;
            }
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const styleSheet = document.createElement("style");
        styleSheet.textContent = modalCSS;
        document.head.appendChild(styleSheet);
    }

    /**
     * 打開設置菜單
     */
    function openSettingsModal() {
        if (!document.getElementById('cec-settings-modal')) {
            createSettingsUI();
        }

        const modal = document.getElementById('cec-settings-modal');
        const content = modal.querySelector('.cec-settings-content');
        const toast = document.getElementById('cec-settings-toast');

        if (!modal.dataset.cecSettingsBound) {
            modal.dataset.cecSettingsBound = 'true';

            let toastTimer;
            const showToast = (message = '設置已保存') => {
                clearTimeout(toastTimer);
                toast.textContent = message;
                toast.classList.add('show');
                // 2000毫秒顯示時長
                toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
            };

            const settings = {
                showToast,
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

                defaultCleanModeConfig: DEFAULTS.cleanModeConfig.reduce((acc, item) => {
                    acc[item.id] = item.enabled;
                    return acc;
                }, {}),

                currentUserConfig: null,
                renderCleanModeList: null,

                autoFillTexts: null,
                migrateAutoFillTexts: null,
                renderCommentList: null,
                setupCommentListHandlers: null,

                currentButtons: null,
                renderButtonList: null,
                saveButtons: null,
                draggedItem: null,
                lastIndicatorElement: null,
                getDragAfterElement: null,

                refresh: null
            };

            settings.initTabs();

            document.getElementById('cec-settings-close').addEventListener('click', closeSettingsModal);

            let mouseDownTarget = null;
            modal.addEventListener('mousedown', (e) => {
                if (e.target === modal) {
                    mouseDownTarget = e.target;
                } else {
                    mouseDownTarget = null;
                }
            });
            modal.addEventListener('mouseup', (e) => {
                if (e.target === mouseDownTarget && e.target === modal) {
                    closeSettingsModal();
                }
                mouseDownTarget = null;
            });

            const cleanModeToggle = document.getElementById('cleanModeToggle');
            const cleanModeCustomToggle = document.getElementById('cleanModeCustomToggle');
            const cleanModeCustomContainer = document.getElementById('cleanModeCustomContainer');
            const cleanModeList = document.getElementById('clean-mode-custom-list');
            const resetCleanModeButton = document.getElementById('resetCleanMode');

            settings.renderCleanModeList = () => {
                cleanModeList.innerHTML = '';
                settings.currentUserConfig = GM_getValue('cleanModeUserConfig', {
                    ...settings.defaultCleanModeConfig
                });
                DEFAULTS.cleanModeConfig.forEach(item => {
                    const isChecked = settings.currentUserConfig[item.id] || false;
                    cleanModeList.insertAdjacentHTML('beforeend', `<label class="cec-settings-custom-item"><input type="checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}><span>${item.label}</span></label>`);
                });
            };

            cleanModeToggle.onchange = () => {
                const value = cleanModeToggle.checked;
                GM_setValue('cleanModeEnabled', value);
                toggleCleanModeStyles();
                Log.info('UI.Settings', `設置已保存: cleanModeEnabled = ${value}`);
                showToast();
            };

            cleanModeCustomToggle.addEventListener('click', () => {
                cleanModeCustomContainer.classList.toggle('expanded');
            });

            cleanModeList.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                    settings.currentUserConfig = GM_getValue('cleanModeUserConfig', {
                        ...settings.defaultCleanModeConfig
                    });
                    settings.currentUserConfig[e.target.dataset.id] = e.target.checked;
                    GM_setValue('cleanModeUserConfig', settings.currentUserConfig);
                    toggleCleanModeStyles();
                    Log.info('UI.Settings', `設置已保存: cleanModeUserConfig updated for ${e.target.dataset.id}`);
                    showToast();
                }
            });

            resetCleanModeButton.addEventListener('click', () => {
                if (confirm('您確定要將組件屏蔽列表恢復為默認設置嗎？')) {
                    settings.currentUserConfig = {
                        ...settings.defaultCleanModeConfig
                    };
                    GM_setValue('cleanModeUserConfig', settings.currentUserConfig);
                    settings.renderCleanModeList();
                    toggleCleanModeStyles();
                    Log.info('UI.Settings', `"組件屏蔽" 配置已恢復為默認值。`);
                    showToast('組件屏蔽列表已恢復默認');
                }
            });

            settings.migrateAutoFillTexts = () => {
                let current = GM_getValue('iwtAutoFillTexts', DEFAULTS.iwtAutoFillTexts);
                let changed = false;
                for (const key in current) {
                    if (typeof current[key] === 'string') {
                        current[key] = [current[key]];
                        changed = true;
                    }
                }
                if (changed) {
                    GM_setValue('iwtAutoFillTexts', current);
                    Log.info('UI.Settings', '自動化評論文本設置已成功遷移到新格式。');
                }
                return current;
            };

            settings.renderCommentList = (key, listElement) => {
                listElement.innerHTML = '';
                const items = settings.autoFillTexts[key] || [];
                items.forEach((text, index) => {
                    const li = document.createElement('li');
                    li.className = 'cec-settings-comment-item';
                    li.innerHTML = `
                        <input type="text" class="cec-settings-input" data-index="${index}" value="${text}">
                        <button class="cec-settings-delete-comment-button" data-index="${index}" title="刪除">×</button>
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
                    showToast();
                });
                listElement.addEventListener('change', (e) => {
                    if (e.target.tagName === 'INPUT') {
                        const index = parseInt(e.target.dataset.index, 10);
                        settings.autoFillTexts[key][index] = e.target.value;
                        GM_setValue('iwtAutoFillTexts', settings.autoFillTexts);
                        showToast();
                    }
                });
                listElement.addEventListener('click', (e) => {
                    if (e.target.classList.contains('cec-settings-delete-comment-button')) {
                        const index = parseInt(e.target.dataset.index, 10);
                        settings.autoFillTexts[key].splice(index, 1);
                        GM_setValue('iwtAutoFillTexts', settings.autoFillTexts);
                        settings.renderCommentList(key, listElement);
                        showToast();
                    }
                });
            };

            settings.autoFillTexts = settings.migrateAutoFillTexts();
            settings.setupCommentListHandlers('reOpen', document.getElementById('reOpen-list'), document.querySelector('[data-key=\"reOpen\"]'));
            settings.setupCommentListHandlers('closeCase', document.getElementById('closeCase-list'), document.querySelector('[data-key=\"closeCase\"]'));
            settings.setupCommentListHandlers('documentContact', document.getElementById('docContact-list'), document.querySelector('[data-key=\"documentContact\"]'));

            const buttonList = document.getElementById('button-config-list');

            settings.saveButtons = () => {
                GM_setValue('actionButtons', settings.currentButtons);
                Log.info('UI.Settings', '設置已保存: actionButtons updated');
                showToast();
            };

            settings.renderButtonList = () => {
                buttonList.innerHTML = '';
                settings.currentButtons.forEach((button) => {
                    const listItem = document.createElement('li');
                    listItem.className = 'cec-settings-button-item';
                    listItem.dataset.id = button.id;
                    listItem.innerHTML = `
                        <span class="cec-settings-button-drag-handle" draggable="true">&#9776;</span>
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
                        return {
                            offset: offset,
                            element: child
                        };
                    } else {
                        return closest;
                    }
                }, {
                    offset: Number.NEGATIVE_INFINITY
                }).element;
            };

            buttonList.addEventListener('dragstart', (e) => {
                if (e.target.classList.contains('cec-settings-button-drag-handle')) {
                    settings.draggedItem = e.target.closest('.cec-settings-button-item');
                    setTimeout(() => settings.draggedItem.classList.add('dragging'), 0);
                }
            });

            buttonList.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (!settings.draggedItem) return;
                const afterElement = settings.getDragAfterElement(buttonList, e.clientY);
                if (settings.lastIndicatorElement) settings.lastIndicatorElement.classList.remove('cec-settings-drop-indicator');
                if (afterElement) {
                    afterElement.classList.add('cec-settings-drop-indicator');
                    settings.lastIndicatorElement = afterElement;
                } else {
                    settings.lastIndicatorElement = null;
                }
            });

            buttonList.addEventListener('dragend', () => {
                if (settings.draggedItem) settings.draggedItem.classList.remove('dragging');
                if (settings.lastIndicatorElement) settings.lastIndicatorElement.classList.remove('cec-settings-drop-indicator');
                settings.draggedItem = null;
                settings.lastIndicatorElement = null;
            });

            buttonList.addEventListener('drop', (e) => {
                e.preventDefault();
                if (!settings.draggedItem) return;
                const afterElement = settings.getDragAfterElement(buttonList, e.clientY);
                if (afterElement) {
                    buttonList.insertBefore(settings.draggedItem, afterElement);
                } else {
                    buttonList.appendChild(settings.draggedItem);
                }
                const newOrder = Array.from(buttonList.children).map(item => item.dataset.id);
                settings.currentButtons.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
                settings.saveButtons();
            });

            document.getElementById('add-new-button').addEventListener('click', () => {
                const newButton = {
                    id: `btn-${Date.now()}`,
                    name: 'NEW',
                    category: [''],
                    subCategory: [''],
                    role: ['']
                };
                settings.currentButtons.push(newButton);
                settings.saveButtons();
                settings.renderButtonList();
                openButtonEditModal(newButton, settings.renderButtonList, settings.saveButtons);
            });

            document.getElementById('reset-buttons').addEventListener('click', () => {
                if (confirm('確定要恢復為默認的快捷按鈕配置嗎？')) {
                    settings.currentButtons = JSON.parse(JSON.stringify(DEFAULTS.actionButtons));
                    settings.saveButtons();
                    settings.renderButtonList();
                    Log.info('UI.Settings', '"快捷按鈕" 配置已恢復為默認值。');
                }
            });

            settings.refresh = () => {

                const followUpPanelToggle = document.getElementById('followUpPanelToggle');
                if (followUpPanelToggle) {
                    followUpPanelToggle.checked = GM_getValue('followUpPanelEnabled', DEFAULTS.followUpPanelEnabled);
                    followUpPanelToggle.onchange = () => {
                        const value = followUpPanelToggle.checked;
                        GM_setValue('followUpPanelEnabled', value);
                        Log.info('UI.Settings', `設置已保存: followUpPanelEnabled = ${value}`);
                        showToast();
                    };
                }

                const notifyOnRepliedCaseToggle = document.getElementById('notifyOnRepliedCaseToggle');
                notifyOnRepliedCaseToggle.checked = GM_getValue('notifyOnRepliedCaseEnabled', DEFAULTS.notifyOnRepliedCaseEnabled);
                notifyOnRepliedCaseToggle.onchange = () => {
                    const value = notifyOnRepliedCaseToggle.checked;
                    GM_setValue('notifyOnRepliedCaseEnabled', value);
                    Log.info('UI.Settings', `設置已保存: notifyOnRepliedCaseEnabled = ${value}`);
                    showToast();
                };

                const highlightExpiringCasesToggle = document.getElementById('highlightExpiringCasesToggle');
                highlightExpiringCasesToggle.checked = GM_getValue('highlightExpiringCasesEnabled', false);
                highlightExpiringCasesToggle.onchange = () => {
                    const value = highlightExpiringCasesToggle.checked;
                    GM_setValue('highlightExpiringCasesEnabled', value);
                    Log.info('UI.Settings', `設置已保存: highlightExpiringCasesEnabled = ${value}`);
                    showToast();
                };

                const pcaDoNotClosePromptToggle = document.getElementById('pcaDoNotClosePromptToggle');
                pcaDoNotClosePromptToggle.checked = GM_getValue('pcaDoNotClosePromptEnabled', DEFAULTS.pcaDoNotClosePromptEnabled);
                pcaDoNotClosePromptToggle.onchange = () => {
                    const value = pcaDoNotClosePromptToggle.checked;
                    GM_setValue('pcaDoNotClosePromptEnabled', value);
                    Log.info('UI.Settings', `設置已保存: pcaDoNotClosePromptEnabled = ${value}`);
                    showToast();
                };

                const pcaCaseListHintToggle = document.getElementById('pcaCaseListHintToggle');
                pcaCaseListHintToggle.checked = GM_getValue('pcaCaseListHintEnabled', DEFAULTS.pcaCaseListHintEnabled);
                pcaCaseListHintToggle.onchange = () => {
                    const value = pcaCaseListHintToggle.checked;
                    GM_setValue('pcaCaseListHintEnabled', value);
                    try {
                        const dataTable = findElementInShadows(document.body, 'lightning-datatable');
                        const tbody = dataTable ? findElementInShadows(dataTable, 'tbody') : null;
                        if (tbody) {
                            injectPcaCaseListSortButtons(tbody);
                        } else {
                            injectPcaCaseListSortButtons(null);
                        }
                    } catch (e) {
                        // 忽略錯誤
                    }
                    Log.info('UI.Settings', `設置已保存: pcaCaseListHintEnabled = ${value}`);
                    showToast();
                };

                const autoAssignUserInput = document.getElementById('autoAssignUserInput');
                autoAssignUserInput.value = GM_getValue('autoAssignUser', DEFAULTS.autoAssignUser);
                autoAssignUserInput.onchange = () => {
                    const value = autoAssignUserInput.value.trim();
                    GM_setValue('autoAssignUser', value);
                    Log.info('UI.Settings', `設置已保存: autoAssignUser = ${value}`);
                    showToast();
                };

                const autoWebQueryToggle = document.getElementById('autoWebQueryToggle');
                autoWebQueryToggle.checked = GM_getValue('autoWebQueryEnabled', DEFAULTS.autoWebQueryEnabled);
                autoWebQueryToggle.onchange = () => {
                    const value = autoWebQueryToggle.checked;
                    GM_setValue('autoWebQueryEnabled', value);
                    Log.info('UI.Settings', `設置已保存: autoWebQueryEnabled = ${value}`);
                    showToast();
                };

                const autoIVPQueryToggle = document.getElementById('autoIVPQueryToggle');
                autoIVPQueryToggle.checked = GM_getValue('autoIVPQueryEnabled', DEFAULTS.autoIVPQueryEnabled);
                autoIVPQueryToggle.onchange = () => {
                    const value = autoIVPQueryToggle.checked;
                    GM_setValue('autoIVPQueryEnabled', value);
                    Log.info('UI.Settings', `設置已保存: autoIVPQueryEnabled = ${value}`);
                    showToast();
                };

                const autoSwitchToggle = document.getElementById('autoSwitchToggle');
                autoSwitchToggle.checked = GM_getValue('autoSwitchEnabled', DEFAULTS.autoSwitchEnabled);
                autoSwitchToggle.onchange = () => {
                    const value = autoSwitchToggle.checked;
                    GM_setValue('autoSwitchEnabled', value);
                    Log.info('UI.Settings', `設置已保存: autoSwitchEnabled = ${value}`);
                    showToast();
                };

                const blockIVPToggle = document.getElementById('blockIVPToggle');
                blockIVPToggle.checked = GM_getValue('blockIVPCard', DEFAULTS.blockIVPCard);
                blockIVPToggle.onchange = () => {
                    const value = blockIVPToggle.checked;
                    GM_setValue('blockIVPCard', value);
                    Log.info('UI.Settings', `設置已保存: blockIVPCard = ${value}`);
                    showToast();
                    if (value) handleIVPCardBlocking();
                };

                const sentinelCloseToggle = document.getElementById('sentinelCloseToggle');
                sentinelCloseToggle.checked = GM_getValue('sentinelCloseEnabled', DEFAULTS.sentinelCloseEnabled);
                sentinelCloseToggle.onchange = () => {
                    const value = sentinelCloseToggle.checked;
                    GM_setValue('sentinelCloseEnabled', value);
                    Log.info('UI.Settings', `設置已保存: sentinelCloseEnabled = ${value}`);
                    showToast();
                };

                const postInsertionEnhancementsToggle = document.getElementById('postInsertionEnhancementsToggle');
                postInsertionEnhancementsToggle.checked = GM_getValue('postInsertionEnhancementsEnabled', DEFAULTS.postInsertionEnhancementsEnabled);
                postInsertionEnhancementsToggle.onchange = () => {
                    const value = postInsertionEnhancementsToggle.checked;
                    GM_setValue('postInsertionEnhancementsEnabled', value);
                    Log.info('UI.Settings', `設置已保存: postInsertionEnhancementsEnabled = ${value}`);
                    showToast();
                };

                const insertionModeGroup = document.getElementById('templateInsertionModeGroup');
                const currentInsertionMode = GM_getValue('templateInsertionMode', DEFAULTS.templateInsertionMode);
                const modeRadio = insertionModeGroup.querySelector(`input[value="${currentInsertionMode}"]`);
                if (modeRadio) modeRadio.checked = true;
                insertionModeGroup.onchange = (e) => {
                    if (e.target.name === 'insertionMode') {
                        const value = e.target.value;
                        GM_setValue('templateInsertionMode', value);
                        Log.info('UI.Settings', `設置已保存: templateInsertionMode = ${value}`);
                        showToast();
                    }
                };

                const cursorPositionInput = document.getElementById('cursorPositionInput');
                cursorPositionInput.value = GM_getValue('cursorPositionBrIndex', DEFAULTS.cursorPositionBrIndex);
                cursorPositionInput.onchange = () => {
                    const value = parseInt(cursorPositionInput.value, 10);
                    const finalValue = (value && value > 0) ? value : DEFAULTS.cursorPositionBrIndex;
                    cursorPositionInput.value = finalValue;
                    GM_setValue('cursorPositionBrIndex', finalValue);
                    Log.info('UI.Settings', `設置已保存: cursorPositionBrIndex = ${finalValue}`);
                    showToast();
                };

                cleanModeToggle.checked = GM_getValue('cleanModeEnabled', DEFAULTS.cleanModeEnabled);
                settings.renderCleanModeList();

                const highlightModeGroup = document.getElementById('accountHighlightModeGroup');
                const currentHighlightMode = GM_getValue('accountHighlightMode', 'pca');
                const highlightRadio = highlightModeGroup.querySelector(`input[value="${currentHighlightMode}"]`);
                if (highlightRadio) highlightRadio.checked = true;
                highlightModeGroup.onchange = (e) => {
                    if (e.target.name === 'highlightMode') {
                        const value = e.target.value;
                        GM_setValue('accountHighlightMode', value);
                        Log.info('UI.Settings', `設置已保存: accountHighlightMode = ${value}`);
                        showToast();
                    }
                };

                const caseHistoryInput = document.getElementById('caseHistoryHeightInput');
                caseHistoryInput.value = GM_getValue('caseHistoryHeight', DEFAULTS.caseHistoryHeight);
                caseHistoryInput.onchange = () => {
                    const value = parseInt(caseHistoryInput.value) || DEFAULTS.caseHistoryHeight;
                    GM_setValue('caseHistoryHeight', value);
                    injectStyleOverrides();
                    Log.info('UI.Settings', `設置已保存: caseHistoryHeight = ${value}`);
                    showToast();
                };

                const caseDescInput = document.getElementById('caseDescriptionHeightInput');
                caseDescInput.value = GM_getValue('caseDescriptionHeight', DEFAULTS.caseDescriptionHeight);
                caseDescInput.onchange = () => {
                    const value = parseInt(caseDescInput.value) || DEFAULTS.caseDescriptionHeight;
                    GM_setValue('caseDescriptionHeight', value);
                    Log.info('UI.Settings', `設置已保存: caseDescriptionHeight = ${value}`);
                    showToast();
                };

                const richTextInput = document.getElementById('richTextEditorHeightInput');
                richTextInput.value = GM_getValue('richTextEditorHeight', DEFAULTS.richTextEditorHeight);
                richTextInput.onchange = () => {
                    const value = parseInt(richTextInput.value) || DEFAULTS.richTextEditorHeight;
                    GM_setValue('richTextEditorHeight', value);
                    Log.info('UI.Settings', `設置已保存: richTextEditorHeight = ${value}`);
                    showToast();
                };

                settings.autoFillTexts = settings.migrateAutoFillTexts();
                settings.renderCommentList('reOpen', document.getElementById('reOpen-list'));
                settings.renderCommentList('closeCase', document.getElementById('closeCase-list'));
                settings.renderCommentList('documentContact', document.getElementById('docContact-list'));

                settings.currentButtons = GM_getValue('actionButtons', JSON.parse(JSON.stringify(DEFAULTS.actionButtons)));
                settings.renderButtonList();
            };

            modal._cecSettings = settings;
        }

        if (modal._cecSettings && typeof modal._cecSettings.refresh === 'function') {
            modal._cecSettings.refresh();
        }

        modal.style.display = 'flex';
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            content.style.transform = 'scale(1)';
        });
    }

    /**
     * 打開按鈕編輯彈窗
     */
    function openButtonEditModal(button, onSaveCallback, saveFn) {
        const modalContainer = document.getElementById('cec-settings-modal');
        const editModal = document.createElement('div');
        editModal.className = 'cec-edit-modal-backdrop';
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

    /**
     * 關閉設置菜單
     */
    function closeSettingsModal() {
        const modal = document.getElementById('cec-settings-modal');
        const content = modal.querySelector('.cec-settings-content');
        modal.style.opacity = '0';
        content.style.transform = 'scale(0.95)';
        // 300毫秒等待動畫
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    // =================================================================================
    // 模塊：核心功能邏輯
    // 用途：實現Case列表處理、按鈕注入、自動化流程等核心業務邏輯
    // =================================================================================

    /**
     * 注入PCA排序按鈕
     */
    function injectPcaCaseListSortButtons(tableBody) {
        try {
            const listHintEnabled = GM_getValue('pcaCaseListHintEnabled', DEFAULTS.pcaCaseListHintEnabled);
            const BAR_ID = 'cec-pca-sort-button-bar';

            if (!listHintEnabled) {
                const existing = document.getElementById(BAR_ID);
                if (existing) existing.remove();
                pcaCaseListOriginalRowKeys = null;
                pcaCaseListIsSorted = false;
                return;
            }

            const existingBar = document.getElementById(BAR_ID);
            if (existingBar) {
                existingBar.remove();
            }

            const searchInList = findFirstElementInShadows(document.body, [
                'div.search-in-list.slds-is-relative',
                'force-list-view-manager-search-bar div.search-in-list'
            ]);
            if (!searchInList) {
                Log.warn('Feature.CaseList.Sort', '未找到列表 Search 容器，PCA排序按鈕未注入。');
                return;
            }

            const bar = document.createElement('ul');
            bar.id = BAR_ID;
            bar.style.display = 'flex';
            bar.style.alignItems = 'center';
            bar.style.gap = '6px';
            bar.style.margin = '0';
            bar.style.padding = '0';
            bar.style.listStyle = 'none';

            bar.style.position = 'absolute';
            bar.style.right = '100%';
            bar.style.top = '50%';
            bar.style.transform = 'translateY(-50%)';
            bar.style.marginRight = '8px';
            bar.style.zIndex = '1';

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
                '按賬單/開查分類，再按時間倒序排序（僅當前已渲染行）',
                () => {
                    sortPcaHintRowsInCaseList(tableBody);
                }
            );

            const restoreLi = createLiButton(
                'cec-pca-restore-btn',
                '還原排序',
                '還原到本次排序前的原始順序',
                () => {
                    restorePcaHintRowsInCaseList(tableBody);
                }
            );

            bar.appendChild(sortLi);
            bar.appendChild(restoreLi);

            searchInList.appendChild(bar);

            Log.info('Feature.CaseList.Sort', 'PCA排序按鈕已成功顯示在 Search 輸入框左側（不影響搜索框位置）。');

        } catch (e) {
            Log.warn('Feature.CaseList.Sort', `注入 PCA 排序按鈕失敗: ${e.message}`);
        }
    }

    /**
     * 快照保存原始順序
     */
    function snapshotPcaCaseListOriginalOrder(tableBody) {
        if (pcaCaseListOriginalRowKeys && pcaCaseListOriginalRowKeys.length > 0) {
            return;
        }
        const rows = tableBody ? Array.from(tableBody.querySelectorAll('tr[data-row-key-value]')) : [];
        pcaCaseListOriginalRowKeys = rows.map(r => r.getAttribute('data-row-key-value')).filter(Boolean);
    }

    /**
     * 執行PCA排序
     */
    function sortPcaHintRowsInCaseList(tableBody) {
        if (!tableBody) return;

        snapshotPcaCaseListOriginalOrder(tableBody);

        const rows = Array.from(tableBody.querySelectorAll('tr[data-row-key-value]'));
        if (rows.length === 0) return;

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
            if (va !== vb) return va - vb;

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

    /**
     * 還原原始順序
     */
    function restorePcaHintRowsInCaseList(tableBody) {
        if (!tableBody || !pcaCaseListOriginalRowKeys || pcaCaseListOriginalRowKeys.length === 0) {
            return;
        }

        const currentRows = Array.from(tableBody.querySelectorAll('tr[data-row-key-value]'));
        const rowMap = new Map(currentRows.map(r => [r.getAttribute('data-row-key-value'), r]));

        const fragment = document.createDocumentFragment();
        pcaCaseListOriginalRowKeys.forEach((id) => {
            const row = rowMap.get(id);
            if (row) {
                fragment.appendChild(row);
                rowMap.delete(id);
            }
        });

        rowMap.forEach((row) => fragment.appendChild(row));

        tableBody.appendChild(fragment);

        pcaCaseListIsSorted = false;
        Log.info('Feature.CaseList.Sort', '已還原為本次排序前的原始順序（僅當前已渲染行）。');
    }

    /**
     * 處理Case列表行（高亮、提示）
     */
    function processCaseListRows(tableBody) {
        const repliedEnabled = GM_getValue('notifyOnRepliedCaseEnabled', DEFAULTS.notifyOnRepliedCaseEnabled);
        const listHintEnabled = GM_getValue('pcaCaseListHintEnabled', DEFAULTS.pcaCaseListHintEnabled);
        const expiringHighlightEnabled = GM_getValue('highlightExpiringCasesEnabled', false);

        if (!repliedEnabled && !listHintEnabled && !expiringHighlightEnabled) return;

        const SEND_BUTTON_CACHE_KEY = CACHE_POLICY.REPLIED.KEY;
        const CACHE_TTL_MS = CACHE_POLICY.REPLIED.LIST_TTL_MS;
        const CLAIMS_CACHE_KEY = CACHE_POLICY.CLAIMS_LOST_PKG.KEY;
        const CLAIMS_TTL_MS = CACHE_POLICY.CLAIMS_LOST_PKG.LIST_TTL_MS;
        const BILLING_CACHE_KEY = CACHE_POLICY.BILLING_REBILL.KEY;
        const BILLING_TTL_MS = CACHE_POLICY.BILLING_REBILL.LIST_TTL_MS;

        const ANNOTATION_CLASS = 'cec-replied-annotation';

        const repliedCache = repliedEnabled ? GM_getValue(SEND_BUTTON_CACHE_KEY, {}) : {};
        if (repliedEnabled) {
            const repliedPurgeResult = purgeExpiredCacheEntries(repliedCache, CACHE_TTL_MS);
            if (repliedPurgeResult.changed) {
                GM_setValue(SEND_BUTTON_CACHE_KEY, repliedPurgeResult.cache);
                Log.info('Feature.CaseList', `已清理過期的已回覆 Case 緩存條目（removed: ${repliedPurgeResult.removed}）。`);
            }
        }

        const claimsCache = listHintEnabled ? GM_getValue(CLAIMS_CACHE_KEY, {}) : {};
        if (listHintEnabled) {
            const claimsPurgeResult = purgeExpiredCacheEntries(claimsCache, CLAIMS_TTL_MS);
            if (claimsPurgeResult.changed) {
                GM_setValue(CLAIMS_CACHE_KEY, claimsPurgeResult.cache);
                Log.info('Feature.CaseList', `已清理過期的開查緩存條目（removed: ${claimsPurgeResult.removed}）。`);
            }
        }

        const billingCache = listHintEnabled ? GM_getValue(BILLING_CACHE_KEY, {}) : {};
        if (listHintEnabled) {
            const billingPurgeResult = purgeExpiredCacheEntries(billingCache, BILLING_TTL_MS);
            if (billingPurgeResult.changed) {
                GM_setValue(BILLING_CACHE_KEY, billingPurgeResult.cache);
                Log.info('Feature.CaseList', `已清理過期的賬單緩存條目（removed: ${billingPurgeResult.removed}）。`);
            }
        }

        const allRows = tableBody.querySelectorAll('tr[data-row-key-value]');
        let isAnyCaseExpiring = false;

        allRows.forEach(row => {
            const caseId = row.getAttribute('data-row-key-value');

            if ((repliedEnabled || listHintEnabled) && caseId && row.dataset.cecProcessed !== 'true') {
                row.dataset.cecProcessed = 'true';

                let annotationText = null;
                let annotationMeta = null;

                if (listHintEnabled) {
                    const claimsEntry = claimsCache[caseId];
                    const billingEntry = billingCache[caseId];

                    if (claimsEntry && (Date.now() - claimsEntry.timestamp < CLAIMS_TTL_MS)) {
                        annotationText = ` 開查 - ${formatTimeAgoDaysHoursMinutes(claimsEntry.timestamp)}`;
                        annotationMeta = {
                            type: 'claims',
                            timestamp: claimsEntry.timestamp
                        };
                    } else if (billingEntry && (Date.now() - billingEntry.timestamp < BILLING_TTL_MS)) {
                        annotationText = ` 賬單 - ${formatTimeAgoDaysHoursMinutes(billingEntry.timestamp)}`;
                        annotationMeta = {
                            type: 'billing',
                            timestamp: billingEntry.timestamp
                        };
                    }
                }

                if (!annotationText && repliedEnabled) {
                    const repliedEntry = repliedCache[caseId];
                    if (repliedEntry && (Date.now() - repliedEntry.timestamp < CACHE_TTL_MS)) {
                        annotationText = ` ${formatTimeAgoSimple(repliedEntry.timestamp)}`;
                        annotationMeta = {
                            type: 'replied',
                            timestamp: repliedEntry.timestamp
                        };
                    }
                }

                if (annotationText) {
                    if (annotationMeta && (annotationMeta.type === 'claims' || annotationMeta.type === 'billing')) {
                        row.dataset.cecPcaType = annotationMeta.type;
                        row.dataset.cecPcaTimestamp = String(annotationMeta.timestamp);
                    } else {
                        delete row.dataset.cecPcaType;
                        delete row.dataset.cecPcaTimestamp;
                    }

                    const caseNumberCell = row.querySelector('td[data-label="Case Number"]');
                    if (caseNumberCell) {
                        const caseNumberLink = findElementInShadows(caseNumberCell, `a[href*="${caseId}"]`);
                        if (caseNumberLink) {
                            const injectionTarget = caseNumberLink.parentElement;
                            if (injectionTarget) {
                                const existingAnnotation = injectionTarget.querySelector(`.${ANNOTATION_CLASS}`);
                                if (existingAnnotation) existingAnnotation.remove();

                                const annotationSpan = document.createElement('span');
                                annotationSpan.className = ANNOTATION_CLASS;
                                annotationSpan.textContent = annotationText;
                                annotationSpan.style.fontSize = 'inherit';
                                annotationSpan.style.fontWeight = 'normal';
                                annotationSpan.style.marginLeft = '8px';

                                if (annotationMeta && (annotationMeta.type === 'claims' || annotationMeta.type === 'billing')) {
                                    const CLAIMS_BASE_COLOR = '#2e844a';
                                    const BILLING_BASE_COLOR = '#0070d2';

                                    let bgColor = (annotationMeta.type === 'claims') ? CLAIMS_BASE_COLOR : BILLING_BASE_COLOR;

                                    if (annotationMeta.type === 'claims') {
                                        const diffMs = Date.now() - annotationMeta.timestamp;
                                        const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
                                        if (diffDays >= 10) {
                                            bgColor = 'red';
                                        }
                                    }

                                    annotationSpan.style.backgroundColor = bgColor;
                                    annotationSpan.style.color = '#ffffff';
                                    annotationSpan.style.padding = '2px 6px';
                                    annotationSpan.style.borderRadius = '4px';
                                    annotationSpan.style.display = 'inline-block';
                                } else {
                                    annotationSpan.style.color = '#000000';
                                }

                                injectionTarget.appendChild(annotationSpan);
                            }
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
                            if (icon) icon.style.fill = 'white';
                        } else {
                            headerAction.style.removeProperty('background-color');
                            headerAction.style.removeProperty('color');

                            const icon = headerAction.querySelector('lightning-primitive-icon svg');
                            if (icon) icon.style.fill = '';
                        }
                    }
                }
            }
        }
    }

    /**
     * 初始化Case列表監控器
     */
    async function initCaseListMonitor() {
        const repliedEnabled = GM_getValue('notifyOnRepliedCaseEnabled', DEFAULTS.notifyOnRepliedCaseEnabled);
        const listHintEnabled = GM_getValue('pcaCaseListHintEnabled', DEFAULTS.pcaCaseListHintEnabled);
        const expiringHighlightEnabled = GM_getValue('highlightExpiringCasesEnabled', false);

        if (!repliedEnabled && !listHintEnabled && !expiringHighlightEnabled) {
            return;
        }

        try {
            const dataTableSelector = 'lightning-datatable';
            // 20000毫秒超時
            const dataTable = await waitForElementWithObserver(document.body, dataTableSelector, 20000);
            Log.info('Feature.CaseList', 'lightning-datatable 組件已找到。');

            const tableBody = await new Promise((resolve, reject) => {
                const startTime = Date.now();
                // 300毫秒輪詢
                const intervalId = setInterval(() => {
                    const tbody = findElementInShadows(dataTable, 'tbody');
                    if (tbody) {
                        clearInterval(intervalId);
                        resolve(tbody);
                    } else if (Date.now() - startTime > 10000) {
                        clearInterval(intervalId);
                        reject(new Error('在 lightning-datatable 內部等待 tbody 超時。'));
                    }
                }, 300);
            });
            Log.info('Feature.CaseList', '表格 tbody 元素已找到，準備處理行數據。');

            const previouslyProcessedRows = tableBody.querySelectorAll('tr[data-cec-processed="true"]');
            if (previouslyProcessedRows.length > 0) {
                previouslyProcessedRows.forEach(row => row.removeAttribute('data-cec-processed'));
                Log.info('Feature.CaseList', `狀態已重置，清除了 ${previouslyProcessedRows.length} 個舊的處理標記。`);
            }

            processCaseListRows(tableBody);
            injectPcaCaseListSortButtons(tableBody);
            Log.info('Feature.CaseList', '首次行數據處理完成。');

            // 300毫秒防抖
            const debouncedProcess = debounce(() => {
                Log.info('Feature.CaseList', '檢測到列表更新，執行處理...');
                processCaseListRows(tableBody);
                injectPcaCaseListSortButtons(tableBody);
            }, 300);

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

    /**
     * 獲取模板選項
     */
    async function getAndLogTemplateOptions() {
        const BUTTON_ICON_SELECTOR = 'lightning-icon[icon-name="utility:insert_template"]';
        const MENU_ITEM_SELECTOR = 'li.uiMenuItem a[role="menuitem"]';
        // 5000毫秒超時
        const TIMEOUT = 5000;
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

    /**
     * 準備編輯器並注入按鈕
     */
    async function handleEditorReadyForTemplateButtons() {
        try {
            const editorSelector = ".slds-rich-text-editor .tox-tinymce";
            // 15000毫秒等待編輯器
            const editor = await waitForElementWithObserver(document.body, editorSelector, 15000);

            const desiredHeight = GM_getValue("richTextEditorHeight", DEFAULTS.richTextEditorHeight) + "px";
            if (editor.style.height !== desiredHeight) {
                editor.style.height = desiredHeight;
            }

            const templates = await getAndLogTemplateOptions();

            if (templates && templates.length > 1) {
                const anchorIconSelector = 'lightning-icon[icon-name="utility:new_window"]';
                // 5000毫秒等待錨點
                const anchorIcon = await waitForElementWithObserver(document.body, anchorIconSelector, 5000);
                const anchorLi = anchorIcon.closest('li.cuf-attachmentsItem');
                const toolbarContainer = anchorLi ? anchorLi.parentElement : null;

                if (anchorLi && toolbarContainer) {
                    injectTemplateShortcutButtons(anchorLi, templates);

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

                        observer.observe(toolbarContainer, {
                            childList: true,
                            subtree: true
                        });
                        toolbarContainer.dataset.cecObserverAttached = 'true';
                        toolbarContainer._cecObserver = observer;
                    }
                } else {
                    Log.warn('UI.Enhancement', `未能找到用於注入快捷按鈕的錨點元素。`);
                }
            }

            setupSendButtonListener();
        } catch (error) {
            Log.warn('UI.Enhancement', `初始化模板快捷按鈕時出錯: ${error.message}`);
        }
    }

    /**
     * 設置發送按鈕監聽器
     */
    async function setupSendButtonListener() {
        const doNotCloseEnabled = GM_getValue('pcaDoNotClosePromptEnabled', DEFAULTS.pcaDoNotClosePromptEnabled);
        const listHintEnabled = GM_getValue('pcaCaseListHintEnabled', DEFAULTS.pcaCaseListHintEnabled);
        const repliedEnabled = GM_getValue('notifyOnRepliedCaseEnabled', DEFAULTS.notifyOnRepliedCaseEnabled);

        if (!doNotCloseEnabled && !listHintEnabled && !repliedEnabled) {
            return;
        }

        const SEND_BUTTON_CACHE_KEY = CACHE_POLICY.REPLIED.KEY;
        const REPLIED_PURGE_MS = CACHE_POLICY.REPLIED.PURGE_MS;
        const CLAIMS_CACHE_KEY = CACHE_POLICY.CLAIMS_LOST_PKG.KEY;
        const CLAIMS_TTL_MS = CACHE_POLICY.CLAIMS_LOST_PKG.TTL_MS;
        const BILLING_CACHE_KEY = CACHE_POLICY.BILLING_REBILL.KEY;
        const BILLING_TTL_MS = CACHE_POLICY.BILLING_REBILL.TTL_MS;

        const updateRepliedCache = (caseId) => {
            if (!caseId) return;
            const cache = GM_getValue(SEND_BUTTON_CACHE_KEY, {});
            const purgeResult = purgeExpiredCacheEntries(cache, REPLIED_PURGE_MS);
            if (purgeResult.changed) {
                Log.info('Feature.NotifyReplied', `已清理過期的已回覆 Case 緩存條目（寫入前, removed: ${purgeResult.removed}）。`);
            }
            cache[caseId] = {
                timestamp: Date.now()
            };
            GM_setValue(SEND_BUTTON_CACHE_KEY, cache);
        };

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
                if (entry && (now - entry.timestamp < CLAIMS_TTL_MS)) {
                    // 不覆寫
                } else {
                    if (billingCache[caseId]) {
                        delete billingCache[caseId];
                        changed = true;
                    }
                    claimsCache[caseId] = {
                        timestamp: now
                    };
                    changed = true;
                }
            } else if (type === 'B') {
                const entry = billingCache[caseId];
                if (entry && (now - entry.timestamp < BILLING_TTL_MS)) {
                    // 不覆寫
                } else {
                    if (claimsCache[caseId]) {
                        delete claimsCache[caseId];
                        changed = true;
                    }
                    billingCache[caseId] = {
                        timestamp: now
                    };
                    changed = true;
                }
            }

            if (claimsPurgeResult.changed || changed) {
                GM_setValue(CLAIMS_CACHE_KEY, claimsCache);
            }
            if (billingPurgeResult.changed || changed) {
                GM_setValue(BILLING_CACHE_KEY, billingCache);
            }
        };

        const detectSpecialType = () => {
            const categoryButton = findFirstElementInShadows(document.body, [
                'button[aria-label*="Case Category"]',
                'button[title*="Case Category"]'
            ]);
            const subCategoryButton = findFirstElementInShadows(document.body, [
                'button[aria-label*="Case Sub Category"]',
                'button[title*="Case Sub Category"]'
            ]);

            const category = getSelectedValue(categoryButton);
            const subCategory = getSelectedValue(subCategoryButton);

            const c = (category || '').toLowerCase();
            const s = (subCategory || '').toLowerCase();

            if (c.includes('claims') || s.includes('claim')) {
                return {
                    type: 'A',
                    category,
                    subCategory
                };
            }

            if (c.includes('bill') || s.includes('bill') || s.includes('rebill')) {
                return {
                    type: 'B',
                    category,
                    subCategory
                };
            }

            return null;
        };

        const ensureSendAndDoNotCloseChecked = () => {
            try {
                const container = findElementInShadows(document.body, '[data-target-selection-name="sfdc:RecordField.EmailMessage.CEC_Send_and_Do_Not_Close__c"]');
                const checkbox = container ? container.querySelector('input[type="checkbox"]') : null;
                if (!checkbox) {
                    Log.warn('Feature.SendIntercept', '未找到 "Send and Do Not Close" checkbox，將不阻塞送出。');
                    return;
                }
                if (!checkbox.checked) {
                    checkbox.click();
                    checkbox.dispatchEvent(new Event('change', {
                        bubbles: true
                    }));
                    Log.info('Feature.SendIntercept', '已自動勾選 "Send and Do Not Close" checkbox。');
                }
            } catch (e) {
                Log.warn('Feature.SendIntercept', `勾選 checkbox 時發生異常：${e.message}，將不阻塞送出。`);
            }
        };

        const showSendInterceptDialog = (typeLabel) => {
            return new Promise((resolve) => {
                const accentColor = (typeLabel === '開查') ? '#2e844a' : '#0070d2';

                const overlay = document.createElement('div');
                overlay.className = 'cec-global-completion-overlay show';
                overlay.style.zIndex = '10002';

                const box = document.createElement('div');
                box.className = 'cec-send-intercept-modal';
                box.style.width = 'min(860px, calc(100vw - 140px))';
                box.style.boxSizing = 'border-box';
                box.style.padding = '20px 24px 18px';
                box.style.borderRadius = '20px';
                box.style.backgroundColor = '#ffffff';
                box.style.border = '3px solid rgba(206, 230, 248, 1)';
                box.style.position = 'relative';
                box.style.display = 'flex';
                box.style.flexDirection = 'column';
                box.style.fontFamily = 'Segoe UI, Microsoft YaHei, PingFang TC, sans-serif';

                const accentBar = document.createElement('div');
                accentBar.style.position = 'absolute';
                accentBar.style.left = '0';
                accentBar.style.top = '0';
                accentBar.style.bottom = '0';
                accentBar.style.width = '10px';
                accentBar.style.borderTopLeftRadius = '18px';
                accentBar.style.borderBottomLeftRadius = '18px';
                accentBar.style.backgroundColor = accentColor;
                box.appendChild(accentBar);

                const closeBtn = document.createElement('div');
                closeBtn.textContent = '×';
                closeBtn.style.position = 'absolute';
                closeBtn.style.right = '14px';
                closeBtn.style.top = '10px';
                closeBtn.style.cursor = 'pointer';
                closeBtn.style.fontSize = '30px';
                closeBtn.style.lineHeight = '1';
                closeBtn.style.color = '#62666a';
                closeBtn.style.padding = '6px';
                box.appendChild(closeBtn);

                const iconCircle = document.createElement('div');
                iconCircle.style.position = 'absolute';
                iconCircle.style.left = '24px';
                iconCircle.style.top = '14px';
                iconCircle.style.width = '34px';
                iconCircle.style.height = '34px';
                iconCircle.style.borderRadius = '50%';
                iconCircle.style.backgroundColor = accentColor;
                iconCircle.style.display = 'flex';
                iconCircle.style.alignItems = 'center';
                iconCircle.style.justifyContent = 'center';
                iconCircle.style.color = '#ffffff';
                iconCircle.style.fontSize = '18px';
                iconCircle.style.fontWeight = '800';
                iconCircle.textContent = '!';
                box.appendChild(iconCircle);

                const messageWrapper = document.createElement('div');
                messageWrapper.style.flex = '1 1 auto';
                messageWrapper.style.display = 'flex';
                messageWrapper.style.flexDirection = 'column';
                messageWrapper.style.alignItems = 'center';
                messageWrapper.style.justifyContent = 'center';
                messageWrapper.style.textAlign = 'center';
                messageWrapper.style.padding = '32px 16px 20px';

                const line1 = document.createElement('div');
                line1.style.fontSize = '28px';
                line1.style.fontWeight = '800';
                line1.style.color = '#1a1a1a';
                line1.style.lineHeight = '1.25';
                line1.textContent = `這是【${typeLabel}】Case`;

                const line2 = document.createElement('div');
                line2.style.fontSize = '28px';
                line2.style.fontWeight = '800';
                line2.style.color = '#1a1a1a';
                line2.style.lineHeight = '1.25';
                line2.style.marginTop = '10px';
                line2.style.whiteSpace = 'nowrap';
                line2.textContent = '是否需要勾選“Send and Do Not Close”';

                messageWrapper.appendChild(line1);
                messageWrapper.appendChild(line2);
                box.appendChild(messageWrapper);

                const btnBar = document.createElement('div');
                btnBar.style.display = 'flex';
                btnBar.style.justifyContent = 'center';
                btnBar.style.gap = '14px';
                btnBar.style.marginTop = '6px';
                btnBar.style.paddingBottom = '6px';

                const btnNo = document.createElement('button');
                btnNo.className = 'slds-button slds-button_neutral';
                btnNo.textContent = '否（直接發送）';
                btnNo.style.minWidth = '190px';
                btnNo.style.height = '54px';
                btnNo.style.borderRadius = '12px';
                btnNo.style.fontFamily = 'Segoe UI, Microsoft YaHei, PingFang TC, sans-serif';
                btnNo.style.fontWeight = '700';

                const btnYes = document.createElement('button');
                btnYes.className = 'slds-button slds-button_brand';
                btnYes.textContent = '是（勾選後發送）';
                btnYes.style.minWidth = '210px';
                btnYes.style.height = '54px';
                btnYes.style.borderRadius = '12px';
                btnYes.style.backgroundColor = accentColor;
                btnYes.style.borderColor = accentColor;
                btnYes.style.fontFamily = 'Segoe UI, Microsoft YaHei, PingFang TC, sans-serif';
                btnYes.style.fontWeight = '700';

                const onKeyDown = (e) => {
                    if (e.key === 'Escape') {
                        cleanup();
                        resolve(null);
                    }
                };

                const cleanup = () => {
                    try {
                        document.removeEventListener('keydown', onKeyDown);
                    } catch (e) {}
                    try {
                        overlay.remove();
                    } catch (e) {}
                };

                btnNo.addEventListener('click', () => {
                    cleanup();
                    resolve('NO');
                });

                btnYes.addEventListener('click', () => {
                    cleanup();
                    resolve('YES');
                });

                closeBtn.addEventListener('click', () => {
                    cleanup();
                    resolve(null);
                });

                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) {
                        cleanup();
                        resolve(null);
                    }
                });

                document.addEventListener('keydown', onKeyDown);

                btnBar.appendChild(btnNo);
                btnBar.appendChild(btnYes);
                box.appendChild(btnBar);

                overlay.appendChild(box);
                document.body.appendChild(overlay);
            });
        };

        try {
            const sendButtonSelector = 'button.slds-button--brand.cuf-publisherShareButton';
            // 15000毫秒等待按鈕
            const sendButton = await waitForElementWithObserver(document.body, sendButtonSelector, 15000);

            const buttonLabel = findElementInShadows(sendButton, 'span.label');
            if (!buttonLabel || buttonLabel.textContent.trim() !== 'Send') {
                throw new Error('找到的按鈕不是預期的 "Send" 按鈕。');
            }

            if (sendButton.dataset.cecSendInterceptBound === 'true') {
                return;
            }
            sendButton.dataset.cecSendInterceptBound = 'true';

            sendButton.addEventListener('click', async (event) => {
                if (sendButtonBypassNextClick) {
                    sendButtonBypassNextClick = false;

                    const caseId = getCaseIdFromUrl(location.href);
                    if (caseId) {
                        const shouldSkipRepliedCache = (listHintEnabled && !!sendButtonPendingSpecialType);
                        if (repliedEnabled && !shouldSkipRepliedCache) updateRepliedCache(caseId);
                        if (listHintEnabled && sendButtonPendingSpecialType) {
                            updateSpecialCache(caseId, sendButtonPendingSpecialType);
                        }
                        Log.info('Feature.NotifyReplied', `\"Send\" 已放行並按設定寫入緩存（Case ID: ${caseId}）。`);
                    }

                    sendButtonPendingSpecialType = null;
                    return;
                }

                const special = detectSpecialType();

                if (!special) {
                    const caseId = getCaseIdFromUrl(location.href);
                    if (caseId && repliedEnabled) {
                        updateRepliedCache(caseId);
                        Log.info('Feature.NotifyReplied', `"Send" 按鈕被點擊，為 Case ID: ${caseId} 記錄緩存。`);
                    }
                    return;
                }

                if (doNotCloseEnabled || listHintEnabled) {
                    event.preventDefault();
                    event.stopImmediatePropagation();

                    const typeLabel = (special.type === 'A') ? '開查' : '賬單';

                    if (doNotCloseEnabled) {
                        const userChoice = await showSendInterceptDialog(typeLabel);
                        if (!userChoice) {
                            Log.info('Feature.SendIntercept', '用戶取消送出。');
                            return;
                        }
                        if (userChoice === 'YES') {
                            ensureSendAndDoNotCloseChecked();
                        }
                    }

                    sendButtonPendingSpecialType = special.type;
                    sendButtonBypassNextClick = true;
                    // 0毫秒延時觸發點擊
                    setTimeout(() => {
                        try {
                            sendButton.click();
                        } catch (e) {}
                    }, 0);
                    return;
                }

                return;

            }, true);

            Log.info('Feature.NotifyReplied', `"Send" 按鈕監聽器已成功部署。`);

        } catch (error) {
            Log.warn('Feature.NotifyReplied', `部署 "Send" 按鈕監聽器失敗: ${error.message}`);
        }
    }

    /**
     * 點擊模板選項並執行增強邏輯
     */
    async function clickTemplateOptionByTitle(templateTitle, buttonText) {
        let VIEW_ADJUSTMENT_OFFSET_PX = 0;
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const BUTTON_ICON_SELECTOR = 'lightning-icon[icon-name="utility:insert_template"]';
        const MENU_ITEM_SELECTOR = `li.uiMenuItem a[role="menuitem"][title="${templateTitle}"]`;
        const EDITOR_IFRAME_SELECTOR = 'iframe.tox-edit-area__iframe';
        const TIMEOUT = 5000;
        let clickableButton = null;

        let conversionMode = 'off';
        if (buttonText) {
            if (buttonText.includes('繁')) {
                conversionMode = 's2t';
            } else if (buttonText.includes('簡') || buttonText.includes('简')) {
                conversionMode = 't2s';
            }
        }

        const insertionMode = GM_getValue('templateInsertionMode', DEFAULTS.templateInsertionMode);

        try {
            const iframe = findElementInShadows(document.body, EDITOR_IFRAME_SELECTOR);
            if (iframe && iframe.contentDocument) {
                iframe.contentDocument.body.dataset.cecConversionMode = conversionMode;
            }
        } catch (e) {}

        if (insertionMode === 'logo') {
            try {
                // 5000毫秒超時
                const iframe = await waitForElementWithObserver(document.body, EDITOR_IFRAME_SELECTOR, TIMEOUT);
                // 100毫秒等待加載
                await delay(100);
                if (iframe && iframe.contentDocument) {
                    iframe.contentWindow.focus();
                    const editorDoc = iframe.contentDocument;
                    const editorBody = editorDoc.body;

                    const targetLineNumber = 10;
                    let linesFound = 0;
                    let targetNode = null;

                    const nodeFilter = {
                        acceptNode: function (node) {
                            const nodeName = node.nodeName.toUpperCase();
                            if (nodeName === 'BR' || ['DIV', 'P', 'TABLE', 'H1', 'H2', 'H3'].includes(nodeName)) {
                                return NodeFilter.FILTER_ACCEPT;
                            }
                            return NodeFilter.FILTER_SKIP;
                        }
                    };

                    const walker = editorDoc.createTreeWalker(editorBody, NodeFilter.SHOW_ELEMENT, nodeFilter, false);
                    while (linesFound < targetLineNumber && (targetNode = walker.nextNode())) {
                        linesFound++;
                    }

                    const selection = iframe.contentWindow.getSelection();
                    const range = editorDoc.createRange();

                    if (targetNode) {
                        range.setStartBefore(targetNode);
                    } else {
                        range.selectNodeContents(editorBody);
                        range.collapse(false);
                    }
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    Log.info('UI.Enhancement', `已執行歸零定位法 (跳過 ${linesFound} 行)`);
                }
            } catch (cursorError) {
                Log.error('UI.Enhancement', `預定位光標錯誤: ${cursorError.message}`);
            }
        }

        if (conversionMode !== 'off') {
            try {
                const iframe = findElementInShadows(document.body, EDITOR_IFRAME_SELECTOR);
                if (iframe && iframe.contentDocument && iframe.contentWindow) {
                    const win = iframe.contentWindow;
                    const doc = iframe.contentDocument;
                    const sel = win.getSelection();
                    if (sel.rangeCount > 0) {
                        const range = sel.getRangeAt(0);
                        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null, false);
                        let node;
                        while (node = walker.nextNode()) {
                            const position = range.comparePoint(node, 0);
                            if (position !== 1) {
                                const originalText = node.nodeValue;
                                const convertedText = ChineseConverter.convert(originalText, conversionMode);
                                if (originalText !== convertedText) {
                                    node.nodeValue = convertedText;
                                }
                            } else {
                                break;
                            }
                        }
                    }
                }
            } catch (e) {
                Log.warn('Converter', `Pre-Conversion 執行異常: ${e.message}`);
            }
        }

        try {
            // 5000毫秒超時
            const iconElement = await waitForElementWithObserver(document.body, BUTTON_ICON_SELECTOR, TIMEOUT);
            clickableButton = iconElement.closest('a[role="button"]');
            if (clickableButton.getAttribute('aria-expanded') !== 'true') {
                clickableButton.click();
                // 5000毫秒等待屬性
                await waitForAttributeChange(clickableButton, 'aria-expanded', 'true', TIMEOUT);
            }

            const menuId = clickableButton.getAttribute('aria-controls');
            // 5000毫秒等待菜單
            const menuContainer = await waitForElementWithObserver(document.body, `[id="${menuId}"]`, TIMEOUT);
            const targetOption = findElementInShadows(menuContainer, MENU_ITEM_SELECTOR);

            if (targetOption) {
                targetOption.click();
                // 150毫秒等待點擊生效
                await delay(150);

                if (!GM_getValue('postInsertionEnhancementsEnabled', DEFAULTS.postInsertionEnhancementsEnabled)) return;

                const iframe = findElementInShadows(document.body, EDITOR_IFRAME_SELECTOR);
                if (!iframe || !iframe.contentDocument) throw new Error('無法找到編輯器');

                const iframeWindow = iframe.contentWindow;
                const iframeDocument = iframe.contentDocument;
                const editorBody = iframeDocument.body;

                const firstParagraph = editorBody.querySelector('p');
                const targetContainerSpan = firstParagraph ? firstParagraph.querySelector('span') : null;

                if (!targetContainerSpan || targetContainerSpan.getElementsByTagName('br').length === 0) {
                    throw new Error('未找到預期的模板結構');
                }

                targetContainerSpan.dataset.cecTemplateZone = 'true';

                if (conversionMode !== 'off') {
                    try {
                        const computedStyle = iframeWindow.getComputedStyle(targetContainerSpan);
                        const targetFont = computedStyle.fontFamily;
                        const targetSize = computedStyle.fontSize;

                        const walker = iframeDocument.createTreeWalker(editorBody, NodeFilter.SHOW_TEXT, null, false);
                        let node;
                        while (node = walker.nextNode()) {
                            const position = targetContainerSpan.compareDocumentPosition(node);
                            if (position & Node.DOCUMENT_POSITION_PRECEDING) {
                                const originalText = node.nodeValue;
                                const convertedText = ChineseConverter.convert(originalText, conversionMode);
                                if (originalText !== convertedText) {
                                    node.nodeValue = convertedText;
                                }
                                const parent = node.parentElement;
                                if (parent && ['P', 'DIV', 'SPAN', 'FONT', 'STRONG', 'B'].includes(parent.nodeName)) {
                                    parent.style.fontFamily = targetFont;
                                    parent.style.fontSize = targetSize;
                                }
                            }
                        }
                    } catch (e) {
                        Log.warn('UI.Style', `樣式同步執行異常: ${e.message}`);
                    }
                }

                if (!editorBody.dataset.cecGlobalHandlersAttached) {

                    const isCursorInTemplate = () => {
                        const selection = iframeWindow.getSelection();
                        if (!selection.rangeCount) return false;
                        let node = selection.anchorNode;
                        while (node && node !== editorBody) {
                            if (node.nodeType === 1 && node.dataset.cecTemplateZone === 'true') {
                                return true;
                            }
                            node = node.parentNode;
                        }
                        return false;
                    };

                    editorBody.addEventListener('paste', (event) => {
                        if (isCursorInTemplate()) {
                            const items = (event.clipboardData || iframeWindow.clipboardData).items;
                            let hasImage = false;
                            for (let i = 0; i < items.length; i++) {
                                if (items[i].type.indexOf("image") !== -1) {
                                    hasImage = true;
                                    break;
                                }
                            }
                            if (hasImage) return;

                            event.preventDefault();
                            event.stopPropagation();

                            const textToPaste = (event.clipboardData || iframeWindow.clipboardData).getData('text/plain');
                            const currentMode = editorBody.dataset.cecConversionMode;
                            const finalPasteText = (currentMode && currentMode !== 'off') ?
                                ChineseConverter.convert(textToPaste, currentMode) :
                                textToPaste;

                            const selection = iframeWindow.getSelection();
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
                                br.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'nearest'
                                });
                            }
                        }
                    }, true);

                    const processQueue = new Set();
                    let isProcessing = false;

                    const processMutations = () => {
                        isProcessing = false;
                        const mode = editorBody.dataset.cecConversionMode;
                        if (!mode || mode === 'off' || processQueue.size === 0) {
                            processQueue.clear();
                            return;
                        }

                        const templateZone = editorBody.querySelector('[data-cec-template-zone="true"]');
                        if (!templateZone) {
                            processQueue.clear();
                            return;
                        }

                        processQueue.forEach(textNode => {
                            if (!textNode.isConnected) return;

                            const original = textNode.nodeValue;
                            const converted = ChineseConverter.convert(original, mode);

                            if (original === converted) return;

                            let shouldConvert = false;
                            if (templateZone.contains(textNode)) shouldConvert = true;
                            else {
                                const position = templateZone.compareDocumentPosition(textNode);
                                if (position & Node.DOCUMENT_POSITION_PRECEDING) shouldConvert = true;
                            }

                            if (shouldConvert) {
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
                            }
                        });

                        processQueue.clear();
                    };

                    const scheduleProcessing = () => {
                        if (!isProcessing) {
                            isProcessing = true;
                            requestAnimationFrame(processMutations);
                        }
                    };

                    const globalObserver = new MutationObserver((mutations) => {
                        const mode = editorBody.dataset.cecConversionMode;
                        if (!mode || mode === 'off') return;

                        let hasWork = false;

                        for (const mutation of mutations) {
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
                                            while (subNode = walker.nextNode()) {
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

                        if (hasWork) {
                            scheduleProcessing();
                        }
                    });

                    PageResourceRegistry.addObserver(globalObserver);

                    globalObserver.observe(editorBody, {
                        childList: true,
                        subtree: true,
                        characterData: true
                    });
                    editorBody.dataset.cecGlobalHandlersAttached = 'true';
                }

                editorBody.dataset.cecConversionMode = conversionMode;

                const userBrPosition = GM_getValue('cursorPositionBrIndex', DEFAULTS.cursorPositionBrIndex);
                const brIndex = userBrPosition - 1;
                const allBrTags = targetContainerSpan.getElementsByTagName('br');
                if (allBrTags.length > brIndex && brIndex >= 0) {
                    const targetPositionNode = allBrTags[brIndex];
                    const selection = iframeWindow.getSelection();
                    const range = iframeDocument.createRange();
                    range.setStartBefore(targetPositionNode);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);

                    if (typeof targetPositionNode.scrollIntoView === 'function') {
                        targetPositionNode.scrollIntoView({
                            behavior: 'auto',
                            block: 'center'
                        });
                        requestAnimationFrame(() => {
                            // 50毫秒延時調整滾動
                            setTimeout(() => {
                                window.scrollBy(0, VIEW_ADJUSTMENT_OFFSET_PX);
                            }, 50);
                        });
                    }
                }
                iframeWindow.focus();

            } else {
                throw new Error(`未找到標題為 "${templateTitle}" 的選項。`);
            }
        } catch (error) {
            Log.error('UI.Enhancement', `執行模板插入錯誤: ${error.message}`);
            if (clickableButton && clickableButton.getAttribute('aria-expanded') === 'true') clickableButton.click();
            throw error;
        }
    }

    /**
     * 注入模板快捷按鈕
     */
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

        const handleManualConvert = (targetMode) => {
            const iframe = findElementInShadows(document.body, 'iframe.tox-edit-area__iframe');
            if (!iframe || !iframe.contentDocument) return;

            const win = iframe.contentWindow;
            const doc = iframe.contentDocument;
            const editorBody = doc.body;

            const selection = win.getSelection();
            const hasSelection = selection.rangeCount > 0 && !selection.isCollapsed;

            const currentGlobalMode = editorBody.dataset.cecConversionMode;

            if (hasSelection) {
                if (currentGlobalMode && currentGlobalMode !== 'off' && currentGlobalMode !== targetMode) {
                    editorBody.dataset.cecConversionMode = 'off';
                    Log.info('Converter', `手動模式(${targetMode})與全局模式(${currentGlobalMode})衝突，已關閉全局自動轉換。`);
                } else {
                    Log.info('Converter', `手動模式(${targetMode})與全局模式一致，保持全局自動轉換開啟。`);
                }

                const range = selection.getRangeAt(0);
                const fragment = range.extractContents();

                let firstNode = fragment.firstChild;
                let lastNode = fragment.lastChild;

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
                editorBody.dataset.cecConversionMode = targetMode;
                Log.info('Converter', `未選中文字，已切換全局轉換模式為 ${targetMode}。`);
            }
        };

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
                e.preventDefault();
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

        // 100毫秒延時調整滾動
        setTimeout(() => repositionComposerToBottom(BOTTOM_OFFSET_PIXELS), 100);
    }

    /**
     * 重定位編輯器位置
     */
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

    /**
     * 提取追踪號並觸發IVP查詢
     */
    async function extractTrackingNumberAndTriggerIVP() {
        const TRACKING_CACHE_KEY = CACHE_POLICY.TRACKING.KEY;
        // 60分鐘
        const CACHE_TTL_MS = CACHE_POLICY.TRACKING.TTL_MS;
        const caseId = getCaseIdFromUrl(location.href);
        if (!caseId) {
            Log.warn('Feature.Query', `無法從當前 URL 提取 Case ID，追踪號緩存功能跳過。`);
            return;
        }

        const cache = GM_getValue(TRACKING_CACHE_KEY, {});

        const purgeResult = purgeExpiredCacheEntries(cache, CACHE_TTL_MS);
        if (purgeResult.changed) {
            GM_setValue(TRACKING_CACHE_KEY, purgeResult.cache);
            Log.info('Feature.Query', `已清理過期的追踪號緩存條目（removed: ${purgeResult.removed}）。`);
        }
        const entry = cache[caseId];

        const triggerAutoQueries = async () => {
            await autoQueryWebOnLoad();
            await autoQueryIVPOnLoad();

            if (ivpWindowHandle && !ivpWindowHandle.closed) {
                ivpWindowHandle.focus();

                // 100毫秒二次聚焦
                setTimeout(() => {
                    if (ivpWindowHandle && !ivpWindowHandle.closed) ivpWindowHandle.focus();
                }, 100);

                // 500毫秒三次聚焦
                setTimeout(() => {
                    if (ivpWindowHandle && !ivpWindowHandle.closed) ivpWindowHandle.focus();
                }, 500);
            }
        };

        if (entry && (Date.now() - entry.timestamp < CACHE_TTL_MS)) {
            foundTrackingNumber = entry.trackingNumber;
            Log.info('Feature.Query', `從緩存中成功讀取追踪號 (Case ID: ${caseId}): ${foundTrackingNumber}`);
            triggerAutoQueries();
            return;
        }

        const trackingRegex = /(1Z[A-Z0-9]{16})/;
        const selector = 'td[data-label="IDENTIFIER VALUE"] a, a[href*="/lightning/r/Shipment_Identifier"]';
        try {
            // 10000毫秒等待元素
            const element = await waitForElement(document.body, selector, 10000);
            if (element && element.textContent) {
                const match = element.textContent.trim().match(trackingRegex);
                if (match) {
                    const extractedNumber = match[0];
                    Log.info('Feature.Query', `成功提取追踪號: ${extractedNumber}`);
                    foundTrackingNumber = extractedNumber;
                    cache[caseId] = {
                        trackingNumber: extractedNumber,
                        timestamp: Date.now()
                    };
                    GM_setValue(TRACKING_CACHE_KEY, cache);
                    Log.info('Feature.Query', `追踪號已為 Case ID ${caseId} 寫入緩存，有效期60分鐘。`);

                    triggerAutoQueries();
                }
            }
        } catch (error) {
            Log.warn('Feature.Query', `在10秒內未找到追踪號元素，自動查詢將不會觸發。`);
        }
    }

    /**
     * 初始化IWantTo模塊監控器
     */
    function initIWantToModuleWatcher() {
        const ANCHOR_SELECTOR = 'c-cec-i-want-to-container lightning-layout.slds-var-p-bottom_small';
        let initialInjectionDone = false;
        // 20000毫秒等待組件
        waitForElementWithObserver(document.body, ANCHOR_SELECTOR, 20000)
            .then(anchorElement => {
                if (anchorElement.dataset.customButtonsInjected !== 'true') {
                    injectIWantToButtons(anchorElement);
                    initialInjectionDone = true;
                }
            })
            .catch(() => {
                Log.warn('Feature.IWT', `未找到 "I Want To..." 組件容器，自動化按鈕未注入。`);
            });
        const checkAndReInject = () => {
            if (isScriptPaused || !initialInjectionDone) return;
            const anchorElement = findElementInShadows(document.body, ANCHOR_SELECTOR);
            if (anchorElement && anchorElement.dataset.customButtonsInjected !== 'true') {
                injectIWantToButtons(anchorElement);
            }
        };
        // 350毫秒防抖
        iwtModuleObserver = new MutationObserver(debounce(checkAndReInject, 350));
        PageResourceRegistry.addObserver(iwtModuleObserver);
        iwtModuleObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * 處理Re-Open Case第二階段
     */
    async function handleStageTwoReOpen(comment) {
        // 5000毫秒等待組件
        const reOpenCaseComponent = await waitForElementWithObserver(document.body, 'c-cec-re-open-case', 5000);
        // 500毫秒等待渲染
        await new Promise(resolve => setTimeout(resolve, 500));
        if (comment) {
            // 5000毫秒等待輸入框
            const commentBox = await waitForElementWithObserver(reOpenCaseComponent, 'textarea[name="commentField"]', 5000);
            simulateTyping(commentBox, comment);
        }
        // 500毫秒等待響應
        await new Promise(resolve => setTimeout(resolve, 500));
        // 5000毫秒等待提交按鈕
        const finalSubmitButton = await waitForElementWithObserver(reOpenCaseComponent, '.slds-card__footer button.slds-button_brand', 5000);
        finalSubmitButton.click();
        showCompletionToast(reOpenCaseComponent, 'Re-Open Case: 操作成功！請等待網頁更新！');
    }

    /**
     * 處理Close Case第二階段
     */
    async function handleStageTwoCloseCase(comment, mode = 'normal') {
        const delay = mode === 'fast' ? 10 : 800;
        Log.info('Feature.IWT.CloseCase', `以 "${mode}" 模式執行 Close Case，延時: ${delay}ms。`);

        // 5000毫秒等待組件
        const closeCaseComponent = await waitForElementWithObserver(document.body, 'c-cec-close-case', 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        await selectComboboxOption(closeCaseComponent, 'button[aria-label="Case Sub Status"]', 'Request Completed');
        if (comment) {
            // 5000毫秒等待輸入框
            const commentBox = await waitForElementWithObserver(closeCaseComponent, 'textarea.slds-textarea', 5000);
            simulateTyping(commentBox, comment);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        // 5000毫秒等待提交按鈕
        const finalSubmitButton = await waitForElementWithObserver(closeCaseComponent, '.slds-card__footer button.slds-button_brand', 5000);
        finalSubmitButton.click();
        showCompletionToast(closeCaseComponent, 'Close Case: 操作成功！請等待網頁更新！');
    }

    /**
     * 處理Document Contact第二階段
     */
    async function handleStageTwoDocumentContact(comment) {
        // 5000毫秒等待組件
        const docContactComponent = await waitForElementWithObserver(document.body, 'c-cec-document-customer-contact', 5000);
        // 100毫秒等待渲染
        await new Promise(resolve => setTimeout(resolve, 100));
        const radioButtonSelector = 'input[value="Spoke with customer"]';
        // 5000毫秒等待單選框
        const radioButton = await waitForElementWithObserver(docContactComponent, radioButtonSelector, 5000);
        // 100毫秒等待監聽器
        await new Promise(resolve => setTimeout(resolve, 100));
        radioButton.click();
        if (comment) {
            try {
                // 5000毫秒等待輸入框
                const commentBox = await waitForElementWithObserver(docContactComponent, 'textarea.slds-textarea', 5000);
                simulateTyping(commentBox, comment);
            } catch (error) {
                // 忽略錯誤
            }
        }
        // 100毫秒等待響應
        await new Promise(resolve => setTimeout(resolve, 100));
        // 5000毫秒等待提交按鈕
        const finalSubmitButton = await waitForElementWithObserver(docContactComponent, '.slds-card__footer button.slds-button_brand', 5000);
        finalSubmitButton.click();
        showCompletionToast(docContactComponent, 'Document Contact: 操作成功！請等待網頁更新！');
    }

    /**
     * 執行I Want To自動化
     */
    async function automateIWantToAction(config) {
        const {
            searchText,
            stageTwoHandler,
            finalComment
        } = config;
        Log.info('Feature.IWT', `啟動自動化流程: "${searchText}"。`);
        try {
            // 5000毫秒等待搜索框
            const searchInput = await waitForElementWithObserver(document.body, 'c-ceclookup input.slds-combobox__input', 5000);
            const dropdownTrigger = searchInput.closest('.slds-dropdown-trigger');
            if (!dropdownTrigger) throw new Error('無法找到下拉列表的觸發容器 .slds-dropdown-trigger');
            searchInput.focus();
            simulateTyping(searchInput, searchText);
            // 5000毫秒等待展開
            await waitForAttributeChange(dropdownTrigger, 'aria-expanded', 'true', 5000);
            // 200毫秒等待結果
            await new Promise(resolve => setTimeout(resolve, 200));
            simulateKeyEvent(searchInput, 'ArrowDown', 40);
            // 100毫秒按鍵延遲
            await new Promise(resolve => setTimeout(resolve, 100));
            simulateKeyEvent(searchInput, 'Enter', 13);
            const firstSubmitButton = await waitForButtonToBeEnabled('lightning-button.submit_button button');
            firstSubmitButton.click();
            if (stageTwoHandler && typeof stageTwoHandler === 'function') {
                await stageTwoHandler(finalComment);
                Log.info('Feature.IWT', `自動化流程: "${searchText}" 已成功完成。`);
            }
        } catch (error) {
            Log.error('Feature.IWT', `流程 "${searchText}" 在 "第一階段" 失敗: ${error.message}`);
        }
    }

    /**
     * 注入I Want To按鈕
     */
    function injectIWantToButtons(anchorElement) {
        if (anchorElement.dataset.customButtonsInjected === 'true') {
            return;
        }
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'slds-grid slds-wrap';
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

        const handleOutsideClick = (e, dropdownMenu, trigger) => {
            if (!trigger.contains(e.target)) {
                dropdownMenu.classList.remove('show');
                document.removeEventListener('click', trigger.__outsideClickListener);
                delete trigger.__outsideClickListener;
            }
        };

        // 應用長按事件處理
        const applyLongPressHandler = (element, config, comment) => {
            let pressTimer = null;
            let longPressTriggered = false;

            const startPress = (event) => {
                if (event.button !== 0) return;
                longPressTriggered = false;
                // 1500毫秒長按觸發
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

            const cancelPress = () => {
                clearTimeout(pressTimer);
            };

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

    /**
     * 更新IWT按鈕狀態
     */
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

    /**
     * 初始化Assign按鈕監控
     */
    async function initAssignButtonMonitor() {
        const ASSIGN_BUTTON_SELECTORS = [
            'button[title="Assign Case to Me"]',
            'button[aria-label="Assign Case to Me"]',
            'button[title="Assign Case to Me"], button[aria-label="Assign Case to Me"]'
        ];
        try {
            // 20000毫秒等待指派按鈕
            const assignButton = await waitForElementWithObserver(document.body, ASSIGN_BUTTON_SELECTORS[0], 20000);
            const finalAssignButton = assignButton || findFirstElementInShadows(document.body, ASSIGN_BUTTON_SELECTORS);
            if (!finalAssignButton) {
                throw new Error('未找到 "Assign Case to Me" 按鈕（已嘗試回退選擇器）。');
            }
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

    /**
     * 安全點擊選項
     */
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
                        // 10毫秒快速查找按鈕
                        const button = await waitForElementWithObserver(modalRoot, buttonSelector, 10);
                        button.dispatchEvent(new MouseEvent("click", {
                            bubbles: true
                        }));
                        // 5毫秒等待菜單
                        await new Promise(resolve => setTimeout(resolve, 5));

                        // 10毫秒快速查找選項
                        const item = await waitForElementWithObserver(document.body, itemSelector, 10);
                        item.dispatchEvent(new MouseEvent("click", {
                            bubbles: true
                        }));
                        // 5毫秒UI延遲
                        await new Promise(resolve => setTimeout(resolve, 5));
                        return true;
                    } catch (error) {
                        if (i === 1) throw error;
                        document.body.click();
                        // 5毫秒重試延遲
                        await new Promise(resolve => setTimeout(resolve, 5));
                    }
                }
            } catch (error) {
                Log.warn('UI.ModalButtons', `選擇選項 "${option}" 失敗，將嘗試下一個備選項。錯誤: ${error.message}`);
            }
        }
        throw new Error(`所有備選選項 [${options.join(', ')}] 都選擇失敗`);
    }

    /**
     * 添加彈窗快捷操作按鈕
     */
    function addModalActionButtons(footer) {
        if (footer.querySelector(".custom-action-button-container")) {
            return;
        }
        const modalRoot = footer.getRootNode()?.host;
        if (!modalRoot) return;
        const saveButtonWrapper = findElementInShadows(footer, 'lightning-button[variant="brand"]');
        if (!saveButtonWrapper) {
            return;
        }
        footer.style.display = 'flex';
        footer.style.justifyContent = 'flex-end';
        footer.style.alignItems = 'center';
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
                } catch (error) {
                    // 忽略錯誤
                }
            });
            buttonContainer.appendChild(btn);

            if ((index + 1) % 7 === 0 && (index + 1) < buttonsConfig.length) {
                const flexBreaker = document.createElement('div');
                flexBreaker.style.flexBasis = '100%';
                flexBreaker.style.height = '0';
                buttonContainer.appendChild(flexBreaker);
            }
        });

        footer.insertBefore(buttonContainer, saveButtonWrapper);
        Log.info('UI.ModalButtons', `快捷操作按鈕已成功注入彈窗。`);
    }

    /**
     * 帶重試的消息發送
     */
    function sendMessageWithRetries(windowHandle, messagePayload, targetOrigin) {
        const MAX_RETRIES = 60;
        // 2000毫秒重試間隔
        const RETRY_INTERVAL = 2000;
        let attempt = 0;
        let intervalId = null;
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

    /**
     * 自動觸發IVP查詢
     */
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

    /**
     * 自動觸發Web查詢
     */
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

            const messagePayload = {
                type: 'CEC_SEARCH_REQUEST',
                payload: {
                    trackingNumber: foundTrackingNumber,
                    timestamp: Date.now()
                }
            };

            sendMessageWithRetries(webWindowHandle, messagePayload, 'https://www.ups.com');
            Log.info('Feature.Web', `查詢請求已發送至 UPS Web 窗口。`);

        } catch (err) {
            Log.error('Feature.Web', `自動查詢 Web 時發生未知錯誤: ${err.message}`);
        }
    }

    /**
     * 調整Case描述區域高度
     */
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

    /**
     * 處理聯繫人卡片高亮及狀態檢查
     */
    function processContactCard(card) {
        const highlightMode = GM_getValue('accountHighlightMode', 'pca');
        if (highlightMode === 'off') {}
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
        // 60分鐘緩存
        const CACHE_TTL = 60 * 60 * 1000;
        const cleanedLog = Object.fromEntries(Object.entries(allLogs).filter(([_, data]) => now - data.timestamp < CACHE_TTL));

        const findAndDisablePickupButton = () => {
            // 500毫秒輪詢
            const POLLING_INTERVAL_MS = 500;
            // 5000毫秒超時
            const TIMEOUT_MS = 5000;
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

    /**
     * 激進查找元素
     */
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

    /**
     * 攔截IVP卡片
     */
    function handleIVPCardBlocking(cardElement) {
        const shouldBlock = GM_getValue('blockIVPCard', DEFAULTS.blockIVPCard);
        if (!shouldBlock) return;
        if (cardElement.dataset.ivpObserverAttached === 'true') {
            return;
        }
        cardElement.dataset.ivpObserverAttached = 'true';
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
            // 15000毫秒等待iframe
        }, 15000);
        localObserver.observe(cardElement, {
            childList: true,
            subtree: true
        });
        if (findAndStoreTask()) {
            localObserver.disconnect();
            clearTimeout(timeoutHandle);
        }
    }

    /**
     * 處理自動指派
     */
    async function handleAutoAssign(caseUrl, isCachedCase = false) {
        const ASSIGNMENT_CACHE_KEY = 'assignmentLog';
        const caseId = getCaseIdFromUrl(caseUrl);
        if (!caseId) {
            Log.error('Feature.AutoAssign', `無法從 URL (${caseUrl}) 提取 Case ID，自動指派緩存操作已中止。`);
            return;
        }
        // 15000毫秒等待owner塊
        const findOwnerBlockWithRetry = (timeout = 15000) => {
            return new Promise((resolve, reject) => {
                const startTime = Date.now();
                // 500毫秒輪詢
                const interval = setInterval(() => {
                    if (Date.now() - startTime > timeout) {
                        clearInterval(interval);
                        reject(new Error(`在${timeout/1000}秒內等待 "Case Owner" 信息塊超時。`));
                        return;
                    }
                    const allHighlightItems = findAllElementsInShadows(document.body, 'records-highlights-details-item');
                    for (const item of allHighlightItems) {
                        const titleElement = findElementInShadows(item, 'p.slds-text-title');
                        if (titleElement && (titleElement.getAttribute('title') === 'Case Owner' || titleElement.innerText.trim() === 'Case Owner')) {
                            clearInterval(interval);
                            resolve(item);
                            return;
                        }
                    }
                }, 500);
            });
        };
        try {
            if (isCachedCase) {
                try {
                    // 10000毫秒等待按鈕
                    const assignButton = await waitForElementWithObserver(document.body, 'button[title="Assign Case to Me"]', 10000);
                    if (assignButton && !assignButton.disabled) {
                        assignButton.style.setProperty('background-color', '#0070d2', 'important');
                        assignButton.style.setProperty('color', '#fff', 'important');
                    }
                } catch (error) {
                    // 忽略錯誤
                }
                return;
            }
            Log.info('Feature.AutoAssign', `自動指派流程啟動。`);
            const targetUser = GM_getValue('autoAssignUser', DEFAULTS.autoAssignUser);
            if (!targetUser) {
                Log.warn('Feature.AutoAssign', `未設置目標用戶名，自動指派功能已禁用。`);
                return;
            }
            let ownerBlock;
            try {
                ownerBlock = await findOwnerBlockWithRetry();
            } catch (err) {
                return;
            }
            let ownerElement, currentOwner;
            try {
                const preciseOwnerSelector = 'force-owner-lookup .owner-name span';
                // 10000毫秒等待owner元素
                ownerElement = await waitForElementWithObserver(ownerBlock, preciseOwnerSelector, 10000);
                currentOwner = ownerElement?.innerText?.trim() || '';
            } catch (err) {
                Log.error('Feature.AutoAssign', `查找 "Case Owner" 姓名元素時發生錯誤或超時。`);
                return;
            }
            if (!currentOwner) {
                return;
            }
            if (currentOwner.toLowerCase() !== targetUser.toLowerCase()) {
                Log.info('Feature.AutoAssign', `Owner "${currentOwner}" 與目標用戶 "${targetUser}" 不匹配。`);
                return;
            }
            let assignButton;
            try {
                // 100000毫秒等待按鈕
                assignButton = await waitForElementWithObserver(document.body, 'button[title="Assign Case to Me"]', 100000);
            } catch (err) {
                Log.error('Feature.AutoAssign', `查找 "Assign Case to Me" 按鈕時發生錯誤或超時。`);
                return;
            }
            if (assignButton && !assignButton.disabled) {
                // 300毫秒點擊延時
                await new Promise(resolve => setTimeout(resolve, 300));
                assignButton.click();
                assignButton.style.setProperty('background-color', '#0070d2', 'important');
                assignButton.style.setProperty('color', '#fff', 'important');
                const cache = GM_getValue(ASSIGNMENT_CACHE_KEY, {});
                // 60分鐘緩存
                const CACHE_TTL = 60 * 60 * 1000;
                cache[caseId] = {
                    timestamp: Date.now()
                };
                GM_setValue(ASSIGNMENT_CACHE_KEY, cache);
                Log.info('Feature.AutoAssign', `自動指派成功 (Case ID: ${caseId})，已點擊 "Assign Case to Me" 按鈕並更新緩存。`);

                setTimeout(() => {
                    Log.info('Feature.AutoAssign', `8秒後執行高亮狀態重新檢查。`);
                    checkAndColorComposeButton();
                    // 8000毫秒狀態檢查
                }, 8000);
            } else {
                Log.warn('Feature.AutoAssign', `"Assign Case to Me" 按鈕不存在或處於禁用狀態。`);
            }
        } catch (outerErr) {
            Log.error('Feature.AutoAssign', `執行自動指派時發生未知外部錯誤: ${outerErr.message}`);
        }
    }

    /**
     * 處理關聯聯繫人彈窗
     */
    function processAssociateContactModal(modal) {
        if (processedModals.has(modal)) {
            return;
        }
        let contactSentinel = null;
        const cleanupObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const removedNode of mutation.removedNodes) {
                    if (removedNode === modal || removedNode.contains(modal)) {
                        if (contactSentinel) contactSentinel.disconnect();
                        processedModals.delete(modal);
                        cleanupObserver.disconnect();
                        return;
                    }
                }
            }
        });
        cleanupObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
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
            const setModalMaxHeight = (m) => {
                m.style.maxHeight = '80vh';
                m.style.overflowY = 'auto';
            };
            const matchAndHighlightRow = (row) => {
                if (!foundTrackingNumber) return;
                const extractedValue = foundTrackingNumber.substring(2, 8);
                const accountCell = row.querySelector('td[data-label="Account Number"]');
                if (accountCell) {
                    const accountValue = accountCell.getAttribute('data-cell-value') || accountCell.textContent.trim();
                    if (accountValue && accountValue.replace(/^0+/, '') === extractedValue.replace(/^0+/, '')) {
                        accountCell.style.backgroundColor = 'yellow';
                        Log.info('UI.ContactModal', `"Associate Contact" 彈窗中匹配賬號 "${accountValue}" 的行已高亮。`);
                    }
                }
            };
            const reorderRow = (row, isHeader = false) => {
                const cells = Array.from(row.children);
                const fragment = document.createDocumentFragment();
                fieldsInDesiredOrder.forEach(label => {
                    if (labelToOriginalIndexMap.has(label)) {
                        const originalIndex = labelToOriginalIndexMap.get(label);
                        if (cells[originalIndex]) {
                            fragment.appendChild(cells[originalIndex]);
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
            obs.observe(tableBody, {
                childList: true
            });
            setModalMaxHeight(modal);
            processedModals.add(modal);
            contactSentinel = deployLinkContactSentinel(modal);
        } catch (error) {
            Log.error('UI.ContactModal', `處理 "Associate Contact" 彈窗時出錯: ${error.message}`);
        } finally {
            requestAnimationFrame(() => {
                modal.style.visibility = 'visible';
            });
        }
    }

    /**
     * 部署聯繫人關聯哨兵
     */
    function deployLinkContactSentinel(modal) {
        const sentinel = new MutationObserver((mutations) => {
            if (isScriptPaused) return;
            for (const mutation of mutations) {
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    const element = target.getAttribute('data-whatelement');
                    const classes = target.getAttribute('data-whatclasses');
                    if (element === 'button' && classes && classes.includes('slds-button_brand')) {
                        sentinel.disconnect();
                        // 15000毫秒等待更新
                        waitForElementWithObserver(document.body, 'article.cCEC_ContactSummary', 15000)
                            .then(card => {
                                processContactCard(card);
                            }).catch(error => {
                                // 忽略錯誤
                            });
                        if (GM_getValue('sentinelCloseEnabled', DEFAULTS.sentinelCloseEnabled)) {
                            // 500毫秒延時關閉
                            setTimeout(() => {
                                const modalToClose = document.querySelector('div.cCEC_ModalLinkAccount');
                                if (modalToClose) {
                                    modalToClose.style.display = 'none';
                                }
                            }, 500);
                        }
                        return;
                    }
                }
            }
        });
        sentinel.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-whatelement', 'data-whatclasses']
        });
        return sentinel;
    }

    /**
     * 檢查並標記Compose按鈕
     */
    function checkAndColorComposeButton() {
        const MAX_ATTEMPTS = 20;
        // 500毫秒輪詢
        const POLL_INTERVAL_MS = 500;
        let attempts = 0;

        const poller = setInterval(() => {
            PageResourceRegistry.addInterval(poller);
            const composeButton = findElementInShadows(document.body, "button.testid__dummy-button-submit-action");

            if (composeButton || attempts >= MAX_ATTEMPTS) {
                clearInterval(poller);

                if (!composeButton) {
                    Log.warn('UI.ButtonAlert', '"Compose" 按鈕高亮檢查終止，在 10 秒內未找到按鈕元素。');
                    return;
                }

                const timerTextEl = findElementInShadows(document.body, ".milestoneTimerText");
                const isOverdue = timerTextEl && timerTextEl.textContent.includes("overdue");
                const isAlreadyRed = composeButton.style.backgroundColor === "red";

                if (isOverdue && !isAlreadyRed) {
                    composeButton.style.backgroundColor = "red";
                    composeButton.style.color = "white";
                    Log.info('UI.ButtonAlert', `"Compose" 按鈕已因計時器超期標紅。`);
                } else if (!isOverdue && isAlreadyRed) {
                    composeButton.style.backgroundColor = "";
                    composeButton.style.color = "";
                }
            }
            attempts++;
        }, POLL_INTERVAL_MS);
    }

    /**
     * 檢查並標記關聯按鈕
     */
    function checkAndColorAssociateButton() {
        const relatedCasesTab = findElementInShadows(document.body, 'li[data-label^="Related Cases ("]');
        const associateButton = findElementInShadows(document.body, 'button[title="Associate Contact"]');
        if (!associateButton) return;
        const hasRelatedCases = relatedCasesTab && relatedCasesTab.getAttribute("title") !== "Related Cases (0)";
        const isAlreadyRed = associateButton.style.backgroundColor === "red";
        if (hasRelatedCases && !isAlreadyRed) {
            associateButton.style.backgroundColor = "red";
            Log.info('UI.ButtonAlert', `"Associate Contact" 按鈕已因存在關聯案件標紅。`);
        } else if (!hasRelatedCases && isAlreadyRed) {
            associateButton.style.backgroundColor = "";
        }
    }

    /**
     * 確定案件狀態
     */
    function determineCaseStatus() {
        return new Promise((resolve) => {
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

            // 15000毫秒超時
            const timeout = 15000;
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

    /**
     * 檢查必要字段是否為空
     */
    async function areRequiredFieldsEmpty() {
        // 15000毫秒超時
        const CHECK_TIMEOUT = 15000;
        // 300毫秒輪詢
        const POLL_INTERVAL = 300;
        const MIN_FIELDS_THRESHOLD = 3;
        const fieldsToCheck = ['Substatus', 'Case Category', 'Case Sub Category'];

        const dissectAndFindText = (rootNode, fieldTitle) => {
            let foundText = null;
            const processedNodes = new Set();

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
    // 模塊：關聯案件提取器模塊
    // 用途：處理Related Cases標籤的數據提取與增強顯示
    // =================================================================================
    const relatedCasesExtractorModule = {
        CASE_ROWS_CONTAINER_SELECTOR: 'c-cec-shipment-identifier-display-rows',
        // 8000毫秒提取超時
        EXTRACTION_TIMEOUT_MS: 8000,
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
            // 100毫秒輪詢
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
            }, 100);
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

            const worker = async () => {
                while (nextIndex < rowsArray.length) {
                    const current = nextIndex++;
                    try {
                        const value = await this.processSingleRow(rowsArray[current], current + 1);
                        results[current] = {
                            status: 'fulfilled',
                            value
                        };
                    } catch (error) {
                        results[current] = {
                            status: 'rejected',
                            reason: error
                        };
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

                        // 1500毫秒恢復文本
                        setTimeout(() => {
                            contentDiv.textContent = originalText;
                            contentDiv.style.color = '';
                        }, 1500);
                    }).catch(err => {
                        Log.error('Feature.RelatedCases', `複製 "${text}" 失敗: ${err}`);
                        const originalText = text;
                        contentDiv.textContent = 'Copy Failed!';

                        // 2000毫秒恢復文本
                        setTimeout(() => {
                            contentDiv.textContent = originalText;
                        }, 2000);
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
    // 模塊：頁面任務執行器
    // 用途：執行頁面加載時的各項任務掃描
    // =================================================================================

    /**
     * 啟動高頻掃描器
     */
    function startHighFrequencyScanner(caseUrl) {
        // 300毫秒掃描間隔
        const SCAN_INTERVAL = 300;
        // 20000毫秒總超時
        const MASTER_TIMEOUT = 20000;
        const startTime = Date.now();

        let tasksToRun = CASE_PAGE_CHECKS_CONFIG.filter(task => task.once);
        if (tasksToRun.length === 0) return;

        const processedElements = new WeakSet();
        Log.info('Core.Scanner', `高頻掃描器啟動，處理 ${tasksToRun.length} 個一次性任務。`);

        globalScannerId = setInterval(() => {
            if (isScriptPaused || tasksToRun.length === 0 || Date.now() - startTime > MASTER_TIMEOUT) {
                clearInterval(globalScannerId);
                globalScannerId = null;
                if (tasksToRun.length > 0) {
                    const unfinished = tasksToRun.map(t => t.id).join(', ');
                    Log.warn('Core.Scanner', `掃描器超時，仍有 ${tasksToRun.length} 個任務未完成: [${unfinished}]。`);
                } else {
                    Log.info('Core.Scanner', `所有一次性任務完成，掃描器停止。`);
                    processedCaseUrlsInSession.add(caseUrl);
                    Log.info('Core.Scanner', `本次掃描耗時: ${Date.now() - startTime}ms，Session 已處理 Case 數量: ${processedCaseUrlsInSession.size}`);
                }
                return;
            }

            const currentTasks = [...tasksToRun];
            for (const task of currentTasks) {
                const elements = findAllElementsInShadows(document, task.selector);
                let taskCompleted = false;
                for (const el of elements) {
                    if (processedElements.has(el)) continue;
                    try {
                        task.handler(el);
                        processedElements.add(el);
                        taskCompleted = true;
                        break;
                    } catch (e) {
                        // 忽略錯誤
                    }
                }
                if (taskCompleted) {
                    tasksToRun = tasksToRun.filter(t => t.id !== task.id);
                }
            }
        }, SCAN_INTERVAL);
        PageResourceRegistry.addInterval(globalScannerId);
    }

    const CASE_PAGE_CHECKS_CONFIG = [{
        id: 'handleContactLogic',
        selector: 'article.cCEC_ContactSummary, button[title="Associate Contact"]',
        once: true,
        handler: (element) => {
            if (window.contactLogicDone) return;
            if (element.matches('article.cCEC_ContactSummary')) {
                window.contactLogicDone = true;
                processContactCard(element);
            }
        }
    }, {
        id: 'initComposeButtonWatcher',
        selector: ".milestoneTimerText, .noPendingMilestoneMessage",
        once: true,
        handler: (element) => {
            if (element.matches('.milestoneTimerText')) {
                checkAndColorComposeButton();
            }
        }
    }, {
        id: 'setupTabClickTriggers',
        selector: 'a.slds-tabs_scoped__link[data-label^="Related Cases"]',
        once: true,
        handler: (tabLink) => {
            const tabParent = tabLink.closest('li');
            if (tabParent && !tabParent.dataset.listenerAttached) {
                tabParent.addEventListener('click', () => {
                    relatedCasesExtractorModule.handleTabClick(tabLink);
                }, {
                    once: true
                });
                tabParent.dataset.listenerAttached = 'true';
            }
        }
    }, {
        id: 'initRelatedCasesWatcherForButton',
        selector: 'li[data-label^="Related Cases ("]',
        once: true,
        handler: () => {
            checkAndColorAssociateButton();
        }
    }, {
        id: 'adjustCaseDescription',
        selector: 'lightning-textarea[data-field="DescriptionValue"], div.slds-form-element__label',
        once: true,
        handler: () => {
            adjustCaseDescriptionHeight();
        }
    }, {
        id: 'blockIVPCard',
        selector: 'article.cCEC_IVPCanvasContainer',
        once: true,
        resilient: true,
        handler: (cardElement) => {
            handleIVPCardBlocking(cardElement);
        }
    }, {
        id: 'addIVPButtons',
        selector: 'c-cec-datatable',
        once: true,
        resilient: true,
        handler: (datatableContainer) => {
            const shadowRoot = datatableContainer.shadowRoot;
            if (!shadowRoot) return;

            // 300毫秒輪詢
            const POLL_INTERVAL = 300;
            const MAX_ATTEMPTS = 50;
            let attempts = 0;

            const poller = setInterval(() => {
                attempts++;
                const copyButtons = findAllElementsInShadows(shadowRoot, 'button[name="copyIdentifier"]');

                if (copyButtons.length > 0) {
                    clearInterval(poller);

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

                    const adjustColumnWidths = () => {
                        const targetSelectors = [
                            'th[aria-label="COPY"]',
                            'th[aria-label="DATE ADDED"]'
                        ];

                        targetSelectors.forEach(selector => {
                            const th = shadowRoot.querySelector(selector);
                            if (th) {
                                const TARGET_WIDTH = '90px';

                                th.style.width = TARGET_WIDTH;
                                th.style.minWidth = TARGET_WIDTH;
                                th.style.maxWidth = TARGET_WIDTH;

                                const factory = th.querySelector('lightning-primitive-header-factory');
                                if (factory) {
                                    factory.style.width = TARGET_WIDTH;
                                }

                                const innerElements = th.querySelectorAll('[style*="width"]');
                                innerElements.forEach(el => {
                                    const currentStyle = el.style.width;
                                    if (currentStyle.includes('94px') || currentStyle.includes('95px')) {
                                        el.style.width = TARGET_WIDTH;
                                    }
                                });

                                Log.info('UI.Enhancement', `已調整表頭寬度: ${selector} -> ${TARGET_WIDTH}`);
                            }
                        });
                    };

                    adjustColumnWidths();

                    return;
                }

                if (attempts >= MAX_ATTEMPTS) {
                    clearInterval(poller);
                }
            }, POLL_INTERVAL);
        }
    }];

    // =================================================================================
    // 模塊：主控制器與初始化
    // 用途：腳本的入口點，處理全局設置、URL監控和初始化啟動
    // =================================================================================

    /**
     * 處理設置遷移
     */
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

    /**
     * 注入頂部控制按鈕
     */
    function injectControlButtons(logoElement) {
        const SETTINGS_BUTTON_ID = 'cec-settings-gear-button';
        const PAUSE_BUTTON_ID = 'cec-pause-toggle-button';
        if (document.getElementById(SETTINGS_BUTTON_ID)) {
            return;
        }
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
                FollowUpPanel.unmount();
            } else {
                showGlobalToast('腳本已恢復運行', 'check');
                Log.info('Core.Control', `腳本已恢復運行，正在重新初始化頁面。`);
                lastUrl = '';

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

    /**
     * 初始化頂部Header觀察器
     */
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
        // 15000毫秒超時
        setTimeout(() => {
            observer.disconnect();
        }, 15000);
    }

    /**
     * 初始化全局點擊監聽器
     */
    function initGlobalClickListener() {
        if (window.__cecGlobalClickListenerInitialized) return;
        window.__cecGlobalClickListenerInitialized = true;
        document.body.addEventListener('click', (event) => {
            if (isScriptPaused) return;

            const composeButton = event.target.closest('button.testid__dummy-button-submit-action');
            const replyAllButton = event.target.closest('a[title="Reply All"]');
            const writeEmailButton = event.target.closest('button[title="Write an email..."]');

            if (composeButton || replyAllButton || writeEmailButton) {
                let triggerName = composeButton ? '"Compose"' : (replyAllButton ? '"Reply All"' : '"Write an email..."');
                Log.info('UI.Enhancement', `檢測到 ${triggerName} 按鈕點擊，準備注入模板快捷按鈕。`);
                // 300毫秒延時
                setTimeout(() => {
                    handleEditorReadyForTemplateButtons();
                }, 300);
            }

            const associateButton = event.target.closest('button[title="Associate Contact"], a[title="Associate Contact"]');
            if (associateButton) {
                // 10000毫秒超時
                waitForElementWithObserver(document.body, '.slds-modal__container', 10000).then(modal => {
                    processAssociateContactModal(modal);
                }).catch(error => { /* 忽略錯誤 */ });
                return;
            }

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
                const messagePayload = {
                    type: 'CEC_SEARCH_REQUEST',
                    payload: {
                        trackingNumber,
                        timestamp
                    }
                };

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

                        ivpWindowHandle.focus();

                    } catch (err) {
                        Log.error('Feature.IVP', err.message);
                    }
                } else if (targetType === 'web') {
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

                        webWindowHandle.focus();

                    } catch (err) {
                        Log.error('Feature.Web', err.message);
                    }
                }
            }
        }, true);
    }

    /**
     * 初始化彈窗按鈕觀察器
     */
    function initModalButtonObserver() {
        if (isScriptPaused) return;
        const observer = new MutationObserver((mutations, obs) => {
            if (isScriptPaused) {
                obs.disconnect();
                return;
            }
            const footer = findElementInShadows(document.body, "footer.slds-modal__footer");
            if (footer) {
                addModalActionButtons(footer);
                obs.disconnect();
            }
        });
        PageResourceRegistry.addObserver(observer);

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        // 15000毫秒超時
        const timeoutId = setTimeout(() => observer.disconnect(), 15000);
        PageResourceRegistry.addTimeout(timeoutId);
    }

    /**
     * 監控URL變化
     */
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

        PageResourceRegistry.cleanup('urlchange');
        FollowUpPanel.removeAllFloating();

        injectedIWTButtons = {};
        if (assignButtonObserver) assignButtonObserver.disconnect();
        if (iwtModuleObserver) iwtModuleObserver.disconnect();
        assignButtonObserver = null;
        iwtModuleObserver = null;
        if (relatedCasesExtractorModule) relatedCasesExtractorModule.hasExecuted = false;
        foundTrackingNumber = null;
        window.contactLogicDone = false;

        const caseRecordPagePattern = /^https:\/\/upsdrive\.lightning\.force\.com\/lightning\/r\/Case\/[a-zA-Z0-9]{18}\/.*/;
        const myOpenCasesListPagePattern = /^https:\/\/upsdrive\.lightning\.force\.com\/lightning\/o\/Case\/list\?.*filterName=My_Open_Cases_CEC.*/;
        const isTargetExportPage = /^https:\/\/upsdrive\.lightning\.force\.com\/lightning\/o\/Case\/list\?.*filterName=CEC_HK_ERN_Export_Case*/;

        if (caseRecordPagePattern.test(location.href)) {
            const caseUrl = location.href;

            const PAGE_READY_SELECTOR = 'c-cec-case-categorization';
            // 20000毫秒頁面加載超時
            const PAGE_READY_TIMEOUT = 20000;
            try {
                Log.info('Core.Router', `等待 Case 詳情頁核心元素 "${PAGE_READY_SELECTOR}" 出現...`);
                await waitForElementWithObserver(document.body, PAGE_READY_SELECTOR, PAGE_READY_TIMEOUT);
                Log.info('Core.Router', `核心元素已出現，開始執行頁面初始化。`);
            } catch (error) {
                Log.warn('Core.Router', `等待核心元素超時 (${PAGE_READY_TIMEOUT / 1000}秒)，已中止當前頁面的初始化。`);
                return;
            }

            Log.info('Core.Router', `正在執行基礎 UI 初始化...`);
            checkAndNotifyForRecentSend(caseUrl);
            initModalButtonObserver();
            initIWantToModuleWatcher();

            if (GM_getValue('followUpPanelEnabled', DEFAULTS.followUpPanelEnabled)) {
                FollowUpPanel.ensureMounted();
                await FollowUpPanel.ensureCaseButton();
                FollowUpPanel.render();
            }

            Log.info('Core.Router', `正在啟動數據依賴型任務（掃描器、追踪號提取）。`);
            startHighFrequencyScanner(caseUrl);
            extractTrackingNumberAndTriggerIVP();

            if (caseUrl.includes('c__triggeredfrom=reopen')) {
                Log.info('Feature.AutoAssign', `檢測到 Re-Open Case，已跳過自動指派邏輯。`);
                return;
            }

            const targetUser = GM_getValue('autoAssignUser', DEFAULTS.autoAssignUser);
            if (!targetUser) {
                Log.warn('Feature.AutoAssign', `未設置目標用戶名，自動指派功能已禁用。`);
                return;
            }

            const ASSIGNMENT_CACHE_KEY = CACHE_POLICY.ASSIGNMENT.KEY;
            // 60分鐘
            const CACHE_EXPIRATION_MS = CACHE_POLICY.ASSIGNMENT.TTL_MS;
            const cache = GM_getValue(ASSIGNMENT_CACHE_KEY, {});

            const purgeResult = purgeExpiredCacheEntries(cache, CACHE_EXPIRATION_MS);
            if (purgeResult.changed) {
                GM_setValue(ASSIGNMENT_CACHE_KEY, purgeResult.cache);
                Log.info('Feature.AutoAssign', `已清理過期的自動指派緩存條目（removed: ${purgeResult.removed}）。`);
            }
            const caseId = getCaseIdFromUrl(caseUrl);
            const entry = caseId ? cache[caseId] : null;

            if (entry && (Date.now() - entry.timestamp < CACHE_EXPIRATION_MS)) {
                Log.info('Feature.AutoAssign', `緩存命中：此 Case (ID: ${caseId}) 在 60 分鐘內已被指派。`);
                handleAutoAssign(caseUrl, true);
                return;
            }

            const initialStatus = await determineCaseStatus();
            if (initialStatus === 'CLOSED') {
                Log.info('Feature.AutoAssign', `初始狀態為 "Closed"，不執行指派。`);
                return;
            }

            if (initialStatus !== 'ACTIVE_OR_NEW') {
                Log.info('Feature.AutoAssign', `狀態不符合觸發條件 (當前狀態: "${initialStatus}")。`);
                return;
            }

            if (await areRequiredFieldsEmpty()) {
                Log.warn('Feature.AutoAssign', `因關鍵字段為空，自動指派流程已中止。其他頁面任務不受影響。`);
                return;
            }

            handleAutoAssign(caseUrl, false);

        } else if (myOpenCasesListPagePattern.test(location.href)) {
            Log.info('Core.Router', `"My Open Cases CEC" 列表頁已識別，準備啟動列表監控器。`);
            initCaseListMonitor();

        } else {
            Log.info('Core.Router', `非目標頁面 (詳情頁/指定列表頁)，跳過核心功能初始化。`);
        }
    }

    /**
     * 啟動URL監控
     */
    function startUrlMonitoring() {
        if (window.__cecUrlMonitoringInitialized) return;
        window.__cecUrlMonitoringInitialized = true;
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        history.pushState = function () {
            originalPushState.apply(this, arguments);
            window.dispatchEvent(new Event('urlchange'));
        };
        history.replaceState = function () {
            originalReplaceState.apply(this, arguments);
            window.dispatchEvent(new Event('urlchange'));
        };
        // 350毫秒防抖
        const debouncedMonitor = debounce(monitorUrlChanges, PERF_CONFIG.URL_CHANGE_DEBOUNCE_MS);
        window.addEventListener('urlchange', debouncedMonitor);
        window.addEventListener('popstate', debouncedMonitor);
        // 10000毫秒心跳檢測
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

    /**
     * 腳本啟動入口
     */
    function start() {
        Log.info('Core.Init', `腳本啟動 (Version: ${GM_info.script.version})。`);
        handleSettingsMigration();
        initHeaderObserver();
        if (isScriptPaused) {
            Log.warn('Core.Init', `腳本處於暫停狀態，核心功能未啟動。`);
            return;
        }
        injectStyleOverrides();
        toggleCleanModeStyles();
        injectGlobalCustomStyles();

        if (GM_getValue('followUpPanelEnabled', DEFAULTS.followUpPanelEnabled)) {
            FollowUpPanel.ensureMounted();
            FollowUpPanel.render();
        }
        Log.info('UI.Init', `所有自定義樣式 (全局/高度/組件屏蔽) 已應用。`);

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

                const message = `成功清理了 ${clearedCount} 個緩存項。`;
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
