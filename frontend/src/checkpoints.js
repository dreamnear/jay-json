// Checkpoint System - Undo/Redo functionality

import { editor, undoBtn, redoBtn, CHECKPOINT_LIMIT } from './constants.js';
import { pressButton, applyHighlightingIfNeeded, updateStats, updateLineNumbers, autoValidate, showFeedback } from './helpers.js';

// State - will be initialized externally
let checkpoints = [];
let currentCheckpointIndex = -1;

// Set checkpoint state (called from main.js during initialization)
export function setCheckpointState(cp, idx) {
    checkpoints = cp;
    currentCheckpointIndex = idx;
}

// Get checkpoint state (for saving to tab state)
export function getCheckpointState() {
    return { checkpoints, currentCheckpointIndex };
}

// Reset checkpoints
export function resetCheckpoints() {
    checkpoints = [];
    currentCheckpointIndex = -1;
}

// Save current content as checkpoint
export function saveCheckpoint(content, saveCurrentTabStateFn) {
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
    if (saveCurrentTabStateFn) {
        saveCurrentTabStateFn();
    }

    updateUndoRedoButtons();
}

// Undo to previous checkpoint
export function undoCheckpoint() {
    if (currentCheckpointIndex <= 0) return;

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

// Redo to next checkpoint
export function redoCheckpoint() {
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

// Update undo/redo button states
export function updateUndoRedoButtons() {
    undoBtn.disabled = currentCheckpointIndex < 0;
    redoBtn.disabled = currentCheckpointIndex >= checkpoints.length - 1;

    // Update opacity
    undoBtn.style.opacity = undoBtn.disabled ? '0.4' : '1';
    redoBtn.style.opacity = redoBtn.disabled ? '0.4' : '1';
}

// Get current checkpoint index
export function getCurrentCheckpointIndex() {
    return currentCheckpointIndex;
}
