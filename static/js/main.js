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
    App.setupSelectedItemsPanel();
    App.setupNavigationButtons();
    App.setupEditor();
    App.setupProgressTray();
    App.setupHamburgerMenu();
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

App.setupHamburgerMenu = function() {
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const dropdownMenu = document.getElementById('hamburger-dropdown');

    console.log('hamburgerMenu:', hamburgerMenu);
    console.log('dropdownMenu:', dropdownMenu);

    if (!hamburgerMenu) {
        console.error("Hamburger menu element not found.");
        return;
    }
    if (!dropdownMenu) {
        console.error("Dropdown menu element not found.");
        return;
    }

    // Toggle the dropdown menu when hamburger menu is clicked
    hamburgerMenu.addEventListener('click', function(event) {
        event.stopPropagation(); // Prevent event from bubbling up
        dropdownMenu.classList.toggle('show'); // Toggle 'show' class
    });

    // Close the dropdown if clicking outside of it
    document.addEventListener('click', function(event) {
        if (!hamburgerMenu.contains(event.target)) {
            dropdownMenu.classList.remove('show');
        }
    });
};