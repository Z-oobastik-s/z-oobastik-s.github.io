/**
 * Keyboard Heatmap Module
 * Overlays error frequency on virtual keyboard via box-shadow inset (not background-color,
 * which would be overridden by Tailwind/existing key button styles).
 */

(function () {
    /**
     * Рендерит тепловую карту на контейнере клавиатуры.
     * @param {HTMLElement|string} container
     * @param {Object} errorMap - { 'а': 12, 'в': 3, ... }
     */
    function renderHeatmap(container, errorMap) {
        var el = typeof container === 'string' ? document.getElementById(container) : container;
        if (!el || !errorMap) return;

        var keys = el.querySelectorAll('[data-key]');
        if (!keys.length) return;

        var values = Object.values(errorMap).map(Number).filter(function (v) { return v > 0; });
        if (!values.length) {
            keys.forEach(function (btn) {
                btn.style.removeProperty('box-shadow');
                btn.style.removeProperty('outline');
                btn.removeAttribute('data-heat');
            });
            return;
        }
        var maxErr = Math.max.apply(null, values);

        keys.forEach(function (btn) {
            var key = btn.getAttribute('data-key');
            var count = errorMap[key] || (key ? errorMap[key.toLowerCase()] : 0) || 0;
            if (key === 'space') count = errorMap[' '] || 0;

            if (count > 0) {
                var intensity = Math.min(1, count / maxErr);
                // Красный inset box-shadow - не перебивает background, виден поверх любого фона
                var alpha = Math.round(intensity * 0.85 * 255).toString(16).padStart(2, '0');
                var spread = Math.round(intensity * 3);
                btn.style.boxShadow = 'inset 0 0 8px ' + spread + 'px rgba(239,68,68,' + (intensity * 0.75).toFixed(2) + ')';
                btn.style.outline = '1px solid rgba(239,68,68,' + (intensity * 0.5).toFixed(2) + ')';
                btn.setAttribute('data-heat', intensity.toFixed(2));
            } else {
                btn.style.removeProperty('box-shadow');
                btn.style.removeProperty('outline');
                btn.removeAttribute('data-heat');
            }
        });
    }

    /** Загружает карту ошибок из localStorage + текущего сеанса (_keyErrorsCache). */
    function getErrorMap() {
        var base = {};
        try {
            var stored = localStorage.getItem('zoob_key_errors');
            if (stored) base = JSON.parse(stored);
        } catch (_e) {}
        if (typeof _keyErrorsCache !== 'undefined') {
            for (var k in _keyErrorsCache) {
                base[k] = (base[k] || 0) + _keyErrorsCache[k];
            }
        }
        return base;
    }

    /** Сбрасывает тепловую карту. */
    function clearHeatmap(container) {
        var el = typeof container === 'string' ? document.getElementById(container) : container;
        if (!el) return;
        el.querySelectorAll('[data-key]').forEach(function (btn) {
            btn.style.removeProperty('box-shadow');
            btn.style.removeProperty('outline');
            btn.removeAttribute('data-heat');
        });
    }

    /**
     * Топ-N самых проблемных клавиш.
     */
    function getTopErrors(errorMap, n) {
        n = n || 5;
        return Object.keys(errorMap)
            .filter(function (k) { return errorMap[k] > 0; })
            .map(function (k) { return { key: k, count: errorMap[k] }; })
            .sort(function (a, b) { return b.count - a.count; })
            .slice(0, n);
    }

    window.heatmapModule = {
        renderHeatmap: renderHeatmap,
        clearHeatmap: clearHeatmap,
        getErrorMap: getErrorMap,
        getTopErrors: getTopErrors
    };
})();
