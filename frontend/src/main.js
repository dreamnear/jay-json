import { JSONService } from "../bindings/changeme";
import { WindowManager } from "../bindings/changeme";

// Elements
const editor = document.getElementById('json-editor');
const outputDisplay = document.getElementById('output-display');
const validationStatus = document.getElementById('validation-status');
const charCount = document.getElementById('char-count');
const statusItem = document.querySelector('.status-item:first-child');

let lastFormattedJSON = '';
let lastMinifiedJSON = '';

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

function updateStats() {
    charCount.textContent = `${editor.value.length} chars`;
}

function isEmptyInput() {
    return !editor.value.trim();
}

// Process JSON input: format and minify, caching results
async function processJSON(input) {
    const [formatted, minified] = await Promise.all([
        JSONService.FormatJSON(input, true),
        JSONService.MinifyJSON(input)
    ]);
    lastFormattedJSON = formatted;
    lastMinifiedJSON = minified;
    return { formatted, minified };
}

function setValidationStatus(isValid) {
    if (isValid === null) {
        validationStatus.textContent = '';
        validationStatus.className = 'status-badge';
    } else if (isValid) {
        validationStatus.textContent = 'Valid';
        validationStatus.className = 'status-badge valid';
    } else {
        validationStatus.textContent = 'Invalid';
        validationStatus.className = 'status-badge invalid';
    }
}

// Auto-validate and format on input with debouncing
let validateTimeout;
function autoValidate() {
    clearTimeout(validateTimeout);

    const input = editor.value.trim();
    if (!input) {
        setValidationStatus(null);
        outputDisplay.innerHTML = '<div class="preview-placeholder">Auto-formatting preview...</div>';
        return;
    }

    validateTimeout = setTimeout(async () => {
        try {
            const [isValid] = await JSONService.ValidateJSON(input);
            setValidationStatus(isValid);

            if (isValid) {
                const { formatted } = await processJSON(input);
                showOutput(formatted);
            }
        } catch {
            setValidationStatus(false);
        }
    }, 400);
}

function showFeedback(message) {
    const originalText = statusItem.textContent;
    statusItem.textContent = message;
    statusItem.classList.add('highlight');

    setTimeout(() => {
        statusItem.textContent = originalText;
        statusItem.classList.remove('highlight');
    }, 2000);
}

function pressButton(onclickAttr) {
    const btn = document.querySelector(`button[onclick="${onclickAttr}()"]`);
    if (btn) {
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => btn.style.transform = '', 150);
    }
}

// -----------------------------------------------------------------------------
// Output Display
// -----------------------------------------------------------------------------

function showOutput(content) {
    outputDisplay.style.opacity = '0';
    outputDisplay.style.transform = 'translateY(4px)';

    setTimeout(() => {
        outputDisplay.innerHTML = syntaxHighlight(content);
        outputDisplay.style.transition = 'all 0.3s ease';
        outputDisplay.style.opacity = '1';
        outputDisplay.style.transform = 'translateY(0)';
    }, 150);
}

function syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return json.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
            let cls = 'number';
            if (/^"/.test(match)) {
                cls = /:$/.test(match) ? 'key' : 'string';
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null/.test(match)) {
                cls = 'null';
            }
            return `<span class="${cls}">${match}</span>`;
        }
    );
}

function showError(message) {
    outputDisplay.innerHTML = `<div class="preview-placeholder" style="color: var(--accent-error);">${message}</div>`;
}

// -----------------------------------------------------------------------------
// JSON Operations
// -----------------------------------------------------------------------------

async function formatJSON() {
    if (isEmptyInput()) {
        outputDisplay.innerHTML = '<div class="preview-placeholder">Please enter JSON to format</div>';
        return;
    }

    pressButton('formatJSON');

    try {
        const { formatted } = await processJSON(editor.value.trim());
        showOutput(formatted);
    } catch (err) {
        showError(`Error: ${err.message}`);
        setValidationStatus(false);
    }
}

async function minifyJSON() {
    if (isEmptyInput()) {
        outputDisplay.innerHTML = '<div class="preview-placeholder">Please enter JSON to minify</div>';
        return;
    }

    pressButton('minifyJSON');

    try {
        const { minified } = await processJSON(editor.value.trim());
        showOutput(minified);
    } catch (err) {
        showError(`Error: ${err.message}`);
    }
}

