import { JSONService } from "../bindings/changeme";
import { WindowManager } from "../bindings/changeme";

// =============================================================================
// Constants
// =============================================================================

const EMPTY_PLACEHOLDER = '<div class="preview-placeholder">Interactive tree view will appear here...</div>';
const INVALID_JSON_PLACEHOLDER = '<div class="preview-placeholder" style="color: var(--accent-error);">Invalid JSON - Please check your syntax</div>';
const CHECKPOINT_LIMIT = 50;
const DEBOUNCE_DELAY = 400;

// =============================================================================
// State
// =============================================================================

let lastFormattedJSON = '';
let lastMinifiedJSON = '';
let checkpoints = [];
let currentCheckpointIndex = -1;
let validateTimeout = null;

// =============================================================================
// DOM Elements
// =============================================================================

const editor = document.getElementById('json-editor');
const editorHighlighted = document.getElementById('json-editor-highlighted');
const editorLineNumbers = document.getElementById('editor-line-numbers');
const outputDisplay = document.getElementById('output-display');
const validationStatus = document.getElementById('validation-status');
const charCount = document.getElementById('char-count');
const statusItem = document.querySelector('.status-item:first-child');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');

// =============================================================================
// Utility Functions
// =============================================================================

function updateStats() {
    charCount.textContent = `${editor.value.length} chars`;
    updateLineNumbers();
}

function updateLineNumbers() {
    const lines = editor.value.split('\n').length;
    let lineNumbersHtml = '';
    for (let i = 1; i <= lines; i++) {
        lineNumbersHtml += `<div>${i}</div>`;
    }
    editorLineNumbers.innerHTML = lineNumbersHtml;
}

function syncScroll() {
    editorLineNumbers.scrollTop = editor.scrollTop;
    editorHighlighted.scrollTop = editor.scrollTop;
    editorHighlighted.scrollLeft = editor.scrollLeft;
}

function updateEditorHighlighting() {
    const content = editor.value;
    const highlighted = syntaxHighlight(content);
    const endsWithNewline = content.endsWith('\n');
    const displayContent = endsWithNewline ? highlighted + '\n' : highlighted;
    editorHighlighted.innerHTML = displayContent + '<br>';
}

