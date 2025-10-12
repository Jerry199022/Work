// ==UserScript==
// @name         Case查重
// @namespace    Case duplicate
// @version      V6
// @description  自動加載所有Case，支持排序恢復，提供更強大的查重與排序功能，並採用多層次加載終止判斷機制。
// @author       Jerry Law
// @match        https://upsdrive.lightning.force.com/lightning/*
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/Jerry199022/Work/refs/heads/main/CaseDuplicate.js
// @downloadURL  https://raw.githubusercontent.com/Jerry199022/Work/refs/heads/main/CaseDuplicate.js
// ==/UserScript==

(function() {
    'use strict';

    class SalesforceCaseOptimizer {

        // =================================================================================
        // V5.1 更新：CONFIG 配置擴展
        // =================================================================================
        static CONFIG = {
            TEXT: {
                DUPLICATE_BUTTON: "查重排序",
                RANGE_BUTTON: "範圍勾選",
                RESTORE_SORT_BUTTON: "恢復排序",
                DIALOG_TITLE: "掃描完畢！",
                DIALOG_SUMMARY: (total, groups) => `共掃描 <strong>${total}</strong> 列，發現 <strong>${groups}</strong> 組重複的追蹤號碼`,
                COPY_BUTTON: "複製重複單號",
                COPY_SUCCESS_BUTTON: "已複製！",
                REORDER_TOP_BUTTON: "全部置頂",
                REORDER_INPLACE_BUTTON: "原地聚合",
                CANCEL_BUTTON: "不作排序"
            },
            SELECTORS: {
                BUTTON_CONTAINERS: [
                    'div.actionsWrapper > ul.forceActionsContainer', 'div.actionsWrapper', 'lst-list-view-manager-button-bar', 'div[class*="Header"] .slds-button-group-list'
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
                TOTAL_COUNT: /of\s+(\d+)/,
                ITEMS_COUNT: /(\d+)\s*items/ 
            },
            STYLE: {
                HIGHLIGHT_COLORS: ['#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF'],
                STICKY_HEADER_CLASS: 'sticky-header-active'
            },
            TIMEOUTS: {
                WAIT_FOR_ELEMENT: 30000,
                COPY_SUCCESS_MSG: 1500,
                NOTIFICATION: 3500,
                LOAD_MORE_TIMEOUT: 5000
            }
        };

        constructor() {
            this.originalRowOrder = null;
            this.isLoading = false;
            this.buttons = {};
            this.init();
        }

        init() {
            this.addStyles();
            console.log('[查重腳本 V5]：腳本已啟動。');
            this.waitForAnyElement(this.constructor.CONFIG.SELECTORS.BUTTON_CONTAINERS, this.addCustomButtons.bind(this));
        }

        addStyles() {
            GM_addStyle(`
                /* [原有樣式] */
                .${this.constructor.CONFIG.STYLE.STICKY_HEADER_CLASS} { position: sticky !important; top: 0 !important; z-index: 10 !important; background-color: rgb(250, 250, 249) !important; }
                tr[data-highlighted-by-script="true"].slds-is-selected > td, tr[data-highlighted-by-script="true"].slds-is-selected > th,
                tr[data-highlighted-by-script="true"]:hover > td, tr[data-highlighted-by-script="true"]:hover > th { background-color: inherit !important; }
                li.slds-button a.forceActionLink:hover, li.slds-button a.forceActionLink:focus { text-decoration: none !important; }
                .custom-dialog-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.6); z-index: 10000; display: flex; justify-content: center; align-items: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
                .custom-dialog-box { background-color: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); width: 90%; max-width: 480px; padding: 24px; text-align: center; animation: dialog-fade-in 0.3s ease-out; display: flex; flex-direction: column; }
                @keyframes dialog-fade-in { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
                .custom-dialog-message { font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 16px; white-space: pre-wrap; }
                .custom-dialog-message strong { font-size: 18px; color: #005A9E; }
                .custom-dialog-details { max-height: 180px; overflow-y: auto; background-color: #f7f7f7; border: 1px solid #ddd; border-radius: 6px; padding: 12px; margin-bottom: 24px; text-align: left; font-size: 14px; }
                .custom-dialog-details p { margin: 0 0 6px; padding: 0; color: #181818; word-break: break-all; }
                .custom-dialog-details p:last-child { margin-bottom: 0; }
                .custom-dialog-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                .custom-dialog-buttons button { width: 100%; padding: 12px; font-size: 14px; font-weight: bold; border: none; border-radius: 6px; cursor: pointer; transition: background-color 0.2s, transform 0.1s; }
                .custom-dialog-buttons button:hover { transform: translateY(-1px); }
                .btn-primary { background-color: #0070d2; color: white; }
                .btn-primary:hover { background-color: #005A9E; }
                .btn-secondary { background-color: #eef1f6; color: #181818; }
                .btn-secondary:hover { background-color: #dde4ee; }
                .custom-toast-notification { position: fixed; top: 20px; right: 20px; background-color: #333; color: white; padding: 12px 20px; border-radius: 6px; z-index: 10001; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: opacity 0.3s, transform 0.3s; transform: translateX(100%); opacity: 0; }
                .custom-toast-notification.show { transform: translateX(0); opacity: 1; }
                .custom-toast-notification.error { background-color: #c23934; }
                .custom-toast-notification.success { background-color: #04844b; }

                /* [V5.0 新增樣式] */
                #full-load-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.75); z-index: 99999; display: flex; justify-content: center; align-items: center; color: white; font-size: 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; transition: opacity 0.3s; flex-direction: column; }
                #full-load-overlay p { margin: 0; }
                #full-load-overlay .loader-subtitle { font-size: 16px; margin-top: 8px; color: #ccc; }
                li.slds-button[disabled] { background-color: #f3f3f3; cursor: not-allowed; }
                li.slds-button[disabled] > a { color: #adadad; pointer-events: none; }
                                records-hoverable-link {
                    pointer-events: none !important;
                }
                records-hoverable-link a {
                    pointer-events: auto !important;
                }
            `);
        }

        // =================================================================================
        // 核心輔助函數 (無修改)
        // =================================================================================
        showNotification(message, type = 'info') { const notification = document.createElement('div'); notification.className = `custom-toast-notification ${type}`; notification.textContent = message; document.body.appendChild(notification); setTimeout(() => notification.classList.add('show'), 10); setTimeout(() => { notification.classList.remove('show'); notification.addEventListener('transitionend', () => notification.remove()); }, this.constructor.CONFIG.TIMEOUTS.NOTIFICATION); }
        findAllElementsInShadowDom(selector, root = document) { let r = Array.from(root.querySelectorAll(selector)); root.querySelectorAll('*').forEach(el => el.shadowRoot && (r = r.concat(this.findAllElementsInShadowDom(selector, el.shadowRoot)))); return r; }
        findElementInShadowDom(selector, root = document) { return this.findAllElementsInShadowDom(selector, root)[0] || null; }
        delay(ms) { return new Promise(res => setTimeout(res, ms)); }
        waitForAnyElement(selectors, callback) { console.log(`[查重腳本 V5]：正在等待按鈕容器...`); let t = !1; const e = setTimeout(() => { t = !0, console.error(`[查重腳本 V5]：錯誤：等待按鈕容器超時。`), o.disconnect() }, this.constructor.CONFIG.TIMEOUTS.WAIT_FOR_ELEMENT); const o = new MutationObserver(() => { if (t) return; for (const t of selectors) { const r = this.findElementInShadowDom(t); if (r) return console.log(`[查重腳本 V5]：成功找到按鈕容器。`), clearTimeout(e), o.disconnect(), void callback(r) } }); o.observe(document.body, { childList: !0, subtree: !0 }) }
        clearHighlights() { const e = this.findElementInShadowDom(this.constructor.CONFIG.SELECTORS.TABLE); e && e.querySelectorAll(this.constructor.CONFIG.SELECTORS.TABLE_ROW).forEach(e => { e.style.backgroundColor = "", e.removeAttribute("data-highlighted-by-script") }) }

        // =================================================================================
        // 範圍選擇 (無修改)
        // =================================================================================
        selectRowRange() {
            const table = this.findElementInShadowDom(this.constructor.CONFIG.SELECTORS.TABLE);
            if (!table) return this.showNotification("錯誤：找不到案件列表表格 (table)！", 'error');
            const rows = table.querySelectorAll(this.constructor.CONFIG.SELECTORS.TABLE_ROW);
            if (rows.length === 0) return this.showNotification("錯誤：列表中沒有數據行。", 'error');
            const rangeInput = prompt(`請輸入要勾選的行範圍 (例如: 1-20)。\n當前列表共 ${rows.length} 行。`, "");
            if (null === rangeInput) return;
            const match = rangeInput.match(/^(\d+)(?:-)?(\d*)?$/);
            if (!match) return this.showNotification("輸入格式錯誤！請使用 '數字' 或 '數字-數字' 格式。", 'error');
            let start, end;
            start = parseInt(match[1], 10);
            if (match[2]) { end = parseInt(match[2], 10); } else if (rangeInput.endsWith("-")) { end = rows.length; } else { end = start; }
            if (isNaN(start) || start < 1 || end < start) return this.showNotification("輸入範圍無效！", 'error');
            const startIndex = start - 1;
            const endIndex = Math.min(end - 1, rows.length - 1);
            const firstCheckbox = rows[startIndex]?.querySelector(this.constructor.CONFIG.SELECTORS.CHECKBOX);
            if (!firstCheckbox) return this.showNotification(`錯誤：無法在第 ${start} 行找到選擇框。`, 'error');
            const shouldBeChecked = !firstCheckbox.checked;
            for (let i = startIndex; i <= endIndex; i++) {
                const checkbox = rows[i]?.querySelector(this.constructor.CONFIG.SELECTORS.CHECKBOX);
                if (checkbox && checkbox.checked !== shouldBeChecked) { checkbox.click(); }
            }
        }

        // =================================================================================
        // 排序功能 (無修改)
        // =================================================================================
        reorderRowsToTop(e, t) { this.snapshotOriginalOrder(); const o = Array.from(e.querySelectorAll(this.constructor.CONFIG.SELECTORS.TABLE_ROW)), l = new Set(t.flat()), n = o.filter(e => !l.has(e)), r = document.createDocumentFragment(); t.forEach(e => e.forEach(e => r.appendChild(e))), n.forEach(e => r.appendChild(e)), e.appendChild(r); this.buttons.restoreSort.removeAttribute('disabled'); }
        reorderRowsInPlace(e, t) { this.snapshotOriginalOrder(); const o = Array.from(e.querySelectorAll(this.constructor.CONFIG.SELECTORS.TABLE_ROW)), l = [], n = new Set; o.forEach(e => { if (n.has(e)) return; let o = null; for (const r of t.values()) if (r.length > 1 && r.includes(e)) { o = r; break } o ? (l.push(...o), o.forEach(e => n.add(e))) : l.push(e) }); const r = document.createDocumentFragment(); l.forEach(e => r.appendChild(e)), e.appendChild(r); this.buttons.restoreSort.removeAttribute('disabled'); }

        // =================================================================================
        // 排序備份與恢復 (無修改)
        // =================================================================================
        snapshotOriginalOrder() { if (this.originalRowOrder) return; const tableBody = this.findElementInShadowDom(this.constructor.CONFIG.SELECTORS.TABLE_BODY); if (tableBody) { this.originalRowOrder = Array.from(tableBody.querySelectorAll(this.constructor.CONFIG.SELECTORS.TABLE_ROW)); console.log(`[查重腳本 V5]：已成功備份 ${this.originalRowOrder.length} 行的原始順序。`); } }
        restoreOriginalOrder() { if (!this.originalRowOrder) { this.showNotification("錯誤：沒有可恢復的排序。", 'error'); return; } this.clearHighlights(); const tableBody = this.findElementInShadowDom(this.constructor.CONFIG.SELECTORS.TABLE_BODY); if (tableBody) { const fragment = document.createDocumentFragment(); this.originalRowOrder.forEach(row => fragment.appendChild(row)); tableBody.innerHTML = ''; tableBody.appendChild(fragment); this.buttons.restoreSort.setAttribute('disabled', 'true'); this.showNotification("已恢復原始排序。", 'success'); } }

        // =================================================================================
        // 對話框與剪貼板功能 (無修改)
        // =================================================================================
        async copyDuplicatesToClipboard(duplicateSummary, button) { if (!navigator.clipboard) return this.showNotification('您的瀏覽器不支援此功能，或頁面非安全協議 (https)。', 'error'); const numbersToCopy = duplicateSummary.map(summary => summary.split(' ')[0]).join('\n'); try { await navigator.clipboard.writeText(numbersToCopy); const originalText = button.textContent; button.textContent = this.constructor.CONFIG.TEXT.COPY_SUCCESS_BUTTON; button.disabled = true; setTimeout(() => { button.textContent = originalText; button.disabled = false; }, this.constructor.CONFIG.TIMEOUTS.COPY_SUCCESS_MSG); } catch (err) { console.error('[查重腳本 V5]：複製到剪貼簿失敗：', err); this.showNotification('複製失敗！請檢查瀏覽器權限設置。', 'error'); } }
        showActionDialog(totalRows, duplicateGroups, duplicateSummary, trackingNumbersMap, table) { const C = this.constructor.CONFIG.TEXT; const overlay = document.createElement('div'); overlay.className = 'custom-dialog-overlay'; const dialogBox = document.createElement('div'); dialogBox.className = 'custom-dialog-box'; const message = document.createElement('div'); message.className = 'custom-dialog-message'; message.innerHTML = C.DIALOG_SUMMARY(totalRows, duplicateGroups.length); const detailsContainer = document.createElement('div'); detailsContainer.className = 'custom-dialog-details'; detailsContainer.innerHTML = duplicateSummary.map(line => `<p>${line.replace('出現 ', ' ').replace('次)', `個 case)`)}</p>`).join(''); const buttonContainer = document.createElement('div'); buttonContainer.className = 'custom-dialog-buttons'; const closeDialog = () => document.body.removeChild(overlay); const btnTop = document.createElement('button'); btnTop.textContent = C.REORDER_TOP_BUTTON; btnTop.className = 'btn-primary'; btnTop.onclick = () => { this.reorderRowsToTop(table.querySelector('tbody'), duplicateGroups); table.scrollIntoView({ behavior: 'smooth' }); closeDialog(); }; const btnInPlace = document.createElement('button'); btnInPlace.textContent = C.REORDER_INPLACE_BUTTON; btnInPlace.className = 'btn-primary'; btnInPlace.onclick = () => { this.reorderRowsInPlace(table.querySelector('tbody'), trackingNumbersMap); if (duplicateGroups.length > 0) duplicateGroups[0][0].scrollIntoView({ behavior: 'smooth', block: 'center' }); closeDialog(); }; const btnCopy = document.createElement('button'); btnCopy.textContent = C.COPY_BUTTON; btnCopy.className = 'btn-secondary'; btnCopy.onclick = () => this.copyDuplicatesToClipboard(duplicateSummary, btnCopy); const btnCancel = document.createElement('button'); btnCancel.textContent = C.CANCEL_BUTTON; btnCancel.className = 'btn-secondary'; btnCancel.onclick = closeDialog; buttonContainer.append(btnTop, btnInPlace, btnCopy, btnCancel); dialogBox.append(message, detailsContainer, buttonContainer); overlay.appendChild(dialogBox); document.body.appendChild(overlay); overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDialog(); }); }

        // =================================================================================
        // V5.1 核心重構：採用多層次終止判斷的全量自動加載器
        // =================================================================================
        async startFullLoadAndCheck() {
            if (this.isLoading) {
                this.showNotification("正在處理中，請勿重複點擊。", "info");
                return;
            }

            const table = this.findElementInShadowDom(this.constructor.CONFIG.SELECTORS.TABLE);
            if (!table) return this.showNotification('錯誤：找不到案件列表表格 (table)！', 'error');

            this.isLoading = true;
            this.setButtonsDisabled(true);

            const overlay = this.createLoadingOverlay();
            document.body.appendChild(overlay);
            const statusText = overlay.querySelector('p');
            const subStatusText = overlay.querySelector('.loader-subtitle');

            try {
                const tableBody = table.querySelector('tbody');
                let lastRowCount = 0;

                while (true) {
                    const currentRowCount = tableBody.querySelectorAll('tr').length;
                    statusText.textContent = `正在自動加載所有記錄...`;
                    subStatusText.textContent = `已加載 ${currentRowCount} 條`;

                    const countSpan = this.findElementInShadowDom(this.constructor.CONFIG.SELECTORS.TOTAL_COUNT_SPAN);
                    let isLoadComplete = false;

                    if (countSpan && countSpan.textContent) {
                        const statusTextContent = countSpan.textContent.trim();

                        // --- 第一層判斷 (主策略): 檢查 '+' 號是否存在，並交叉驗證行數 ---
                        if (!statusTextContent.includes('+')) {
                            const match = statusTextContent.match(this.constructor.CONFIG.REGEX.ITEMS_COUNT);
                            const finalCount = match ? parseInt(match[1], 10) : parseInt(statusTextContent, 10);

                            if (!isNaN(finalCount) && currentRowCount >= finalCount) {
                                console.log(`[查重腳本 V5]：終止條件1滿足 - '+'號消失且行數匹配 (${currentRowCount}/${finalCount})。`);
                                isLoadComplete = true;
                            }
                        }

                        // --- 第二層判斷 (備用策略): 檢查 'of XXX' 總數 ---
                        if (!isLoadComplete) {
                            const match = statusTextContent.match(this.constructor.CONFIG.REGEX.TOTAL_COUNT);
                            if (match && match[1]) {
                                const totalCount = parseInt(match[1], 10);
                                if (currentRowCount >= totalCount) {
                                    console.log(`[查重腳本 V5]：終止條件2滿足 - 已加載行數達到總數 (${currentRowCount}/${totalCount})。`);
                                    isLoadComplete = true;
                                }
                            }
                        }
                    }

                    if (isLoadComplete) {
                        // 給予一個極短的延遲，確保最後幾行的DOM渲染完成
                        await this.delay(100);
                        break;
                    }

                    // --- 第三層判斷 (終極兜底): 加載停滯或超時 ---
                    if (lastRowCount === currentRowCount && currentRowCount > 0) {
                         console.log('[查重腳本 V5]：終止條件3滿足 - 行數未增加，判斷為加載完畢。');
                         break;
                    }

                    lastRowCount = currentRowCount;
                    const lastRow = tableBody.querySelector('tr:last-child');
                    if(lastRow) lastRow.scrollIntoView({ behavior: 'auto', block: 'end' });

                    try {
                        await this.waitForNewRows(tableBody, this.constructor.CONFIG.TIMEOUTS.LOAD_MORE_TIMEOUT);
                    } catch (error) {
                        console.warn(`[查重腳本 V5]：終止條件3滿足 - ${error.message}`);
                        break;
                    }
                }

                statusText.textContent = '數據加載完畢，開始掃描...';
                await this.delay(500);
                this.findAndHighlightDuplicates();

            } catch (err) {
                console.error('[查重腳本 V5]：自動加載過程中發生錯誤:', err);
                this.showNotification('自動加載失敗，請檢查控制台日誌。', 'error');
            } finally {
                document.body.removeChild(overlay);
                this.isLoading = false;
                this.setButtonsDisabled(false);
            }
        }

        createLoadingOverlay() {
            const overlay = document.createElement('div');
            overlay.id = 'full-load-overlay';
            const statusText = document.createElement('p');
            statusText.textContent = '正在初始化...';
            const subStatusText = document.createElement('p');
            subStatusText.className = 'loader-subtitle';
            subStatusText.textContent = '請稍候';
            overlay.append(statusText, subStatusText);
            return overlay;
        }

        waitForNewRows(targetNode, timeout) {
            return new Promise((resolve, reject) => {
                const initialRowCount = targetNode.children.length;
                const observer = new MutationObserver(() => {
                    if (targetNode.children.length > initialRowCount) {
                        observer.disconnect();
                        clearTimeout(timer);
                        resolve();
                    }
                });

                const timer = setTimeout(() => {
                    observer.disconnect();
                    reject(new Error(`等待新紀錄超時 (${timeout}ms)`));
                }, timeout);

                observer.observe(targetNode, { childList: true });
            });
        }

        // =================================================================================
        // 查重與高亮核心邏輯 (無修改)
        // =================================================================================
        async findAndHighlightDuplicates() {
            const C = this.constructor.CONFIG;
            const table = this.findElementInShadowDom(C.SELECTORS.TABLE);
            this.clearHighlights();
            const thead = table.querySelector('thead');
            if (thead) thead.classList.add(C.STYLE.STICKY_HEADER_CLASS);

            const trackingNumbersMap = new Map();
            const totalRows = table.querySelectorAll(C.SELECTORS.TABLE_ROW).length;

            const allPreviewButtons = this.findAllElementsInShadowDom(C.SELECTORS.PREVIEW_BUTTON, table);
            allPreviewButtons.forEach(button => {
                const row = button.closest(C.SELECTORS.TABLE_ROW);
                if (!row) return;
                const titleText = button.getAttribute('title');
                if (titleText) {
                    const matches = titleText.match(C.REGEX.TRACKING_NUMBER);
                    if (matches) {
                        matches.forEach(number => {
                            const upperCaseNumber = number.toUpperCase();
                            if (!trackingNumbersMap.has(upperCaseNumber)) {
                                trackingNumbersMap.set(upperCaseNumber, []);
                            }
                            trackingNumbersMap.get(upperCaseNumber).push(row);
                        });
                    }
                }
            });

            let colorIndex = 0;
            const duplicateGroups = [];
            const duplicateSummary = [];
            const HIGHLIGHT_COLORS = C.STYLE.HIGHLIGHT_COLORS;
            trackingNumbersMap.forEach((rowsWithSameNumber, number) => {
                if (rowsWithSameNumber.length > 1) {
                    const color = HIGHLIGHT_COLORS[colorIndex % HIGHLIGHT_COLORS.length];
                    duplicateGroups.push(rowsWithSameNumber);
                    duplicateSummary.push(`${number} (出現 ${rowsWithSameNumber.length} 次)`);
                    rowsWithSameNumber.forEach(row => {
                        row.style.backgroundColor = color;
                        row.setAttribute('data-highlighted-by-script', 'true');
                    });
                    colorIndex++;
                }
            });

            console.group("--- 重複運單號總結 ---");
            if (duplicateGroups.length > 0) console.log(duplicateSummary.join('\n'));
            else console.log('未發現重複運單號。');
            console.groupEnd();

            if (thead) thead.classList.remove(C.STYLE.STICKY_HEADER_CLASS);

            if (duplicateGroups.length === 0) {
                this.showNotification('掃描完畢，未發現重複的追蹤號。', 'success');
            } else {
                this.showActionDialog(totalRows, duplicateGroups, duplicateSummary, trackingNumbersMap, table);
            }
        }

        // =================================================================================
        // 按鈕創建與管理 (無修改)
        // =================================================================================
        addCustomButtons(container) {
            const duplicateCheckButton = this.createButton('duplicateCheckButton', this.constructor.CONFIG.TEXT.DUPLICATE_BUTTON, this.startFullLoadAndCheck.bind(this));
            const rangeSelectButton = this.createButton('rangeSelectButton', this.constructor.CONFIG.TEXT.RANGE_BUTTON, this.selectRowRange.bind(this));
            const restoreSortButton = this.createButton('restoreSortButton', this.constructor.CONFIG.TEXT.RESTORE_SORT_BUTTON, this.restoreOriginalOrder.bind(this));
            restoreSortButton.setAttribute('disabled', 'true');

            this.buttons = {
                duplicateCheck: duplicateCheckButton,
                rangeSelect: rangeSelectButton,
                restoreSort: restoreSortButton
            };

            container.insertBefore(this.buttons.restoreSort, container.firstChild);
            container.insertBefore(this.buttons.rangeSelect, container.firstChild);
            container.insertBefore(this.buttons.duplicateCheck, container.firstChild);

            console.log(`[查重腳本 V5]：成功新增所有自訂按鈕！`);
        }

        createButton(id, text, clickHandler) {
            const listItem = document.createElement('li');
            listItem.className = 'slds-button slds-button--neutral slds-button_neutral';
            listItem.id = id;
            listItem.style.cssText = `min-width: 10px; text-align: center; margin-left: var(--lwc-spacingXxSmall, 0.25rem);`;
            const link = document.createElement('a');
            link.href = 'javascript:void(0);';
            link.title = text;
            link.className = 'forceActionLink';
            link.setAttribute('role', 'button');
            link.style.cssText = "padding: 0 1rem; line-height: 2rem; color: var(--slds-c-button-text-color);";
            const div = document.createElement('div');
            div.title = text;
            div.textContent = text;
            link.appendChild(div);
            listItem.appendChild(link);
            listItem.addEventListener('click', (e) => {
                if (listItem.getAttribute('disabled')) {
                    e.preventDefault();
                    e.stopPropagation();
                } else {
                    clickHandler(e);
                }
            });
            return listItem;
        }

        setButtonsDisabled(disabled) {
            Object.values(this.buttons).forEach(button => {
                if (button.id === 'restoreSortButton' && !disabled) {
                    return;
                }
                if (disabled) {
                    button.setAttribute('disabled', 'true');
                } else {
                    button.removeAttribute('disabled');
                }
            });
        }
    }

    new SalesforceCaseOptimizer();

})();
