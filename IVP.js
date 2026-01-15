// ==UserScript==
// @name         IVP顯示注釋
// @namespace    IVP顯示注釋
// @version      V17
// @description  IVP顯示注釋、一眼模式、定義字體顏色。
// @author       Jerry Law
// @match        *://ivp.inside.ups.com/*
// @match        *://upsdrive.lightning.force.com/*
// @exclude      *://upsdrive.my.salesforce.com/*
// @exclude      *://upsdrive--c.vf.force.com/*
// @exclude      *://la11-core1.sfdc-yfeipo.salesforceliveagent.com/*
// @exclude      *://upsdrive.lightning.force.com/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @updateURL    https://raw.githubusercontent.com/Jerry199022/Work/refs/heads/main/IVP.js
// @downloadURL  https://raw.githubusercontent.com/Jerry199022/Work/refs/heads/main/IVP.js

// ==/UserScript==

(function () {
    'use strict';
    // ================================================================
    // 注釋數據
    // ================================================================
    const annotationsText = `
#165 GLENN FOX RD|亞馬遜倉庫
#6635 106 AVE SE|亞馬遜倉庫
#8255 NW 66TH STREET|亞馬遜倉庫
#7600 LTC PARKWAY|亞馬遜倉庫
#27505 SW 132ND AVE|亞馬遜倉庫
#4806 Cotter Ln|亞馬遜倉庫
#2845 W 48th Pl|亞馬遜倉庫
#550 OAK RIDGE ROAD|亞馬遜倉庫
#RASALAT-PPWK|清關文件送達給收件人
#OBSERVED PKG|主動監控的貨件
#MONITORING|監控中
#RETURN GOODS|退回包裹
#POA/IRS|需要提供授權書及收件人稅號
#SAT DELIVERY|星期六送貨
#SAT AIR DEL|星期六空運送貨
#NEVER ARRIVD|從未送達目的地
#LIB BREAKDWN|因設施故障或停電而導致延誤
#REC BY UPS|包裹已由UPS接收
#TRADE INSPCT|政府檢查潛在的貿易違規行為
#PHONE NO ANS|收件人沒有接聽電話
#TPB WTC|第三方倉庫-自清關
#PICKUP BY PACKAGE CAR|包裹由派送車輛取件
#CLR AGY REJ|清關機構拒絕清關
#PROCESSING FOR|正在處理派送
#OUT SVC AREA|所選的服務不適用於該目的地地址
#LAST SELLER|需要賣家資料
#LATE TOFC|拖車延遲
#LOCAL CHOSEN|已在當地選擇派送
#NO SAT ACC |不收取週六附加費
#LBL DETACH|標籤從包裹脫落
#NO LISTING|沒有收件地址信息
#REF UPS BROK|拒絕UPS擔任報關代理
#RTL NON DEL|無法派送至自提點
#RGL HAZMAT|一般及預先通知的危險品貨件
#OTHER DF|其他司機跟進中
#CD NO CNTACT|調查已結束-無法聯絡收件人
#INCORR CITY|城市/城鎮資訊錯誤，未能派送
#CANCELLED DEPARTURE|取消轉運離開
#UPDATED ARRIVAL|抵達時間已更新
#PPWK FAIQ|已把清關文件提供給收件人或清關代理進行清關
#INF HOLD RES|資料問題已經解決
#MISSED DEST|包裹在目的地遺失
## PCS NOT =|文件記錄的數量與實際不符
#STOP VISIBTY|停止顯示後續狀態給客戶
#ARRIVED AT FACILITY|已到達設施
#NEED DIRECT|需要收件地址的路線指引
#PKG NOT RCVD|運輸過程中出現中斷，目前尚未收到包裹
#INCOR TARIFF|貨物因關稅代碼錯誤而被扣留
#NI1 ALT DEL|嘗試派送但客戶不在，包裹已送至UPS自提點供自取。
#AP DEL TMRW|無法派送至UPS自提點
#PAPER INSPEC|需要提供更多清關文件
#OUT OF TERR|UPS目前未提供該目的地的服務
#PHON LFT MSG|已給收件人留言
#REROUTE|改變原定的運送路線
#INCOMPL DOC|清關文件不完整
#NOT CLR ABND|棄件
#DEPARTURE SCAN|轉運離開掃描
#ASSESS RTN|評估後退運
#UPS INT COMP|攔截送貨請求已完成
#REPLACE INV|更換發票
#ADDRS INFO|驗證地址資訊
#LIB LATE ARR|包裹延遲到達
#POD REQUEST|交貨證明請求
#TRL DEL CUST|海關檢測，無法預計釋放時間。
#UNAUTH DRUGS|發現未經授權的藥物
#RETAIL DISP|逾期未取被UPS回收
#MISFLOW|錯誤分揀至不正確地點
#CUS PKUP RTL|客戶已領取包裹。
#PRE NOT PROC|入境預裝貨物未處理
#DICOW|官網開查
#LATE TO UPS|包裹未能按時交給UPS
#NO INTERCEPT|未能找到可供攔截的包裝件
#ISRG CALLED|無法派送已通知ISRG
#RTS AUTHORIZ|需要退運授權
#OUT OF AREA|收件人地址不在地區範圍內
#REF DIDN ORD|收件人表示未下訂單拒絕接收
#REF CANCELED|收件人表示已取消訂單拒絕接收
#PKG AGING|快到取件限期
#RESIDENTIAL|住宅
#PKUP AGE OUT|逾期未取被UPS回收
#NO CONTACT|無法聯繫收件人
#VOID ENTRY|指示取消記錄
#UPS INT REQ|UPS要求交貨攔截
#INT PKG HELD|包裹被海關攔截扣留
#SEIZED CLR A|貨物被海關扣押
#NOT CLEARED|報關部門未處理此包裹
#PICKUP SCAN|取件掃描
#NO ADDL INFO|無更多信息
#INV CONSIGNE|收件人名字錯誤
#PRECLEARANCE|預清關中
#COD PROCESS|報關行正處理清關手續
#LATE RELEASE|清關完成后未趕上運輸班次
#VERIFY ADDRS|驗證地址
#IPPC HOLD|被檢疫部門暂扣-木質包裝缺少IPPC標章
#NO UPS CNTRL|不可控延遲
#REFUSED|收貨人拒絕此包裹
#PKG DELAYED|貨物延誤
#DOC INSPECT|清關機構審閱文件
#RE-PACK|重新包裝
#PREF TO AP|包裹送到收件人選擇的提貨點
#RTS PENDING|計劃退回發件人
#NEED PHONE #|需提供收件人電話號碼
#INCOMPL ADDR|地址不完整
#UPDATED DEPARTURE|更新離開記錄
#UPDATED ARRIVAL|更新到達記錄
#NO CUSTOMS #|需要海關編號
#IMPT FEE DUE|需支付進口到付費用
#PENDING FDA|等待食品藥物管理局審查
#NOT RELEASED|等待海關釋放
#LATE TO DEST|比預定時間晚到達
#PROCESSING ATUPS FACILITY|包裹正在中心處理
#NON TRANS|不可運輸
#UNAUTH PLANT|未經授權的植物
#VALU DISPUTE|收件人對貨物價值有異議
#VERIFY GOODS|驗證貨品描述
#NOT FINAL|預計1-2日派送
#TRXFER TO PO|包裹轉移到郵局
#OUT FOR DELV|計劃今天送貨
#INT REQUEST|包裹被攔截
#NO COD AMNT|標籤上沒有顯示貨到付款的金額
#RETAIL POSS|包裹在UPS自提點
#DELV TO RETL|已送到UPS自提點
#IMMED INSPEC|海關抽檢
#CNTCT REQSTD|收件人要求保留包裹，並在清關前聯絡收件人以取得指示。
#SPEC EXC 3|包裹延誤，需進一步查詢
#LEFT IN BLDG|包裹仍在UPS設施內
#CLSD PKG LOC|調查關閉-包裹已找回
#INVEST ONLY|只作調查
#VOID EXCEPTN|作廢-錯誤輸入
#DELIVERY BEING S|包裹已裝車正在安排派送
#FRONT DESK|前台
#INVESTIGATE|開啟調查
#LOST PKG|包裹丟失
#NO EVENT|無下一個預期物流事件
#MISLOAD|送錯站點
#REROUTED|已重新中轉至目的地
#NO UPS AP|無可用UPS自提點
#SEIZED CUSTM|海關扣押
#RESCHEDULED|重新安排派送
#PLD DN ALLOW|缺少PLD或PLD檢查未通過
#P/EFFECT DOC|需要提交個人物品申報表
#MISSING CI|缺少發票
#WAREHOUSE|包裹進入倉需要補充資料
#MISS/INV TEL|缺少收件人電話
#RTS CUSTOMS|退回給寄件人
#IMP RESTRICT|包裹含限制進口物品
#REDIRECT|安排送至目的地
#ONSITE BROKR|由第三方機構清關UPS派送
#REG INSPECT|需要檢查包裹
#WT ADJUSTMNT|調整計費重量
#1 DAY DELAY|運輸延遲 1 個工作天
#2ND DEL ATT|當日第二次配送嘗試
#2ND/SCR COMP|二次檢查已完成
#2ND/SCR PASS|二次檢查通過
#2ND/SCR REQ|需要二次檢查
#ABANDONMENT|貨件正在棄件處理中
#ACCEPTED REQ|操作設施已接受要求
#ACCIDENT|發生運輸事故
#AD/CVD|反傾銷/反補貼稅
#ADD AGENCY|非海關機構要求的資訊或文件
#ADD CORR|地址已更正
#ADD CUSTOMS|海關要求的資訊或文件
#ADD DEL DAY|延遲一天發貨
#ADD MODIFY|地址修改
#ADDL HANDLE|帳單調整，額外處理
#ADDL HOLD|因為左側狀態，暫停處理
#ADDR CORRCTN|位址更正，重新安排送達
#ADDR ERRORS|地址有多處錯誤，未送達
#ADR DG HOLD ADR|危險品包裹被扣押
#ADR RESUMED ADR|危險品包裹恢復運輸
#ADV WEATHER|惡劣天氣條件
#AG PPQ INSP|貨件需要AG PPQ檢查
#AGED LOAD|包裹未在計劃日處理
#AGENT DELVRY|轉代理或協力廠商物流公司派送
#AGENT DELVRY |轉交當地派送公司派送
#AGENT PICKUP|代理提貨；運送中至UPS設施
#AGENT REC'D|已由代理商接收出口處理站
#AGRCLTR HOLD|農產品暫扣
#AGT INT COMP|主動反應攔截已完成
#AGY INFO REQ|等待機構放行所需的資訊/文件
#AIR CAPACITY|倉位不足
#AIR MISROUTE|航空誤配
#ALC DESTROY|未經授權的酒精貨物已銷毀
#ALC PICK UP|未經授權的酒精貨物已扣押待取
#ALT ADDRESS|收件人要求送至其他位址
#ALT ARRANGE|可以為包裹提供替代安排
#ALT BROK/FTZ|貨件交接給FTZ或其他經紀人
#ALT TRACK #|出口前需要新的追蹤號碼
#ALTRD TRACK#|原始追蹤號碼已更改
#AP DEL PROC|送達UPS取貨點
#AP NON DEL|無法送達UPS取貨點
#AP NOT AVAIL|UPS取貨點無法使用
#AP UNAVAIL|AP無法使用，聯絡客戶提供替代送貨地點
#APO/FPO|APO/FPO目前不提供UPS服務
#APPT DEL|要求預約交付
#AREA INACCES|服務區域無法通行-特殊事件
#ARRIVAL SCAN|到達掃描
#ARRIVED AT FACILITY (ORIGIN)|到達設施
#AS-GOVT|航空安全篩查延遲-政府
#ASSGN RECVR|收件人需要清關貼紙
#ASSIGN BROK|需要客戶聯繫以確定經紀人
#AS-UPS|航空安全篩查延遲-UPS
#ATC DELAY|航班受到限流控管
#ATF HOLD|待ATF清關要求
#ATTEMPT SVC|運營嘗試提供服務
#AUTHORITIES|提交給政府相關機構
#AUTO WAREHSE|倉儲，等待清關機構放行
#AWAITING REL|包裹正在清關過程中
#AWAITS PU|等待提貨
#AWT EXP PRC|等待出口處理
#BILLING INFORMATION RECEIVED|建立運單
#BAD TRK INFO|無效或遺失的追蹤號碼
#BILL OPT N/A|客戶沒有選擇付款方式/服務類型
#BILLTYPE ERR|描述/內容不符合文件資格
#BLDG BURNED|建築物燒毀，未能送達
#BNL MISLOAD|包裹未連結，錯誤裝載
#BOND HLD UPS|準備替代地點的保稅文件 - UPS 報關行
#BOND HOLD|正為第三方清關行準備清關文件
#BREAKDOWN|機械故障
#BREAKDOWN OP|財產發生故障
#BREXIT|英國脫歐造成的混亂導致延誤
#BRKRGE HOLD|海關扣留 (超出 UPS 控制範圍)
#BROK ASSIGND|已指派報關行，現正運送中
#BROK RELEASE|報關行已處理完畢，正等海關或政府單位審核放行
#BROK UNRATED|貨件未經報關行評定
#CALL REC|UPS 已聯繫收件人
#CALL SENDER|UPS 已聯繫寄件人
#CALL TAG IND|呼叫標籤指示
#CANCEL DROP|客戶取消自送
#CANCEL PKUP|UPS 存取點取消取件
#CANT GET ADD|無法解決地址錯誤問題
#CAO DELAYED CAO|空運危險品包裹延遲
#CAO DG HOLD CAO|空運危險品包裹扣留
#CBP SP HDLG|海關邊境保護局查驗
#CC FLT MECH|商業航班飛機故障
#CCD CONFLICT|內容不符 - 文件
#CDI LEAVE AT|送貨指示 - 放置於
#CDI LEAVE W/|送貨指示 - 交付給鄰居
#CDI REQUEST|送貨指示
#CENSOR HOLD|政府審查
#CENTRAL PROC|已派送至中央處理中心
#CERT ORG REQ|需要原產地證明
#CHARTER PEND|蘋果數量待包機出發
#CHG REFUNDED|貨運費用已退還
#CHGES REFUND|運費已退還
#CHNG OF SVC|客戶要求變更服務項目
#CIVIL UNREST|公民示威
#CL AGY REJEC|清關行拒絕入境
#CLAIM INVEST|損壞索賠調查中
#CLAIM ISSUED|已批准索賠
#CLIMATE CTRL|放置於溫控環境中
#CLOSED 1|收件人地點關閉1
#CLOSED 2|收件人地點關閉2
#CLOSED 3|收件人地點關閉3
#CLR AGY CLO|清關行辦公室關閉；無法清關
#CLR AGY DOW|清關行電腦故障
#CLR AGY RESU|包裹已重新提交給清關行
#CLR AGY SAMP|清關行已從貨件中提取樣本
#CLR AGY STRI|清關行罷工
#CLR AGY SUBM|貨件已提交給清關行
#CLRD BY NOON|包裹已於中午通過海關
#CLSD RETAIL|UPS 存取點已關閉
#CNEE OK COD|收件人將承擔運費
#CNTRY ORIGIN|發票上缺少原產地國家
#COD PROCESS COD|貨件正由報關行處理
#COLLECT|已收款
#COMBINE SHPT|多個貨件必須合併
#COMMODITY|非核准商品
#COMP ALT DEL|符合性替代派送
#COMP HOLD|符合性扣留待指示
#COMP INSPECT|符合性扣留待檢查
#COMP RTS|符合性退回寄件人
#COMP W/C|符合性待客戶自取
#COMPLETED|攔截成功完成
#CONCIERGE|禮賓服務
#CONFIRM CUST|已與客戶確認安排
#CONS REFUSAL|收貨人不接受送貨
#CONTACT CUST|扣留 - 聯繫客戶
#CONTACT REQD|收件人要求清關前聯繫
#CONTACT SNDR|UPS 將聯繫寄件人提供詳細資訊
#CONTENT INSP|政府檢查潛在的仿冒品
#COULDN'T ADL|無法派送至UPS自提點
#COUNTERFEIT|疑似仿冒品已識別
#COURIER SDWC|快遞員自取之當日自取服務
#CPAD N/A|寄件人 CPAD 限制
#CREATE DCT|已安排損壞檢查
#CREDIT CHECK|報關前需要信用審核
#CREW UNAVAIL|飛行員原因導致延誤
#CTN MT DSCRD|商品遺失，紙箱已丟棄
#CTN MT RTS|商品遺失，紙箱已退回
#CUST ACK REC|亞馬遜確認已收貨
#CUST CANC WC|客戶取消當日自取服務
#CUST CLASS|客戶資料庫中無此商品。需要聯繫。
#CUST CTR PU|客戶將在客戶服務櫃檯自取
#CUST PU PKG|寄件人要求嘗試一次，包裹在 UPS 自取
#CUSTOMS REQU|海關要求
#DAM BAL DEL|損壞商品已退回，餘額待處理
#DAM BAL RTS|部分丟棄，餘額已退回
#DAM HLD AGNT|此損壞貨物由代理商保管
#DAM HLD TRAN|損壞貨物在轉運中心保管
#DAM HLD UPS|損壞包裹由 UPS 保管
#DAM WITH REC|損壞商品已留給收件人
#DAM WITH SDR|損壞商品已留給寄件人
#DAMAG CHM/LQ|運送途中損壞 - 化學品/液體
#DAMAG REC|收件人於送達後通報損壞
#DAMAG SENDER|寄件人於送達後通報損壞
#DAMAGE|包裹在運送途中損壞
#DAMAGE -PART|部分丟棄/餘額已送交收件人
#DAMAGE RPT|已通報損壞
#DAMAGE-ALL|所有商品已丟棄
#DAMAGE-DELV|所有商品已送交收件人
#DAMAGE-RTS|所有商品正被退回
#DCO COMPLETE|更改送貨選項
#DCO MODIFY|送貨選項已修改
#DCO REQUEST|送貨選項請求
#DCR 2ND REQ|此包裹已請求第二次 DCR
#DCR COMPLETE|送貨變更請求已完成
#DCR CREATED|送貨變更請求待處理
#DCR MODIFIED|送貨變更請求已修改
#DCR PENDING|已收到送貨變更請求並待處理
#DCT UPDATE|損壞呼叫標籤更新
#DEA HOLD|緝毒署扣留
#DECK|甲板
#DEL AFT 1030|於承諾送達時間上午 10:30 後送達
#DEL AFT NOON|於承諾送達時間中午 12:00 後送達
#DEL DATE ADJ|送貨日期已重新安排
#DEL DATE TBD|送貨日期待定
#DEL INT COMP|UDI 已完成
#DEL INT MOD|寄件人要求修改攔截
#DEL INT REQ|寄件人要求送貨攔截
#DEL NEXT DAY|包裹將於下一個工作日送達
#DEL NXT DAY|包裹將於下一個工作日準時送達
#DEL STOLEN|包裹從送貨車輛中被竊
#DELAY-SECURE|政府要求安檢
#DELIV TO AP|送往 UPS 存取點待處理
#DELIVERED|已送達
#DELV AFT COM|於服務承諾時間後送達
#DENIED PARTY|政府或國際制裁名篩查
#DEPARTURE|離境掃描
#DERAILMENT|火車出軌
#DESTROY|銷毀
#DETAINMENT|貨件被所列政府機構扣留
#DFU|正在進行駕駛員後續調查
#DIRCTNS FND|已找到路線，送貨已重新安排
#DISPOSED REQ|根據寄件人要求已處置
#DISRUP NTWK|網路中斷 - 曳引車
#DISRUPT WTHR|先前天氣導致網路中斷
#DISRUPTION|發生服務中斷
#DMG IN TRANS|包裹在運送途中損壞
#DNL RESOLVED|請勿裝載問題已解決
#DO NOT LOAD|請勿裝載
#DOC INSPECT |清關行要求文件檢查
#DOC MISSORT|發票或清關行文件分類錯誤
#DOC TO AGENT|文件已交給其他報關行
#DOCS IMAGED|文件已影像化
#DOCS RECVD|要求的文件或資訊已收到
#DOOR PERSON|門房
#DOT HOLD|符合運輸部 (DOT) 要求扣留
#DOWNGRADE|降級、轉運，服務不可用
#DPS DESTROY|拒絕方篩選銷毀包裹
#DR RELEASED|包裹已由司機放置-完成派送
#DRIVER ERROR|發生駕駛員錯誤
#DUPL TRACK #|包裹上的追蹤號碼重複
#DUTY DOC REQ|關稅減免需要額外文件
#DUTY TAX|包裹有應付關稅及/或稅款
#EMAIL|電子郵件已寄出
#EMBARGOED|目的地為UPS不提供服務的國家
#EMERGENCY|緊急狀態，超出UPS控制
#END MESSAGE|訊息結束-無意義
#EPA HOLD|環境保護署扣留
#ERN CLOSED|異常通知 - 關閉
#ERN OPEN|異常通知 - 開啟
#EURO T-1|歐盟包裹 - 未在自由流通
#EURTNL DISRP|歐洲隧道中斷導致延誤
#EXCEED VALUE|貨到付款/保價貨到付款 UPS 存取點金額超出限制
#EXCHANGE|交換事件
#EXCHNGE COMP|交換完成
#EXCL CMMODTY|國際服務排除的商品
#EXCP RESOLVD|異常已解決
#EXIT REFRIG|已從溫控環境中移除
#EXP PRC COMP|出口處理完成
#EXP RESTRICT|貨件受出口限制
#EXPIRED EXCP|已過期 - 無法解決異常
#EXPORT DOCS|缺少出口報關文件
#EXPORT ENTRY|原產地需要正式出口報關
#EXPORT HOLD|出口扣留
#EXPT LIC REQ|需要出口許可證
#F&W INSPECT|貨件需要漁業及野生動物管理局檢查
#FALLOUT|放射性塵埃/商品遺失
#FALLOUT DEL|商品遺失，餘額已送達
#FALLOUT RTS|商品遺遺失，餘額已退回
#FAX OR EMAIL|傳真/電子郵件已寄出
#FBA|亞馬遜入倉標識
#FDA INSPECT|貨件需要食品藥物管理局 (FDA) 檢查
#FDA/AG HOLD|等待 FDA/農業部/植物檢疫局放行
#FDA/POA|需要 FDA 及授權書
#FDR MVT EXC|接駁運輸異常，無可用運輸工具
#FINAL NO EVT|最終 NEE 檢查未收到任何事件
#FIRE|火災或由此造成的水損壞
#FLEX FAIL|彈性測試失敗
#FLEX PRFMD|已執行並通過彈性測試
#FLEX TEST|需要彈性測試
#FLEX-LETTER|內容物驗證為有效信件
#FLEX-NONDOC|客戶確認以非文件形式寄送
#FLT ACFT DMG|飛行中的飛機損壞
#FLT ARRIVED|飛機已抵達目的地
#FLT CANCELED|飛機取消
#FLT DEL CLAG|飛機因清關行延誤
#FLT DEPARTED|飛機已起飛 - 貨物已裝機
#FLT DLAY MEC|UPS飛機故障
#FLT MECH|飛機機械故障，不影響服務
#FORMAL ENTRY|等待正式報關
#FRAUD FLAG|貨件已被標記為詐欺
#FRAUD HOLD|詐欺風險扣留調查/處置
#FRAUD INSPT|政府機構檢查潛在詐欺
#FRAUD RISK|UPS 詐欺風險攔截
#FREE TD ZONE|貨件目的地為自由貿易區
#FRONT DOOR|前門
#FRT DELAYED|貨運延遲
#FRT FORWARDG|透過貨運轉運公司退回或轉運
#FUTURE|保留待日後送達
#FUTURE DEL|保留待日後送達
#FUTURE DELIV|包裹正被保留待日後送達
#FWD CORP L/F|轉交公司失物招領處
#GARAGE|車庫
#GEN PROHIBIT|發現一般禁止物品
#GO HOLD|一般命令/長期扣留
#GOVT AGENCY|包裹已轉交政府機構
#GOVT HOLD|貨件已被政府扣留
#GOVT INSPECT|政府機構要求檢查
#GOVT RE-EVAL|政府機構要求重新評估貨件
#GSE MECH|航班延誤，飛機機械問題
#GSP REQUIRED|入境需要原始 GSP 文件
#GSR APPROVED|主管已批准 GSR
#GSR VOIDED|保證服務退款已失效
#GTW ACFT DMG|在機坪操作期間發生的飛機損壞
#GVRNMNT HOLD|政府機構扣留
#GVT TRANSFER|貨件已轉交當地政府機構
#HAZ MAT HOLD|危險品被扣留
#HEAVYWEIGHT|超重貨件
#HELD ORIGIN|由始發地保管
#HELD PKG PU|收件人已領取被扣留的包裹
#HIGH VALUE|高價值貨件
#HIJACK/STOLN|包裹因車輛被竊或搶劫而遺失
#HLD INSTRUCT|暫停處理，正等待指示
#HM10|危險品
#HOLD FOR PU|寄件人要求保留待取件
#HOLD RESOLVD|扣留已解決
#HOLIDAY|因假日重新安排送貨
#HUB NOT PROC|入站樞紐貨物未處理
#IMP TAX #|需要提供進口商的稅號
#IMPT LIC REQ|需要進口許可證
#INAD DESCRPT|商品描述不充分
#INCOMPL MULT|一票多件未到齊
#INCORR ZIP|郵遞區號不正確
#INT PROHIBIT|UPS禁運物品
#INV ADD LABL|標籤缺失或模糊不清
#KNOWN CLOSED|已知收件公司不營業
#LATE PLANE|飛機遲於計畫時間到達
#LATE TRAILER|班車晚於計畫時間到達
#LATE UPLOAD|PLD 資料上傳延遲
#LITH BATTERY|電池貨
#MISROUTE GRD|因UPS或者UPS外包商錯誤導致車去了錯誤的地方
#MISS CONNECT|貨物趕不上飛機計畫出發時間
#MISS/INC DOC|缺少出口報文件
#MISSORT|分撥到錯誤的CENTE
#MOVED|收件人搬家
#NEED APT #|需要公寓號碼
#NEED SUITE|需要完整房間號
#NEED SUITE #|需要房間號碼
#NEW TRACK #|已為包裹分配新追蹤編號
#NO ACCESS|無法進入收件人地址派送, 需收件人自取.
#NO INVOICE|發票缺失
#NO MONEY|收件人無比稅
#NO MONEY 1|收件人未准備錢 1
#NO MONEY 2|收件人未准備錢 2
#NO MONEY 3|收件人未准備錢 3
#NO SUCH #|無此門牌號碼
#NO SUCH REC|無此收件人或公司
#NO SUCH STRT|無此街道
#NO VALUE|發票上缺少價值
#NOT DISPATCH|因調度不當導致車未能按時出發導致的服務失敗
#NOT IN 1|無人簽收 1
#NOT IN 2|無人簽收 2
#NOT IN 3|無人簽收 3
#NOT KEYED|貨物已到達,但沒有收到報關預報或資料
#NTRL DISASTR|自然災害延誤
#O/VALU LIMIT|總金額超出UPS允許範圍(參考IHVW)
#O/WT LIMIT|包裹/託盤超過最大限制重量
#ORIG HAZ MAT|禁止空運此危險品
#OVER 108 IN|包裹超過最大限制長度
#OVER MAX SZ|包裹/託盤超過最大限制體積
#PAY DUTY TAX|等待付款（放行前)
#PAYMENT AUTH|UPS 正等待收件人的付款授權
#PGA HOLD|美國政府機構暫扣
#PKG ABANDOND|棄貨
#PKG DELAY|包裹正運往目的地
#REC REQUEST|收件人要求UPS稍晚派送
#REF DAMAGED|貨物破損，收件人拒收
#REF DIDN WAN|收件人不想要貨物，拒收
#REF DUTY/VAT|收件人拒付關稅
#REF NO COD|收件人拒絕付款
#REF NO INVCE|沒有發票，收件人拒收
#REF TOO $$$|費用太高，收件人拒收
#REF TOO LATE|派送太晚，收件人拒收
#REFUSED PAY|收件人拒付除關稅以外的所有費用
#RELEASED|狀態解除
#REMOTE AREA|偏遠地區
#REQ LATE DEL|寄件者請求稍晚派送
#RES DEL DATE|重新安排派送時間
#RETRN/SHIPPR|包裹退回寄件人
#SED REQUIRED|缺少出口申報單
#SEIZED BY AUTHORITIES|被當局查獲 貨件已充公
#SENDER INFO|寄件人資訊不完整（姓名/地址）
#SHIPPER RTS|寄件人要求退回包裹
#SPB|中國郵政
#SPEC HANDLE |特別處理 (具體要問當地)
#TEMP ADDRESS|收件人要求改派送地址
#TRANSLATION|發票需要當地語言
#UNDR CLRNCE|包裹正在清關處理中
#UNLOAD SCAN|卸貨
#UPS MIGRAT'N|貨物轉移中
#VERIFY VALUE|貨件被暫扣以核實價值
#WAREHOUSE SCAN|倉庫掃描
#WILL CALL|收件人要求UPS扣貨並自提
#XRAY INSPECT|包裹經過X光可能導致延誤
#SEC/SCR REQ|包裹需要做安檢
#ICOD CHG DUE|交貨時需支付關稅
#DEPARTED FROMFACILITY|貨物離開轉運地掃描
#REGISTERED|提交清關
#LOCATION SCAN|位置掃描
#TRNSFR NOTIF|ERN REMARK更新
#ICOD PAID|已付關稅
#OFD-ON ROAD|在派送路上
#LOADED ON CAR|已裝車
#EXPORT SCAN|貨物出口掃描
#IMPORT SCAN|貨物進口掃描
#IN TRANSIT|貨物在轉運中的掃描
#DRIVER LOAD|貨物被裝車，代表可以派送
#DESTINATION|貨物可以被派送
#OUT FOR DELIVERY|外出派送
#INTL VOL MGT|倉位緊張
#SEC/SCR PASS|已通過安檢
#SHORT LANDED|清關文件已到貨未到
#POA IMP REQ|需要提供授權書（POA）
#OFFSITE BROK|由第三方機構清關和派送
#SIG OBTAINED|獲得簽名
#NOT LATE|無遲到 - 已清除「延誤」標記
#DESTINATION SCAN|目的地掃描
#WAREHOUSE SCAN|倉庫掃描
#LITHIUM LIB|包裹內有鋰電池被暫扣檢查
#NOT READY 1|收件人未準備好收件1
#NOT READY 2|收件人未準備好收件2
#NOT READY 3|收件人未準備好收件3
#P/U SCHED |已安排再收件
#PKG  UNDLVRD|包裹未成功投遞
#NO ADDL INFO|無額外資訊更新
#PROC UPS FAC|包裹已在中心完成處理
#INTERMED HUB SCAN|中轉中心掃描
#MISSING INFO|缺少資料
#PENDING REL|等清關放行
#IMPORT HOLD|海關扣留
#NOT CLEARED|未進行清關
#UNEXP ARRIVL|此包裹不在預清關名單中
#FWD TO DEST|轉發到目的地
#UNAUT ANIMAL|未經授權的動物
#OPSYS HOLD|系统数据暂存
#RECEPTION|接待處
#P.O. BOX|不支援投遞到郵政信箱


####國家#######################################################################################################
#YT|馬約特島
#AF|阿富汗
#AL|阿爾巴尼亞
#DZ|阿爾及利亞
#AD|安道爾
#AO|安哥拉
#AG|安提瓜
#AR|阿根廷
#AM|亞美尼亞
#AU|澳洲 - 澳大利亞
#AT|奧地利
#AZ|阿塞拜疆
#BS|巴哈馬
#BB|巴巴多斯
#BD|孟加拉
#BY|白俄羅斯
#BZ|貝裡斯
#BJ|貝南
#BT|不丹
#BO|玻利維亞
#BW|波札那
#BR|巴西
#VG|英屬維爾京群島
#BN|汶萊
#BG|保加利亞
#BF|布吉納法索
#KH|柬埔寨
#CM|喀麥隆
#CV|維德角
#CA|加拿大
#IC|加那利群島
#KY|開曼群島
#CL|智利
#CN|中國
#CO|哥倫比亞
#CG|剛果
#CK|科克群島
#CR|哥斯達黎加
#CI|象牙海岸
#HR|克羅埃西亞
#CY|賽普勒斯
#CZ|捷克
#DK|丹麥
#DM|多米尼加
#DO|多米尼加共和國
#TL|東帝汶
#EC|厄瓜多爾
#EG|埃及
#SV|薩爾瓦多
#EE|愛沙尼亞
#ET|衣索比亞
#FO|法羅群島 - 法魯島
#FJ|斐濟群島
#FI|芬蘭
#FR|法國
#GF|圭亞那
#PF|法屬 波利尼西亞
#GA|加蓬
#GM|甘比亞
#GE|格魯吉亞
#DE|德國
#GH|迦納
#GR|希臘
#BM|百慕達
#GL|格陵蘭
#GD|格瑞那達
#GP|瓜德羅普
#GT|危地馬拉
#GG|根西
#GN|幾內亞
#GY|圭亞那
#HT|海地
#HN|洪都拉斯
#HK|香港
#HU|匈牙利
#IS|冰島
#IN|印度
#ID|印尼
#IQ|伊拉克
#IE|愛爾蘭
#IL|以色列
#IT|義大利
#JM|牙買加
#JP|日本
#JO|約旦
#KZ|哈薩克
#KE|肯亞
#KR|韓國
#XK|科索沃
#KW|科威特
#KG|吉爾吉斯
#LV|拉脫維亞
#LB|黎巴嫩
#LS|賴索托
#LR|賴比瑞亞
#LY|利比亞
#LT|立陶宛
#MW|馬拉威
#MY|馬來西亞
#MV|馬爾代夫
#ML|馬裡
#MT|馬爾他
#MQ|法屬馬丁尼克
#MX|墨西哥
#MD|莫爾達瓦
#MN|蒙古
#ME|黑山
#MA|摩洛哥
#MZ|莫桑比克
#MM|緬甸
#NA|納米比亞
#NP|尼泊爾
#NL|荷蘭
#AN|荷屬安地列斯群島
#NC|新喀里多尼亞
#NZ|紐西蘭
#NI|尼加拉瓜
#NE|尼日爾
#NG|奈及利亞
#NU|紐埃
#MP|北馬裡安納群島
#NO|挪威
#OM|阿曼
#PK|巴基斯坦
#PS|巴勒斯坦
#PA|巴拿馬
#PG|巴布亞紐幾內亞
#PY|巴拉圭
#PE|秘魯
#PH|菲律賓
#PL|波蘭
#PT|葡萄牙
#PR|波多黎各
#QA|卡達
#RE|留尼旺
#RO|羅馬尼亞
#RU|俄羅斯
#LC|聖露西亞
#MF|法屬聖馬丁
#WS|西薩摩亞
#SA|沙烏地阿拉伯
#SN|塞內加爾
#RS|塞爾維亞
#SL|塞拉利昂
#SX|荷屬聖馬丁
#SK|斯洛伐克
#SI|斯洛維尼亞
#SB|所羅門群島
#ZA|南非
#SS|南蘇丹
#ES|西班牙
#LK|斯裡蘭卡
#SD|蘇丹
#SR|蘇利南
#SZ|史瓦濟蘭
#SE|瑞典
#CH|瑞士
#SY|敘利亞
#TW|臺灣
#TJ|塔吉克 - 塔吉克斯坦
#TZ|坦尚尼亞
#TH|泰國
#TG|多哥
#TO|東加
#TT|千里達和多巴哥
#TN|突尼西亞 - 突尼斯
#TR|土耳其
#TC|土克斯及開科斯群島
#UG|烏幹達
#UA|烏克蘭
#AE|阿聯酋 - 阿拉伯聯合大公國
#GB|英國
#US|美國
#UY|烏拉圭
#UZ|烏茲別克 - 烏茲別克斯坦
#VU|新赫布裡底
#VE|委內瑞拉
#ZM|尚比亞
#ZW|辛巴威
#BH|巴林
#BE|比利時
#BI|布隆迪
#CV|維德角
#CF|中非共和國
#CU|古巴
#DJ|吉布地
#ER|厄立特裡亞
#KI|吉裡巴斯 - 基列巴提
#LA|老撾
#LU|盧森堡
#MG|馬達加斯加
#MR|茅利塔尼亞
#KP|朝鮮
#RW|盧旺達
#TM|土庫曼
#YE|葉門
#GQ|赤道幾內亞
#MK|馬其頓
#VC|聖文森特
#VN|越南
#SM|聖馬利諾
#IR|伊朗
#CD|剛果民主共和國
#YU|南斯拉夫
#TD|查德 - 查德共和國
#SO|索馬裡
#SG|新加坡
#SC|塞席爾
#MU|模裡西斯
#MO|澳門
#MC|摩納哥
#FL|列支敦士登
#GW|幾內亞比索
#AW|阿鲁巴
#BQ|波奈,荷蘭屬加勒比
#CW|庫拉索
#KM|科摩羅
#COMOROS|科摩羅 - KM
#BONAIRE, SINT EUSTATIUS AND SABA|波奈,荷蘭屬加勒比 - BQ
#ARUBA|阿鲁巴 - AW
#CZECHIA|捷克 - CZ
#CONGO, THE DEMOCRATIC REPUBLIC OF|剛果 - CG
#TANZANIA, UNITED REPUBLIC OF|坦尚尼亞 - TZ
#MAYOTTE|馬約特島 - YT
#AFGHANISTAN|阿富汗 - AF
#ALBANIA|阿爾巴尼亞 - AL
#ALGERIA|阿爾及利亞 - DZ
#ANDORRA|安道爾 - AD
#ANGOLA|安哥拉 - AO
#ANTIGUA|安提瓜 - AG
#ARGENTINA|阿根廷 - AR
#ARMENIA|亞美尼亞 - AM
#AUSTRALIA|澳洲 - 澳大利亞 - AU
#AUSTRIA|奧地利 - AT
#AZERBAIJAN|阿塞拜疆 - AZ
#BAHAMAS|巴哈馬 - BS
#BANGLADESH|孟加拉 - BD
#BELARUS|白俄羅斯 - BY
#BARBADOS|巴巴多斯 - BB
#BELIZE|貝裡斯 - BZ
#BENIN|貝南 - BJ
#BHUTAN|不丹 - BT
#BOLIVIA, PLURINATIONAL STATE OF|玻利維亞 - BO
#BOTSWANA|波札那 - BW
#BRAZIL|巴西 - BR
#BRITISH VIRGIN ISLANDS|英屬維爾京群島 - VG
#BRUNEI|汶萊 - BN
#BERMUDA|百慕達 - BM
#BULGARIA|保加利亞 - BG
#BURKINA FASO|布吉納法索 - BF
#CABO VERDE|維德角 - CV
#CAMBODIA|柬埔寨 - KH
#CAMEROON|喀麥隆 - CM
#CANADA|加拿大 - CA
#CANARY ISLANDS|加那利群島 - IC
#CAYMAN ISLANDS|開曼群島 - KY
#CHILE|智利 - CL
#HONG KONG SAR, CHINA|香港 - HK
#CHINA MAINLAND|中國 - CN
#COLOMBIA|哥倫比亞 - CO
#DEMOCRATIC REPUBLIC OF THE CONGO|剛果 - CG
#COOK ISLANDS|科克群島 - CK
#COSTA RICA|哥斯達黎加 - CR
#COTE D IVOIRE|象牙海岸 - CI
#CROATIA|克羅埃西亞 - HR
#CYPRUS|賽普勒斯 - CY
#CZECH REPUBLIC|捷克 - CZ
#DENMARK|丹麥 - DK
#DOMINICA|多明尼加 - DO
#DOMINICAN REPUBLIC|多米尼加共和國 - DO
#EAST TIMOR|東帝汶 - TL
#ECUADOR|厄瓜多爾 - EC
#EGYPT|埃及 - EG
#EL SALVADOR|薩爾瓦多 - SV
#ESTONIA|愛沙尼亞 - EE
#ETHIOPIA|衣索比亞 - ET
#FAROE ISLANDS|法羅群島 - 法魯島 - FO
#FIJI|斐濟群島 - FJ
#FINLAND|芬蘭 - FI
#FRANCE|法國 - FR
#FRENCH GUIANA|圭亞那 - GF
#GUYANA|圭亞那 - GF
#FRENCH POLYNESIA|法屬 波利尼西亞 - PF
#GABON|加蓬 - GA
#GAMBIA|甘比亞 - GM
#GEORGIA|格魯吉亞 - GE
#GERMANY|德國 - DE
#GHANA|迦納 - GH
#GREECE|希臘 - GR
#GREENLAND|格陵蘭 - GL
#GRENADA|格瑞那達 - GD
#GUADELOUPE|瓜德羅普 - GP
#GUATEMALA|危地馬拉 - GT
#GUERNSEY|根西 - GG
#GUINEA REPUBLIC|幾內亞 - GN
#GUINEA|幾內亞 - GN
#HAITI|海地 - HT
#HONDURAS|洪都拉斯 - HN
#HUNGARY|匈牙利 - HU
#ICELAND|冰島 - IS
#INDIA|印度 - IN
#INDONESIA|印尼 - ID
#IRAQ|伊拉克 - IQ
#IRELAND|愛爾蘭 - IE
#ISRAEL|以色列 - IL
#ITALY|義大利 - IT
#JAMAICA|牙買加 - JM
#JAPAN|日本 - JP
#JORDAN|約旦 - JO
#KAZAKHSTAN|哈薩克 - KZ
#KENYA|肯亞 - KE
#KOREA, REPUBLIC OF|韓國 - KR
#KOSOVO|科索沃 - XK
#KUWAIT|科威特 - KW
#KYRGYZSTAN|吉爾吉斯 - KG
#LATVIA|拉脫維亞 - LV
#LEBANON|黎巴嫩 - LB
#LESOTHO|賴索托 - LS
#LIBERIA|賴比瑞亞 - LR
#LIBYA|利比亞 - LY
#LITHUANIA|立陶宛 - LT
#MALAWI|馬拉威 - MW
#MALAYSIA|馬來西亞 - MY
#MALDIVES|馬爾代夫 - MV
#MALI|馬裡 - ML
#MALTA|馬爾他 - MT
#MARTINIQUE|法屬馬丁尼克 - MQ
#MEXICO|墨西哥 - MX
#MOLDOVA|摩爾多瓦 - MD
#MOLDOVA, REPUBLIC OF|摩爾多瓦 - MD
#MONGOLIA|蒙古 - MN
#MONTENEGRO|黑山 - ME
#MOROCCO|摩洛哥 - MA
#MOZAMBIQUE|莫桑比克 - MZ
#MYANMAR|緬甸 - MM
#NAMIBIA|納米比亞 - NA
#NEPAL|尼泊爾 - NP
#NETHERLANDS|荷蘭 - NL
#NETHERLANDS ANTILLES|荷屬安地列斯群島 - AN
#NEW CALEDONIA|新喀里多尼亞 - NC
#NEW ZEALAND|紐西蘭 - NZ
#NICARAGUA|尼加拉瓜 - NI
#NIGER|尼日爾 - NE
#NIGERIA|奈及利亞 - NG
#NIUE|紐埃 - NU
#NORTHERN MARIANA ISLANDS|北馬裡安納群島 - MP
#NORWAY|挪威 - NO
#OMAN|阿曼 - OM
#PAKISTAN|巴基斯坦 - PK
#PALESTINIAN TERRITORY|巴勒斯坦 - PS
#PANAMA|巴拿馬 - PA
#PAPUA NEW GUINEA|巴布亞紐幾內亞 - PG
#PARAGUAY|巴拉圭 - PY
#PERU|秘魯 - PE
#PHILIPPINES|菲律賓 - PH
#POLAND|波蘭 - PL
#PORTUGAL|葡萄牙 - PT
#PUERTO RICO|波多黎各 - PR
#QATAR|卡達 - QA
#REUNION|留尼旺 - RE
#ROMANIA|羅馬尼亞 - RO
#RUSSIAN FEDERATION|俄羅斯 - RU
#SAINT LUCIA|聖露西亞 - LC
#SAINT MARTIN|法屬聖馬丁 - MF
#SAMOA|西薩摩亞 - WS
#SAUDI ARABIA|沙烏地阿拉伯 - SA
#SENEGAL|塞內加爾 - SN
#SERBIA|塞爾維亞 - RS
#SIERRA LEONE|塞拉利昂 - SL
#SINT MAARTEN|荷屬聖馬丁 - SX
#SLOVAKIA|斯洛伐克 - SK
#SLOVENIA|斯洛維尼亞 - SI
#SOLOMON ISLANDS|所羅門群島 - SB
#SOUTH AFRICA|南非 - ZA
#SOUTH SUDAN|南蘇丹 - SS
#SPAIN|西班牙 - ES
#SRI LANKA|斯裡蘭卡 - LK
#SUDAN|蘇丹 - SD
#SURINAME|蘇利南 - SR
#SWAZILAND|史瓦濟蘭 - SZ
#ESWATINI|史瓦濟蘭 - SZ
#SWEDEN|瑞典 - SE
#SWITZERLAND|瑞士 - CH
#SYRIA|敘利亞 - SY
#TAIWAN|臺灣 - TW
#TAJIKISTAN|塔吉克 - 塔吉克斯坦 - TJ
#TANZANIA|坦尚尼亞 - TZ
#THAILAND|泰國 - TH
#TOGO|多哥 - TG
#TONGA|東加 - TO
#TRINIDAD AND TOBAGO|千里達和多巴哥 - TT
#TUNISIA|突尼西亞 - 突尼斯 - TN
#TÜRKIYE|土耳其 - TR
#TURKS AND CAICOS ISLANDS|土克斯及開科斯群島 - TC
#UGANDA|烏幹達 - UG
#UKRAINE|烏克蘭 - UA
#UNITED ARAB EMIRATES|阿聯酋 - 阿拉伯聯合大公國 - AE
#UNITED KINGDOM|英國 - GB
#AMERICA|美國 - US
#URUGUAY|烏拉圭 - UY
#UZBEKISTAN|烏茲別克 - 烏茲別克斯坦 - UZ
#NETHERLANDS, KINGDOM OF THE|荷蘭
#VANUATU|新赫布裡底 - VU
#VENEZUELA, BOLIVARIAN REPUBLIC OF|委內瑞拉 - VE
#ZAMBIA|尚比亞 - ZM
#ZIMBABWE|辛巴威 - ZW
#BAHRAIN|巴林 - BH
#BELGIUM|比利時 - BE
#BURUNDI|布隆迪 - BI
#CAPE VERDE|維德角 - CV
#CENTRAL AFRICAN REPUBLIC|中非共和國 - CF
#CUBA|古巴 - CU
#DJIBOUTI|吉布地 - DJ
#ERITREA|厄立特裡亞 - ER
#KIRIBATI|吉裡巴斯 - 基列巴提 - KI
#LAOS|老撾 - LA
#LUXEMBOURG|盧森堡 - LU
#MADAGASCAR|馬達加斯加 - MG
#MAURITANIA|茅利塔尼亞 - MR
#NORTH KOREA|朝鮮 - KP
#RWANDA|盧旺達 - RW
#TURKMENISTAN|土庫曼 - TM
#YEMEN|葉門 - YE
#EQUATORIAL GUINEA|赤道幾內亞 - GQ
#MACEDONIA|馬其頓 - MK
#SAINT VINCENT AND THE GRENADINES|聖文森特 - VC
#VIET NAM|越南 - VN
#SAN MARINO|聖馬利諾 - SM
#IRAN|伊朗 - IR
#CONGO DEMOCRATIC REPUBLIC|剛果民主共和國 - CD
#YUGOSLAVIA|南斯拉夫 - YU
#CHAD|查德 - 查德共和國 - TD
#SOMALIA|索馬裡 - SO
#SINGAPORE|新加坡 - SG
#SEYCHELLES|塞席爾 - SC
#MAURITIUS|模裡西斯 - MU
#MACAU|澳門 - MO
#MONACO|摩納哥 - MC
#LIECHTENSTEIN|列支敦士登 - FL
#GUINEA-BISSAU|幾內亞比索 - GW
    `;
    const excludeText = `
, PA
DO NOT ANNOTATE
Ship To
Refundable : NO
Load Destination
(HK)
Destination Center
ID :
, NOT DELIVERED
UNAUTHORIZED ANIMAL DESTROY
Ship To WAREHOUSE
User ID
UPS ACCESS POINT
Package ID
PACKAGE WAS DRIVER RELEASED
Search By:

`;

    const annotations = annotationsText.trim().split('\n').filter(line => line.trim());
    const excludeList = excludeText.trim().split('\n').filter(line => line.trim()).map(text => text.toLowerCase());
    const annotationClassName = "tm-annotation-added";
    const escapeReg = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const keyToNote = new Map();
    const wordBoundaryKeys = new Set();
    const processedNodes = new WeakSet();

    annotations.forEach(annotation => {
        const [keys, note] = annotation.split("|");
        if (keys && note) {
            if (keys.startsWith('##')) {
                const keysWithoutPrefix = keys.substring(2);
                keysWithoutPrefix.split(",").forEach(key => {
                    const trimmedKey = key.trim();
                    if (trimmedKey) {
                        keyToNote.set(trimmedKey, note);
                        wordBoundaryKeys.add(trimmedKey);
                    }
                });
            } else {
                keys.split(",").forEach(key => {
                    if (key) {
                        if (key.startsWith('#')) {
                            const boundaryKey = key.substring(1);
                            keyToNote.set(boundaryKey, note);
                            wordBoundaryKeys.add(boundaryKey);
                        } else {
                            keyToNote.set(key, note);
                        }
                    }
                });
            }
        }
    });

    const keysSorted = Array.from(keyToNote.keys()).sort((a, b) => b.length - a.length);
    const boundaryPatterns = keysSorted.filter(key => wordBoundaryKeys.has(key)).map(key => '(?<![a-zA-Z0-9])' + escapeReg(key) + '(?![a-zA-Z0-9,.:!?-]|.{1,4}[a-zA-Z0-9,.:!?-]|[\r\n])').join("|");
    const normalPatterns = keysSorted.filter(key => !wordBoundaryKeys.has(key)).map(escapeReg).join("|");
    const allPatterns = [boundaryPatterns, normalPatterns].filter(p => p).join("|");
    const unionRegex = new RegExp(allPatterns, "g");

    const DEFAULTS = {
        tbodyMaxHeight: 375,
        annotationColor: '#FF0000' // 默認注釋顏色為紅色
    };

    const SELECTORS = {
        buttonContainer: 'ol.tabs.section-tabs',
        movementTbody: 'app-ivp-pd-trackingno-movement section.tbl-mv tbody',
        fullViewMarginTarget: 'app-ivp-pd-trackingno-movement .ft-container',
        tabLabel: '.mat-tab-label',
        movementComponent: 'app-ivp-pd-trackingno-movement',
        prevNextContainer: 'app-ivp-pd-trackingno-movement .div-prev-next',
        footerButtons: 'app-ivp-pd-trackingno-movement .ft-btn > button'
    };

    const CSS_CLASSES = {
        annotationsHidden: 'ivp-gemini-annotations-hidden'
    };

    const SCRIPT_STATE = {
        annotationsAreVisible: true,
        isFullViewModeActive: false
    };

    const FULL_VIEW_STYLE_ID = 'ivp-full-view-dynamic-styles';

    function injectBaseStyles() {
        const styleId = 'ivp-gemini-base-styles';
        if (document.getElementById(styleId)) return;
        const css = `
            .tm-fa-icon { font-family: "Font Awesome 5 Free", "Font Awesome 5 Solid", "FontAwesome", sans-serif !important; font-weight: 900 !important; display: inline-block !important; font-style: normal !important; font-variant: normal !important; text-rendering: auto !important; -webkit-font-smoothing: antialiased; }
            ${SELECTORS.buttonContainer} { position: relative !important; display: flex !important; align-items: center !important; }
            #call-complete { display: block !important; align-self: center !important; margin-left: auto !important; margin-right: 50px !important; }
            /* [修改] 移除了 color: red !important; 規則，顏色將由動態樣式控制 */
            .tm-annotation-note { display: inline; margin-left: 5px; font-size: 1em; font-weight: bold; font-family: "Microsoft YaHei", "PingFang TC", sans-serif !important; }
            body.${CSS_CLASSES.annotationsHidden} .tm-annotation-note { display: none !important; }
        `;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = css;
        document.head.appendChild(style);
        console.log("%c[UI] 基礎樣式表已注入。", "color: green; font-weight: bold;");
    }

    // [新增] 注入用於動態修改顏色的專用 <style> 標籤
    function injectDynamicStyles() {
        const styleId = 'ivp-dynamic-annotation-style';
        if (document.getElementById(styleId)) return;
        const style = document.createElement('style');
        style.id = styleId;
        document.head.appendChild(style);
    }

    // [新增] 應用存儲的顏色到動態 <style> 標籤
    function applyAnnotationColor() {
        const styleElement = document.getElementById('ivp-dynamic-annotation-style');
        if (!styleElement) return;
        const color = GM_getValue('annotationColor', DEFAULTS.annotationColor);
        styleElement.textContent = `.tm-annotation-note { color: ${color} !important; }`;
    }

    function applyOrRemoveFullViewStyles() {
        let existingStyle = document.getElementById(FULL_VIEW_STYLE_ID);
        if (existingStyle) {
            existingStyle.remove();
        }
        if (SCRIPT_STATE.isFullViewModeActive) {
            const css = `
                /* [修改] 進入一眼睇曬模式時，將整個頁面的根字體大小縮放至60% */
                html {
                    font-size: 60% !important;
                }

                /* [新增] 針對 GSR Status 特定容器的佈局調整 */
                /* 使用 :has 語法精確定位含有 GSR Status 結構的 container */
                div.container:has(.row > .col-10.text-center) {
                    margin-top: 67rem !important;
                    position: relative; /* 確保 z-index 生效 */
                    z-index: 5; /* 防止被遮擋 */
                }

                /* [新增] 壓縮按鈕尺寸 */
                .btnsmall {
                    padding: .001rem .3rem!important;
                    font-size: .775rem!important;
                }

                /* [新增] 調整水平分割線邊距 */
                hr {
                    margin-top: -15px;
                    margin-bottom: 7px;
                }

                /* ... (保留你原有的其他樣式規則: 基礎隱藏、表格行高、Prev/Next 按鈕等) ... */
                app-ivp-pd-trackingno-detail .ng-star-inserted > .row,
                app-root > .ng-star-inserted > .row,
                .ng-star-inserted.h5tracking,
                .footer { display: none !important; }

                .table th, .table td {
                    padding-top: 0.01rem !important;
                    padding-bottom: 0.001rem !important;
                }

                .mat-tab-label {
                    height: 45px;
                    padding: 0 24px;
                    cursor: pointer;
                    box-sizing: border-box;
                    opacity: .6;
                    min-width: 100px;
                    text-align: center;
                    display: inline-flex;
                    justify-content: center;
                    align-items: center;
                    white-space: nowrap;
                    position: relative;
                }

                ${SELECTORS.fullViewMarginTarget} { margin-top: -2px !important; }

                ${SELECTORS.movementComponent} {
                    position: relative !important;
                    padding-bottom: 40px !important;
                }

                ${SELECTORS.prevNextContainer} {
                    position: absolute !important;
                    margin: -5px !important;
                    left: 50% !important;
                    transform: translateX(-50%) !important;
                    width: auto !important;
                    z-index: 10 !important;
                }

                ${SELECTORS.prevNextContainer} .btn-prev-next {
                    padding-left: 64px !important;
                    padding-right: 83px !important;
                }

                ${SELECTORS.footerButtons} {
                    display: inline-flex !important;
                    align-items: center;
                    justify-content: center;
                }
            `;
            const style = document.createElement('style');
            style.id = FULL_VIEW_STYLE_ID;
            style.textContent = css;
            document.head.appendChild(style);
        }
    }

    function syncBodyClasses() {
        document.body.classList.toggle(CSS_CLASSES.annotationsHidden, !SCRIPT_STATE.annotationsAreVisible);
    }

    function applyTbodyHeight() {
        const height = SCRIPT_STATE.isFullViewModeActive ? 800 : GM_getValue('tbodyMaxHeight', DEFAULTS.tbodyMaxHeight);
        const tbody = document.querySelector(SELECTORS.movementTbody);
        if (tbody && tbody.style.maxHeight !== `${height}px`) {
            tbody.style.display = 'block';
            tbody.style.maxHeight = `${height}px`;
            tbody.style.overflowY = 'scroll';
            tbody.style.borderBottom = '1px solid #dee2e6';
        }
    }

    function triggerSeamlessHeightAdjustment() {
        window.requestAnimationFrame(() => {
            applyTbodyHeight();
            window.requestAnimationFrame(applyTbodyHeight);
        });
    }

    function createAndPlaceButtons() {
        if (document.getElementById('tm-full-view-btn')) return;

        const container = document.querySelector(SELECTORS.buttonContainer);
        if (!container) return;

        const RIGHT_OFFSET_ANNOTATION_BTN = 169;
        const RIGHT_OFFSET_FULLVIEW_BTN = 275;

        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'tm-toggle-annotation-btn';
        toggleBtn.className = 'btn btn-secondary btnfont ng-star-inserted';
        const updateToggleButton = () => {
            const icon = SCRIPT_STATE.annotationsAreVisible ? 'fa-eye' : 'fa-eye-slash';
            const text = SCRIPT_STATE.annotationsAreVisible ? '隱藏註釋' : '顯示註釋';
            toggleBtn.innerHTML = `<em class="fas ${icon}"></em> <span class="btn-text">${text}</span>`;
        };
        toggleBtn.style.cssText = `padding: 0.2rem 0.6rem !important; position: absolute !important; top: 50% !important; transform: translateY(-50%) !important; right: ${RIGHT_OFFSET_ANNOTATION_BTN}px !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 0.2rem !important; font-family: "Segoe UI Variable Display Semib", "PingFang TC", sans-serif !important;`;
        toggleBtn.addEventListener('click', () => {
            SCRIPT_STATE.annotationsAreVisible = !SCRIPT_STATE.annotationsAreVisible;
            updateToggleButton();
            syncBodyClasses();
        });

        const fullViewBtn = document.createElement('button');
        fullViewBtn.id = 'tm-full-view-btn';
        fullViewBtn.className = 'btn btn-secondary btnfont ng-star-inserted';
        const updateFullViewButton = () => {
            const icon = SCRIPT_STATE.isFullViewModeActive ? 'fa-compress-arrows-alt' : 'fa-expand-arrows-alt';
            const text = SCRIPT_STATE.isFullViewModeActive ? '返回原版' : '一眼睇曬';
            fullViewBtn.innerHTML = `<em class="fas ${icon}"></em> <span class="btn-text">${text}</span>`;
            fullViewBtn.classList.toggle('btn-primary', SCRIPT_STATE.isFullViewModeActive);
        };
        fullViewBtn.style.cssText = `padding: 0.2rem 0.6rem !important; position: absolute !important; top: 50% !important; transform: translateY(-50%) !important; right: ${RIGHT_OFFSET_FULLVIEW_BTN}px !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 0.2rem !important; font-family: "Segoe UI Variable Display Semib", "PingFang TC", sans-serif !important;`;
        fullViewBtn.addEventListener('click', () => {
            SCRIPT_STATE.isFullViewModeActive = !SCRIPT_STATE.isFullViewModeActive;
            GM_setValue('fullViewMode', SCRIPT_STATE.isFullViewModeActive);
            SCRIPT_STATE.annotationsAreVisible = SCRIPT_STATE.isFullViewModeActive;
            updateFullViewButton();
            applyOrRemoveFullViewStyles();
            triggerSeamlessHeightAdjustment();
            updateToggleButton();
            syncBodyClasses();
        });

        const settingsBtn = document.createElement('button');
        settingsBtn.id = 'tm-settings-btn';
        settingsBtn.title = '腳本設定';
        settingsBtn.className = 'btn btn-secondary btnfont ng-star-inserted';
        settingsBtn.innerHTML = `<em class="fas fa-cog"></em>`;
        settingsBtn.style.cssText = `padding: 0.4rem 0.4rem !important; position: absolute !important; top: 50% !important; transform: translateY(-50%) !important; right: 11px !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; font-family: "Segoe UI Variable Display Semib", "PingFang TC", sans-serif !important;`;
        settingsBtn.addEventListener('click', createSettingsPanel);


        updateToggleButton();
        updateFullViewButton();
        container.appendChild(toggleBtn);
        container.appendChild(fullViewBtn);
        container.appendChild(settingsBtn);
        console.log("%c[UI] 功能按鈕已載入 (包含設置按鈕)。", "color: purple; font-weight: bold;");
    }

    function waitForUIAndInjectButtons() {
        const uiObserver = new MutationObserver((mutations, observer) => {
            const container = document.querySelector(SELECTORS.buttonContainer);
            if (container) {
                createAndPlaceButtons();
                observer.disconnect();
            }
        });
        uiObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function startInstantHeightAdjuster() {
        document.body.addEventListener('click', (event) => {
            if (event.target.closest(SELECTORS.tabLabel)) {
                triggerSeamlessHeightAdjustment();
            }
        });
        console.log("%c[UI] 無縫分頁點擊監聽器已啟動。", "color: blue; font-weight: bold;");
    }

    function createSettingsPanel() {
        if (document.getElementById('ivp-settings-modal')) return;

        const currentHeight = GM_getValue('tbodyMaxHeight', DEFAULTS.tbodyMaxHeight);
        const currentColor = GM_getValue('annotationColor', DEFAULTS.annotationColor);

        const modalHTML = `
            <div id="ivp-settings-modal" class="ivp-settings-backdrop">
                <div class="ivp-settings-content">
                    <div class="ivp-settings-header">
                        <h2>IVP 腳本設定</h2>
                        <button id="ivp-settings-close" title="關閉">&times;</button>
                    </div>
                    <div class="ivp-settings-body">
                        <div class="ivp-settings-option">
                            <label class="ivp-settings-label" for="tbodyMaxHeightInput">Movement 列表最大高度 (原始 ${DEFAULTS.tbodyMaxHeight})</label>
                            <div class="ivp-settings-input-group">
                                <input type="number" id="tbodyMaxHeightInput" class="ivp-settings-input" value="${currentHeight}">
                                <span>px</span>
                            </div>
                        </div>
                        <hr class="ivp-settings-divider">
                        <div class="ivp-settings-option">
                            <label class="ivp-settings-label" for="annotationColorPicker">注釋文字顏色</label>
                            <div class="ivp-settings-input-group">
                                <code id="colorPreviewText" class="ivp-color-preview-text">${currentColor.toUpperCase()}</code>
                                <input type="color" id="annotationColorPicker" class="ivp-settings-color-input" value="${currentColor}">
                            </div>
                        </div>
                    </div>
                    <!-- [新增] 設置面板頁腳和恢復默認按鈕 -->
                    <div class="ivp-settings-footer">
                        <button id="ivp-settings-reset" class="ivp-settings-reset-btn">恢復默認設定</button>
                    </div>
                </div>
            </div>`;

        const modalCSS = `
            .ivp-settings-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 2147483647; display: flex; justify-content: center; align-items: center; opacity: 0; transition: opacity .3s ease; }
            .ivp-settings-backdrop.visible { opacity: 1; }
            .ivp-settings-content { background: #fff; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); width: 90%; max-width: 480px; font-family: -apple-system, BlinkMacSystemFont, "Microsoft YaHei", Roboto, Helvetica, Arial, sans-serif; transform: scale(.95); transition: transform .3s ease, opacity .3s ease; opacity: 0; }
            .ivp-settings-backdrop.visible .ivp-settings-content { transform: scale(1); opacity: 1; }
            .ivp-settings-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 1px solid #e0e0e0; }
            .ivp-settings-header h2 { margin: 0; font-size: 1.25rem; color: #333; }
            #ivp-settings-close { background: 0 0; border: 0; font-size: 2rem; color: #888; cursor: pointer; line-height: 1; padding: 0; }
            #ivp-settings-close:hover { color: #000; }
            .ivp-settings-body { padding: 16px 24px 24px; }
            .ivp-settings-option { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; }
            .ivp-settings-label { font-size: 1rem; color: #555; flex-grow: 1; margin-right: 16px; }
            .ivp-settings-divider { border: 0; border-top: 1px solid #eee; margin: 8px 0; }
            .ivp-settings-switch { position: relative; display: inline-block; width: 50px; height: 28px; flex-shrink: 0; cursor: pointer; }
            .ivp-settings-switch input { opacity: 0; width: 0; height: 0; }
            .ivp-settings-slider { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; border-radius: 28px; transition: .4s; }
            .ivp-settings-slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 4px; bottom: 4px; background-color: #fff; border-radius: 50%; transition: .4s; }
            input:checked + .ivp-settings-slider { background-color: #0070d2; }
            input:checked + .ivp-settings-slider:before { transform: translateX(22px); }
            .ivp-settings-input-group { display: flex; align-items: center; flex-shrink: 0; }
            .ivp-settings-input { width: 80px; padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px; text-align: right; font-size: .95rem; }
            .ivp-settings-input-group span { margin-left: 8px; color: #777; }
            .ivp-settings-color-input { width: 40px; height: 28px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; padding: 2px; background-color: #fff; }
            .ivp-color-preview-text { font-family: monospace; background-color: #f0f0f0; padding: 4px 8px; border-radius: 4px; margin-right: 12px; }
            /* [新增] 頁腳和恢復默認按鈕的樣式 */
            .ivp-settings-footer { padding: 16px 24px; border-top: 1px solid #e0e0e0; text-align: right; }
            .ivp-settings-reset-btn { background-color: #f8f9fa; border: 1px solid #dee2e6; color: #212529; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.9rem; transition: background-color .2s ease; }
            .ivp-settings-reset-btn:hover { background-color: #e2e6ea; }
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const styleSheet = document.createElement("style");
        styleSheet.id = 'ivp-settings-styles';
        styleSheet.textContent = modalCSS;
        document.head.appendChild(styleSheet);


        const modal = document.getElementById('ivp-settings-modal');
        const closeBtn = document.getElementById('ivp-settings-close');
        const heightInput = document.getElementById('tbodyMaxHeightInput');
        const colorPicker = document.getElementById('annotationColorPicker');
        const colorPreview = document.getElementById('colorPreviewText');
        const resetBtn = document.getElementById('ivp-settings-reset');

        const showModal = () => {
            setTimeout(() => modal.classList.add('visible'), 10);
        };

        const hideModal = () => {
            modal.classList.remove('visible');
            setTimeout(() => {
                const style = document.getElementById('ivp-settings-styles');
                if (modal) modal.remove();
                if (style) style.remove();
            }, 300);
        };

        closeBtn.addEventListener('click', hideModal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) hideModal();
        });

        heightInput.addEventListener('change', () => {
            // [修正] 避免換行造成語法錯誤，並確保輸入無效時回落默認值
            const newHeight = parseInt(heightInput.value, 10) || DEFAULTS.tbodyMaxHeight;
            GM_setValue('tbodyMaxHeight', newHeight);
            triggerSeamlessHeightAdjustment();
        });

        colorPicker.addEventListener('input', (event) => {
            const newColor = event.target.value;
            colorPreview.textContent = newColor.toUpperCase();
            GM_setValue('annotationColor', newColor);
            applyAnnotationColor();
        });

        resetBtn.addEventListener('click', () => {
            GM_setValue('tbodyMaxHeight', DEFAULTS.tbodyMaxHeight);
            GM_setValue('annotationColor', DEFAULTS.annotationColor);
            triggerSeamlessHeightAdjustment();
            applyAnnotationColor();
            heightInput.value = DEFAULTS.tbodyMaxHeight;
            colorPicker.value = DEFAULTS.annotationColor;
            colorPreview.textContent = DEFAULTS.annotationColor.toUpperCase();
        });

        showModal();
    }

    // [新增] 判斷整句是否為地址行格式：門牌 + 街道,,城市,代碼(可選括號)
    function isAddressLineFormat(text) {
        const t = text.trim();
        if (!t) return false;
        if (!/^\d/.test(t)) return false;
        if (t.indexOf(',,') === -1) return false;
        return /^\d+[^,\r\n]*,,[^,\r\n]+,[A-Z]{2,3}(\([^)]*\))?$/.test(t);
    }

    // [新增] 通用規則：若文字是「標籤(含冒號)」後方段落中的短大寫值，則不做註釋
    function isLabeledShortValueNode(textNode) {
        const p = textNode && textNode.parentElement;
        if (!p || p.tagName !== 'P') return false;

        const value = (textNode.nodeValue || '').trim();
        if (!/^[A-Z]{2,3}$/.test(value)) return false;

        const prev = p.previousElementSibling;
        if (!prev) return false;

        const labelText = (prev.textContent || '').trim();
        return labelText.includes(':');
    }

    // [新增] 取得 Ship To 區塊容器（存在 "Ship To" 標籤者）
    function getShipToContainer(textNode) {
        const p = textNode && textNode.parentElement;
        if (!p) return null;

        const container = p.closest('div.col.col-12');
        if (!container) return null;

        const strongList = container.querySelectorAll('strong');
        for (const s of strongList) {
            const t = (s.textContent || '').replace(/\s+/g, ' ').trim();
            if (t === 'Ship To') return container;
        }
        return null;
    }

    // [新增] Ship To 區塊內：同一獨立行重複出現時，只注釋最後一次
    function shouldAnnotateLastDuplicateLine(textNode, matchText) {
        const container = getShipToContainer(textNode);
        if (!container) return true;

        const lineEl = textNode.parentElement && textNode.parentElement.closest('span.ng-star-inserted');
        if (!lineEl) return true;

        const lineText = (lineEl.textContent || '').replace(/\s+/g, ' ').trim();
        if (lineText !== matchText) return true;

        const list = Array.from(container.querySelectorAll('span.ng-star-inserted'))
        .filter(el => (el.textContent || '').replace(/\s+/g, ' ').trim() === matchText);

        if (list.length <= 1) return true;
        return list[list.length - 1] === lineEl;
    }

    // [新增] 通用規則：含逗號的地址行內，若命中詞前面（忽略空白）緊接字母，視為片語一部分，跳過注釋
    function isMatchInCommaAddressPhrase(text, matchStart, matchText) {
        if (/^[A-Z]{2,3}$/.test(matchText)) return false;
        const lineStart = text.lastIndexOf('\n', matchStart - 1) + 1;
        let lineEnd = text.indexOf('\n', matchStart);
        if (lineEnd === -1) lineEnd = text.length;

        const line = text.slice(lineStart, lineEnd);
        if (line.indexOf(',') === -1) return false;
        if (line.trim() === matchText) return false;

        let i = matchStart - 1;
        while (i >= lineStart && /\s/.test(text[i])) i--;
        if (i < lineStart) return false;

        return /[A-Za-z]/.test(text[i]);
    }


    // [修改] 通用規則：用格式識別判斷逗號後兩位字母是否屬於州碼語境，避免硬編碼州碼
    function isCommaSeparatedStateCode(text, matchStart, matchText) {
        if (!/^[A-Z]{2}$/.test(matchText)) return false;

        // 逗號語境：忽略空白後，左邊必須係逗號
        let i = matchStart - 1;
        while (i >= 0 && /\s/.test(text[i])) i--;
        if (i < 0 || text[i] !== ',') return false;

        // 取同一行範圍
        const lineStart = text.lastIndexOf('\n', matchStart - 1) + 1;
        let lineEnd = text.indexOf('\n', matchStart);
        if (lineEnd === -1) lineEnd = text.length;

        // 取命中後嘅尾綴內容
        let j = matchStart + matchText.length;
        while (j < lineEnd && /\s/.test(text[j])) j++;
        const tail = text.slice(j, lineEnd);

        // 若尾綴跟住另一段代碼（兩至三位字母），通常代表前者係州碼，後者係國別或其他代碼
        if (/^[A-Z]{2,3}(\b|$)/.test(tail)) return true;

        // 若尾綴跟住郵編數字（常見三至六位），通常代表州碼語境
        if (/^\d{3,6}(\b|$)/.test(tail)) return true;

        // 若尾綴有括號附加資訊（例如括號內代碼或數字），通常仍屬地址尾段結構
        if (/^\([^)]{1,12}\)/.test(tail)) return true;

        // 行尾情況：用斜線格式作為「國別碼」特徵，否則傾向當作州碼語境
        const line = text.slice(lineStart, lineEnd);
        if (tail.trim() === '') {
            if (line.indexOf('/') !== -1) return false; // 斜線格式：行尾兩位字母更可能係國別或地區碼，允許註釋
            return true; // 非斜線格式：行尾兩位字母更可能係州碼，跳過註釋
        }

        return false;
    }


    function annotateTextNode(node) {
        if (!node ||
            node.nodeType !== Node.TEXT_NODE ||
            !node.nodeValue ||
            !node.nodeValue.trim()) return;

        if (node.parentNode && node.parentNode.closest && node.parentNode.closest("." + annotationClassName)) return;

        const text = node.nodeValue;

        if (excludeList.some(excludeItem => text.toLowerCase().includes(excludeItem))) return;

        // [新增] 通用規則：符合地址行格式則整句不做註釋，避免代碼被注釋
        if (isAddressLineFormat(text)) return;

        // [新增] 通用規則：標籤冒號後方的短大寫值不註釋
        if (isLabeledShortValueNode(node)) return;

        unionRegex.lastIndex = 0;
        if (!unionRegex.test(text)) return;

        unionRegex.lastIndex = 0;
        let lastIndex = 0;
        const frag = document.createDocumentFragment();
        let m;
        let didAddNote = false;

        while ((m = unionRegex.exec(text)) !== null) {
            const matchText = m[0];
            const matchStart = m.index;

            if (matchStart > lastIndex) {
                frag.appendChild(document.createTextNode(text.slice(lastIndex, matchStart)));
            }

            frag.appendChild(document.createTextNode(matchText));

            // [新增] 通用規則：逗號後兩位代碼視為地址州碼語境，跳過註釋
            if (isCommaSeparatedStateCode(text, matchStart, matchText)) {
                lastIndex = matchStart + matchText.length;
                continue;
            }

            // [新增] 通用規則：地址行片語內命中則不注釋（例如 WESTERN AUSTRALIA）
            if (isMatchInCommaAddressPhrase(text, matchStart, matchText)) {
                lastIndex = matchStart + matchText.length;
                continue;
            }

            // [新增] 通用規則：Ship To 區塊重複獨立行，只注釋最後一次
            if (!shouldAnnotateLastDuplicateLine(node, matchText)) {
                lastIndex = matchStart + matchText.length;
                continue;
            }

            const noteSpan = document.createElement("span");
            noteSpan.className = "tm-annotation-note";
            noteSpan.textContent = `(${keyToNote.get(matchText)})`;
            frag.appendChild(noteSpan);
            didAddNote = true;

            lastIndex = matchStart + matchText.length;
        }

        if (lastIndex < text.length) {
            frag.appendChild(document.createTextNode(text.slice(lastIndex)));
        }

        if (!didAddNote) return;

        const wrapper = document.createElement("span");
        wrapper.classList.add(annotationClassName);
        wrapper.appendChild(frag);
        processedNodes.add(node);
        node.parentNode.replaceChild(wrapper, node);
    }

    function processElement(rootElement) {
        if (!rootElement ||
            !rootElement.nodeType) return;

        if (rootElement.nodeName === "INPUT" ||
            rootElement.nodeName === "TEXTAREA" ||
            rootElement.isContentEditable) return;

        const forbiddenAncestorsSelector = 'INPUT, TEXTAREA, BUTTON, SELECT, OPTION, SCRIPT, STYLE, [contenteditable="true"]';
        const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT, null);
        const nodes = [];
        let node;

        while ((node = walker.nextNode())) {
            const p = node.parentNode;
            if (p && p.closest(forbiddenAncestorsSelector)) {
                continue;
            }
            if (!processedNodes.has(node)) {
                nodes.push(node);
            }
        }

        nodes.forEach(annotateTextNode);

        const elementsWithShadowRoot = rootElement.querySelectorAll('*');
        elementsWithShadowRoot.forEach(el => {
            if (el.shadowRoot) {
                processElement(el.shadowRoot);
            }
        });
    }

    function observeIframe(iframe) {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (!iframeDoc || !iframeDoc.body) return;

            if (iframeDoc.readyState === "complete") {
                observeDocument(iframeDoc);
                processElement(iframeDoc.body);
            } else {
                iframe.addEventListener("load", () => {
                    observeDocument(iframeDoc);
                    processElement(iframeDoc.body);
                });
            }
        } catch (e) {
            console.warn("無法訪問 iframe：", e.message);
        }
    }

    function observeDocument(doc) {
        const observer = new MutationObserver(mutations => {
            let hasMeaningfulChange = false;

            for (const m of mutations) {
                if (m.type === "childList" && m.addedNodes.length > 0) {
                    m.addedNodes.forEach(n => {
                        if (n.nodeType === Node.ELEMENT_NODE) processElement(n);
                        else if (n.nodeType === Node.TEXT_NODE) annotateTextNode(n);
                    });
                    hasMeaningfulChange = true;
                }
                else if (m.type === "characterData") {
                    annotateTextNode(m.target);
                    hasMeaningfulChange = true;
                }
            }

            if (hasMeaningfulChange) {
                triggerSeamlessHeightAdjustment();
            }
        });

        observer.observe(doc.body, {
            childList: true,
            subtree: true,
            characterData: true
        });

        return observer;
    }

    function startAnnotationEngine() {
        const mainObserver = observeDocument(document);
        document.querySelectorAll("iframe").forEach(observeIframe);

        const iframeObserver = new MutationObserver(() => {
            document.querySelectorAll("iframe").forEach(observeIframe);
        });

        iframeObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function waitForInitialTbodyAndAdjust() {
        const initialObserver = new MutationObserver((mutations, observer) => {
            const tbody = document.querySelector(SELECTORS.movementTbody);
            if (tbody) {
                console.log("%c[UI] 初始 Movement 列表已出現，立即進行無縫高度調整。", "color: orange; font-weight: bold;");
                triggerSeamlessHeightAdjustment();
                observer.disconnect();
            }
        });

        initialObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function initializeScript() {
        console.log("開始初始化註釋腳本");

        SCRIPT_STATE.isFullViewModeActive = GM_getValue('fullViewMode', false);

        injectBaseStyles();
        injectDynamicStyles();
        applyAnnotationColor();
        syncBodyClasses();
        applyOrRemoveFullViewStyles();

        GM_registerMenuCommand('設定', createSettingsPanel);

        waitForUIAndInjectButtons();
        startAnnotationEngine();
        startInstantHeightAdjuster();

        console.log("進行初始頁面掃描並等待 Movement 列表出現...");
        processElement(document.body);
        waitForInitialTbodyAndAdjust();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeScript);
    } else {
        setTimeout(initializeScript, 100);
    }
})();
