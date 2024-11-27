// uploadDownload.js


// Function to hash the passphrase using SHA-256
function hashPassphrase(passphrase) {
    return CryptoJS.SHA256(passphrase).toString();
}

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

// Function to download a single file with progress and cancellation
App.downloadSingleFile = function(path) {
    const fileName = path.split('/').pop();
    const isEncrypted = fileName.endsWith('.enc');

    const id = App.generateUniqueId();
    App.addProgressBar(id, 'download', fileName);

    const xhr = new XMLHttpRequest();
    App.activeDownloadXHRs[id] = xhr;
    xhr.open('POST', '/download_selected', true);
    xhr.responseType = 'blob';

    xhr.setRequestHeader('Content-Type', 'application/json');

    // Track download progress
    xhr.onprogress = function(event) {
        if (event.lengthComputable) {
            const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
            App.updateProgressBar(id, percentComplete);
        }
    };

    xhr.onload = function() {
        if (xhr.status === 200 || xhr.status === 207) {
            const blob = xhr.response;

            if (isEncrypted) {
                // The server has already decrypted the file. Directly download it.
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName.replace('.enc', '');
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                alert('Download completed successfully.');
                App.removeProgressBar(id);
                delete App.activeDownloadXHRs[id];
            } else {
                // Handle non-encrypted file download as usual
                const disposition = xhr.getResponseHeader('Content-Disposition');
                let filename = 'download';
                if (disposition && disposition.indexOf('filename=') !== -1) {
                    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                    const matches = filenameRegex.exec(disposition);
                    if (matches != null && matches[1]) {
                        filename = matches[1].replace(/['"]/g, '');
                    }
                }
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                alert('Download completed successfully.');
                App.loadDirectory(App.currentPath); // Refresh the directory view
                App.removeProgressBar(id);
                delete App.activeDownloadXHRs[id];
            }
        } else {
            try {
                const response = JSON.parse(xhr.responseText);
                alert(response.error || 'An error occurred during download.');
            } catch (e) {
                alert('An error occurred during download.');
            }
            App.removeProgressBar(id);
            delete App.activeDownloadXHRs[id];
        }
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

    // Send the selected_paths and passphrase as JSON in the body
    xhr.send(JSON.stringify({
        selected_paths: [path],
        passphrase: App.userPassphrase // Ensure passphrase is sent
    }));
};


// Function to download multiple items as a ZIP with progress and cancellation
App.downloadMultipleItems = function(paths) {
    const id = App.generateUniqueId();
    App.addProgressBar(id, 'download', 'Selected Items');

    const xhr = new XMLHttpRequest();
    App.activeDownloadXHRs[id] = xhr; // Store XHR with unique ID for cancellation
    xhr.open('POST', '/download_selected', true);
    xhr.responseType = 'blob';

    // Set the request header to indicate JSON payload
    xhr.setRequestHeader('Content-Type', 'application/json');

    // Track download progress
    xhr.onprogress = function(event) {
        if (event.lengthComputable) {
            const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
            App.updateProgressBar(id, percentComplete);
        }
    };

    xhr.onload = function() {
        if (xhr.status === 200 || xhr.status === 207) { // 207 for multi-status responses
            const blob = xhr.response;
            const isEncrypted = blob.type === 'application/octet-stream'; // Adjust as needed

            if (isEncrypted) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const encryptedDataStr = event.target.result;
                    const [saltHex, ivHex, ciphertext] = encryptedDataStr.split(':');

                    if (!saltHex || !ivHex || !ciphertext) {
                        alert('Invalid encrypted file format.');
                        App.removeProgressBar(id);
                        delete App.activeDownloadXHRs[id];
                        return;
                    }

                    const passphrase = App.userPassphrase;
                    const key = Encryption.generateKey(passphrase, saltHex);

                    try {
                        // Decrypt the data
                        const decryptedWordArray = Encryption.decryptData(ciphertext, key, ivHex);

                        // Convert decrypted WordArray to Uint8Array
                        const decryptedUint8Array = Encryption.wordArrayToUint8Array(decryptedWordArray);

                        // Create Blob from Uint8Array
                        const decryptedBlob = new Blob([decryptedUint8Array], { type: 'application/octet-stream' });

                        // Create a link to download the decrypted file
                        const url = window.URL.createObjectURL(decryptedBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'selected_items.zip'; // Customize filename as needed
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        window.URL.revokeObjectURL(url);
                        alert('Download and decryption completed successfully.');
                    } catch (error) {
                        console.error(error);
                        alert('Incorrect passphrase or decryption failed.');
                    }

                    App.removeProgressBar(id);
                    delete App.activeDownloadXHRs[id];
                };
                reader.readAsText(blob);
            } else {
                // Handle non-encrypted files if any
                const disposition = xhr.getResponseHeader('Content-Disposition');
                let filename = 'download.zip';
                if (disposition && disposition.indexOf('filename=') !== -1) {
                    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                    const matches = filenameRegex.exec(disposition);
                    if (matches != null && matches[1]) {
                        filename = matches[1].replace(/['"]/g, '');
                    }
                }
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                alert('Download completed successfully.');
                App.loadDirectory(App.currentPath); // Refresh the directory view
                App.removeProgressBar(id);
                delete App.activeDownloadXHRs[id];
            }
        } else {
            try {
                const response = JSON.parse(xhr.responseText);
                alert(response.error || 'An error occurred during download.');
            } catch (e) {
                alert('An error occurred during download.');
            }
            App.removeProgressBar(id);
            delete App.activeDownloadXHRs[id];
        }
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

    // Send the selected_paths and passphrase as JSON in the body
    xhr.send(JSON.stringify({
        selected_paths: paths,
        passphrase: App.userPassphrase // Ensure passphrase is sent
    }));
};


// Function to delete items
App.deleteItems = function(paths) {
    if (!confirm(`Are you sure you want to delete ${paths.length} item(s)? This action cannot be undone.`)) {
        return;
    }

    App.showLoading(true);
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
            App.selectedItems.clear();
            App.updateSelectedItemsPanel();
            App.loadDirectory(App.currentPath); // Refresh the directory view
        }
        App.showLoading(false);
    })
    .catch(error => {
        console.error('Error deleting items:', error);
        alert(error.error || 'An error occurred while deleting the items.');
        App.showLoading(false);
    });
};

// Function to download all files as a ZIP with progress (New Implementation)
App.downloadAll = function() {
    const id = App.generateUniqueId();
    App.addProgressBar(id, 'download', 'All Files');

    const xhr = new XMLHttpRequest();
    App.activeDownloadXHRs[id] = xhr; // Store XHR with unique ID for cancellation
    xhr.open('POST', '/download_all', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.responseType = 'blob';

    // Track download progress
    xhr.onprogress = function(event) {
        if (event.lengthComputable) {
            const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
            App.updateProgressBar(id, percentComplete);
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

    xhr.send(JSON.stringify({
        passphrase: App.userPassphrase // Ensure passphrase is sent
    }));
};

// Function to cancel ongoing upload or download
App.cancelOperation = function(id, type) {
    if (type === 'upload' && App.activeUploadXHRs[id]) {
        App.activeUploadXHRs[id].abort();
        delete App.activeUploadXHRs[id];
        alert('Upload canceled.');
    }
    if (type === 'download' && App.activeDownloadXHRs[id]) {
        App.activeDownloadXHRs[id].abort();
        delete App.activeDownloadXHRs[id];
        alert('Download canceled.');
    }
    App.removeProgressBar(id);
};

// Function to reset all progress bars
App.resetAllProgressBars = function() {
    const progressList = document.getElementById('progress-list');
    progressList.innerHTML = '';
    App.activeUploadXHRs = {};
    App.activeDownloadXHRs = {};
};

App.uploadFiles = function() {
    const input = document.getElementById('upload-file-input');
    const files = input.files;
    if (files.length === 0) {
        alert('Please select at least one file to upload.');
        return;
    }

    if (!App.userPassphrase) {
        alert('Encryption passphrase not available. Please log in again.');
        return;
    }

    const passphrase = App.userPassphrase;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const id = App.generateUniqueId();
        App.addProgressBar(id, 'upload', file.name);

        const reader = new FileReader();
        reader.onload = function(event) {
            const arrayBuffer = event.target.result;
            const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
            const salt = Encryption.generateSalt();
            const iv = Encryption.generateIV();
            const key = Encryption.generateKey(passphrase, salt);
            const ciphertext = Encryption.encryptData(wordArray, key, iv);

            // Format: salt:iv:ciphertext
            const encryptedData = salt + ':' + iv.toString(CryptoJS.enc.Hex) + ':' + ciphertext;
            const encryptedBlob = new Blob([encryptedData], { type: 'application/octet-stream' });

            const formData = new FormData();
            formData.append('files', encryptedBlob, file.name + '.enc');
            formData.append('path', App.currentPath);
            formData.append('passphrase', passphrase);

            const xhr = new XMLHttpRequest();
            App.activeUploadXHRs[id] = xhr;
            xhr.open('POST', '/upload', true);

            xhr.upload.onprogress = function(event) {
                if (event.lengthComputable) {
                    const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
                    App.updateProgressBar(id, percentComplete);
                }
            };

            xhr.onload = function() {
                if (xhr.status === 200) {
                    alert(`File "${file.name}" uploaded successfully.`);
                    App.loadDirectory(App.currentPath);
                } else {
                    alert(`Error uploading "${file.name}": ${xhr.responseText}`);
                }
                App.removeProgressBar(id);
                delete App.activeUploadXHRs[id];
            };

            xhr.onerror = function() {
                alert(`An error occurred during the upload of "${file.name}".`);
                App.removeProgressBar(id);
                delete App.activeUploadXHRs[id];
            };

            xhr.onabort = function() {
                alert(`Upload of "${file.name}" has been canceled.`);
                App.removeProgressBar(id);
                delete App.activeUploadXHRs[id];
            };

            xhr.send(formData);
        };
        reader.readAsArrayBuffer(file);
    }

    input.value = '';
};


App.uploadFolders = function() {
    const input = document.getElementById('upload-folder-input');
    const files = input.files;
    if (files.length === 0) {
        alert('Please select at least one folder to upload.');
        return;
    }

    if (!App.userPassphrase) {
        alert('Encryption passphrase not available. Please log in again.');
        return;
    }

    const passphrase = App.userPassphrase;
    const id = App.generateUniqueId();
    App.addProgressBar(id, 'upload', 'Folder Upload');

    let filesProcessed = 0;

    const formData = new FormData();
    formData.append('path', App.currentPath); // Current directory
    formData.append('passphrase', passphrase);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = function(event) {
            const arrayBuffer = event.target.result;

            // Convert ArrayBuffer to WordArray
            const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);

            // Generate unique salt and IV
            const salt = Encryption.generateSalt();
            const iv = Encryption.generateIV();

            // Derive key from passphrase and salt
            const key = Encryption.generateKey(passphrase, salt);

            // Encrypt the file data
            const ciphertext = Encryption.encryptData(wordArray, key, iv);

            // Prepare the encrypted data format: salt:iv:ciphertext
            const encryptedData = salt + ':' + iv.toString(CryptoJS.enc.Hex) + ':' + ciphertext;

            // Create a Blob with encrypted data
            const encryptedBlob = new Blob([encryptedData], { type: 'application/octet-stream' });

            // Append the encrypted file with its relative path
            formData.append('files', encryptedBlob, file.webkitRelativePath + '.enc');

            filesProcessed++;

            if (filesProcessed === files.length) {
                // All files processed, send the form data
                sendEncryptedFolder();
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function sendEncryptedFolder() {
        const xhr = new XMLHttpRequest();
        App.activeUploadXHRs[id] = xhr; // Assign to activeUploadXHRs for cancellation
        xhr.open('POST', '/upload', true);

        // Track upload progress
        xhr.upload.onprogress = function(event) {
            if (event.lengthComputable) {
                const percentComplete = ((event.loaded / event.total) * 100).toFixed(2);
                App.updateProgressBar(id, percentComplete);
            }
        };

        xhr.onload = function() {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.error) {
                    alert(`Error uploading: ${response.error}`);
                } else {
                    alert('Folder uploaded successfully.');
                    App.loadDirectory(App.currentPath);
                }
            } else {
                try {
                    const response = JSON.parse(xhr.responseText);
                    alert(`Error uploading: ${response.error}`);
                } catch (e) {
                    alert('An error occurred during the upload.');
                }
            }
            App.removeProgressBar(id);
            delete App.activeUploadXHRs[id];
        };

        xhr.onerror = function() {
            alert('An error occurred during the upload.');
            App.removeProgressBar(id);
            delete App.activeUploadXHRs[id];
        };

        xhr.onabort = function() {
            alert('Upload has been canceled.');
            App.removeProgressBar(id);
            delete App.activeUploadXHRs[id];
        };

        xhr.send(formData);

        // Reset the input
        input.value = '';
    }
};

