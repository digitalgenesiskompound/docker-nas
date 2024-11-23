// scripts.js

let currentPath = '';
let allDirectories = [];
let allFiles = [];
let currentSort = 'name_asc';
let currentSearch = '';
let isGlobalSearch = false; // Toggle between current directory and global search
let selectedItems = new Set(); // To store selected item paths
let navigationHistory = []; // To manage back navigation
let editor; // Monaco Editor instance
let currentEditingFilePath = ''; // Currently editing file path
let selectedDestinationPath = ''; // To store the selected destination path

let activeUploadXHRs = {}; // Object to store active upload XHRs with unique IDs
let activeDownloadXHRs = {}; // Object to store active download XHRs with unique IDs

document.addEventListener('DOMContentLoaded', () => {
    loadDirectory('');
    loadSidebar();
    setupSelectedItemsPanel();
    setupNavigationButtons();
    setupEditor();
    setupProgressTray();
});

// Function to open the destination selection modal
function openDestinationModal() {
    selectedDestinationPath = currentPath; // Initialize with current directory
    document.getElementById('destination-modal').style.display = 'block';
    loadDestinationFolders(selectedDestinationPath);
    updateDestinationBreadcrumb(selectedDestinationPath);
}

// Function to close the destination selection modal
function closeDestinationModal() {
    document.getElementById('destination-modal').style.display = 'none';
    selectedDestinationPath = '';
}

// Function to load folders for destination selection
function loadDestinationFolders(path) {
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
                    selectedDestinationPath = '';
                    updateDestinationBreadcrumb(selectedDestinationPath);
                    loadDestinationFolders(selectedDestinationPath);
                });
                const rootLink = document.createElement('a');
                rootLink.href = '#';
                rootLink.className = 'file-link';
                rootLink.innerHTML = `<i class="bi bi-house-door-fill file-icon"></i> Root`;
                rootLink.setAttribute('data-path', '');
                rootLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    selectedDestinationPath = '';
                    updateDestinationBreadcrumb(selectedDestinationPath);
                    loadDestinationFolders(selectedDestinationPath);
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
                    selectedDestinationPath = fullPath;
                    updateDestinationBreadcrumb(selectedDestinationPath);
                    loadDestinationFolders(selectedDestinationPath);

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
                    selectedDestinationPath = fullPath;
                    updateDestinationBreadcrumb(selectedDestinationPath);
                    loadDestinationFolders(selectedDestinationPath);
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
}

// Function to update breadcrumb in destination modal
function updateDestinationBreadcrumb(path) {
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
        selectedDestinationPath = '';
        breadcrumbLinks.innerHTML = '';
        const separator = document.createTextNode(' / ');
        breadcrumbLinks.appendChild(rootLink);
        breadcrumbLinks.appendChild(separator);
        loadDestinationFolders('');
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
            selectedDestinationPath = accumulatedPath.slice(0, -1);
            updateDestinationBreadcrumb(selectedDestinationPath);
            loadDestinationFolders(selectedDestinationPath);
        });
        breadcrumbLinks.appendChild(link);
    });
}

// Functions to open and close Add Folder Modal
function openAddFolderModal() {
    document.getElementById('add-folder-modal').style.display = 'block';
}

function closeAddFolderModal() {
    document.getElementById('add-folder-modal').style.display = 'none';
    document.getElementById('new-folder-name').value = '';
}

// Functions to submit Add Folder
function submitAddFolder() {
    const folderName = document.getElementById('new-folder-name').value.trim();
    if (folderName === '') {
        alert('Folder name cannot be empty.');
        return;
    }

    showLoading(true);
    fetch('/create_folder', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            path: currentPath,
            folder_name: folderName
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(`Error: ${data.error}`);
        } else {
            alert('Folder created successfully.');
            loadDirectory(currentPath);
            closeAddFolderModal();
        }
    })
    .catch(error => {
        console.error('Error creating folder:', error);
        alert('An error occurred while creating the folder.');
    })
    .finally(() => {
        showLoading(false);
    });
}

// Functions to open and close Add File Modal
function openAddFileModal() {
    document.getElementById('add-file-modal').style.display = 'block';
}

function closeAddFileModal() {
    document.getElementById('add-file-modal').style.display = 'none';
    document.getElementById('new-file-name').value = '';
}

// Functions to submit Add File
function submitAddFile() {
    const fileName = document.getElementById('new-file-name').value.trim();
    if (fileName === '') {
        alert('File name cannot be empty.');
        return;
    }

    showLoading(true);
    fetch('/create_file', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            path: currentPath,
            file_name: fileName
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(`Error: ${data.error}`);
        } else {
            alert('File created successfully.');
            loadDirectory(currentPath);
            closeAddFileModal();
        }
    })
    .catch(error => {
        console.error('Error creating file:', error);
        alert('An error occurred while creating the file.');
    })
    .finally(() => {
        showLoading(false);
    });
}

