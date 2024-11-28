// modals.js

// Function to open the destination selection modal
App.openDestinationModal = function() {
    App.selectedDestinationPath = App.currentPath; // Initialize with current directory
    document.getElementById('destination-modal').style.display = 'block';
    App.loadDestinationFolders(App.selectedDestinationPath);
    App.updateDestinationBreadcrumb(App.selectedDestinationPath);
};

// Function to close the destination selection modal
App.closeDestinationModal = function() {
    document.getElementById('destination-modal').style.display = 'none';
    App.selectedDestinationPath = '';
};

// Function to load folders for destination selection
App.loadDestinationFolders = function(path) {
    fetch(`/api/list?path=${encodeURIComponent(path)}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                return;
            }
            const folderList = document.getElementById('destination-folder-list');
            folderList.innerHTML = '';

            // Add 'Root' as an option
            if (path !== '') {
                const rootItem = document.createElement('li');
                rootItem.className = 'file-list-item';
                rootItem.addEventListener('click', (e) => {
                    e.preventDefault();
                    App.selectedDestinationPath = '';
                    App.updateDestinationBreadcrumb(App.selectedDestinationPath);
                    App.loadDestinationFolders(App.selectedDestinationPath);
                });
                const rootLink = document.createElement('a');
                rootLink.href = '#';
                rootLink.className = 'file-link';
                rootLink.innerHTML = `<i class="bi bi-house-door-fill file-icon"></i> Root`;
                rootLink.setAttribute('data-path', '');
                rootLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    App.selectedDestinationPath = '';
                    App.updateDestinationBreadcrumb(App.selectedDestinationPath);
                    App.loadDestinationFolders(App.selectedDestinationPath);
                });

                rootItem.appendChild(rootLink);
                folderList.appendChild(rootItem);
            }

            // Add directories
            data.directories.forEach(directory => {
                const fullPath = path ? `${path}/${directory}`.replace(/\\/g, '/') : directory;
                const listItem = document.createElement('li');
                listItem.className = 'file-list-item';
                listItem.addEventListener('click', (e) => {
                    e.preventDefault();
                    App.selectedDestinationPath = fullPath;
                    App.updateDestinationBreadcrumb(App.selectedDestinationPath);
                    App.loadDestinationFolders(App.selectedDestinationPath);

                    // Highlight the selected folder
                    const allItems = document.querySelectorAll('#destination-folder-list .file-list-item');
                    allItems.forEach(item => {
                        item.style.backgroundColor = '#2c2c2c';
                    });
                    listItem.style.backgroundColor = '#555'; // Highlight color
                });
                const link = document.createElement('a');
                link.href = '#';
                link.className = 'file-link';
                link.innerHTML = `<i class="bi bi-folder-fill file-icon"></i> ${directory}`;
                link.setAttribute('data-path', fullPath);
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    App.selectedDestinationPath = fullPath;
                    App.updateDestinationBreadcrumb(App.selectedDestinationPath);
                    App.loadDestinationFolders(App.selectedDestinationPath);
                });

                listItem.appendChild(link);
                folderList.appendChild(listItem);
            });

            // If no directories, show a message
            if (data.directories.length === 0) {
                const message = document.createElement('li');
                message.textContent = 'No subfolders available.';
                message.style.color = '#b0b0b0';
                folderList.appendChild(message);
            }
        })
        .catch(error => {
            console.error('Error loading destination folders:', error);
            alert('An error occurred while loading destination folders.');
        });
};

// Function to update breadcrumb in destination modal
App.updateDestinationBreadcrumb = function(path) {
    const breadcrumbLinks = document.getElementById('destination-breadcrumb');
    breadcrumbLinks.innerHTML = ''; // Clear existing breadcrumb links

    const parts = path.split('/').filter(part => part !== '');
    let accumulatedPath = '';

    // Add Root
    const rootLink = document.createElement('a');
    rootLink.href = '#';
    rootLink.textContent = 'Root';
    rootLink.setAttribute('data-path', '');
    rootLink.addEventListener('click', (e) => {
        e.preventDefault();
        App.selectedDestinationPath = '';
        breadcrumbLinks.innerHTML = '';
        const separator = document.createTextNode(' / ');
        breadcrumbLinks.appendChild(rootLink);
        breadcrumbLinks.appendChild(separator);
        App.loadDestinationFolders('');
    });
    breadcrumbLinks.appendChild(rootLink);

    // Add separators and links
    parts.forEach((part, index) => {
        accumulatedPath += `${part}/`;
        const separator = document.createTextNode(' / ');
        breadcrumbLinks.appendChild(separator);

        const link = document.createElement('a');
        link.href = '#';
        link.textContent = part;
        link.setAttribute('data-path', accumulatedPath.slice(0, -1)); // Remove trailing slash
        link.addEventListener('click', (e) => {
            e.preventDefault();
            App.selectedDestinationPath = accumulatedPath.slice(0, -1);
            App.updateDestinationBreadcrumb(App.selectedDestinationPath);
            App.loadDestinationFolders(App.selectedDestinationPath);
        });
        breadcrumbLinks.appendChild(link);
    });
};

// Functions to open and close Add Folder Modal
App.openAddFolderModal = function() {
    document.getElementById('add-folder-modal').style.display = 'block';
};

App.closeAddFolderModal = function() {
    document.getElementById('add-folder-modal').style.display = 'none';
    document.getElementById('new-folder-name').value = '';
};

// Functions to submit Add Folder
App.submitAddFolder = function() {
    const folderName = document.getElementById('new-folder-name').value.trim();
    if (folderName === '') {
        alert('Folder name cannot be empty.');
        return;
    }

    App.showLoading(true);
    fetch('/create_folder', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': App.getCSRFToken() // Include CSRF token
        },
        body: JSON.stringify({
            path: App.currentPath,
            folder_name: folderName
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(`Error: ${data.error}`);
        } else {
            alert('Folder created successfully.');
            App.loadDirectory(App.currentPath);
            App.closeAddFolderModal();
        }
    })
    .catch(error => {
        console.error('Error creating folder:', error);
        alert('An error occurred while creating the folder.');
    })
    .finally(() => {
        App.showLoading(false);
    });
};

// Functions to open and close Add File Modal
App.openAddFileModal = function() {
    document.getElementById('add-file-modal').style.display = 'block';
};

App.closeAddFileModal = function() {
    document.getElementById('add-file-modal').style.display = 'none';
    document.getElementById('new-file-name').value = '';
};

// Functions to submit Add File
App.submitAddFile = function() {
    const fileName = document.getElementById('new-file-name').value.trim();
    if (fileName === '') {
        alert('File name cannot be empty.');
        return;
    }

    App.showLoading(true);
    fetch('/create_file', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': App.getCSRFToken() // Include CSRF token
        },
        body: JSON.stringify({
            path: App.currentPath,
            file_name: fileName
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(`Error: ${data.error}`);
        } else {
            alert('File created successfully.');
            App.loadDirectory(App.currentPath);
            App.closeAddFileModal();
        }
    })
    .catch(error => {
        console.error('Error creating file:', error);
        alert('An error occurred while creating the file.');
    })
    .finally(() => {
        App.showLoading(false);
    });
};

// Function to confirm and execute the move action
App.confirmMove = function() {
    // Allow empty destinationPath to represent root
    if (App.selectedDestinationPath === null || App.selectedDestinationPath === undefined) {
        alert('Please select a destination folder.');
        return;
    }

    // Confirm the move action
    if (!confirm(`Are you sure you want to move ${App.selectedItems.size} item(s) to "${App.selectedDestinationPath || 'Root'}"?`)) {
        return;
    }

    App.showLoading(true);

    fetch('/move_items', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': App.getCSRFToken() // Include CSRF token
        },
        body: JSON.stringify({
            source_paths: Array.from(App.selectedItems),
            destination_path: App.selectedDestinationPath // Can be empty string for root
        }),
    })
    .then(response => {
        if (response.status === 207) { // Multi-Status
            return response.json().then(data => {
                if (data.moved.length > 0) {
                    alert(`Successfully moved ${data.moved.length} item(s).`);
                }
                if (data.errors.length > 0) {
                    let errorMsg = 'Some items could not be moved:\n';
                    data.errors.forEach(err => {
                        errorMsg += `- ${err.path}: ${err.error}\n`;
                    });
                    alert(errorMsg);
                }
                App.loadDirectory(App.currentPath); // Refresh the directory view
                App.closeDestinationModal();
                App.selectedItems.clear();
                App.updateSelectedItemsPanel();
            });
        } else if (!response.ok) {
            return response.json().then(data => { throw data; });
        } else {
            return response.json().then(data => {
                alert(data.message);
                App.loadDirectory(App.currentPath); // Refresh the directory view
                App.closeDestinationModal();
                App.selectedItems.clear();
                App.updateSelectedItemsPanel();
            });
        }
    })
    .catch(error => {
        console.error('Error moving items:', error);
        alert(error.error || 'An error occurred while moving the items.');
    })
    .finally(() => {
        App.showLoading(false);
    });
};
