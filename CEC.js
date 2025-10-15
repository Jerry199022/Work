// ==UserScript==
// @name         CEC功能強化
// @namespace    CEC Enhanced
// @version      V49
// @description  快捷操作按鈕、自動指派、IVP快速查詢、聯繫人彈窗優化、按鈕警示色、賬戶檢測、組件屏蔽、設置菜單、自動IVP查詢、URL精準匹配、快捷按鈕可編輯、(Related Cases)數據提取與增強排序功能、關聯案件提取器、回覆case快捷按鈕、全局暫停/恢復功能。
// @author       Jerry Law
// @match        https://upsdrive.lightning.force.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/Jerry199022/Work/refs/heads/main/CEC.js
// @downloadURL  https://raw.githubusercontent.com/Jerry199022/Work/refs/heads/main/CEC.js

// ==/UserScript==
/*
V48 > 49
更新內容：
-優化回覆case框定位
-優化插入模版後輸入框內容定位（默認關閉）
-Close this Case（Auto）廢棄隱藏功能。恢復穩定。
-添加"I Want To..."自動化按鈕評論文本設置
*/

(function() {
    'use strict';

    // =================================================================================
    // SECTION: 全新日誌記錄器 (Logger)
    // =================================================================================

    /**
     * @description 一個專業的、可配置的日誌記錄器，用於提供結構化的腳本運行信息。
     */
    const Logger = {
        LogLevel: {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3,
            NONE: 4
        },
        currentLevel: 1, // 默認為 INFO 級別

        /**
         * @description 內部日誌處理函數。
         * @param {number} level - 日誌級別。
         * @param {string} levelStr - 日誌級別的字符串表示。
         * @param {string} module - 產生日誌的功能模塊名。
         * @param {string} message - 日誌消息。
         */
        _log(level, levelStr, module, message) {
            if (level >= this.currentLevel) {
                levelStr = levelStr.trim();
                console.log(`[${levelStr}] [CEC Enhanced] [${module}] ${message}`);
            }
        },

        debug(module, message) {
            this._log(this.LogLevel.DEBUG, 'DEBUG', module, message);
        },
        info(module, message) {
            this._log(this.LogLevel.INFO, 'INFO ', module, message);
        },
        warn(module, message) {
            this._log(this.LogLevel.WARN, 'WARN ', module, message);
        },
        error(module, message) {
            this._log(this.LogLevel.ERROR, 'ERROR', module, message);
        }
    };


    // =================================================================================
    // SECTION: 全局配置與狀態變量
    // =================================================================================

    /**
     * @description 存儲腳本所有功能的默認配置。
     */
    const DEFAULTS = {
        autoSwitchEnabled: true,
        autoAssignUser: '',
        sentinelCloseEnabled: true,
        blockIVPCard: false,
        autoIVPQueryEnabled: false,
        accountHighlightMode: 'pca',
        richTextEditorHeight: 500,
        caseDescriptionHeight: 160,
        caseHistoryHeight: 208,
        iwtAutoFillTexts: {
            reOpen: 'Reopen',
            closeCase: 'Close',
            documentContact: 'Call customer and explaim'
        },
        iWantToButtonStyles: {
            marginTop: '-7px',
            marginBottom: '5px',
            marginLeft: '0px',
            marginRight: '0px',
        },
        // [新增] 模板插入優化功能的默認配置
        postInsertionEnhancementsEnabled: false, // 模板插入後增強處理 (默認關閉)
        cursorPositionBrIndex: 5,               // 光標定位到第5個<br>標籤前
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
            subCategory: ["Claim Status / General Info"],
            role: ["Shipper"]
        }, {
            id: "btn-6",
            name: "落單",
            category: ["Pickup / Collection"],
            subCategory: ["New Pickup Scheduled"],
            role: ["Shipper"]
        }, {
            id: "btn-7",
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

    /**
     * @description 存儲性能相關的配置。
     */
    const PERF_CONFIG = {
        HEARTBEAT_INTERVAL_MS: 10000, // 10000ms: 心跳檢測間隔。用於捕獲由非標準事件觸發的URL變化，作為事件監聽器的補充。
        URL_CHANGE_DEBOUNCE_MS: 350, // 350ms: URL變化事件的防抖延遲。防止因URL在短時間內多次變化（如重定向）導致主邏輯重複執行。
    };

    // 全局狀態變量
    let isScriptPaused = GM_getValue('isScriptPaused', false);
    let lastUrl = '';
    let foundTrackingNumber = null;
    let ivpWindowHandle = null;
    let globalToastTimer = null;
    let globalScannerId = null; // [新增] 全局掃描器實例句柄，確保任何時候只有一個掃描器在運行
    const processedModals = new WeakSet();
    const processedCaseUrlsInSession = new Set();
    let injectedIWTButtons = {};
    let assignButtonObserver = null;
    let iwtModuleObserver = null;
    const fieldsInDesiredOrder = ['Link Contact', 'Editable', 'Contact Source', 'First Name', 'Last Name', 'Account Number', 'Email', 'Phone', 'Mobile Phone', 'Other Phone', 'Account Name'];


    // =================================================================================
    // SECTION: 核心工具函數 (Core Utilities)
    // =================================================================================

    /**
     * @description 檢查一個元素是否在DOM中可見。
     * @param {HTMLElement} el - 要檢查的元素。
     * @returns {boolean} 如果元素可見則返回 true。
     */
    function isElementVisible(el) {
        return el.offsetParent !== null;
    }

    /**
     * @description 遞歸地在根節點及其所有Shadow DOM中查找單個可見的元素。
     * @param {Node} root - 開始搜索的根節點。
     * @param {string} selector - CSS選擇器。
     * @returns {HTMLElement|null} 找到的第一個可見元素，或 null。
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
     * @description 遞歸地在根節點及其所有Shadow DOM中查找所有可見的元素。
     * @param {Node} root - 開始搜索的根節點。
     * @param {string} selector - CSS選擇器。
     * @returns {HTMLElement[]} 包含所有找到的可見元素的數組。
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
     * @description 使用輪詢的方式等待一個元素出現在DOM中。
     * @param {Node} root - 開始搜索的根節點。
     * @param {string} selector - CSS選擇器。
     * @param {number} timeout - 超時時間（毫秒）。
     * @returns {Promise<HTMLElement>} 解析為找到的元素。
     */
    function waitForElement(root, selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const intervalId = setInterval(() => {
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
            }, 500); // 300ms: 輪詢間隔，平衡性能與響應速度。
        });
    }

    /**
     * @description 創建一個防抖函數，在連續觸發後僅執行一次。
     * @param {Function} func - 需要防抖的函數。
     * @param {number} wait - 延遲執行的時間（毫秒）。
     * @returns {Function} 防抖後的函數。
     */
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    /**
     * @description 使用 MutationObserver 等待一個元素出現，比輪詢更高效。
     * @param {Node} rootNode - 觀察的根節點。
     * @param {string} selector - CSS選擇器。
     * @param {number} timeout - 超時時間（毫秒）。
     * @returns {Promise<HTMLElement>} 解析為找到的元素。
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
     * @description 模擬用戶在輸入框中輸入內容。
     * @param {HTMLInputElement|HTMLTextAreaElement} element - 目標輸入框元素。
     * @param {string} value - 要輸入的值。
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
     * @description 模擬鍵盤按鍵事件。
     * @param {HTMLElement} element - 觸發事件的目標元素。
     * @param {string} key - 按鍵的名稱 (e.g., 'Enter')。
     * @param {number} keyCode - 按鍵的 keyCode。
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
     * @description 等待元素的特定屬性變為目標值。
     * @param {HTMLElement} element - 要觀察的元素。
     * @param {string} attributeName - 屬性名。
     * @param {string} targetValue - 目標值。
     * @param {number} timeout - 超時時間（毫秒）。
     * @returns {Promise<void>} 當屬性匹配時解析。
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
     * @description 等待一個按鈕變為可點擊狀態（aria-disabled="false"）。
     * @param {string} selector - 按鈕的CSS選擇器。
     * @returns {Promise<HTMLElement>} 解析為可點擊的按鈕元素。
     */
    async function waitForButtonToBeEnabled(selector) {
        const button = await waitForElementWithObserver(document.body, selector, 5000); // 5000ms: 等待按鈕出現的超時。
        await waitForAttributeChange(button, 'aria-disabled', 'false', 5000); // 5000ms: 等待按鈕變為可用的超時。
        return button;
    }

    /**
     * @description 自動化選擇下拉框（Combobox）中的選項。
     * @param {HTMLElement} container - 包含下拉框的父容器。
     * @param {string} buttonSelector - 下拉框觸發按鈕的選擇器。
     * @param {string} optionValue - 要選擇的選項的 data-value 值。
     */
    async function selectComboboxOption(container, buttonSelector, optionValue) {
        const comboboxButton = await waitForElementWithObserver(container, buttonSelector, 5000); // 5000ms: 等待下拉框按鈕出現的超時。
        comboboxButton.click();
        await new Promise(resolve => setTimeout(resolve, 300)); // 300ms: 等待下拉菜單動畫完成，確保後續操作的元素可見。
        const optionSelector = `lightning-base-combobox-item[data-value="${optionValue}"]`;
        const optionElement = await waitForElementWithObserver(document.body, optionSelector, 5000); // 5000ms: 等待選項出現的超時。
        optionElement.click();
    }

    /**
     * @description 在指定的組件上顯示一個短暫的完成提示（Toast）。
     * @param {HTMLElement} componentElement - 顯示提示的目標組件。
     * @param {string} message - 提示消息。
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
        setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 300); // 300ms: 等待淡出動畫完成後再移除元素，避免視覺突兀。
        }, 2500); // 2500ms: 提示顯示的總時長。
    }

    /**
     * @description 在頁面中央顯示一個全局的提示消息。
     * @param {string} message - 提示消息。
     * @param {string} iconName - SLDS utility icon 的名稱 (e.g., 'check', 'pause')。
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
        globalToastTimer = setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300); // 300ms: 等待淡出動畫完成後再移除元素，避免視覺突兀。
        }, 2500); // 2500ms: 提示顯示的總時長。
    }


    // =================================================================================
    // SECTION: 樣式注入與UI創建 (Styles & UI)
    // =================================================================================

    /**
     * @description 向頁面注入腳本所需的全局自定義CSS樣式。
     */
    function injectGlobalCustomStyles() {
        const styleId = 'cec-global-custom-styles';
        if (document.getElementById(styleId)) return;

        const css = `
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
     * @description 根據用戶設置注入CSS以調整 "Related Cases" 列表的高度。
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
     * @description 根據用戶配置啟用或禁用組件屏蔽（Clean Mode）的CSS樣式。
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
     * @description 創建並向頁面注入腳本的設置菜單UI（HTML和CSS）。
     */
    /**
     * @description 創建並向頁面注入腳本的設置菜單UI（HTML和CSS）。
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
                            <!-- [位置調整] "窗口與流程" 板塊已從 "自動化" 標籤頁移動至此 -->
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
                                    <div class="cec-settings-option-main"><label for="autoIVPQueryToggle" class="cec-settings-label">進入Case頁面自動查詢IVP</label><label class="cec-settings-switch"><input type="checkbox" id="autoIVPQueryToggle"><span class="cec-settings-slider"></span></label></div>
                                </div>
                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main"><label for="autoSwitchToggle" class="cec-settings-label">點擊IVP按鈕自動切換窗口</label><label class="cec-settings-switch"><input type="checkbox" id="autoSwitchToggle"><span class="cec-settings-slider"></span></label></div>
                                </div>
                                <div class="cec-settings-option">
                                    <div class="cec-settings-option-main"><label for="blockIVPToggle" class="cec-settings-label">屏蔽原生IVP卡片自動加載</label><label class="cec-settings-switch"><input type="checkbox" id="blockIVPToggle"><span class="cec-settings-slider"></span></label></div>
                                </div>
                            </div>
                            <!-- [修改] 模板插入優化設置板塊 (已簡化) -->
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
                                    <label for="cursorPositionInput" class="cec-settings-label">光標定位於第 N 個換行符前</label>
                                    <input type="number" id="cursorPositionInput" class="cec-settings-input" style="width: 80px; margin-top: 4px;">
                                    <p class="cec-settings-description">默認為 4。此設置僅在“增強處理”啟用時生效。</p>
                                </div>
                            </div>
                            <hr class="cec-settings-divider">
                            <div class="cec-settings-section">
                                <h3 class="cec-settings-section-title">自動化評論文本</h3>
                                <p class="cec-settings-description" style="margin-top:-12px; margin-bottom:12px;">為 "I Want To..." 自動化按鈕設置評論內容，留空則不輸入任何文本。</p>
                                <div class="cec-settings-option-grid">
                                    <label for="reOpenCommentInput">Re-Open Case</label>
                                    <input type="text" id="reOpenCommentInput" class="cec-settings-input">
                                    <label for="closeCaseCommentInput">Close this Case</label>
                                    <input type="text" id="closeCaseCommentInput" class="cec-settings-input">
                                    <label for="docContactCommentInput">Document Customer Contact</label>
                                    <input type="text" id="docContactCommentInput" class="cec-settings-input">
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
                    </div>
                    <div id="cec-settings-toast" class="cec-settings-toast">設置已保存</div>
                </div>
            </div>
        `;

        const modalCSS = `
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
     * @description 打開設置菜單，並初始化所有UI元素的事件監聽器和數據綁定。
     */
    function openSettingsModal() {
        if (!document.getElementById('cec-settings-modal')) {
            createSettingsUI();
        }
        const modal = document.getElementById('cec-settings-modal');
        const content = modal.querySelector('.cec-settings-content');
        const toast = document.getElementById('cec-settings-toast');
        let toastTimer;

        const showToast = (message = '設置已保存') => {
            clearTimeout(toastTimer);
            toast.textContent = message;
            toast.classList.add('show');
            toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
        };

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

        const autoAssignUserInput = document.getElementById('autoAssignUserInput');
        autoAssignUserInput.value = GM_getValue('autoAssignUser', DEFAULTS.autoAssignUser);
        autoAssignUserInput.onchange = () => {
            const value = autoAssignUserInput.value.trim();
            GM_setValue('autoAssignUser', value);
            Logger.info('Settings.save', `[SUCCESS] - 設置已保存: autoAssignUser = ${value}`);
            showToast();
        };

        const autoIVPQueryToggle = document.getElementById('autoIVPQueryToggle');
        autoIVPQueryToggle.checked = GM_getValue('autoIVPQueryEnabled', DEFAULTS.autoIVPQueryEnabled);
        autoIVPQueryToggle.onchange = () => {
            const value = autoIVPQueryToggle.checked;
            GM_setValue('autoIVPQueryEnabled', value);
            Logger.info('Settings.save', `[SUCCESS] - 設置已保存: autoIVPQueryEnabled = ${value}`);
            showToast();
        };

        const autoSwitchToggle = document.getElementById('autoSwitchToggle');
        autoSwitchToggle.checked = GM_getValue('autoSwitchEnabled', DEFAULTS.autoSwitchEnabled);
        autoSwitchToggle.onchange = () => {
            const value = autoSwitchToggle.checked;
            GM_setValue('autoSwitchEnabled', value);
            Logger.info('Settings.save', `[SUCCESS] - 設置已保存: autoSwitchEnabled = ${value}`);
            showToast();
        };

        const blockIVPToggle = document.getElementById('blockIVPToggle');
        blockIVPToggle.checked = GM_getValue('blockIVPCard', DEFAULTS.blockIVPCard);
        blockIVPToggle.onchange = () => {
            const value = blockIVPToggle.checked;
            GM_setValue('blockIVPCard', value);
            Logger.info('Settings.save', `[SUCCESS] - 設置已保存: blockIVPCard = ${value}`);
            showToast();
            if (value) handleIVPCardBlocking();
        };

        const sentinelCloseToggle = document.getElementById('sentinelCloseToggle');
        sentinelCloseToggle.checked = GM_getValue('sentinelCloseEnabled', DEFAULTS.sentinelCloseEnabled);
        sentinelCloseToggle.onchange = () => {
            const value = sentinelCloseToggle.checked;
            GM_setValue('sentinelCloseEnabled', value);
            Logger.info('Settings.save', `[SUCCESS] - 設置已保存: sentinelCloseEnabled = ${value}`);
            showToast();
        };

        // [修正] 模板插入優化功能的設置邏輯 (已移除 visualOffsetToggle 相關代碼)
        const postInsertionEnhancementsToggle = document.getElementById('postInsertionEnhancementsToggle');
        postInsertionEnhancementsToggle.checked = GM_getValue('postInsertionEnhancementsEnabled', DEFAULTS.postInsertionEnhancementsEnabled);
        postInsertionEnhancementsToggle.onchange = () => {
            const value = postInsertionEnhancementsToggle.checked;
            GM_setValue('postInsertionEnhancementsEnabled', value);
            Logger.info('Settings.save', `[SUCCESS] - 設置已保存: postInsertionEnhancementsEnabled = ${value}`);
            showToast();
        };

        const cursorPositionInput = document.getElementById('cursorPositionInput');
        cursorPositionInput.value = GM_getValue('cursorPositionBrIndex', DEFAULTS.cursorPositionBrIndex);
        cursorPositionInput.onchange = () => {
            const value = parseInt(cursorPositionInput.value, 10);
            const finalValue = (value && value > 0) ? value : DEFAULTS.cursorPositionBrIndex;
            cursorPositionInput.value = finalValue;
            GM_setValue('cursorPositionBrIndex', finalValue);
            Logger.info('Settings.save', `[SUCCESS] - 設置已保存: cursorPositionBrIndex = ${finalValue}`);
            showToast();
        };

        const cleanModeToggle = document.getElementById('cleanModeToggle');
        const cleanModeCustomToggle = document.getElementById('cleanModeCustomToggle');
        const cleanModeCustomContainer = document.getElementById('cleanModeCustomContainer');
        const cleanModeList = document.getElementById('clean-mode-custom-list');
        const resetCleanModeButton = document.getElementById('resetCleanMode');
        const defaultConfig = DEFAULTS.cleanModeConfig.reduce((acc, item) => {
            acc[item.id] = item.enabled;
            return acc;
        }, {});
        let currentUserConfig = GM_getValue('cleanModeUserConfig', defaultConfig);

        const renderCleanModeList = () => {
            cleanModeList.innerHTML = '';
            DEFAULTS.cleanModeConfig.forEach(item => {
                const isChecked = currentUserConfig[item.id] || false;
                cleanModeList.insertAdjacentHTML('beforeend', `<label class="cec-settings-custom-item"><input type="checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}><span>${item.label}</span></label>`);
            });
        };

        cleanModeToggle.checked = GM_getValue('cleanModeEnabled', DEFAULTS.cleanModeEnabled);
        cleanModeToggle.onchange = () => {
            const value = cleanModeToggle.checked;
            GM_setValue('cleanModeEnabled', value);
            toggleCleanModeStyles();
            Logger.info('Settings.save', `[SUCCESS] - 設置已保存: cleanModeEnabled = ${value}`);
            showToast();
        };

        cleanModeCustomToggle.addEventListener('click', () => {
            cleanModeCustomContainer.classList.toggle('expanded');
        });

        cleanModeList.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                currentUserConfig[e.target.dataset.id] = e.target.checked;
                GM_setValue('cleanModeUserConfig', currentUserConfig);
                toggleCleanModeStyles();
                Logger.info('Settings.save', `[SUCCESS] - 設置已保存: cleanModeUserConfig updated for ${e.target.dataset.id}`);
                showToast();
            }
        });

        resetCleanModeButton.addEventListener('click', () => {
            if (confirm('您確定要將組件屏蔽列表恢復為默認設置嗎？')) {
                currentUserConfig = { ...defaultConfig
                };
                GM_setValue('cleanModeUserConfig', currentUserConfig);
                renderCleanModeList();
                toggleCleanModeStyles();
                Logger.info('Settings.reset', `[SUCCESS] - "組件屏蔽" 配置已恢復為默認值。`);
                showToast('組件屏蔽列表已恢復默認');
            }
        });

        renderCleanModeList();

        const highlightModeGroup = document.getElementById('accountHighlightModeGroup');
        const currentHighlightMode = GM_getValue('accountHighlightMode', 'pca');
        highlightModeGroup.querySelector(`input[value="${currentHighlightMode}"]`).checked = true;
        highlightModeGroup.addEventListener('change', (e) => {
            if (e.target.name === 'highlightMode') {
                const value = e.target.value;
                GM_setValue('accountHighlightMode', value);
                Logger.info('Settings.save', `[SUCCESS] - 設置已保存: accountHighlightMode = ${value}`);
                showToast();
            }
        });

        const caseHistoryInput = document.getElementById('caseHistoryHeightInput');
        caseHistoryInput.value = GM_getValue('caseHistoryHeight', DEFAULTS.caseHistoryHeight);
        caseHistoryInput.onchange = () => {
            const value = parseInt(caseHistoryInput.value) || DEFAULTS.caseHistoryHeight;
            GM_setValue('caseHistoryHeight', value);
            injectStyleOverrides();
            Logger.info('Settings.save', `[SUCCESS] - 設置已保存: caseHistoryHeight = ${value}`);
            showToast();
        };

        const caseDescInput = document.getElementById('caseDescriptionHeightInput');
        caseDescInput.value = GM_getValue('caseDescriptionHeight', DEFAULTS.caseDescriptionHeight);
        caseDescInput.onchange = () => {
            const value = parseInt(caseDescInput.value) || DEFAULTS.caseDescriptionHeight;
            GM_setValue('caseDescriptionHeight', value);
            Logger.info('Settings.save', `[SUCCESS] - 設置已保存: caseDescriptionHeight = ${value}`);
            showToast();
        };

        const richTextInput = document.getElementById('richTextEditorHeightInput');
        richTextInput.value = GM_getValue('richTextEditorHeight', DEFAULTS.richTextEditorHeight);
        richTextInput.onchange = () => {
            const value = parseInt(richTextInput.value) || DEFAULTS.richTextEditorHeight;
            GM_setValue('richTextEditorHeight', value);
            Logger.info('Settings.save', `[SUCCESS] - 設置已保存: richTextEditorHeight = ${value}`);
            showToast();
        };

        const autoFillTexts = GM_getValue('iwtAutoFillTexts', DEFAULTS.iwtAutoFillTexts);

        const reOpenInput = document.getElementById('reOpenCommentInput');
        const closeCaseInput = document.getElementById('closeCaseCommentInput');
        const docContactInput = document.getElementById('docContactCommentInput');

        reOpenInput.value = autoFillTexts.reOpen;
        closeCaseInput.value = autoFillTexts.closeCase;
        docContactInput.value = autoFillTexts.documentContact;

        const createTextSaveHandler = (key, inputElement) => {
            return () => {
                const currentSettings = GM_getValue('iwtAutoFillTexts', DEFAULTS.iwtAutoFillTexts);
                currentSettings[key] = inputElement.value;
                GM_setValue('iwtAutoFillTexts', currentSettings);
                Logger.info('Settings.save', `[SUCCESS] - 設置已保存: iwtAutoFillTexts.${key} = ${currentSettings[key]}`);
                showToast();
            };
        };

        reOpenInput.onchange = createTextSaveHandler('reOpen', reOpenInput);
        closeCaseInput.onchange = createTextSaveHandler('closeCase', closeCaseInput);
        docContactInput.onchange = createTextSaveHandler('documentContact', docContactInput);

        const buttonList = document.getElementById('button-config-list');
        let currentButtons = GM_getValue('actionButtons', JSON.parse(JSON.stringify(DEFAULTS.actionButtons)));
        let draggedItem = null;

        const saveButtons = () => {
            GM_setValue('actionButtons', currentButtons);
            Logger.info('Settings.save', `[SUCCESS] - 設置已保存: actionButtons updated`);
            showToast();
        };

        const renderButtonList = () => {
            buttonList.innerHTML = '';
            currentButtons.forEach((button) => {
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
                listItem.querySelector('.cec-settings-button-edit').addEventListener('click', () => openButtonEditModal(button, renderButtonList, saveButtons));
                listItem.querySelector('.cec-settings-button-delete').addEventListener('click', () => {
                    if (confirm(`確定要刪除按鈕 "${button.name}" 嗎？`)) {
                        currentButtons = currentButtons.filter(b => b.id !== button.id);
                        saveButtons();
                        renderButtonList();
                    }
                });
            });
        };

        let lastIndicatorElement = null;
        buttonList.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('cec-settings-button-drag-handle')) {
                draggedItem = e.target.closest('.cec-settings-button-item');
                setTimeout(() => draggedItem.classList.add('dragging'), 0);
            }
        });

        buttonList.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!draggedItem) return;
            const afterElement = getDragAfterElement(buttonList, e.clientY);
            if (lastIndicatorElement) lastIndicatorElement.classList.remove('cec-settings-drop-indicator');
            if (afterElement) {
                afterElement.classList.add('cec-settings-drop-indicator');
                lastIndicatorElement = afterElement;
            } else {
                lastIndicatorElement = null;
            }
        });

        buttonList.addEventListener('dragend', () => {
            if (draggedItem) draggedItem.classList.remove('dragging');
            if (lastIndicatorElement) lastIndicatorElement.classList.remove('cec-settings-drop-indicator');
            draggedItem = null;
            lastIndicatorElement = null;
        });

        buttonList.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!draggedItem) return;
            const afterElement = getDragAfterElement(buttonList, e.clientY);
            if (afterElement) {
                buttonList.insertBefore(draggedItem, afterElement);
            } else {
                buttonList.appendChild(draggedItem);
            }
            const newOrder = Array.from(buttonList.children).map(item => item.dataset.id);
            currentButtons.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
            saveButtons();
        });

        function getDragAfterElement(container, y) {
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
        }

        document.getElementById('add-new-button').addEventListener('click', () => {
            const newButton = {
                id: `btn-${Date.now()}`,
                name: "NEW",
                category: [""],
                subCategory: [""],
                role: [""]
            };
            currentButtons.push(newButton);
            saveButtons();
            renderButtonList();
            openButtonEditModal(newButton, renderButtonList, saveButtons);
        });

        document.getElementById('reset-buttons').addEventListener('click', () => {
            if (confirm('確定要恢復為默認的快捷按鈕配置嗎？')) {
                currentButtons = JSON.parse(JSON.stringify(DEFAULTS.actionButtons));
                saveButtons();
                renderButtonList();
                Logger.info('Settings.reset', `[SUCCESS] - "快捷按鈕" 配置已恢復為默認值。`);
            }
        });

        renderButtonList();

        modal.style.display = 'flex';
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            content.style.transform = 'scale(1)';
        });

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

        document.getElementById('cec-settings-close').addEventListener('click', closeSettingsModal);
    }

    /**
     * @description 打開用於編輯單個快捷按鈕配置的彈窗。
     * @param {object} button - 要編輯的按鈕配置對象。
     * @param {Function} onSaveCallback - 保存後的回調函數（用於刷新列表）。
     * @param {Function} saveFn - 執行保存操作的函數。
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

        // 監聽輸入框內容變化，同步到臨時數據對象
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

        // [FIXED] 監聽點擊事件，處理選項的添加與刪除
        editModal.addEventListener('click', (e) => {
            // 處理添加新選項
            if (e.target.classList.contains('cec-settings-add-option')) {
                e.preventDefault();
                const wrapper = e.target.closest('.input-wrapper');
                const field = wrapper.dataset.wrapperFor;

                // 確保臨時數據中的對應字段是數組
                if (!Array.isArray(tempButton[field])) {
                    tempButton[field] = [];
                }
                const newIndex = tempButton[field].length;
                tempButton[field].push(''); // 在臨時數據中添加一個空字符串

                // 在DOM中創建並插入新的輸入行
                const newRow = document.createElement('div');
                newRow.className = 'input-row';
                newRow.innerHTML = `<input type="text" data-field="${field}" data-index="${newIndex}" value=""><button class="cec-settings-remove-option">-</button>`;
                wrapper.insertBefore(newRow, e.target);
            }

            // 處理刪除選項
            if (e.target.classList.contains('cec-settings-remove-option')) {
                e.preventDefault();
                const rowToRemove = e.target.closest('.input-row');
                const input = rowToRemove.querySelector('input');
                const field = input.dataset.field;
                const indexToRemove = parseInt(input.dataset.index, 10);

                // 從臨時數據中移除對應項
                if (Array.isArray(tempButton[field])) {
                    tempButton[field].splice(indexToRemove, 1);
                }

                // 從DOM中移除該行
                const wrapper = rowToRemove.parentElement;
                rowToRemove.remove();

                // 嚴謹性校驗：重新整理後續兄弟節點的 data-index 屬性，確保數據一致性
                const remainingRows = wrapper.querySelectorAll('.input-row');
                remainingRows.forEach((row, newIndex) => {
                    // 只更新被刪除項之後的元素索引
                    if (newIndex >= indexToRemove) {
                         row.querySelector('input').dataset.index = newIndex;
                    }
                });
            }
        });

        // 保存按鈕邏輯
        editModal.querySelector('#save-edit').addEventListener('click', () => {
            // 過濾掉所有字段中的空字符串選項
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

        // 取消按鈕邏輯
        editModal.querySelector('#cancel-edit').addEventListener('click', () => {
            editModal.remove();
        });
    }

    /**
     * @description 關閉設置菜單。
     */
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

    /**
     * @description 異步獲取並記錄富文本編輯器中的所有可用模板選項。
     * @returns {Promise<string[]|null>} 解析為包含模板標題的數組，或在失敗時返回 null。
     */
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

    /**
     * @description 處理編輯器加載完畢後的模板快捷按鈕注入流程。
     *              此函數被設計為可複用，由 'Compose' 和 'Reply All' 的點擊事件觸發。
     */
    async function handleEditorReadyForTemplateButtons() {
        try {
            // 1. 等待富文本編輯器核心組件加載完成
            const editor = await waitForElementWithObserver(document.body, ".slds-rich-text-editor .tox-tinymce", 15000);

            // 2. 根據用戶設置調整編輯器高度
            const desiredHeight = GM_getValue("richTextEditorHeight", DEFAULTS.richTextEditorHeight) + "px";
            if (editor.style.height !== desiredHeight) {
                editor.style.height = desiredHeight;
                Logger.info('UI.heightAdjust', `[SUCCESS] - 回覆編輯器高度已根據設置調整為 ${desiredHeight}。`);
            }

            // 3. 異步獲取所有可用的模板選項
            const templates = await getAndLogTemplateOptions();

            // 4. 如果成功獲取到模板，則執行注入
            if (templates && templates.length > 1) {
                // 尋找注入位置的錨點（'Popout'按鈕）
                const anchorIcon = findElementInShadows(document.body, 'lightning-icon[icon-name="utility:new_window"]');
                const anchorLi = anchorIcon ? anchorIcon.closest('li.cuf-attachmentsItem') : null;

                if (anchorLi) {
                    injectTemplateShortcutButtons(anchorLi, templates);
                } else {
                    Logger.warn('UI.templateShortcuts', `[FAIL] - 未能找到用於注入快捷按鈕的錨點元素 ("Popout" 按鈕)。`);
                }
            }
        } catch (error) {
            Logger.warn('UI.templateShortcuts', `[FAIL] - 初始化模板快捷按鈕時出錯: ${error.message}`);
        }
    }

    /**
 * @description 根據模板標題自動點擊對應的模板選項。
 *              [增強版 v3.5 - 結構化定位] 定位光標，滾動視圖，並為模板區域附加粘貼為純文本（保留換行）的功能。
 *              此版本移除了對特定問候語文本的依賴，改為依賴模板的HTML結構進行定位，更加健壯。
 * @param {string} templateTitle - 要點擊的模板的完整標題。
 * @returns {Promise<void>}
 */
