var App = App || {};

App.activeUploadXHRs = App.activeUploadXHRs || {};
App.activeDownloadXHRs = App.activeDownloadXHRs || {};

App.getCSRFToken = function() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
};

App.setCSRFHeader = function(xhr) {
    const csrfToken = App.getCSRFToken();
    if (csrfToken) {
        xhr.setRequestHeader('X-CSRFToken', csrfToken);
    }
};

App.isIOS = function() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

App.performAction = function(action) {
    if (App.selectedItems.size === 0) {
        App.showToast('No items selected.');
        return;
    }

    const paths = Array.from(App.selectedItems);
    if (action === 'download') {
        App.downloadItems(paths);
    } else if (action === 'delete') {
        App.deleteItems(paths);
    } else if (action === 'edit') {
        App.editSelectedItem(paths);
    } else if (action === 'move') {
        App.openDestinationModal();
    }
};

App.editSelectedItem = function(paths) {
    if (paths.length !== 1) {
        App.showToast('Please select exactly one file to edit.');
        return;
    }

    const path = paths[0];
    const selectedFile = App.allFiles.find(file => file.path === path);
    if (!selectedFile) {
        App.showToast('Selected item is not a file or does not exist.');
        return;
    }

    App.openEditor(path);
};

App.downloadItems = function(paths) {
    if (paths.length === 1 && !App.allDirectories.includes(paths[0])) {
        App.downloadSingleFile(paths[0]);
    } else {
        App.downloadMultipleItems(paths);
    }
};

App.downloadSingleFile = function(path) {
    if (App.isIOS()) {
        App.downloadViaForm([path], 'download-single');
    } else {
        App.downloadSingleFileXHR(path);
    }
};

App.downloadMultipleItems = function(paths) {
    if (App.isIOS()) {
        App.downloadViaForm(paths, 'download-multiple');
    } else {
        App.downloadMultipleItemsXHR(paths);
    }
};

App.downloadAll = function() {
    const allPaths = App.allFiles.map(file => file.path).concat(App.allDirectories);
    if (App.isIOS()) {
        App.downloadViaForm(allPaths, 'download-all');
    } else {
        App.downloadMultipleItemsXHR(allPaths);
    }
};

