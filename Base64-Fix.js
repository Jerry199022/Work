// ==UserScript==
// @name         永利八達通Case CPU使用率修復
// @namespace    https://tampermonkey.net/
// @version      V5
// @description  修復永利八達通Case內嵌Base64圖片導致CPU使用率100%的問題。
// @author       Jerry Law
// @match        https://upsdrive.lightning.force.com/lightning/*
// @run-at       document-start
// @allFrames    true
// @grant        GM_getValue
// @grant        GM_setValue
// @updateURL    https://raw.githubusercontent.com/Jerry199022/Work/refs/heads/main/Base64-Fix.js
// @downloadURL  https://raw.githubusercontent.com/Jerry199022/Work/refs/heads/main/Base64-Fix.js
// ==/UserScript==

(function() {
    'use strict';

    // =================================================================================
    // SECTION: 全局配置與狀態管理 (Global Configuration & State)
    // =================================================================================

    const KEY = 'sf_b64_cpu_fix_v3';

    /**
     * @description 存儲腳本所有功能的默認配置。
     */
    const DEFAULTS = {
        enabled: true,
        debug: true,

        // 閾值設置為 10000
        minDataUrlLength: 10000,

        stripInlineBackground: true,

        placeholderSvg: 'data:image/svg+xml;charset=utf-8,' +
            encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="22"><rect width="100%" height="100%" fill="#f2f2f2"/><text x="6" y="15" font-size="12" fill="#666">[Base64 圖片已屏蔽]</text></svg>'),

        // 關鍵字列表
        containerKeywords: [
            'Latest Posts',
            'Search this feed',
            'Refresh this feed',
            'Skip Feed',
            'End of Feed',
            'Chatter Feed Items',
            'All Updates',
            'Emails',
            'Call Logs',
            'Chatter',
            'Feed'
        ],
    };

    // 加載配置
    const cfg = Object.assign({}, DEFAULTS, GM_getValue(KEY, {}));

    // 全局狀態變量
    let container = null;
    let lastUrl = location.href;

    // --- [PATCH] 容器搜尋節流，避免高頻 Mutation 時狂掃全頁 ---
    let lastFindTs = 0;
    const FIND_THROTTLE_MS = 600;

    // --- [PATCH] 優先 selector：比 keyword TreeWalker 穩定得多 ---
    const FEED_SELECTORS = [
        'div.forceChatterStyle',
        'div.forceChatterStyle--default.forceChatterStyle',
        'div[data-aura-class*="forceChatterStyle"]'
    ];

    // 性能計數器
    const Stats = {
        blockedImg: 0,
        sanitizedText: 0,
        strippedBg: 0
    };

    // =================================================================================
    // SECTION: 核心工具函數 (Core Utilities)
    // =================================================================================

    const isDataImage = (s) => typeof s === 'string' && s.startsWith('data:image');
    const shouldBlock = (s) => isDataImage(s) && s.length >= cfg.minDataUrlLength;

    // 簡單的時間戳獲取函數
    const getTimestamp = () => new Date().toLocaleTimeString('en-US', { hour12: false });

    function withinContainer(node) {
        if (!container) return false;
        if (!container.isConnected) return false;
        try {
            return container.contains(node);
        } catch {
            return false;
        }
    }

    // --- [PATCH] 基本有效性：永遠拒絕 A / 太淺層 / 不穩定節點 ---
    function isValidContainer(el) {
        if (!el || el.nodeType !== 1) return false;
        if (!(el instanceof HTMLElement)) return false;
        if (!el.isConnected) return false;

        const tag = el.tagName;
        if (tag === 'A' || tag === 'SPAN' || tag === 'BUTTON') return false;

        // 盡量要求命中 Chatter 風格特徵（class 或 data-aura-class）
        const auraClass = el.getAttribute('data-aura-class') || '';
        const cls = el.className || '';
        const hasChatterHint = String(cls).includes('forceChatterStyle') || String(auraClass).includes('forceChatterStyle');
        return hasChatterHint;
    }

    // --- [PATCH] 容器打分：用於「升級」到更正確嘅容器 ---
    function scoreContainer(el) {
        if (!el || !(el instanceof HTMLElement) || !el.isConnected) return -1;

        let score = 0;
        const cls = String(el.className || '');
        const auraClass = String(el.getAttribute('data-aura-class') || '');

        if (el.tagName === 'DIV') score += 2;
        if (cls.includes('forceChatterStyle')) score += 8;
        if (cls.includes('slds-scope')) score += 2;
        if (auraClass.includes('forceChatterStyle')) score += 8;

        // 有無常見內容（唔依賴特定 Salesforce 私有 class，避免版本變動）
        const hasImgs = el.querySelectorAll('img').length;
        if (hasImgs > 0) score += 1;

        // 太細嘅容器通常係 tab/link 區域
        const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
        const area = rect ? (rect.width * rect.height) : 0;
        if (area > 20000) score += 1;

        return score;
    }

    function findFeedContainer(doc) {
        try {
            // 1) 先用穩定 selector 直搵（最可靠）
            for (const sel of FEED_SELECTORS) {
                const el = doc.querySelector(sel);
                if (isValidContainer(el)) return el;
            }

            // 2) fallback：keyword TreeWalker，但命中後向上爬搵「真正 chatter 容器祖先」
            const root = doc.body || doc.documentElement;
            if (!root) return null;

            const kw = cfg.containerKeywords;
            const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
                acceptNode: (n) => {
                    const t = (n.nodeValue || '').trim();
                    if (!t) return NodeFilter.FILTER_REJECT;
                    for (const k of kw) {
                        if (t.includes(k)) return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_REJECT;
                }
            });

            let best = null;
            let bestScore = -1;
            let node, hits = 0;

            while ((node = walker.nextNode()) && hits < 60) {
                hits++;
                let el = node.parentElement;
                if (!el) continue;

                // 命中後向上最多 12 層，搵到符合 chatter 特徵嘅祖先
                let hop = 0;
                while (el && hop < 12 && el !== doc.body) {
                    if (isValidContainer(el)) {
                        const sc = scoreContainer(el);
                        if (sc > bestScore) {
                            bestScore = sc;
                            best = el;
                        }
                        break;
                    }
                    el = el.parentElement;
                    hop++;
                }
            }

            return best;
        } catch (e) {
            return null;
        }
    }

    // --- [PATCH] 允許升級/校正 container（節流避免高頻掃描） ---
    function ensureContainer() {
        const now = Date.now();
        if (now - lastFindTs < FIND_THROTTLE_MS) return;
        lastFindTs = now;

        const found = findFeedContainer(document);
        if (!found) return;

        // 若目前冇 container，或者 found 分數更高 → 升級
        if (!container) {
            container = found;
            console.log(`[${getTimestamp()}] [INFO] [B64 FIX] [Observer] 已找到 Feed 容器:`, container);
            processContainer();
            return;
        }

        const curScore = scoreContainer(container);
        const newScore = scoreContainer(found);

        // 若現有 container 已無效 / 分數偏低，或者新嘅更好 → 替換
        if (!container.isConnected || curScore < 6 || newScore > curScore) {
            container = found;
            console.log(`[${getTimestamp()}] [INFO] [B64 FIX] [Observer] 已找到 Feed 容器:`, container);
            processContainer();
        }
    }

    // =================================================================================
    // SECTION: 核心功能邏輯 (Feature Logic)
    // =================================================================================

    function blockImg(img) {
        if (!cfg.enabled) return false;
        if (!(img instanceof HTMLImageElement)) return false;
        if (img.dataset.__b64Blocked === '1') return false;

        const src = img.getAttribute('src') || img.src || '';
        const srcset = img.getAttribute('srcset') || '';
        if (!shouldBlock(src) && !shouldBlock(srcset)) return false;

        img.dataset.__b64Blocked = '1';
        img.removeAttribute('srcset');
        img.removeAttribute('sizes');
        img.setAttribute('src', cfg.placeholderSvg);

        if (cfg.debug) {
            Stats.blockedImg++;
        }
        return true;
    }

    function stripBg(el) {
        if (!cfg.enabled || !cfg.stripInlineBackground) return false;
        if (!(el instanceof HTMLElement)) return false;

        const styleAttr = el.getAttribute('style');
        if (!styleAttr || !styleAttr.includes('data:image')) return false;

        const bg = el.style.backgroundImage;
        if (bg && bg.includes('data:image')) {
            el.style.backgroundImage = 'none';
            if (cfg.debug) {
                Stats.strippedBg++;
            }
            return true;
        }
        return false;
    }

    function sanitizeTextNode(textNode) {
        if (!cfg.enabled) return false;
        if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return false;
        if (textNode.nodeValue.length < 500) return false;

        const isInside = withinContainer(textNode.parentElement || textNode);
        const t = textNode.nodeValue || '';

        if (!t.includes('data:image')) return false;
        const idx = t.indexOf('data:image');
        const b64Idx = t.indexOf('base64,', idx);
        if (b64Idx === -1) return false;

        const tailLen = t.length - b64Idx;
        if (tailLen < cfg.minDataUrlLength) return false;
        if (!isInside && tailLen < 50000) return false;

        const prefix = t.slice(0, Math.min(b64Idx + 7, 200));
        textNode.nodeValue = `${prefix}[...Base64 已移除 ${tailLen} 字符...]`;

        if (cfg.debug) {
            Stats.sanitizedText++;
            console.log(`[${getTimestamp()}] [DEBUG] [B64 FIX] [Sanitizer] 已淨化文本節點 總計= ${Stats.sanitizedText} 移除長度= ${tailLen}`);
        }
        return true;
    }

    function processContainer() {
        if (!cfg.enabled || !container) return;

        const imgs = container.querySelectorAll('img[src^="data:image"], img[srcset*="data:image"]');
        for (const img of imgs) {
            blockImg(img);
        }

        if (cfg.stripInlineBackground) {
            const styled = container.querySelectorAll('[style*="data:image"]');
            for (const el of styled) {
                stripBg(el);
            }
        }

        const doc = container.ownerDocument;
        const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
        let n, scanned = 0;

        while ((n = walker.nextNode()) && scanned < 3000) {
            sanitizeTextNode(n);
            scanned++;
        }
    }

    function hookLowLevel() {
        const origSet = Element.prototype.setAttribute;

        if (!origSet.__b64Hooked) {
            Element.prototype.setAttribute = function(name, value) {
                try {
                    if (!cfg.enabled) return origSet.call(this, name, value);

                    const n = String(name).toLowerCase();
                    const v = String(value || '');

                    if (this instanceof HTMLImageElement && (n === 'src' || n === 'srcset') && shouldBlock(v)) {
                        this.dataset.__b64Blocked = '1';
                        Stats.blockedImg++;
                        return origSet.call(this, n, cfg.placeholderSvg);
                    }

                    if (cfg.stripInlineBackground && n === 'style' && v.includes('data:image')) {
                        const cleaned = v.replace(/background-image\s*:\s*url\([^)]*data:image[^)]*\)\s*;?/gi, 'background-image:none;');
                        if (cleaned !== v) {
                            Stats.strippedBg++;
                            return origSet.call(this, n, cleaned);
                        }
                    }
                } catch (e) {}

                return origSet.call(this, name, value);
            };

            Element.prototype.setAttribute.__b64Hooked = true;
        }

        const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
        if (desc && desc.set && !desc.set.__b64Hooked) {
            Object.defineProperty(HTMLImageElement.prototype, 'src', {
                get: desc.get,
                set: function(v) {
                    try {
                        if (cfg.enabled) {
                            const s = String(v || '');
                            if (shouldBlock(s)) {
                                this.dataset.__b64Blocked = '1';
                                Stats.blockedImg++;
                                return desc.set.call(this, cfg.placeholderSvg);
                            }
                        }
                    } catch (e) {}

                    return desc.set.call(this, v);
                }
            });

            desc.set.__b64Hooked = true;
        }
    }

    // =================================================================================
    // SECTION: 觀察者與初始化 (Observer & Initialization)
    // =================================================================================

    const observer = new MutationObserver((mutations) => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            container = null;
        }

        if (container && !container.isConnected) {
            container = null;
        }

        // --- [PATCH] 允許容器自動校正/升級 ---
        ensureContainer();

        if (!cfg.enabled) return;

        for (const m of mutations) {
            if (m.type === 'attributes') {
                const t = m.target;
                if (t && t.tagName === 'IMG' && (m.attributeName === 'src' || m.attributeName === 'srcset')) blockImg(t);
                if (cfg.stripInlineBackground && m.attributeName === 'style') stripBg(t);
            } else if (m.type === 'childList') {
                for (const n of m.addedNodes) {
                    if (!n) continue;

                    if (n.nodeType === Node.TEXT_NODE) sanitizeTextNode(n);

                    if (n.nodeType === 1) {
                        const el = n;

                        if (el.tagName === 'IMG') blockImg(el);
                        if (cfg.stripInlineBackground) stripBg(el);

                        const imgs = el.querySelectorAll ? el.querySelectorAll('img[src^="data:image"], img[srcset*="data:image"]') : [];
                        for (const img of imgs) {
                            blockImg(img);
                        }

                        if (cfg.stripInlineBackground && el.querySelectorAll) {
                            const styled = el.querySelectorAll('[style*="data:image"]');
                            for (const s of styled) {
                                stripBg(s);
                            }
                        }

                        if (el.ownerDocument && withinContainer(el)) {
                            const w = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
                            let tn, count = 0;
                            while ((tn = w.nextNode()) && count < 300) {
                                sanitizeTextNode(tn);
                                count++;
                            }
                        }
                    }
                }
            }
        }
    });

    function start() {
        console.log(`[${getTimestamp()}] [INFO] [B64 FIX] [Init] 腳本已加載 - ${new Date().toISOString()}`);

        hookLowLevel();

        // --- [PATCH] 用 ensureContainer 取代 document-start 首輪直接 find（避免太早命中 <a>） ---
        container = null;
        ensureContainer();

        observer.observe(document.documentElement, {
            subtree: true,
            childList: true,
            attributes: true,
            characterData: true,
            attributeFilter: ['src', 'srcset', 'style']
        });

        setTimeout(() => {
            ensureContainer();
        }, 2000);
    }

    if (document.documentElement) {
        start();
    } else {
        new MutationObserver((_, obs) => {
            if (document.documentElement) {
                obs.disconnect();
                start();
            }
        }).observe(document, {
            childList: true,
            subtree: true
        });
    }

})();
