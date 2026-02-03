import { JSONService } from "../bindings/changeme";
import { WindowManager } from "../bindings/changeme";

// =============================================================================
// Theme Manager
// =============================================================================

const ThemeManager = {
    current: 'system', // 'system' | 'light' | 'dark'
    storageKey: 'jay-theme',

    // Theme configuration with SVG icons
    themes: {
        system: {
            name: 'System',
            svg: '<path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />'
        },
        light: {
            name: 'Light',
            svg: '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>'
        },
        dark: {
            name: 'Dark',
            svg: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>'
        }
    },

    init() {
        // Load saved theme preference
        const saved = localStorage.getItem(this.storageKey);
        if (saved && ['system', 'light', 'dark'].includes(saved)) {
            this.current = saved;
        }

        // Apply initial theme
        this.applyTheme();

        // Listen for system theme changes when in system mode
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.mediaQuery.addEventListener('change', () => {
            if (this.current === 'system') {
                this.applyTheme();
            }
        });

        // Listen for theme changes from other windows
        window.addEventListener('storage', (e) => {
            if (e.key === this.storageKey && e.newValue) {
                this.current = e.newValue;
                this.applyTheme();
                this.updateUI();
            }
        });

        // Setup UI
        this.setupUI();
    },

    setTheme(theme) {
        if (!['system', 'light', 'dark'].includes(theme)) return;

        this.current = theme;
        localStorage.setItem(this.storageKey, theme);
        this.applyTheme();
        this.updateUI();
    },

    applyTheme() {
        const root = document.documentElement;

        // Remove data-theme attribute
        root.removeAttribute('data-theme');

        if (this.current === 'dark') {
            root.classList.add('dark');
            root.setAttribute('data-theme', 'dark');
        } else if (this.current === 'light') {
            root.classList.remove('dark');
            root.setAttribute('data-theme', 'light');
        } else {
            // System mode - let CSS media query handle it
            root.classList.remove('dark');
            root.removeAttribute('data-theme');
        }
    },

    updateUI() {
        const btn = document.getElementById('themeBtn');
        const menu = document.getElementById('themeMenu');
        if (!btn || !menu) return;

        const theme = this.themes[this.current];

        // Update button icon (SVG)
        const iconEl = btn.querySelector('.theme-icon');
        if (iconEl) {
            iconEl.innerHTML = theme.svg;
        }
        btn.querySelector('.theme-name').textContent = theme.name;

        // Update menu options
        menu.querySelectorAll('.theme-option').forEach(option => {
            const value = option.dataset.value;
            const isChecked = value === this.current;
            option.setAttribute('aria-checked', isChecked);
        });
    },

    setupUI() {
        const btn = document.getElementById('themeBtn');
        const menu = document.getElementById('themeMenu');
        if (!btn || !menu) return;

        // Toggle menu on button click
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = btn.getAttribute('aria-expanded') === 'true';
            btn.setAttribute('aria-expanded', !isExpanded);
            menu.classList.toggle('show', !isExpanded);
        });

        // Close menu when clicking outside
        document.addEventListener('click', () => {
            menu.classList.remove('show');
            btn.setAttribute('aria-expanded', 'false');
        });

        // Prevent menu from closing when clicking inside
        menu.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Handle option clicks
        menu.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => {
                const value = option.dataset.value;
                this.setTheme(value);
                menu.classList.remove('show');
                btn.setAttribute('aria-expanded', 'false');
            });

            // Keyboard navigation
            option.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    option.click();
                }
            });
        });

        // Initial UI update
        this.updateUI();
    }
};

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
const tabsContainer = document.getElementById('tabs-container');

// =============================================================================
// Tab State
// =============================================================================

let tabs = [];
let activeTabId = null;

// =============================================================================
// Panel Management
// =============================================================================

