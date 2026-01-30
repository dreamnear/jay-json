import { JSONService } from "../bindings/changeme";

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

            // Auto-format and show in preview when valid
            if (isValid) {
                const [formatted, minified] = await Promise.all([
                    JSONService.FormatJSON(input, true),
                    JSONService.MinifyJSON(input)
                ]);
                lastFormattedJSON = formatted;
                lastMinifiedJSON = minified;
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

function animateButton(onclickAttr) {
    const buttons = document.querySelectorAll(`button[onclick="${onclickAttr}()"]`);
    buttons.forEach(btn => {
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 600);
    });
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

function isEmptyInput() {
    return !editor.value.trim();
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
        const input = editor.value.trim();
        const [formatted, minified] = await Promise.all([
            JSONService.FormatJSON(input, true),
            JSONService.MinifyJSON(input)
        ]);

        lastFormattedJSON = formatted;
        lastMinifiedJSON = minified;
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
        const minified = await JSONService.MinifyJSON(editor.value.trim());
        lastMinifiedJSON = minified;
        showOutput(minified);
    } catch (err) {
        showError(`Error: ${err.message}`);
    }
}

async function copyToClipboard(content, successMsg, functionName) {
    try {
        await navigator.clipboard.writeText(content);
        showFeedback(successMsg);
        animateButton(functionName);
    } catch {
        showFeedback('Failed to copy');
    }
}

async function copyAsFormatted() {
    if (lastFormattedJSON) {
        await copyToClipboard(lastFormattedJSON, 'Copied formatted JSON!', 'copyAsFormatted');
        return;
    }

    if (isEmptyInput()) {
        showFeedback('No JSON to copy');
        return;
    }

    try {
        const formatted = await JSONService.FormatJSON(editor.value.trim(), true);
        lastFormattedJSON = formatted;
        await copyToClipboard(formatted, 'Copied formatted JSON!', 'copyAsFormatted');
    } catch {
        showFeedback('Invalid JSON');
    }
}

async function copyAsMinified() {
    if (lastMinifiedJSON) {
        await copyToClipboard(lastMinifiedJSON, 'Copied minified JSON!', 'copyAsMinified');
        return;
    }

    if (isEmptyInput()) {
        showFeedback('No JSON to copy');
        return;
    }

    try {
        const minified = await JSONService.MinifyJSON(editor.value.trim());
        lastMinifiedJSON = minified;
        await copyToClipboard(minified, 'Copied minified JSON!', 'copyAsMinified');
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

    const btn = document.querySelector('button[onclick="copyOutput()"]');
    const originalText = btn.textContent;

    try {
        await navigator.clipboard.writeText(content);
        btn.classList.add('copied');
        btn.textContent = '✓ Copied';
        showFeedback('Copied to clipboard!');

        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('copied');
        }, 1500);
    } catch {
        showFeedback('Failed to copy');
    }
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
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

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
            // Only prevent if we're in the editor and there's no selection
            if (document.activeElement === editor && !editor.value.substring(editor.selectionStart, editor.selectionEnd)) {
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
// Initialize
// -----------------------------------------------------------------------------

updateStats();
editor.style.transition = 'opacity 0.2s ease';
