/**
 * Keyboard Module
 * Handles virtual keyboard rendering and highlighting
 */

const keyboardLayouts = {
    ru: {
        rows: [
            ['ё', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
            ['Tab', 'й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ъ', '\\'],
            ['Caps', 'ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'э', 'Enter'],
            ['Shift', 'я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю', '.', 'Shift'],
            ['Ctrl', 'Win', 'Alt', 'Space', 'Alt', 'Ctrl']
        ]
    },
    en: {
        rows: [
            ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
            ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
            ['Caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', '\'', 'Enter'],
            ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Shift'],
            ['Ctrl', 'Win', 'Alt', 'Space', 'Alt', 'Ctrl']
        ]
    },
    ua: {
        rows: [
            ['₴', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
            ['Tab', 'й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ї', '\\'],
            ['Caps', 'ф', 'і', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'є', 'Enter'],
            ['Shift', 'я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю', '.', 'Shift'],
            ['Ctrl', 'Win', 'Alt', 'Space', 'Alt', 'Ctrl']
        ]
    }
};

// Finger colors for each key
const fingerColors = {
    leftPinky: 'bg-red-500/20',
    leftRing: 'bg-orange-500/20',
    leftMiddle: 'bg-yellow-500/20',
    leftIndex: 'bg-green-500/20',
    thumb: 'bg-blue-500/20',
    rightIndex: 'bg-green-500/20',
    rightMiddle: 'bg-yellow-500/20',
    rightRing: 'bg-orange-500/20',
    rightPinky: 'bg-red-500/20'
};

const keyFingerMap = {
    // Russian layout
    'ё': 'leftPinky', '1': 'leftPinky', 'й': 'leftPinky', 'ф': 'leftPinky', 'я': 'leftPinky',
    '2': 'leftRing', 'ц': 'leftRing', 'ы': 'leftRing', 'ч': 'leftRing',
    '3': 'leftMiddle', 'у': 'leftMiddle', 'в': 'leftMiddle', 'с': 'leftMiddle',
    '4': 'leftIndex', '5': 'leftIndex', 'к': 'leftIndex', 'е': 'leftIndex', 'а': 'leftIndex', 'п': 'leftIndex', 'м': 'leftIndex', 'и': 'leftIndex',
    '6': 'rightIndex', '7': 'rightIndex', 'н': 'rightIndex', 'г': 'rightIndex', 'р': 'rightIndex', 'о': 'rightIndex', 'т': 'rightIndex', 'ь': 'rightIndex',
    '8': 'rightMiddle', 'ш': 'rightMiddle', 'л': 'rightMiddle', 'б': 'rightMiddle',
    '9': 'rightRing', 'щ': 'rightRing', 'д': 'rightRing', 'ю': 'rightRing',
    '0': 'rightPinky', '-': 'rightPinky', '=': 'rightPinky', 'з': 'rightPinky', 'х': 'rightPinky', 'ъ': 'rightPinky', 'ж': 'rightPinky', 'э': 'rightPinky', '.': 'rightPinky',
    ' ': 'thumb',
    
    // Ukrainian layout (similar to Russian but with і, ї, є)
    '₴': 'leftPinky', 'і': 'leftRing', 'ї': 'rightPinky', 'є': 'rightPinky',
    
    // English layout
    '`': 'leftPinky', 'q': 'leftPinky', 'a': 'leftPinky', 'z': 'leftPinky',
    'w': 'leftRing', 's': 'leftRing', 'x': 'leftRing',
    'e': 'leftMiddle', 'd': 'leftMiddle', 'c': 'leftMiddle',
    'r': 'leftIndex', 't': 'leftIndex', 'f': 'leftIndex', 'g': 'leftIndex', 'v': 'leftIndex', 'b': 'leftIndex',
    'y': 'rightIndex', 'u': 'rightIndex', 'h': 'rightIndex', 'j': 'rightIndex', 'n': 'rightIndex', 'm': 'rightIndex',
    'i': 'rightMiddle', 'k': 'rightMiddle', ',': 'rightMiddle',
    'o': 'rightRing', 'l': 'rightRing',
    'p': 'rightPinky', '[': 'rightPinky', ']': 'rightPinky', '\\': 'rightPinky', ';': 'rightPinky', '\'': 'rightPinky', '/': 'rightPinky'
};

// Per-container caches: WeakMap keyed by the keyboard container DOM node.
const _keyBtnCaches = new WeakMap();

// Per-container highlight state (previous static/active key + active timeout).
const _highlightState = new WeakMap();

function _getState(container) {
    if (!_highlightState.has(container)) {
        _highlightState.set(container, { prevStatic: null, prevActive: null, prevActiveTimeout: null });
    }
    return _highlightState.get(container);
}

function _buildKeyCache(container) {
    const map = new Map();
    container.querySelectorAll('[data-key]').forEach(btn => {
        map.set(btn.getAttribute('data-key'), btn);
    });
    _keyBtnCaches.set(container, map);
    return map;
}

function _getCache(container) {
    return _keyBtnCaches.get(container) || _buildKeyCache(container);
}

function renderKeyboard(layout = 'ru') {
    const container = document.getElementById('keyboardContainer');
    if (!container) return;
    
    const keyboard = keyboardLayouts[layout];
    if (!keyboard) return;
    
    let html = '<div class="space-y-2">';
    
    keyboard.rows.forEach(row => {
        html += '<div class="flex justify-center gap-1">';
        
        row.forEach(key => {
            const fingerColor = fingerColors[keyFingerMap[key.toLowerCase()]] || 'bg-gray-500/20';
            const keyWidth = getKeyWidth(key);
            const keyClass = `key-btn ${fingerColor} ${keyWidth} h-10 rounded-lg flex items-center justify-center font-mono font-semibold text-xs hover:bg-white/30 dark:hover:bg-black/30 transition-all`;
            
            html += `<button class="${keyClass}" data-key="${key.toLowerCase()}">${escapeHtml(key)}</button>`;
        });
        
        html += '</div>';
    });
    
    html += '</div>';
    container.innerHTML = html;

    // Rebuild cache and reset state for this container after re-render.
    _buildKeyCache(container);
    _highlightState.set(container, { prevStatic: null, prevActive: null, prevActiveTimeout: null });
}

function getKeyWidth(key) {
    switch(key) {
        case 'Backspace': return 'w-16';
        case 'Tab': return 'w-12';
        case 'Caps': return 'w-16';
        case 'Enter': return 'w-16';
        case 'Shift': return 'w-20';
        case 'Space': return 'w-80';
        case 'Ctrl': case 'Win': case 'Alt': return 'w-12';
        default: return 'w-10';
    }
}

function highlightKey(char, container) {
    if (!container) container = document.getElementById('keyboardContainer');
    if (!container) return;

    const key = (char === ' ' ? 'space' : char).toLowerCase();
    const cache = _getCache(container);
    const state = _getState(container);

    // Cancel previous active-timeout (avoids overlapping class removal).
    if (state.prevActiveTimeout) {
        clearTimeout(state.prevActiveTimeout);
        state.prevActiveTimeout = null;
    }

    // Remove active class from previous key (O(1)).
    if (state.prevActive && state.prevActive !== key) {
        const prev = cache.get(state.prevActive);
        if (prev) prev.classList.remove('key-active');
    }

    // Add active class to new key (O(1)).
    const btn = cache.get(key);
    if (btn) {
        btn.classList.add('key-active');
        state.prevActive = key;
        state.prevActiveTimeout = setTimeout(() => {
            btn.classList.remove('key-active');
            state.prevActive = null;
            state.prevActiveTimeout = null;
        }, 300);
    }
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function highlightKeyStatic(char, container) {
    if (!container) container = document.getElementById('keyboardContainer');
    if (!container) return;

    const key = (char === ' ' ? 'space' : char).toLowerCase();
    const cache = _getCache(container);
    const state = _getState(container);

    // Same key as before - nothing to do (O(1) early exit).
    if (state.prevStatic === key) return;

    // Remove static class from previous key (O(1)).
    if (state.prevStatic) {
        const prev = cache.get(state.prevStatic);
        if (prev) prev.classList.remove('key-static-highlight');
    }

    // Add static class to new key (O(1)).
    const btn = cache.get(key);
    if (btn) btn.classList.add('key-static-highlight');
    state.prevStatic = key;
}

// Export functions
window.keyboardModule = {
    render: renderKeyboard,
    highlight: highlightKey,
    highlightStatic: highlightKeyStatic,
    buildCache: _buildKeyCache
};
