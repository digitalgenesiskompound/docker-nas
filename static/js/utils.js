// utils.js

// Utility Functions
App.generateUniqueId = function() {
    return 'xxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
};

App.formatSize = function(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
};

App.formatDate = function(timestamp) {
    const date = new Date(timestamp * 1000); // Convert Unix timestamp to milliseconds
    return date.toLocaleString();
};

App.getFileExtension = function(path) {
    return path.split('.').pop().toLowerCase();
};

App.getDirectoryName = function(path) {
    const parts = path.split('/');
    return parts[parts.length - 1];
};

// Show or Hide Loading Spinner
App.showLoading = function(show) {
    const loadingOverlay = document.getElementById('loading');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    } else {
        console.warn('Loading overlay element (#loading) not found.');
    }
};

// Update Progress Bar
App.updateProgressBar = function(id, percentComplete) {
    const progressBar = document.getElementById(`progress-bar-${id}`);
    const progressText = document.getElementById(`progress-text-${id}`);
    if (progressBar && progressText) {
        progressBar.style.width = `${percentComplete}%`;
        progressText.textContent = `${percentComplete}%`;
    }
};
