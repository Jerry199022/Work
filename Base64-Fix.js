// ==UserScript==
// @name         永利八達通Case CPU使用率修復
// @namespace    https://tampermonkey.net/
// @version      V4
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

    function findFeedContainer(doc) {
        try {
            const root = doc.body || doc.documentElement;
            if (!root) return null;

            const kw = cfg.containerKeywords;
            const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
                acceptNode: (n) => {
                    const t = (n.nodeValue || '').trim();
                    if (!t) return NodeFilter.FILTER_REJECT;
                    for (const k of kw)
                        if (t.includes(k)) return NodeFilter.FILTER_ACCEPT;
                    return NodeFilter.FILTER_REJECT;
                }
            });

            const hits = [];
            let node;
            while ((node = walker.nextNode())) {
                hits.push(node.parentElement);
                if (hits.length > 50) break;
            }
            if (!hits.length) return null;

            let candidate = hits[0];
            for (let up = 0; up < 8 && candidate && candidate !== doc.body; up++) {
                let count = 0;
                for (const h of hits)
                    if (candidate.contains(h)) count++;
                if (count >= Math.min(8, hits.length)) return candidate;
                candidate = candidate.parentElement;
            }

            let p = hits[0];
            for (let i = 0; i < 4 && p && p.parentElement; i++) p = p.parentElement;
            return p || hits[0];
        } catch (e) {
            return null;
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
        for (const img of imgs) blockImg(img);

        if (cfg.stripInlineBackground) {
            const styled = container.querySelectorAll('[style*="data:image"]');
            for (const el of styled) stripBg(el);
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
        if (!container) {
            container = findFeedContainer(document);
            if (container) {
                console.log(`[${getTimestamp()}] [INFO] [B64 FIX] [Observer] 已找到 Feed 容器:`, container);
                processContainer();
            }
        }

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
                        for (const img of imgs) blockImg(img);

                        if (cfg.stripInlineBackground && el.querySelectorAll) {
                            const styled = el.querySelectorAll('[style*="data:image"]');
                            for (const s of styled) stripBg(s);
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

        container = findFeedContainer(document);
        if (container) {
            processContainer();
        }

        observer.observe(document.documentElement, {
            subtree: true,
            childList: true,
            attributes: true,
            characterData: true,
            attributeFilter: ['src', 'srcset', 'style']
        });

        setTimeout(() => {
            if (!container) container = findFeedContainer(document);
            if (container) processContainer();
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

