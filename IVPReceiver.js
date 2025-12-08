// ==UserScript==
// @name         IVP 接收器 (鍵盤注入版)
// @namespace    IVP Receiver
// @version      12
// @description  移除本地服務器依賴，改用 F10 + 粘貼 (Excel注入) 方式，保留彈窗自動關閉功能。
// @author       Jerry Law
// @match        https://ivp.inside.ups.com/internal-visibility-portal*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log('[IVP Receiver v12.0] 腳本已啟動，正在監聽 F10 快捷鍵...');

    // --- 常量配置 ---
    const ALLOWED_ORIGIN = 'https://upsdrive.lightning.force.com'; // 保留 Salesforce 支持
    const POST_RESET_DELAY = 150;
    const PRE_SEARCH_DELAY = 150;
    const OVERLAY_CLOSE_DELAY = 100;

    // --- 狀態變量 ---
    let lastProcessedTimestamp = 0;
    let lastProcessedTrackingNumber = null;

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    // --- 輔助函數 ---
    function waitForElement(selector, root = document.body, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const el = root.querySelector(selector);
            if (el) return resolve(el);
            const observer = new MutationObserver(() => {
                const el = root.querySelector(selector);
                if (el) {
                    observer.disconnect();
                    resolve(el);
                }
            });
            observer.observe(root, { childList: true, subtree: true });
            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`等待元素 "${selector}" 超時`));
            }, timeout);
        });
    }

    function waitForButtonEnabled(selector, root = document.body, timeout = 5000) {
        return new Promise((resolve, reject) => {
            waitForElement(selector, root, timeout).then(button => {
                if (!button.disabled) return resolve(button);
                const observer = new MutationObserver(() => {
                    if (!button.disabled) {
                        observer.disconnect();
                        resolve(button);
                    }
                });
                observer.observe(button, { attributes: true, attributeFilter: ['disabled'] });
                setTimeout(() => {
                    observer.disconnect();
                    reject(new Error(`等待按鈕 "${selector}" 變為可用狀態超時`));
                }, timeout);
            }).catch(reject);
        });
    }

    /**
     * 檢測並關閉所有由 Angular CDK 生成的頂置彈出窗口
     */
    async function closeExistingOverlaysAsync() {
        const closeButtonParents = document.querySelectorAll('div.cdk-overlay-pane li:has(em.fa-times)');
        if (closeButtonParents.length > 0) {
            console.log(`[IVP Receiver] 檢測到 ${closeButtonParents.length} 個彈出窗口，正在嘗試關閉...`);
            for (const btnParent of closeButtonParents) {
                btnParent.click();
                await delay(OVERLAY_CLOSE_DELAY);
            }
        }
    }

    /**
     * 執行核心搜索邏輯
     */
    async function performSearch(trackingNumber, source) {
        // 1. 關閉彈窗
        await closeExistingOverlaysAsync();

        if (!trackingNumber) {
            console.warn(`[IVP Receiver - ${source}] 收到空的追蹤號碼，跳過。`);
            return;
        }

        console.log(`[IVP Receiver - ${source}] 開始處理追蹤號碼: ${trackingNumber}`);

        try {
            // 2. 處理隱藏的搜索欄
            const hiddenContainerSelector = '#mainContainer > app-tracking > div > div > div.container-fluid.d-none';
            const toggleButtonSelector = '#toggle-visibility > button';
            let attempts = 0;
            while (document.querySelector(hiddenContainerSelector) && attempts < 5) {
                const toggleButton = document.querySelector(toggleButtonSelector);
                if (toggleButton) {
                    toggleButton.click();
                    await delay(200);
                }
                attempts++;
            }

            // 3. 清除舊內容
            const clearButton = document.querySelector('div.action-buttons button[aria-label="Clear"]');
            if (clearButton) {
                clearButton.click();
                await delay(200);
            }

            // 4. 填入追蹤號
            const searchInput = await waitForElement('input[id="Enter Tracking Number"]');
            await delay(POST_RESET_DELAY);
            searchInput.value = trackingNumber;
            // 觸發 input 事件，這對於 Angular/React 很重要
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));

            // 5. 點擊搜索
            const searchButton = await waitForButtonEnabled('div.action-buttons button[type="submit"]');
            await delay(PRE_SEARCH_DELAY);
            searchButton.click();

            console.log(`[IVP Receiver - ${source}] 搜索已執行。`);

            // 更新狀態防止重複
            lastProcessedTrackingNumber = trackingNumber;

        } catch (error) {
            console.error(`[IVP Receiver - ${source}] 錯誤:`, error);
        }
    }

    /**
     * [核心新功能] 激活隱形接收陷阱
     * 用於捕獲 Excel 發送的 Ctrl+V 內容
     */
    function activateTrap() {
        console.log('[IVP Receiver] F10 被觸發，正在創建接收框...');

        // 創建接收用的 textarea
        const trap = document.createElement('textarea');

        // 樣式設置：覆蓋在屏幕上方，透明，確保能獲取焦點
        trap.style.position = 'fixed';
        trap.style.top = '0';
        trap.style.left = '0';
        trap.style.width = '100px';
        trap.style.height = '100px';
        trap.style.opacity = '0'; // 透明不可見
        trap.style.zIndex = '999999'; // 最頂層
        trap.style.pointerEvents = 'none'; // 讓鼠標點擊穿透，不影響用戶

        document.body.appendChild(trap);

        // 強制聚焦
        trap.focus();

        // 雙重保險：如果在極短時間內焦點丟失，嘗試重新聚焦
        setTimeout(() => trap.focus(), 50);

        // 等待 Excel 粘貼數據 (800ms)
        setTimeout(() => {
            const receivedData = trap.value.trim();

            // 清理 DOM
            if (trap.parentNode) {
                document.body.removeChild(trap);
            }

            if (receivedData) {
                console.log(`[IVP Receiver] 成功通過 F10 捕獲數據: ${receivedData}`);
                performSearch(receivedData, 'KeyboardInjection');
            } else {
                console.warn('[IVP Receiver] 陷阱未捕獲到數據 (粘貼超時或為空)。');
            }
        }, 800);
    }

    // --- 事件監聽 ---

    // 1. 監聽 F10 鍵 (來自 Excel 的觸發信號)
    window.addEventListener('keydown', function(e) {
        if (e.key === 'F10' || e.keyCode === 121) {
            e.preventDefault(); // 阻止瀏覽器默認行為
            e.stopPropagation();
            activateTrap(); // 啟動接收流程
        }
    });

    // 2. 保留 postMessage 監聽 (Salesforce 兼容性)
    window.addEventListener('message', async function(event) {
        if (event.origin !== ALLOWED_ORIGIN) return;
        const data = event.data;
        if (data?.type === 'CEC_SEARCH_REQUEST' && data.payload) {
            const { trackingNumber, timestamp } = data.payload;
            if (timestamp > lastProcessedTimestamp) {
                if (trackingNumber !== lastProcessedTrackingNumber) {
                    await performSearch(trackingNumber, 'PostMessage');
                }
                lastProcessedTimestamp = timestamp;
                // 發送回執
                if (event.source) {
                    event.source.postMessage({
                        type: 'CEC_REQUEST_RECEIVED',
                        payload: { timestamp: timestamp }
                    }, event.origin);
                }
            }
        }
    }, false);

})();