// Function to confirm and execute the move action
function confirmMove() {
    // Allow empty destinationPath to represent root
    if (selectedDestinationPath === null || selectedDestinationPath === undefined) {
        alert('Please select a destination folder.');
        return;
    }

    // Confirm the move action
    if (!confirm(`Are you sure you want to move ${selectedItems.size} item(s) to "${selectedDestinationPath || 'Root'}"?`)) {
        return;
    }

    showLoading(true);

    fetch('/move_items', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            source_paths: Array.from(selectedItems),
            destination_path: selectedDestinationPath // Can be empty string for root
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
                loadDirectory(currentPath); // Refresh the directory view
                closeDestinationModal();
                selectedItems.clear();
                updateSelectedItemsPanel();
            });
        } else if (!response.ok) {
            return response.json().then(data => { throw data; });
        } else {
            return response.json().then(data => {
                alert(data.message);
                loadDirectory(currentPath); // Refresh the directory view
                closeDestinationModal();
                selectedItems.clear();
                updateSelectedItemsPanel();
            });
        }
    })
    .catch(error => {
        console.error('Error moving items:', error);
        alert(error.error || 'An error occurred while moving the items.');
    })
    .finally(() => {
        showLoading(false);
    });
}

// Function to setup the Selected Items Side Panel
function setupSelectedItemsPanel() {
    const selectedItemsList = document.getElementById('selected-items-list');
    const fileListForm = document.getElementById('file-list-form');

    // Toggle the side panel visibility
    fileListForm.addEventListener('change', (e) => {
        if (e.target.classList.contains('file-checkbox')) {
            const path = e.target.value;
            if (e.target.checked) {
                selectedItems.add(path);
            } else {
                selectedItems.delete(path);
            }
            updateSelectedItemsPanel();
        }
    });

    // Allow clicking on selected items to deselect them
    selectedItemsList.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
            const path = e.target.getAttribute('data-path');
            selectedItems.delete(path);
            // Uncheck the corresponding checkbox
            const checkbox = document.querySelector(`.file-checkbox[value="${path}"]`);
            if (checkbox) {
                checkbox.checked = false;
            }
            updateSelectedItemsPanel();
        }
    });
}

// Function to update the Selected Items Side Panel
function updateSelectedItemsPanel() {
    const selectedItemsList = document.getElementById('selected-items-list');
    selectedItemsList.innerHTML = '';

    selectedItems.forEach(path => {
        const listItem = document.createElement('li');
        listItem.textContent = path;
        listItem.setAttribute('data-path', path);
        selectedItemsList.appendChild(listItem);
    });

    // Show or hide the side panel based on selections
    const sidePanel = document.getElementById('selected-items-panel');
    if (selectedItems.size > 0) {
        sidePanel.style.display = 'block';
    } else {
        sidePanel.style.display = 'none';
    }

    // Update "Select All" checkbox state
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    if (selectAllCheckbox) {
        const totalItems = document.querySelectorAll('.file-checkbox').length;
        const checkedItems = document.querySelectorAll('.file-checkbox:checked').length;
        selectAllCheckbox.checked = totalItems > 0 && checkedItems === totalItems;
    }
}

