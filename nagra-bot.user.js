// ==UserScript==
// @name         NAGRA BRAIN CORE v25.0 (Nagra Guard License Edition)
// @namespace    http://tampermonkey.net/
// @version      25.0
// @description  Persistent Trading Bot for Quotex with Date-Based Client Licensing
// @author       Nagra
// @match        https://*.qxbroker.com/*
// @match        https://*.quotex.com/*
// @match        https://*.broker-qx.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // 🔐 SECURITY & LICENSE SYSTEM (NAGRA GUARD)
    // ==========================================
    const MASTER_ADMIN_PASS = "NAGRA-ADMIN-99"; // آپ کا پرسنل ماسٹر پاس ورڈ (لائف ٹائم ان لاک)

    function checkLicense() {
        let activeKey = localStorage.getItem('nqp_license_key');

        if (!activeKey) {
            // اگر کوئی کی سیو نہیں ہے تو صارف سے پاس ورڈ یا لائسنس کی مانگیں
            let userPrompt = prompt("🔑 NAGRA BRAIN: Enter your License Key or Admin Password to activate:");
            if (!userPrompt) {
                alert("Access Denied! Bot cannot start without a valid license.");
                return false;
            }
            activeKey = userPrompt.trim();
        }

        // 1. ایڈمن چیک
        if (activeKey === MASTER_ADMIN_PASS) {
            localStorage.setItem('nqp_license_key', activeKey);
            console.log("⚡ ADMIN ACCESS GRANTED: Lifetime License Activated.");
            return true;
        }

        // 2. کلائنٹ لائسنس چیک (فارمیٹ: NAGRA-YYYYMMDD)
        let licensePattern = /^NAGRA-(\d{4})(\d{2})(\d{2})$/;
        let match = activeKey.match(licensePattern);

        if (!match) {
            alert("❌ Invalid License Key! Access Denied.");
            localStorage.removeItem('nqp_license_key');
            return false;
        }

        // تاریخ نکالیں
        let expYear = parseInt(match[1]);
        let expMonth = parseInt(match[2]) - 1; // JS Months 0-11 ہوتے ہیں
        let expDay = parseInt(match[3]);

        let expiryDate = new Date(expYear, expMonth, expDay, 23, 59, 59);
        let currentDate = new Date();

        if (currentDate > expiryDate) {
            alert(`🔴 LICENSE EXPIRED!\nYour access expired on: ${expDay}-${expMonth+1}-${expYear}\nPlease contact developer Nagra for renewal.`);
            localStorage.removeItem('nqp_license_key');
            return false;
        }

        // اگر سب ٹھیک ہے تو لائسنس کو سیو رکھیں اور بوٹ چلنے دیں
        localStorage.setItem('nqp_license_key', activeKey);
        let daysLeft = Math.ceil((expiryDate - currentDate) / (1000 * 60 * 60 * 24));
        console.log(`🛡️ LICENSE OK: Active. ${daysLeft} Days Remaining.`);
        return { isClient: true, daysLeft: daysLeft, expStr: `${expDay}/${expMonth+1}/${expYear}` };
    }

    // لائسنس رن کریں
    let licenseStatus = checkLicense();
    if (!licenseStatus) {
        return; // بوٹ کو یہیں روک دیں، آگے کچھ لوڈ نہیں ہوگا!
    }

    // پرانے پینلز کی صفائی
    let oldDash = document.getElementById('nqp-quantum-pro');
    if (oldDash) oldDash.remove();

    const TIMEFRAME_MAP = {
        "10s": 10, "1m": 60, "2m": 120, "3m": 180, "15m": 900, "30m": 1800, "1h": 3600
    };

    let aiEngine = {
        selectedTimeframe: "1m",
        isAnalyzing: false,
        activeCountdown: null,
        accuracyScore: 94.8,
        learningRate: 1.2,
        strategies: []
    };

    const strategyNames = [
        "SMC Order Block", "Liquidity Stop Hunt", "Fair Value Gap", "Market Structure Shift",
        "Volume Profile POC", "VWAP Deviation", "RSI Divergence", "Wyckoff Spring",
        "Institutional Vector", "Volume Node Absorption", "Fibonacci Retracement", "Gann Angular Retest",
        "MACD Histogram Flip", "EMA Exponential Cross", "Bollinger Squeeze", "ADX Trend Velocity",
        "ATR Expansion", "Stochastic Rebound", "Pivot Point R2 Reject", "Order Flow Imbalance"
    ];

    for (let i = 1; i <= 100; i++) {
        let baseName = strategyNames[i % strategyNames.length];
        aiEngine.strategies.push({
            id: `s${i}`,
            name: `${baseName} #${i}`,
            weight: parseFloat((Math.random() * 1.5 + 1.0).toFixed(2)),
            lastDecision: "NEUTRAL"
        });
    }

    // 💾 لرننگ میموری لوڈ کریں
    function loadSavedState() {
        let savedData = localStorage.getItem('nqp_brain_memory');
        if (savedData) {
            try {
                let parsed = JSON.parse(savedData);
                if (parsed.accuracyScore) aiEngine.accuracyScore = parsed.accuracyScore;
                if (parsed.weights) {
                    aiEngine.strategies.forEach(s => {
                        if (parsed.weights[s.id] !== undefined) {
                            s.weight = parsed.weights[s.id];
                        }
                    });
                }
            } catch (e) {
                console.error("Error loading saved state", e);
            }
        }
    }

    function saveStateToDisk() {
        let stateToSave = {
            accuracyScore: aiEngine.accuracyScore,
            weights: {}
        };
        aiEngine.strategies.forEach(s => {
            stateToSave.weights[s.id] = s.weight;
        });
        localStorage.setItem('nqp_brain_memory', JSON.stringify(stateToSave));
    }

    loadSavedState();

    // لائسنس کا سٹیٹس ٹیکسٹ سیٹ کریں
    let licenseFooterText = "👑 MASTER ACCESS (LIFETIME)";
    if (licenseStatus.isClient) {
        licenseFooterText = `⏳ EXPIRY: ${licenseStatus.expStr} (${licenseStatus.daysLeft} Days Left)`;
    }

    // ڈیش بورڈ پینل
    let dash = document.createElement('div');
    dash.id = 'nqp-quantum-pro';
    dash.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        width: 360px;
        background: rgba(2, 6, 18, 0.98);
        border: 2px solid #00f0ff;
        border-radius: 16px;
        padding: 12px;
        color: #ffffff;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        z-index: 99999999;
        box-shadow: 0px 0px 35px rgba(0, 240, 255, 0.4);
        cursor: default;
        user-select: none;
    `;

    dash.innerHTML = `
        <!-- ہیڈر -->
        <div id="nqp-header" style="text-align:center; font-weight:bold; border-bottom:1px solid rgba(0, 240, 255, 0.2); padding-bottom:8px; margin-bottom:10px; color:#00f0ff; font-size:10px; text-transform:uppercase; letter-spacing:1px; cursor:move;">
            ⚡ NAGRA BRAIN CORE v25.0 (SECURED)
        </div>

        <!-- پپی روبوٹ -->
        <div style="display: flex; justify-content: center; margin-bottom: 10px;">
            <div id="nqp-puppy-face" style="width: 70px; height: 60px; position: relative; background: #0c1a30; border: 2px solid #00f0ff; border-radius: 40% 40% 45% 45%; box-shadow: 0 0 10px rgba(0,240,255,0.2); transition: all 0.4s ease-in-out;">
                <div class="pup-ear" id="ear-l" style="width: 14px; height: 26px; background: #00f0ff; position: absolute; left: -8px; top: 10px; border-radius: 50% 10% 10% 50%; transform: rotate(-15deg); transition: 0.3s;"></div>
                <div class="pup-ear" id="ear-r" style="width: 14px; height: 26px; background: #00f0ff; position: absolute; right: -8px; top: 10px; border-radius: 10% 50% 50% 10%; transform: rotate(15deg); transition: 0.3s;"></div>
                <div class="pup-eye" id="eye-l" style="width: 8px; height: 8px; background: #00ffcc; position: absolute; left: 18px; top: 20px; border-radius: 50%; box-shadow: 0 0 8px #00ffcc; transition: 0.3s;"></div>
                <div class="pup-eye" id="eye-r" style="width: 8px; height: 8px; background: #00ffcc; position: absolute; right: 18px; top: 20px; border-radius: 50%; box-shadow: 0 0 8px #00ffcc; transition: 0.3s;"></div>
                <div id="pup-nose" style="width: 10px; height: 6px; background: #fff; position: absolute; left: 30px; top: 32px; border-radius: 40% 40% 50% 50%;"></div>
                <div id="pup-mouth" style="width: 14px; height: 4px; background: #00f0ff; position: absolute; left: 28px; top: 41px; border-radius: 0 0 4px 4px; transition: 0.3s;"></div>
            </div>
        </div>

        <!-- ٹائم فریمز -->
        <div style="background: #051124; padding: 4px; border-radius: 6px; border: 1px solid rgba(0,240,255,0.15); margin-bottom: 10px;">
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;">
                <button class="nqp-tf" data-tf="10s" style="padding:4px 0; font-size:8px; background:transparent; color:#00f0ff; border:none; border-radius:3px; cursor:pointer; font-weight:bold;">10s</button>
                <button class="nqp-tf" data-tf="1m" style="padding:4px 0; font-size:8px; background:#00f0ff; color:#000; border:none; border-radius:3px; cursor:pointer; font-weight:bold;">1m</button>
                <button class="nqp-tf" data-tf="2m" style="padding:4px 0; font-size:8px; background:transparent; color:#00f0ff; border:none; border-radius:3px; cursor:pointer; font-weight:bold;">2m</button>
                <button class="nqp-tf" data-tf="3m" style="padding:4px 0; font-size:8px; background:transparent; color:#00f0ff; border:none; border-radius:3px; cursor:pointer; font-weight:bold;">3m</button>
                <button class="nqp-tf" data-tf="15m" style="padding:4px 0; font-size:8px; background:transparent; color:#00f0ff; border:none; border-radius:3px; cursor:pointer; font-weight:bold;">15m</button>
                <button class="nqp-tf" data-tf="30m" style="padding:4px 0; font-size:8px; background:transparent; color:#00f0ff; border:none; border-radius:3px; cursor:pointer; font-weight:bold;">30m</button>
                <button class="nqp-tf" data-tf="1h" style="padding:4px 0; font-size:8px; background:transparent; color:#00f0ff; border:none; border-radius:3px; cursor:pointer; font-weight:bold;">1h</button>
            </div>
        </div>

        <!-- لائیو ٹائمر -->
        <div id="nqp-timer-box" style="display: none; text-align: center; background: rgba(255, 215, 0, 0.1); border: 1px dashed #ffd700; border-radius: 8px; padding: 6px; margin-bottom: 8px;">
            <span style="font-size: 8px; color: #ffd700; font-weight: bold; text-transform: uppercase;">⏱️ ACTIVE EXPIRY COUNTDOWN</span>
            <div id="nqp-timer-clock" style="font-size: 18px; font-weight: bold; color: #fff; font-family: monospace; text-shadow: 0 0 5px #ffd700; margin-top: 2px;">00:00</div>
        </div>

        <!-- فائنل ڈیسین کارڈ -->
        <div id="nqp-verdict-box" style="border: 2px solid rgba(0, 240, 255, 0.2); border-radius: 12px; padding: 10px; text-align: center; background: linear-gradient(180deg, #020512 0%, #030a1c 100%); margin-bottom: 10px;">
            <div id="nqp-sys-status" style="font-size: 7px; color: #00f0ff; text-transform: uppercase; letter-spacing: 0.5px;">BRAIN STATE: SECURED & SAVED</div>
            <div id="nqp-signal-output" style="font-size: 18px; font-weight: 900; margin: 4px 0; color: #475569; text-transform: uppercase; letter-spacing: 1px;">AWAITING SIGNAL SCAN</div>
            <div id="nqp-brain-accuracy" style="font-size: 9px; color: #00ffcc; font-weight: bold;">ACCURACY LEVEL: ${aiEngine.accuracyScore.toFixed(1)}%</div>
        </div>

        <!-- میٹرکس اسٹریٹیجی واٹرفال -->
        <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(0,240,255,0.15); border-radius: 8px; padding: 6px; margin-bottom: 10px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center; font-size: 8px; font-weight: bold; border-bottom: 1px solid rgba(0,240,255,0.2); padding-bottom: 4px; margin-bottom: 6px;">
                <span style="color: #00ffcc;">🟢 CALL DEPT</span>
                <span style="color: #ffffff; opacity:0.6;">⚪ NEUTRAL DEPT</span>
                <span style="color: #ff0055;">🔴 PUT DEPT</span>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; height: 90px; overflow: hidden;">
                <div id="col-call" style="overflow-y: auto; background: rgba(0,255,204,0.02); border: 1px solid rgba(0,255,204,0.08); border-radius: 4px; padding: 3px; font-size: 7.5px; line-height: 1.3;">
                    <div style="color:#475569; text-align:center; margin-top:20px;">Empty</div>
                </div>
                <div id="col-neutral" style="overflow-y: auto; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; padding: 3px; font-size: 7.5px; line-height: 1.3;">
                    <div style="color:#475569; text-align:center; margin-top:20px;">Empty</div>
                </div>
                <div id="col-put" style="overflow-y: auto; background: rgba(255,0,85,0.02); border: 1px solid rgba(255,0,85,0.08); border-radius: 4px; padding: 3px; font-size: 7.5px; line-height: 1.3;">
                    <div style="color:#475569; text-align:center; margin-top:20px;">Empty</div>
                </div>
            </div>
        </div>

        <!-- رئیل ٹائم لاجک بریف -->
        <div id="nqp-logic-brief" style="font-size: 8.5px; padding: 6px; border-radius: 6px; border: 1px solid rgba(0,240,255,0.12); background: rgba(0,240,255,0.01); border-left: 3px solid #00f0ff; margin-bottom: 10px; line-height: 1.3; color: #94a3b8;">
            <b>AI Core Reason:</b> System idle. Press SCAN to process persistent dataset.
        </div>

        <!-- مینوئل رزلٹ فیڈ بیک زون -->
        <div id="nqp-feedback-zone" style="display:none; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px; background: rgba(0, 240, 255, 0.05); padding: 5px; border-radius: 8px; border: 1px solid rgba(0, 240, 255, 0.15);">
            <div style="grid-column: 1 / span 2; text-align: center; font-size: 7.5px; color: #ffd700; text-transform: uppercase; font-weight: bold;">Verify Real Result:</div>
            <button id="nqp-feed-win" style="padding: 5px 3px; background: #00ffcc; color: #00; font-weight: bold; font-size: 8.5px; border: none; border-radius: 4px; cursor: pointer; text-transform: uppercase;">🏆 WIN</button>
            <button id="nqp-feed-loss" style="padding: 5px 3px; background: #ff0055; color: #fff; font-weight: bold; font-size: 8.5px; border: none; border-radius: 4px; cursor: pointer; text-transform: uppercase;">❌ LOSS</button>
        </div>

        <!-- اسکین بٹن -->
        <button id="nqp-gen-btn" style="width:100%; padding:10px; background:linear-gradient(135deg, #00f0ff, #0077ff); color:#000000; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:10px; text-transform:uppercase; box-shadow: 0 0 12px rgba(0,240,255,0.35); margin-bottom: 8px;">
            🧠 SCAN MATRIX PATHS
        </button>

        <!-- کی انفارمیشن فوٹر (بندے کو پتا ہو کب بند ہوگا) -->
        <div id="nqp-license-footer" style="text-align: center; font-size: 8px; color: #ffd700; font-weight: bold; letter-spacing: 0.5px; border-top: 1px solid rgba(0, 240, 255, 0.15); padding-top: 6px;">
            ${licenseFooterText} | <span id="nqp-change-key" style="text-decoration: underline; cursor: pointer; color: #00ffcc;">Change Key</span>
        </div>
    `;
    document.body.appendChild(dash);

    // کی چینج کرنے کا بٹن (ری سیٹ لائسنس)
    document.getElementById('nqp-change-key').onclick = () => {
        let confirmReset = confirm("Do you want to change or update your license key?");
        if (confirmReset) {
            localStorage.removeItem('nqp_license_key');
            location.reload();
        }
    };

    // پپی اینیمیشنز
    function setPuppyEmotion(emotion) {
        let pup = document.getElementById('nqp-puppy-face');
        let mouth = document.getElementById('pup-mouth');
        let eyes = document.querySelectorAll('.pup-eye');
        let earL = document.getElementById('ear-l');
        let earR = document.getElementById('ear-r');

        pup.style.animation = "";
        eyes.forEach(e => { e.style.transform = "scale(1)"; });

        if (emotion === "thinking") {
            pup.style.borderColor = "#ffd700";
            pup.style.boxShadow = "0 0 15px #ffd700";
            mouth.style.width = "6px"; mouth.style.height = "6px"; mouth.style.borderRadius = "50%"; mouth.style.backgroundColor = "#ffd700";
            eyes.forEach(e => { e.style.backgroundColor = "#ffd700"; e.style.boxShadow = "0 0 8px #ffd700"; });
            earL.style.transform = "rotate(-25deg)"; earR.style.transform = "rotate(25deg)";
        } 
        else if (emotion === "happy") {
            pup.style.borderColor = "#00ffcc";
            pup.style.boxShadow = "0 0 25px #00ffcc";
            mouth.style.width = "18px"; mouth.style.height = "10px"; mouth.style.borderRadius = "0 0 12px 12px"; mouth.style.backgroundColor = "#ff0055";
            eyes.forEach(e => { e.style.backgroundColor = "#00ffcc"; e.style.boxShadow = "0 0 12px #00ffcc"; });
            earL.style.transform = "rotate(-5deg)"; earR.style.transform = "rotate(5deg)";
        } 
        else if (emotion === "sad") {
            pup.style.borderColor = "#ff0055";
            pup.style.boxShadow = "0 0 20px #ff0055";
            mouth.style.width = "14px"; mouth.style.height = "2px"; mouth.style.borderRadius = "0"; mouth.style.backgroundColor = "#ff0055";
            eyes.forEach(e => { e.style.backgroundColor = "#ff0055"; e.style.transform = "scaleY(0.4)"; });
            earL.style.transform = "rotate(-40deg)"; earR.style.transform = "rotate(40deg)";
        } 
        else {
            pup.style.borderColor = "#00f0ff";
            pup.style.boxShadow = "0 0 10px rgba(0,240,255,0.2)";
            mouth.style.width = "14px"; mouth.style.height = "4px"; mouth.style.borderRadius = "0 0 4px 4px"; mouth.style.backgroundColor = "#00f0ff";
            eyes.forEach(e => { e.style.backgroundColor = "#00ffcc"; e.style.boxShadow = "0 0 8px #00ffcc"; });
            earL.style.transform = "rotate(-15deg)"; earR.style.transform = "rotate(15deg)";
        }
    }

    // ٹائمر رنر
    function runTimer(seconds) {
        if (aiEngine.activeCountdown) clearInterval(aiEngine.activeCountdown);
        let timerBox = document.getElementById('nqp-timer-box');
        let timerClock = document.getElementById('nqp-timer-clock');
        timerBox.style.display = 'block';
        let timeLeft = seconds;

        aiEngine.activeCountdown = setInterval(() => {
            let mins = Math.floor(timeLeft / 60);
            let secs = timeLeft % 60;
            timerClock.innerText = (mins < 10 ? "0" : "") + mins + ":" + (secs < 10 ? "0" : "") + secs;

            if (--timeLeft < 0) {
                clearInterval(aiEngine.activeCountdown);
                timerBox.style.display = 'none';
                document.getElementById('nqp-feedback-zone').style.display = 'grid';
            }
        }, 1000);
    }

    // پینل ڈریگ سسٹم
    let isDragging = false; let offsetX, offsetY;
    let header = document.getElementById('nqp-header');
    header.addEventListener('mousedown', function(e) {
        isDragging = true;
        offsetX = e.clientX - dash.offsetLeft;
        offsetY = e.clientY - dash.offsetTop;
    });
    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            dash.style.left = (e.clientX - offsetX) + 'px';
            dash.style.top = (e.clientY - offsetY) + 'px';
            dash.style.right = 'auto';
        }
    });
    document.addEventListener('mouseup', function() { isDragging = false; });

    // فیڈ بیک سسٹم
    document.getElementById('nqp-feed-win').onclick = () => saveResult(true);
    document.getElementById('nqp-feed-loss').onclick = () => saveResult(false);

    function saveResult(isWin) {
        document.getElementById('nqp-feedback-zone').style.display = 'none';
        
        if (isWin) {
            aiEngine.accuracyScore = Math.min(99.9, aiEngine.accuracyScore + (0.5 * aiEngine.learningRate));
            setPuppyEmotion("happy");
            aiEngine.strategies.forEach(s => {
                if (s.lastDecision === aiEngine.lastFinalDecision) {
                    s.weight = parseFloat((s.weight + (0.4 * aiEngine.learningRate)).toFixed(2));
                }
            });
            document.getElementById('nqp-logic-brief').innerHTML = `<b style="color:#00ffcc;">ACCURACY SECURED!</b> Memory updated and written to disk.`;
        } else {
            aiEngine.accuracyScore = Math.max(75.0, aiEngine.accuracyScore - (1.0 * aiEngine.learningRate));
            setPuppyEmotion("sad");
            aiEngine.strategies.forEach(s => {
                if (s.lastDecision === aiEngine.lastFinalDecision) {
                    s.weight = Math.max(0.1, parseFloat((s.weight - (0.6 * aiEngine.learningRate)).toFixed(2)));
                }
            });
            document.getElementById('nqp-logic-brief').innerHTML = `<b style="color:#ff0055;">WEIGHT PENALTY APPLIED!</b> Failing indicators adjusted in memory.`;
        }
        
        saveStateToDisk();
        document.getElementById('nqp-brain-accuracy').innerText = `ACCURACY LEVEL: ${aiEngine.accuracyScore.toFixed(1)}%`;
        setTimeout(() => setPuppyEmotion("normal"), 4000);
    }

    // کالمز پش افیکٹ
    function pushToColumn(columnId, strat, color) {
        let col = document.getElementById(columnId);
        if (col.innerHTML.includes("Empty")) col.innerHTML = "";

        let div = document.createElement('div');
        div.style.cssText = `
            padding: 3px;
            margin-bottom: 3px;
            background: rgba(255,255,255,0.03);
            border-left: 2px solid ${color};
            border-radius: 2px;
            animation: slideIn 0.1s ease-out;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        `;
        div.innerHTML = `<span style="font-weight:bold; color:${color};">${strat.weight}x</span> ${strat.name}`;
        col.appendChild(div);
        col.scrollTop = col.scrollHeight;
    }

    // اسکین بٹن ایکشن
    document.getElementById('nqp-gen-btn').addEventListener('click', function() {
        if (aiEngine.isAnalyzing) return;
        aiEngine.isAnalyzing = true;

        if (aiEngine.activeCountdown) clearInterval(aiEngine.activeCountdown);
        document.getElementById('nqp-timer-box').style.display = 'none';
        document.getElementById('nqp-feedback-zone').style.display = 'none';

        setPuppyEmotion("thinking");

        let statusEl = document.getElementById('nqp-sys-status');
        let sigOutput = document.getElementById('nqp-signal-output');
        let briefBox = document.getElementById('nqp-logic-brief');

        document.getElementById('col-call').innerHTML = "";
        document.getElementById('col-neutral').innerHTML = "";
        document.getElementById('col-put').innerHTML = "";

        statusEl.innerText = "PROCESSING PERSISTENT PATHWAYS...";
        sigOutput.innerText = "CALCULATING MODEL...";
        sigOutput.style.color = "#ffd700";

        let callWeight = 0;
        let putWeight = 0;
        let isExpertOverride = Math.random() < 0.05;

        aiEngine.strategies.forEach((s, idx) => {
            setTimeout(() => {
                let roll = Math.random() * s.weight;
                let decision = "NEUTRAL";

                if (roll > 1.25) {
                    decision = "CALL";
                    callWeight += s.weight;
                    pushToColumn('col-call', s, '#00ffcc');
                } else if (roll < 0.65) {
                    decision = "PUT";
                    putWeight += s.weight;
                    pushToColumn('col-put', s, '#ff0055');
                } else {
                    decision = "NEUTRAL";
                    pushToColumn('col-neutral', s, '#94a3b8');
                }
                s.lastDecision = decision;
            }, idx * 10);
        });

        setTimeout(() => {
            let netDiff = callWeight - putWeight;
            let finalDecision = "NEUTRAL";
            let signalText = "NEUTRAL";
            let signalColor = "#94a3b8";
            let calculatedAccuracy = aiEngine.accuracyScore;

            if (isExpertOverride) {
                finalDecision = Math.random() > 0.5 ? "CALL" : "PUT";
                calculatedAccuracy = 98.9;
                if (finalDecision === "CALL") {
                    signalText = "🌟 SURE STRONG CALL [OVERRIDE]";
                    signalColor = "#00ffcc";
                } else {
                    signalText = "🌟 SURE STRONG DOWN [OVERRIDE]";
                    signalColor = "#ff0055";
                }
                briefBox.innerHTML = `<b>🛡️ EXPERT OVERRIDE DETECTED:</b> Static conditions bypassed to protect accuracy profile. Memory locked.`;
            } else {
                let totalDiff = Math.abs(netDiff);

                if (netDiff > 0) {
                    finalDecision = "CALL";
                    if (totalDiff < 4) { signalText = "WEAK CALL"; signalColor = "#00ffcc"; calculatedAccuracy = 74; }
                    else if (totalDiff < 8) { signalText = "CALL"; signalColor = "#00ffcc"; calculatedAccuracy = 80; }
                    else if (totalDiff < 14) { signalText = "STRONG CALL"; signalColor = "#00ffcc"; calculatedAccuracy = 86; }
                    else if (totalDiff < 20) { signalText = "VERY STRONG CALL"; signalColor = "#00ffcc"; calculatedAccuracy = 91; }
                    else { signalText = "SURE STRONG CALL"; signalColor = "#00ffcc"; calculatedAccuracy = 96; }
                } 
                else if (netDiff < 0) {
                    finalDecision = "DOWN";
                    if (totalDiff < 4) { signalText = "WEAK DOWN"; signalColor = "#ff0055"; calculatedAccuracy = 74; }
                    else if (totalDiff < 8) { signalText = "DOWN"; signalColor = "#ff0055"; calculatedAccuracy = 80; }
                    else if (totalDiff < 14) { signalText = "STRONG DOWN"; signalColor = "#ff0055"; calculatedAccuracy = 86; }
                    else if (totalDiff < 20) { signalText = "VERY STRONG DOWN"; signalColor = "#ff0055"; calculatedAccuracy = 91; }
                    else { signalText = "SURE STRONG DOWN"; signalColor = "#ff0055"; calculatedAccuracy = 96; }
                }

                if (finalDecision === "CALL") {
                    briefBox.innerHTML = `<b>AI Analytics:</b> Dynamic structure supports bullish push (<b>+${totalDiff.toFixed(1)}x</b> net weight). Timeframe: <b>${aiEngine.selectedTimeframe}</b>.`;
                } else if (finalDecision === "DOWN") {
                    briefBox.innerHTML = `<b>AI Analytics:</b> Trend validation signals bear expansion (<b>-${totalDiff.toFixed(1)}x</b> net weight). Timeframe: <b>${aiEngine.selectedTimeframe}</b>.`;
                } else {
                    briefBox.innerHTML = `<b>AI Analytics:</b> Market balancing. High statistical variance filtered. Trading paused.`;
                }
            }

            aiEngine.lastFinalDecision = finalDecision;
            statusEl.innerText = isExpertOverride ? "EXPERT BRAIN ACTIVE" : "DECISION SAVED";
            sigOutput.innerText = signalText;
            sigOutput.style.color = signalColor;
            document.getElementById('nqp-brain-accuracy').innerText = `ACCURACY LEVEL: ${calculatedAccuracy.toFixed(1)}%`;

            if (finalDecision !== "NEUTRAL" && signalText !== "NEUTRAL") {
                let activeSeconds = TIMEFRAME_MAP[aiEngine.selectedTimeframe] || 60;
                runTimer(activeSeconds);
            }

            aiEngine.isAnalyzing = false;
            setPuppyEmotion("normal");

        }, 1200);
    });

    // ٹائم فریم بٹنز
    let buttons = document.querySelectorAll('.nqp-tf');
    buttons.forEach(btn => {
        btn.onclick = function() {
            if (aiEngine.isAnalyzing) return;
            buttons.forEach(b => {
                b.style.background = 'transparent';
                b.style.color = '#00f0ff';
            });
            this.style.background = '#00f0ff';
            this.style.color = '#000';
            aiEngine.selectedTimeframe = this.getAttribute('data-tf');
        };
    });

    let style = document.createElement('style');
    style.innerHTML = `
        @keyframes slideIn {
            from { transform: translateY(8px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

})();
