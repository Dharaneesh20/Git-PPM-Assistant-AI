// Global variables
let isDirectorySet = false;
let isGitRepo = false;
let isAIConfigured = false;
let availableModels = [];
let currentModel = null;

// DOM elements
const directoryInput = document.getElementById('directory-input');
const setDirectoryBtn = document.getElementById('set-directory-btn');
const directoryStatus = document.getElementById('directory-status');
const outputDisplay = document.getElementById('output-display');
const loadingOverlay = document.getElementById('loading-overlay');

// Repository buttons
const initRepoBtn = document.getElementById('init-repo-btn');
const statusBtn = document.getElementById('status-btn');

// File operation buttons
const filesInput = document.getElementById('files-input');
const addFilesBtn = document.getElementById('add-files-btn');
const commitMessageInput = document.getElementById('commit-message-input');
const commitBtn = document.getElementById('commit-btn');

// Remote operation elements
const remoteUrlInput = document.getElementById('remote-url-input');
const addRemoteBtn = document.getElementById('add-remote-btn');
const branchSelect = document.getElementById('branch-select');
const setBranchBtn = document.getElementById('set-branch-btn');

// Sync buttons
const pushBtn = document.getElementById('push-btn');
const pullBtn = document.getElementById('pull-btn');

// Output controls
const clearOutputBtn = document.getElementById('clear-output-btn');

// AI configuration elements
const aiConfigBtn = document.getElementById('gemini-config-btn');
const aiModal = document.getElementById('ai-modal');
const aiModelSelect = document.getElementById('ai-model-select');
const setModelBtn = document.getElementById('set-model-btn');
const apiKeyInputs = document.getElementById('api-key-inputs');
const currentModelSpan = document.getElementById('current-model');
const modelStatusSpan = document.getElementById('model-status');

// AI help elements
const aiSection = document.getElementById('ai-section');
const aiResponse = document.getElementById('ai-response');
const aiModelUsed = document.getElementById('ai-model-used');
const copyResponseBtn = document.getElementById('copy-response-btn');
const copyCommandsBtn = document.getElementById('copy-commands-btn');
const copyToTerminalBtn = document.getElementById('copy-to-terminal-btn');

// Command modal elements
const commandModal = document.getElementById('command-modal');
const commandsList = document.getElementById('commands-list');
const executeAllCommandsBtn = document.getElementById('execute-all-commands');
const closeCommandModalBtn = document.getElementById('close-command-modal');