// Function to close the Selected Items Side Panel
function closeSelectedItemsPanel() {
    selectedItems.clear();
    updateSelectedItemsPanel();
    // Uncheck all checkboxes
    const checkboxes = document.querySelectorAll('.file-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
}

// Existing performAction function
function performAction(action) {
    if (selectedItems.size === 0) {
        alert('No items selected.');
        return;
    }

    const paths = Array.from(selectedItems);
    if (action === 'download') {
        downloadItems(paths);
    } else if (action === 'delete') {
        deleteItems(paths);
    } else if (action === 'edit') {
        editSelectedItem(paths);
    } else if (action === 'move') { // Updated Move Action
        openDestinationModal(); // Open the destination selection modal
    }
}

// Function to edit selected item
function editSelectedItem(paths) {
    if (paths.length !== 1) {
        alert('Please select exactly one file to edit.');
        return;
    }

    const path = paths[0];
    // Check if the selected path is a file
    const selectedFile = allFiles.find(file => file.path === path);
    if (!selectedFile) {
        alert('Selected item is not a file or does not exist.');
        return;
    }

    openEditor(path);
}

// Function to download selected items with progress and cancellation
function downloadItems(paths) {
    if (paths.length === 1 && !allDirectories.includes(paths[0])) {
        // Single file download
        downloadSingleFile(paths[0]);
    } else {
        // Multiple files or directories download as ZIP
        downloadMultipleItems(paths);
    }
}

// Function to download a single file with progress and cancellation
function downloadSingleFile(path) {
    const id = generateUniqueId();
    addProgressBar(id, 'download', path.split('/').pop());

    const xhr = new XMLHttpRequest();
    activeDownloadXHRs[id] = xhr; // Store XHR with unique ID for cancellation
    xhr.open('POST', '/download_selected', true);
    xhr.responseType = 'blob';

    // Set the request header to indicate JSON payload
    xhr.setRequestHeader('Content-Type', 'application/json');

    // Track download progress
    xhr.onprogress = function(event) {
        if (event.lengthComputable) {
            const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
            updateProgressBar(id, percentComplete);
        }
    };

    xhr.onload = function() {
        if (xhr.status === 200 || xhr.status === 207) { // 207 for multi-status responses
            const disposition = xhr.getResponseHeader('Content-Disposition');
            let filename = 'downloaded_file';
            if (disposition && disposition.indexOf('filename=') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) { 
                    filename = matches[1].replace(/['"]/g, '');
                }
            }
            const blob = xhr.response;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            alert('Download completed successfully.');
            loadDirectory(currentPath); // Refresh the directory view
        } else {
            try {
                const response = JSON.parse(xhr.responseText);
                alert(response.error || 'An error occurred during download.');
            } catch (e) {
                alert('An error occurred during download.');
            }
        }
        removeProgressBar(id);
        delete activeDownloadXHRs[id];
    };

    xhr.onerror = function() {
        alert('An error occurred during the download.');
        removeProgressBar(id);
        delete activeDownloadXHRs[id];
    };

    xhr.onabort = function() {
        alert('Download has been canceled.');
        removeProgressBar(id);
        delete activeDownloadXHRs[id];
    };

    // Send the selected_paths as JSON in the body
    xhr.send(JSON.stringify({ selected_paths: [path] }));
}


// Function to download multiple items as a ZIP with progress and cancellation
function downloadMultipleItems(paths) {
    const id = generateUniqueId();
    addProgressBar(id, 'download', 'Selected Items');

    const xhr = new XMLHttpRequest();
    activeDownloadXHRs[id] = xhr; // Store XHR with unique ID for cancellation
    xhr.open('POST', '/download_selected', true);
    xhr.responseType = 'blob';

    // Set the request header to indicate JSON payload
    xhr.setRequestHeader('Content-Type', 'application/json');

    // Track download progress
    xhr.onprogress = function(event) {
        if (event.lengthComputable) {
            const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
            updateProgressBar(id, percentComplete);
        }
    };

    xhr.onload = function() {
        if (xhr.status === 200 || xhr.status === 207) { // 207 for multi-status responses
            const disposition = xhr.getResponseHeader('Content-Disposition');
            let filename = 'download.zip';
            if (disposition && disposition.indexOf('filename=') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) { 
                    filename = matches[1].replace(/['"]/g, '');
                }
            }
            const blob = xhr.response;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            alert('Download completed successfully.');
            loadDirectory(currentPath); // Refresh the directory view
        } else {
            try {
                const response = JSON.parse(xhr.responseText);
                alert(response.error || 'An error occurred during download.');
            } catch (e) {
                alert('An error occurred during download.');
            }
        }
        removeProgressBar(id);
        delete activeDownloadXHRs[id];
    };

    xhr.onerror = function() {
        alert('An error occurred during the download.');
        removeProgressBar(id);
        delete activeDownloadXHRs[id];
    };

    xhr.onabort = function() {
        alert('Download has been canceled.');
        removeProgressBar(id);
        delete activeDownloadXHRs[id];
    };

    // Send the selected_paths as JSON in the body
    xhr.send(JSON.stringify({ selected_paths: paths }));
}


// Function to delete items
function deleteItems(paths) {
    if (!confirm(`Are you sure you want to delete ${paths.length} item(s)? This action cannot be undone.`)) {
        return;
    }

    showLoading(true);
    fetch('/delete', {  // Ensure this endpoint matches the backend route
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: paths }), // Send array
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => { throw data; });
        }
        return response.json();
    })
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            if (data.errors && data.errors.length > 0) {
                let message = 'Some items were not deleted:\n';
                data.errors.forEach(err => {
                    message += `- ${err.path}: ${err.error}\n`;
                });
                alert(message);
            } else {
                alert('Items deleted successfully.');
            }
            selectedItems.clear();
            updateSelectedItemsPanel();
            loadDirectory(currentPath); // Refresh the directory view
        }
        showLoading(false);
    })
    .catch(error => {
        console.error('Error deleting items:', error);
        alert(error.error || 'An error occurred while deleting the items.');
        showLoading(false);
    });
}

