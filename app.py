from flask import Flask, render_template, request, jsonify, session
import os
import subprocess
import json
import google.generativeai as genai
from pathlib import Path
import threading
import time
import requests
from dotenv import load_dotenv
import configparser

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'

# Configuration file path
CONFIG_FILE = 'ai_config.ini'

# AI Model configurations
AI_MODELS = {
    'gemini-1.5-flash': {
        'name': 'Gemini 1.5 Flash',
        'provider': 'google',
        'model_id': 'gemini-1.5-flash'
    },
    'gemini-pro': {
        'name': 'Gemini Pro',
        'provider': 'google',
        'model_id': 'gemini-pro'
    },
    'gpt-4': {
        'name': 'GPT-4',
        'provider': 'openai',
        'model_id': 'gpt-4'
    },
    'gpt-3.5-turbo': {
        'name': 'GPT-3.5 Turbo',
        'provider': 'openai',
        'model_id': 'gpt-3.5-turbo'
    },
    'claude-3-sonnet': {
        'name': 'Claude 3 Sonnet',
        'provider': 'anthropic',
        'model_id': 'claude-3-sonnet-20240229'
    },
    'llama-2-70b': {
        'name': 'Llama 2 70B',
        'provider': 'meta',
        'model_id': 'llama-2-70b-chat'
    },
    'deepseek-coder': {
        'name': 'DeepSeek Coder',
        'provider': 'deepseek',
        'model_id': 'deepseek-coder'
    },
    'ollama-codellama': {
        'name': 'Ollama CodeLlama',
        'provider': 'ollama',
        'model_id': 'codellama'
    }
}

