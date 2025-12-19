// ==UserScript==
// @name         CEC功能強化
// @namespace    CEC Enhanced
// @version      V59
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
V56 > V57
更新內容：
-自動繁簡轉換
-快過期case提示

V55 > V56
更新內容：
-添加Suspended A/C识别
-添加回覆case繁简自动切换
-优化脚本执行逻辑

V54 > V55
更新內容：
-設置面板添加 選擇模版插入位置 選項

V53 > V54
更新內容：
-優化提示已回覆過的 Case 功能
-優化腳本對new case性能損耗
-優化Close this Case (auto)
*/

(function() {
    'use strict';

    // =================================================================================
    // SECTION: 專業級日誌記錄器 (Professional Logger)
    // =================================================================================

    /**
     * @description 一個專業的、可配置的日誌記錄器，提供帶時間戳、級別和模塊的結構化輸出。
     */
    const Log = {
        levels: {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3,
            NONE: 4
        },
        level: 0, // 默認日誌級別：INFO。設為 0 可查看 DEBUG 信息。

        /**
         * @private
         * @description 內部日誌處理函數，格式化並輸出日誌。
         * @param {number} level - 日誌級別枚舉值。
         * @param {string} levelStr - 日誌級別的字符串表示。
         * @param {string} module - 產生日誌的功能模塊名。
         * @param {string} message - 日誌消息。
         * @param {Function} logFn - 用於輸出的 console 函數 (e.g., console.log)。
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
    // SECTION: 全局配置與狀態管理 (Global Configuration & State)
    // =================================================================================

    /**
     * @description 存儲腳本所有功能的默認配置。
     *              當 GM 存儲中沒有對應值時，將使用此處的默認值。
     */
        const DEFAULTS = {
        notifyOnRepliedCaseEnabled: false,
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
        templateInsertionMode: 'logo', // [新增] 模板插入模式，'logo' 或 'cursor'
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
     * @description 存儲性能相關的配置，如輪詢間隔和防抖延時。
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
    let globalScannerId = null;
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
     * @description 從 URL 字符串中安全地提取 18 位的 Salesforce Case ID。
     * @param {string} urlString - 包含 Case ID 的 URL。
     * @returns {string|null} 成功則返回 Case ID 字符串，否則返回 null。
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
     * @description 規範化 Case URL，移除查詢參數和哈希值，確保緩存鍵的一致性。
     * @param {string} urlString - 原始的 URL 字符串。
     * @returns {string|null} 規範化後的 URL，如果輸入無效則返回 null。
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
     * @description 檢查一個元素是否在DOM中實際可見。
     * @param {HTMLElement} el - 要檢查的元素。
     * @returns {boolean} 如果元素可見則返回 true。
     */
    function isElementVisible(el) {
        return el.offsetParent !== null;
    }

    /**
     * @description 遞歸地在根節點及其所有 Shadow DOM 中查找單個可見的元素。
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
     * @description 遞歸地在根節點及其所有 Shadow DOM 中查找所有可見的元素。
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
     * @param {number} [timeout=10000] - 超時時間（毫秒）。
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
            }, 500); // 500ms: 輪詢間隔，平衡性能與響應速度。
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
     * @description [新增] 繁簡轉換的核心引擎，採用高效的字符串索引映射。
     */
    const ChineseConverter = {
        s_chars: null,
        t_chars: null,
        s2t_map: null,
        t2s_map: null,

        // 初始化數據，採用 chinese-s2t 的高效字符串索引映射方式
        init: function() {
            this.s_chars = '钟系万与丑专业丛东丝丢两严丧个丬丰临为丽举么义乌乐乔习乡书买乱争于亏云亘亚产亩亲亵亸亿仅从仑仓仪们价众优伙会伛伞伟传伤伥伦伧伪伫体余佣佥侠侣侥侦侧侨侩侪侬俣俦俨俩俪俭债倾偬偻偾偿傥傧储傩儿兑兖党兰关兴兹养兽冁内冈册写军农冢冯冲决况冻净凄凉凌减凑凛几凤凫凭凯击凼凿刍划刘则刚创删别刬刭刽刿剀剂剐剑剥剧劝办务劢动励劲劳势勋勐勚匀匦匮区医华协单卖卢卤卧卫却卺厂厅历厉压厌厍厕厢厣厦厨厩厮县参叆叇双发变叙叠叶号叹叽吁后吓吕吗吣吨听启吴呒呓呕呖呗员呙呛呜咏咔咙咛咝咤咴咸哌响哑哒哓哔哕哗哙哜哝哟唛唝唠唡唢唣唤唿啧啬啭啮啰啴啸喷喽喾嗫呵嗳嘘嘤嘱噜噼嚣嚯团园囱围囵国图圆圣圹场坂坏块坚坛坜坝坞坟坠垄垅垆垒垦垧垩垫垭垯垱垲垴埘埙埚埝埯堑堕塆墙壮声壳壶壸处备复够头夸夹夺奁奂奋奖奥妆妇妈妩妪妫姗姜娄娅娆娇娈娱娲娴婳婴婵婶媪嫒嫔嫱嬷孙学孪宁宝实宠审宪宫宽宾寝对寻导寿将尔尘尧尴尸尽层屃屉届属屡屦屿岁岂岖岗岘岙岚岛岭岳岽岿峃峄峡峣峤峥峦崂崃崄崭嵘嵚嵛嵝嵴巅巩巯币帅师帏帐帘帜带帧帮帱帻帼幂幞干并广庄庆庐庑库应庙庞废庼廪开异弃张弥弪弯弹强归当录彟彦彻径徕御忆忏忧忾怀态怂怃怄怅怆怜总怼怿恋恳恶恸恹恺恻恼恽悦悫悬悭悯惊惧惨惩惫惬惭惮惯愍愠愤愦愿慑慭憷懑懒懔戆戋戏戗战戬户扎扑扦执扩扪扫扬扰抚抛抟抠抡抢护报担拟拢拣拥拦拧拨择挂挚挛挜挝挞挟挠挡挢挣挤挥挦捞损捡换捣据捻掳掴掷掸掺掼揸揽揿搀搁搂搅携摄摅摆摇摈摊撄撑撵撷撸撺擞攒敌敛数斋斓斗斩断无旧时旷旸昙昼昽显晋晒晓晔晕晖暂暧札术朴机杀杂权条来杨杩杰极构枞枢枣枥枧枨枪枫枭柜柠柽栀栅标栈栉栊栋栌栎栏树栖样栾桊桠桡桢档桤桥桦桧桨桩梦梼梾检棂椁椟椠椤椭楼榄榇榈榉槚槛槟槠横樯樱橥橱橹橼檐檩欢欤欧歼殁殇残殒殓殚殡殴毁毂毕毙毡毵氇气氢氩氲汇汉污汤汹沓沟没沣沤沥沦沧沨沩沪沵泞泪泶泷泸泺泻泼泽泾洁洒洼浃浅浆浇浈浉浊测浍济浏浐浑浒浓浔浕涂涌涛涝涞涟涠涡涢涣涤润涧涨涩淀渊渌渍渎渐渑渔渖渗温游湾湿溃溅溆溇滗滚滞滟滠满滢滤滥滦滨滩滪漤潆潇潋潍潜潴澜濑濒灏灭灯灵灾灿炀炉炖炜炝点炼炽烁烂烃烛烟烦烧烨烩烫烬热焕焖焘煅煳熘爱爷牍牦牵牺犊犟状犷犸犹狈狍狝狞独狭狮狯狰狱狲猃猎猕猡猪猫猬献獭玑玙玚玛玮环现玱玺珉珏珐珑珰珲琎琏琐琼瑶瑷璇璎瓒瓮瓯电画畅畲畴疖疗疟疠疡疬疮疯疱疴痈痉痒痖痨痪痫痴瘅瘆瘗瘘瘪瘫瘾瘿癞癣癫癯皑皱皲盏盐监盖盗盘眍眦眬着睁睐睑瞒瞩矫矶矾矿砀码砖砗砚砜砺砻砾础硁硅硕硖硗硙硚确硷碍碛碜碱碹磙礼祎祢祯祷祸禀禄禅离秃秆种积称秽秾稆税稣稳穑穷窃窍窑窜窝窥窦窭竖竞笃笋笔笕笺笼笾筑筚筛筜筝筹签简箓箦箧箨箩箪箫篑篓篮篱簖籁籴类籼粜粝粤粪粮糁糇紧絷纟纠纡红纣纤纥约级纨纩纪纫纬纭纮纯纰纱纲纳纴纵纶纷纸纹纺纻纼纽纾线绀绁绂练组绅细织终绉绊绋绌绍绎经绐绑绒结绔绕绖绗绘给绚绛络绝绞统绠绡绢绣绤绥绦继绨绩绪绫绬续绮绯绰绱绲绳维绵绶绷绸绹绺绻综绽绾绿缀缁缂缃缄缅缆缇缈缉缊缋缌缍缎缏缐缑缒缓缔缕编缗缘缙缚缛缜缝缞缟缠缡缢缣缤缥缦缧缨缩缪缫缬缭缮缯缰缱缲缳缴缵罂网罗罚罢罴羁羟羡翘翙翚耢耧耸耻聂聋职聍联聩聪肃肠肤肷肾肿胀胁胆胜胧胨胪胫胶脉脍脏脐脑脓脔脚脱脶脸腊腌腘腭腻腼腽腾膑臜舆舣舰舱舻艰艳艹艺节芈芗芜芦苁苇苈苋苌苍苎苏苘苹茎茏茑茔茕茧荆荐荙荚荛荜荞荟荠荡荣荤荥荦荧荨荩荪荫荬荭荮药莅莜莱莲莳莴莶获莸莹莺莼萚萝萤营萦萧萨葱蒇蒉蒋蒌蓝蓟蓠蓣蓥蓦蔷蔹蔺蔼蕲蕴薮藁藓虏虑虚虫虬虮虽虾虿蚀蚁蚂蚕蚝蚬蛊蛎蛏蛮蛰蛱蛲蛳蛴蜕蜗蜡蝇蝈蝉蝎蝼蝾螀螨蟏衅衔补衬衮袄袅袆袜袭袯装裆裈裢裣裤裥褛褴襁襕见观觃规觅视觇览觉觊觋觌觍觎觏觐觑觞触觯詟誉誊讠计订讣认讥讦讧讨让讪讫训议讯记讱讲讳讴讵讶讷许讹论讻讼讽设访诀证诂诃评诅识诇诈诉诊诋诌词诎诏诐译诒诓诔试诖诗诘诙诚诛诜话诞诟诠诡询诣诤该详诧诨诩诪诫诬语诮误诰诱诲诳说诵诶请诸诹诺读诼诽课诿谀谁谂调谄谅谆谇谈谊谋谌谍谎谏谐谑谒谓谔谕谖谗谘谙谚谛谜谝谞谟谠谡谢谣谤谥谦谧谨谩谪谫谬谭谮谯谰谱谲谳谴谵谶谷豮贝贞负贠贡财责贤败账货质贩贪贫贬购贮贯贰贱贲贳贴贵贶贷贸费贺贻贼贽贾贿赀赁赂赃资赅赆赇赈赉赊赋赌赍赎赏赐赑赒赓赔赕赖赗赘赙赚赛赜赝赞赟赠赡赢赣赪赵赶趋趱趸跃跄跖跞践跶跷跸跹跻踊踌踪踬踯蹑蹒蹰蹿躏躜躯车轧轨轩轪轫转轭轮软轰轱轲轳轴轵轶轷轸轹轺轻轼载轾轿辀辁辂较辄辅辆辇辈辉辊辋辌辍辎辏辐辑辒输辔辕辖辗辘辙辚辞辩辫边辽达迁过迈运还这进远违连迟迩迳迹适选逊递逦逻遗遥邓邝邬邮邹邺邻郁郄郏郐郑郓郦郧郸酝酦酱酽酾酿释里鉅鉴銮錾钆钇针钉钊钋钌钍钎钏钐钑钒钓钔钕钖钗钘钙钚钛钝钞钟钠钡钢钣钤钥钦钧钨钩钪钫钬钭钮钯钰钱钲钳钴钵钶钷钸钹钺钻钼钽钾钿铀铁铂铃铄铅铆铈铉铊铋铍铎铏铐铑铒铕铗铘铙铚铛铜铝铞铟铠铡铢铣铤铥铦铧铨铪铫铬铭铮铯铰铱铲铳铴铵银铷铸铹铺铻铼铽链铿销锁锂锃锄锅锆锇锈锉锊锋锌锍锎锏锐锑锒锓锔锕锖锗错锚锜锞锟锠锡锢锣锤锥锦锨锩锫锬锭键锯锰锱锲锳锴锵锶锷锸锹锺锻锼锽锾锿镀镁镂镃镆镇镈镉镊镌镍镎镏镐镑镒镕镖镗镙镚镛镜镝镞镟镠镡镢镣镤镥镦镧镨镩镪镫镬镭镮镯镰镱镲镳镴镶长门闩闪闫闬闭问闯闰闱闲闳间闵闶闷闸闹闺闻闼闽闾闿阀阁阂阃阄阅阆阇阈阉阊阋阌阍阎阏阐阑阒阓阔阕阖阗阘阙阚阛队阳阴阵阶际陆陇陈陉陕陧陨险随隐隶隽难雏雠雳雾霁霉霭靓静靥鞑鞒鞯鞴韦韧韨韩韪韫韬韵页顶顷顸项顺须顼顽顾顿颀颁颂颃预颅领颇颈颉颊颋颌颍颎颏颐频颒颓颔颕颖颗题颙颚颛颜额颞颟颠颡颢颣颤颥颦颧风飏飐飑飒飓飔飕飖飗飘飙飚飞飨餍饤饥饦饧饨饩饪饫饬饭饮饯饰饱饲饳饴饵饶饷饸饹饺饻饼饽饾饿馀馁馂馃馄馅馆馇馈馉馊馋馌馍馎馏馐馑馒馓馔馕马驭驮驯驰驱驲驳驴驵驶驷驸驹驺驻驼驽驾驿骀骁骂骃骄骅骆骇骈骉骊骋验骍骎骏骐骑骒骓骔骕骖骗骘骙骚骛骜骝骞骟骠骡骢骣骤骥骦骧髅髋髌鬓魇魉鱼鱽鱾鱿鲀鲁鲂鲄鲅鲆鲇鲈鲉鲊鲋鲌鲍鲎鲏鲐鲑鲒鲓鲔鲕鲖鲗鲘鲙鲚鲛鲜鲝鲞鲟鲠鲡鲢鲣鲤鲥鲦鲧鲨鲩鲪鲫鲬鲭鲮鲯鲰鲱鲲鲳鲴鲵鲶鲷鲸鲹鲺鲻鲼鲽鲾鲿鳀鳁鳂鳃鳄鳅鳆鳇鳈鳉鳊鳋鳌鳍鳎鳏鳐鳑鳒鳓鳔鳕鳖鳗鳘鳙鳛鳜鳝鳞鳟鳠鳡鳢鳣鸟鸠鸡鸢鸣鸤鸥鸦鸧鸨鸩鸪鸫鸬鸭鸮鸯鸰鸱鸲鸳鸴鸵鸶鸷鸸鸹鸺鸻鸼鸽鸾鸿鹀鹁鹂鹃鹄鹅鹆鹇鹈鹉鹊鹋鹌鹍鹎鹏鹐鹑鹒鹓鹔鹕鹖鹗鹘鹚鹛鹜鹝鹞鹟鹠鹡鹢鹣鹤鹥鹦鹧鹨鹩鹪鹫鹬鹭鹯鹰鹱鹲鹳鹴鹾麦麸黄黉黡黩黪黾鼋鼌鼍鼗鼹齄齐齑齿龀龁龂龃龄龅龆龇龈龉龊龋龌龙龚龛龟志制咨只里范松没尝尝闹面准钟别闲乾尽脏拼';
            this.t_chars = '鐘繫萬與醜專業叢東絲丟兩嚴喪個丬豐臨爲麗舉麼義烏樂喬習鄉書買亂爭於虧雲亙亞產畝親褻嚲億僅從侖倉儀們價衆優夥會傴傘偉傳傷倀倫傖僞佇體餘傭僉俠侶僥偵側僑儈儕儂俁儔儼倆儷儉債傾傯僂僨償儻儐儲儺兒兌兗黨蘭關興茲養獸囅內岡冊寫軍農冢馮沖決況凍淨淒涼凌減湊凜幾鳳鳧憑凱擊凼鑿芻劃劉則剛創刪別剗剄劊劌剴劑剮劍剝劇勸辦務勱動勵勁勞勢勳勐勩勻匭匱區醫華協單賣盧滷臥衛卻巹廠廳歷厲壓厭厙廁廂厴廈廚廄廝縣參靉靆雙發變敘疊葉號嘆嘰籲後嚇呂嗎唚噸聽啓吳嘸囈嘔嚦唄員咼嗆嗚詠咔嚨嚀噝吒咴鹹哌響啞噠嘵嗶噦譁噲嚌噥喲嘜嗊嘮啢嗩唣喚唿嘖嗇囀齧囉嘽嘯噴嘍嚳囁呵噯噓嚶囑嚕噼囂嚯團園囪圍圇國圖圓聖壙場阪壞塊堅壇壢壩塢墳墜壟壠壚壘墾垧堊墊埡墶壋塏堖塒壎堝埝垵塹墮壪牆壯聲殼壺壼處備復夠頭誇夾奪奩奐奮獎奧妝婦媽嫵嫗嬀姍姜婁婭嬈嬌孌娛媧嫺嫿嬰嬋嬸媼嬡嬪嬙嬤孫學孿寧寶實寵審憲宮寬賓寢對尋導壽將爾塵堯尷屍盡層屓屜屆屬屢屨嶼歲豈嶇崗峴嶴嵐島嶺嶽崬巋嶨嶧峽嶢嶠崢巒嶗崍嶮嶄嶸嶔嵛嶁嵴巔鞏巰幣帥師幃帳簾幟帶幀幫幬幘幗冪襆幹並廣莊慶廬廡庫應廟龐廢廎廩開異棄張彌弳彎彈強歸當錄彠彥徹徑徠御憶懺憂愾懷態慫憮慪悵愴憐總懟懌戀懇惡慟懨愷惻惱惲悅愨懸慳憫驚懼慘懲憊愜慚憚慣愍慍憤憒願懾憖憷懣懶懍戇戔戲戧戰戩戶扎撲扦執擴捫掃揚擾撫拋摶摳掄搶護報擔擬攏揀擁攔擰撥擇掛摯攣掗撾撻挾撓擋撟掙擠揮撏撈損撿換搗據捻擄摑擲撣摻摜揸攬撳攙擱摟攪攜攝攄擺搖擯攤攖撐攆擷擼攛擻攢敵斂數齋斕鬥斬斷無舊時曠暘曇晝曨顯晉曬曉曄暈暉暫曖札術樸機殺雜權條來楊榪傑極構樅樞棗櫪梘棖槍楓梟櫃檸檉梔柵標棧櫛櫳棟櫨櫟欄樹棲樣欒桊椏橈楨檔榿橋樺檜槳樁夢檮棶檢櫺槨櫝槧欏橢樓欖櫬櫚櫸檟檻檳櫧橫檣櫻櫫櫥櫓櫞檐檁歡歟歐殲歿殤殘殞殮殫殯毆毀轂畢斃氈毿氌氣氫氬氳匯漢污湯洶沓溝沒灃漚瀝淪滄渢潙滬沵濘淚澩瀧瀘濼瀉潑澤涇潔灑窪浹淺漿澆湞溮濁測澮濟瀏滻渾滸濃潯濜塗涌濤澇淶漣潿渦溳渙滌潤澗漲澀澱淵淥漬瀆漸澠漁瀋滲溫遊灣溼潰濺漵漊潷滾滯灩灄滿瀅濾濫灤濱灘澦漤瀠瀟瀲濰潛瀦瀾瀨瀕灝滅燈靈災燦煬爐燉煒熗點煉熾爍爛烴燭煙煩燒燁燴燙燼熱煥燜燾煅煳熘愛爺牘犛牽犧犢犟狀獷獁猶狽狍獮獰獨狹獅獪猙獄猻獫獵獼玀豬貓蝟獻獺璣璵瑒瑪瑋環現瑲璽珉珏琺瓏璫琿璡璉瑣瓊瑤璦璇瓔瓚甕甌電畫暢畲疇癤療瘧癘瘍癧瘡瘋皰痾癰痙癢瘂癆瘓癇癡癉瘮瘞瘻癟癱癮癭癩癬癲癯皚皺皸盞鹽監蓋盜盤瞘眥矓着睜睞瞼瞞矚矯磯礬礦碭碼磚硨硯碸礪礱礫礎硜硅碩硤磽磑礄確礆礙磧磣鹼碹磙禮禕禰禎禱禍稟祿禪離禿稈種積稱穢穠穭稅穌穩穡窮竊竅窯竄窩窺竇窶豎競篤筍筆筧箋籠籩築篳篩簹箏籌籤簡籙簀篋籜籮簞簫簣簍籃籬籪籟糴類秈糶糲粵糞糧糝餱緊縶糹糾紆紅紂纖紇約級紈纊紀紉緯紜紘純紕紗綱納紝縱綸紛紙紋紡紵紖紐紓線紺紲紱練組紳細織終縐絆紼絀紹繹經紿綁絨結絝繞絰絎繪給絢絳絡絕絞統綆綃絹繡綌綏絛繼綈績緒綾緓續綺緋綽鞝緄繩維綿綬繃綢綯綹綣綜綻綰綠綴緇緙緗緘緬纜緹緲緝縕繢緦綞緞緶線緱縋緩締縷編緡緣縉縛縟縝縫縗縞纏縭縊縑繽縹縵縲纓縮繆繅纈繚繕繒繮繾繰繯繳纘罌網羅罰罷羆羈羥羨翹翽翬耮耬聳恥聶聾職聹聯聵聰肅腸膚肷腎腫脹脅膽勝朧腖臚脛膠脈膾髒臍腦膿臠腳脫腡臉臘醃膕齶膩靦膃騰臏臢輿艤艦艙艫艱豔艹藝節羋薌蕪蘆蓯葦藶莧萇蒼苧蘇檾蘋莖蘢蔦塋煢繭荊薦薘莢蕘蓽蕎薈薺蕩榮葷滎犖熒蕁藎蓀蔭蕒葒葤藥蒞莜萊蓮蒔萵薟獲蕕瑩鶯蓴蘀蘿螢營縈蕭薩蔥蕆蕢蔣蔞藍薊蘺蕷鎣驀薔蘞藺藹蘄蘊藪藁蘚虜慮虛蟲虯蟣雖蝦蠆蝕蟻螞蠶蠔蜆蠱蠣蟶蠻蟄蛺蟯螄蠐蛻蝸蠟蠅蟈蟬蠍螻蠑螿蟎蠨釁銜補襯袞襖嫋褘襪襲襏裝襠褌褳襝褲襉褸襤襁襴見觀覎規覓視覘覽覺覬覡覿覥覦覯覲覷觴觸觶讋譽謄訁計訂訃認譏訐訌討讓訕訖訓議訊記訒講諱謳詎訝訥許訛論訩訟諷設訪訣證詁訶評詛識詗詐訴診詆謅詞詘詔詖譯詒誆誄試詿詩詰詼誠誅詵話誕詬詮詭詢詣諍該詳詫諢詡譸誡誣語誚誤誥誘誨誑說誦誒請諸諏諾讀諑誹課諉諛誰諗調諂諒諄誶談誼謀諶諜謊諫諧謔謁謂諤諭諼讒諮諳諺諦謎諞諝謨讜謖謝謠謗諡謙謐謹謾謫譾謬譚譖譙讕譜譎讞譴譫讖谷豶貝貞負貟貢財責賢敗賬貨質販貪貧貶購貯貫貳賤賁貰貼貴貺貸貿費賀貽賊贄賈賄貲賃賂贓資賅贐賕賑賚賒賦賭齎贖賞賜贔賙賡賠賧賴賵贅賻賺賽賾贗贊贇贈贍贏贛赬趙趕趨趲躉躍蹌跖躒踐躂蹺蹕躚躋踊躊蹤躓躑躡蹣躕躥躪躦軀車軋軌軒軑軔轉軛輪軟轟軲軻轤軸軹軼軤軫轢軺輕軾載輊轎輈輇輅較輒輔輛輦輩輝輥輞輬輟輜輳輻輯轀輸轡轅轄輾轆轍轔辭辯辮邊遼達遷過邁運還這進遠違連遲邇逕跡適選遜遞邐邏遺遙鄧鄺鄔郵鄒鄴鄰鬱郄郟鄶鄭鄆酈鄖鄲醞醱醬釅釃釀釋裏鉅鑑鑾鏨釓釔針釘釗釙釕釷釺釧釤鈒釩釣鍆釹鍚釵鈃鈣鈈鈦鈍鈔鍾鈉鋇鋼鈑鈐鑰欽鈞鎢鉤鈧鈁鈥鈄鈕鈀鈺錢鉦鉗鈷鉢鈳鉕鈽鈸鉞鑽鉬鉭鉀鈿鈾鐵鉑鈴鑠鉛鉚鈰鉉鉈鉍鈹鐸鉶銬銠鉺銪鋏鋣鐃銍鐺銅鋁銱銦鎧鍘銖銑鋌銩銛鏵銓鉿銚鉻銘錚銫鉸銥鏟銃鐋銨銀銣鑄鐒鋪鋙錸鋱鏈鏗銷鎖鋰鋥鋤鍋鋯鋨鏽銼鋝鋒鋅鋶鐦鐗銳銻鋃鋟鋦錒錆鍺錯錨錡錁錕錩錫錮鑼錘錐錦杴錈錇錟錠鍵鋸錳錙鍥鍈鍇鏘鍶鍔鍤鍬鍾鍛鎪鍠鍰鎄鍍鎂鏤鎡鏌鎮鎛鎘鑷鐫鎳鎿鎦鎬鎊鎰鎔鏢鏜鏍鏰鏞鏡鏑鏃鏇鏐鐔钁鐐鏷鑥鐓鑭鐠鑹鏹鐙鑊鐳鐶鐲鐮鐿鑔鑣鑞鑲長門閂閃閆閈閉問闖閏闈閒閎間閔閌悶閘鬧閨聞闥閩閭闓閥閣閡閫鬮閱閬闍閾閹閶鬩閿閽閻閼闡闌闃闠闊闋闔闐闒闕闞闤隊陽陰陣階際陸隴陳陘陝隉隕險隨隱隸雋難雛讎靂霧霽黴靄靚靜靨韃鞽韉鞴韋韌韍韓韙韞韜韻頁頂頃頇項順須頊頑顧頓頎頒頌頏預顱領頗頸頡頰頲頜潁熲頦頤頻頮頹頷頴穎顆題顒顎顓顏額顳顢顛顙顥纇顫顬顰顴風颺颭颮颯颶颸颼颻飀飄飆飈飛饗饜飣飢飥餳飩餼飪飫飭飯飲餞飾飽飼飿飴餌饒餉餄餎餃餏餅餑餖餓餘餒餕餜餛餡館餷饋餶餿饞饁饃餺餾饈饉饅饊饌饢馬馭馱馴馳驅馹駁驢駔駛駟駙駒騶駐駝駑駕驛駘驍罵駰驕驊駱駭駢驫驪騁驗騂駸駿騏騎騍騅騌驌驂騙騭騤騷騖驁騮騫騸驃騾驄驏驟驥驦驤髏髖髕鬢魘魎魚魛魢魷魨魯魴魺鮁鮃鮎鱸鮋鮓鮒鮊鮑鱟鮍鮐鮭鮚鮳鮪鮞鮦鰂鮜鱠鱭鮫鮮鮺鯗鱘鯁鱺鰱鰹鯉鰣鰷鯀鯊鯇鮶鯽鯒鯖鯪鯕鯫鯡鯤鯧鯝鯢鮎鯛鯨鰺鯴鯔鱝鰈鰏鱨鯷鰮鰃鰓鱷鰍鰒鰉鰁鱂鯿鰠鰲鰭鰨鰥鰩鰟鰜鰳鰾鱈鱉鰻鰵鱅鰼鱖鱔鱗鱒鱯鱤鱧鱣鳥鳩雞鳶鳴鳲鷗鴉鶬鴇鴆鴣鶇鸕鴨鴞鴦鴒鴟鴝鴛鷽鴕鷥鷙鴯鴰鵂鴴鵃鴿鸞鴻鵐鵓鸝鵑鵠鵝鵒鷳鵜鵡鵲鶓鵪鵾鵯鵬鵮鶉鶊鵷鷫鶘鶡鶚鶻鶿鶥鶩鷊鷂鶲鶹鶺鷁鶼鶴鷖鸚鷓鷚鷯鷦鷲鷸鷺鸇鷹鸌鸏鸛鸘鹺麥麩黃黌黶黷黲黽黿鼂鼉鞀鼴齇齊齏齒齔齕齗齟齡齙齠齜齦齬齪齲齷龍龔龕龜志制諮只裏範鬆沒嚐嚐鬧面準鍾別閒乾盡髒拼';

            // 延遲生成映射表，僅在首次使用時創建
            this.s2t_map = null;
            this.t2s_map = null;
        },

        getS2TMap: function() {
            if (!this.s2t_map) {
                this.s2t_map = {};
                for (let i = 0; i < this.s_chars.length; i++) {
                    this.s2t_map[this.s_chars[i]] = this.t_chars[i];
                }
            }
            return this.s2t_map;
        },

        getT2SMap: function() {
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
         * @param {string} text - 需要轉換的文本.
         * @param {'s2t'|'t2s'} mode - 轉換模式.
         * @returns {string} 轉換後的文本.
         */
        convert: function(text, mode) {
            if (!text) return '';
            const map = (mode === 's2t') ? this.getS2TMap() : this.getT2SMap();
            let result = '';
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                result += map[char] || char;
            }
            return result;
        }
    };

    // [新增] 初始化繁簡轉換引擎
    ChineseConverter.init();

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
     * @description 模擬用戶在輸入框中輸入內容，觸發相關的 DOM 事件。
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
     * @description 等待一個按鈕變為可點擊狀態（通常是 aria-disabled="false"）。
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

    /**
     * @description 將時間戳格式化為 "X 小時 Y 分鐘前" 的詳細字符串。
     * @param {number} timestamp - 過去的某個時間點的時間戳 (毫秒)。
     * @returns {string} 格式化後的時間差字符串。
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
     * @description 將時間戳格式化為 "（X 分鐘前）" 的簡潔字符串，用於列表頁。
     * @param {number} timestamp - 過去的某個時間點的時間戳 (毫秒)。
     * @returns {string} 格式化後的時間差字符串。
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
     * @description 檢查當前 Case 是否在近期被回覆過，如果啟用該功能，則觸發大型通知。
     * @param {string} caseUrl - 當前 Case 的 URL。
     */
    function checkAndNotifyForRecentSend(caseUrl) {
        if (!GM_getValue('notifyOnRepliedCaseEnabled', DEFAULTS.notifyOnRepliedCaseEnabled)) {
            return;
        }

        const SEND_BUTTON_CACHE_KEY = 'sendButtonClickLog';
        const CACHE_TTL_MS = 10 * 60 * 60 * 1000; // 10小時: 已回覆記錄的緩存有效期。

        const caseId = getCaseIdFromUrl(caseUrl);
        if (!caseId) {
            Log.warn('Feature.NotifyReplied', `無法從 URL (${caseUrl}) 提取 Case ID，跳過近期處理檢查。`);
            return;
        }

        const cache = GM_getValue(SEND_BUTTON_CACHE_KEY, {});
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
     * @description 在頁面中央顯示一個可自定義尺寸的全局通知。
     *              [修正版] 重構了關閉邏輯，確保點擊遮罩層可提前關閉通知的功能正常生效。
     * @param {string} message - 要顯示的通知消息。
     * @param {object} [options={}] - 一個包含自定義選項的對象。
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

        // 定義一個統一的、只執行一次的關閉函數
        const dismissNotification = () => {
            if (isDismissed) return; // 防止重複執行
            isDismissed = true;

            // 清理資源：定時器和事件監聽器
            clearTimeout(autoDismissTimer);
            overlay.removeEventListener('click', dismissNotification);

            // 執行關閉動畫和 DOM 移除
            overlay.classList.remove('show');
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 300); // 300ms: 等待淡出動畫完成。
        };

        // 綁定定時器和點擊事件
        autoDismissTimer = setTimeout(dismissNotification, 1800); // 1800ms: 通知顯示的總時長。
        overlay.addEventListener('click', dismissNotification);

        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.classList.add('show');
        });
    }


    // =================================================================================
    // SECTION: 樣式注入與UI創建 (Styles & UI)
    // =================================================================================

    /**
     * @description 向頁面注入腳本所需的全局自定義CSS樣式。
     *              [修正版] 移除了 .cec-global-completion-overlay 的 pointer-events: none 樣式，以允許點擊關閉。
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
                /* [核心修正] 已移除 pointer-events: none; */
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
                    </div>
                    <div id="cec-settings-toast" class="cec-settings-toast">設置已保存</div>
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
            toastTimer = setTimeout(() => toast.classList.remove('show'), 2000); // 2000ms: toast 顯示時長。
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

        const notifyOnRepliedCaseToggle = document.getElementById('notifyOnRepliedCaseToggle');
        notifyOnRepliedCaseToggle.checked = GM_getValue('notifyOnRepliedCaseEnabled', DEFAULTS.notifyOnRepliedCaseEnabled);
        notifyOnRepliedCaseToggle.onchange = () => {
            const value = notifyOnRepliedCaseToggle.checked;
            GM_setValue('notifyOnRepliedCaseEnabled', value);
            Log.info('UI.Settings', `設置已保存: notifyOnRepliedCaseEnabled = ${value}`);
            showToast();
        };

        const highlightExpiringCasesToggle = document.getElementById('highlightExpiringCasesToggle');
        highlightExpiringCasesToggle.checked = GM_getValue('highlightExpiringCasesEnabled', false); // 默認為關閉
        highlightExpiringCasesToggle.onchange = () => {
            const value = highlightExpiringCasesToggle.checked;
            GM_setValue('highlightExpiringCasesEnabled', value);
            Log.info('UI.Settings', `設置已保存: highlightExpiringCasesEnabled = ${value}`);
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
        insertionModeGroup.querySelector(`input[value="${currentInsertionMode}"]`).checked = true;
        insertionModeGroup.addEventListener('change', (e) => {
            if (e.target.name === 'insertionMode') {
                const value = e.target.value;
                GM_setValue('templateInsertionMode', value);
                Log.info('UI.Settings', `設置已保存: templateInsertionMode = ${value}`);
                showToast();
            }
        });

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
            Log.info('UI.Settings', `設置已保存: cleanModeEnabled = ${value}`);
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
                Log.info('UI.Settings', `設置已保存: cleanModeUserConfig updated for ${e.target.dataset.id}`);
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
                Log.info('UI.Settings', `"組件屏蔽" 配置已恢復為默認值。`);
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
                Log.info('UI.Settings', `設置已保存: accountHighlightMode = ${value}`);
                showToast();
            }
        });

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

        const migrateAutoFillTexts = () => {
            let settings = GM_getValue('iwtAutoFillTexts', DEFAULTS.iwtAutoFillTexts);
            let changed = false;
            for (const key in settings) {
                if (typeof settings[key] === 'string') {
                    settings[key] = [settings[key]];
                    changed = true;
                }
            }
            if (changed) {
                GM_setValue('iwtAutoFillTexts', settings);
                Log.info('UI.Settings', '自動化評論文本設置已成功遷移到新格式。');
            }
            return settings;
        };

        let autoFillTexts = migrateAutoFillTexts();

        const renderCommentList = (key, listElement) => {
            listElement.innerHTML = '';
            const items = autoFillTexts[key] || [];
            items.forEach((text, index) => {
                const li = document.createElement('li');
                li.className = 'cec-settings-comment-item';
                li.innerHTML = `
                    <input type="text" class="cec-settings-input" data-index="${index}" value="${text}">
                    <button class="cec-settings-delete-comment-button" data-index="${index}" title="刪除">&times;</button>
                `;
                listElement.appendChild(li);
            });
        };

        const setupCommentListHandlers = (key, listElement, addButton) => {
            renderCommentList(key, listElement);

            addButton.addEventListener('click', () => {
                autoFillTexts[key].push('');
                GM_setValue('iwtAutoFillTexts', autoFillTexts);
                renderCommentList(key, listElement);
                showToast();
            });

            listElement.addEventListener('change', (e) => {
                if (e.target.tagName === 'INPUT') {
                    const index = parseInt(e.target.dataset.index, 10);
                    autoFillTexts[key][index] = e.target.value;
                    GM_setValue('iwtAutoFillTexts', autoFillTexts);
                    showToast();
                }
            });

            listElement.addEventListener('click', (e) => {
                if (e.target.classList.contains('cec-settings-delete-comment-button')) {
                    const index = parseInt(e.target.dataset.index, 10);
                    autoFillTexts[key].splice(index, 1);
                    GM_setValue('iwtAutoFillTexts', autoFillTexts);
                    renderCommentList(key, listElement);
                    showToast();
                }
            });
        };

        setupCommentListHandlers('reOpen', document.getElementById('reOpen-list'), document.querySelector('[data-key="reOpen"]'));
        setupCommentListHandlers('closeCase', document.getElementById('closeCase-list'), document.querySelector('[data-key="closeCase"]'));
        setupCommentListHandlers('documentContact', document.getElementById('docContact-list'), document.querySelector('[data-key="documentContact"]'));

        const buttonList = document.getElementById('button-config-list');
        let currentButtons = GM_getValue('actionButtons', JSON.parse(JSON.stringify(DEFAULTS.actionButtons)));
        let draggedItem = null;

        const saveButtons = () => {
            GM_setValue('actionButtons', currentButtons);
            Log.info('UI.Settings', `設置已保存: actionButtons updated`);
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
                Log.info('UI.Settings', `"快捷按鈕" 配置已恢復為默認值。`);
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
     * @description 處理 Case 列表頁：
     *              1. 為已回覆的 Case 添加時間注釋。
     *              2. [修改版] 檢測所有行，若發現"非Priority且非空白"的案件，將 "Importance" 表頭變紅。
     * @param {HTMLTableSectionElement} tableBody - 要處理的表格 tbody 元素。
     */
    function processCaseListRows(tableBody) {
        const SEND_BUTTON_CACHE_KEY = 'sendButtonClickLog';
        const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
        const ANNOTATION_CLASS = 'cec-replied-annotation';

        const notifyEnabled = GM_getValue('notifyOnRepliedCaseEnabled', DEFAULTS.notifyOnRepliedCaseEnabled);
        const expiringHighlightEnabled = GM_getValue('highlightExpiringCasesEnabled', false);

        if (!notifyEnabled && !expiringHighlightEnabled) return;

        const cache = GM_getValue(SEND_BUTTON_CACHE_KEY, {});
        const allRows = tableBody.querySelectorAll('tr[data-row-key-value]');
        let isAnyCaseExpiring = false;

        allRows.forEach(row => {
            const caseId = row.getAttribute('data-row-key-value');

            // --- 功能 1: 已回覆案件提示 ---
            if (notifyEnabled && caseId && row.dataset.cecProcessed !== 'true') {
                row.dataset.cecProcessed = 'true';
                const entry = cache[caseId];
                if (entry && (Date.now() - entry.timestamp < CACHE_TTL_MS)) {
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
                                annotationSpan.textContent = ` ${formatTimeAgoSimple(entry.timestamp)}`;
                                annotationSpan.style.color = '#000000';
                                annotationSpan.style.fontSize = 'inherit';
                                annotationSpan.style.fontWeight = 'normal';
                                annotationSpan.style.marginLeft = '8px';
                                injectionTarget.appendChild(annotationSpan);
                            }
                        }
                    }
                }
            }

            // --- 功能 2 檢測邏輯: 檢查是否為過期案件 ---
            // 邏輯修改：僅當有內容(有圖標)且圖標不是Priority時才觸發
            if (expiringHighlightEnabled && !isAnyCaseExpiring) {
                const importanceCell = row.querySelector('td[data-label="Importance"]');
                if (importanceCell) {
                    const richText = findElementInShadows(importanceCell, 'lightning-formatted-rich-text');

                    if (richText) {
                        const img = findElementInShadows(richText, 'img');
                        // 只有當圖片存在(非空白)時才進行檢查
                        if (img) {
                            const altText = img.getAttribute('alt');
                            // 如果有圖片，且含義不是 Priority，則視為需要警示
                            if (altText && altText !== 'Priority') {
                                isAnyCaseExpiring = true;
                            }
                        }
                        // 如果 img 不存在 (空白)，視為安全，不操作
                    }
                    // 如果 richText 不存在 (空白)，視為安全，不操作
                }
            }
        });

        // --- 功能 2 執行邏輯: 更新表頭顏色 ---
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
                            if(icon) icon.style.fill = 'white';
                        } else {
                            headerAction.style.removeProperty('background-color');
                            headerAction.style.removeProperty('color');

                            const icon = headerAction.querySelector('lightning-primitive-icon svg');
                            if(icon) icon.style.fill = '';
                        }
                    }
                }
            }
        }
    }

    /**
     * @description 初始化對 Case 列表頁的監控，以便在列表更新時處理新的行。
     *              [強化版] 增加了狀態重置機制，確保每次進入頁面都進行一次完整的重新掃描。
     */
    async function initCaseListMonitor() {
        if (!GM_getValue('notifyOnRepliedCaseEnabled', DEFAULTS.notifyOnRepliedCaseEnabled)) {
            return;
        }

        try {
            const dataTableSelector = 'lightning-datatable';
            const dataTable = await waitForElementWithObserver(document.body, dataTableSelector, 20000); // 20000ms: 等待列表組件出現的超時。
            Log.info('Feature.CaseList', 'lightning-datatable 組件已找到。');

            const tableBody = await new Promise((resolve, reject) => {
                const startTime = Date.now();
                const intervalId = setInterval(() => {
                    const tbody = findElementInShadows(dataTable, 'tbody');
                    if (tbody) {
                        clearInterval(intervalId);
                        resolve(tbody);
                    } else if (Date.now() - startTime > 10000) { // 10000ms: 等待 tbody 出現的超時。
                        clearInterval(intervalId);
                        reject(new Error('在 lightning-datatable 內部等待 tbody 超時。'));
                    }
                }, 300); // 300ms: 輪詢間隔。
            });
            Log.info('Feature.CaseList', '表格 tbody 元素已找到，準備處理行數據。');

            // [新增強化] 狀態重置：在處理前，移除所有舊的 "processed" 標記。
            // 這確保了即使在 SPA 導航中 DOM 被重用，也能進行一次全新的掃描。
            const previouslyProcessedRows = tableBody.querySelectorAll('tr[data-cec-processed="true"]');
            if (previouslyProcessedRows.length > 0) {
                previouslyProcessedRows.forEach(row => row.removeAttribute('data-cec-processed'));
                Log.info('Feature.CaseList', `狀態已重置，清除了 ${previouslyProcessedRows.length} 個舊的處理標記。`);
            }

            processCaseListRows(tableBody);
            Log.info('Feature.CaseList', '首次行數據處理完成。');

            const observer = new MutationObserver(() => {
                const debouncedProcess = debounce(() => {
                    Log.info('Feature.CaseList', '檢測到列表更新，執行處理...');
                    processCaseListRows(tableBody);
                }, 300); // 300ms: 防抖延遲，應對列表快速刷新。
                debouncedProcess();
            });

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
     *              [修改版] 強制每次獲取最新排序，並使用 Observer 確保按鈕在 DOM 重繪後依然存在。
     */
    async function handleEditorReadyForTemplateButtons() {
        try {
            // 1. 等待編輯器核心加載
            const editorSelector = ".slds-rich-text-editor .tox-tinymce";
            const editor = await waitForElementWithObserver(document.body, editorSelector, 15000);

            // 調整高度
            const desiredHeight = GM_getValue("richTextEditorHeight", DEFAULTS.richTextEditorHeight) + "px";
            if (editor.style.height !== desiredHeight) {
                editor.style.height = desiredHeight;
            }

            // 2. [核心步驟] 獲取最新模板列表 (實時抓取，不緩存)
            // 注意：這裡會觸發一次菜單的打開與關閉，為了獲取最新排序，這是必須的代價
            const templates = await getAndLogTemplateOptions();

            if (templates && templates.length > 1) {
                const anchorIconSelector = 'lightning-icon[icon-name="utility:new_window"]';
                const anchorIcon = await waitForElementWithObserver(document.body, anchorIconSelector, 5000);
                // 找到工具欄的容器 (ul.cuf-attachmentsList)
                const anchorLi = anchorIcon.closest('li.cuf-attachmentsItem');
                const toolbarContainer = anchorLi ? anchorLi.parentElement : null;

                if (anchorLi && toolbarContainer) {
                    // 3. [第一次注入]
                    injectTemplateShortcutButtons(anchorLi, templates);

                    // 4. [關鍵修改] 啟動 Observer 守護按鈕
                    // 防止 Salesforce 在數據加載後重繪工具欄導致按鈕消失
                    if (!toolbarContainer.dataset.cecObserverAttached) {
                        const observer = new MutationObserver((mutations) => {
                            // 檢查我們的按鈕是否還在
                            const myButtons = toolbarContainer.querySelector('.cec-template-shortcut-button');
                            if (!myButtons) {
                                // 如果按鈕丟失，使用剛剛獲取的 templates 列表重新注入
                                // 必須重新獲取最新的錨點，因為舊的錨點可能已被銷毀
                                const currentAnchorIcon = toolbarContainer.querySelector(anchorIconSelector);
                                const currentAnchorLi = currentAnchorIcon ? currentAnchorIcon.closest('li.cuf-attachmentsItem') : null;
                                if (currentAnchorLi) {
                                    // 重置注入標記，強制重新注入
                                    toolbarContainer.dataset.shortcutsInjected = 'false';
                                    Log.info('UI.Enhancement', '檢測到按鈕丟失，正在重新注入...');
                                    injectTemplateShortcutButtons(currentAnchorLi, templates);
                                }
                            }
                        });

                        observer.observe(toolbarContainer, { childList: true, subtree: true });
                        toolbarContainer.dataset.cecObserverAttached = 'true';
                        // 將 observer 存儲在元素上以便後續清理（如果需要）
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
     * @description 部署一個一次性的監聽器，用於捕獲郵件發送事件並記錄緩存。
     */
    async function setupSendButtonListener() {
        if (!GM_getValue('notifyOnRepliedCaseEnabled', DEFAULTS.notifyOnRepliedCaseEnabled)) {
            return;
        }

        const SEND_BUTTON_CACHE_KEY = 'sendButtonClickLog';
        const CACHE_TTL_MS = 10 * 60 * 60 * 1000; // 10小時: 緩存有效期。

        try {
            const sendButtonSelector = 'button.slds-button--brand.cuf-publisherShareButton';
            const sendButton = await waitForElementWithObserver(document.body, sendButtonSelector, 15000); // 15000ms: 等待發送按鈕的超時。

            const buttonLabel = findElementInShadows(sendButton, 'span.label');
            if (!buttonLabel || buttonLabel.textContent.trim() !== 'Send') {
                throw new Error('找到的按鈕不是預期的 "Send" 按鈕。');
            }

            sendButton.addEventListener('click', () => {
                const caseId = getCaseIdFromUrl(location.href);

                if (caseId) {
                    Log.info('Feature.NotifyReplied', `"Send" 按鈕被點擊，為 Case ID: ${caseId} 記錄緩存。`);
                    const cache = GM_getValue(SEND_BUTTON_CACHE_KEY, {});
                    cache[caseId] = {
                        timestamp: Date.now()
                    };
                    GM_setValue(SEND_BUTTON_CACHE_KEY, cache);
                    Log.info('Feature.NotifyReplied', `緩存記錄成功，有效期10小時。`);
                } else {
                    Log.error('Feature.NotifyReplied', `點擊 "Send" 按鈕後，未能從當前 URL (${location.href}) 提取 Case ID，無法記錄緩存。`);
                }
            }, {
                once: true
            });

            Log.info('Feature.NotifyReplied', `"Send" 按鈕監聽器已成功部署。`);

        } catch (error) {
            Log.warn('Feature.NotifyReplied', `部署 "Send" 按鈕監聽器失敗: ${error.message}`);
        }
    }

    /**
     * @description 根據模板標題自動點擊對應的模板選項，並執行插入及後續增強。
     *              [修復版] 修復了光標定位時 "selection is not defined" 的錯誤，確保插入後能自動跳轉與滾動。
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
            if (buttonText.includes('繁') || buttonText.includes('繁')) {
                conversionMode = 's2t';
            } else if (buttonText.includes('簡') || buttonText.includes('简')) {
                conversionMode = 't2s';
            }
        }

        const insertionMode = GM_getValue('templateInsertionMode', DEFAULTS.templateInsertionMode);

        // --- 1. 光標預定位 (Logo 模式) ---
        if (insertionMode === 'logo') {
            try {
                const iframe = await waitForElementWithObserver(document.body, EDITOR_IFRAME_SELECTOR, TIMEOUT);
                await delay(100);
                if (iframe && iframe.contentDocument) {
                    iframe.contentWindow.focus();
                    const editorDoc = iframe.contentDocument;
                    const editorBody = editorDoc.body;
                    const logoTable = editorBody.querySelector('table.mce-item-table');

                    if (logoTable) {
                        const targetLineNumber = 9;
                        let linesFound = 0;
                        let targetNode = null;
                        const nodeFilter = {
                            acceptNode: function(node) {
                                const nodeName = node.nodeName.toUpperCase();
                                if (nodeName === 'BR' || ['DIV', 'P', 'TABLE', 'H1', 'H2', 'H3'].includes(nodeName)) {
                                    return NodeFilter.FILTER_ACCEPT;
                                }
                                return NodeFilter.FILTER_SKIP;
                            }
                        };
                        const walker = editorDoc.createTreeWalker(editorBody, NodeFilter.SHOW_ELEMENT, nodeFilter, false);
                        walker.currentNode = logoTable;
                        while (linesFound < targetLineNumber && (targetNode = walker.nextNode())) { linesFound++; }

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
                    } else {
                         let fallbackTarget = null;
                        if (editorBody && editorBody.children && editorBody.children.length >= 3) {
                            fallbackTarget = editorBody.children[2];
                        } else if (editorBody && editorBody.firstElementChild) {
                            fallbackTarget = editorBody.firstElementChild;
                        }
                        if (fallbackTarget) {
                            const selection = iframe.contentWindow.getSelection();
                            const range = editorDoc.createRange();
                            range.setStartBefore(fallbackTarget);
                            range.collapse(true);
                            selection.removeAllRanges();
                            selection.addRange(range);
                        }
                    }
                }
            } catch (cursorError) {
                Log.error('UI.Enhancement', `預定位光標錯誤: ${cursorError.message}`);
            }
        }

        // --- 2. 轉換已有文本 ---
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
                                if (originalText !== convertedText) node.nodeValue = convertedText;
                            } else {
                                break;
                            }
                        }
                    }
                }
            } catch (e) {
                Log.warn('Converter', `轉換已有文本時發生錯誤: ${e.message}`);
            }
        }

        // --- 3. 執行插入並設置增強功能 ---
        try {
            const iconElement = await waitForElementWithObserver(document.body, BUTTON_ICON_SELECTOR, TIMEOUT);
            clickableButton = iconElement.closest('a[role="button"]');
            if (clickableButton.getAttribute('aria-expanded') !== 'true') {
                clickableButton.click();
                await waitForAttributeChange(clickableButton, 'aria-expanded', 'true', TIMEOUT);
            }

            const menuId = clickableButton.getAttribute('aria-controls');
            const menuContainer = await waitForElementWithObserver(document.body, `[id="${menuId}"]`, TIMEOUT);
            const targetOption = findElementInShadows(menuContainer, MENU_ITEM_SELECTOR);

            if (targetOption) {
                targetOption.click();
                await delay(100);

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

                // 添加特殊標記
                targetContainerSpan.dataset.cecTemplateZone = 'true';

                // --- 全局事件委託 (粘貼 + Enter鍵) ---
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

                    // 1. 粘貼攔截器
                    editorBody.addEventListener('paste', (event) => {
                        if (isCursorInTemplate()) {
                            event.preventDefault();
                            event.stopPropagation();
                            const textToPaste = (event.clipboardData || iframeWindow.clipboardData).getData('text/plain');
                            const selection = iframeWindow.getSelection();
                            const range = selection.getRangeAt(0);
                            range.deleteContents();
                            const fragment = iframeDocument.createDocumentFragment();
                            const lines = textToPaste.split('\n');
                            lines.forEach((line, index) => {
                                fragment.appendChild(iframeDocument.createTextNode(line));
                                if (index < lines.length - 1) fragment.appendChild(iframeDocument.createElement('br'));
                            });
                            range.insertNode(fragment);
                            range.collapse(false);
                            selection.removeAllRanges();
                            selection.addRange(range);
                            Log.info('UI.Input', '全局攔截器已執行純文本粘貼');
                        }
                    }, true);

                    // 2. Enter 鍵攔截器
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
                                br.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                Log.info('UI.Input', '全局攔截器已強制執行單倍換行');
                            }
                        }
                    }, true);

                    editorBody.dataset.cecGlobalHandlersAttached = 'true';
                }

                // --- 轉換監聽器 ---
                if (conversionMode !== 'off' && !targetContainerSpan.dataset.converterAttached) {
                    const conversionHandler = () => {
                         const selection = iframeWindow.getSelection();
                        if (!selection || selection.rangeCount === 0) return;

                        observer.disconnect();

                        const range = selection.getRangeAt(0);
                        const preRange = range.cloneRange();
                        preRange.selectNodeContents(targetContainerSpan);
                        preRange.setEnd(range.startContainer, range.startOffset);
                        const currentLength = preRange.toString().length;

                        const originalText = targetContainerSpan.innerText;
                        const convertedText = ChineseConverter.convert(originalText, conversionMode);

                        if (originalText !== convertedText) {
                            const lines = convertedText.split('\n');
                            targetContainerSpan.innerHTML = '';
                            lines.forEach((line, index) => {
                                targetContainerSpan.appendChild(iframeDocument.createTextNode(line));
                                if (index < lines.length - 1) targetContainerSpan.appendChild(iframeDocument.createElement('br'));
                            });

                            let charCount = 0;
                            let endNode = null;
                            let endOffset = 0;
                            const walker = iframeDocument.createTreeWalker(targetContainerSpan, NodeFilter.SHOW_TEXT, null, false);
                            while(walker.nextNode()){
                                const node = walker.currentNode;
                                if(charCount + node.length >= currentLength){
                                    endNode = node;
                                    endOffset = currentLength - charCount;
                                    break;
                                }
                                charCount += node.length;
                            }

                            if(endNode){
                                const newRange = iframeDocument.createRange();
                                newRange.setStart(endNode, endOffset);
                                newRange.collapse(true);
                                selection.removeAllRanges();
                                selection.addRange(newRange);
                            } else {
                                const newRange = iframeDocument.createRange();
                                newRange.selectNodeContents(targetContainerSpan);
                                newRange.collapse(false);
                                selection.removeAllRanges();
                                selection.addRange(newRange);
                            }
                        }
                        observer.observe(targetContainerSpan, { childList: true, subtree: true, characterData: true });
                    };
                    const debouncedHandler = debounce(conversionHandler, 350);
                    const observer = new MutationObserver(debouncedHandler);
                    observer.observe(targetContainerSpan, { childList: true, subtree: true, characterData: true });
                    targetContainerSpan.dataset.converterAttached = 'true';
                }

                // --- 4. 光標定位 (修復版) ---
                const userBrPosition = GM_getValue('cursorPositionBrIndex', DEFAULTS.cursorPositionBrIndex);
                const brIndex = userBrPosition - 1;
                const allBrTags = targetContainerSpan.getElementsByTagName('br');
                if (allBrTags.length > brIndex && brIndex >= 0) {
                    const targetPositionNode = allBrTags[brIndex];

                    // [修復點] 確保這裡定義了 selection
                    const selection = iframeWindow.getSelection();

                    const range = iframeDocument.createRange();
                    range.setStartBefore(targetPositionNode);
                    range.collapse(true);

                    selection.removeAllRanges();
                    selection.addRange(range);

                    if (typeof targetPositionNode.scrollIntoView === 'function') {
                        targetPositionNode.scrollIntoView({ behavior: 'auto', block: 'center' });
                        requestAnimationFrame(() => { setTimeout(() => { window.scrollBy(0, VIEW_ADJUSTMENT_OFFSET_PX); }, 50); });
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
     * @description 根據模板列表，在指定位置注入快捷按鈕，並自動滾動視圖。
     *              [修改版] 增加了 flex-wrap 屬性以支持自動換行，並調整了按鈕間距。
     * @param {HTMLElement} anchorLiElement - 作為定位錨點的 "Popout" 按鈕所在的 <li> 元素。
     * @param {string[]} templates - 從菜單讀取到的完整模板標題列表。
     */
    function injectTemplateShortcutButtons(anchorLiElement, templates) {
        const BOTTOM_OFFSET_PIXELS = 50; // 50px: 滾動到底部後的額外偏移量，留出更多可視空間。

        const parentList = anchorLiElement.parentElement;
        if (!parentList || parentList.dataset.shortcutsInjected === 'true') {
            return;
        }

        // [核心修改] 強制容器使用 Flex 佈局並允許換行，防止按鈕超出網頁框架
        parentList.style.display = 'flex';
        parentList.style.flexWrap = 'wrap';
        parentList.style.height = 'auto'; // 允許高度隨內容撐開
        parentList.style.alignItems = 'center'; // 確保垂直居中對齊

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

            // [核心修改] 添加上下邊距，確保換行後的視覺間距
            newLi.style.marginTop = '2px';
            newLi.style.marginBottom = '2px';

            const button = newLi.querySelector('button');
            button.classList.add('cec-template-shortcut-button');
            button.innerHTML = '';
            const buttonText = templateTitle.substring(0, 10);
            button.textContent = buttonText;
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
                clickTemplateOptionByTitle(templateTitle, buttonText);
            });

            parentList.insertBefore(newLi, anchorLiElement.nextSibling);
        });

        parentList.dataset.shortcutsInjected = 'true';
        Log.info('UI.Enhancement', `${templatesToShow.length} 個回覆模板快捷按鈕注入成功 (已啟用自動換行)。`);

        setTimeout(() => repositionComposerToBottom(BOTTOM_OFFSET_PIXELS), 100); // 100ms: 延遲執行滾動，確保按鈕渲染完成。
    }

    /**
     * @description 查找並將郵件編輯器組件滾動到視口底部，並應用一個額外的偏移量。
     * @param {number} [offset=0] - 滾動完成後的額外垂直偏移量（像素）。
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
     * @description 從頁面中提取追踪號碼，並觸發自動IVP查詢（如果已啟用）。
     */
    async function extractTrackingNumberAndTriggerIVP() {
        const TRACKING_CACHE_KEY = 'trackingNumberLog';
        const CACHE_TTL_MS = 60 * 60 * 1000; // 60分鐘: 追踪號緩存有效期。
        const caseId = getCaseIdFromUrl(location.href);
        if (!caseId) {
            Log.warn('Feature.IVP', `無法從當前 URL 提取 Case ID，追踪號緩存功能跳過。`);
            return;
        }

        const cache = GM_getValue(TRACKING_CACHE_KEY, {});
        const entry = cache[caseId];

        if (entry && (Date.now() - entry.timestamp < CACHE_TTL_MS)) {
            foundTrackingNumber = entry.trackingNumber;
            Log.info('Feature.IVP', `從緩存中成功讀取追踪號 (Case ID: ${caseId}): ${foundTrackingNumber}`);
            autoQueryIVPOnLoad();
            return;
        }

        const trackingRegex = /(1Z[A-Z0-9]{16})/;
        const selector = 'td[data-label="IDENTIFIER VALUE"] a, a[href*="/lightning/r/Shipment_Identifier"]';
        try {
            const element = await waitForElement(document.body, selector, 10000); // 10000ms: 等待追踪號元素的超時。
            if (element && element.textContent) {
                const match = element.textContent.trim().match(trackingRegex);
                if (match) {
                    const extractedNumber = match[0];
                    Log.info('Feature.IVP', `成功提取追踪號: ${extractedNumber}`);
                    foundTrackingNumber = extractedNumber;
                    cache[caseId] = {
                        trackingNumber: extractedNumber,
                        timestamp: Date.now()
                    };
                    GM_setValue(TRACKING_CACHE_KEY, cache);
                    Log.info('Feature.IVP', `追踪號已為 Case ID ${caseId} 寫入緩存，有效期30分鐘。`);

                    autoQueryIVPOnLoad();
                }
            }
        } catch (error) {
            Log.warn('Feature.IVP', `在10秒內未找到追踪號元素，自動IVP查詢將不會觸發。`);
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
                Log.warn('Feature.IWT', `未找到 "I Want To..." 組件容器，自動化按鈕未注入。`);
            });
        const checkAndReInject = () => {
            if (isScriptPaused || !initialInjectionDone) return;
            const anchorElement = findElementInShadows(document.body, ANCHOR_SELECTOR);
            if (anchorElement && anchorElement.dataset.customButtonsInjected !== 'true') {
                injectIWantToButtons(anchorElement);
            }
        };
        iwtModuleObserver = new MutationObserver(debounce(checkAndReInject, 350)); // 350ms: 防抖延遲，處理組件快速刷新的情況。
        iwtModuleObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * @description 處理 "Re-Open Case" 自動化流程的第二階段。
     * @param {string} comment - 要填寫的評論。
     */
    async function handleStageTwoReOpen(comment) {
        const reOpenCaseComponent = await waitForElementWithObserver(document.body, 'c-cec-re-open-case', 5000); // 5000ms: 等待組件超時。
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms: 等待組件內部元素渲染。
        if (comment) {
            const commentBox = await waitForElementWithObserver(reOpenCaseComponent, 'textarea[name="commentField"]', 5000);
            simulateTyping(commentBox, comment);
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms: 等待UI響應輸入。
        const finalSubmitButton = await waitForElementWithObserver(reOpenCaseComponent, '.slds-card__footer button.slds-button_brand', 5000);
        finalSubmitButton.click();
        showCompletionToast(reOpenCaseComponent, 'Re-Open Case: 操作成功！請等待網頁更新！');
    }

    /**
     * @description 處理 "Close this Case" 自動化流程的第二階段。
     *              [重構版] 增加 mode 參數，支持 'normal' (500ms 延時) 和 'fast' (50ms 延時) 兩種執行速度。
     * @param {string} comment - 要填寫的評論。
     * @param {'normal'|'fast'} [mode='normal'] - 執行模式，決定了操作間的延時。
     */
    async function handleStageTwoCloseCase(comment, mode = 'normal') {
        // 根據模式確定延時時間
        const delay = mode === 'fast' ? 10 : 800;
        Log.info('Feature.IWT.CloseCase', `以 "${mode}" 模式執行 Close Case，延時: ${delay}ms。`);

        const closeCaseComponent = await waitForElementWithObserver(document.body, 'c-cec-close-case', 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        await selectComboboxOption(closeCaseComponent, 'button[aria-label="Case Sub Status"]', 'Request Completed');
        if (comment) {
            const commentBox = await waitForElementWithObserver(closeCaseComponent, 'textarea.slds-textarea', 5000);
            simulateTyping(commentBox, comment);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        const finalSubmitButton = await waitForElementWithObserver(closeCaseComponent, '.slds-card__footer button.slds-button_brand', 5000);
        finalSubmitButton.click();
        showCompletionToast(closeCaseComponent, 'Close Case: 操作成功！請等待網頁更新！');
    }

    /**
     * @description 處理 "Document Customer Contact" 自動化流程的第二階段。
     * @param {string} comment - 要填寫的評論。
     */
    async function handleStageTwoDocumentContact(comment) {
        const docContactComponent = await waitForElementWithObserver(document.body, 'c-cec-document-customer-contact', 5000);
        await new Promise(resolve => setTimeout(resolve, 100));
        const radioButtonSelector = 'input[value="Spoke with customer"]';
        const radioButton = await waitForElementWithObserver(docContactComponent, radioButtonSelector, 5000);
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms: 點擊前短暫延時，確保事件監聽器已激活。
        radioButton.click();
        if (comment) {
            try {
                const commentBox = await waitForElementWithObserver(docContactComponent, 'textarea.slds-textarea', 5000);
                simulateTyping(commentBox, comment);
            } catch (error) {
                // 忽略錯誤，某些情況下可能沒有評論框
            }
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        const finalSubmitButton = await waitForElementWithObserver(docContactComponent, '.slds-card__footer button.slds-button_brand', 5000);
        finalSubmitButton.click();
        showCompletionToast(docContactComponent, 'Document Contact: 操作成功！請等待網頁更新！');
    }

    /**
     * @description 執行一個完整的 "I Want To..." 自動化流程。
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
        Log.info('Feature.IWT', `啟動自動化流程: "${searchText}"。`);
        try {
            const searchInput = await waitForElementWithObserver(document.body, 'c-ceclookup input.slds-combobox__input', 5000);
            const dropdownTrigger = searchInput.closest('.slds-dropdown-trigger');
            if (!dropdownTrigger) throw new Error('無法找到下拉列表的觸發容器 .slds-dropdown-trigger');
            searchInput.focus();
            simulateTyping(searchInput, searchText);
            await waitForAttributeChange(dropdownTrigger, 'aria-expanded', 'true', 5000);
            await new Promise(resolve => setTimeout(resolve, 200)); // 200ms: 等待搜索結果加載。
            simulateKeyEvent(searchInput, 'ArrowDown', 40);
            await new Promise(resolve => setTimeout(resolve, 100)); // 100ms: 模擬按鍵後的延遲。
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
     * @description 向 "I Want To..." 組件下方注入自定義的、帶有下拉選項的自動化操作按鈕。
     *              [最終版] 為 "Close this Case (Auto)" 按鈕及其下拉選項，都增加了長按2秒觸發快速模式的功能。
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

        // 抽離出可複用的長按事件綁定邏輯
        const applyLongPressHandler = (element, config, comment) => {
            let pressTimer = null;
            let longPressTriggered = false;

            const startPress = (event) => {
                if (event.button !== 0) return;
                longPressTriggered = false;
                pressTimer = setTimeout(() => {
                    longPressTriggered = true;
                    Log.info('Feature.IWT.LongPress', '長按觸發快速模式。');
                    automateIWantToAction({
                        searchText: config.searchText,
                        stageTwoHandler: (c) => config.handler(c, 'fast'),
                        finalComment: comment
                    });
                    // 如果是下拉菜單項，觸發後需要關閉菜單
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

            // 分支 1: 單一按鈕模式
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

            // 分支 2: 下拉菜單模式
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

                        // [核心修正] 為下拉菜單中的 "Close Case" 選項應用長按邏輯
                        if (config.actionKey === 'closeCase') {
                            // 阻止默認的 mousedown 行為，防止觸發菜單關閉
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
                } else { // 零選項的情況
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
        Log.info('Feature.IWT', `聯動狀態更新，自動化按鈕已設置為 ${state} 狀態。`);
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
            Log.info('Feature.IWT', `"Assign Case to Me" 按鈕狀態監控已啟動，實現狀態聯動。`);
        } catch (error) {
            Log.warn('Feature.IWT', `未找到 "Assign Case to Me" 按鈕，狀態聯動功能未啟動。`);
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
                        const button = await waitForElementWithObserver(modalRoot, buttonSelector, 10); // 10ms: 快速查找按鈕。
                        button.dispatchEvent(new MouseEvent("click", {
                            bubbles: true
                        }));
                        await new Promise(resolve => setTimeout(resolve, 5)); // 5ms: 等待菜單渲染。

                        const item = await waitForElementWithObserver(document.body, itemSelector, 10); // 10ms: 快速查找選項。
                        item.dispatchEvent(new MouseEvent("click", {
                            bubbles: true
                        }));
                        await new Promise(resolve => setTimeout(resolve, 5)); // 5ms: 點擊後的UI反應延遲。
                        return true;
                    } catch (error) {
                        if (i === 1) throw error;
                        document.body.click();
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
     * @description 在彈出窗口的底部注入快捷操作按鈕。
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
                    // 錯誤已在 safeClickWithOptions 內部記錄
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
     * @description 如果啟用了自動查詢，則在頁面加載並提取到追踪號後，自動向IVP窗口發送查詢請求。
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
     * @description [增強版] 處理聯繫人卡片，根據賬戶的 "Preferred" 狀態進行高亮，
     *              並新增邏輯：檢查 "Account Status"，如果為 "SUSPENDED"，則禁用 "Schedule a Pickup" 按鈕。
     * @param {HTMLElement} card - 聯繫人卡片元素。
     */
    function processContactCard(card) {
        const highlightMode = GM_getValue('accountHighlightMode', 'pca');
        if (highlightMode === 'off') {
        }
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
        const CACHE_TTL = 60 * 60 * 1000;
        const cleanedLog = Object.fromEntries(Object.entries(allLogs).filter(([_, data]) => now - data.timestamp < CACHE_TTL));

        // --- [修改] findAndDisablePickupButton 函數，增加延遲和輪詢 ---
        const findAndDisablePickupButton = () => {
            const POLLING_INTERVAL_MS = 500;
            const TIMEOUT_MS = 5000; // 最多等待 5 秒
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
            localObserver.disconnect();
            if (!findAndStoreTask()) {
                Log.warn('Feature.IVP', `攔截 IVP 卡片時，等待 iframe 超時。`);
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
     * @param {string} 當前用Case ID作緩存鍵。
     * @param {boolean} [isCachedCase=false] - 是否為緩存命中模式，此模式下僅應用視覺反饋。
     */
    async function handleAutoAssign(caseUrl, isCachedCase = false) {
        const ASSIGNMENT_CACHE_KEY = 'assignmentLog';
        const caseId = getCaseIdFromUrl(caseUrl);
        if (!caseId) {
            Log.error('Feature.AutoAssign', `無法從 URL (${caseUrl}) 提取 Case ID，自動指派緩存操作已中止。`);
            return;
        }
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
                ownerElement = await waitForElementWithObserver(ownerBlock, preciseOwnerSelector, 10000); // 10000ms: 等待所有者姓名元素出現的超時。
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
                assignButton = await waitForElementWithObserver(document.body, 'button[title="Assign Case to Me"]', 100000); // 100000ms: 等待指派按鈕出現的超時。
            } catch (err) {
                Log.error('Feature.AutoAssign', `查找 "Assign Case to Me" 按鈕時發生錯誤或超時。`);
                return;
            }
            if (assignButton && !assignButton.disabled) {
                await new Promise(resolve => setTimeout(resolve, 300)); // 300ms: 點擊前的短暫延遲，確保UI穩定。
                assignButton.click();
                assignButton.style.setProperty('background-color', '#0070d2', 'important');
                assignButton.style.setProperty('color', '#fff', 'important');
                const cache = GM_getValue(ASSIGNMENT_CACHE_KEY, {});
                const CACHE_TTL = 60 * 60 * 1000; // 60分鐘: 指派成功記錄的緩存有效期。
                // [修改] 使用 caseId 作為緩存 key
                cache[caseId] = {
                    timestamp: Date.now()
                };
                GM_setValue(ASSIGNMENT_CACHE_KEY, cache);
                Log.info('Feature.AutoAssign', `自動指派成功 (Case ID: ${caseId})，已點擊 "Assign Case to Me" 按鈕並更新緩存。`);

                setTimeout(() => {
                    Log.info('Feature.AutoAssign', `8秒後執行高亮狀態重新檢查。`);
                    checkAndColorComposeButton();
                }, 8000); // 8000ms: 指派成功後，等待足夠時間讓後端和UI更新，然後重新檢查計時器狀態。
            } else {
                Log.warn('Feature.AutoAssign', `"Assign Case to Me" 按鈕不存在或處於禁用狀態。`);
            }
        } catch (outerErr) {
            Log.error('Feature.AutoAssign', `執行自動指派時發生未知外部錯誤: ${outerErr.message}`);
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
     */
    function checkAndColorComposeButton() {
        const MAX_ATTEMPTS = 20;
        const POLL_INTERVAL_MS = 500; // 500ms: 輪詢間隔。
        let attempts = 0;

        const poller = setInterval(() => {
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
            Log.info('UI.ButtonAlert', `"Associate Contact" 按鈕已因存在關聯案件標紅。`);
        } else if (!hasRelatedCases && isAlreadyRed) {
            associateButton.style.backgroundColor = "";
        }
    }

    /**
     * @description 異步確定當前 Case 的狀態（打開、關閉或未知）。
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
                return null;
            };

            const initialStatus = checkStatus();
            if (initialStatus) {
                Log.info('Feature.AutoAssign', `Case 狀態已確定: ${initialStatus}`);
                resolve(initialStatus);
                return;
            }

            const timeout = 15000; // 15000ms: 等待狀態字段出現的超時。
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
     * @description 檢查自動指派所需的關鍵字段是否全部為空。
     * @returns {Promise<boolean>} 如果三個指定字段的值同時為空，則返回 true (表示應中止)。
     */
    async function areRequiredFieldsEmpty() {
        const CHECK_TIMEOUT = 15000; // 15000ms: 檢查超時。
        const POLL_INTERVAL = 300; // 300ms: 輪詢間隔。
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
            Log.info('Feature.RelatedCases', `"Related Cases" 標籤頁被點擊，開始數據提取流程。`);
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
                    Log.error('Feature.RelatedCases', `等待案件列表容器超時，提取流程終止。`);
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
            Log.info('Feature.RelatedCases', `表格已按 "${columnId}" 列 (${this.currentSort.direction}) 排序。`);
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
            Log.info('Feature.RelatedCases', `成功處理 ${summaryRows.length} 個關聯案件，數據已提取並增強。`);
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
                Log.error('Feature.RelatedCases', `處理案件行 #${rowIndex} 時失敗: ${error.message}`);
                throw new Error(`案件 #${rowIndex}: ${error.message}`);
            }
        },

        /**
         * @description 創建一個新的表格單元格（td），並為特定列增加交互功能。
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
                        }, 1500); // 1500ms: 複製成功提示的顯示時長。
                    }).catch(err => {
                        Log.error('Feature.RelatedCases', `複製 "${text}" 失敗: ${err}`);
                        const originalText = text;
                        contentDiv.textContent = 'Copy Failed!';

                        setTimeout(() => {
                            contentDiv.textContent = originalText;
                        }, 2000); // 2000ms: 複製失敗提示的顯示時長。
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
        const SCAN_INTERVAL = 300; // 300ms: 掃描器輪詢間隔，用於快速檢測頁面元素。
        const MASTER_TIMEOUT = 20000; // 20000ms: 掃描器的總運行超時，防止無限運行。
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
                        // 忽略單個處理程序的錯誤
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
    },{
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
            Log.info('Core.Migration', `舊版本設置已成功遷移。`);
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
                Log.warn('Core.Control', `腳本已暫停，所有自動化功能停止。`);
            } else {
                showGlobalToast('腳本已恢復運行', 'check');
                Log.info('Core.Control', `腳本已恢復運行，正在重新初始化頁面。`);
                lastUrl = '';
                monitorUrlChanges();
            }
        });
        logoElement.appendChild(settingsButton);
        logoElement.appendChild(pauseButton);
        updatePauseButtonUI();
        Log.info('UI.Controls', `頂部控制按鈕 (設置/暫停) 注入成功。`);
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

            const composeButton = event.target.closest('button.testid__dummy-button-submit-action');
            const replyAllButton = event.target.closest('a[title="Reply All"]');
            const writeEmailButton = event.target.closest('button[title="Write an email..."]');

            if (composeButton || replyAllButton || writeEmailButton) {
                let triggerName = composeButton ? '"Compose"' : (replyAllButton ? '"Reply All"' : '"Write an email..."');
                Log.info('UI.Enhancement', `檢測到 ${triggerName} 按鈕點擊，準備注入模板快捷按鈕。`);
                setTimeout(() => {
                    handleEditorReadyForTemplateButtons();
                }, 300); // 100ms: 短暫延遲以確保編輯器容器開始渲染。
            }

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
                Log.info('Feature.IVP', `手動點擊 IVP 按鈕，查詢追踪號: ${trackingNumber}。`);
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
                            trackingNumber: trackingNumber,
                            timestamp: Date.now()
                        }
                    };
                    sendMessageWithRetries(ivpWindowHandle, messagePayload, 'https://ivp.inside.ups.com');
                    Log.info('Feature.IVP', `查詢請求已發送至 IVP 窗口。`);
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
     *              [修正版] 修正了 Case 詳情頁 URL 的正則表達式匹配錯誤，並將關鍵字段檢查邏輯移至僅中止自動指派。
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

        // --- 狀態重置 ---
        injectedIWTButtons = {};
        if (assignButtonObserver) assignButtonObserver.disconnect();
        if (iwtModuleObserver) iwtModuleObserver.disconnect();
        assignButtonObserver = null;
        iwtModuleObserver = null;
        if (relatedCasesExtractorModule) relatedCasesExtractorModule.hasExecuted = false;
        foundTrackingNumber = null;
        window.contactLogicDone = false;

        // --- 路由匹配 ---
        // [核心修正] 使用了正確的正則表達式，確保能匹配帶有查詢參數的 URL
        const caseRecordPagePattern = /^https:\/\/upsdrive\.lightning\.force\.com\/lightning\/r\/Case\/[a-zA-Z0-9]{18}\/.*/;
        const myOpenCasesListPagePattern = /^https:\/\/upsdrive\.lightning\.force\.com\/lightning\/o\/Case\/list\?.*filterName=My_Open_Cases_CEC.*/;

        // =================================================================================
        // 分支 1: Case 詳情頁邏輯
        // =================================================================================
        if (caseRecordPagePattern.test(location.href)) {
            const caseUrl = location.href;

            // --- 步驟 1: 等待頁面核心 UI 渲染完成 ---
            const PAGE_READY_SELECTOR = 'c-cec-case-categorization';
            const PAGE_READY_TIMEOUT = 20000;
            try {
                Log.info('Core.Router', `等待 Case 詳情頁核心元素 "${PAGE_READY_SELECTOR}" 出現...`);
                await waitForElementWithObserver(document.body, PAGE_READY_SELECTOR, PAGE_READY_TIMEOUT);
                Log.info('Core.Router', `核心元素已出現，開始執行頁面初始化。`);
            } catch (error) {
                Log.warn('Core.Router', `等待核心元素超時 (${PAGE_READY_TIMEOUT / 1000}秒)，已中止當前頁面的初始化。`);
                return;
            }

            // --- 步驟 2: 執行不依賴 Case 內部數據的基礎任務 ---
            Log.info('Core.Router', `正在執行基礎 UI 初始化...`);
            checkAndNotifyForRecentSend(caseUrl);
            initModalButtonObserver();
            initIWantToModuleWatcher();

            // --- 步驟 3: 直接啟動數據依賴型任務 (前置守衛已移除) ---
            Log.info('Core.Router', `正在啟動數據依賴型任務（掃描器、追踪號提取）。`);
            startHighFrequencyScanner(caseUrl);
            extractTrackingNumberAndTriggerIVP();

            // --- 步驟 4: 執行自動指派邏輯 ---
            if (caseUrl.includes('c__triggeredfrom=reopen')) {
                Log.info('Feature.AutoAssign', `檢測到 Re-Open Case，已跳過自動指派邏輯。`);
                return;
            }

            const targetUser = GM_getValue('autoAssignUser', DEFAULTS.autoAssignUser);
            if (!targetUser) {
                Log.warn('Feature.AutoAssign', `未設置目標用戶名，自動指派功能已禁用。`);
                return;
            }

            const ASSIGNMENT_CACHE_KEY = 'assignmentLog';
            const CACHE_EXPIRATION_MS = 60 * 60 * 1000; // 60分鐘: 自動指派緩存有效期。
            const cache = GM_getValue(ASSIGNMENT_CACHE_KEY, {});
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

            // --- 步驟 5: 將關鍵字段檢查移至此處，僅中止自動指派 ---
            if (await areRequiredFieldsEmpty()) {
                Log.warn('Feature.AutoAssign', `因關鍵字段為空，自動指派流程已中止。其他頁面任務不受影響。`);
                return; // 僅中止自動指派
            }

            handleAutoAssign(caseUrl, false);

        // =================================================================================
        // 分支 2: "My Open Cases CEC" 列表頁邏輯
        // =================================================================================
        } else if (myOpenCasesListPagePattern.test(location.href)) {
            Log.info('Core.Router', `"My Open Cases CEC" 列表頁已識別，準備啟動列表監控器。`);
            initCaseListMonitor();

        // =================================================================================
        // 分支 3: 其他所有頁面
        // =================================================================================
        } else {
            Log.info('Core.Router', `非目標頁面 (詳情頁/指定列表頁)，跳過核心功能初始化。`);
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
        Log.info('UI.Init', `所有自定義樣式 (全局/高度/組件屏蔽) 已應用。`);

        const CACHE_KEYS = {
            ASSIGNMENT: 'assignmentLog',
            REPLIED: 'sendButtonClickLog',
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