// Function to load directory contents
function loadDirectory(path) {
    currentPath = path;
    isGlobalSearch = false; // Reset to current directory search
    document.getElementById('search-bar').value = ''; // Clear search bar
    showLoading(true);
    fetch(`/api/list?path=${encodeURIComponent(path)}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                showLoading(false);
                return;
            }
            allDirectories = data.directories.map(dir => {
                // Construct relative path
                return path ? `${path}/${dir}`.replace(/\\/g, '/') : dir;
            });
            allFiles = data.files;
            updateBreadcrumb(data.breadcrumb);
            applyFilters();
            showLoading(false);
        })
        .catch(error => {
            console.error('Error fetching directory:', error);
            alert('An error occurred while loading the directory.');
            showLoading(false);
        });
}

// Function to load sidebar navigation
function loadSidebar() {
    fetch('/api/list?path=')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Error loading sidebar:', data.error);
                return;
            }
            const sidebarList = document.getElementById('sidebar-list');
            sidebarList.innerHTML = '';
            data.directories.forEach(directory => {
                const fullPath = directory; // Relative path
                const listItem = document.createElement('li');
                const link = document.createElement('a');
                link.href = '#';
                link.textContent = directory.split('/').pop(); // Display only the directory name
                link.setAttribute('data-path', fullPath);
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const newPath = fullPath;
                    navigationHistory.push(currentPath); // Push current path to history before navigating
                    loadDirectory(newPath);
                });
                listItem.appendChild(link);
                sidebarList.appendChild(listItem);
            });
        })
        .catch(error => {
            console.error('Error loading sidebar:', error);
        });
}

// Function to setup the Progress Tray
function setupProgressTray() {
    const toggleButton = document.getElementById('toggle-progress-tray');
    const progressList = document.getElementById('progress-list');

    toggleButton.addEventListener('click', () => {
        if (progressList.style.display === 'none' || progressList.style.display === '') {
            progressList.style.display = 'block';
            toggleButton.innerHTML = '<i class="bi bi-chevron-down"></i> Progress';
        } else {
            progressList.style.display = 'none';
            toggleButton.innerHTML = '<i class="bi bi-chevron-up"></i> Progress';
        }
    });
}

// Function to add a new progress bar
function addProgressBar(id, type, name) {
    const progressTray = document.getElementById('progress-tray');
    const progressList = document.getElementById('progress-list');

    // Always show the progress-tray when adding a new progress bar
    progressTray.style.display = 'block';
    progressList.style.display = 'block'; // Ensure the list is visible
    document.getElementById('toggle-progress-tray').innerHTML = '<i class="bi bi-chevron-down"></i> Progress';

    const progressItem = document.createElement('div');
    progressItem.className = 'progress-item';
    progressItem.id = `progress-${id}`;

    const label = document.createElement('span');
    label.className = 'progress-label';
    label.textContent = `${type.toUpperCase()}: ${name}`;

    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';

    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.id = `progress-bar-${id}`;

    const progressText = document.createElement('span');
    progressText.className = 'progress-text';
    progressText.id = `progress-text-${id}`;
    progressText.textContent = '0%';

    progressContainer.appendChild(progressBar);
    progressContainer.appendChild(progressText);

    const cancelButton = document.createElement('button');
    cancelButton.className = 'cancel-button';
    cancelButton.textContent = 'Cancel';
    cancelButton.onclick = () => cancelOperation(id, type);

    progressItem.appendChild(label);
    progressItem.appendChild(progressContainer);
    progressItem.appendChild(cancelButton);

    progressList.appendChild(progressItem);
}


// Function to remove a progress bar
function removeProgressBar(id) {
    const progressItem = document.getElementById(`progress-${id}`);
    if (progressItem) {
        progressItem.remove();
    }

    // If no more progress-items, hide the progress-tray
    const progressList = document.getElementById('progress-list');
    if (progressList.children.length === 0) {
        const progressTray = document.getElementById('progress-tray');
        progressTray.style.display = 'none';
    }
}

// Function to update breadcrumb navigation
function updateBreadcrumb(breadcrumb) {
    const breadcrumbLinks = document.getElementById('breadcrumb-links');
    breadcrumbLinks.innerHTML = ''; // Clear existing breadcrumb links

    breadcrumb.forEach((crumb, index) => {
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = crumb.name;
        link.setAttribute('data-path', crumb.path);
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const newPath = crumb.path;
            navigationHistory.push(currentPath); // Push current path to history before navigating
            loadDirectory(newPath);
        });
        breadcrumbLinks.appendChild(link);
        if (index < breadcrumb.length - 1) {
            const separator = document.createTextNode(' / ');
            breadcrumbLinks.appendChild(separator);
        }
    });
}

// Function to apply filters based on search and sort
function applyFilters() {
    if (isGlobalSearch && currentSearch.trim() !== '') {
        // Use the global search results directly without performing another search
        updateFileList(allDirectories, allFiles);
        return;
    }

    let filteredDirectories = allDirectories.filter(dir => dir.toLowerCase().includes(currentSearch.toLowerCase()));
    let filteredFiles = allFiles.filter(file => file.name.toLowerCase().includes(currentSearch.toLowerCase()));

    // Sort directories and files based on currentSort
    filteredDirectories = sortArray(filteredDirectories, currentSort, 'directory');
    filteredFiles = sortArray(filteredFiles, currentSort, 'file');

    updateFileList(filteredDirectories, filteredFiles);
}

// Sorting function
function sortArray(arr, sortType, type='directory') {
    let sortedArr = [...arr]; // Clone the array to avoid in-place sorting
    if (type === 'directory') {
        // Directories can be sorted by name or date
        if (sortType.startsWith('name')) {
            sortedArr.sort((a, b) => {
                if (a.toLowerCase() < b.toLowerCase()) return sortType === 'name_asc' ? -1 : 1;
                if (a.toLowerCase() > b.toLowerCase()) return sortType === 'name_asc' ? 1 : -1;
                return 0;
            });
        } else if (sortType.startsWith('date')) {
            // Assuming directories have a 'lastModified' attribute (if not, you might need to modify the backend)
            // For simplicity, we'll sort directories by name if date is not available
            sortedArr.sort((a, b) => {
                // Placeholder: directories don't have 'lastModified', so sort by name
                if (a.toLowerCase() < b.toLowerCase()) return sortType === 'date_asc' ? -1 : 1;
                if (a.toLowerCase() > b.toLowerCase()) return sortType === 'date_asc' ? 1 : -1;
                return 0;
            });
        }
        // Add more sorting types for directories if needed
    } else if (type === 'file') {
        if (sortType.startsWith('name')) {
            sortedArr.sort((a, b) => {
                if (a.name.toLowerCase() < b.name.toLowerCase()) return sortType === 'name_asc' ? -1 : 1;
                if (a.name.toLowerCase() > b.name.toLowerCase()) return sortType === 'name_asc' ? 1 : -1;
                return 0;
            });
        } else if (sortType.startsWith('date')) {
            sortedArr.sort((a, b) => {
                let aDate = new Date(a.lastModified * 1000); // Assuming lastModified is a Unix timestamp in seconds
                let bDate = new Date(b.lastModified * 1000);
                if (aDate < bDate) return sortType === 'date_asc' ? -1 : 1;
                if (aDate > bDate) return sortType === 'date_asc' ? 1 : -1;
                return 0;
            });
        } else if (sortType.startsWith('size')) {
            sortedArr.sort((a, b) => {
                if (a.size < b.size) return sortType === 'size_asc' ? -1 : 1;
                if (a.size > b.size) return sortType === 'size_asc' ? 1 : -1;
                return 0;
            });
        }
    }
    return sortedArr;
}

// Function to update the file and directory list
function updateFileList(directories, files) {
    const fileList = document.getElementById('file-list');
    fileList.innerHTML = ''; // Clear existing list

    // Add "Select All" checkbox
    const selectAllItem = document.createElement('li');
    selectAllItem.className = 'file-list-item select-all-item';

    const selectAllCheckbox = document.createElement('input');
    selectAllCheckbox.type = 'checkbox';
    selectAllCheckbox.id = 'select-all-checkbox';
    selectAllCheckbox.className = 'select-all-checkbox';
    selectAllCheckbox.addEventListener('change', toggleSelectAll);

    selectAllItem.appendChild(selectAllCheckbox);
    fileList.appendChild(selectAllItem);

    // Add directories
    directories.forEach(directory => {
        const listItem = document.createElement('li');
        listItem.className = 'file-list-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'selected_paths';
        checkbox.value = directory; // Use the full relative path
        checkbox.className = 'file-checkbox';
        if (selectedItems.has(directory)) {
            checkbox.checked = true;
        }

        const link = document.createElement('a');
        link.href = '#';
        link.className = 'file-link';
        link.innerHTML = `<i class="bi bi-folder-fill file-icon"></i> ${getDirectoryName(directory)}`; // Display only the directory name
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const newPath = directory; // Use the full path directly
            navigationHistory.push(currentPath); // Push current path to history before navigating
            loadDirectory(newPath);
        });

        // File details (e.g., Folder)
        const details = document.createElement('div');
        details.className = 'file-details';
        details.textContent = 'Folder';

        listItem.appendChild(checkbox);
        listItem.appendChild(link);
        listItem.appendChild(details);
        fileList.appendChild(listItem);
    });

    // Add files
    files.forEach(file => {
        const listItem = document.createElement('li');
        listItem.className = 'file-list-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'selected_paths';
        checkbox.value = file.path; // Use the full path provided by the backend
        checkbox.className = 'file-checkbox';
        if (selectedItems.has(file.path)) {
            checkbox.checked = true;
        }

        const span = document.createElement('span');
        span.className = 'file-link';
        span.innerHTML = `<i class="bi bi-file-earmark-fill file-icon"></i> ${file.name}`;
        span.addEventListener('click', () => {
            // Optionally, implement file preview or download
        });

        // File details (e.g., size and last modified)
        const details = document.createElement('div');
        details.className = 'file-details';
        details.textContent = `${formatSize(file.size)} | ${formatDate(file.lastModified)}`;

        listItem.appendChild(checkbox);
        listItem.appendChild(span);
        listItem.appendChild(details);
        fileList.appendChild(listItem);
    });
}

// Function to toggle all checkboxes
function toggleSelectAll(event) {
    const isChecked = event.target.checked;
    const checkboxes = document.querySelectorAll('.file-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
        const path = checkbox.value;
        if (isChecked) {
            selectedItems.add(path);
        } else {
            selectedItems.delete(path);
        }
    });
    updateSelectedItemsPanel();
}


// Function to setup Monaco Editor
function setupEditor() {
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.1/min/vs' }});
    require(['vs/editor/editor.main'], function() {
        editor = monaco.editor.create(document.getElementById('editor'), {
            value: '',
            language: 'plaintext',
            theme: 'vs-dark',
            automaticLayout: true
        });
    });
}

// Function to open the editor modal and load file content
function openEditor(filePath) {
    currentEditingFilePath = filePath;
    fetch(`/api/get_file_content?path=${encodeURIComponent(filePath)}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                return;
            }
            editor.setValue(data.content);
            showEditorModal(true);
            // Optionally, set language based on file extension
            const extension = getFileExtension(filePath);
            setEditorLanguage(extension);
        })
        .catch(error => {
            console.error('Error fetching file content:', error);
            alert('An error occurred while fetching the file content.');
        });
}