function togglePanel(panelType) {
    const panel = document.getElementById(`${panelType}-panel`);
    if (!panel) return;

    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) return;

    const otherPanelType = panelType === 'editor' ? 'preview' : 'editor';
    const isCurrentlyCollapsed = tab.collapsedPanels[panelType];
    const isOtherCollapsed = tab.collapsedPanels[otherPanelType];

    // If trying to collapse this panel and the other is already collapsed,
    // expand the other panel first
    if (!isCurrentlyCollapsed && isOtherCollapsed) {
        const otherPanel = document.getElementById(`${otherPanelType}-panel`);
        if (otherPanel) {
            tab.collapsedPanels[otherPanelType] = false;
            otherPanel.classList.remove('collapsed');

            // Update other panel's collapse button
            const otherCollapseBtn = otherPanel.querySelector('.collapse-btn');
            if (otherCollapseBtn) {
                otherCollapseBtn.setAttribute('aria-expanded', 'true');
            }
        }
    }

    tab.collapsedPanels[panelType] = !tab.collapsedPanels[panelType];

    if (tab.collapsedPanels[panelType]) {
        panel.classList.add('collapsed');
    } else {
        panel.classList.remove('collapsed');
    }

    // Update collapse button aria-expanded attribute
    const collapseBtn = panel.querySelector('.collapse-btn');
    if (collapseBtn) {
        collapseBtn.setAttribute('aria-expanded', !tab.collapsedPanels[panelType]);
    }

    // Save to storage
    saveTabsToStorage();
}

// =============================================================================
// Tab Management
// =============================================================================

function generateTabId() {
    return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createTab(filename = 'Untitled', content = '') {
    const tab = {
        id: generateTabId(),
        filename: filename,
        content: content,
        checkpoints: [],
        checkpointIndex: -1,
        isModified: false,
        lastFormatted: '',
        lastMinified: '',
        collapsedPanels: {
            editor: false,
            preview: false
        }
    };
    return tab;
}

function newTab() {
    const tab = createTab('Untitled', '');
    tabs.push(tab);
    setActiveTab(tab.id);
    renderTabs();
    editor.focus();
}

function closeTab(tabId) {
    const index = tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    tabs.splice(index, 1);

    // If closing active tab, switch to another
    if (tabId === activeTabId) {
        if (tabs.length > 0) {
            // Switch to the tab to the right, or the last tab
            const newIndex = Math.min(index, tabs.length - 1);
            setActiveTab(tabs[newIndex].id);
        } else {
            // No tabs left, create a new one
            newTab();
        }
    }

    renderTabs();
}

function loadTabIntoEditor(tab) {
    editor.value = tab.content;
    checkpoints = tab.checkpoints;
    currentCheckpointIndex = tab.checkpointIndex;

    applyHighlightingIfNeeded(tab.content);
    updateLineNumbers();
    updateStats();
    updateUndoRedoButtons();

    // Restore panel collapse state for this tab
    restorePanelState(tab);

    if (tab.content.trim()) {
        try {
            const parsed = JSON.parse(tab.content);
            outputDisplay.innerHTML = renderTreeView(parsed, 'root');
        } catch {
            outputDisplay.innerHTML = EMPTY_PLACEHOLDER;
        }
    } else {
        outputDisplay.innerHTML = EMPTY_PLACEHOLDER;
    }
}

function setActiveTab(tabId) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    saveCurrentTabState();
    activeTabId = tabId;
    loadTabIntoEditor(tab);
    renderTabs();
}

function saveCurrentTabState() {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) return;

    tab.content = editor.value;
    tab.checkpoints = checkpoints;
    tab.checkpointIndex = currentCheckpointIndex;
}

function updateTabModified(isModified) {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) return;

    tab.isModified = isModified;
    renderTabs();
}

function renderTabs() {
    tabsContainer.innerHTML = '';

    tabs.forEach((tab, index) => {
        const tabEl = document.createElement('div');
        tabEl.className = `tab ${tab.id === activeTabId ? 'active' : ''} ${tab.isModified ? 'modified' : ''}`;
        tabEl.onclick = () => setActiveTab(tab.id);
        tabEl.setAttribute('role', 'tab');
        tabEl.setAttribute('aria-selected', tab.id === activeTabId);
        tabEl.setAttribute('aria-label', `${tab.filename}${tab.isModified ? ' (modified)' : ''}`);
        tabEl.setAttribute('tabindex', '0');
        tabEl.dataset.tabId = tab.id;

        tabEl.innerHTML = `
            <span class="tab-name">${escapeHtml(tab.filename)}</span>
            <button class="tab-close" onclick="event.stopPropagation(); closeTab('${tab.id}')" aria-label="Close ${tab.filename}" tabindex="0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        `;

        tabsContainer.appendChild(tabEl);
    });

    // Save to localStorage whenever tabs change
    saveTabsToStorage();
}

