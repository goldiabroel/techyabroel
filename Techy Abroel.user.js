// ==UserScript==
// @updateURL      https://raw.githubusercontent.com/goldiabroel/techyabroel/main/Techy Abroel.user.js
// @downloadURL    https://raw.githubusercontent.com/goldiabroel/techyabroel/main/Techy Abroel.user.js

// @name         Techy Abroel Sniper Balanced Gold
// @namespace    local.sniper.arb
// @version      62.0
// @match        https://*.payduno.com/*
// @match        https://*.arbpay.*/*
// @match        arbpay.*/*
// @match        https://*.payjora.com/*
// @match        https://*.paykexo.com/*
// @match        https://*.payzuva.com/*
// @match        https://*.paykuno.com/*
// @match        https://*.payvuno.com/*
// @match        https://*.paywivo.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    let running = false;
    let huntTimer = null;
    let refreshing = false;
    let lastRefresh = 0;
    let currentMode = 'OTP-UPI';
    let customChannel = 'OTP-UPI';
    let isMinimized = false;
    let coolDownUntil = 0;

    function visible(el) {
        return el && el.offsetParent !== null && !el.disabled;
    }

    function text(el) {
        return (el?.innerText || el?.textContent || '').trim();
    }

    // Strictly check aur click karne ka function
    function tap(el) {
        if (!visible(el)) return false;
        try {
            el.focus?.();
            const rect = el.getBoundingClientRect();
            if (!rect || rect.width === 0 || rect.height === 0) return false;

            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            const opts = {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: cx,
                clientY: cy
            };

            ['pointerdown', 'mousedown', 'touchstart', 'pointerup', 'mouseup', 'touchend', 'click'].forEach(evtType => {
                let ev;
                try {
                    ev = new MouseEvent(evtType, opts);
                } catch (err) {
                    ev = new Event(evtType, { bubbles: true, cancelable: true });
                }
                el.dispatchEvent(ev);
            });

            if (typeof el.click === 'function') {
                el.click();
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    function allVisibleWithText(value) {
        const wanted = value.toLowerCase();
        return [
            ...document.querySelectorAll(
                'button,div,span,li,a,[role="button"],[role="option"],[role="menuitem"]'
            )
        ].filter(el => {
            if (!visible(el)) return false;
            return text(el).toLowerCase() === wanted;
        });
    }

    function getRangeButtons() {
        const candidates = document.querySelectorAll('button, div, span');
        const rangeList = [];
        candidates.forEach(el => {
            if (!visible(el)) return;
            const t = text(el);
            if (/^\d+\s*-\s*\d+$/.test(t)) {
                rangeList.push(el);
            }
        });
        return rangeList;
    }

    function makePanel() {
        if (document.getElementById('arb-master-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'arb-master-panel';
        panel.innerHTML = `
            <div id="drag-header" style="cursor: move; background: linear-gradient(135deg, #27272a 0%, #18181b 100%); padding: 10px 14px; border-radius: 16px 16px 0 0; display: flex; justify-content: space-between; align-items: center; color: #fff; font-family: sans-serif; user-select: none; border-bottom: 1px solid #3f3f46;">
                <span id="panel-title" style="font-size: 13px; font-weight: bold; letter-spacing: 1.2px; background: linear-gradient(to bottom, #ffffff, #a1a1aa); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">TECHY ABROEL</span>
                <button id="btn-minimize" style="background: #3f3f46; border: none; color: #fff; width: 22px; height: 22px; border-radius: 50%; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center;">−</button>
            </div>
            
            <div id="panel-body" style="padding: 14px; background: linear-gradient(180deg, #18181b 0%, #09090b 100%); font-size: 12px; color: #fff; display: flex; flex-direction: column; gap: 10px; border-radius: 0 0 16px 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.9);">
                <div style="color: #a1a1aa; font-size: 11px;">Mode</div>
                <div style="display: flex; background: #27272a; padding: 4px; border-radius: 8px; gap: 4px; border: 1px solid #3f3f46;">
                    <button class="mode-btn" data-mode="OTP-UPI" style="flex: 1; padding: 6px; background: #52525b; color: #fff; border: none; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">OTP-UPI</button>
                    <button class="mode-btn" data-mode="BANK" style="flex: 1; padding: 6px; background: transparent; color: #a1a1aa; border: none; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">BANK</button>
                    <button class="mode-btn" data-mode="CUSTOM" style="flex: 1; padding: 6px; background: transparent; color: #a1a1aa; border: none; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">CUSTOM</button>
                </div>

                <div id="box-single">
                    <div style="color: #a1a1aa; font-size: 11px; margin-bottom: 4px;">Amount</div>
                    <input type="number" id="inp-target" value="100" style="width: 100%; padding: 10px; background: #27272a; color: #fff; border: 1px solid #3f3f46; border-radius: 8px; text-align: center; font-weight: bold; font-size: 16px; box-sizing: border-box;">
                </div>

                <div id="box-range" style="display: none; flex-direction: column; gap: 8px;">
                    <div style="display: flex; gap: 6px;">
                        <div style="flex: 1;">
                            <div style="color: #a1a1aa; font-size: 10px; margin-bottom: 2px;">Min</div>
                            <input type="number" id="inp-min" value="100" style="width: 100%; padding: 8px; background: #27272a; color: #fff; border: 1px solid #3f3f46; border-radius: 6px; text-align: center; font-weight: bold; box-sizing: border-box;">
                        </div>
                        <div style="flex: 1;">
                            <div style="color: #a1a1aa; font-size: 10px; margin-bottom: 2px;">Max</div>
                            <input type="number" id="inp-max" value="500" style="width: 100%; padding: 8px; background: #27272a; color: #fff; border: 1px solid #3f3f46; border-radius: 6px; text-align: center; font-weight: bold; box-sizing: border-box;">
                        </div>
                    </div>
                    <div style="display: flex; background: #27272a; padding: 3px; border-radius: 6px; gap: 2px; border: 1px solid #3f3f46;">
                        <button class="chan-btn" data-chan="OTP-UPI" style="flex: 1; padding: 5px; background: #52525b; color: #fff; border: none; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer;">OTP-UPI</button>
                        <button class="chan-btn" data-chan="BANK" style="flex: 1; padding: 5px; background: transparent; color: #a1a1aa; border: none; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer;">BANK</button>
                    </div>
                </div>

                <div style="text-align: center; color: #a1a1aa; font-size: 11px; background: #27272a; padding: 8px; border-radius: 8px; border: 1px solid #3f3f46;" id="txt-status">
                    • Standby
                </div>

                <div style="display: flex; gap: 8px;">
                    <button id="btn-toggle" style="flex: 1; padding: 10px; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #fff; border: none; border-radius: 8px; font-weight: bold; font-size: 12px; cursor: pointer;">
                        ▶ START
                    </button>
                    <button id="btn-group" style="flex: 1; padding: 10px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #fff; border: none; border-radius: 8px; font-weight: bold; font-size: 12px; cursor: pointer;">
                        ✈ GROUP
                    </button>
                </div>
            </div>
        `;

        Object.assign(panel.style, {
            position: 'fixed', top: '70px', right: '15px', width: '230px',
            backgroundColor: '#121214', border: '1px solid #3f3f46', borderRadius: '16px',
            zIndex: '99999999', boxShadow: '0 15px 35px rgba(0,0,0,0.9)', fontFamily: 'sans-serif'
        });

        document.body.appendChild(panel);

        const dHeader = document.getElementById('drag-header');
        let shiftX = 0, shiftY = 0;
        dHeader.addEventListener('touchstart', (e) => {
            const t = e.touches[0];
            shiftX = t.clientX - panel.offsetLeft;
            shiftY = t.clientY - panel.offsetTop;
        }, { passive: true });

        dHeader.addEventListener('touchmove', (e) => {
            const t = e.touches[0];
            panel.style.left = (t.clientX - shiftX) + 'px';
            panel.style.top = (t.clientY - shiftY) + 'px';
            panel.style.right = 'auto';
        }, { passive: true });

        const minimizeBtn = document.getElementById('btn-minimize');
        const panelBody = document.getElementById('panel-body');
        const panelTitle = document.getElementById('panel-title');

        function toggleMinimize(e) {
            if (e) e.stopPropagation();
            isMinimized = !isMinimized;
            if (isMinimized) {
                panelBody.style.display = 'none';
                panelTitle.innerText = 'T';
                panel.style.width = '45px'; panel.style.height = '45px'; panel.style.borderRadius = '50px';
                dHeader.style.borderRadius = '50px'; dHeader.style.height = '45px';
                minimizeBtn.style.display = 'none';
            } else {
                panelBody.style.display = 'flex';
                panelTitle.innerText = 'TECHY ABROEL';
                panel.style.width = '230px'; panel.style.height = 'auto'; panel.style.borderRadius = '16px';
                dHeader.style.borderRadius = '16px 16px 0 0'; dHeader.style.height = 'auto';
                minimizeBtn.style.display = 'flex';
            }
        }

        minimizeBtn.addEventListener('click', toggleMinimize);
        dHeader.addEventListener('click', () => { if (isMinimized) toggleMinimize(); });

        const modeBtns = panel.querySelectorAll('.mode-btn');
        const boxSingle = document.getElementById('box-single');
        const boxRange = document.getElementById('box-range');

        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                modeBtns.forEach(b => { b.style.background = 'transparent'; b.style.color = '#a1a1aa'; });
                btn.style.background = '#52525b'; btn.style.color = '#fff';
                currentMode = btn.getAttribute('data-mode');
                if (currentMode === 'CUSTOM') {
                    boxSingle.style.display = 'none'; boxRange.style.display = 'flex';
                    safeTabSwitch(customChannel);
                } else {
                    boxSingle.style.display = 'block'; boxRange.style.display = 'none';
                    safeTabSwitch(currentMode);
                }
            });
        });

        const chanBtns = panel.querySelectorAll('.chan-btn');
        chanBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                chanBtns.forEach(b => { b.style.background = 'transparent'; b.style.color = '#a1a1aa'; });
                btn.style.background = '#52525b'; btn.style.color = '#fff';
                customChannel = btn.getAttribute('data-chan');
                safeTabSwitch(customChannel);
            });
        });

        document.getElementById('btn-group').addEventListener('click', () => {
            window.open('https://t.me/techyabroel', '_blank');
        });

        document.getElementById('btn-toggle').addEventListener('click', toggleSniper);
    }

    function safeTabSwitch(tabName) {
        const tabs = document.querySelectorAll('.van-tab, div[role="tab"]');
        for (let tab of tabs) {
            const t = (tab.textContent || '').trim();
            if (t.includes(tabName) && !tab.classList.contains('van-tab--active')) {
                tap(tab); break;
            }
        }
    }

    function updateStatus(msg, color = '#888') {
        const el = document.getElementById('txt-status');
        if (el) { el.innerText = msg; el.style.color = color; }
    }

    async function refreshDefault() {
        if (!running || refreshing) return;

        const now = Date.now();
        if (now < coolDownUntil) {
            updateStatus('⚠️ Smart Cooldown...', '#f59e0b');
            return;
        }

        const safeDelay = 300 + Math.random() * 150;
        if (now - lastRefresh < safeDelay) return;

        const errPopup = document.querySelector('.van-dialog, .van-toast');
        if (visible(errPopup) && (errPopup.innerText.includes('customer service') || errPopup.innerText.includes('contact'))) {
            const closeBtn = errPopup.querySelector('.van-dialog__confirm, button');
            if (closeBtn) tap(closeBtn);
            coolDownUntil = now + 4000;
            updateStatus('⚠️ Auto-Recovering...', '#ef4444');
            return;
        }

        const confirmBtn = document.querySelector('.van-dialog__confirm, button.van-dialog__confirm, .modal-confirm');
        if (visible(confirmBtn)) tap(confirmBtn);

        refreshing = true;
        lastRefresh = now;

        try {
            const allBtns = allVisibleWithText('All');
            const ranges = getRangeButtons();

            if (ranges.length > 0) {
                tap(ranges[0]);
                await new Promise(r => setTimeout(r, 10));
                if (!running) return;
            }

            if (allBtns.length > 0) {
                tap(allBtns[0]);
            }
        } finally {
            refreshing = false;
        }
    }

    function extractCardAmount(card) {
        const raw = text(card).replace(/,/g, '');
        const rupees = raw.match(/₹\s*(\d+(?:\.\d+)?)/g);
        if (rupees) {
            return rupees.map(x => parseFloat(x.replace(/[^\d.]/g, '')));
        }
        return [];
    }

    function checkPaymentGatewayAndAutoSelect() {
        const currentUrl = window.location.href;
        const pageText = document.body.innerText || '';

        if (currentUrl.includes('/order/cashier') || pageText.includes('Select Method Payment')) {
            updateStatus('✅ Secured!', '#00ff66');
            stopSniper();

            const paymentOptions = document.querySelectorAll('div, button, a');
            for (let opt of paymentOptions) {
                const optText = text(opt).toLowerCase();
                if (optText.includes('phonepe') || optText.includes('paytm')) {
                    if (visible(opt)) {
                        tap(opt);
                        break;
                    }
                }
            }
            return true;
        }
        return false;
    }

    function scanAndBuyTarget() {
        if (!running) return false;
        if (checkPaymentGatewayAndAutoSelect()) return true;

        const bodyText = document.body.innerText || '';
        if (bodyText.includes('customer service') || bodyText.includes('contact')) {
            coolDownUntil = Date.now() + 4000;
            updateStatus('⚠️ Cooldown Active...', '#f59e0b');
            return false;
        }

        refreshDefault();

        const cards = document.querySelectorAll('.van-swipe-item, .card, div[class*="item"], div[class*="product"]');
        let targetAmount = 100;
        let minAmt = 100, maxAmt = 500;

        if (currentMode === 'CUSTOM') {
            minAmt = parseFloat(document.getElementById('inp-min').value) || 100;
            maxAmt = parseFloat(document.getElementById('inp-max').value) || 500;
        } else {
            targetAmount = parseFloat(document.getElementById('inp-target').value) || 100;
        }

        for (let card of cards) {
            if (!visible(card)) continue;

            const amounts = extractCardAmount(card);
            if (amounts.length === 0) continue;

            let matched = false;
            if (currentMode === 'CUSTOM') {
                matched = amounts.some(a => a >= minAmt && a <= maxAmt);
            } else {
                matched = amounts.includes(targetAmount);
            }

            if (matched) {
                const buyBtn = Array.from(card.querySelectorAll('button, div, span, a')).find(el => {
                    const t = text(el).toLowerCase();
                    return (t === 'buy' || t === 'grab' || t === 'purchase') && visible(el);
                });

                if (buyBtn) {
                    // Ab bina click kiye fake grabbed nahi dikhega. Jab tak button par tap() successful nahi hota, tab tak status change nahi hoga.
                    const isClicked = tap(buyBtn);
                    if (isClicked) {
                        updateStatus(`🚀 Grabbed: ₹${amounts[0]}`, '#22c55e');
                        setTimeout(() => checkPaymentGatewayAndAutoSelect(), 50);
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function toggleSniper() {
        running = !running;
        const btn = document.getElementById('btn-toggle');
        if (running) {
            btn.innerHTML = '⏹ STOP';
            btn.style.background = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
            updateStatus('🔥 Hunting Active...', '#22c55e');

            if (currentMode !== 'CUSTOM') {
                safeTabSwitch(currentMode);
            } else {
                safeTabSwitch(customChannel);
            }

            huntTimer = setInterval(() => {
                scanAndBuyTarget();
            }, 10);
        } else {
            stopSniper();
        }
    }

    function stopSniper() {
        running = false;
        if (huntTimer) clearInterval(huntTimer);
        huntTimer = null;
        const btn = document.getElementById('btn-toggle');
        if (btn) {
            btn.innerHTML = '▶ START';
            btn.style.background = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
        }
        updateStatus('• Standby', '#a1a1aa');
    }

    window.addEventListener('load', () => {
        setTimeout(makePanel, 1000);
    });

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(makePanel, 1000);
    }
})();