App.downloadSingleFileXHR = function(path) {
    const id = App.generateUniqueId();
    App.addProgressBar(id, 'download', path.split('/').pop());

    const xhr = new XMLHttpRequest();
    App.activeDownloadXHRs[id] = xhr;
    xhr.open('POST', '/download_selected', true);
    xhr.responseType = 'blob';

    xhr.setRequestHeader('Content-Type', 'application/json');
    App.setCSRFHeader(xhr);

    xhr.onprogress = function(event) {
        if (event.lengthComputable) {
            const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
            App.updateProgressBar(id, percentComplete, false);
        } else {
            App.updateProgressBar(id, 0, true);
        }
    };

    xhr.onload = function() {
        if (xhr.status === 200 || xhr.status === 207) {
            const disposition = xhr.getResponseHeader('Content-Disposition');
            let filename = 'downloaded_file';
            if (disposition && disposition.indexOf('filename=') !== -1) {
                const matches = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
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
            App.showToast('Download completed successfully.');
            App.loadDirectory(App.currentPath);
        } else {
            try {
                const response = JSON.parse(xhr.responseText);
                App.showToast(response.error || 'An error occurred during download.');
            } catch (e) {
                App.showToast('An error occurred during download.');
            }
        }
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };

    xhr.onerror = function() {
        App.showToast('An error occurred during the download.');
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };

    xhr.onabort = function() {
        App.showToast('Download has been canceled.');
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };
    xhr.send(JSON.stringify({ selected_paths: [path] }));
};


App.downloadMultipleItemsXHR = function(paths) {
    const id = App.generateUniqueId();
    App.addProgressBar(id, 'download', 'Selected Items');

    const xhr = new XMLHttpRequest();
    App.activeDownloadXHRs[id] = xhr;
    xhr.open('POST', '/download_selected', true);
    xhr.responseType = 'blob';

    xhr.setRequestHeader('Content-Type', 'application/json');
    App.setCSRFHeader(xhr);

    xhr.onprogress = function(event) {
        if (event.lengthComputable) {
            const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
            App.updateProgressBar(id, percentComplete, false);
        } else {
            App.updateProgressBar(id, 0, true);
        }
    };

    xhr.onload = function() {
        if (xhr.status === 200 || xhr.status === 207) {
            const disposition = xhr.getResponseHeader('Content-Disposition');
            let filename = 'download.zip';
            if (disposition && disposition.indexOf('filename=') !== -1) {
                const matches = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
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
            App.showToast('Download completed successfully.');
            App.loadDirectory(App.currentPath);
        } else {
            try {
                const response = JSON.parse(xhr.responseText);
                App.showToast(response.error || 'An error occurred during download.');
            } catch (e) {
                App.showToast('An error occurred during download.');
            }
        }
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };

    xhr.onerror = function() {
        App.showToast('An error occurred during the download.');
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };

    xhr.onabort = function() {
        App.showToast('Download has been canceled.');
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };

    xhr.send(JSON.stringify({ selected_paths: paths }));
};

App.downloadViaForm = function(paths, formId) {
    const uniqueFormId = formId || `download-form-${Date.now()}`;
    
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/download_selected';
    form.target = '_self';
    
    const csrfToken = App.getCSRFToken();
    if (!csrfToken) {
        App.showToast('CSRF token not found. Cannot initiate download.');
        return;
    }
    const csrfInput = document.createElement('input');
    csrfInput.type = 'hidden';
    csrfInput.name = 'csrf_token';
    csrfInput.value = csrfToken;
    form.appendChild(csrfInput);

    paths.forEach(path => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'selected_paths';
        input.value = path;
        form.appendChild(input);
    });
    
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
    App.showToast('Your download should begin shortly. Please check your downloads.');
};

App.uploadFiles = function() {
    const input = document.getElementById('upload-file-input');
    const files = input.files;
    if (files.length === 0) {
        App.showToast('Please select at least one file to upload.');
        return;
    }

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const id = App.generateUniqueId();
        App.addProgressBar(id, 'upload', file.name);

        const formData = new FormData();
        formData.append('files', file);
        formData.append('path', App.currentPath);

        const xhr = new XMLHttpRequest();
        App.activeUploadXHRs[id] = xhr;
        xhr.open('POST', '/upload', true);

        App.setCSRFHeader(xhr);

        xhr.upload.onprogress = function(event) {
            if (event.lengthComputable) {
                const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
                App.updateProgressBar(id, percentComplete, false);
            } else {
                App.updateProgressBar(id, 0, true);
            }
        };

        xhr.onload = function() {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.error) {
                    App.showToast(`Error uploading ${file.name}: ${response.error}`);
                } else {
                    App.showToast(`File "${file.name}" uploaded successfully.`);
                    App.loadDirectory(App.currentPath);
                }
            } else {
                try {
                    const response = JSON.parse(xhr.responseText);
                    App.showToast(`Error uploading ${file.name}: ${response.error}`);
                } catch (e) {
                    App.showToast(`An error occurred during the upload of "${file.name}".`);
                }
            }
            App.removeProgressBar(id);
            delete App.activeUploadXHRs[id];
        };

        xhr.onerror = function() {
            App.showToast(`An error occurred during the upload of "${file.name}".`);
            App.removeProgressBar(id);
            delete App.activeUploadXHRs[id];
        };

        xhr.onabort = function() {
            App.showToast(`Upload of "${file.name}" has been canceled.`);
            App.removeProgressBar(id);
            delete App.activeUploadXHRs[id];
        };

        xhr.send(formData);
    }
    input.value = '';
};