// Function to close the editor modal
function closeEditor() {
    showEditorModal(false);
    editor.setValue(''); // Clear editor content
    currentEditingFilePath = '';
}

// Function to show or hide the editor modal
function showEditorModal(show) {
    const modal = document.getElementById('editor-modal');
    if (show) {
        modal.style.display = 'block';
    } else {
        modal.style.display = 'none';
    }
}

// Function to save the edited file
function saveEditor() {
    const editedContent = editor.getValue();
    fetch('/api/save_file_content', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            path: currentEditingFilePath,
            content: editedContent
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            alert('File saved successfully.');
            closeEditor();
            loadDirectory(currentPath); // Refresh the directory view
        }
    })
    .catch(error => {
        console.error('Error saving file:', error);
        alert('An error occurred while saving the file.');
    });
}

// Helper Function to get file extension
function getFileExtension(path) {
    return path.split('.').pop().toLowerCase();
}

// Function to set editor language based on file extension
function setEditorLanguage(extension) {
    const languageMapping = {
        'js': 'javascript',
        'py': 'python',
        'md': 'markdown',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'java': 'java',
        'c': 'c',
        'cpp': 'cpp',
        'cs': 'csharp',
        // Add more mappings as needed
    };
    const language = languageMapping[extension] || 'plaintext';
    monaco.editor.setModelLanguage(editor.getModel(), language);
}

