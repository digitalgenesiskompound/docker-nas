// editor.js

App.setupEditor = function() {
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.1/min/vs' }});
    require(['vs/editor/editor.main'], function() {
        App.editor = monaco.editor.create(document.getElementById('editor'), {
            value: '',
            language: 'plaintext',
            theme: 'vs-dark',
            automaticLayout: true
        });
    });
};

App.openEditor = function(filePath) {
    App.currentEditingFilePath = filePath;
    fetch(`/api/get_file_content?path=${encodeURIComponent(filePath)}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                return;
            }
            App.editor.setValue(data.content);
            App.showEditorModal(true);
            // Optionally, set language based on file extension
            const extension = App.getFileExtension(filePath);
            App.setEditorLanguage(extension);
        })
        .catch(error => {
            console.error('Error fetching file content:', error);
            alert('An error occurred while fetching the file content.');
        });
};

App.closeEditor = function() {
    App.showEditorModal(false);
    App.editor.setValue(''); // Clear editor content
    App.currentEditingFilePath = '';
};

App.showEditorModal = function(show) {
    const modal = document.getElementById('editor-modal');
    if (show) {
        modal.style.display = 'block';
    } else {
        modal.style.display = 'none';
    }
};

App.saveEditor = function() {
    const editedContent = App.editor.getValue();
    fetch('/api/save_file_content', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            path: App.currentEditingFilePath,
            content: editedContent
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            alert('File saved successfully.');
            App.closeEditor();
            App.loadDirectory(App.currentPath); // Refresh the directory view
        }
    })
    .catch(error => {
        console.error('Error saving file:', error);
        alert('An error occurred while saving the file.');
    });
};

App.setEditorLanguage = function(extension) {
    const languageMapping = {
        'js': 'javascript',
        'mjs': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescriptreact',
        'py': 'python',
        'pyw': 'python',
        'md': 'markdown',
        'html': 'html',
        'htm': 'html',
        'css': 'css',
        'scss': 'scss',
        'sass': 'scss',
        'json': 'json',
        'yaml': 'yaml',
        'yml': 'yaml',
        'dockerfile': 'dockerfile',
        'dockerignore': 'plaintext',
        'sh': 'shell',
        'bash': 'shell',
        'zsh': 'shell',
        'bat': 'bat',
        'cmd': 'bat',
        'ini': 'ini',
        'cfg': 'ini',
        'log': 'plaintext',
        'txt': 'plaintext',
        'env': 'dotenv',
        'java': 'java',
        'c': 'c',
        'h': 'cpp',
        'cpp': 'cpp',
        'hpp': 'cpp',
        'cs': 'csharp',
        'tsconfig': 'json',
        'package.json': 'json',
        'requirements.txt': 'plaintext',
        'pipfile': 'plaintext',
        'toml': 'toml',
        'lock': 'plaintext', // For lock files (e.g., package-lock.json, Pipfile.lock)
        'xml': 'xml',
        'svg': 'xml',
        'tsx': 'typescriptreact',
        'jsx': 'javascriptreact',
        // Add additional extensions as needed
    };
    const language = languageMapping[extension.toLowerCase()] || 'plaintext';
    monaco.editor.setModelLanguage(App.editor.getModel(), language);
};