App.uploadFolders = function() {
    const input = document.getElementById('upload-folder-input');
    const files = input.files;
    if (files.length === 0) {
        App.showToast('Please select at least one folder to upload.', 'warning');
        return;
    }
    const folderName = files.length > 0 ? files[0].webkitRelativePath.split('/')[0] : 'this folder';

    App.showConfirmation(`Are you sure you want to upload all files from “${folderName}”? Only do this if you trust the site.`, 'Confirm Upload')
        .then(() => {
            const formData = new FormData();
            formData.append('path', App.currentPath);

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                formData.append('files', file, file.webkitRelativePath);
            }

            const id = App.generateUniqueId();
            App.addProgressBar(id, 'upload', 'Folder Upload', true);

            const xhr = new XMLHttpRequest();
            App.activeUploadXHRs[id] = xhr;
            xhr.open('POST', '/upload', true);

            App.setCSRFHeader(xhr);

            xhr.upload.onprogress = function(event) {
                if (event.lengthComputable) {
                    const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
                    App.updateProgressBar(id, percentComplete, false);
                } else {
                    App.updateProgressBar(id, 0, true);
                }
            };

            xhr.onload = function() {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    if (response.error) {
                        App.showToast(`Error uploading: ${response.error}`, 'danger');
                    } else {
                        App.showToast('Folder uploaded successfully.', 'success');
                        App.loadDirectory(App.currentPath);
                        App.closeAddFolderModal();
                    }
                } else {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        App.showToast(`Error uploading: ${response.error}`, 'danger');
                    } catch (e) {
                        App.showToast('An error occurred during the upload.', 'danger');
                    }
                }
                App.removeProgressBar(id);
                delete App.activeUploadXHRs[id];
            };

            xhr.onerror = function() {
                App.showToast('An error occurred during the upload.', 'danger');
                App.removeProgressBar(id);
                delete App.activeUploadXHRs[id];
            };

            xhr.onabort = function() {
                App.showToast('Upload has been canceled.', 'warning');
                App.removeProgressBar(id);
                delete App.activeUploadXHRs[id];
            };

            xhr.send(formData);
            input.value = '';
        })
        .catch(() => {
            App.showToast('Upload canceled.', 'info');
        });
};

App.deleteItems = function(paths) {
    if (!paths || paths.length === 0) {
        App.showToast('No items selected for deletion.', 'warning');
        return;
    }

    const itemCount = paths.length;
    const message = `Are you sure you want to delete ${itemCount} item(s)? This action cannot be undone.`;

    App.showConfirmation(message, 'Confirm Deletion')
        .then(() => {
            App.showLoading(true);
            const csrfToken = App.getCSRFToken();

            return fetch('/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({ path: paths }),
            });
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => { throw data; });
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                App.showToast(data.error, 'danger');
            } else {
                if (data.errors && data.errors.length > 0) {
                    let errorMessage = 'Some items were not deleted:\n';
                    data.errors.forEach(err => {
                        errorMessage += `- ${err.path}: ${err.error}\n`;
                    });
                    App.showToast(errorMessage, 'warning');
                } else {
                    App.showToast('Items deleted successfully.', 'success');
                }
                App.selectedItems.clear();
                App.updateSelectedItemsPanel();
                App.loadDirectory(App.currentPath);
            }
            App.showLoading(false);
        })
        .catch(error => {
            if (error instanceof TypeError) {
                console.error('Operation canceled or network error:', error);
                App.showToast('Operation was canceled or a network error occurred.', 'warning');
            } else {
                console.error('Error deleting items:', error);
                App.showToast(error.error || 'An error occurred while deleting the items.', 'danger');
            }
            App.showLoading(false);
        });
};

App.cancelOperation = function(id, type) {
    if (type === 'upload' && App.activeUploadXHRs[id]) {
        App.activeUploadXHRs[id].abort();
        delete App.activeUploadXHRs[id];
        App.showToast('Upload canceled.');
    }
    if (type === 'download' && App.activeDownloadXHRs[id]) {
        App.activeDownloadXHRs[id].abort();
        delete App.activeDownloadXHRs[id];
        App.showToast('Download canceled.');
    }
    App.removeProgressBar(id);
};

App.resetAllProgressBars = function() {
    const progressList = document.getElementById('progress-list');
    progressList.innerHTML = '';
    App.activeUploadXHRs = {};
    App.activeDownloadXHRs = {};
};

App.generateUniqueId = function() {
    return 'id-' + Math.random().toString(36).substr(2, 16);
};

App.showLoading = function(show) {
    const loadingIndicator = document.getElementById('loading');
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'block' : 'none';
    }
};
