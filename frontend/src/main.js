import { JSONService } from "../bindings/changeme";

// Tab switching
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Add active class to clicked tab and corresponding content
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    });
});

// Format JSON
window.formatJSON = async () => {
    const input = document.getElementById('format-input').value;
    const outputElement = document.getElementById('format-output');

    if (!input.trim()) {
        outputElement.value = '';
        return;
    }

    try {
        const result = await JSONService.FormatJSON(input);
        outputElement.value = result;
    } catch (err) {
        outputElement.value = 'Error: ' + err.message;
        console.error('Format error:', err);
    }
};

// Minify JSON
window.minifyJSON = async () => {
    const input = document.getElementById('minify-input').value;
    const outputElement = document.getElementById('minify-output');

    if (!input.trim()) {
        outputElement.value = '';
        return;
    }

    try {
        const result = await JSONService.MinifyJSON(input);
        outputElement.value = result;
    } catch (err) {
        outputElement.value = 'Error: ' + err.message;
        console.error('Minify error:', err);
    }
};

// Validate JSON
window.validateJSON = async () => {
    const input = document.getElementById('validate-input').value;
    const resultElement = document.getElementById('validate-result');

    if (!input.trim()) {
        resultElement.textContent = 'Please enter JSON to validate';
        resultElement.className = 'result-box';
        return;
    }

    try {
        const [isValid, message] = await JSONService.ValidateJSON(input);
        resultElement.textContent = message;
        resultElement.className = isValid ? 'result-box success' : 'result-box error';
    } catch (err) {
        resultElement.textContent = 'Error: ' + err.message;
        resultElement.className = 'result-box error';
        console.error('Validation error:', err);
    }
};

// Clear validator
window.clearValidator = () => {
    document.getElementById('validate-input').value = '';
    const resultElement = document.getElementById('validate-result');
    resultElement.textContent = 'Result will appear here...';
    resultElement.className = 'result-box';
};

// Copy to clipboard
window.copyToClipboard = async (elementId) => {
    const element = document.getElementById(elementId);
    const text = element.value;

    if (!text) {
        return;
    }

    try {
        await navigator.clipboard.writeText(text);
        const button = element.nextElementSibling;
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.style.background = 'rgba(34, 197, 94, 0.3)';

        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard');
    }
};
