// ==UserScript==
// @name         通用接收器
// @namespace    Universal Receiver
// @version      V13
// @description  同時支持 IVP 內部系統與 UPS 官網的自動查詢接收器。整合 F10 注入與跨窗口通訊功能。
// @author       Jerry Law
// @match        https://ivp.inside.ups.com/internal-visibility-portal*
// @match        https://www.ups.com/track*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/Jerry199022/Work/refs/heads/main/IVPReceiver.js
// @downloadURL  https://raw.githubusercontent.com/Jerry199022/Work/refs/heads/main/IVPReceiver.js
// ==/UserScript==

(function() {
    'use strict';

    const CURRENT_HOST = window.location.hostname;
    const IS_IVP = CURRENT_HOST.includes('ivp.inside.ups.com');
    const IS_UPS_WEB = CURRENT_HOST.includes('ups.com');
    const ALLOWED_ORIGIN = 'https://upsdrive.lightning.force.com';

    console.log(`[Universal Receiver V13] 啟動於: ${CURRENT_HOST}`);
    console.log(`[Mode] ${IS_IVP ? 'IVP Mode' : (IS_UPS_WEB ? 'UPS Web Mode' : 'Unknown Mode')}`);

    // --- 狀態變量 ---
    // [修改說明] 移除了 lastProcessedTrackingNumber，僅保留時間戳用於過濾網絡重試包
    let lastProcessedTimestamp = 0;

    // --- 通用工具函數 ---
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

    /**
     * [核心新增] 檢測頁面當前是否已經顯示了目標追蹤號
     * @param {string} targetNumber - 新收到的追蹤號
     * @returns {boolean} - 如果頁面已顯示該號碼則返回 true
     */
    function isTrackingNumberOnPage(targetNumber) {
        if (!targetNumber) return false;

        let element = null;
        let displayedText = '';

        if (IS_IVP) {
            // IVP Selector: <h6 class="h6tracking"><span>1Z...</span></h6>
            element = document.querySelector('h6.h6tracking span');
        } else if (IS_UPS_WEB) {
            // UPS Web Selector: <strong id="stApp_trackingNumber">1Z...</strong>
            element = document.getElementById('stApp_trackingNumber');
        }

        if (element) {
            // 獲取文本並去除前後空格、換行符
            displayedText = element.textContent.trim();
            // 簡單清理：移除可能存在的空格，確保比對準確
            const cleanDisplayed = displayedText.replace(/\s/g, '');
            const cleanTarget = targetNumber.replace(/\s/g, '');

            // 進行比對 (不區分大小寫)
            if (cleanDisplayed.toLowerCase() === cleanTarget.toLowerCase()) {
                return true;
            }
        }
        return false;
    }

    // --- 核心邏輯：UPS Web 模式 ---
    async function performWebSearch(trackingNumber) {
        console.log(`[UPS Web] 執行查詢: ${trackingNumber}`);

        const targets = [
            { name: 'Track Again (Top)', inputId: 'stApp_trackAgain_trackingNumEntry', btnId: 'stApp_trackAgain_getTrack' },
            { name: 'Main Track (Center)', inputId: 'stApp_trackingNumber', btnId: 'stApp_btnTrack' }
        ];

        try {
            // 前置清理：檢查並關閉干擾彈窗
            const closeBtn = document.querySelector('button.close[data-dismiss="modal"]');
            if (closeBtn) {
                console.log('[UPS Web] 檢測到彈窗關閉按鈕，正在點擊...');
                closeBtn.click();
                await delay(300);
            }

            let inputElement = document.getElementById(targets[0].inputId) || document.getElementById(targets[1].inputId);

            if (!inputElement) {
                try {
                    const selector = `#${targets[0].inputId}, #${targets[1].inputId}`;
                    inputElement = await waitForElement(selector, document.body, 3000);
                } catch (e) {
                    console.error('[UPS Web] 未找到任何可用的輸入框。');
                    return;
                }
            }

            const activeTarget = targets.find(t => t.inputId === inputElement.id);
            if (!activeTarget) return;

            inputElement.focus();
            inputElement.value = '';
            inputElement.value = trackingNumber;
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
            inputElement.dispatchEvent(new Event('change', { bubbles: true }));
            inputElement.dispatchEvent(new Event('blur', { bubbles: true }));

            await delay(200);

            let btnElement = document.getElementById(activeTarget.btnId);
            if (!btnElement) {
                try {
                    btnElement = await waitForElement(`#${activeTarget.btnId}`, document.body, 2000);
                } catch (e) { /* Ignore */ }
            }

            if (btnElement) {
                btnElement.click();
                // 後置操作：等待並點擊「查看全部託運詳情」
                try {
                    const viewDetailsBtn = await waitForElement('#st_App_View_Details', document.body, 10000);
                    if (viewDetailsBtn) {
                        await delay(100);
                        viewDetailsBtn.click();
                    }
                } catch (e) { /* Ignore */ }
            }

        } catch (error) {
            console.error('[UPS Web] 執行出錯:', error);
        }
    }

    // --- 核心邏輯：IVP 模式 ---
    async function performIVPSearch(trackingNumber) {
        console.log(`[IVP] 執行查詢: ${trackingNumber}`);

        const closeButtons = document.querySelectorAll('div.cdk-overlay-pane li:has(em.fa-times)');
        for (const btn of closeButtons) {
            btn.click();
            await delay(100);
        }

        try {
            const hiddenContainer = document.querySelector('#mainContainer > app-tracking > div > div > div.container-fluid.d-none');
            if (hiddenContainer) {
                const toggleBtn = document.querySelector('#toggle-visibility > button');
                if (toggleBtn) toggleBtn.click();
                await delay(200);
            }

            const clearBtn = document.querySelector('div.action-buttons button[aria-label="Clear"]');
            if (clearBtn) {
                clearBtn.click();
                await delay(200);
            }

            const input = await waitForElement('input[id="Enter Tracking Number"]');
            input.value = trackingNumber;
            input.dispatchEvent(new Event('input', { bubbles: true }));

            const submitBtn = await waitForElement('div.action-buttons button[type="submit"]');
            if (submitBtn.disabled) await delay(200);

            if (!submitBtn.disabled) {
                submitBtn.click();
            } else {
                console.warn('[IVP] 提交按鈕仍處於禁用狀態。');
            }

        } catch (error) {
            console.error('[IVP] 執行出錯:', error);
        }
    }

    // --- 消息監聽 (Salesforce -> Receiver) ---
    window.addEventListener('message', async function(event) {
        if (event.origin !== ALLOWED_ORIGIN) return;

        const data = event.data;
        if (data?.type === 'CEC_SEARCH_REQUEST' && data.payload) {
            const { trackingNumber, timestamp } = data.payload;

            // 1. 時間戳檢查 (防止網絡重試包重複觸發)
            if (timestamp > lastProcessedTimestamp) {

                // 2. [全新邏輯] DOM 檢測：檢查頁面是否已經顯示了這個號碼
                const isAlreadyDisplayed = isTrackingNumberOnPage(trackingNumber);

                if (isAlreadyDisplayed) {
                    console.log(`[Receiver] 頁面已顯示號碼 ${trackingNumber}，跳過查詢。`);
                } else {
                    // 3. 執行查詢
                    if (IS_IVP) {
                        await performIVPSearch(trackingNumber);
                    } else if (IS_UPS_WEB) {
                        await performWebSearch(trackingNumber);
                    }
                }

                // 更新時間戳
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

    // --- F10 注入功能 (僅限 IVP 模式) ---
    if (IS_IVP) {
        window.addEventListener('keydown', function(e) {
            if (e.key === 'F10' || e.keyCode === 121) {
                e.preventDefault();
                e.stopPropagation();

                const trap = document.createElement('textarea');
                Object.assign(trap.style, {
                    position: 'fixed', top: '0', left: '0', opacity: '0', zIndex: '999999'
                });
                document.body.appendChild(trap);
                trap.focus();

                setTimeout(() => {
                    const data = trap.value.trim();
                    if (trap.parentNode) document.body.removeChild(trap);
                    if (data) performIVPSearch(data);
                }, 800);
            }
        });
    }

})();