// Utility functions
function showLoading() {
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

function updateOutput(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    outputDisplay.textContent += `[${timestamp}] ${prefix} ${message}\n`;
    outputDisplay.scrollTop = outputDisplay.scrollHeight;
}

function showStatus(element, message, type) {
    element.textContent = message;
    element.className = `status-message status-${type} fade-in`;
    
    // Add pulse animation to relevant button
    if (type === 'success') {
        element.closest('.card')?.classList.add('pulse-success');
        setTimeout(() => element.closest('.card')?.classList.remove('pulse-success'), 600);
    } else if (type === 'error') {
        element.closest('.card')?.classList.add('pulse-error');
        setTimeout(() => element.closest('.card')?.classList.remove('pulse-error'), 600);
    }
}

function updateButtonStates() {
    const gitButtons = [initRepoBtn, statusBtn, addFilesBtn, commitBtn, addRemoteBtn, setBranchBtn, pushBtn, pullBtn];
    
    gitButtons.forEach(btn => {
        btn.disabled = !isDirectorySet;
    });
    
    // Special case: init button should be disabled if already a git repo
    if (isDirectorySet && isGitRepo) {
        initRepoBtn.disabled = true;
        initRepoBtn.innerHTML = '<i class="fas fa-check"></i> Repository Initialized';
    } else if (isDirectorySet && !isGitRepo) {
        initRepoBtn.disabled = false;
        initRepoBtn.innerHTML = '<i class="fas fa-play"></i> Initialize Repository';
    }
}

async function makeRequest(url, data = null, method = 'GET') {
    try {
        const config = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        
        if (data) {
            config.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, config);
        return await response.json();
    } catch (error) {
        console.error('Request failed:', error);
        return { success: false, message: `Request failed: ${error.message}` };
    }
}

async function getAIHelp(errorMessage, context = '') {
    if (!isAIConfigured) {
        updateOutput('AI not configured. Click "Configure AI" to set up.', 'error');
        return;
    }
    
    showLoading();
    try {
        const result = await makeRequest('/api/get-ai-help', {
            error_message: errorMessage,
            context: context
        }, 'POST');
        
        if (result.success) {
            // Configure marked for better Git command rendering
            marked.setOptions({
                highlight: function(code, lang) {
                    if (lang && hljs.getLanguage(lang)) {
                        try {
                            return hljs.highlight(code, {language: lang}).value;
                        } catch (err) {}
                    }
                    return hljs.highlightAuto(code).value;
                },
                breaks: true,
                gfm: true
            });
            
            // Render markdown
            const htmlContent = marked.parse(result.response);
            aiResponse.innerHTML = htmlContent;
            
            // Highlight git commands specifically
            highlightGitCommands();
            
            // Update model info
            if (aiModelUsed) {
                aiModelUsed.textContent = `Model: ${result.model || currentModel}`;
            }
            
            aiSection.style.display = 'block';
            aiSection.scrollIntoView({ behavior: 'smooth' });
            updateOutput(`AI assistance received from ${result.model || currentModel}`, 'success');
        } else {
            updateOutput(`AI Help Error: ${result.message}`, 'error');
        }
    } catch (error) {
        updateOutput(`Failed to get AI help: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

function highlightGitCommands() {
    // Find and highlight git commands in the response
    const codeBlocks = aiResponse.querySelectorAll('code');
    codeBlocks.forEach(code => {
        if (code.textContent.trim().startsWith('git ')) {
            code.parentElement.classList.add('git-command');
        }
    });
    
    // Also highlight pre blocks containing git commands
    const preBlocks = aiResponse.querySelectorAll('pre');
    preBlocks.forEach(pre => {
        const code = pre.querySelector('code');
        if (code && code.textContent.includes('git ')) {
            pre.style.background = '#e8f5e8';
            pre.style.borderLeft = '4px solid #28a745';
        }
    });
}

function extractGitCommands(htmlContent) {
    // Create a temporary element to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = htmlContent;
    
    const commands = [];
    
    // Extract from code blocks
    const codeElements = temp.querySelectorAll('code');
    codeElements.forEach(code => {
        const text = code.textContent.trim();
        if (text.startsWith('git ')) {
            commands.push(text);
        }
    });
    
    // Extract from pre blocks
    const preElements = temp.querySelectorAll('pre');
    preElements.forEach(pre => {
        const lines = pre.textContent.split('\n');
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('git ') && !commands.includes(trimmed)) {
                commands.push(trimmed);
            }
        });
    });
    
    return commands;
}

function showExtractedCommands(commands) {
    if (commands.length === 0) {
        updateOutput('No Git commands found in AI response', 'error');
        return;
    }
    
    // Create commands display
    const commandsHtml = commands.map(cmd => 
        `<div class="command-item">
            <code>${cmd}</code>
            <button class="btn btn-sm copy-btn" onclick="copyCommand('${cmd.replace(/'/g, "\\'")}')">
                <i class="fas fa-copy"></i>
            </button>
        </div>`
    ).join('');
    
    commandsList.innerHTML = `
        <div class="extracted-commands">
            <h4><i class="fas fa-terminal"></i> Extracted Git Commands</h4>
            ${commandsHtml}
        </div>
    `;
    
    commandModal.style.display = 'flex';
}

// AI Configuration Functions
async function loadModels() {
    try {
        const result = await makeRequest('/api/models');
        if (result.success) {
            availableModels = result.models;
            populateModelSelect();
            updateAIStatus();
        }
    } catch (error) {
        updateOutput(`Failed to load AI models: ${error.message}`, 'error');
    }
}

function populateModelSelect() {
    aiModelSelect.innerHTML = '<option value="">Select AI Model...</option>';
    
    availableModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.key;
        option.textContent = `${model.name}${model.configured ? ' ✓' : ' ⚠️'}`;
        if (model.selected) {
            option.selected = true;
            currentModel = model.name;
        }
        aiModelSelect.appendChild(option);
    });
}

function generateAPIKeyInputs() {
    apiKeyInputs.innerHTML = '';
    
    const providers = [...new Set(availableModels.map(m => m.provider))];
    
    providers.forEach(provider => {
        const model = availableModels.find(m => m.provider === provider);
        if (!model) return;
        
        const div = document.createElement('div');
        div.className = 'api-key-input-group';
        
        const providerLabels = {
            'google': 'Google (Gemini)',
            'openai': 'OpenAI (GPT)',
            'anthropic': 'Anthropic (Claude)',
            'meta': 'Meta (Llama)',
            'deepseek': 'DeepSeek',
            'ollama': 'Ollama (Local URL)'
        };
        
        div.innerHTML = `
            <label>${providerLabels[provider] || provider.charAt(0).toUpperCase() + provider.slice(1)}</label>
            <div class="input-group">
                <input type="password" id="api-key-${provider}" placeholder="${provider === 'ollama' ? 'http://localhost:11434' : 'Enter API key'}">
                <button type="button" class="btn btn-primary" onclick="saveAPIKey('${provider}')">Save</button>
            </div>
        `;
        
        apiKeyInputs.appendChild(div);
    });
}

async function saveAPIKey(provider) {
    const input = document.getElementById(`api-key-${provider}`);
    const apiKey = input.value.trim();
    
    if (!apiKey) {
        updateOutput('Please enter an API key', 'error');
        return;
    }
    
    showLoading();
    try {
        const result = await makeRequest('/api/set-api-key', {
            provider: provider,
            api_key: apiKey
        }, 'POST');
        
        if (result.success) {
            updateOutput(result.message, 'success');
            input.value = '';
            await loadModels(); // Refresh model status
        } else {
            updateOutput(`Error: ${result.message}`, 'error');
        }
    } finally {
        hideLoading();
    }
}

async function setModel() {
    const selectedModel = aiModelSelect.value;
    if (!selectedModel) {
        updateOutput('Please select a model', 'error');
        return;
    }
    
    showLoading();
    try {
        const result = await makeRequest('/api/set-model', {
            model: selectedModel
        }, 'POST');
        
        if (result.success) {
            updateOutput(result.message, 'success');
            await loadModels(); // Refresh model status
            updateAIStatus();
        } else {
            updateOutput(`Error: ${result.message}`, 'error');
        }
    } finally {
        hideLoading();
    }
}

function updateAIStatus() {
    const selectedModel = availableModels.find(m => m.selected);
    
    if (selectedModel) {
        currentModel = selectedModel.name;
        currentModelSpan.textContent = selectedModel.name;
        
        if (selectedModel.configured) {
            modelStatusSpan.className = 'status-indicator configured';
            isAIConfigured = true;
            aiConfigBtn.innerHTML = '<i class="fas fa-robot"></i> AI Configured ✓';
        } else {
            modelStatusSpan.className = 'status-indicator not-configured';
            isAIConfigured = false;
            aiConfigBtn.innerHTML = '<i class="fas fa-robot"></i> Configure AI';
        }
    } else {
        currentModelSpan.textContent = 'No model selected';
        modelStatusSpan.className = 'status-indicator not-configured';
        isAIConfigured = false;
        aiConfigBtn.innerHTML = '<i class="fas fa-robot"></i> Configure AI';
    }
}

// Event listeners
setDirectoryBtn.addEventListener('click', async () => {
    const directory = directoryInput.value.trim();
    if (!directory) {
        showStatus(directoryStatus, 'Please enter a directory path', 'error');
        return;
    }
    
    showLoading();
    try {
        const result = await makeRequest('/api/set-directory', { directory }, 'POST');
        
        if (result.success) {
            isDirectorySet = true;
            isGitRepo = result.is_git_repo;
            showStatus(directoryStatus, result.message, 'success');
            updateOutput(`Directory set: ${directory}`, 'success');
            
            if (isGitRepo) {
                updateOutput('Existing Git repository detected', 'info');
            }
        } else {
            isDirectorySet = false;
            isGitRepo = false;
            showStatus(directoryStatus, result.message, 'error');
            updateOutput(`Failed to set directory: ${result.message}`, 'error');
        }
        
        updateButtonStates();
    } finally {
        hideLoading();
    }
});

initRepoBtn.addEventListener('click', async () => {
    showLoading();
    try {
        const result = await makeRequest('/api/init-repo', {}, 'POST');
        
        if (result.success) {
            isGitRepo = true;
            updateOutput('Git repository initialized successfully', 'success');
            updateButtonStates();
        } else {
            updateOutput(`Failed to initialize repository: ${result.message}`, 'error');
            await getAIHelp(result.message, 'Initializing Git repository');
        }
    } finally {
        hideLoading();
    }
});

statusBtn.addEventListener('click', async () => {
    showLoading();
    try {
        const result = await makeRequest('/api/status');
        
        if (result.success) {
            updateOutput('Repository Status:\n' + result.message, 'info');
        } else {
            updateOutput(`Failed to get status: ${result.message}`, 'error');
            await getAIHelp(result.message, 'Getting Git status');
        }
    } finally {
        hideLoading();
    }
});

addFilesBtn.addEventListener('click', async () => {
    const files = filesInput.value.trim() || 'all';
    
    showLoading();
    try {
        const result = await makeRequest('/api/add-files', { files }, 'POST');
        
        if (result.success) {
            updateOutput(`Files staged successfully: ${files}`, 'success');
            filesInput.value = '';
        } else {
            updateOutput(`Failed to stage files: ${result.message}`, 'error');
            await getAIHelp(result.message, `Staging files: ${files}`);
        }
    } finally {
        hideLoading();
    }
});

commitBtn.addEventListener('click', async () => {
    const message = commitMessageInput.value.trim();
    if (!message) {
        updateOutput('Please enter a commit message', 'error');
        return;
    }
    
    showLoading();
    try {
        const result = await makeRequest('/api/commit', { message }, 'POST');
        
        if (result.success) {
            updateOutput(`Changes committed: "${message}"`, 'success');
            commitMessageInput.value = '';
        } else {
            updateOutput(`Failed to commit: ${result.message}`, 'error');
            await getAIHelp(result.message, `Committing with message: ${message}`);
        }
    } finally {
        hideLoading();
    }
});

addRemoteBtn.addEventListener('click', async () => {
    const remoteUrl = remoteUrlInput.value.trim();
    if (!remoteUrl) {
        updateOutput('Please enter a remote repository URL', 'error');
        return;
    }
    
    showLoading();
    try {
        const result = await makeRequest('/api/add-remote', { remote_url: remoteUrl }, 'POST');
        
        if (result.success) {
            updateOutput(`Remote added: ${remoteUrl}`, 'success');
            remoteUrlInput.value = '';
        } else {
            updateOutput(`Failed to add remote: ${result.message}`, 'error');
            await getAIHelp(result.message, `Adding remote: ${remoteUrl}`);
        }
    } finally {
        hideLoading();
    }
});

setBranchBtn.addEventListener('click', async () => {
    const branch = branchSelect.value;
    
    showLoading();
    try {
        const result = await makeRequest('/api/set-branch', { branch }, 'POST');
        
        if (result.success) {
            updateOutput(`Branch set to: ${branch}`, 'success');
        } else {
            updateOutput(`Failed to set branch: ${result.message}`, 'error');
            await getAIHelp(result.message, `Setting branch to: ${branch}`);
        }
    } finally {
        hideLoading();
    }
});

pushBtn.addEventListener('click', async () => {
    const branch = branchSelect.value;
    
    showLoading();
    try {
        const result = await makeRequest('/api/push', { branch }, 'POST');
        
        if (result.success) {
            updateOutput(`Successfully pushed to ${branch}`, 'success');
        } else {
            updateOutput(`Failed to push: ${result.message}`, 'error');
            await getAIHelp(result.message, `Pushing to ${branch} branch`);
        }
    } finally {
        hideLoading();
    }
});

pullBtn.addEventListener('click', async () => {
    const branch = branchSelect.value;
    
    showLoading();
    try {
        const result = await makeRequest('/api/pull', { branch }, 'POST');
        
        if (result.success) {
            updateOutput(`Successfully pulled from ${branch}`, 'success');
        } else {
            updateOutput(`Failed to pull: ${result.message}`, 'error');
            await getAIHelp(result.message, `Pulling from ${branch} branch`);
        }
    } finally {
        hideLoading();
    }
});

clearOutputBtn.addEventListener('click', () => {
    outputDisplay.textContent = 'Output cleared...\n';
});

// AI Configuration event listeners
aiConfigBtn.addEventListener('click', () => {
    loadModels();
    generateAPIKeyInputs();
    aiModal.style.display = 'flex';
});

setModelBtn.addEventListener('click', setModel);

// Legacy Gemini support (for backward compatibility)
if (document.getElementById('save-gemini-key')) {
    document.getElementById('save-gemini-key').addEventListener('click', async () => {
        const apiKey = document.getElementById('gemini-api-key').value.trim();
        if (!apiKey) {
            alert('Please enter a valid API key');
            return;
        }
        
        showLoading();
        try {
            const result = await makeRequest('/api/set-gemini-key', { api_key: apiKey }, 'POST');
            
            if (result.success) {
                isAIConfigured = true;
                document.getElementById('gemini-modal').style.display = 'none';
                document.getElementById('gemini-api-key').value = '';
                updateOutput('Gemini AI configured successfully', 'success');
                await loadModels();
                updateAIStatus();
            } else {
                alert(`Failed to configure Gemini AI: ${result.message}`);
            }
        } finally {
            hideLoading();
        }
    });
}

copyResponseBtn.addEventListener('click', () => {
    // Get the plain text content from the markdown
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = aiResponse.innerHTML;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    navigator.clipboard.writeText(plainText).then(() => {
        updateOutput('AI response copied to clipboard', 'success');
    });
});

// Add event listener for the new copy commands button
if (copyCommandsBtn) {
    copyCommandsBtn.addEventListener('click', () => {
        const commands = extractGitCommands(aiResponse.innerHTML);
        showExtractedCommands(commands);
    });
}

copyToTerminalBtn.addEventListener('click', () => {
    const commands = extractGitCommands(aiResponse.innerHTML);
    if (commands.length === 0) {
        updateOutput('No Git commands found in AI response', 'error');
        return;
    }
    
    // Show commands in modal for execution
    commandsList.innerHTML = `
        <div class="extracted-commands">
            <h4><i class="fas fa-terminal"></i> Commands to Execute</h4>
            ${commands.map(cmd => `<div class="command-item"><code>${cmd}</code></div>`).join('')}
            <p><strong>Note:</strong> These commands will be executed in sequence. Make sure you want to proceed.</p>
        </div>
    `;
    commandModal.style.display = 'flex';
});

function copyCommand(command) {
    navigator.clipboard.writeText(command).then(() => {
        updateOutput(`Copied command: ${command}`, 'success');
    });
}

executeAllCommandsBtn.addEventListener('click', async () => {
    const commands = extractGitCommands(aiResponse.innerHTML);
    commandModal.style.display = 'none';
    
    showLoading();
    for (const command of commands) {
        try {
            const result = await makeRequest('/api/execute-command', { command }, 'POST');
            
            if (result.success) {
                updateOutput(`✅ ${command}\n${result.message}`, 'success');
            } else {
                updateOutput(`❌ ${command}\n${result.message}`, 'error');
                break; // Stop on first error
            }
        } catch (error) {
            updateOutput(`❌ ${command}\nError: ${error.message}`, 'error');
            break;
        }
    }
    hideLoading();
});

closeCommandModalBtn.addEventListener('click', () => {
    commandModal.style.display = 'none';
});

// Modal close handlers
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', (e) => {
        e.target.closest('.modal').style.display = 'none';
    });
});

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === aiModal) {
        aiModal.style.display = 'none';
    }
    if (e.target === commandModal) {
        commandModal.style.display = 'none';
    }
    // Legacy support
    if (document.getElementById('gemini-modal') && e.target === document.getElementById('gemini-modal')) {
        document.getElementById('gemini-modal').style.display = 'none';
    }
});

// Enter key handlers
directoryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        setDirectoryBtn.click();
    }
});

commitMessageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        commitBtn.click();
    }
});

remoteUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addRemoteBtn.click();
    }
});

geminiApiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        saveGeminiKeyBtn.click();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateOutput('Git GUI Web Interface loaded successfully!', 'success');
    updateOutput('Select a directory to begin Git operations.', 'info');
    updateButtonStates();
    loadModels(); // Load AI models on startup
});
