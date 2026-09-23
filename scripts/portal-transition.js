/**
 * Плавный переход на другую страницу: быстрый fade, без тяжёлой анимации (без лагов).
 */
(function () {
    'use strict';
    var duration = 420;
    var overlay = null;

    function createOverlay() {
        if (overlay) return overlay;
        var style = document.createElement('style');
        style.textContent = [
            '#portal-overlay{position:fixed;inset:0;z-index:999999;pointer-events:none;overflow:hidden;}',
            '#portal-overlay .portal-fade{position:absolute;inset:0;background:#0f172a;opacity:0;',
            'transition:opacity 0.35s ease-out;}',
            '#portal-overlay.portal-active .portal-fade{opacity:1;}'
        ].join('');
        document.head.appendChild(style);
        overlay = document.createElement('div');
        overlay.id = 'portal-overlay';
        overlay.innerHTML = '<div class="portal-fade"></div>';
        document.body.appendChild(overlay);
        return overlay;
    }

    window.portalTo = function (url) {
        if (!url) return;
        var el = createOverlay();
        el.classList.add('portal-active');
        el.style.pointerEvents = 'auto';
        setTimeout(function () {
            window.location.href = url;
        }, duration);
    };
})();

