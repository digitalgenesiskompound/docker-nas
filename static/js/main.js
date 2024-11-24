// main.js

// Define the global App namespace
window.App = {
    currentPath: '',
    allDirectories: [],
    allFiles: [],
    currentSort: 'name_asc',
    currentSearch: '',
    isGlobalSearch: false, // Toggle between current directory and global search
    selectedItems: new Set(), // To store selected item paths
    navigationHistory: [], // To manage back navigation
    editor: null, // Monaco Editor instance
    currentEditingFilePath: '', // Currently editing file path
    selectedDestinationPath: '', // To store the selected destination path

    activeUploadXHRs: {}, // Object to store active upload XHRs with unique IDs
    activeDownloadXHRs: {}, // Object to store active download XHRs with unique IDs
};

// Initialize the application once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    App.loadDirectory('');
    App.loadSidebar();
    App.setupSelectedItemsPanel();
    App.setupNavigationButtons();
    App.setupEditor();
    App.setupProgressTray();
});

App.setupNavigationButtons = function() {
    const backButton = document.getElementById('back-button');
    const homeButton = document.getElementById('home-button');

    backButton.addEventListener('click', () => {
        if (App.navigationHistory.length > 0) {
            const previousPath = App.navigationHistory.pop();
            App.loadDirectory(previousPath);
        } else {
            alert('No previous directory.');
        }
    });

    homeButton.addEventListener('click', () => {
        if (App.currentPath !== '') {
            App.navigationHistory.push(App.currentPath); // Push current path to history before navigating
            App.loadDirectory('');
        }
    });
};
