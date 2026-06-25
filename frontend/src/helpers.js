// Helper functions - shared utilities

import { editor, outputDisplay, lineNumbers, charCount, validationStatus } from './constants.js';

// Visual feedback animation
export function pressButton(buttonName) {
    const button = document.querySelector(`[data-button="${buttonName}"]`);
    if (button) {
        button.classList.add('pressed');
        setTimeout(() => button.classList.remove('pressed'), 150);
    }
}

// Show transient feedback message
export function showFeedback(message) {
    const feedback = document.getElementById('feedback');
    feedback.textContent = message;
    feedback.classList.add('visible');
    setTimeout(() => feedback.classList.remove('visible'), 2000);
}

// Apply syntax highlighting to content
export function applyHighlightingIfNeeded(content) {
    if (content.includes('\n  ') || content.includes('\n    ')) {
        editor.classList.add('highlighted');
        editor.innerHTML = syntaxHighlight(content);
    } else {
        editor.classList.remove('highlighted');
        editor.textContent = content;
    }
}

// Syntax highlighting for JSON
function syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
                return `<span class="${cls}">${match}</span>`;
            } else {
                cls = 'string';
                return `<span class="${cls}">${match}</span>`;
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return `<span class="${cls}">${match}</span>`;
    });
}

// Update character and line count
export function updateStats() {
    const content = editor.value;
    const chars = content.length;
    const lines = content.split('\n').length;
    charCount.textContent = `${chars} chars · ${lines} lines`;
}

// Update line numbers gutter
export function updateLineNumbers() {
    const lines = editor.value.split('\n').length;
    let html = '';
    for (let i = 1; i <= lines; i++) {
        html += `<div class="line-number">${i}</div>`;
    }
    lineNumbers.innerHTML = html;
}

// Set validation status
export function setValidationStatus(status) {
    if (status === null) {
        validationStatus.textContent = '';
        validationStatus.className = 'validation-status';
    } else if (status) {
        validationStatus.textContent = '✓ Valid JSON';
        validationStatus.className = 'validation-status valid';
    } else {
        validationStatus.textContent = '✗ Invalid JSON';
        validationStatus.className = 'validation-status invalid';
    }
}

// Check if editor is empty
export function isEditorEmpty() {
    return !editor.value.trim();
}

// Check if content is formatted
export function isFormattedContent(content) {
    return content.includes('\n  ') || content.includes('\n    ');
}
