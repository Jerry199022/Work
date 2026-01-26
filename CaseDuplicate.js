// ==UserScript==
// @name         Case查重與指派分析
// @namespace    Case duplicate and find A/C
// @version      V18
// @description  集成Case查重、指派分析(儀表盤可視化+雙向聯動+智能標記)、自動標示與緩存功能。
// @author       Jerry Law
// @match        https://upsdrive.lightning.force.com/lightning/*
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/Jerry199022/Work/refs/heads/main/CaseDuplicate.js
// @downloadURL  https://raw.githubusercontent.com/Jerry199022/Work/refs/heads/main/CaseDuplicate.js
// ==/UserScript==

(function () {
    'use strict';

    /**
     * Salesforce Case Optimizer 核心類
     * 負責管理界面注入、數據抓取、查重邏輯、指派分析及緩存管理
     */
    class SalesforceCaseOptimizer {

        // =================================================================================
        // 包含所有文本常量、選擇器、正則表達式及超時設置
        // =================================================================================
        static CONFIG = {
            TARGET_URL_KEYWORD: "My_Open_Cases_CEC",

            TEXT: {
                DUPLICATE_BUTTON: "查重排序",
                FIND_ACCOUNT_BUTTON: "查找指定賬號",
                RANGE_BUTTON: "範圍勾選",
                // RESTORE_SORT_BUTTON 已刪除

                ASSIGN_ANALYSIS_BUTTON: "ERN分析",
                ASSIGN_SETTINGS_TITLE: "設置指派分析映射表",
                ASSIGN_SETTINGS_PROMPT: "格式：關鍵字1/關鍵字2=人員名稱\n例如：HKG2SAP/ERN-AK=Aki Lee",
                ASSIGN_SETTINGS_SAVE: "保存設置",
                ASSIGN_SETTINGS_CANCEL: "取消",
                ASSIGN_SETTINGS_SUCCESS: "映射表已保存！",
                ASSIGN_SETTINGS_EMPTY: "請先長按“指派分析”按鈕設置映射表。",

                BTN_MARK_CACHE: "保存識別結果",
                BTN_CLEAR_CACHE: "清除緩存",
                BTN_COPY_UNIDENTIFIED: "複製未識別追蹤號",

                CACHE_CLEARED: "緩存已清除！",
                MARK_SUCCESS: "標示完成並已寫入緩存！",

                col_unidentified: "未識別追蹤號",
                col_tpx_input: "輸入TPX結果",
                col_identified: "已識別結果",

                DIALOG_TITLE_DUPLICATE: "重複項掃描完畢！",
                DIALOG_TITLE_FIND: "指定賬號查找完畢！",
                DIALOG_SUMMARY_DUPLICATE: (total, groups) => `共掃描 <strong>${total}</strong> 列，發現 <strong>${groups}</strong> 組重複的追蹤號碼`,
                DIALOG_SUMMARY_FIND: (total, groups) => `共掃描 <strong>${total}</strong> 列，發現 <strong>${groups}</strong> 組匹配的指定賬號`,
                COPY_BUTTON: "複製重複單號",
                COPY_SUCCESS_BUTTON: "已複製！",
                REORDER_TOP_BUTTON: "全部置頂",
                REORDER_INPLACE_BUTTON: "原地聚合",
                CANCEL_BUTTON: "關閉",

                ACCOUNT_SETTINGS_TITLE: "設置要查找的賬號列表",
                ACCOUNT_SETTINGS_PROMPT: "請每行輸入一個賬號（1Z後的6位，可帶*號）。",
                ACCOUNT_SETTINGS_SAVE: "保存設置",
                ACCOUNT_SETTINGS_CANCEL: "取消",
                ACCOUNT_SETTINGS_SUCCESS: "賬號列表已保存！",
                ACCOUNT_SETTINGS_EMPTY: "請先長按“查找指定賬號”按鈕設置賬號列表。"
            },
            SELECTORS: {
                BUTTON_CONTAINERS: [
                    'div.actionsWrapper',
                    'div[class*="Header"] .slds-button-group-list'
                ],
                TABLE: 'table.slds-table',
                TABLE_BODY: 'table.slds-table > tbody',
                TABLE_ROW: 'tbody > tr[data-row-key-value]',
                PREVIEW_BUTTON: 'button[title*="1Z"]',
                CHECKBOX: 'input[type="checkbox"]',
                TOTAL_COUNT_SPAN: 'span.countSortedByFilteredBy'
            },
            REGEX: {
                TRACKING_NUMBER: /1Z[A-Z0-9]{16}/ig,
                ACCOUNT_NUMBER: /^1Z([A-Z0-9]{6})/,
                TOTAL_COUNT: /of\s+(\d+)/,
                ITEMS_COUNT: /(\d+)\s*items/,
                ERN_CODE: /\((ERN-[A-Z]+)\)/i
            },
            STYLE: {
                HIGHLIGHT_COLORS: ['#FFAADA', '#FFD6A5', '#FDFF60', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF', '#E4F698', '#C9F0FF', '#D6F5C9', '#DF68C9'],
                STICKY_HEADER_CLASS: 'sticky-header-active'
            },
            TIMEOUTS: {
                COPY_SUCCESS_MSG: 1500,
                NOTIFICATION: 3500,
                LOAD_MORE_TIMEOUT: 5000,
                LONG_PRESS_DURATION: 1000,
                DEBOUNCE_DELAY: 300,
                CACHE_EXPIRY: 30 * 24 * 60 * 60 * 1000, // 30天
                CACHE_EXPIRY_SHORT: 12 * 60 * 60 * 1000 // 12小時 (No ERN)
            },
            STORAGE_KEY: 'salesforce_target_accounts',
            STORAGE_KEY_ASSIGN: 'salesforce_assign_analysis_map',
            STORAGE_KEY_CACHE: 'salesforce_assign_cache_v1'
        };

        constructor() {
            this.originalRowOrder = null;
            this.isLoading = false;
            this.buttons = {};
            this.targetAccounts = this.loadTargetAccounts();
            this.longPressTimer = null;
            this.isLongPress = false;
            this._mainObserver = null;
            this.init();
        }

        // =================================================================================
        // 核心初始化與工具函數
        // =================================================================================

        /**
         * 防抖函數：限制函數執行頻率
         */
        debounce(func, delay) {
            let timeout;
            return function (...args) {
                const context = this;
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(context, args), delay);
            };
        }

        /**
         * 初始化腳本：注入樣式並啟動 DOM 監聽
         */
        init() {
            this.addStyles();
            console.log('[Case助手 V9]：腳本已啟動。');

            const checkAndInject = () => {
                // 防止重複注入
                const existingButton = this.findElementInShadowDom('#duplicateCheckButton');
                if (existingButton) return;

                // 遍歷可能的容器選擇器進行注入
                for (const selector of this.constructor.CONFIG.SELECTORS.BUTTON_CONTAINERS) {
                    const container = this.findElementInShadowDom(selector);
                    if (container) {
                        console.log(`[Case助手]：檢測到容器，正在注入按鈕...`);
                        this.addCustomButtons(container);
                        return;
                    }
                }
            };

            // 使用防抖優化 DOM 變動監聽
            const debouncedCheck = this.debounce(checkAndInject, this.constructor.CONFIG.TIMEOUTS.DEBOUNCE_DELAY);
            this._mainObserver = new MutationObserver(debouncedCheck);
            this._mainObserver.observe(document.body, { childList: true, subtree: true });
            checkAndInject();
        }

        /**
         * 注入自定義 CSS 樣式
         */
        addStyles() {
            GM_addStyle(`
                .${this.constructor.CONFIG.STYLE.STICKY_HEADER_CLASS} { position: sticky !important; top: 0 !important; z-index: 10 !important; background-color: rgb(250, 250, 249) !important; }
                tr[data-highlighted-by-script="true"].slds-is-selected > td, tr[data-highlighted-by-script="true"].slds-is-selected > th,
                tr[data-highlighted-by-script="true"]:hover > td, tr[data-highlighted-by-script="true"]:hover > th { background-color: inherit !important; }
                li.slds-button a.forceActionLink:hover, li.slds-button a.forceActionLink:focus { text-decoration: none !important; }
                .custom-dialog-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.6); z-index: 10000; display: flex; justify-content: center; align-items: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
                .custom-dialog-box { background-color: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); width: 90%; max-width: 480px; padding: 24px; text-align: center; animation: dialog-fade-in 0.3s ease-out; display: flex; flex-direction: column; }
                .custom-dialog-box.dashboard-dialog { width: fit-content; max-width: 95vw; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
                @keyframes dialog-fade-in { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
                .custom-dialog-title { font-size: 20px; font-weight: bold; color: #181818; margin-bottom: 12px; }
                .custom-dialog-message { font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 16px; white-space: pre-wrap; }
                .custom-dialog-details { max-height: 180px; overflow-y: auto; background-color: #f7f7f7; border: 1px solid #ddd; border-radius: 6px; padding: 12px; margin-bottom: 24px; text-align: left; font-size: 14px; }
                .custom-dialog-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 0; }
                .custom-dialog-buttons.dashboard-buttons { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-top: 20px; }
                .custom-dialog-buttons button { width: 100%; padding: 12px; font-size: 14px; font-weight: bold; border: none; border-radius: 6px; cursor: pointer; transition: background-color 0.2s, transform 0.1s; white-space: nowrap; }
                .custom-dialog-buttons button:hover { transform: translateY(-1px); }
                .btn-primary { background-color: #0070d2; color: white; }
                .btn-primary:hover { background-color: #005A9E; }
                .btn-secondary { background-color: #eef1f6; color: #181818; }
                .btn-secondary:hover { background-color: #dde4ee; }
                .custom-toast-notification { position: fixed; top: 20px; right: 20px; background-color: #333; color: white; padding: 12px 20px; border-radius: 6px; z-index: 10001; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: opacity 0.3s, transform 0.3s; transform: translateX(100%); opacity: 0; }
                .custom-toast-notification.show { transform: translateX(0); opacity: 1; }
                .custom-toast-notification.error { background-color: #c23934; }
                .custom-toast-notification.success { background-color: #04844b; }
                #full-load-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.75); z-index: 99999; display: flex; justify-content: center; align-items: center; color: white; font-size: 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; transition: opacity 0.3s; flex-direction: column; }
                li.slds-button[disabled] { background-color: #f3f3f3; cursor: not-allowed; }
                li.slds-button[disabled] > a { color: #adadad; pointer-events: none; }
                records-hoverable-link { pointer-events: none !important; }
                records-hoverable-link a { pointer-events: auto !important; }
                .settings-dialog-textarea { width: 100%; height: 200px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; font-size: 14px; resize: vertical; margin-bottom: 16px; }
                .settings-dialog-prompt { font-size: 14px; color: #555; margin-bottom: 8px; text-align: left; }
                .assign-grid-container { display: grid; grid-template-columns: 260px 260px 260px; gap: 16px; height: 380px; margin-bottom: 0; text-align: left; }
                .assign-column { border: 1px solid #e1e4e8; border-radius: 8px; display: flex; flex-direction: column; background-color: #fafafa; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
                .assign-col-header { background-color: #f0f2f5; padding: 10px; font-weight: 700; font-size: 13px; border-bottom: 1px solid #e1e4e8; text-align: center; color: #444; letter-spacing: 0.5px; }
                .assign-col-content { flex: 1; overflow-y: auto; padding: 8px; font-size: 12px; font-family: monospace; color: #555; }
                .assign-col-content div { margin-bottom: 4px; border-bottom: 1px dashed #eee; padding-bottom: 2px; cursor: pointer; }
                .sync-active { background-color: #b3d7ff !important; border-left: 4px solid #0070d2; padding-left: 4px; font-weight: bold; color: #000; }
            `);
        }

        /**
         * 顯示 Toast 通知
         */
        showNotification(message, type = 'info') {
            const n = document.createElement('div');
            n.className = `custom-toast-notification ${type}`;
            n.textContent = message;
            document.body.appendChild(n);
            setTimeout(() => n.classList.add('show'), 10);
            setTimeout(() => {
                n.classList.remove('show');
                n.addEventListener('transitionend', () => n.remove());
            }, 3500);
        }

        /**
         * 遞歸查找 Shadow DOM 中的所有元素
         */
        findAllElementsInShadowDom(selector, root = document) {
            let r = Array.from(root.querySelectorAll(selector));
            root.querySelectorAll('*').forEach(el => {
                if (el.shadowRoot) {
                    r = r.concat(this.findAllElementsInShadowDom(selector, el.shadowRoot));
                }
            });
            return r;
        }

        /**
         * 查找 Shadow DOM 中的單個元素
         */
        findElementInShadowDom(selector, root = document) {
            return this.findAllElementsInShadowDom(selector, root)[0] || null;
        }

        /**
         * 異步延遲
         */
        delay(ms) {
            return new Promise(res => setTimeout(res, ms));
        }

        /**
         * 清除所有腳本添加的高亮樣式
         */
        clearHighlights() {
            const e = this.findElementInShadowDom(this.constructor.CONFIG.SELECTORS.TABLE);
            if (e) {
                e.querySelectorAll(this.constructor.CONFIG.SELECTORS.TABLE_ROW).forEach(e => {
                    e.style.backgroundColor = "";
                    e.removeAttribute("data-highlighted-by-script");
                });
            }
        }


        /**
         * 排序後把頁面滾動到表格表頭位置，確保 Case Type Icon / Case Number 所在表頭顯示在最上方
         * 注意：Salesforce Lightning 列表通常在內部滾動容器中滾動，不能只用 window 滾動
         */
        scrollToTableTop(table, offset = 12) {
            if (!table) return;

            // 優先定位 Lightning datatable 的 HEADER 行，其次退化到 thead
            const headerRow = table.querySelector("thead tr[data-row-key-value='HEADER']") || table.querySelector('thead tr') || table.querySelector('thead');
            const target = headerRow || table;

            // 查找最近的可滾動父容器（包含 ShadowRoot 場景）
            const getScrollParent = (el) => {
                let cur = el;
                while (cur) {
                    if (cur instanceof HTMLElement) {
                        const style = window.getComputedStyle(cur);
                        const oy = style.overflowY;
                        if ((oy === 'auto' || oy === 'scroll' || oy === 'overlay') && cur.scrollHeight > cur.clientHeight) {
                            return cur;
                        }
                    }
                    cur = cur.parentNode;
                    if (!cur) {
                        const root = el.getRootNode && el.getRootNode();
                        if (root && root.host) {
                            el = root.host;
                            cur = el;
                        }
                    }
                }
                return document.scrollingElement || document.documentElement;
            };

            const scroller = getScrollParent(target);

            // 在內部滾動容器中精準定位表頭到頂部（而不是滾 window）
            const scrollInContainer = () => {
                if (!scroller || scroller === document.body) return;
                const scRect = scroller.getBoundingClientRect();
                const tgRect = target.getBoundingClientRect();
                const top = (tgRect.top - scRect.top) + scroller.scrollTop;
                scroller.scrollTo({ top: Math.max(0, top - offset), behavior: 'smooth' });
            };

            // 兩幀延遲，確保 reorder DOM 完成後再滾動（Lightning 會重排/虛擬化）
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    try {
                        if (scroller === document.scrollingElement || scroller === document.documentElement) {
                            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            setTimeout(() => window.scrollBy(0, -Math.max(0, offset)), 50);
                        } else {
                            scrollInContainer();
                        }
                    } catch (e) {
                        // fallback
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            });
        }

        // =================================================================================
        // 緩存管理模塊
        // =================================================================================

        /**
         * 讀取指派分析緩存，並清理過期數據
         */
        loadAssignCache() {
            const raw = localStorage.getItem(this.constructor.CONFIG.STORAGE_KEY_CACHE);
            if (!raw) return {};
            try {
                const cache = JSON.parse(raw);
                const now = Date.now();
                let hasChanges = false;
                Object.keys(cache).forEach(tn => {
                    if (now > cache[tn].expiry) {
                        delete cache[tn];
                        hasChanges = true;
                    }
                });
                if (hasChanges) localStorage.setItem(this.constructor.CONFIG.STORAGE_KEY_CACHE, JSON.stringify(cache));
                return cache;
            } catch (e) {
                return {};
            }
        }

        /**
         * 保存指派分析結果到緩存
         */
        saveAssignCache(dataMap) {
            const cache = this.loadAssignCache();
            const now = Date.now();
            const defaultExpiry = now + this.constructor.CONFIG.TIMEOUTS.CACHE_EXPIRY;
            const shortExpiry = now + this.constructor.CONFIG.TIMEOUTS.CACHE_EXPIRY_SHORT;

            dataMap.forEach((person, tn) => {
                const expiryTime = (person === "No ERN") ? shortExpiry : defaultExpiry;
                cache[tn] = { name: person, expiry: expiryTime };
            });
            localStorage.setItem(this.constructor.CONFIG.STORAGE_KEY_CACHE, JSON.stringify(cache));
            console.log(`[緩存] 已更新 ${dataMap.size} 條記錄。`);
        }

        /**
         * 清空指派分析緩存
         */
        clearAssignCache() {
            localStorage.removeItem(this.constructor.CONFIG.STORAGE_KEY_CACHE);
            this.showNotification(this.constructor.CONFIG.TEXT.CACHE_CLEARED, 'success');
        }

        // =================================================================================
        // 數據加載與處理流程
        // =================================================================================

        /**
         * 執行全量加載並處理
         * 自動滾動表格直到所有數據加載完畢，然後執行回調函數
         */
        async _executeFullLoadAndProcess(processor) {
            if (this.isLoading) return this.showNotification("正在處理中，請勿重複點擊。", "info");
            const table = this.findElementInShadowDom(this.constructor.CONFIG.SELECTORS.TABLE);
            if (!table) return this.showNotification('錯誤：找不到案件列表表格！', 'error');

            this.isLoading = true;
            this.setButtonsDisabled(true);
            const overlay = document.createElement('div');
            overlay.id = 'full-load-overlay';
            overlay.innerHTML = '<p>正在初始化...</p><p class="loader-subtitle">請稍候</p>';
            document.body.appendChild(overlay);

            try {
                const tableBody = table.querySelector('tbody');
                let lastRowCount = 0;
                while (true) {
                    const currentRowCount = tableBody.querySelectorAll('tr').length;
                    overlay.querySelector('p').textContent = `正在自動加載... (${currentRowCount} 條)`;

                    const countSpan = this.findElementInShadowDom(this.constructor.CONFIG.SELECTORS.TOTAL_COUNT_SPAN);
                    let isLoadComplete = false;
                    if (countSpan && countSpan.textContent) {
                        const txt = countSpan.textContent.trim();
                        if (!txt.includes('+')) {
                            const match = txt.match(/(\d+)\s*items/) || txt.match(/of\s+(\d+)/);
                            if (match && currentRowCount >= parseInt(match[1])) isLoadComplete = true;
                        }
                    }
                    if (isLoadComplete) break;
                    if (lastRowCount === currentRowCount && currentRowCount > 0) break;

                    lastRowCount = currentRowCount;
                    const lastRow = tableBody.querySelector('tr:last-child');
                    if (lastRow) lastRow.scrollIntoView({ behavior: 'auto', block: 'end' });

                    try {
                        await new Promise((res, rej) => {
                            const obs = new MutationObserver(() => {
                                if (tableBody.children.length > lastRowCount) {
                                    obs.disconnect();
                                    clearTimeout(tm);
                                    res();
                                }
                            });
                            const tm = setTimeout(() => {
                                obs.disconnect();
                                rej();
                            }, 5000);
                            obs.observe(tableBody, { childList: true });
                        });
                    } catch (e) {
                        break;
                    }
                }
                overlay.querySelector('p').textContent = '數據加載完畢，開始掃描...';
                await this.delay(500);
                processor();
            } catch (err) {
                console.error(err);
                this.showNotification('自動加載失敗，請檢查日誌。', 'error');
            } finally {
                document.body.removeChild(overlay);
                this.isLoading = false;
                this.setButtonsDisabled(false);
            }
        }

        // =================================================================================
        // 功能模塊：指派分析 (核心邏輯)
        // =================================================================================

        /**
         * 啟動指派分析流程
         */
        startAssignAnalysis() {
            const map = this.parseAssignMap();
            if (map.size === 0) {
                this.showNotification(this.constructor.CONFIG.TEXT.ASSIGN_SETTINGS_EMPTY, 'info');
                this.showAssignSettingsDialog();
                return;
            }
            this._executeFullLoadAndProcess(this.performAssignAnalysis.bind(this));
        }

        /**
         * 執行指派分析邏輯
         * 掃描行、匹配緩存、匹配 ERN、分類數據
         */
        performAssignAnalysis() {
            const C = this.constructor.CONFIG;
            const table = this.findElementInShadowDom(C.SELECTORS.TABLE);

            // 1. 先清除之前可能存在的舊高亮
            this.clearHighlights();

            const thead = table.querySelector('thead');
            if (thead) thead.classList.remove(C.STYLE.STICKY_HEADER_CLASS);

            const assignMap = this.parseAssignMap();
            const resultMap = new Map();
            const unidentifiedMap = new Map();
            const cachePendingData = new Map();

            // 優先級 1: 預加載緩存
            const cache = this.loadAssignCache();

            const rows = table.querySelectorAll(C.SELECTORS.TABLE_ROW);

            rows.forEach(row => {
                const rowText = row.innerText;
                let rowTN = null;

                const previewBtn = row.querySelector(C.SELECTORS.PREVIEW_BUTTON);
                if (previewBtn) {
                    const t = previewBtn.getAttribute('title');
                    const m = t && t.match(C.REGEX.TRACKING_NUMBER);
                    if (m) rowTN = m[0].toUpperCase();
                }
                if (!rowTN) {
                    const m = rowText.match(C.REGEX.TRACKING_NUMBER);
                    if (m) rowTN = m[0].toUpperCase();
                }

                let isIdentified = false;
                let personName = null;

                // 檢查緩存
                if (rowTN && cache[rowTN]) {
                    personName = cache[rowTN].name;
                    isIdentified = true;
                }

                // 優先級 2: 檢查 ERN (僅當緩存未命中時)
                if (!isIdentified) {
                    const match = rowText.match(C.REGEX.ERN_CODE);
                    if (match) {
                        const code = match[1].toUpperCase();
                        if (assignMap.has(code)) {
                            personName = assignMap.get(code);
                            isIdentified = true;
                            if (rowTN) {
                                cachePendingData.set(rowTN, personName);
                            }
                        }
                    }
                }

                // 歸類
                if (isIdentified && personName) {
                    if (!resultMap.has(personName)) resultMap.set(personName, []);
                    resultMap.get(personName).push(row);
                }

                // 優先級 3: 未識別
                if (rowTN && !isIdentified) {
                    if (!unidentifiedMap.has(rowTN)) unidentifiedMap.set(rowTN, []);
                    unidentifiedMap.get(rowTN).push(row);
                }
            });

            // 不立即高亮，僅顯示儀表盤
            this.showAssignAnalysisDialog(table, unidentifiedMap, resultMap, cachePendingData);
        }

        /**
         * 顯示指派分析儀表盤 (Dashboard)
         * 包含三欄佈局：未識別、TPX輸入、已識別
         */
        showAssignAnalysisDialog(table, unidentifiedMap, resultMap, cachePendingData) {
            const C = this.constructor.CONFIG.TEXT;
            const COLORS = this.constructor.CONFIG.STYLE.HIGHLIGHT_COLORS;

            // 1. 準備數據
            const unidentifiedKeys = Array.from(unidentifiedMap.keys());
            const unidentifiedCount = unidentifiedKeys.length;

            // 2. 構建 UI
            const overlay = document.createElement('div');
            overlay.className = 'custom-dialog-overlay';
            const dialogBox = document.createElement('div');
            // 添加 dashboard-dialog 類以應用自適應寬度
            dialogBox.className = 'custom-dialog-box dashboard-dialog';

            const title = document.createElement('div');
            title.className = 'custom-dialog-title';
            title.textContent = "ERN分析結果";

            const grid = document.createElement('div');
            grid.className = 'assign-grid-container';

            // 左欄：未識別列表
            const colLeft = this.createAssignColumn(`${C.col_unidentified} (${unidentifiedCount})`, unidentifiedKeys);

            // 中欄：TPX 輸入區
            const colMid = document.createElement('div');
            colMid.className = 'assign-column';
            const midHeader = document.createElement('div');
            midHeader.className = 'assign-col-header';
            midHeader.textContent = `${C.col_tpx_input} (0 / ${unidentifiedCount})`;
            const midContent = document.createElement('div');
            midContent.className = 'assign-col-content';
            midContent.style.padding = '0';

            const textarea = document.createElement('textarea');
            textarea.id = 'tpx-input-area';
            textarea.style.cssText = "width:100%; height:100%; border:none; resize:none; padding:10px; font-family:monospace; font-size:12px; box-sizing:border-box; outline:none; background-color:#fff;";
            textarea.placeholder = "在此粘貼 TPX 結果...\n(每行對應左側一個追蹤號)";

            const updateCount = () => {
                const lines = textarea.value.split('\n').filter(l => l.trim() !== '').length;
                midHeader.textContent = `${C.col_tpx_input} (${lines} / ${unidentifiedCount})`;
                midHeader.style.color = (lines !== unidentifiedCount) ? '#c23934' : '#444';
            };
            textarea.addEventListener('input', updateCount);
            midContent.appendChild(textarea);
            colMid.append(midHeader, midContent);

            // 右欄：已識別結果 (按數量排序)
            const initialSortedEntries = Array.from(resultMap.entries())
                .sort((a, b) => b[1].length - a[1].length);
            const sortedIdentifiedText = initialSortedEntries
                .map(([name, rows]) => `${name} (${rows.length})`);
            const colRight = this.createAssignColumn(`${C.col_identified} (按數量排序)`, sortedIdentifiedText);

            grid.append(colLeft, colMid, colRight);

            // 雙向聯動邏輯：點擊左側高亮右側對應行
            setTimeout(() => {
                const leftItems = colLeft.querySelectorAll('.assign-col-content > div');
                leftItems.forEach((div, index) => {
                    div.addEventListener('click', () => {
                        leftItems.forEach(d => d.classList.remove('sync-active'));
                        div.classList.add('sync-active');
                        const lines = textarea.value.split('\n');
                        let start = 0;
                        for (let i = 0; i < index; i++) start += (lines[i] !== undefined ? lines[i].length : 0) + 1;
                        const currentLineLen = (lines[index] !== undefined ? lines[index].length : 0);
                        textarea.focus();
                        textarea.setSelectionRange(start, start + currentLineLen);
                        const lineHeight = 16;
                        const visibleLines = textarea.clientHeight / lineHeight;
                        textarea.scrollTop = (index > visibleLines / 2) ? (index - visibleLines / 2) * lineHeight : 0;
                    });
                });
                const syncFromTextarea = () => {
                    const val = textarea.value;
                    const sel = textarea.selectionStart;
                    const lineNum = val.substr(0, sel).split('\n').length - 1;
                    if (leftItems[lineNum]) {
                        leftItems.forEach(d => d.classList.remove('sync-active'));
                        leftItems[lineNum].classList.add('sync-active');
                        leftItems[lineNum].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    }
                };
                textarea.addEventListener('click', syncFromTextarea);
                textarea.addEventListener('keyup', syncFromTextarea);
            }, 0);

            // 按鈕區
            const btnContainer = document.createElement('div');
            // 添加 dashboard-buttons 類以應用 5 列佈局
            btnContainer.className = 'custom-dialog-buttons dashboard-buttons';

            const closeDialog = () => document.body.removeChild(overlay);

            const btnCopyUnidentified = document.createElement('button');
            btnCopyUnidentified.textContent = C.BTN_COPY_UNIDENTIFIED;
            btnCopyUnidentified.className = 'btn-secondary';
            btnCopyUnidentified.onclick = async () => {
                if (unidentifiedKeys.length === 0) {
                    btnCopyUnidentified.textContent = "無數據";
                } else {
                    const textToCopy = unidentifiedKeys.join('\n');
                    await navigator.clipboard.writeText(textToCopy);
                    btnCopyUnidentified.textContent = C.COPY_SUCCESS_BUTTON;
                }
                setTimeout(() => btnCopyUnidentified.textContent = C.BTN_COPY_UNIDENTIFIED, 1500);
            };

            const btnMark = document.createElement('button');
            btnMark.textContent = C.BTN_MARK_CACHE;
            btnMark.className = 'btn-primary';
            btnMark.onclick = () => {
                const inputLines = textarea.value.split('\n').filter(l => l.trim() !== '').length;
                if (inputLines !== unidentifiedCount) {
                    let msg = `⚠️ 數量不匹配，無法執行！\n\n左側未識別數：${unidentifiedCount}\nTPX 輸入行數：${inputLines}`;
                    if (inputLines === 0) msg += `\n\n(請先輸入 TPX 結果)`;
                    else msg += `\n\n請檢查是否有漏行或多餘空行。`;
                    alert(msg);
                    return;
                }
                this.executeMarkAndCache(resultMap, cachePendingData, unidentifiedMap, textarea.value);
            };

            const btnTop = document.createElement('button');
            btnTop.textContent = "整理排序";
            btnTop.className = 'btn-secondary';
            btnTop.onclick = () => {
                // 基於最新的 resultMap 重新計算 (確保包含剛剛標記的行)
                const currentSortedEntries = Array.from(resultMap.entries()).sort((a, b) => b[1].length - a[1].length);
                const sortedGroups = currentSortedEntries.map(entry => entry[1]);

                this.clearHighlights();
                let colorIndex = 0;

                currentSortedEntries.forEach(([personName, group]) => {
                    const color = COLORS[colorIndex % COLORS.length];
                    group.forEach(row => {
                        row.style.backgroundColor = color;
                        row.setAttribute('data-highlighted-by-script', 'true');
                        this.markRowDom(row, personName);
                    });
                    colorIndex++;
                });

                this.reorderRowsToTop(table.querySelector('tbody'), sortedGroups);
                this.scrollToTableTop(table);
                closeDialog();
            };

            const btnClear = document.createElement('button');
            btnClear.textContent = C.BTN_CLEAR_CACHE;
            btnClear.className = 'btn-secondary';
            btnClear.style.backgroundColor = '#ffebee';
            btnClear.style.color = '#c23934';
            btnClear.onclick = () => { if (confirm("確定清除緩存？")) this.clearAssignCache(); };

            const btnClose = document.createElement('button');
            btnClose.textContent = C.CANCEL_BUTTON;
            btnClose.className = 'btn-secondary';
            btnClose.onclick = closeDialog;

            btnContainer.append(btnCopyUnidentified, btnMark, btnTop, btnClear, btnClose);
            dialogBox.append(title, grid, btnContainer);
            overlay.appendChild(dialogBox);
            document.body.appendChild(overlay);
            overlay.addEventListener('click', e => { if (e.target === overlay) closeDialog(); });
        }

        /**
         * 創建儀表盤的單列 DOM
         */
        createAssignColumn(headerText, items) {
            const col = document.createElement('div');
            col.className = 'assign-column';
            col.innerHTML = `<div class="assign-col-header">${headerText}</div><div class="assign-col-content">${items.length ? items.map(i => `<div>${i}</div>`).join('') : '<div style="color:#ccc;text-align:center">(無數據)</div>'}</div>`;
            return col;
        }

        // =================================================================================
        // 標示與緩存執行模塊
        // =================================================================================

        /**
         * 執行標記並寫入緩存
         * 處理 TPX 輸入，匹配映射表，並更新 resultMap
         */
        executeMarkAndCache(resultMap, cachePendingData, unidentifiedMap, tpxInputString) {
            const assignMap = this.parseAssignMap();
            let markCount = 0;
            let tpxMatchCount = 0;

            // 1. 處理 TPX 輸入
            if (tpxInputString && tpxInputString.trim() !== '') {
                const tpxLines = tpxInputString.split('\n');
                const unidentifiedTNs = Array.from(unidentifiedMap.keys());

                tpxLines.forEach((line, index) => {
                    if (index >= unidentifiedTNs.length) return;

                    const lineUpper = line.toUpperCase();
                    const targetTN = unidentifiedTNs[index];

                    for (const [code, personName] of assignMap) {
                        if (lineUpper.includes(code)) {
                            tpxMatchCount++;
                            cachePendingData.set(targetTN, personName);

                            const targetRows = unidentifiedMap.get(targetTN);
                            if (targetRows) {
                                if (!resultMap.has(personName)) resultMap.set(personName, []);
                                const group = resultMap.get(personName);

                                targetRows.forEach(row => {
                                    if (this.markRowDom(row, personName)) markCount++;
                                    // 實時推入 resultMap
                                    if (!group.includes(row)) group.push(row);
                                });
                            }
                            break;
                        }
                    }
                });
            }

            // 2. 寫入緩存 (包含 No ERN)
            if (cachePendingData.size > 0) this.saveAssignCache(cachePendingData);

            // 3. 處理原有已識別的 DOM 標示
            resultMap.forEach((rows, personName) => {
                rows.forEach(row => {
                    if (this.markRowDom(row, personName)) markCount++;
                });
            });

            const msg = tpxMatchCount > 0
                ? `${this.constructor.CONFIG.TEXT.MARK_SUCCESS}\n(原有識別: ${markCount - tpxMatchCount}, TPX匹配: ${tpxMatchCount})`
                : `${this.constructor.CONFIG.TEXT.MARK_SUCCESS} (標記了 ${markCount} 行)`;

            this.showNotification(msg, 'success');
        }

        /**
         * 在 DOM 行中插入人員名稱標記
         */
        markRowDom(row, personName) {
            let target = this.findAllElementsInShadowDom('a', row).find(el => {
                const t = el.textContent;
                return t.includes('Exception Notification') || t.includes('UPS Tracking Number') || t.includes('EXTERNAL') || t.includes('(ERN-');
            });

            if (!target) {
                target = this.findAllElementsInShadowDom('span, div', row).find(el => {
                    const t = el.textContent;
                    return (t.includes('Exception Notification') || t.includes('UPS Tracking Number') || t.includes('EXTERNAL') || t.includes('(ERN-'))
                        && !el.querySelector('a');
                });
            }

            if (target) {
                if (target.textContent.trim().startsWith(personName)) return false;
                const nameSpan = document.createElement('span');
                nameSpan.textContent = `${personName} - `;
                nameSpan.style.fontWeight = 'bold';
                nameSpan.style.color = '#000';
                target.insertBefore(nameSpan, target.firstChild);
                return true;
            }
            return false;
        }

        // =================================================================================
        // 功能模塊：查重與查找賬號
        // =================================================================================

        /**
         * 啟動查重流程
         */
        startFullLoadAndCheckDuplicates() {
            this._executeFullLoadAndProcess(this.findAndHighlightDuplicates.bind(this));
        }

        /**
         * 啟動賬號查找流程
         */
        startFullLoadAndFindAccounts() {
            if (this.targetAccounts.size === 0) {
                this.showNotification(this.constructor.CONFIG.TEXT.ACCOUNT_SETTINGS_EMPTY, 'info');
                this.showAccountSettingsDialog();
                return;
            }
            this._executeFullLoadAndProcess(this.findAndHighlightAccounts.bind(this));
        }

        /**
         * 查找並高亮重複項
         */
        findAndHighlightDuplicates() {
            const C = this.constructor.CONFIG;
            const table = this.findElementInShadowDom(C.SELECTORS.TABLE);
            this.clearHighlights();
            const map = new Map();

            this.findAllElementsInShadowDom(C.SELECTORS.PREVIEW_BUTTON, table).forEach(b => {
                const row = b.closest(C.SELECTORS.TABLE_ROW);
                const m = b.title.match(C.REGEX.TRACKING_NUMBER);
                if (m && row) {
                    const tn = m[0].toUpperCase();
                    if (!map.has(tn)) map.set(tn, []);
                    map.get(tn).push(row);
                }
            });

            const groups = [];
            const summary = [];
            for (const [tn, rows] of map.entries()) {
                if (rows.length > 1) {
                    groups.push(rows);
                    summary.push(`${tn} (出現 ${rows.length} 次)`);
                }
            }

            this.applyHighlightsAndShowDialog(table, groups, summary, map, C.TEXT.DIALOG_TITLE_DUPLICATE, C.TEXT.DIALOG_SUMMARY_DUPLICATE(map.size, groups.length), true);
        }

        /**
         * 查找並高亮指定賬號
         */
        findAndHighlightAccounts() {
            const C = this.constructor.CONFIG;
            const table = this.findElementInShadowDom(C.SELECTORS.TABLE);
            this.clearHighlights();
            const map = new Map();
            this.findAllElementsInShadowDom(C.SELECTORS.PREVIEW_BUTTON, table).forEach(b => {
                const row = b.closest(C.SELECTORS.TABLE_ROW);
                const m = b.title.match(C.REGEX.TRACKING_NUMBER);
                if (m && row) {
                    const tn = m[0].toUpperCase();
                    const accMatch = tn.match(C.REGEX.ACCOUNT_NUMBER);
                    if (accMatch && this.targetAccounts.has(accMatch[1])) {
                        const acc = accMatch[1];
                        if (!map.has(acc)) map.set(acc, []);
                        map.get(acc).push(row);
                    }
                }
            });
            const groups = Array.from(map.values());
            const summary = Array.from(map.entries()).map(([a, r]) => `${a} (匹配 ${r.length} 個)`);
            this.applyHighlightsAndShowDialog(table, groups, summary, map, C.TEXT.DIALOG_TITLE_FIND, C.TEXT.DIALOG_SUMMARY_FIND(map.size, groups.length), false);
        }

        /**
         * 應用高亮並顯示結果彈窗 (通用方法)
         */
        applyHighlightsAndShowDialog(table, groups, summary, map, title, summaryHtml, showCopy) {
            const C = this.constructor.CONFIG;
            let ci = 0;
            groups.forEach(rows => {
                const color = C.STYLE.HIGHLIGHT_COLORS[ci++ % C.STYLE.HIGHLIGHT_COLORS.length];
                rows.forEach(r => {
                    r.style.backgroundColor = color;
                    r.setAttribute('data-highlighted-by-script', 'true');
                });
            });
            if (groups.length === 0) return this.showNotification('未發現匹配項。', 'success');

            const overlay = document.createElement('div');
            overlay.className = 'custom-dialog-overlay';
            const box = document.createElement('div');
            box.className = 'custom-dialog-box'; // 默認樣式
            box.innerHTML = `<div class="custom-dialog-title">${title}</div><div class="custom-dialog-message">${summaryHtml}</div>`;

            const details = document.createElement('div');
            details.className = 'custom-dialog-details';
            details.innerHTML = summary.map(s => `<p>${s}</p>`).join('');

            const btns = document.createElement('div');
            btns.className = 'custom-dialog-buttons'; // 默認樣式

            const btnTop = document.createElement('button');
            btnTop.className = 'btn-primary';
            btnTop.textContent = C.TEXT.REORDER_TOP_BUTTON;
            btnTop.onclick = () => {
                this.reorderRowsToTop(table.querySelector('tbody'), groups);
                this.scrollToTableTop(table);
                document.body.removeChild(overlay);
            };

            const btnInPlace = document.createElement('button');
            btnInPlace.className = 'btn-primary';
            btnInPlace.textContent = C.TEXT.REORDER_INPLACE_BUTTON;
            btnInPlace.onclick = () => {
                this.reorderRowsInPlace(table.querySelector('tbody'), map);
                this.scrollToTableTop(table);
                document.body.removeChild(overlay);
            };

            const btnCancel = document.createElement('button');
            btnCancel.className = 'btn-secondary';
            btnCancel.textContent = C.TEXT.CANCEL_BUTTON;
            btnCancel.onclick = () => document.body.removeChild(overlay);

            btns.append(btnTop, btnInPlace);
            if (showCopy) {
                const btnCopy = document.createElement('button');
                btnCopy.className = 'btn-secondary';
                btnCopy.textContent = C.TEXT.COPY_BUTTON;
                btnCopy.onclick = async () => {
                    await navigator.clipboard.writeText(summary.map(s => s.split(' ')[0]).join('\n'));
                    btnCopy.textContent = "已複製";
                    setTimeout(() => btnCopy.textContent = C.TEXT.COPY_BUTTON, 1500);
                };
                btns.appendChild(btnCopy);
            }
            btns.appendChild(btnCancel);
            box.append(details, btns);
            overlay.appendChild(box);
            document.body.appendChild(overlay);
            overlay.addEventListener('click', e => { if (e.target === overlay) document.body.removeChild(overlay); });
        }

        // =================================================================================
        // 排序與設置管理
        // =================================================================================

        /**
         * 保存原始行順序 (用於還原)
         */
        snapshotOriginalOrder() {
            if (this.originalRowOrder) return;
            const tb = this.findElementInShadowDom(this.constructor.CONFIG.SELECTORS.TABLE_BODY);
            if (tb) this.originalRowOrder = Array.from(tb.querySelectorAll(this.constructor.CONFIG.SELECTORS.TABLE_ROW));
        }

        /**
         * 還原原始行順序
         */
        restoreOriginalOrder() {
            if (!this.originalRowOrder) return;
            this.clearHighlights();
            const tb = this.findElementInShadowDom(this.constructor.CONFIG.SELECTORS.TABLE_BODY);
            const f = document.createDocumentFragment();
            this.originalRowOrder.forEach(r => f.appendChild(r));
            tb.innerHTML = '';
            tb.appendChild(f);
        }

        /**
         * 將選定行置頂排序
         */
        reorderRowsToTop(e, t) {
            this.snapshotOriginalOrder();
            const o = Array.from(e.querySelectorAll(this.constructor.CONFIG.SELECTORS.TABLE_ROW)),
                l = new Set(t.flat()),
                n = o.filter(e => !l.has(e)),
                r = document.createDocumentFragment();
            t.forEach(e => e.forEach(e => r.appendChild(e))), n.forEach(e => r.appendChild(e)), e.appendChild(r);
        }

        /**
         * 原地聚合排序 (將相關行移動到一起)
         */
        reorderRowsInPlace(e, t) {
            this.snapshotOriginalOrder();
            const o = Array.from(e.querySelectorAll(this.constructor.CONFIG.SELECTORS.TABLE_ROW)),
                l = [],
                n = new Set;
            o.forEach(e => {
                if (n.has(e)) return;
                let x = null;
                for (const r of t.values())
                    if (r.length > 0 && r.includes(e)) {
                        x = r;
                        break
                    }
                x ? (l.push(...x), x.forEach(e => n.add(e))) : l.push(e)
            });
            const r = document.createDocumentFragment();
            l.forEach(e => r.appendChild(e)), e.appendChild(r);
        }

        /**
         * 範圍勾選功能
         */
        selectRowRange() {
            const rows = this.findElementInShadowDom(this.constructor.CONFIG.SELECTORS.TABLE).querySelectorAll(this.constructor.CONFIG.SELECTORS.TABLE_ROW);
            const input = prompt(`輸入範圍 (如 1-20)，共 ${rows.length} 行`, "");
            if (!input) return;
            const m = input.match(/^(\d+)(?:-)?(\d*)?$/);
            if (!m) return;
            const s = parseInt(m[1]) - 1,
                e = m[2] ? parseInt(m[2]) - 1 : (input.endsWith('-') ? rows.length - 1 : s);
            const chk = rows[s]?.querySelector('input[type="checkbox"]');
            if (chk) {
                const val = !chk.checked;
                for (let i = s; i <= e; i++) {
                    const c = rows[i]?.querySelector('input[type="checkbox"]');
                    if (c && c.checked !== val) c.click();
                }
            }
        }

        /**
         * 加載目標賬號列表
         */
        loadTargetAccounts() {
            return new Set((localStorage.getItem(this.constructor.CONFIG.STORAGE_KEY) || '').split('\n').map(l => l.replace(/\*/g, '').trim().toUpperCase()).filter(Boolean));
        }

        /**
         * 解析指派映射表
         */
        parseAssignMap() {
            const raw = localStorage.getItem(this.constructor.CONFIG.STORAGE_KEY_ASSIGN);
            const map = new Map();
            if (raw) raw.split('\n').forEach(l => {
                const [k, v] = l.split('=').map(s => s.trim());
                if (k && v) k.split('/').forEach(key => map.set(key.trim().toUpperCase(), v));
            });
            return map;
        }

        /**
         * 顯示賬號設置彈窗
         */
        showAccountSettingsDialog() {
            this.showSettingsDialog(this.constructor.CONFIG.TEXT.ACCOUNT_SETTINGS_TITLE, this.constructor.CONFIG.TEXT.ACCOUNT_SETTINGS_PROMPT, this.constructor.CONFIG.STORAGE_KEY, () => {
                this.targetAccounts = this.loadTargetAccounts();
            });
        }

        /**
         * 顯示指派設置彈窗
         */
        showAssignSettingsDialog() {
            this.showSettingsDialog(this.constructor.CONFIG.TEXT.ASSIGN_SETTINGS_TITLE, this.constructor.CONFIG.TEXT.ASSIGN_SETTINGS_PROMPT, this.constructor.CONFIG.STORAGE_KEY_ASSIGN, () => { });
        }

        /**
         * 通用設置彈窗生成器
         */
        showSettingsDialog(title, promptText, storageKey, onSave) {
            const overlay = document.createElement('div');
            overlay.className = 'custom-dialog-overlay';
            const box = document.createElement('div');
            box.className = 'custom-dialog-box';
            box.innerHTML = `<div class="custom-dialog-title">${title}</div><p class="settings-dialog-prompt" style="white-space:pre-wrap">${promptText}</p>`;
            const area = document.createElement('textarea');
            area.className = 'settings-dialog-textarea';
            area.value = localStorage.getItem(storageKey) || '';
            const btns = document.createElement('div');
            btns.className = 'custom-dialog-buttons';
            const save = document.createElement('button');
            save.className = 'btn-primary';
            save.textContent = "保存";
            save.onclick = () => {
                localStorage.setItem(storageKey, area.value);
                onSave();
                this.showNotification("設置已保存", 'success');
                document.body.removeChild(overlay);
            };
            const cancel = document.createElement('button');
            cancel.className = 'btn-secondary';
            cancel.textContent = "取消";
            cancel.onclick = () => document.body.removeChild(overlay);
            btns.append(save, cancel);
            box.append(area, btns);
            overlay.appendChild(box);
            document.body.appendChild(overlay);
            overlay.addEventListener('click', e => { if (e.target === overlay) document.body.removeChild(overlay); });
        }

        // =================================================================================
        // 按鈕注入與事件管理
        // =================================================================================

        /**
         * 向頁面容器注入自定義按鈕
         */
        addCustomButtons(container) {
            this.removeCustomButtons();
            const C = this.constructor.CONFIG.TEXT;

            const btnAssign = this.createButton('assignAnalysisButton', C.ASSIGN_ANALYSIS_BUTTON, this.startAssignAnalysis.bind(this));
            const btnFind = this.createButton('findAccountButton', C.FIND_ACCOUNT_BUTTON, this.startFullLoadAndFindAccounts.bind(this));
            const btnRange = this.createButton('rangeSelectButton', C.RANGE_BUTTON, this.selectRowRange.bind(this));
            const btnDup = this.createButton('duplicateCheckButton', C.DUPLICATE_BUTTON, this.startFullLoadAndCheckDuplicates.bind(this));

            this.addLongPressHandler(btnAssign, this.showAssignSettingsDialog.bind(this));
            this.addLongPressHandler(btnFind, this.showAccountSettingsDialog.bind(this));

            this.buttons = { assign: btnAssign, find: btnFind, range: btnRange, dup: btnDup };

            container.insertBefore(btnAssign, container.firstChild);
            container.insertBefore(btnFind, container.firstChild);
            container.insertBefore(btnRange, container.firstChild);
            container.insertBefore(btnDup, container.firstChild);

            console.log('[Case助手]：按鈕注入完成。');
        }

        /**
         * 移除舊的自定義按鈕 (防止重複)
         */
        removeCustomButtons() {
            ['duplicateCheckButton', 'findAccountButton', 'rangeSelectButton', 'assignAnalysisButton'].forEach(id => {
                const el = document.getElementById(id) || this.findElementInShadowDom('#' + id);
                if (el) el.remove();
            });
            this.buttons = {};
        }

        /**
         * 創建符合 Salesforce 風格的按鈕
         */
        createButton(id, text, handler) {
            const li = document.createElement('li');
            li.className = 'slds-button slds-button--neutral slds-button_neutral';
            li.id = id;
            li.style.cssText = `width: 113px; text-align: center; margin-left: 0.25rem;`;
            li.innerHTML = `<a href="javascript:void(0);" role="button" class="forceActionLink" style="display:flex;justify-content:center;align-items:center;height:2rem;padding:0 0rem;color:var(--slds-c-button-text-color);"><div title="${text}">${text}</div></a>`;
            li.addEventListener('click', e => {
                if (!li.getAttribute('disabled') && !this.isLongPress) handler(e);
            });
            return li;
        }

        /**
         * 添加長按事件處理器 (用於打開設置)
         */
        addLongPressHandler(el, callback) {
            el.addEventListener('mousedown', e => {
                if (e.button !== 0) return;
                this.isLongPress = false;
                this.longPressTimer = setTimeout(() => {
                    this.isLongPress = true;
                    callback();
                }, 1000);
            });
            const clear = () => clearTimeout(this.longPressTimer);
            el.addEventListener('mouseup', clear);
            el.addEventListener('mouseleave', clear);
        }

        /**
         * 批量設置按鈕禁用狀態
         */
        setButtonsDisabled(disabled) {
            Object.values(this.buttons).forEach(b => {
                disabled ? b.setAttribute('disabled', 'true') : b.removeAttribute('disabled');
            });
        }
    }

    new SalesforceCaseOptimizer();
})();