async function clickTemplateOptionByTitle(templateTitle) {
    // [修改] 視覺偏移量現在從常量變為變量
    let VIEW_ADJUSTMENT_OFFSET_PX = -80;

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const BUTTON_ICON_SELECTOR = 'lightning-icon[icon-name="utility:insert_template"]';
    const MENU_ITEM_SELECTOR = `li.uiMenuItem a[role="menuitem"][title="${templateTitle}"]`;
    const EDITOR_IFRAME_SELECTOR = 'iframe.tox-edit-area__iframe';
    const TIMEOUT = 5000;
    let clickableButton = null;

    try {
        // --- 階段一 & 二: 模板插入前的光標預定位邏輯 (保持不變) ---
        try {
            const iframe = findElementInShadows(document.body, EDITOR_IFRAME_SELECTOR);
            if (iframe && iframe.contentDocument) {
                iframe.contentWindow.focus();
                const editorDoc = iframe.contentDocument;
                const editorBody = editorDoc.body;
                if (editorBody && editorBody.children && editorBody.children.length >= 3) {
                    const targetElement = editorBody.children[2];
                    if (targetElement && ['P', 'DIV', 'TABLE', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(targetElement.tagName)) {
                        const selection = iframe.contentWindow.getSelection();
                        const range = editorDoc.createRange();
                        range.setStart(targetElement, 0);
                        range.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        Logger.info('UI.templateCursor', `[SUCCESS] - 光標已成功移動到編輯器第三個元素 (${targetElement.tagName}) 的起始位置。`);
                    }
                }
            }
        } catch (cursorError) {
            Logger.error('UI.templateCursor', `[FAIL] - 嘗試移動光標時發生錯誤: ${cursorError.message}`);
        }

        await delay(100);

        // --- 階段三: 模板菜單的自動化操作 (保持不變) ---
        const iconElement = await waitForElementWithObserver(document.body, BUTTON_ICON_SELECTOR, TIMEOUT);
        clickableButton = iconElement.closest('a[role="button"]');
        if (!clickableButton) throw new Error('未能找到 "插入模板" 按鈕。');

        if (clickableButton.getAttribute('aria-expanded') !== 'true') {
            clickableButton.click();
            await waitForAttributeChange(clickableButton, 'aria-expanded', 'true', TIMEOUT);
        }

        const menuId = clickableButton.getAttribute('aria-controls');
        if (!menuId) throw new Error('缺少 aria-controls 屬性。');

        const menuContainer = await waitForElementWithObserver(document.body, `[id="${menuId}"]`, TIMEOUT);
        const targetOption = findElementInShadows(menuContainer, MENU_ITEM_SELECTOR);

        if (targetOption) {
            targetOption.click();

            // =================================================================================
            // [修改] 階段四: 模板插入後的增強處理 (V3.6 - 完全可配置版)
            // =================================================================================
            setTimeout(() => {
                // [新增] 總開關：只有在用戶啟用時才執行所有增強處理
                if (!GM_getValue('postInsertionEnhancementsEnabled', DEFAULTS.postInsertionEnhancementsEnabled)) {
                    Logger.info('UI.cursorPosition', '[SKIP] - 模板插入後增強處理功能未啟用。');
                    return;
                }

                try {
                    const iframe = findElementInShadows(document.body, EDITOR_IFRAME_SELECTOR);
                    if (!iframe || !iframe.contentDocument || !iframe.contentDocument.body) {
                        throw new Error('無法找到富文本編輯器 iframe。');
                    }
                    const iframeWindow = iframe.contentWindow;
                    const iframeDocument = iframe.contentDocument;
                    const editorBody = iframeDocument.body;

                    const firstParagraph = editorBody.querySelector('p');
                    const targetContainerSpan = firstParagraph ? firstParagraph.querySelector('span') : null;

                    if (!targetContainerSpan || targetContainerSpan.getElementsByTagName('br').length === 0) {
                        throw new Error('在編輯器中未找到預期的模板結構 (包含<br>的span)。');
                    }

                    if (!targetContainerSpan.dataset.pasteHandlerAttached) {
                        targetContainerSpan.addEventListener('paste', (event) => {
                            event.preventDefault();
                            const text = (event.clipboardData || iframeWindow.clipboardData).getData('text/plain');
                            const selection = iframeWindow.getSelection();
                            if (!selection.rangeCount) return;

                            const range = selection.getRangeAt(0);
                            range.deleteContents();

                            const fragment = iframeDocument.createDocumentFragment();
                            const lines = text.split('\n');

                            lines.forEach((line, index) => {
                                fragment.appendChild(iframeDocument.createTextNode(line));
                                if (index < lines.length - 1) {
                                    fragment.appendChild(iframeDocument.createElement('br'));
                                }
                            });

                            range.insertNode(fragment);
                            range.collapse(false);
                            selection.removeAllRanges();
                            selection.addRange(range);
                        });
                        targetContainerSpan.dataset.pasteHandlerAttached = 'true';
                        Logger.info('UI.pasteHandler', '[SUCCESS] - 已成功為模板區域附加「粘貼為純文本(保留換行)」處理器。');
                    }

                    // [修改] 從設置中讀取光標定位參數
                    const userBrPosition = GM_getValue('cursorPositionBrIndex', DEFAULTS.cursorPositionBrIndex);
                    const brIndex = userBrPosition - 1; // 轉換為0基索引

                    const allBrTags = targetContainerSpan.getElementsByTagName('br');
                    let targetPositionNode = null;

                    if (allBrTags.length > brIndex && brIndex >= 0) {
                        targetPositionNode = allBrTags[brIndex];
                    } else {
                        throw new Error(`模板結構不符合預期，未能找到用於定位光標的第 ${userBrPosition} 個<br>標籤。`);
                    }

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

                        // [新增] 條件化視覺偏移：只有在用戶啟用時才執行
                        if (GM_getValue('visualOffsetEnabled', DEFAULTS.visualOffsetEnabled)) {
                            iframeWindow.scrollBy(0, VIEW_ADJUSTMENT_OFFSET_PX);
                        }
                    }

                    iframeWindow.focus();
                    Logger.info('UI.cursorPosition', `[SUCCESS] - 模板插入後，光標已成功定位到第 ${userBrPosition} 個換行符前。`);

                } catch (error) {
                    Logger.warn('UI.cursorPosition', `[SKIP] - 嘗試定位光標或附加事件時失敗: ${error.message}`);
                }
            }, 100);
            // =================================================================================
            // [結束] 修改邏輯結束
            // =================================================================================

        } else {
            throw new Error(`在菜單中未找到標題為 "${templateTitle}" 的選項。`);
        }
    } catch (error) {
        Logger.error('UI.templateShortcuts', `[FAIL] - 執行模板插入時出錯: ${error.message}`);
        if (clickableButton && clickableButton.getAttribute('aria-expanded') === 'true') {
            clickableButton.click();
        }
        throw error;
    }
}

    /**
     * @description 根據模板列表，在指定位置注入快捷按鈕。
     *              [功能增強版] 注入成功後，自動將郵件框架定位到窗口底部，並支持偏移量調整。
     * @param {HTMLElement} anchorLiElement - 作為定位錨點的 "Popout" 按鈕所在的 <li> 元素。
     * @param {string[]} templates - 從菜單讀取到的完整模板標題列表。
     */
    function injectTemplateShortcutButtons(anchorLiElement, templates) {
        // =================================================================================
        // [新增] 在此處調整您期望的底部偏移量（單位：像素）
        // 正數 = 留出更多底部空間 (向下滾動更多)
        // 負數 = 向上回滾，隱藏部分底部
        // 0 = 緊貼底部 (默認)
        const BOTTOM_OFFSET_PIXELS = 50;
        // =================================================================================

        const parentList = anchorLiElement.parentElement;
        if (!parentList || parentList.dataset.shortcutsInjected === 'true') {
            return;
        }

        anchorLiElement.style.borderRight = '1px solid #dddbda';
        anchorLiElement.style.paddingRight = '0px';

        const templatesToShow = templates.slice(1, 6);
        if (templatesToShow.length === 0) {
            repositionComposerToBottom(BOTTOM_OFFSET_PIXELS);
            return;
        }

        templatesToShow.reverse().forEach((templateTitle, index) => {
            const newLi = anchorLiElement.cloneNode(true);
            newLi.style.borderRight = 'none';
            newLi.style.paddingRight = '0';

            const button = newLi.querySelector('button');
            button.classList.add('cec-template-shortcut-button');
            button.innerHTML = '';
            button.textContent = templateTitle.substring(0, 10);
            button.title = `Insert Template: ${templateTitle}`;

            const isFirstButton = (index === templatesToShow.length - 1);
            const marginLeftValue = isFirstButton ? '12px' : '5px';

            Object.assign(button.style, {
                marginLeft: marginLeftValue,
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
                clickTemplateOptionByTitle(templateTitle);
            });

            parentList.insertBefore(newLi, anchorLiElement.nextSibling);
        });

        parentList.dataset.shortcutsInjected = 'true';
        Logger.info('UI.templateShortcuts', `[SUCCESS] - ${templatesToShow.length} 個回覆模板快捷按鈕注入成功。`);

        setTimeout(() => repositionComposerToBottom(BOTTOM_OFFSET_PIXELS), 100);
    }

    /**
     * @description [可配置偏移量版] 查找並將組件滾動到視口底部，並應用一個額外的偏移量。
     * @param {number} [offset=0] - 滾動完成後的額外垂直偏移量（像素）。
     */
    function repositionComposerToBottom(offset = 0) {
        const composerContainer = findElementInShadows(document.body, 'flexipage-component2[data-component-id="flexipage_tabset7"]');

        if (composerContainer && composerContainer.dataset.cecScrolled !== 'true') {
            try {
                // 步驟 1: 瞬移到視口底部
                composerContainer.scrollIntoView({
                    block: 'end',
                    inline: 'nearest'
                });

                // 步驟 2: [新增] 應用額外的偏移量
                if (offset !== 0) {
                    window.scrollBy(0, offset);
                }

                composerContainer.dataset.cecScrolled = 'true';
                Logger.info('UI.composerPosition', `[SUCCESS] - 回覆郵件框架已滾動至窗口底部 (額外偏移量: ${offset}px)。`);
            } catch (error) {
                Logger.error('UI.composerPosition', `[FAIL] - 嘗試滾動郵件框架時出錯: ${error.message}`);
            }
        }
    }

    /**
     * @description 從頁面中提取追踪號碼，並觸發自動IVP查詢（如果已啟用）。
     *              [v45.6 精簡日誌版] 使用激進查找模式，並保持控制台輸出簡潔。
     */
    async function extractTrackingNumberAndTriggerIVP() {
        const trackingRegex = /(1Z[A-Z0-9]{16})/;
        const selector = 'td[data-label="IDENTIFIER VALUE"]';

        // 保留的日誌：標記功能開始執行
        Logger.info('IVP.autoQuery', `[START] - 開始查找追踪號...`);

        const pollForElementAggressively = (timeout = 15000) => {
            return new Promise((resolve, reject) => {
                const startTime = Date.now();
                const intervalId = setInterval(() => {
                    const el = findElementInShadows_Aggressive(document.body, selector);
                    if (el) {
                        clearInterval(intervalId);
                        resolve(el);
                        return;
                    }
                    if (Date.now() - startTime > timeout) {
                        clearInterval(intervalId);
                        reject(new Error(`Timeout waiting for selector (aggressive mode): ${selector}`));
                    }
                }, 300);
            });
        };

        try {
            const element = await pollForElementAggressively();
            const trackingValue = element.dataset.cellValue;

            if (trackingValue) {
                const match = trackingValue.trim().match(trackingRegex);
                if (match) {
                    foundTrackingNumber = match[0];
                    // 保留的日誌：標記功能成功完成
                    Logger.info('IVP.autoQuery', `[SUCCESS] - 成功匹配並存儲追踪號: ${foundTrackingNumber}`);
                    autoQueryIVPOnLoad();
                } else {
                    // 失敗情況的日誌仍然保留，用於問題排查
                    Logger.warn('IVP.autoQuery', `[FAIL] - 獲取的值 "${trackingValue}" 不符合追踪號格式。`);
                }
            } else {
                Logger.warn('IVP.autoQuery', `[FAIL] - 找到的目標元素缺少 'data-cell-value' 屬性。`);
            }
        } catch (error) {
            // 查找超時的日誌也保留，因為這是功能未執行的關鍵信息
            Logger.warn('IVP.autoQuery', `[SKIP] - 等待追踪號元素超時或失敗，自動查詢中止。`);
        }
    }

    /**
     * @description 初始化對 "I Want To..." 組件的監控，以便在組件出現或刷新時注入自定義按鈕。
     */
    function initIWantToModuleWatcher() {
        const ANCHOR_SELECTOR = 'c-cec-i-want-to-container lightning-layout.slds-var-p-bottom_small';
        let initialInjectionDone = false;
        waitForElementWithObserver(document.body, ANCHOR_SELECTOR, 20000) // 20000ms: 等待 "I Want To" 組件出現的超時。
            .then(anchorElement => {
                if (anchorElement.dataset.customButtonsInjected !== 'true') {
                    injectIWantToButtons(anchorElement);
                    initialInjectionDone = true;
                }
            })
            .catch(() => {
                Logger.warn('IWT.init', `[FAIL] - 未找到 "I Want To..." 組件容器，自動化按鈕未注入。`);
            });
        const checkAndReInject = () => {
            if (isScriptPaused) return;
            if (!initialInjectionDone) return;
            const anchorElement = findElementInShadows(document.body, ANCHOR_SELECTOR);
            if (anchorElement && anchorElement.dataset.customButtonsInjected !== 'true') {
                injectIWantToButtons(anchorElement);
            }
        };
        iwtModuleObserver = new MutationObserver(debounce(checkAndReInject, 350)); // 100ms: 防抖延遲，處理組件快速刷新的情況，避免性能問題。
        iwtModuleObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    async function handleStageTwoReOpen(comment) {
    const reOpenCaseComponent = await waitForElementWithObserver(document.body, 'c-cec-re-open-case', 5000);
    await new Promise(resolve => setTimeout(resolve, 300));
    if (comment) {
        const commentBox = await waitForElementWithObserver(reOpenCaseComponent, 'textarea[name="commentField"]', 5000);
        simulateTyping(commentBox, comment);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    const finalSubmitButton = await waitForElementWithObserver(reOpenCaseComponent, '.slds-card__footer button.slds-button_brand', 5000);
    finalSubmitButton.click();
    showCompletionToast(reOpenCaseComponent, 'Re-Open Case: 操作成功！請等待網頁更新！');
}
    /**
     * @description 處理 "Close this Case" 自動化流程的第二階段。
     * @param {string} comment - 要填寫的評論。
     */
    async function handleStageTwoCloseCase(comment) {
    const closeCaseComponent = await waitForElementWithObserver(document.body, 'c-cec-close-case', 5000);
    await new Promise(resolve => setTimeout(resolve, 300));
    await selectComboboxOption(closeCaseComponent, 'button[aria-label="Case Sub Status"]', 'Request Completed');
    if (comment) {
        const commentBox = await waitForElementWithObserver(closeCaseComponent, 'textarea.slds-textarea', 5000);
        simulateTyping(commentBox, comment);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    const finalSubmitButton = await waitForElementWithObserver(closeCaseComponent, '.slds-card__footer button.slds-button_brand', 5000);
    finalSubmitButton.click();
    showCompletionToast(closeCaseComponent, 'Close Case: 操作成功！請等待網頁更新！');
}

    /**
     * @description 處理 "Document Customer Contact" 自動化流程的第二階段。
     */
    async function handleStageTwoDocumentContact(comment) {
        const docContactComponent = await waitForElementWithObserver(document.body, 'c-cec-document-customer-contact', 5000);
        await new Promise(resolve => setTimeout(resolve, 300));
        const radioButtonSelector = 'input[value="Spoke with customer"]';
        const radioButton = await waitForElementWithObserver(docContactComponent, radioButtonSelector, 5000);
        // 在點擊前加入短暫延時，確保事件監聽器已激活，這是穩定性的關鍵
        await new Promise(resolve => setTimeout(resolve, 100));
        radioButton.click();
        if (comment) {
            try {
                const commentBox = await waitForElementWithObserver(docContactComponent, 'textarea.slds-textarea', 5000);
                simulateTyping(commentBox, comment);
            } catch (error) {
            }
        }
        await new Promise(resolve => setTimeout(resolve, 500));
        const finalSubmitButton = await waitForElementWithObserver(docContactComponent, '.slds-card__footer button.slds-button_brand', 5000);
        finalSubmitButton.click();
        showCompletionToast(docContactComponent, 'Document Contact: 操作成功！請等待網頁更新！');
    }

    /**
     * @description 執行一個完整的 "I Want To..." 自動化流程，包括搜索、點擊和處理第二階段。
     * @param {object} config - 流程配置對象。
     * @param {string} config.searchText - 要在搜索框中輸入的文本。
     * @param {Function} [config.stageTwoHandler] - 處理第二階段的函數。
     * @param {string} [config.finalComment] - 傳遞給第二階段處理函數的評論。
     */
    async function automateIWantToAction(config) {
        const {
            searchText,
            stageTwoHandler,
            finalComment
        } = config;
        Logger.info('IWT.automateAction', `[START] - 啟動自動化流程: "${searchText}"。`);
        try {
            const searchInput = await waitForElementWithObserver(document.body, 'c-ceclookup input.slds-combobox__input', 5000); // 5000ms: 等待搜索框出現的超時。
            const dropdownTrigger = searchInput.closest('.slds-dropdown-trigger');
            if (!dropdownTrigger) throw new Error('無法找到下拉列表的觸發容器 .slds-dropdown-trigger');
            searchInput.focus();
            simulateTyping(searchInput, searchText);
            await waitForAttributeChange(dropdownTrigger, 'aria-expanded', 'true', 5000); // 5000ms: 等待搜索結果下拉框展開的超時。
            await new Promise(resolve => setTimeout(resolve, 200)); // 200ms: 等待搜索結果加載的延遲。
            simulateKeyEvent(searchInput, 'ArrowDown', 40);
            await new Promise(resolve => setTimeout(resolve, 100)); // 100ms: 模擬按鍵後的延遲。
            simulateKeyEvent(searchInput, 'Enter', 13);
            const firstSubmitButton = await waitForButtonToBeEnabled('lightning-button.submit_button button');
            firstSubmitButton.click();
            if (stageTwoHandler && typeof stageTwoHandler === 'function') {
                await stageTwoHandler(finalComment);
                Logger.info('IWT.automateAction', `[SUCCESS] - 自動化流程: "${searchText}" 已成功完成。`);
            }
        } catch (error) {
            Logger.error('IWT.automateAction', `[FAIL] - 流程 "${searchText}" 在 "第一階段" 階段失敗: ${error.message}`);
        }
    }

    /**
     * @description 向 "I Want To..." 組件下方注入自定義的自動化操作按鈕。
     * @param {HTMLElement} anchorElement - 用於定位的錨點元素。
     */
    function injectIWantToButtons(anchorElement) {
        if (anchorElement.dataset.customButtonsInjected === 'true') {
            return;
        }
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'slds-grid slds-wrap';
        const styles = GM_getValue('iWantToButtonStyles', DEFAULTS.iWantToButtonStyles);
        Object.assign(buttonContainer.style, styles);

        // [核心修改] 從存儲中讀取用戶自定義的評論文本
        const autoFillTexts = GM_getValue('iwtAutoFillTexts', DEFAULTS.iwtAutoFillTexts);

        const buttonConfigs = [{
            name: 'Re-Open Case (Auto)',
            title: '自動執行 "Re-Open Case"',
            action: () => automateIWantToAction({
                searchText: 'Re-Open Case',
                stageTwoHandler: handleStageTwoReOpen,
                finalComment: autoFillTexts.reOpen // 使用配置值
            })
        }, {
            name: 'Close this Case (Auto)',
            title: '自動執行 "Close this Case"',
            action: () => automateIWantToAction({
                searchText: 'Close this Case',
                stageTwoHandler: handleStageTwoCloseCase,
                finalComment: autoFillTexts.closeCase // 使用配置值
            })
        }, {
            name: 'Document Customer Contact (Auto)',
            title: '自動執行 "Document Customer Contact"',
            action: () => automateIWantToAction({
                searchText: 'Document Customer Contact',
                stageTwoHandler: handleStageTwoDocumentContact,
                finalComment: autoFillTexts.documentContact // 使用配置值
            })
        }];
        buttonConfigs.forEach(config => {
            const layoutItem = document.createElement('div');
            layoutItem.className = 'slds-var-p-right_xx-small slds-size_4-of-12';
            const button = document.createElement('button');
            button.textContent = config.name;
            button.title = config.title;
            button.className = 'slds-button slds-button_stretch cec-iwt-button-override';
            button.addEventListener('click', config.action);
            layoutItem.appendChild(button);
            buttonContainer.appendChild(layoutItem);
            injectedIWTButtons[config.name] = button;
        });
        anchorElement.insertAdjacentElement('afterend', buttonContainer);
        anchorElement.dataset.customButtonsInjected = 'true';
        Logger.info('IWT.injectButtons', `[SUCCESS] - "I Want To..." 自動化按鈕注入成功。`);
        initAssignButtonMonitor();
    }

    /**
     * @description 根據 "Assign Case to Me" 按鈕的狀態，更新自定義 "I Want To..." 按鈕的禁用狀態。
     * @param {boolean} isAssignButtonDisabled - "Assign Case to Me" 按鈕是否被禁用。
     */
    function updateIWTButtonStates(isAssignButtonDisabled) {
        const buttonsToUpdate = [injectedIWTButtons['Close this Case (Auto)'], injectedIWTButtons['Document Customer Contact (Auto)']];
        buttonsToUpdate.forEach(button => {
            if (button) {
                button.disabled = isAssignButtonDisabled;
            }
        });
        const state = isAssignButtonDisabled ? '禁用' : '啟用';
        Logger.info('IWT.buttonLinkage', `[UPDATE] - 聯動狀態更新，自動化按鈕已設置為 ${state} 狀態。`);
    }

    /**
     * @description 初始化對 "Assign Case to Me" 按鈕的狀態監控，以實現與自定義按鈕的狀態聯動。
     */
    async function initAssignButtonMonitor() {
        const ASSIGN_BUTTON_SELECTOR = 'button[title="Assign Case to Me"]';
        try {
            const assignButton = await waitForElementWithObserver(document.body, ASSIGN_BUTTON_SELECTOR, 20000); // 20000ms: 等待指派按鈕出現的超時。
            const initialStateDisabled = assignButton.disabled || assignButton.getAttribute('aria-disabled') === 'true';
            updateIWTButtonStates(initialStateDisabled);
            assignButtonObserver = new MutationObserver(() => {
                if (isScriptPaused) return;
                const currentStateDisabled = assignButton.disabled || assignButton.getAttribute('aria-disabled') === 'true';
                updateIWTButtonStates(currentStateDisabled);
            });
            assignButtonObserver.observe(assignButton, {
                attributes: true,
                attributeFilter: ['disabled', 'aria-disabled']
            });
            Logger.info('IWT.buttonLinkage', `[SUCCESS] - "Assign Case to Me" 按鈕狀態監控已啟動，實現狀態聯動。`);
        } catch (error) {
            Logger.warn('IWT.buttonLinkage', `[FAIL] - 未找到 "Assign Case to Me" 按鈕，狀態聯動功能未啟動。`);
            updateIWTButtonStates(false);
        }
    }

    /**
     * @description 一個帶有重試和備選選項機制的安全點擊函數，用於填充下拉框。
     * @param {HTMLElement} modalRoot - 彈窗的根節點。
     * @param {string} buttonSelector - 下拉框觸發按鈕的選擇器。
     * @param {string[]} itemValues - 備選的選項 `data-value` 列表。
     * @returns {Promise<boolean>} 如果成功選擇則返回 true。
     */
    async function safeClickWithOptions(modalRoot, buttonSelector, itemValues) {
        // [FIXED] 調整過濾邏輯，僅排除 null 和 undefined，保留空字符串 ""
        if (!itemValues || !Array.isArray(itemValues)) {
            return true; // 如果沒有提供值或格式不對，則靜默成功
        }
        const options = itemValues.filter(item => item !== null && item !== undefined);
        if (options.length === 0) {
            return true; // 如果過濾後沒有可選項，也視為成功
        }

        for (const option of options) {
            try {
                const itemSelector = `lightning-base-combobox-item[data-value="${option}"]`;
                // 增加重試機制以應對UI延遲
                for (let i = 0; i < 2; i++) { // 重試2次
                    try {
                        const button = await waitForElementWithObserver(modalRoot, buttonSelector, 10); // 100ms: 快速查找按鈕
                        button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
                        await new Promise(resolve => setTimeout(resolve, 5)); // 50ms: 增加短暫延遲等待菜單渲染

                        const item = await waitForElementWithObserver(document.body, itemSelector, 10); // 100ms: 快速查找選項
                        item.dispatchEvent(new MouseEvent("click", { bubbles: true }));
                        await new Promise(resolve => setTimeout(resolve, 5)); // 50ms: 點擊後的UI反應延遲
                        return true; // 只要有一個選項成功，就立即返回
                    } catch (error) {
                        if (i === 1) throw error; // 最後一次嘗試失敗則拋出異常
                        // 嘗試關閉可能已打開的下拉菜單以重置狀態
                        document.body.click();
                        await new Promise(resolve => setTimeout(resolve, 5));
                    }
                }
            } catch (error) {
                Logger.warn('UI.safeClick', `[SKIP] - 選擇選項 "${option}" 失敗，將嘗試下一個備選項。錯誤: ${error.message}`);
                // 忽略單個選項的失敗，繼續嘗試下一個
            }
        }
        // 如果所有備選選項都失敗了，則拋出一個匯總的錯誤
        throw new Error(`所有備選選項 [${options.join(', ')}] 都選擇失敗`);
    }

    /**
     * @description 在彈出窗口的底部注入快捷操作按鈕，並實現自動換行。
     * @param {HTMLElement} footer - 彈窗的 footer 元素。
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
                    // 錯誤已在 safeClickWithOptions 內部處理
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
        Logger.info('UI.modalButtons', `[SUCCESS] - 快捷操作按鈕已成功注入彈窗。`);
    }

    /**
     * @description 帶重試機制地向目標窗口發送消息，直到收到確認回執。
     * @param {Window} windowHandle - 目標窗口句柄。
     * @param {object} messagePayload - 要發送的消息負載。
     * @param {string} targetOrigin - 目標窗口的源。
     */
    function sendMessageWithRetries(windowHandle, messagePayload, targetOrigin) {
        const MAX_RETRIES = 60;
        const RETRY_INTERVAL = 2000; // 2000ms: 每次重試發送消息的間隔，確保目標窗口有足夠時間加載和響應。
        let attempt = 0;
        let intervalId = null;
        const trySendMessage = () => {
            if (attempt >= MAX_RETRIES || !windowHandle || windowHandle.closed) {
                if (attempt >= MAX_RETRIES) {
                    Logger.error('IVP.ipc', `[FAIL] - 發送消息至 IVP 窗口達到最大重試次數，已停止。`);
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
                Logger.info('IVP.ipc', `[SUCCESS] - 收到 IVP 窗口的接收確認。`);
                window.removeEventListener('message', confirmationListener);
            }
        };
        window.addEventListener('message', confirmationListener);
    }

    /**
     * @description 如果啟用了自動查詢，則在頁面加載並提取到追踪號後，自動向IVP窗口發送查詢請求。
     */
    async function autoQueryIVPOnLoad() {
        if (!GM_getValue('autoIVPQueryEnabled', DEFAULTS.autoIVPQueryEnabled)) {
            Logger.warn('IVP.autoQuery', `[SKIP] - 未啟用自動 IVP 查詢功能。`);
            return;
        }
        if (!foundTrackingNumber) {
            return;
        }
        Logger.info('IVP.autoQuery', `[START] - 檢測到追踪號: ${foundTrackingNumber}，觸發自動查詢。`);
        try {
            if (!ivpWindowHandle || ivpWindowHandle.closed) {
                ivpWindowHandle = window.open('https://ivp.inside.ups.com/internal-visibility-portal', 'ivp_window');
            }
            if (!ivpWindowHandle) {
                Logger.error('IVP.ipc', `[FAIL] - 打開 IVP 窗口失敗，可能已被瀏覽器攔截。`);
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
            Logger.info('IVP.ipc', `[SUCCESS] - 查詢請求已發送至 IVP 窗口。`);
            if (GM_getValue('autoSwitchEnabled', DEFAULTS.autoSwitchEnabled)) {
                ivpWindowHandle.focus();
            }
        } catch (err) {
            // 錯誤已在內部處理
        }
    }

    /**
     * @description 根據用戶設置調整 Case Description 文本框或顯示區域的高度。
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
                Logger.info('UI.heightAdjust', `[SUCCESS] - 界面元素高度已根據設置調整 (描述框/歷史列表/編輯器)。`);
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
                        Logger.info('UI.heightAdjust', `[SUCCESS] - 界面元素高度已根據設置調整 (描述框/歷史列表/編輯器)。`);
                        return;
                    }
                }
            }
        }
    }

    /**
     * @description 處理聯繫人卡片，根據賬戶的 "Preferred" 狀態和用戶設置的高亮模式對其進行高亮。
     * @param {HTMLElement} card - 聯繫人卡片元素。
     */
    function processContactCard(card) {
        const highlightMode = GM_getValue('accountHighlightMode', 'pca');
        if (highlightMode === 'off') {
            return;
        }
        const isPcaModeOn = (highlightMode === 'pca');
        const isDispatchModeOn = (highlightMode === 'dispatch');
        const PREFERRED_LOG_KEY = 'preferredLog';
        const now = Date.now();
        const currentUrl = location.href;
        const allLogs = GM_getValue(PREFERRED_LOG_KEY, {});
        const CACHE_TTL = 30 * 60 * 1000; // 30分鐘: 聯繫人 Preferred 狀態的緩存有效期，避免重複DOM查詢。
        const cleanedLog = Object.fromEntries(Object.entries(allLogs).filter(([_, data]) => now - data.timestamp < CACHE_TTL));
        if (cleanedLog[currentUrl]) {
            const cachedIsPreferred = cleanedLog[currentUrl].isPreferred;
            const shouldHighlight = (isPcaModeOn && !cachedIsPreferred) || (isDispatchModeOn && cachedIsPreferred);
            if (shouldHighlight) {
                card.style.setProperty('background-color', 'moccasin', 'important');
                findAllElementsInShadows(card, 'div').forEach(div => {
                    div.style.setProperty('background-color', 'moccasin', 'important');
                });
            }
            Logger.info('UI.contactCard', `[SUCCESS] - 聯繫人卡片高亮規則已應用 (模式: ${highlightMode}, Preferred: ${cachedIsPreferred}, 結果: ${shouldHighlight ? '高亮' : '不高亮'})。`);
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
        let preferredValueFound = false;
        try {
            const allLabels = findAllElementsInShadows(card, 'span.slds-form-element__label');
            let preferredLabelElement = null;
            for (const label of allLabels) {
                if (label.textContent.trim() === 'Preferred') {
                    preferredLabelElement = label;
                    break;
                }
            }
            if (preferredLabelElement) {
                let currentParent = preferredLabelElement.parentElement;
                let valueElement = null;
                let searchDepth = 0;
                while (currentParent && searchDepth < 5 && !valueElement) {
                    valueElement = findElementInShadows(currentParent, '.slds-form-element__static');
                    if (valueElement) {
                        const preferredValueText = valueElement.textContent.trim();
                        const lowerCaseValue = preferredValueText.toLowerCase();
                        if (lowerCaseValue === 'yes' || lowerCaseValue === 'no') {
                            isPreferred = (lowerCaseValue === 'yes');
                            preferredValueFound = true;
                        } else {
                            valueElement = null;
                        }
                    }
                    currentParent = currentParent.parentElement;
                    searchDepth++;
                }
            }
        } catch (e) {
            // 忽略異常
        }
        if (!preferredValueFound) {
            Logger.warn('UI.contactCard', `[FAIL] - 未能找到聯繫人 "Preferred" 狀態值，高亮功能可能不準確。`);
        }
        cleanedLog[currentUrl] = {
            isPreferred: isPreferred,
            timestamp: now
        };
        GM_setValue(PREFERRED_LOG_KEY, cleanedLog);
        const shouldHighlight = (isPcaModeOn && !isPreferred) || (isDispatchModeOn && isPreferred);
        if (shouldHighlight) {
            card.style.setProperty('background-color', 'moccasin', 'important');
            findAllElementsInShadows(card, 'div').forEach(div => {
                div.style.setProperty('background-color', 'moccasin', 'important');
            });
        }
        Logger.info('UI.contactCard', `[SUCCESS] - 聯繫人卡片高亮規則已應用 (模式: ${highlightMode}, Preferred: ${isPreferred}, 結果: ${shouldHighlight ? '高亮' : '不高亮'})。`);
    }

    /**
     * @description 一個更激進的、不檢查可見性的 Shadow DOM 元素查找函數。
     * @param {Node} root - 開始搜索的根節點。
     * @param {string} selector - CSS選擇器。
     * @returns {HTMLElement|null} 找到的第一個元素，或 null。
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
     * @description 如果用戶啟用了屏蔽功能，則攔截並移除原生的IVP卡片內容（iframe）。
     * @param {HTMLElement} cardElement - IVP卡片的容器元素。
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
                        Logger.info('IVP.blocker', `[SUCCESS] - 已恢復被攔截的 IVP 內容。`);
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
                Logger.info('IVP.blocker', `[SUCCESS] - 原生 IVP 卡片已被成功攔截並隱藏。`);
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
            localObserver.disconnect();
            if (!findAndStoreTask()) {
                Logger.warn('IVP.blocker', `[TIMEOUT] - 攔截 IVP 卡片時，等待 iframe 超時。`);
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

    /**
     * @description 執行自動指派的核心邏輯，包括所有者驗證、緩存檢查和點擊操作。
     *              [V49.3 延時修復版] 根據用戶要求，在指派成功4秒後，重新執行高亮檢查。
     * @param {string} caseUrl - 當前 Case 的 URL，用作緩存鍵。
     * @param {boolean} [isCachedCase=false] - 是否為緩存命中模式，此模式下僅應用視覺反饋。
     */
    async function handleAutoAssign(caseUrl, isCachedCase = false) {
        const ASSIGNMENT_CACHE_KEY = 'assignmentLog';
        const findOwnerBlockWithRetry = (timeout = 15000) => { // 15000ms: 等待 "Case Owner" 信息塊出現的超時。
            return new Promise((resolve, reject) => {
                const startTime = Date.now();
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
                }, 500); // 500ms: 輪詢間隔。
            });
        };
        try {
            if (isCachedCase) {
                try {
                    const assignButton = await waitForElementWithObserver(document.body, 'button[title="Assign Case to Me"]', 10000); // 10000ms: 等待指派按鈕出現的超時。
                    if (assignButton && !assignButton.disabled) {
                        assignButton.style.setProperty('background-color', '#0070d2', 'important');
                        assignButton.style.setProperty('color', '#fff', 'important');
                    }
                } catch (error) {
                    // 忽略錯誤
                }
                return;
            }
            Logger.info('AutoAssign.execute', `[START] - 自動指派流程啟動。`);
            const targetUser = GM_getValue('autoAssignUser', DEFAULTS.autoAssignUser);
            if (!targetUser) {
                Logger.warn('AutoAssign.preCheck', `[SKIP] - 未設置目標用戶名，自動指派功能已禁用。`);
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
                ownerElement = await waitForElementWithObserver(ownerBlock, preciseOwnerSelector, 10000); // 15000ms: 等待所有者姓名元素出現的超時。
                currentOwner = ownerElement?.innerText?.trim() || '';
            } catch (err) {
                Logger.error('AutoAssign.execute', `[FAIL] - 查找 "Case Owner" 姓名元素時發生錯誤或超時。`);
                return;
            }
            if (!currentOwner) {
                return;
            }
            if (currentOwner.toLowerCase() !== targetUser.toLowerCase()) {
                Logger.info('AutoAssign.preCheck', `[SKIP] - Owner "${currentOwner}" 與目標用戶 "${targetUser}" 不匹配。`);
                return;
            }
            let assignButton;
            try {
                assignButton = await waitForElementWithObserver(document.body, 'button[title="Assign Case to Me"]', 100000); // 20000ms: 等待指派按鈕出現的超時。
            } catch (err) {
                Logger.error('AutoAssign.execute', `[FAIL] - 查找 "Assign Case to Me" 按鈕時發生錯誤或超時。`);
                return;
            }
            if (assignButton && !assignButton.disabled) {
                await new Promise(resolve => setTimeout(resolve, 300)); // 300ms: 點擊前的短暫延遲，確保UI穩定，避免點擊失效。
                assignButton.click();
                assignButton.style.setProperty('background-color', '#0070d2', 'important');
                assignButton.style.setProperty('color', '#fff', 'important');
                const cache = GM_getValue(ASSIGNMENT_CACHE_KEY, {});
                const CACHE_TTL = 30 * 60 * 1000; // 30分鐘: 指派成功記錄的緩存有效期。
                cache[caseUrl] = {
                    timestamp: Date.now()
                };
                GM_setValue(ASSIGNMENT_CACHE_KEY, cache);
                Logger.info('AutoAssign.execute', `[SUCCESS] - 自動指派成功，已點擊 "Assign Case to Me" 按鈕並更新緩存。`);

                // =================================================================================
                // SECTION: [新增修復] 延時4秒後，重新執行高亮檢查
                // =================================================================================
                setTimeout(() => {
                    Logger.info('AutoAssign.reColor', `[DELAYED CHECK] - 4秒後執行高亮狀態重新檢查。`);
                    checkAndColorComposeButton();
                }, 8000); // 按照您要求的4秒延遲
                // =================================================================================

            } else {
                Logger.warn('AutoAssign.execute', `[SKIP] - "Assign Case to Me" 按鈕不存在或處於禁用狀態。`);
            }
        } catch (outerErr) {
            // 忽略外部錯誤
        }
    }

    /**
     * @description 處理 "Associate Contact" 彈窗，對表格列進行重新排序，並高亮匹配的賬戶行。
     * @param {HTMLElement} modal - 彈窗的容器元素。
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
                        Logger.info('UI.contactHighlight', `[SUCCESS] - "Associate Contact" 彈窗中匹配賬號 "${accountValue}" 的行已高亮。`);
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
                Logger.info('UI.contactReorder', `[SUCCESS] - "Associate Contact" 彈窗表格已按預設順序重新排列。`);
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
            Logger.error('UI.contactReorder', `[FAIL] - 處理 "Associate Contact" 彈窗時出錯: ${error.message}`);
        } finally {
            requestAnimationFrame(() => {
                modal.style.visibility = 'visible';
            });
        }
    }

    /**
     * @description 部署一個哨兵觀察器，在用戶成功關聯聯繫人後觸發後續操作（如快速關閉窗口）。
     * @param {HTMLElement} modal - 正在觀察的彈窗元素。
     * @returns {MutationObserver} 創建的觀察器實例。
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
                        waitForElementWithObserver(document.body, 'article.cCEC_ContactSummary', 15000) // 15000ms: 等待聯繫人卡片更新的超時。
                            .then(card => {
                                processContactCard(card);
                            }).catch(error => {
                                // 忽略錯誤
                            });
                        if (GM_getValue('sentinelCloseEnabled', DEFAULTS.sentinelCloseEnabled)) {
                            setTimeout(() => {
                                const modalToClose = document.querySelector('div.cCEC_ModalLinkAccount');
                                if (modalToClose) {
                                    modalToClose.style.display = 'none';
                                }
                            }, 500); // 500ms: 關聯成功後關閉窗口的延遲，提供視覺反饋時間。
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
     * @description 檢查計時器狀態，如果案件已超期，則將 "Compose" 按鈕標紅。
     *              [v45.1 修復版] 增加了內部輪詢機制，以解決計時器與按鈕的異步加載競爭問題。
     */
    function checkAndColorComposeButton() {
        const MAX_ATTEMPTS = 20;      // 最多嘗試20次
        const POLL_INTERVAL_MS = 500; // 每500毫秒嘗試一次 (總計最多等待 3 秒)
        let attempts = 0;

        const poller = setInterval(() => {
            const composeButton = findElementInShadows(document.body, "button.testid__dummy-button-submit-action");

            // 停止條件：找到按鈕 或 達到最大嘗試次數
            if (composeButton || attempts >= MAX_ATTEMPTS) {
                clearInterval(poller); // 無論結果如何，都停止輪詢

                if (!composeButton) {
                    Logger.warn('UI.buttonAlert', '[FAIL] - "Compose" 按鈕高亮檢查終止，在 3 秒內未找到按鈕元素。');
                    return;
                }

                // 找到按鈕後，執行原始的高亮邏輯
                const timerTextEl = findElementInShadows(document.body, ".milestoneTimerText");
                const isOverdue = timerTextEl && timerTextEl.textContent.includes("overdue");
                const isAlreadyRed = composeButton.style.backgroundColor === "red";

                if (isOverdue && !isAlreadyRed) {
                    composeButton.style.backgroundColor = "red";
                    composeButton.style.color = "white";
                    Logger.info('UI.buttonAlert', `[SUCCESS] - "Compose" 按鈕已因計時器超期標紅。`);
                } else if (!isOverdue && isAlreadyRed) {
                    // 如果狀態恢復正常，則移除高亮
                    composeButton.style.backgroundColor = "";
                    composeButton.style.color = "";
                }
            }
            attempts++;
        }, POLL_INTERVAL_MS);
    }

    /**
     * @description 檢查是否存在關聯案件，如果存在，則將 "Associate Contact" 按鈕標紅。
     */
    function checkAndColorAssociateButton() {
        const relatedCasesTab = findElementInShadows(document.body, 'li[data-label^="Related Cases ("]');
        const associateButton = findElementInShadows(document.body, 'button[title="Associate Contact"]');
        if (!associateButton) return;
        const hasRelatedCases = relatedCasesTab && relatedCasesTab.getAttribute("title") !== "Related Cases (0)";
        const isAlreadyRed = associateButton.style.backgroundColor === "red";
        if (hasRelatedCases && !isAlreadyRed) {
            associateButton.style.backgroundColor = "red";
            Logger.info('UI.buttonAlert', `[SUCCESS] - "Associate Contact" 按鈕已因存在關聯案件標紅。`);
        } else if (!hasRelatedCases && isAlreadyRed) {
            associateButton.style.backgroundColor = "";
        }
    }

    /**
 * @description 異步確定當前 Case 的狀態（打開、關閉或未知）。
 *              [v45.2 修復版] 採用 "立即檢查，若無則監聽" 模式，以適應SPA導航。
 * @returns {Promise<'ACTIVE_OR_NEW'|'CLOSED'|'UNKNOWN'>} 解析為案件狀態的字符串。
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
            return null; // 返回 null 表示未找到
        };

        // 步驟 1: 立即執行一次檢查
        const initialStatus = checkStatus();
        if (initialStatus) {
            resolve(initialStatus);
            Logger.info('AutoAssign.preCheck', `[SUCCESS] - 已找到。`);
            return;
        }

        // 步驟 2: 如果立即檢查未找到，則啟動觀察器
        const timeout = 15000; // 15000ms: 等待狀態字段出現的超時。
        let timeoutHandle = setTimeout(() => {
            observer.disconnect();
            Logger.error('AutoAssign.preCheck', `[FAIL] - 確定 Case 狀態時超時或失敗。`);
            resolve('UNKNOWN');
        }, timeout);

        const observer = new MutationObserver(() => {
            if (isScriptPaused) return;
            const currentStatus = checkStatus();
            if (currentStatus) {
                clearTimeout(timeoutHandle);
                observer.disconnect();
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
     * @description 檢查自動指派所需的關鍵字段（Category, Sub Category, Sub-Status）是否為空。
     * @returns {Promise<boolean>} 如果有任何一個字段為空，則返回 true。
     */
    async function areRequiredFieldsEmpty() {
        try {
            await waitForElementWithObserver(document.body, 'slot[name="secondaryFields"]', 15000); // 15000ms: 等待包含這些字段的容器出現的超時。
            const highlightItems = findAllElementsInShadows(document.body, 'records-highlights-details-item');
            if (highlightItems.length === 0) {
                return false;
            }
            let categoryValue = null;
            let subCategoryValue = null;
            let subStatusValue = null;
            for (const item of highlightItems) {
                const titleElement = findElementInShadows(item, 'p.slds-text-title');
                if (!titleElement) continue;
                const title = titleElement.getAttribute('title');
                const valueElement = findElementInShadows(item, 'lightning-formatted-text');
                const textContent = valueElement ? valueElement.textContent.trim() : '';
                switch (title) {
                    case 'Case Category':
                        categoryValue = textContent;
                        break;
                    case 'Case Sub Category':
                        subCategoryValue = textContent;
                        break;
                    case 'Case Sub-Status':
                        subStatusValue = textContent;
                        break;
                }
            }
            if (categoryValue === null || subCategoryValue === null || subStatusValue === null) {
                return false;
            }
            if (categoryValue === '' || subCategoryValue === '' || subStatusValue === '') {
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }


    // =================================================================================
    // SECTION: 關聯案件提取器模塊 (Related Cases Extractor Module)
    // =================================================================================

    /**
     * @description 一個獨立的模塊，用於處理 "Related Cases" 標籤頁的數據提取、UI增強和排序功能。
     */
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

        /**
         * @description 處理 "Related Cases" 標籤頁的點擊事件，啟動數據提取流程。
         * @param {HTMLElement} tabLink - 被點擊的標籤頁鏈接元素。
         */
        handleTabClick(tabLink) {
            if (this.hasExecuted) return;
            this.hasExecuted = true;
            Logger.info('RelatedCases.init', `[START] - "Related Cases" 標籤頁被點擊，開始數據提取流程。`);
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
                    Logger.error('RelatedCases.init', `[FAIL] - 等待案件列表容器超時，提取流程終止。`);
                }
            }, 100); // 100ms: 輪詢間隔，快速檢測面板內容是否加載。
        },

        /**
         * @description 設置UI（注入樣式）並開始處理所有案件行。
         * @param {Node} container - 包含案件表格的根節點。
         */
        setupUIAndProcessCases(container) {
            this.injectStyles();
            this.processAllCases(container);
        },

        /**
         * @description 注入排序圖標所需的CSS樣式。
         */
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

        /**
         * @description 增強表格頭部，添加新的可排序列表頭。
         * @param {HTMLTableElement} table - 目標表格元素。
         */
                enhanceTableHeaders(table) {
            const headerRow = table.querySelector('thead tr');
            if (!headerRow || headerRow.dataset.enhanced) return;
            table.style.tableLayout = 'fixed';
            table.style.width = '100%';

            // 遍歷所有現有的表頭
            headerRow.querySelectorAll('th').forEach(th => {
                th.querySelector('.slds-resizable')?.remove();
                th.classList.remove('slds-is-resizable');

                // [新增修復] 找到內部 div 並重置其寬度，這是移除滾動條的關鍵
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

                // [新增修復] 同樣對克隆出的新表頭應用寬度重置修復
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
            Logger.info('RelatedCases.enhanceUI', `[SUCCESS] - 表格頭部已增強，添加了 "Case Owner" 和 "Queues" 列。`);
        },

        /**
         * @description 根據指定的列對表格進行排序。
         * @param {HTMLTableElement} table - 要排序的表格。
         * @param {string} columnId - 用於排序的列的ID。
         */
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
            Logger.info('RelatedCases.sort', `[SUCCESS] - 表格已按 "${columnId}" 列 (${this.currentSort.direction}) 排序。`);
        },

        /**
         * @description 異步並行處理所有案件行，提取數據並更新UI。
         * @param {Node} container - 包含案件表格的根節點。
         */
        async processAllCases(container) {
            const table = container.querySelector('table.slds-table');
            if (!table) {
                return;
            }
            this.enhanceTableHeaders(table);
            const summaryRows = table.querySelectorAll('tbody tr.caseSummary');
            if (summaryRows.length === 0) return;
            const processingPromises = Array.from(summaryRows).map((row, index) => this.processSingleRow(row, index + 1));
            const results = await Promise.allSettled(processingPromises);
            const clickTargetsToClose = results
                .filter(r => r.status === 'fulfilled' && r.value)
                .map(r => r.value);
            if (clickTargetsToClose.length > 0) {
                clickTargetsToClose.forEach(target => {
                    const icon = target.querySelector('lightning-icon');
                    if (icon && icon.iconName.includes('chevrondown')) {
                        target.click();
                    }
                });
            }
            Logger.info('RelatedCases.process', `[SUCCESS] - 成功處理 ${summaryRows.length} 個關聯案件，數據已提取並增強。`);
        },

        /**
         * @description 處理單個案件行：點擊展開、等待詳細信息、提取數據、創建新單元格並插入。
         * @param {HTMLTableRowElement} summaryRow - 案件的摘要行。
         * @param {number} rowIndex - 行索引，用於日誌記錄。
         * @returns {Promise<HTMLElement>} 解析為用於關閉展開行的點擊目標。
         */
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
                Logger.error('RelatedCases.processRow', `[FAIL] - 處理案件行 #${rowIndex} 時失敗: ${error.message}`);
                throw new Error(`案件 #${rowIndex}: ${error.message}`);
            }
        },

        /**
         * @description 創建一個新的表格單元格（td）。
         *              [最終修正版] 為 'Case Owner' 列 (ID: 'owner') 增加了點擊複製功能和交互反饋。
         * @param {string} text - 單元格的文本內容。
         * @param {string} colId - 列的ID。
         * @returns {HTMLTableCellElement} 創建的單元格元素。
         */
        createCell(text, colId) {
            const cell = document.createElement('td');
            cell.dataset.colId = colId;

            const contentDiv = document.createElement('div');
            contentDiv.className = 'slds-truncate';
            contentDiv.textContent = text;
            contentDiv.title = text;

            // [核心修正] 根據用戶反饋，將目標ID從 'queue' 修正為 'owner'
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
                        }, 1500);
                    }).catch(err => {
                        Logger.error('RelatedCases.copy', `[FAIL] - 複製 "${text}" 失敗: ${err}`);
                        const originalText = text;
                        contentDiv.textContent = 'Copy Failed!';

                        setTimeout(() => {
                            contentDiv.textContent = originalText;
                        }, 2000);
                    });
                });
            }

            cell.appendChild(contentDiv);
            return cell;
        },

        /**
         * @description 從詳細信息容器中根據標籤文本提取數據。
         * @param {HTMLElement} container - 詳細信息容器。
         * @param {string} labelText - 要查找的標籤文本。
         * @returns {string} 提取到的數據，或 'N/A'。
         */
        extractDataByLabel(container, labelText) {
            for (const b of container.querySelectorAll('b')) {
                if (b.textContent.trim() === labelText) {
                    return b.parentElement.textContent.replace(b.textContent, '').trim() || 'N/A';
                }
            }
            return 'N/A';
        },

        /**
         * @description 等待案件的詳細信息行出現。
         * @param {HTMLTableRowElement} summaryRow - 案件的摘要行。
         * @returns {Promise<HTMLTableRowElement>} 解析為詳細信息行元素。
         */
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

    /**
     * @description 啟動一個高頻率的全局掃描器，並行處理所有一次性的頁面初始化任務。
     * @param {string} caseUrl - 當前Case頁面的URL，用於標記處理狀態。
     */
    function startHighFrequencyScanner(caseUrl) {
        const SCAN_INTERVAL = 300; // 150ms: 掃描器輪詢間隔，用於快速檢測頁面元素。
        const MASTER_TIMEOUT = 15000; // 15000ms: 掃描器的總運行超時，防止無限運行。
        const startTime = Date.now();

        let tasksToRun = CASE_PAGE_CHECKS_CONFIG.filter(task => task.once);
        if (tasksToRun.length === 0) return;

        const processedElements = new WeakSet();
        Logger.info('Core.Scanner', `[START] - 高頻掃描器啟動，處理 ${tasksToRun.length} 個一次性任務。`);

        // [核心修改] 將創建的定時器ID賦值給全局句柄 globalScannerId
        globalScannerId = setInterval(() => {
            if (isScriptPaused || tasksToRun.length === 0 || Date.now() - startTime > MASTER_TIMEOUT) {
                // [核心修改] 使用全局句柄來清理定時器
                clearInterval(globalScannerId);
                globalScannerId = null; // [新增] 清理全局句柄狀態，確保其準確性
                if (tasksToRun.length > 0) {
                    const unfinished = tasksToRun.map(t => t.id).join(', ');
                    Logger.warn('Core.Scanner', `[TIMEOUT] - 掃描器超時，仍有 ${tasksToRun.length} 個任務未完成: [${unfinished}]。`);
                } else {
                    Logger.info('Core.Scanner', `[SUCCESS] - 所有一次性任務完成，掃描器停止。`);
                    processedCaseUrlsInSession.add(caseUrl);
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
    }

    /**
     * @description 存儲所有在Case頁面需要執行的一次性任務的配置。
     */
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
        handler: (cardElement) => {
            handleIVPCardBlocking(cardElement);
        }
    }, {
        id: 'addIVPButtons',
        selector: 'c-cec-datatable',
        once: true,
        handler: (datatableContainer) => {
            const shadowRoot = datatableContainer.shadowRoot;
            if (!shadowRoot) {
                return;
            }

            const POLL_INTERVAL = 300; // 300ms: 輪詢間隔，探測按鈕是否已渲染。
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
                            if (cellWrapper && !cellWrapper.previousElementSibling?.classList.contains("custom-s-button")) {
                                const ivpButton = document.createElement("button");
                                ivpButton.textContent = "IVP";
                                ivpButton.className = "slds-button slds-button_icon slds-button_icon-brand custom-s-button";
                                ivpButton.style.marginRight = "4px";
                                ivpButton.style.fontWeight = 'bold';
                                cellWrapper.parentElement.insertBefore(ivpButton, cellWrapper);
                                row.setAttribute('data-ivp-processed', 'true');
                                injectedCount++;
                            }
                        }
                    }
                    return;
                }

                if (attempts >= MAX_ATTEMPTS) {
                    clearInterval(poller);
                }
            }, POLL_INTERVAL);
        }
    }];


    // =================================================================================
    // SECTION: 主控制器與初始化 (Main Controller & Initialization)
    // =================================================================================

    /**
     * @description 處理舊版本設置到新版本的遷移。
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
            Logger.info('Core.migration', `[SUCCESS] - 舊版本設置已成功遷移。`);
        }
        GM_setValue(MIGRATION_KEY, true);
    }

    /**
     * @description 在頁面頂部Logo處注入腳本控制按鈕（設置、暫停/恢復）。
     * @param {HTMLElement} logoElement - 用於注入按鈕的Logo元素。
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
                Logger.warn('Core.togglePause', `[PAUSED] - 腳本已暫停，所有自動化功能停止。`);
            } else {
                showGlobalToast('腳本已恢復運行', 'check');
                Logger.info('Core.togglePause', `[SUCCESS] - 腳本已恢復運行，正在重新初始化頁面。`);
                lastUrl = '';
                monitorUrlChanges();
            }
        });
        logoElement.appendChild(settingsButton);
        logoElement.appendChild(pauseButton);
        updatePauseButtonUI();
        Logger.info('UI.injectControls', `[SUCCESS] - 頂部控制按鈕 (設置/暫停) 注入成功。`);
    }

    /**
     * @description 初始化一個觀察器，等待頁面頂部Header出現後注入控制按鈕。
     */
    function initHeaderObserver() {
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

    /**
     * @description 初始化全局點擊事件監聽器，用於處理動態出現的元素。
     */
    function initGlobalClickListener() {
        document.body.addEventListener('click', (event) => {
            if (isScriptPaused) return;

            // --- START: 增強部分 (增加 'Write an email...' 觸發點) ---
            // 檢查點擊的是否為 "Compose", "Reply All", 或 "Write an email..." 按鈕
            const composeButton = event.target.closest('button.testid__dummy-button-submit-action');
            const replyAllButton = event.target.closest('a[title="Reply All"]');
            const writeEmailButton = event.target.closest('button[title="Write an email..."]'); // 新增的觸發點檢測

            // 如果是其中任意一個按鈕，則觸發模板按鈕注入流程
            if (composeButton || replyAllButton || writeEmailButton) {
                let triggerName = '"Unknown"';
                if (composeButton) triggerName = '"Compose"';
                if (replyAllButton) triggerName = '"Reply All"';
                if (writeEmailButton) triggerName = '"Write an email..."';

                Logger.info('UI.templateShortcuts', `[TRIGGER] - 檢測到 ${triggerName} 按鈕點擊，準備注入模板快捷按鈕。`);

                // 使用短暫延遲以確保編輯器容器開始渲染
                setTimeout(() => {
                    handleEditorReadyForTemplateButtons(); // 調用統一的可複用函數
                }, 100);
            }
            // --- END: 增強部分 ---

            const associateButton = event.target.closest('button[title="Associate Contact"], a[title="Associate Contact"]');
            if (associateButton) {
                waitForElementWithObserver(document.body, '.slds-modal__container', 10000).then(modal => {
                    processAssociateContactModal(modal);
                }).catch(error => {
                    // 忽略錯誤
                });
                return;
            }

            const ivpButton = event.target.closest('.custom-s-button');
            if (ivpButton) {
                const row = ivpButton.closest('tr');
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
                    return;
                }
                Logger.info('IVP.manualQuery', `[START] - 手動點擊 IVP 按鈕，查詢追踪號: ${trackingNumber}。`);
                try {
                    if (!ivpWindowHandle || ivpWindowHandle.closed) {
                        ivpWindowHandle = window.open('https://ivp.inside.ups.com/internal-visibility-portal', 'ivp_window');
                    }
                    if (!ivpWindowHandle) {
                        Logger.error('IVP.ipc', `[FAIL] - 打開 IVP 窗口失敗，可能已被瀏覽器攔截。`);
                        alert('CEC 功能強化：打開 IVP 窗口失敗，可能已被瀏覽器攔截。請為此網站允許彈窗。');
                        return;
                    }
                    const messagePayload = {
                        type: 'CEC_SEARCH_REQUEST',
                        payload: {
                            trackingNumber: trackingNumber,
                            timestamp: Date.now()
                        }
                    };
                    sendMessageWithRetries(ivpWindowHandle, messagePayload, 'https://ivp.inside.ups.com');
                    Logger.info('IVP.ipc', `[SUCCESS] - 查詢請求已發送至 IVP 窗口。`);
                    if (GM_getValue('autoSwitchEnabled', DEFAULTS.autoSwitchEnabled)) {
                        ivpWindowHandle.focus();
                    }
                } catch (err) {
                    // 忽略錯誤
                }
            }
        }, true);
    }

    /**
     * @description 初始化一個觀察器，等待任何彈窗（Modal）出現，並在其中注入快捷按鈕。
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
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        setTimeout(() => observer.disconnect(), 15000); // 15000ms: 等待彈窗出現的超時。
    }

    /**
     * @description 監控URL的變化。當URL變化時，重置狀態並根據新的URL觸發相應的頁面初始化邏輯。
     *              [優化版] 增加了“內容就緒守衛”機制，確保在核心UI渲染後再執行初始化。
     */
    async function monitorUrlChanges() {
        if (isScriptPaused) {
            return;
        }
        if (location.href === lastUrl) return;

        // [核心修改] 在處理新頁面前，終止任何可能存在的舊掃描器
        if (globalScannerId) {
            clearInterval(globalScannerId);
            Logger.info('Core.Scanner', `[CLEANUP] - 上一個頁面的掃描器 (ID: ${globalScannerId}) 已被終止。`);
            globalScannerId = null;
        }

        Logger.info('Core.Router', `[CHANGE] - URL 變更，開始處理新頁面: ${location.href}`);
        lastUrl = location.href;

        // 狀態重置邏輯保持不變
        injectedIWTButtons = {};
        if (assignButtonObserver) assignButtonObserver.disconnect();
        if (iwtModuleObserver) iwtModuleObserver.disconnect();
        assignButtonObserver = null;
        iwtModuleObserver = null;
        if (relatedCasesExtractorModule) relatedCasesExtractorModule.hasExecuted = false;
        foundTrackingNumber = null;
        window.contactLogicDone = false;

        const caseRecordPagePattern = /^https:\/\/upsdrive\.lightning\.force\.com\/lightning\/r\/Case\/[a-zA-Z0-9]{18}\/.*/;

        if (caseRecordPagePattern.test(location.href)) {
            const caseUrl = location.href;

            // --- [新增] 內容就緒守衛機制 ---
            const PAGE_READY_SELECTOR = 'c-cec-case-categorization';
            const PAGE_READY_TIMEOUT = 20000; // 20秒: 等待核心UI出現的超時時間

            try {
                Logger.info('Core.Router', `[GATEKEEPER] - 等待頁面核心元素 "${PAGE_READY_SELECTOR}" 出現...`);
                await waitForElementWithObserver(document.body, PAGE_READY_SELECTOR, PAGE_READY_TIMEOUT);
                Logger.info('Core.Router', `[GATEKEEPER] - 核心元素已出現，開始執行頁面初始化。`);
            } catch (error) {
                Logger.warn('Core.Router', `[GATEKEEPER] - 等待核心元素超時 (${PAGE_READY_TIMEOUT / 1000}秒)，已中止當前頁面的初始化。這可能是由於頁面加載緩慢或頁面結構發生變化。`);
                return; // 安全地中止執行，不進行後續操作
            }
            // --- 守衛機制結束 ---


            // --- 所有初始化邏輯現在被保護在守衛之後 ---
            Logger.info('Core.Router', `[SUCCESS] - Case 頁面功能初始化完成。`);
            startHighFrequencyScanner(caseUrl);
            initModalButtonObserver();
            extractTrackingNumberAndTriggerIVP();
            initIWantToModuleWatcher();

            const targetUser = GM_getValue('autoAssignUser', DEFAULTS.autoAssignUser);
            if (!targetUser) {
                Logger.warn('AutoAssign.preCheck', `[SKIP] - 未設置目標用戶名，自動指派功能已禁用。`);
                return;
            }

            const ASSIGNMENT_CACHE_KEY = 'assignmentLog';
            const CACHE_EXPIRATION_MS = 30 * 60 * 1000; // 30分鐘: 指派記錄的緩存有效期。
            const cache = GM_getValue(ASSIGNMENT_CACHE_KEY, {});
            const entry = cache[caseUrl];

            if (entry && (Date.now() - entry.timestamp < CACHE_EXPIRATION_MS)) {
                Logger.info('AutoAssign.preCheck', `[SKIP] - 緩存命中：此 Case 在 30 分鐘內已被指派。`);
                handleAutoAssign(caseUrl, true);
                return;
            }

            const initialStatus = await determineCaseStatus();
            if (initialStatus === 'CLOSED') {
                Logger.info('AutoAssign.preCheck', `[SKIP] - 初始狀態為 "Closed"，不執行指派。`);
                return;
            }

            if (initialStatus !== 'ACTIVE_OR_NEW') {
                Logger.info('AutoAssign.preCheck', `[SKIP] - 狀態不符合觸發條件 (當前狀態: "${initialStatus}")。`);
                return;
            }

            if (await areRequiredFieldsEmpty()) {
                Logger.info('AutoAssign.preCheck', `[SKIP] - 關鍵字段 (Category/Sub Category/Sub-Status) 為空。`);
                return;
            }

            handleAutoAssign(caseUrl, false);

        } else {
            Logger.info('Core.Router', `[SKIP] - 非 Case 頁面，跳過核心功能初始化。`);
        }
    }

    /**
     * @description 啟動URL監控機制，包括事件監聽和定時心跳檢測。
     */
    function startUrlMonitoring() {
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

    /**
     * @description 腳本的總入口函數，執行所有初始化操作。
     */
    function start() {
        Logger.info('Core.start', `[START] - 腳本啟動 (Version: ${GM_info.script.version})。`);
        handleSettingsMigration();
        initHeaderObserver();
        if (isScriptPaused) {
            Logger.warn('Core.start', `[PAUSED] - 腳本處於暫停狀態，核心功能未啟動。`);
            return;
        }
        injectStyleOverrides();
        toggleCleanModeStyles();
        injectGlobalCustomStyles();
        Logger.info('UI.applyStyles', `[SUCCESS] - 所有自定義樣式 (全局/高度/組件屏蔽) 已應用。`);
        GM_registerMenuCommand("設置", openSettingsModal);
        initGlobalClickListener();
        startUrlMonitoring();
        monitorUrlChanges();
        Logger.info('Core.start', `[SUCCESS] - 核心功能初始化完成。`);
    }

    start();

})();
