// ==UserScript==
// @name         IVP 接收器
// @namespace    IVP Receiver
// @version      V7
// @description  監聽 postMessage，在異步任務完成後回發確認，自動進行搜索
// @author       Jerry Law
// @match        https://ivp.inside.ups.com/internal-visibility-portal*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/Jerry199022/Work/refs/heads/main/IVPReceiver.js
// @downloadURL  https://raw.githubusercontent.com/Jerry199022/Work/refs/heads/main/IVPReceiver.js
// ==/UserScript==

(function() {
    'use strict';

    console.log('[IVP Receiver v6] 脚本已启动，準備監聽 postMessage...');

    const POST_RESET_DELAY = 150;
    const PRE_SEARCH_DELAY = 150;
    const ALLOWED_ORIGIN = 'https://upsdrive.lightning.force.com';

    let lastProcessedTimestamp = 150;

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    function waitForElement(selector, root = document.body, timeout = 5000) { /* ... 此處代碼不變，為簡潔省略 ... */ return new Promise((resolve, reject) => { const el = root.querySelector(selector); if (el) return resolve(el); const observer = new MutationObserver(() => { const el = root.querySelector(selector); if (el) { observer.disconnect(); resolve(el); } }); observer.observe(root, { childList: true, subtree: true }); setTimeout(() => { observer.disconnect(); reject(new Error(`等待元素 "${selector}" 超時`)); }, timeout); }); }
    function waitForButtonEnabled(selector, root = document.body, timeout = 5000) { /* ... 此處代碼不變，為簡潔省略 ... */ return new Promise((resolve, reject) => { waitForElement(selector, root, timeout).then(button => { if (!button.disabled) return resolve(button); const observer = new MutationObserver(() => { if (!button.disabled) { observer.disconnect(); resolve(button); } }); observer.observe(button, { attributes: true, attributeFilter: ['disabled'] }); setTimeout(() => { observer.disconnect(); reject(new Error(`等待按鈕 "${selector}" 變為可用狀態超時`)); }, timeout); }).catch(reject); }); }

    async function performSearch(trackingNumber) {
        if (!trackingNumber) {
            console.warn('[IVP Receiver] 收到空的追蹤號碼，跳過搜索。');
            return;
        }
        console.log(`[IVP Receiver] 流程开始，追蹤號碼: ${trackingNumber}`);
        // 注意：此處的 try...catch 已移至調用方，以更好地控制回執邏輯
        const hiddenContainerSelector = '#mainContainer > app-tracking > div > div > div.container-fluid.d-none';
        const toggleButtonSelector = '#toggle-visibility > button';
        let attempts = 0;
        const maxAttempts = 5;
        while (document.querySelector(hiddenContainerSelector) && attempts < maxAttempts) {
            const toggleButton = document.querySelector(toggleButtonSelector);
            if (toggleButton) { toggleButton.click(); await delay(200); } else { throw new Error(`无法找到展开按钮 "${toggleButtonSelector}"`); }
            attempts++;
        }
        if (attempts >= maxAttempts) throw new Error('展开搜索表单失败，已达最大尝试次数。');
        const clearButton = document.querySelector('div.action-buttons button[aria-label="Clear"]');
        if (clearButton) { clearButton.click(); await delay(200); }
        const searchInput = await waitForElement('input[id="Enter Tracking Number"]');
        await delay(POST_RESET_DELAY);
        searchInput.value = trackingNumber;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        const searchButton = await waitForButtonEnabled('div.action-buttons button[type="submit"]');
        await delay(PRE_SEARCH_DELAY);
        searchButton.click();
        console.log(`[IVP Receiver] 追蹤號碼 ${trackingNumber} 的搜索流程已成功執行完畢。`);
    }

    /**
     * [核心修復] 將 handlePostMessage 改造為異步函數
     * @param {MessageEvent} event
     */
    async function handlePostMessage(event) {
        if (event.origin !== ALLOWED_ORIGIN) return;
        const data = event.data;
        if (typeof data !== 'object' || data === null || data.type !== 'CEC_SEARCH_REQUEST' || !data.payload) return;
        const { trackingNumber, timestamp } = data.payload;
        if (!trackingNumber || typeof trackingNumber !== 'string' || !timestamp || typeof timestamp !== 'number') return;

        if (timestamp > lastProcessedTimestamp) {
            console.log(`[IVP Receiver] 收到新的搜索請求！時間戳: ${timestamp}`);
            lastProcessedTimestamp = timestamp;

            try {
                // 1. [關鍵] 使用 await 等待 performSearch 函數完全執行結束
                await performSearch(trackingNumber);

                // 2. 只有在 performSearch 成功完成後，才發送確認回執
                if (event.source) {
                    event.source.postMessage({
                        type: 'CEC_REQUEST_RECEIVED',
                        payload: { timestamp: timestamp }
                    }, event.origin);
                    console.log(`[IVP Receiver] 已向 CEC 回發時間戳為 ${timestamp} 的確認消息。`);
                }
            } catch (error) {
                // 3. 如果 performSearch 中途出錯，則打印錯誤並且不發送回執
                //    這會讓 CEC 腳本繼續重試，這是我們期望的行為
                console.error(`[IVP Receiver] 處理時間戳 ${timestamp} 的請求時失敗:`, error);
            }
        }
    }

    window.addEventListener('message', handlePostMessage, false);
    console.log(`[IVP Receiver] 已註冊 'message' 事件監聽器，等待來自 ${ALLOWED_ORIGIN} 的指令。`);

})();