// Helper Function to Extract Directory Name from Path
function getDirectoryName(path) {
    const parts = path.split('/');
    return parts[parts.length - 1];
}

// Function to format file size
function formatSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

// Function to format date
function formatDate(timestamp) {
    const date = new Date(timestamp * 1000); // Convert Unix timestamp to milliseconds
    return date.toLocaleString();
}

// Function to search files and folders (current directory and globally)
function searchFiles() {
    const query = document.getElementById('search-bar').value.trim();
    currentSearch = query;
    if (query === '') {
        isGlobalSearch = false;
        // Reload the current directory to reset the view and breadcrumbs
        loadDirectory(currentPath);
        return;
    }

    // Treat any search input as a global search
    isGlobalSearch = true;
    showLoading(true);
    performGlobalSearch(query);
}

// Function to perform global search (recursive search)
function performGlobalSearch(query) {
    fetch(`/api/search?query=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                showLoading(false);
                return;
            }
            allDirectories = data.directories;
            allFiles = data.files;
            updateBreadcrumb(data.breadcrumb); // Update breadcrumbs to show 'Search Results'
            applyFilters();
            showLoading(false);
        })
        .catch(error => {
            console.error('Error performing search:', error);
            alert('An error occurred while searching.');
            showLoading(false);
        });
}

// Function to sort files and folders
function sortFiles() {
    const sortType = document.getElementById('sort-dropdown').value;
    currentSort = sortType;
    applyFilters();
}

// Updated Function to download all files as a ZIP with progress (New Implementation)
function downloadAll() {
    const id = generateUniqueId();
    addProgressBar(id, 'download', 'All Files');

    const xhr = new XMLHttpRequest();
    activeDownloadXHRs[id] = xhr; // Store XHR with unique ID for cancellation
    xhr.open('GET', '/download_all', true);
    xhr.responseType = 'blob';

    // Track download progress
    xhr.onprogress = function(event) {
        if (event.lengthComputable) {
            const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
            updateProgressBar(id, percentComplete);
        }
    };

    xhr.onload = function() {
        if (xhr.status === 200) {
            const disposition = xhr.getResponseHeader('Content-Disposition');
            let filename = 'download.zip';
            if (disposition && disposition.indexOf('filename=') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) { 
                    filename = matches[1].replace(/['"]/g, '');
                }
            }
            const blob = xhr.response;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            alert('Download completed successfully.');
        } else {
            try {
                const response = JSON.parse(xhr.responseText);
                alert(response.error || 'An error occurred during download.');
            } catch (e) {
                alert('An error occurred during download.');
            }
        }
        removeProgressBar(id);
        delete activeDownloadXHRs[id];
    };

    xhr.onerror = function() {
        alert('An error occurred during the download.');
        removeProgressBar(id);
        delete activeDownloadXHRs[id];
    };

    xhr.onabort = function() {
        alert('Download has been canceled.');
        removeProgressBar(id);
        delete activeDownloadXHRs[id];
    };

    xhr.send();
}

// Function to cancel ongoing upload or download
function cancelOperation(id, type) {
    if (type === 'upload' && activeUploadXHRs[id]) {
        activeUploadXHRs[id].abort();
        delete activeUploadXHRs[id];
        alert('Upload canceled.');
    }
    if (type === 'download' && activeDownloadXHRs[id]) {
        activeDownloadXHRs[id].abort();
        delete activeDownloadXHRs[id];
        alert('Download canceled.');
    }
    removeProgressBar(id);
}

function resetAllProgressBars() {
    const progressList = document.getElementById('progress-list');
    progressList.innerHTML = '';
    activeUploadXHRs = {};
    activeDownloadXHRs = {};
}

function updateProgressBar(id, percentComplete) {
    const progressBar = document.getElementById(`progress-bar-${id}`);
    const progressText = document.getElementById(`progress-text-${id}`);
    if (progressBar && progressText) {
        progressBar.style.width = `${percentComplete}%`;
        progressText.textContent = `${percentComplete}%`;
    }
}

// Function to upload files with progress tracking and cancellation
function uploadFiles() {
    const input = document.getElementById('upload-file-input');
    const files = input.files;
    if (files.length === 0) {
        alert('Please select at least one file to upload.');
        return;
    }

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const id = generateUniqueId();
        addProgressBar(id, 'upload', file.name);

        const formData = new FormData();
        formData.append('files', file);
        formData.append('path', currentPath);

        const xhr = new XMLHttpRequest();
        activeUploadXHRs[id] = xhr; // Assign to activeUploadXHRs for cancellation
        xhr.open('POST', '/upload', true);

        // Track upload progress
        xhr.upload.onprogress = function(event) {
            if (event.lengthComputable) {
                const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
                updateProgressBar(id, percentComplete);
            }
        };

        xhr.onload = function() {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.error) {
                    alert(`Error uploading ${file.name}: ${response.error}`);
                } else {
                    alert(`File "${file.name}" uploaded successfully.`);
                    loadDirectory(currentPath);
                }
            } else {
                try {
                    const response = JSON.parse(xhr.responseText);
                    alert(`Error uploading ${file.name}: ${response.error}`);
                } catch (e) {
                    alert(`An error occurred during the upload of "${file.name}".`);
                }
            }
            removeProgressBar(id);
            delete activeUploadXHRs[id];
        };

        xhr.onerror = function() {
            alert(`An error occurred during the upload of "${file.name}".`);
            removeProgressBar(id);
            delete activeUploadXHRs[id];
        };

        xhr.onabort = function() {
            alert(`Upload of "${file.name}" has been canceled.`);
            removeProgressBar(id);
            delete activeUploadXHRs[id];
        };

        xhr.send(formData);
    }

    // Reset the input
    input.value = '';
}

// Function to upload folders with directory structure, progress tracking, and cancellation
function uploadFolders() {
    const input = document.getElementById('upload-folder-input');
    const files = input.files;
    if (files.length === 0) {
        alert('Please select at least one folder to upload.');
        return;
    }

    const formData = new FormData();
    formData.append('path', currentPath); // Current directory

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Append each file with its relative path
        formData.append('files', file, file.webkitRelativePath);
    }

    const id = generateUniqueId();
    addProgressBar(id, 'upload', 'Folder Upload');

    const xhr = new XMLHttpRequest();
    activeUploadXHRs[id] = xhr; // Assign to activeUploadXHRs for cancellation
    xhr.open('POST', '/upload', true);

    // Track upload progress
    xhr.upload.onprogress = function(event) {
        if (event.lengthComputable) {
            const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
            updateProgressBar(id, percentComplete);
        }
    };

    xhr.onload = function() {
        if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            if (response.error) {
                alert(`Error uploading: ${response.error}`);
            } else {
                alert('Folder uploaded successfully.');
                loadDirectory(currentPath);
            }
        } else {
            try {
                const response = JSON.parse(xhr.responseText);
                alert(`Error uploading: ${response.error}`);
            } catch (e) {
                alert('An error occurred during the upload.');
            }
        }
        removeProgressBar(id);
        delete activeUploadXHRs[id];
    };

    xhr.onerror = function() {
        alert('An error occurred during the upload.');
        removeProgressBar(id);
        delete activeUploadXHRs[id];
    };

    xhr.onabort = function() {
        alert('Upload has been canceled.');
        removeProgressBar(id);
        delete activeUploadXHRs[id];
    };

    xhr.send(formData);

    // Reset the input
    input.value = '';
}

// Function to generate a unique ID for each progress task
function generateUniqueId() {
    return 'xxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

// Function to show or hide the loading spinner
function showLoading(show) {
    const loadingDiv = document.getElementById('loading');
    if (show) {
        loadingDiv.style.display = 'flex';
    } else {
        loadingDiv.style.display = 'none';
    }
}


// Function to setup navigation buttons (Back and Home)
function setupNavigationButtons() {
    const backButton = document.getElementById('back-button');
    const homeButton = document.getElementById('home-button');

    backButton.addEventListener('click', () => {
        if (navigationHistory.length > 0) {
            const previousPath = navigationHistory.pop();
            loadDirectory(previousPath);
        } else {
            alert('No previous directory.');
        }
    });

    homeButton.addEventListener('click', () => {
        if (currentPath !== '') {
            navigationHistory.push(currentPath); // Push current path to history before navigating
            loadDirectory('');
        }
    });
}

// Function to add a new folder
function addFolder() {
    const folderName = prompt('Enter the name of the new folder:');
    if (folderName === null) { // User canceled the prompt
        return;
    }
    const trimmedName = folderName.trim();
    if (trimmedName === '') {
        alert('Folder name cannot be empty.');
        return;
    }

    showLoading(true);
    fetch('/create_folder', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            path: currentPath,
            folder_name: trimmedName
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(`Error: ${data.error}`);
        } else {
            alert('Folder created successfully.');
            loadDirectory(currentPath);
        }
    })
    .catch(error => {
        console.error('Error creating folder:', error);
        alert('An error occurred while creating the folder.');
    })
    .finally(() => {
        showLoading(false);
    });
}

// Function to add a new file
function addFile() {
    const fileName = prompt('Enter the name of the new file (e.g., example.txt):');
    if (fileName === null) { // User canceled the prompt
        return;
    }
    const trimmedName = fileName.trim();
    if (trimmedName === '') {
        alert('File name cannot be empty.');
        return;
    }

    // Optional: validate file extension
    // For simplicity, accept any extension

    showLoading(true);
    fetch('/create_file', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            path: currentPath,
            file_name: trimmedName
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(`Error: ${data.error}`);
        } else {
            alert('File created successfully.');
            loadDirectory(currentPath);
        }
    })
    .catch(error => {
        console.error('Error creating file:', error);
        alert('An error occurred while creating the file.');
    })
    .finally(() => {
        showLoading(false);
    });
}
