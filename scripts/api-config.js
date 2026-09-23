/**
 * URL backend API.
 * Локально (localhost / file://) → http://localhost:3000
 * GitHub Pages / продакшен     → '' (localStorage-режим, пока нет задеплоенного API)
 *
 * Когда задеплоишь бэкенд на Railway/Render - замени '' на 'https://твой-апи.railway.app'
 */
(function () {
    var host = window.location.hostname;
    var isLocal = host === 'localhost' ||
                  host === '127.0.0.1' ||
                  host === '' ||
                  window.location.protocol === 'file:';
    window.API_BASE_URL = isLocal ? 'http://localhost:3000' : '';
})();
