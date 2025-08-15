# Git GUI Web Application

A comprehensive Flask web application that provides a user-friendly GUI for Git version control operations with AI-powered error assistance using Google's Gemini AI.

## Features

### Core Git Operations
- **Directory Management**: Select and validate Git repositories
- **Repository Initialization**: Initialize new Git repositories
- **File Operations**: Stage files and commit changes
- **Remote Repository Management**: Add GitHub repositories, set branches (main/master)
- **Sync Operations**: Push and pull changes to/from remote repositories
- **Real-time Status**: Monitor repository status and operation results

### AI Integration
- **Error Assistance**: Automatic error handling with Gemini AI
- **Git-focused Help**: AI responses limited to Git-related queries only
- **Interactive Solutions**: Copy AI responses or execute suggested commands directly
- **Smart Command Extraction**: Automatically identify and execute Git commands from AI responses

### User Interface
- **Clean Design**: Modern, responsive web interface
- **Real-time Updates**: Live status feedback and operation logs
- **Interactive Controls**: Easy-to-use buttons and forms
- **Error Handling**: Comprehensive error display and management
- **Mobile Friendly**: Responsive design for various screen sizes

## Installation

1. **Clone or download this repository**:
   ```bash
   git clone <repository-url>
   cd GitFr
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Get your Gemini API key**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Keep it handy for configuration

## Usage

1. **Start the Flask application**:
   ```bash
   python app.py
   ```

2. **Open your web browser** and navigate to:
   ```
   http://localhost:5000
   ```

3. **Configure Gemini AI** (optional but recommended):
   - Click the "Configure AI" button in the header
   - Enter your Gemini API key
   - Save the configuration

4. **Begin Git operations**:
   - Enter a directory path in the "Directory Selection" section
   - Click "Set Directory" to validate the path
   - Use the various sections to perform Git operations

## Detailed Usage Guide

### Directory Setup
1. Enter the full path to your project directory
2. The system will check if it's already a Git repository
3. If not initialized, use the "Initialize Repository" button

### File Operations
1. **Stage Files**: Leave empty to stage all files, or specify particular files
2. **Commit Changes**: Enter a descriptive commit message and commit staged files

### Remote Repository
1. **Add Remote**: Enter your GitHub repository URL (e.g., `https://github.com/username/repo.git`)
2. **Set Branch**: Choose between "main" or "master" branch
3. **Sync**: Use Push/Pull buttons to synchronize with remote repository

### AI Error Assistance
When Git operations fail:
1. Errors are automatically sent to Gemini AI
2. AI provides Git-specific troubleshooting advice
3. You can copy the response or execute suggested commands directly
4. AI responses are filtered to only include Git-related help

## Project Structure

```
GitFr/
├── app.py                 # Flask application with Git operations and AI integration
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── static/
│   ├── css/
│   │   └── style.css     # Modern, responsive styling
│   └── js/
│       └── script.js     # Frontend logic and API interactions
└── templates/
    └── index.html        # Main web interface
```

## API Endpoints

- `POST /api/set-directory` - Set working directory
- `POST /api/init-repo` - Initialize Git repository
- `GET /api/status` - Get repository status
- `POST /api/add-files` - Stage files for commit
- `POST /api/commit` - Commit staged changes
- `POST /api/add-remote` - Add remote repository
- `POST /api/set-branch` - Create/switch to branch
- `POST /api/push` - Push changes to remote
- `POST /api/pull` - Pull changes from remote
- `POST /api/set-gemini-key` - Configure Gemini AI
- `POST /api/get-ai-help` - Get AI assistance for errors
- `POST /api/execute-command` - Execute Git commands directly

## Security Features

- **Command Validation**: Only Git commands are allowed for execution
- **Input Sanitization**: All user inputs are properly validated
- **API Key Security**: Gemini API keys are handled securely
- **Error Boundaries**: Comprehensive error handling prevents crashes

## Troubleshooting

### Common Issues

1. **"Directory does not exist"**:
   - Verify the directory path exists
   - Use absolute paths (e.g., `C:\Users\YourName\Projects\MyRepo`)

2. **"Git command not found"**:
   - Ensure Git is installed on your system
   - Add Git to your system PATH

3. **Remote repository errors**:
   - Verify the GitHub URL is correct
   - Check your Git credentials
   - Ensure you have push permissions to the repository

4. **Gemini AI not working**:
   - Verify your API key is correct
   - Check your internet connection
   - Ensure the API key has proper permissions

### Getting Help

1. Use the built-in AI assistant for Git-related issues
2. Check the real-time output display for detailed error messages
3. Refer to Git documentation for specific command help

## Contributing

Feel free to contribute to this project by:
- Reporting bugs
- Suggesting new features
- Submitting pull requests
- Improving documentation

## License

This project is open source and available under the MIT License.

## Acknowledgments

- **Flask**: Web framework for Python
- **Google Gemini AI**: AI-powered error assistance
- **Font Awesome**: Icons for the interface
- **Git**: Version control system