function isEmptyInput() {
    return !editor.value.trim();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function isFormattedContent(content) {
    return content.includes('\n  ') || content.includes('\n    ');
}

function applyHighlightingIfNeeded(content) {
    if (isFormattedContent(content)) {
        editor.classList.add('highlighted');
        updateEditorHighlighting();
    } else {
        editor.classList.remove('highlighted');
        editorHighlighted.innerHTML = '';
    }
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
function autoValidate() {
    clearTimeout(validateTimeout);

    const input = editor.value.trim();
    if (!input) {
        setValidationStatus(null);
        outputDisplay.innerHTML = EMPTY_PLACEHOLDER;
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
            outputDisplay.innerHTML = INVALID_JSON_PLACEHOLDER;
        }
    }, DEBOUNCE_DELAY);
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

// =============================================================================
// Output Display
// =============================================================================

function showOutput(content) {
    outputDisplay.style.opacity = '0';
    outputDisplay.style.transform = 'translateY(4px)';

    setTimeout(() => {
        try {
            const parsed = JSON.parse(content);
            outputDisplay.innerHTML = renderTreeView(parsed, 'root');
        } catch (e) {
            outputDisplay.innerHTML = `<div class="preview-placeholder" style="color: var(--accent-error);">Invalid JSON: ${e.message}</div>`;
        }

        outputDisplay.style.transition = 'all 0.3s ease';
        outputDisplay.style.opacity = '1';
        outputDisplay.style.transform = 'translateY(0)';
    }, 150);
}

function renderTreeView(data, key, isRoot = false) {
    const type = getType(data);
    const hasChildren = type === 'object' || type === 'array';
    const nodeId = `node-${Math.random().toString(36).substr(2, 9)}`;

    let html = '';

    if (isRoot) {
        html += `<div class="tree-node tree-root">`;
    } else {
        html += `<div class="tree-node">`;
    }

    // Row with toggle, key, type
    html += `<div class="tree-row" onclick="toggleNode('${nodeId}')">`;

    if (hasChildren) {
        html += `<span class="tree-toggle" id="toggle-${nodeId}">▼</span>`;
    } else {
        html += `<span class="tree-toggle invisible">▼</span>`;
    }

    if (!isRoot) {
        html += `<span class="tree-key">${escapeHtml(key)}:</span>`;
    }

    if (hasChildren) {
        const length = Object.keys(data).length;
        const size = type === 'array' ? `[${length}]` : `{${length}}`;
        html += `<span class="tree-type ${type}">${type.charAt(0).toUpperCase() + type.slice(1)}</span>`;
        html += `<span class="tree-type">${size}</span>`;
    } else {
        // Leaf node - show value
        html += `<span class="tree-type ${type}">${type.charAt(0).toUpperCase() + type.slice(1)}</span>`;
        html += `<span class="tree-value ${type}">${formatValue(data)}</span>`;
    }

    html += `</div>`; // End tree-row

    // Children
    if (hasChildren) {
        html += `<div class="tree-children" id="children-${nodeId}">`;
        for (const [k, v] of Object.entries(data)) {
            html += renderTreeView(v, k);
        }
        html += `</div>`; // End tree-children
    }

    html += `</div>`; // End tree-node

    return html;
}

function getType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

function formatValue(value) {
    if (value === null) return 'null';
    if (typeof value === 'string') return `"${escapeHtml(value)}"`;
    return String(value);
}

// Toggle tree node expansion
window.toggleNode = function(nodeId) {
    const toggle = document.getElementById(`toggle-${nodeId}`);
    const children = document.getElementById(`children-${nodeId}`);

    if (toggle && children) {
        toggle.classList.toggle('collapsed');
        children.classList.toggle('collapsed');
    }
};

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
    outputDisplay.innerHTML = `<div class="preview-placeholder" style="color: var(--accent-error);">${escapeHtml(message)}</div>`;
}

// =============================================================================
// JSON Operations
// =============================================================================