// =============================================================================
// Tab Persistence
// =============================================================================

const STORAGE_KEY = 'jsonToolsTabs';

function saveTabsToStorage() {
    try {
        const tabsData = {
            tabs: tabs.map(tab => ({
                id: tab.id,
                filename: tab.filename,
                content: tab.content,
                checkpoints: tab.checkpoints,
                checkpointIndex: tab.checkpointIndex,
                isModified: tab.isModified,
                collapsedPanels: tab.collapsedPanels
            })),
            activeTabId: activeTabId
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tabsData));
    } catch (e) {
        console.error('Failed to save tabs to storage:', e);
    }
}

function restorePanelState(tab) {
    if (!tab || !tab.collapsedPanels) return;

    const editorPanel = document.getElementById('editor-panel');
    const previewPanel = document.getElementById('preview-panel');

    if (tab.collapsedPanels.editor && editorPanel) {
        editorPanel.classList.add('collapsed');
    } else if (editorPanel) {
        editorPanel.classList.remove('collapsed');
    }

    if (tab.collapsedPanels.preview && previewPanel) {
        previewPanel.classList.add('collapsed');
    } else if (previewPanel) {
        previewPanel.classList.remove('collapsed');
    }
}

function loadTabsFromStorage() {
    try {
        const tabsDataStr = localStorage.getItem(STORAGE_KEY);
        if (!tabsDataStr) return false;

        const tabsData = JSON.parse(tabsDataStr);
        if (!tabsData.tabs || !Array.isArray(tabsData.tabs) || tabsData.tabs.length === 0) {
            return false;
        }

        // Restore tabs with their collapsedPanels state
        tabs = tabsData.tabs.map(tabData => ({
            ...tabData,
            lastFormatted: '',
            lastMinified: '',
            collapsedPanels: tabData.collapsedPanels || {
                editor: false,
                preview: false
            }
        }));

        // Set and verify active tab
        activeTabId = tabsData.activeTabId || tabs[0].id;
        if (!tabs.find(t => t.id === activeTabId)) {
            activeTabId = tabs[0].id;
        }

        // Load the active tab content
        const tab = tabs.find(t => t.id === activeTabId);
        if (tab) {
            loadTabIntoEditor(tab);
        }

        renderTabs();
        return true;
    } catch (e) {
        console.error('Failed to load tabs from storage:', e);
        return false;
    }
}

// Open current tab in a new window
async function openInWindow() {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) return;

    // Save current state first
    saveCurrentTabState();

    // Store tab data in localStorage for the new window to retrieve
    const pendingData = {
        filename: tab.filename,
        content: tab.content,
        checkpoints: tab.checkpoints,
        checkpointIndex: tab.checkpointIndex
    };
    localStorage.setItem('pendingTabData', JSON.stringify(pendingData));

    // Open new window
    try {
        await WindowManager.OpenNewWindow();
        showFeedback('✓ Opened in new window');
    } catch {
        showFeedback('✗ Failed to open window');
    }

    // Clear the pending data after a short delay
    setTimeout(() => {
        localStorage.removeItem('pendingTabData');
    }, 5000);
}

// Check if this window was opened with pending tab data
function loadPendingTabData() {
    const pendingDataStr = localStorage.getItem('pendingTabData');
    if (!pendingDataStr) return false;

    try {
        const pendingData = JSON.parse(pendingDataStr);
        const tab = createTab(pendingData.filename, pendingData.content);
        tab.checkpoints = pendingData.checkpoints || [];
        tab.checkpointIndex = pendingData.checkpointIndex || -1;

        tabs = [tab];
        activeTabId = tab.id;

        loadTabIntoEditor(tab);
        renderTabs();
        localStorage.removeItem('pendingTabData');

        return true;
    } catch (e) {
        console.error('Failed to load pending tab data:', e);
        localStorage.removeItem('pendingTabData');
        return false;
    }
}

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