async function copyToClipboard(content, successMsg) {
    try {
        await navigator.clipboard.writeText(content);
        showFeedback(successMsg);
    } catch {
        showFeedback('Failed to copy');
    }
}

async function copyAsFormatted() {
    if (lastFormattedJSON) {
        await copyToClipboard(lastFormattedJSON, 'Copied formatted JSON!');
        return;
    }

    if (isEmptyInput()) {
        showFeedback('No JSON to copy');
        return;
    }

    try {
        const { formatted } = await processJSON(editor.value.trim());
        await copyToClipboard(formatted, 'Copied formatted JSON!');
    } catch {
        showFeedback('Invalid JSON');
    }
}

async function copyAsMinified() {
    if (lastMinifiedJSON) {
        await copyToClipboard(lastMinifiedJSON, 'Copied minified JSON!');
        return;
    }

    if (isEmptyInput()) {
        showFeedback('No JSON to copy');
        return;
    }

    try {
        const { minified } = await processJSON(editor.value.trim());
        await copyToClipboard(minified, 'Copied minified JSON!');
    } catch {
        showFeedback('Invalid JSON');
    }
}

async function copyOutput() {
    const content = outputDisplay.textContent;

    if (!content || outputDisplay.querySelector('.preview-placeholder')) {
        showFeedback('No output to copy');
        return;
    }

    await copyToClipboard(content, 'Copied to clipboard!');
}

function clearEditor() {
    pressButton('clearEditor');

    editor.style.opacity = '0';
    outputDisplay.style.opacity = '0';

    setTimeout(() => {
        editor.value = '';
        lastFormattedJSON = '';
        lastMinifiedJSON = '';
        outputDisplay.innerHTML = '<div class="preview-placeholder">Auto-formatting preview...</div>';
        setValidationStatus(null);
        updateStats();

        editor.style.transition = 'opacity 0.2s ease';
        outputDisplay.style.transition = 'opacity 0.2s ease';
        editor.style.opacity = '1';
        outputDisplay.style.opacity = '1';
    }, 200);
}

// -----------------------------------------------------------------------------
// Event Listeners
// -----------------------------------------------------------------------------

editor.addEventListener('input', () => {
    updateStats();
    autoValidate();
});

document.addEventListener('keydown', (e) => {
    const cmdOrCtrl = e.metaKey || e.ctrlKey;

    if (!cmdOrCtrl) return;

    switch (e.key) {
        case 'Enter':
            e.preventDefault();
            formatJSON();
            break;
        case 'm':
        case 'M':
            if (e.shiftKey) {
                e.preventDefault();
                minifyJSON();
            }
            break;
        case 'c':
        case 'C':
            // Only intercept if in editor with no text selection
            if (document.activeElement === editor && editor.selectionStart === editor.selectionEnd) {
                e.preventDefault();
                copyOutput();
            }
            break;
        case 'k':
        case 'K':
            if (e.shiftKey) {
                e.preventDefault();
                clearEditor();
            }
            break;
    }
});

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

window.formatJSON = formatJSON;
window.minifyJSON = minifyJSON;
window.copyAsFormatted = copyAsFormatted;
window.copyAsMinified = copyAsMinified;
window.copyOutput = copyOutput;
window.clearEditor = clearEditor;

// -----------------------------------------------------------------------------
// Window Management
// -----------------------------------------------------------------------------

window.openNewWindow = async () => {
    try {
        await WindowManager.OpenNewWindow();
        showFeedback('✓ New window opened');
    } catch {
        showFeedback('✗ Failed to open window');
    }
};

window.toggleAlwaysOnTop = async () => {
    try {
        const isPinned = await WindowManager.ToggleAlwaysOnTop();
        const pinBtn = document.getElementById('pin-btn');

        if (isPinned) {
            pinBtn.classList.add('active');
            showFeedback('📌 Window pinned');
        } else {
            pinBtn.classList.remove('active');
            showFeedback('📌 Window unpinned');
        }
    } catch {
        showFeedback('✗ Failed to toggle pin');
    }
};

// -----------------------------------------------------------------------------
// Initialize
// -----------------------------------------------------------------------------

updateStats();
editor.style.transition = 'opacity 0.2s ease';
