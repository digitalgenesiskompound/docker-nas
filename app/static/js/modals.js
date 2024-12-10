App.openDestinationModal = function() {
    App.selectedDestinationPath = App.currentPath; 
    document.getElementById('destination-modal').style.display = 'block';
    App.loadDestinationFolders(App.selectedDestinationPath);
    App.updateDestinationBreadcrumb(App.selectedDestinationPath);
};

App.closeDestinationModal = function() {
    document.getElementById('destination-modal').style.display = 'none';
    App.selectedDestinationPath = '';
};

App.loadDestinationFolders = function(path) {
    fetch(`/api/list?path=${encodeURIComponent(path)}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                App.showToast(data.error);
                return;
            }
            const folderList = document.getElementById('destination-folder-list');
            folderList.innerHTML = '';

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

            data.directories.forEach(directory => {
                const fullPath = path ? `${path}/${directory}`.replace(/\\/g, '/') : directory;
                const listItem = document.createElement('li');
                listItem.className = 'file-list-item';
                listItem.addEventListener('click', (e) => {
                    e.preventDefault();
                    App.selectedDestinationPath = fullPath;
                    App.updateDestinationBreadcrumb(App.selectedDestinationPath);
                    App.loadDestinationFolders(App.selectedDestinationPath);

                    const allItems = document.querySelectorAll('#destination-folder-list .file-list-item');
                    allItems.forEach(item => {
                        item.style.backgroundColor = '#2c2c2c';
                    });
                    listItem.style.backgroundColor = '#555';
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

            if (data.directories.length === 0) {
                const message = document.createElement('li');
                message.textContent = 'No subfolders available.';
                message.style.color = '#b0b0b0';
                folderList.appendChild(message);
            }
        })
        .catch(error => {
            console.error('Error loading destination folders:', error);
            App.showToast('An error occurred while loading destination folders.');
        });
};

App.updateDestinationBreadcrumb = function(path) {
    const breadcrumbLinks = document.getElementById('destination-breadcrumb');
    breadcrumbLinks.innerHTML = ''; 

    const parts = path.split('/').filter(part => part !== '');
    let accumulatedPath = '';

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

    parts.forEach((part, index) => {
        accumulatedPath += `${part}/`;
        const separator = document.createTextNode(' / ');
        breadcrumbLinks.appendChild(separator);

        const link = document.createElement('a');
        link.href = '#';
        link.textContent = part;
        link.setAttribute('data-path', accumulatedPath.slice(0, -1));
        link.addEventListener('click', (e) => {
            e.preventDefault();
            App.selectedDestinationPath = accumulatedPath.slice(0, -1);
            App.updateDestinationBreadcrumb(App.selectedDestinationPath);
            App.loadDestinationFolders(App.selectedDestinationPath);
        });
        breadcrumbLinks.appendChild(link);
    });
};

App.openAddFolderModal = function() {
    document.getElementById('add-folder-modal').style.display = 'block';
};

App.closeAddFolderModal = function() {
    document.getElementById('add-folder-modal').style.display = 'none';
    document.getElementById('new-folder-name').value = '';
};

App.submitAddFolder = function() {
    const folderName = document.getElementById('new-folder-name').value.trim();
    if (folderName === '') {
        App.showToast('Folder name cannot be empty.');
        return;
    }

    App.showLoading(true);
    fetch('/create_folder', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': App.getCSRFToken()
        },
        body: JSON.stringify({
            path: App.currentPath,
            folder_name: folderName
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            App.showToast(`Error: ${data.error}`);
        } else {
            App.showToast('Folder created successfully.');
            App.loadDirectory(App.currentPath);
            App.closeAddFolderModal();
        }
    })
    .catch(error => {
        console.error('Error creating folder:', error);
        App.showToast('An error occurred while creating the folder.');
    })
    .finally(() => {
        App.showLoading(false);
    });
};

App.openAddFileModal = function() {
    document.getElementById('add-file-modal').style.display = 'block';
};

App.closeAddFileModal = function() {
    document.getElementById('add-file-modal').style.display = 'none';
    document.getElementById('new-file-name').value = '';
};

App.submitAddFile = function() {
    const fileName = document.getElementById('new-file-name').value.trim();
    if (fileName === '') {
        App.showToast('File name cannot be empty.');
        return;
    }

    App.showLoading(true);
    fetch('/create_file', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': App.getCSRFToken()
        },
        body: JSON.stringify({
            path: App.currentPath,
            file_name: fileName
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            App.showToast(`Error: ${data.error}`);
        } else {
            App.showToast('File created successfully.');
            App.loadDirectory(App.currentPath);
            App.closeAddFileModal();
        }
    })
    .catch(error => {
        console.error('Error creating file:', error);
        App.showToast('An error occurred while creating the file.');
    })
    .finally(() => {
        App.showLoading(false);
    });
};

App.confirmMove = function() {
    if (App.selectedDestinationPath === null || App.selectedDestinationPath === undefined) {
        App.showToast('Please select a destination folder.');
        return;
    }

    App.showConfirmation(`Are you sure you want to move ${App.selectedItems.size} item(s) to "${App.selectedDestinationPath || 'Root'}"?`, 'Confirm Move')
        .then(() => {
            App.showLoading(true);

            return fetch('/api/move_items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': App.getCSRFToken()
                },
                body: JSON.stringify({
                    source_paths: Array.from(App.selectedItems),
                    destination_path: App.selectedDestinationPath
                }),
            });
        })
        .then(response => {
            if (response.status === 207) {
                return response.json().then(data => {
                    if (data.moved.length > 0) {
                        App.showToast(`Successfully moved ${data.moved.length} item(s).`, 'success');
                    }
                    if (data.errors.length > 0) {
                        let errorMsg = 'Some items could not be moved:\n';
                        data.errors.forEach(err => {
                            errorMsg += `- ${err.path}: ${err.error}\n`;
                        });
                        App.showToast(errorMsg, 'danger');
                    }
                    App.loadDirectory(App.currentPath);
                    App.closeDestinationModal();
                    App.selectedItems.clear();
                    App.updateSelectedItemsPanel();
                });
            } else if (!response.ok) {
                return response.json().then(data => { throw data; });
            } else {
                return response.json().then(data => {
                    App.showToast(data.message, 'success');
                    App.loadDirectory(App.currentPath);
                    App.closeDestinationModal();
                    App.selectedItems.clear();
                    App.updateSelectedItemsPanel();
                });
            }
        })
        .catch(error => {
            console.error('Error moving items:', error);
            App.showToast(error.error || 'An error occurred while moving the items.', 'danger');
        })
        .finally(() => {
            App.showLoading(false);
        });
};

App.showConfirmation = function(message, title = 'Confirm Action') {
    return new Promise((resolve, reject) => {
        document.getElementById('confirmationModalLabel').textContent = title;
        document.getElementById('confirmationModalMessage').textContent = message;

        const confirmationModalElement = document.getElementById('confirmationModal');
        const confirmationModal = new bootstrap.Modal(confirmationModalElement, {
            keyboard: false,
            backdrop: 'static'
        });
        confirmationModal.show();

        const confirmButton = document.getElementById('confirmActionButton');
        const onConfirm = () => {
            confirmationModal.hide();
            confirmButton.removeEventListener('click', onConfirm);
            resolve();
        };

        confirmButton.addEventListener('click', onConfirm);
        confirmationModalElement.addEventListener('hidden.bs.modal', () => {
            confirmButton.removeEventListener('click', onConfirm);
            reject();
        }, { once: true });
    });
};