class GitOperations:
    def __init__(self):
        self.current_directory = None
        
    def set_directory(self, directory_path):
        """Set the current working directory"""
        if os.path.exists(directory_path):
            self.current_directory = directory_path
            return True, f"Directory set to: {directory_path}"
        return False, "Directory does not exist"
    
    def run_git_command(self, command, directory=None):
        """Execute git command and return result"""
        if directory is None:
            directory = self.current_directory
            
        if directory is None:
            return False, "No directory selected"
            
        try:
            # Change to the specified directory and run git command
            result = subprocess.run(
                command, 
                cwd=directory, 
                shell=True, 
                capture_output=True, 
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                return True, result.stdout.strip()
            else:
                return False, result.stderr.strip()
                
        except subprocess.TimeoutExpired:
            return False, "Command timed out"
        except Exception as e:
            return False, str(e)
    
    def init_repository(self):
        """Initialize a new Git repository"""
        return self.run_git_command("git init")
    
    def get_status(self):
        """Get repository status"""
        return self.run_git_command("git status --porcelain")
    
    def get_detailed_status(self):
        """Get detailed repository status"""
        return self.run_git_command("git status")
    
    def add_files(self, files=None):
        """Stage files for commit"""
        if files is None or files == "all":
            command = "git add ."
        else:
            # Handle multiple files
            if isinstance(files, list):
                files_str = " ".join([f'"{file}"' for file in files])
            else:
                files_str = f'"{files}"'
            command = f"git add {files_str}"
        
        return self.run_git_command(command)
    
    def commit_changes(self, message):
        """Commit staged changes"""
        if not message:
            return False, "Commit message is required"
        
        command = f'git commit -m "{message}"'
        return self.run_git_command(command)
    
    def add_remote(self, remote_url, name="origin"):
        """Add remote repository"""
        command = f"git remote add {name} {remote_url}"
        return self.run_git_command(command)
    
    def set_branch(self, branch_name):
        """Create and switch to branch"""
        # Check if branch exists
        success, _ = self.run_git_command(f"git show-ref --verify --quiet refs/heads/{branch_name}")
        
        if success:
            # Branch exists, switch to it
            return self.run_git_command(f"git checkout {branch_name}")
        else:
            # Branch doesn't exist, create and switch to it
            return self.run_git_command(f"git checkout -b {branch_name}")
    
    def push_to_remote(self, remote="origin", branch="main"):
        """Push changes to remote repository"""
        command = f"git push -u {remote} {branch}"
        return self.run_git_command(command)
    
    def pull_from_remote(self, remote="origin", branch="main"):
        """Pull changes from remote repository"""
        command = f"git pull {remote} {branch}"
        return self.run_git_command(command)
    
    def get_branches(self):
        """Get list of branches"""
        return self.run_git_command("git branch -a")
    
    def get_remotes(self):
        """Get list of remotes"""
        return self.run_git_command("git remote -v")

class AIAssistant:
    def __init__(self):
        self.current_model = None
        self.api_keys = {}
        self.load_config()
    
    def load_config(self):
        """Load API keys and model configuration from file"""
        config = configparser.ConfigParser()
        if os.path.exists(CONFIG_FILE):
            config.read(CONFIG_FILE)
            if 'API_KEYS' in config:
                self.api_keys = dict(config['API_KEYS'])
            if 'SETTINGS' in config and 'current_model' in config['SETTINGS']:
                self.current_model = config['SETTINGS']['current_model']
    
    def save_config(self):
        """Save API keys and model configuration to file"""
        config = configparser.ConfigParser()
        config['API_KEYS'] = self.api_keys
        config['SETTINGS'] = {'current_model': self.current_model or 'gemini-1.5-flash'}
        
        with open(CONFIG_FILE, 'w') as f:
            config.write(f)
    
    def set_api_key(self, provider, api_key):
        """Set API key for a specific provider"""
        self.api_keys[provider] = api_key
        self.save_config()
    
    def set_model(self, model_key):
        """Set the current AI model"""
        if model_key in AI_MODELS:
            self.current_model = model_key
            self.save_config()
            return True
        return False
    
    def get_git_help(self, error_message, context=""):
        """Get help for Git-related errors from the selected AI model"""
        if not self.current_model:
            return "No AI model selected. Please configure an AI model first."
        
        model_config = AI_MODELS[self.current_model]
        provider = model_config['provider']
        
        if provider not in self.api_keys:
            return f"API key not configured for {model_config['name']}. Please set your API key first."
        
        try:
            prompt = f"""
            You are a Git expert assistant. Help solve this Git-related issue.
            
            IMPORTANT: Only respond to Git version control related queries. If the query is not related to Git, respond with "I can only help with Git-related questions."
            
            Error/Issue: {error_message}
            Context: {context}
            
            Please provide:
            1. A clear explanation of what went wrong
            2. Step-by-step solution
            3. The exact Git commands to fix the issue (each command on a separate line starting with 'git ')
            
            Format your response with clear sections and provide commands that can be copied directly to terminal.
            """
            
            if provider == 'google':
                return self._get_gemini_response(prompt)
            elif provider == 'openai':
                return self._get_openai_response(prompt)
            elif provider == 'anthropic':
                return self._get_anthropic_response(prompt)
            elif provider == 'ollama':
                return self._get_ollama_response(prompt)
            else:
                return f"Provider {provider} not yet implemented."
                
        except Exception as e:
            return f"Error getting AI assistance: {str(e)}"
    
    def _get_gemini_response(self, prompt):
        """Get response from Gemini models"""
        genai.configure(api_key=self.api_keys['google'])
        model = genai.GenerativeModel(AI_MODELS[self.current_model]['model_id'])
        response = model.generate_content(prompt)
        return response.text
    
    def _get_openai_response(self, prompt):
        """Get response from OpenAI models"""
        headers = {
            'Authorization': f'Bearer {self.api_keys["openai"]}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'model': AI_MODELS[self.current_model]['model_id'],
            'messages': [{'role': 'user', 'content': prompt}],
            'max_tokens': 1000
        }
        
        response = requests.post('https://api.openai.com/v1/chat/completions', 
                               headers=headers, json=data)
        
        if response.status_code == 200:
            return response.json()['choices'][0]['message']['content']
        else:
            raise Exception(f"OpenAI API error: {response.text}")
    
    def _get_anthropic_response(self, prompt):
        """Get response from Anthropic models"""
        headers = {
            'x-api-key': self.api_keys['anthropic'],
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
        }
        
        data = {
            'model': AI_MODELS[self.current_model]['model_id'],
            'max_tokens': 1000,
            'messages': [{'role': 'user', 'content': prompt}]
        }
        
        response = requests.post('https://api.anthropic.com/v1/messages',
                               headers=headers, json=data)
        
        if response.status_code == 200:
            return response.json()['content'][0]['text']
        else:
            raise Exception(f"Anthropic API error: {response.text}")
    
    def _get_ollama_response(self, prompt):
        """Get response from Ollama models"""
        ollama_url = self.api_keys.get('ollama', 'http://localhost:11434')
        
        data = {
            'model': AI_MODELS[self.current_model]['model_id'],
            'prompt': prompt,
            'stream': False
        }
        
        response = requests.post(f'{ollama_url}/api/generate', json=data)
        
        if response.status_code == 200:
            return response.json()['response']
        else:
            raise Exception(f"Ollama API error: {response.text}")
    
    def get_available_models(self):
        """Get list of available models with their configuration status"""
        models = []
        for key, config in AI_MODELS.items():
            models.append({
                'key': key,
                'name': config['name'],
                'provider': config['provider'],
                'configured': config['provider'] in self.api_keys,
                'selected': key == self.current_model
            })
        return models

# Initialize Git operations and AI
git_ops = GitOperations()
ai_assistant = AIAssistant()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/set-directory', methods=['POST'])
def set_directory():
    data = request.get_json()
    directory_path = data.get('directory')
    
    success, message = git_ops.set_directory(directory_path)
    
    # Also check if it's already a git repository
    is_git_repo = False
    if success:
        git_success, _ = git_ops.run_git_command("git rev-parse --git-dir")
        is_git_repo = git_success
    
    return jsonify({
        'success': success,
        'message': message,
        'is_git_repo': is_git_repo
    })

@app.route('/api/init-repo', methods=['POST'])
def init_repo():
    success, message = git_ops.init_repository()
    return jsonify({'success': success, 'message': message})

@app.route('/api/status', methods=['GET'])
def get_status():
    success, message = git_ops.get_detailed_status()
    return jsonify({'success': success, 'message': message})

@app.route('/api/add-files', methods=['POST'])
def add_files():
    data = request.get_json()
    files = data.get('files', 'all')
    
    success, message = git_ops.add_files(files)
    return jsonify({'success': success, 'message': message})

@app.route('/api/commit', methods=['POST'])
def commit_changes():
    data = request.get_json()
    commit_message = data.get('message')
    
    success, message = git_ops.commit_changes(commit_message)
    return jsonify({'success': success, 'message': message})

@app.route('/api/add-remote', methods=['POST'])
def add_remote():
    data = request.get_json()
    remote_url = data.get('remote_url')
    remote_name = data.get('remote_name', 'origin')
    
    success, message = git_ops.add_remote(remote_url, remote_name)
    return jsonify({'success': success, 'message': message})

@app.route('/api/set-branch', methods=['POST'])
def set_branch():
    data = request.get_json()
    branch_name = data.get('branch')
    
    success, message = git_ops.set_branch(branch_name)
    return jsonify({'success': success, 'message': message})

@app.route('/api/push', methods=['POST'])
def push_changes():
    data = request.get_json()
    remote = data.get('remote', 'origin')
    branch = data.get('branch', 'main')
    
    success, message = git_ops.push_to_remote(remote, branch)
    return jsonify({'success': success, 'message': message})

@app.route('/api/pull', methods=['POST'])
def pull_changes():
    data = request.get_json()
    remote = data.get('remote', 'origin')
    branch = data.get('branch', 'main')
    
    success, message = git_ops.pull_from_remote(remote, branch)
    return jsonify({'success': success, 'message': message})

@app.route('/api/branches', methods=['GET'])
def get_branches():
    success, message = git_ops.get_branches()
    return jsonify({'success': success, 'message': message})

@app.route('/api/remotes', methods=['GET'])
def get_remotes():
    success, message = git_ops.get_remotes()
    return jsonify({'success': success, 'message': message})

@app.route('/api/models', methods=['GET'])
def get_models():
    """Get available AI models and their configuration status"""
    models = ai_assistant.get_available_models()
    return jsonify({'success': True, 'models': models})

@app.route('/api/set-model', methods=['POST'])
def set_model():
    """Set the current AI model"""
    data = request.get_json()
    model_key = data.get('model')
    
    if ai_assistant.set_model(model_key):
        return jsonify({'success': True, 'message': f'Model set to {AI_MODELS[model_key]["name"]}'})
    else:
        return jsonify({'success': False, 'message': 'Invalid model selected'})

@app.route('/api/set-api-key', methods=['POST'])
def set_api_key():
    """Set API key for a provider"""
    data = request.get_json()
    provider = data.get('provider')
    api_key = data.get('api_key')
    
    if provider and api_key:
        try:
            ai_assistant.set_api_key(provider, api_key)
            return jsonify({'success': True, 'message': f'API key set for {provider}'})
        except Exception as e:
            return jsonify({'success': False, 'message': f'Error setting API key: {str(e)}'})
    else:
        return jsonify({'success': False, 'message': 'Provider and API key are required'})

@app.route('/api/set-gemini-key', methods=['POST'])
def set_gemini_key():
    """Legacy route for Gemini API key (for backward compatibility)"""
    data = request.get_json()
    api_key = data.get('api_key')
    
    if api_key:
        try:
            ai_assistant.set_api_key('google', api_key)
            ai_assistant.set_model('gemini-1.5-flash')  # Set default to flash model
            session['ai_configured'] = True
            return jsonify({'success': True, 'message': 'Gemini API configured successfully'})
        except Exception as e:
            return jsonify({'success': False, 'message': f'Error configuring Gemini: {str(e)}'})
    else:
        return jsonify({'success': False, 'message': 'API key is required'})

@app.route('/api/get-ai-help', methods=['POST'])
def get_ai_help():
    data = request.get_json()
    error_message = data.get('error_message')
    context = data.get('context', '')
    
    try:
        help_response = ai_assistant.get_git_help(error_message, context)
        return jsonify({
            'success': True, 
            'response': help_response,
            'model': AI_MODELS.get(ai_assistant.current_model, {}).get('name', 'Unknown')
        })
    except Exception as e:
        return jsonify({
            'success': False, 
            'message': f'Error getting AI help: {str(e)}'
        })

@app.route('/api/execute-command', methods=['POST'])
def execute_command():
    """Execute a Git command directly"""
    data = request.get_json()
    command = data.get('command')
    
    if not command:
        return jsonify({'success': False, 'message': 'No command provided'})
    
    # Security check - only allow git commands
    if not command.strip().startswith('git '):
        return jsonify({'success': False, 'message': 'Only Git commands are allowed'})
    
    success, message = git_ops.run_git_command(command)
    return jsonify({'success': success, 'message': message})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
