window.App = window.App || {};

Object.assign(App, {
    currentPath: '',
    allDirectories: [],
    allFiles: [],
    currentSort: 'name_asc',
    currentSearch: '',
    isGlobalSearch: false,
    selectedItems: new Set(),
    navigationHistory: [],
    editor: null,
    currentEditingFilePath: '',
    selectedDestinationPath: '',

    activeUploadXHRs: {},
    activeDownloadXHRs: {},
});

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
            App.showToast('No previous directory.');
        }
    });

    homeButton.addEventListener('click', () => {
        if (App.currentPath !== '') {
            App.navigationHistory.push(App.currentPath);
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

    hamburgerMenu.addEventListener('click', function(event) {
        event.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });

    document.addEventListener('click', function(event) {
        if (!hamburgerMenu.contains(event.target)) {
            dropdownMenu.classList.remove('show');
        }
    });
};
