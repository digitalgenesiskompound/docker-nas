// uploadDownload.js

// Initialize CSRF Token
App.getCSRFToken = function() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
};

// Set CSRF Token in XHR Headers
App.setCSRFHeader = function(xhr) {
    const csrfToken = App.getCSRFToken();
    if (csrfToken) {
        xhr.setRequestHeader('X-CSRFToken', csrfToken);
    }
};

// Detect iOS devices
App.isIOS = function() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

// Function to perform actions based on user selection
App.performAction = function(action) {
    if (App.selectedItems.size === 0) {
        alert('No items selected.');
        return;
    }

    const paths = Array.from(App.selectedItems);
    if (action === 'download') {
        App.downloadItems(paths);
    } else if (action === 'delete') {
        App.deleteItems(paths);
    } else if (action === 'edit') {
        App.editSelectedItem(paths);
    } else if (action === 'move') { // Updated Move Action
        App.openDestinationModal(); // Open the destination selection modal
    }
};

// Function to edit selected item
App.editSelectedItem = function(paths) {
    if (paths.length !== 1) {
        alert('Please select exactly one file to edit.');
        return;
    }

    const path = paths[0];
    // Check if the selected path is a file
    const selectedFile = App.allFiles.find(file => file.path === path);
    if (!selectedFile) {
        alert('Selected item is not a file or does not exist.');
        return;
    }

    App.openEditor(path);
};

// Function to download selected items with progress and cancellation
App.downloadItems = function(paths) {
    if (paths.length === 1 && !App.allDirectories.includes(paths[0])) {
        // Single file download
        App.downloadSingleFile(paths[0]);
    } else {
        // Multiple files or directories download as ZIP
        App.downloadMultipleItems(paths);
    }
};

// Function to download a single file
App.downloadSingleFile = function(path) {
    if (App.isIOS()) {
        App.downloadViaForm([path], 'download-single');
    } else {
        App.downloadSingleFileXHR(path);
    }
};

// Function to download multiple items as ZIP
App.downloadMultipleItems = function(paths) {
    if (App.isIOS()) {
        App.downloadViaForm(paths, 'download-multiple');
    } else {
        App.downloadMultipleItemsXHR(paths);
    }
};

// Function to download all files as ZIP
App.downloadAll = function() {
    const allPaths = App.allFiles.map(file => file.path).concat(App.allDirectories);
    if (App.isIOS()) {
        App.downloadViaForm(allPaths, 'download-all');
    } else {
        App.downloadMultipleItemsXHR(allPaths);
    }
};

// AJAX-based download for single file (non-iOS)
App.downloadSingleFileXHR = function(path) {
    const id = App.generateUniqueId();
    App.addProgressBar(id, 'download', path.split('/').pop());

    const xhr = new XMLHttpRequest();
    App.activeDownloadXHRs[id] = xhr;
    xhr.open('POST', '/download_selected', true);
    xhr.responseType = 'blob';

    // Set headers
    xhr.setRequestHeader('Content-Type', 'application/json');
    App.setCSRFHeader(xhr);

    // Progress tracking
    xhr.onprogress = function(event) {
        if (event.lengthComputable) {
            const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
            App.updateProgressBar(id, percentComplete);
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
            alert('Download completed successfully.');
            App.loadDirectory(App.currentPath);
        } else {
            try {
                const response = JSON.parse(xhr.responseText);
                alert(response.error || 'An error occurred during download.');
            } catch (e) {
                alert('An error occurred during download.');
            }
        }
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };

    xhr.onerror = function() {
        alert('An error occurred during the download.');
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };

    xhr.onabort = function() {
        alert('Download has been canceled.');
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };

    // Send the selected_paths as JSON
    xhr.send(JSON.stringify({ selected_paths: [path] }));
};

// AJAX-based download for multiple items or all files (non-iOS)
App.downloadMultipleItemsXHR = function(paths) {
    const id = App.generateUniqueId();
    App.addProgressBar(id, 'download', 'Selected Items');

    const xhr = new XMLHttpRequest();
    App.activeDownloadXHRs[id] = xhr;
    xhr.open('POST', '/download_selected', true);
    xhr.responseType = 'blob';

    // Set headers
    xhr.setRequestHeader('Content-Type', 'application/json');
    App.setCSRFHeader(xhr);

    // Progress tracking
    xhr.onprogress = function(event) {
        if (event.lengthComputable) {
            const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
            App.updateProgressBar(id, percentComplete);
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
            alert('Download completed successfully.');
            App.loadDirectory(App.currentPath);
        } else {
            try {
                const response = JSON.parse(xhr.responseText);
                alert(response.error || 'An error occurred during download.');
            } catch (e) {
                alert('An error occurred during download.');
            }
        }
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };

    xhr.onerror = function() {
        alert('An error occurred during the download.');
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };

    xhr.onabort = function() {
        alert('Download has been canceled.');
        App.removeProgressBar(id);
        delete App.activeDownloadXHRs[id];
    };

    // Send the selected_paths as JSON
    xhr.send(JSON.stringify({ selected_paths: paths }));
};

// Function to handle download via form submission for iOS devices
App.downloadViaForm = function(paths, formId) {
    // Create a unique form ID
    const uniqueFormId = formId || `download-form-${Date.now()}`;

    // Create form element
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/download_selected';
    form.target = '_blank'; // Open in a new tab/window

    // Add CSRF token as a hidden input
    const csrfToken = App.getCSRFToken();
    const csrfInput = document.createElement('input');
    csrfInput.type = 'hidden';
    csrfInput.name = 'X-CSRFToken';
    csrfInput.value = csrfToken;
    form.appendChild(csrfInput);

    // Add selected_paths as hidden inputs
    paths.forEach(path => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'selected_paths';
        input.value = path;
        form.appendChild(input);
    });

    // Append form to body
    document.body.appendChild(form);

    // Submit the form
    form.submit();

    // Remove the form after submission
    document.body.removeChild(form);

    // Notify user for iOS devices
    alert('Your download should begin shortly. Please check your downloads or the new tab.');
};