// Process JSON input: format and minify, caching results in the current tab
async function processJSON(input) {
    const [formatted, minified] = await Promise.all([
        JSONService.FormatJSON(input, true),
        JSONService.MinifyJSON(input)
    ]);

    // Store in the current tab
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab) {
        tab.lastFormatted = formatted;
        tab.lastMinified = minified;
    }

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
        html += `<span class="tree-toggle" id="toggle-${nodeId}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        </span>`;
    } else {
        html += `<span class="tree-toggle invisible">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        </span>`;
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

        // Save to tab state
        saveCurrentTabState();

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
    const tab = tabs.find(t => t.id === activeTabId);
    const cachedValue = tab ? tab.lastFormatted : '';
    await copyCachedOrProcess(cachedValue, 'formatted', 'Copied formatted JSON!');
}

async function copyAsMinified() {
    const tab = tabs.find(t => t.id === activeTabId);
    const cachedValue = tab ? tab.lastMinified : '';
    await copyCachedOrProcess(cachedValue, 'minified', 'Copied minified JSON!');
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
        editor.classList.remove('highlighted');
        editorHighlighted.innerHTML = '';

        // Clear cached values in current tab
        const tab = tabs.find(t => t.id === activeTabId);
        if (tab) {
            tab.lastFormatted = '';
            tab.lastMinified = '';
        }

        // Reset output display
        outputDisplay.innerHTML = EMPTY_PLACEHOLDER;

        // Reset validation
        setValidationStatus(null);
        updateStats();

        // Clear checkpoints
        checkpoints = [];
        currentCheckpointIndex = -1;
        updateUndoRedoButtons();

        // Update tab state
        saveCurrentTabState();

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

    // Save to tab state
    saveCurrentTabState();

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

    // Mark current tab as modified
    updateTabModified(true);

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
        case 't':
        case 'T':
            e.preventDefault();
            newTab();
            break;
        case 'w':
        case 'W':
            e.preventDefault();
            if (activeTabId) {
                closeTab(activeTabId);
            }
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
        case 'Tab':
            e.preventDefault();
            switchToNextTab();
            break;
        case 'o':
        case 'O':
            if (e.shiftKey) {
                e.preventDefault();
                openInWindow();
            }
            break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
            // Switch to tab by number (1-based)
            const tabIndex = parseInt(e.key) - 1;
            if (tabIndex >= 0 && tabIndex < tabs.length) {
                e.preventDefault();
                setActiveTab(tabs[tabIndex].id);
            }
            break;
        case '[':
            if (e.shiftKey) {
                e.preventDefault();
                togglePanel('editor'); // Collapse/expand editor
            }
            break;
        case ']':
            if (e.shiftKey) {
                e.preventDefault();
                togglePanel('preview'); // Collapse/expand tree view
            }
            break;
    }
});

function getActiveTabIndex() {
    return tabs.findIndex(t => t.id === activeTabId);
}

function switchToNextTab() {
    if (tabs.length <= 1) return;
    const currentIndex = getActiveTabIndex();
    if (currentIndex >= 0) {
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTab(tabs[nextIndex].id);
    }
}

function switchToPreviousTab() {
    if (tabs.length <= 1) return;
    const currentIndex = getActiveTabIndex();
    const targetIndex = currentIndex <= 0 ? tabs.length - 1 : currentIndex - 1;
    setActiveTab(tabs[targetIndex].id);
}

// Handle arrow key navigation for tabs
document.addEventListener('keydown', (e) => {
    // Only handle arrow keys when not in editor
    if (document.activeElement === editor) return;

    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        switchToPreviousTab();
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        switchToNextTab();
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
window.newTab = newTab;
window.closeTab = closeTab;
window.setActiveTab = setActiveTab;
window.openInWindow = openInWindow;
window.togglePanel = togglePanel;

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

// Initialize theme manager first
ThemeManager.init();

// Priority order for loading tabs:
// 1. Pending data from "Open in Window" feature
// 2. Saved tabs from localStorage (previous session)
// 3. Default new tab

const hasPendingData = loadPendingTabData();

if (!hasPendingData) {
    const hasSavedTabs = loadTabsFromStorage();

    // If no saved tabs, create a default tab
    if (!hasSavedTabs) {
        const defaultTab = createTab('Untitled', '');
        tabs.push(defaultTab);
        activeTabId = defaultTab.id;
        renderTabs();
    }
}

updateStats();
updateLineNumbers();
editor.style.transition = 'opacity 0.2s ease';

// Ensure scrolling syncs properly
editor.addEventListener('scroll', syncScroll, { passive: true });
