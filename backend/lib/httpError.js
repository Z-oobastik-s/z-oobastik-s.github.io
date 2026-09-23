/** Единый безопасный ответ при 500 - без утечки err.message клиенту. */
const SAFE_INTERNAL = 'Внутренняя ошибка сервера';

function send500(res, err, logLabel) {
    console.error(logLabel || 'Server error:', err);
    return res.status(500).json({ success: false, error: SAFE_INTERNAL });
}

module.exports = { SAFE_INTERNAL, send500 };
