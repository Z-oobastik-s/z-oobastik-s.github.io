/**
 * WPM/CPM Chart Module
 * Records speed during practice and renders an interactive Canvas line chart.
 * Shows tooltip with exact speed + time on mouse hover.
 */

(function () {
    var RECORD_INTERVAL_MS = 2000;
    var _recordTimer = null;

    function startRecording() {
        stopRecording();
        if (typeof app === 'undefined') return;
        app.speedHistory = [];
        _recordTimer = setInterval(function () {
            if (!app || app.isPaused) return;
            var elapsed = Math.max(0.001, (Date.now() - app.startTime - (app.totalLessonPauseDuration || 0)) / 1000);
            var minutes = elapsed / 60;
            var cpm = minutes > 0 ? Math.round(app.currentPosition / minutes) : 0;
            if (cpm > 0) app.speedHistory.push({ t: Math.round(elapsed), cpm: cpm });
        }, RECORD_INTERVAL_MS);
    }

    function stopRecording() {
        if (_recordTimer) { clearInterval(_recordTimer); _recordTimer = null; }
    }

    /** Рисует chart + навешивает интерактивный tooltip. */
    function renderChart(canvas, history) {
        if (!canvas) return;

        var dpr = window.devicePixelRatio || 1;
        var W = canvas.offsetWidth || canvas.parentElement && canvas.parentElement.clientWidth || 400;
        var H = canvas.offsetHeight || 110;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        var ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        var padL = 42, padR = 14, padT = 14, padB = 26;
        var cw = W - padL - padR;
        var ch = H - padT - padB;

        // Пустое состояние
        if (!history || history.length < 2) {
            ctx.fillStyle = 'rgba(99,102,241,0.08)';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = 'rgba(148,163,184,0.45)';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(history && history.length === 1 ? 'Нужно >1 точки' : 'Слишком короткая сессия', W / 2, H / 2);
            return;
        }

        var maxCpm = Math.max.apply(null, history.map(function (p) { return p.cpm; }));
        var maxT   = history[history.length - 1].t || 1;
        maxCpm = Math.max(maxCpm, 60);

        // Фон
        var grad = ctx.createLinearGradient(0, padT, 0, padT + ch);
        grad.addColorStop(0, 'rgba(99,102,241,0.12)');
        grad.addColorStop(1, 'rgba(99,102,241,0.02)');
        ctx.fillStyle = grad;
        ctx.fillRect(padL, padT, cw, ch);

        // Сетка Y
        ctx.strokeStyle = 'rgba(148,163,184,0.15)';
        ctx.lineWidth = 1;
        for (var g = 0; g <= 4; g++) {
            var gy = padT + ch - (g / 4) * ch;
            ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(padL + cw, gy); ctx.stroke();
            ctx.fillStyle = 'rgba(148,163,184,0.65)';
            ctx.font = '10px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(Math.round((g / 4) * maxCpm), padL - 4, gy + 4);
        }

        // Метки X
        ctx.fillStyle = 'rgba(148,163,184,0.65)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        var xCount = Math.min(5, history.length);
        for (var xi = 0; xi <= xCount; xi++) {
            var t = Math.round((xi / xCount) * maxT);
            var xp = padL + (xi / xCount) * cw;
            var m = Math.floor(t / 60), s = t % 60;
            ctx.fillText('0:' + (s < 10 ? '0' : '') + s + (m > 0 ? ' (' + m + 'м)' : ''), xp, padT + ch + 16);
        }

        // Заливка под линией
        ctx.beginPath();
        history.forEach(function (p, i) {
            var x = padL + (p.t / maxT) * cw;
            var y = padT + ch - (p.cpm / maxCpm) * ch;
            if (i === 0) { ctx.moveTo(x, padT + ch); ctx.lineTo(x, y); }
            else ctx.lineTo(x, y);
        });
        var lp = history[history.length - 1];
        ctx.lineTo(padL + (lp.t / maxT) * cw, padT + ch);
        ctx.closePath();
        var fillGrad = ctx.createLinearGradient(0, padT, 0, padT + ch);
        fillGrad.addColorStop(0, 'rgba(99,102,241,0.25)');
        fillGrad.addColorStop(1, 'rgba(99,102,241,0.03)');
        ctx.fillStyle = fillGrad;
        ctx.fill();

        // Линия
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        var lineGrad = ctx.createLinearGradient(padL, 0, padL + cw, 0);
        lineGrad.addColorStop(0, '#6366f1');
        lineGrad.addColorStop(1, '#06b6d4');
        ctx.strokeStyle = lineGrad;
        history.forEach(function (p, i) {
            var x = padL + (p.t / maxT) * cw;
            var y = padT + ch - (p.cpm / maxCpm) * ch;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Точки
        history.forEach(function (p) {
            var x = padL + (p.t / maxT) * cw;
            var y = padT + ch - (p.cpm / maxCpm) * ch;
            ctx.beginPath();
            ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#6366f1';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        });

        // Метка последней точки
        var last = history[history.length - 1];
        var lx = padL + (last.t / maxT) * cw;
        var ly = padT + ch - (last.cpm / maxCpm) * ch;
        ctx.fillStyle = '#06b6d4';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(last.cpm + ' cpm', Math.min(lx + 6, padL + cw - 55), Math.max(ly - 6, padT + 14));

        // ── Интерактивный тултип ──────────────────────────────────────────────
        _attachTooltip(canvas, history, padL, padR, padT, padB, maxCpm, maxT, cw, ch, W, H);
    }

    // Хранилище listenrов - чтобы не дублировать при повторном рендере
    var _canvasListeners = new WeakMap();

    function _attachTooltip(canvas, history, padL, padR, padT, padB, maxCpm, maxT, cw, ch, W, H) {
        // Удаляем старый тултип и листенер если были
        var old = _canvasListeners.get(canvas);
        if (old) {
            canvas.removeEventListener('mousemove', old.move);
            canvas.removeEventListener('mouseleave', old.leave);
            if (old.tip && old.tip.parentNode) old.tip.parentNode.removeChild(old.tip);
        }

        // Создаём div-тултип
        var tip = document.createElement('div');
        tip.style.cssText = [
            'position:absolute;pointer-events:none;display:none;',
            'background:rgba(15,23,42,0.95);color:#e2e8f0;',
            'border:1px solid rgba(99,102,241,0.5);border-radius:8px;',
            'padding:6px 10px;font-size:12px;font-family:monospace;',
            'white-space:nowrap;z-index:9999;',
            'box-shadow:0 4px 16px rgba(0,0,0,0.5);'
        ].join('');
        var wrapper = canvas.parentElement;
        if (wrapper) {
            wrapper.style.position = 'relative';
            wrapper.appendChild(tip);
        }

        var dpr = window.devicePixelRatio || 1;

        function onMove(e) {
            var rect = canvas.getBoundingClientRect();
            var mx = e.clientX - rect.left;
            var my = e.clientY - rect.top;

            // Ближайшая точка
            var closest = null, minDist = Infinity;
            history.forEach(function (p) {
                var px = padL + (p.t / maxT) * cw;
                var py = padT + ch - (p.cpm / maxCpm) * ch;
                var d = Math.sqrt((mx - px) * (mx - px) + (my - py) * (my - py));
                if (d < minDist) { minDist = d; closest = p; }
            });

            if (closest && minDist < 30) {
                var mins = Math.floor(closest.t / 60);
                var secs = closest.t % 60;
                var timeStr = '0:' + (secs < 10 ? '0' : '') + secs + (mins > 0 ? ' (' + mins + 'м)' : '');
                tip.innerHTML = '<b style="color:#6366f1">' + closest.cpm + '</b> зн/мин · ' + timeStr;
                // Позиционируем тултип над точкой
                var px = padL + (closest.t / maxT) * cw;
                var py = padT + ch - (closest.cpm / maxCpm) * ch;
                var tipX = Math.min(px - 10, W - 140);
                var tipY = Math.max(py - 36, 4);
                tip.style.left = tipX + 'px';
                tip.style.top  = tipY + 'px';
                tip.style.display = 'block';
                canvas.style.cursor = 'crosshair';
            } else {
                tip.style.display = 'none';
                canvas.style.cursor = '';
            }
        }

        function onLeave() {
            tip.style.display = 'none';
            canvas.style.cursor = '';
        }

        canvas.addEventListener('mousemove', onMove);
        canvas.addEventListener('mouseleave', onLeave);
        _canvasListeners.set(canvas, { move: onMove, leave: onLeave, tip: tip });
    }

    window.wpmChartModule = {
        startRecording: startRecording,
        stopRecording: stopRecording,
        renderChart: renderChart
    };
})();