async function formatJSON() {
    if (isEmptyInput()) {
        outputDisplay.innerHTML = '<div class="preview-placeholder">Please enter JSON to format</div>';
        return;
    }

    pressButton('formatJSON');

    try {
        const input = editor.value.trim();
        const { formatted } = await processJSON(input);

        // Save checkpoint before formatting
        saveCheckpoint(editor.value);

        // Format in-place in editor
        editor.value = formatted;

        // Apply highlighting and update UI
        applyHighlightingIfNeeded(formatted);
        updateLineNumbers();
        showOutput(formatted);

        showFeedback('✓ Formatted!');
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

// Generic copy function that handles both formatted and minified JSON
async function copyCachedOrProcess(cachedValue, processKey, successMsg) {
    if (cachedValue) {
        await copyToClipboard(cachedValue, successMsg);
        return;
    }

    if (isEmptyInput()) {
        showFeedback('No JSON to copy');
        return;
    }

    try {
        const { [processKey]: result } = await processJSON(editor.value.trim());
        await copyToClipboard(result, successMsg);
    } catch {
        showFeedback('Invalid JSON');
    }
}

async function copyAsFormatted() {
    await copyCachedOrProcess(lastFormattedJSON, 'formatted', 'Copied formatted JSON!');
}

async function copyAsMinified() {
    await copyCachedOrProcess(lastMinifiedJSON, 'minified', 'Copied minified JSON!');
}

async function copyOutput() {
    // Check if there's actual content (not just placeholder)
    if (outputDisplay.querySelector('.preview-placeholder')) {
        showFeedback('No output to copy');
        return;
    }

    const content = outputDisplay.textContent;
    if (!content) {
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
        // Clear editor state
        editor.value = '';
        lastFormattedJSON = '';
        lastMinifiedJSON = '';
        editor.classList.remove('highlighted');
        editorHighlighted.innerHTML = '';

        // Reset output display
        outputDisplay.innerHTML = EMPTY_PLACEHOLDER;

        // Reset validation
        setValidationStatus(null);
        updateStats();

        // Clear checkpoints
        checkpoints = [];
        currentCheckpointIndex = -1;
        updateUndoRedoButtons();

        // Fade in
        editor.style.transition = 'opacity 0.2s ease';
        outputDisplay.style.transition = 'opacity 0.2s ease';
        editor.style.opacity = '1';
        outputDisplay.style.opacity = '1';
    }, 200);
}

// =============================================================================
// Checkpoint System
// =============================================================================

function saveCheckpoint(content) {
    // Remove any checkpoints after current index (when undoing then making new changes)
    checkpoints = checkpoints.slice(0, currentCheckpointIndex + 1);

    // Don't save if same as last checkpoint
    if (checkpoints.length > 0 && checkpoints[checkpoints.length - 1] === content) {
        return;
    }

    checkpoints.push(content);
    currentCheckpointIndex++;

    // Limit checkpoint history
    if (checkpoints.length > CHECKPOINT_LIMIT) {
        checkpoints.shift();
        currentCheckpointIndex--;
    }

    updateUndoRedoButtons();
}

function undoCheckpoint() {
    if (currentCheckpointIndex < 0) return;

    pressButton('undoCheckpoint');

    currentCheckpointIndex--;
    const content = checkpoints[currentCheckpointIndex];
    editor.value = content;

    applyHighlightingIfNeeded(content);
    updateUndoRedoButtons();
    updateStats();
    updateLineNumbers();
    autoValidate();

    showFeedback('↩️ Undone');
}

function redoCheckpoint() {
    if (currentCheckpointIndex >= checkpoints.length - 1) return;

    pressButton('redoCheckpoint');

    currentCheckpointIndex++;
    const content = checkpoints[currentCheckpointIndex];
    editor.value = content;

    applyHighlightingIfNeeded(content);
    updateUndoRedoButtons();
    updateStats();
    updateLineNumbers();
    autoValidate();

    showFeedback('↪️ Redone');
}

function updateUndoRedoButtons() {
    undoBtn.disabled = currentCheckpointIndex < 0;
    redoBtn.disabled = currentCheckpointIndex >= checkpoints.length - 1;

    // Update opacity
    undoBtn.style.opacity = undoBtn.disabled ? '0.4' : '1';
    redoBtn.style.opacity = redoBtn.disabled ? '0.4' : '1';
}

// =============================================================================
// Event Listeners
// =============================================================================

editor.addEventListener('input', () => {
    // Disable highlighting when user edits
    if (editor.classList.contains('highlighted')) {
        editor.classList.remove('highlighted');
        editorHighlighted.innerHTML = '';
    }

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
        case 'z':
        case 'Z':
            e.preventDefault();
            if (e.shiftKey) {
                redoCheckpoint();
            } else {
                undoCheckpoint();
            }
            break;
        case 'y':
        case 'Y':
            e.preventDefault();
            redoCheckpoint();
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

// =============================================================================
// Public API (Window Functions)
// =============================================================================

window.formatJSON = formatJSON;
window.minifyJSON = minifyJSON;
window.copyAsFormatted = copyAsFormatted;
window.copyAsMinified = copyAsMinified;
window.copyOutput = copyOutput;
window.clearEditor = clearEditor;
window.undoCheckpoint = undoCheckpoint;
window.redoCheckpoint = redoCheckpoint;

// =============================================================================
// Window Management
// =============================================================================

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

// =============================================================================
// Initialization
// =============================================================================

updateStats();
updateLineNumbers();
editor.style.transition = 'opacity 0.2s ease';

// Ensure scrolling syncs properly
editor.addEventListener('scroll', syncScroll, { passive: true });
