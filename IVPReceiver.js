// ==UserScript==
// @name         IVP 接收器
// @namespace    IVP Receiver
// @version      11
// @description  同時支持 postMessage 和本地HTTP輪詢，增加重複追蹤號攔截，並能自動關閉彈出窗口。
// @author       Jerry Law
// @match        https://ivp.inside.ups.com/internal-visibility-portal*
// @grant        GM_xmlhttpRequest
// @connect      127.0.0.1
// @connect      localhost
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/Jerry199022/Work/refs/heads/main/IVPReceiver.js
// @downloadURL  https://raw.githubusercontent.com/Jerry199022/Work/refs/heads/main/IVPReceiver.js
// ==/UserScript==

(function() {
    'use strict';

    console.log('[IVP Receiver v11] 腳本已啟動，具備自動關閉彈窗功能...');

    const SERVER_URL = "http://127.0.0.1:58888/";
    const POLLING_INTERVAL = 500;
    const ALLOWED_ORIGIN = 'https://upsdrive.lightning.force.com';
    const POST_RESET_DELAY = 150;
    const PRE_SEARCH_DELAY = 150;
    const OVERLAY_CLOSE_DELAY = 100;

    let lastProcessedTimestamp = 0;
    let lastProcessedTrackingNumber = null;

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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
     * [優化] 檢測並關閉所有由 Angular CDK 生成的頂置彈出窗口
     */
    async function closeExistingOverlaysAsync() {
        // 選擇器定位到包含 "fa-times" (關閉圖標) 的 <li> 元素，這通常是可點擊的目標
        const closeButtonParents = document.querySelectorAll('div.cdk-overlay-pane li:has(em.fa-times)');

        if (closeButtonParents.length > 0) {
            console.log(`[IVP Receiver] 檢測到 ${closeButtonParents.length} 個彈出窗口，正在嘗試關閉...`);
            for (const btnParent of closeButtonParents) {
                // 點擊 <li> 元素本身
                btnParent.click();
                await delay(OVERLAY_CLOSE_DELAY); // 等待動畫完成
            }
            console.log('[IVP Receiver] 所有彈出窗口已關閉。');
        }
    }

    async function performSearch(trackingNumber, source) {
        // [優化] 在執行任何操作前，首先檢查並關閉可能存在的彈出窗口
        await closeExistingOverlaysAsync();

        if (!trackingNumber) {
            console.warn(`[IVP Receiver - ${source}] 收到空的追蹤號碼，跳過搜索。`);
            return false;
        }
        console.log(`[IVP Receiver - ${source}] 流程開始，追蹤號碼: ${trackingNumber}`);
        try {
            const hiddenContainerSelector = '#mainContainer > app-tracking > div > div > div.container-fluid.d-none';
            const toggleButtonSelector = '#toggle-visibility > button';
            let attempts = 0;
            const maxAttempts = 5;
            while (document.querySelector(hiddenContainerSelector) && attempts < maxAttempts) {
                const toggleButton = document.querySelector(toggleButtonSelector);
                if (toggleButton) {
                    toggleButton.click();
                    await delay(200);
                } else {
                    throw new Error(`無法找到展開按鈕 "${toggleButtonSelector}"`);
                }
                attempts++;
            }
            if (attempts >= maxAttempts) throw new Error('展開搜索表單失敗，已達最大嘗試次數。');
            const clearButton = document.querySelector('div.action-buttons button[aria-label="Clear"]');
            if (clearButton) {
                clearButton.click();
                await delay(200);
            }
            const searchInput = await waitForElement('input[id="Enter Tracking Number"]');
            await delay(POST_RESET_DELAY);
            searchInput.value = trackingNumber;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            const searchButton = await waitForButtonEnabled('div.action-buttons button[type="submit"]');
            await delay(PRE_SEARCH_DELAY);
            searchButton.click();
            console.log(`[IVP Receiver - ${source}] 追蹤號碼 ${trackingNumber} 的搜索流程已成功執行完畢。`);
            return true;
        } catch (error) {
            console.error(`[IVP Receiver - ${source}] 執行搜索時發生錯誤:`, error);
            return false;
        }
    }

    async function handlePostMessage(event) {
        if (event.origin !== ALLOWED_ORIGIN) return;
        const data = event.data;
        if (typeof data !== 'object' || data === null || data.type !== 'CEC_SEARCH_REQUEST' || !data.payload) return;
        const { trackingNumber, timestamp } = data.payload;
        if (!trackingNumber || typeof trackingNumber !== 'string' || !timestamp || typeof timestamp !== 'number') return;

        if (timestamp > lastProcessedTimestamp) {
            console.log(`[IVP Receiver - PostMessage] 收到新的搜索請求！時間戳: ${timestamp}`);

            if (trackingNumber === lastProcessedTrackingNumber) {
                console.log(`[IVP Receiver - PostMessage] 偵測到重複的追蹤號碼 "${trackingNumber}"，跳過搜索但發送確認回執。`);
                lastProcessedTimestamp = timestamp;
                if (event.source) {
                    event.source.postMessage({
                        type: 'CEC_REQUEST_RECEIVED',
                        payload: { timestamp: timestamp }
                    }, event.origin);
                }
                return;
            }

            const success = await performSearch(trackingNumber, 'PostMessage');
            if (success) {
                lastProcessedTimestamp = timestamp;
                lastProcessedTrackingNumber = trackingNumber;
                if (event.source) {
                    event.source.postMessage({
                        type: 'CEC_REQUEST_RECEIVED',
                        payload: { timestamp: timestamp }
                    }, event.origin);
                    console.log(`[IVP Receiver - PostMessage] 已向 CEC 回發時間戳為 ${timestamp} 的確認消息。`);
                }
            }
        }
    }

    function pollServer() {
        GM_xmlhttpRequest({
            method: "GET",
            url: SERVER_URL,
            timeout: 1000,
            onload: function(response) {
                if (response.status === 200) {
                    const trackingNumber = (response.responseText || "").trim();
                    if (trackingNumber) {
                        if (trackingNumber === lastProcessedTrackingNumber) {
                            return;
                        }
                        lastProcessedTrackingNumber = trackingNumber;
                        performSearch(trackingNumber, 'Polling');
                    }
                }
            },
            onerror: function(response) { /* 靜默處理錯誤 */ },
            ontimeout: function() { /* 靜默處理超時 */ }
        });
    }

    function initializeReceivers() {
        window.addEventListener('message', handlePostMessage, false);
        console.log(`[IVP Receiver] 已註冊 'message' 事件監聽器，等待來自 ${ALLOWED_ORIGIN} 的指令。`);

        setTimeout(() => {
            setInterval(pollServer, POLLING_INTERVAL);
            console.log(`[IVP Receiver] 已啟動 HTTP 輪詢，每 ${POLLING_INTERVAL / 1000} 秒向 ${SERVER_URL} 查詢一次。`);
        }, 2000);
    }

    initializeReceivers();

})();
