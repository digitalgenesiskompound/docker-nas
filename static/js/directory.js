// directory.js

App.loadDirectory = function(path) {
    App.currentPath = path;
    App.isGlobalSearch = false; // Reset to current directory search
    document.getElementById('search-bar').value = ''; // Clear search bar
    App.showLoading(true); // Show loading spinner
    fetch(`/api/list?path=${encodeURIComponent(path)}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                App.showLoading(false); // Hide loading spinner
                return;
            }
            App.allDirectories = data.directories.map(dir => {
                return path ? `${path}/${dir}`.replace(/\\/g, '/') : dir;
            });
            App.allFiles = data.files;
            App.updateBreadcrumb(data.breadcrumb);
            App.applyFilters();
            App.showLoading(false); // Hide loading spinner
        })
        .catch(error => {
            console.error('Error fetching directory:', error);
            alert('An error occurred while loading the directory.');
            App.showLoading(false); // Hide loading spinner
        });
};

App.updateBreadcrumb = function(breadcrumb) {
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
            App.navigationHistory.push(App.currentPath); // Push current path to history before navigating
            App.loadDirectory(newPath);
        });
        breadcrumbLinks.appendChild(link);
        if (index < breadcrumb.length - 1) {
            const separator = document.createTextNode(' / ');
            breadcrumbLinks.appendChild(separator);
        }
    });
};

App.applyFilters = function() {
    if (App.isGlobalSearch && App.currentSearch.trim() !== '') {
        // Use the global search results directly without performing another search
        App.updateFileList(App.allDirectories, App.allFiles);
        return;
    }

    let filteredDirectories = App.allDirectories.filter(dir => dir.toLowerCase().includes(App.currentSearch.toLowerCase()));
    let filteredFiles = App.allFiles.filter(file => file.name.toLowerCase().includes(App.currentSearch.toLowerCase()));

    // Sort directories and files based on currentSort
    filteredDirectories = App.sortArray(filteredDirectories, App.currentSort, 'directory');
    filteredFiles = App.sortArray(filteredFiles, App.currentSort, 'file');

    App.updateFileList(filteredDirectories, filteredFiles);
};

App.sortArray = function(arr, sortType, type='directory') {
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
};

App.performGlobalSearch = function (query) {
    fetch(`/api/search?query=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                showLoading(false);
                return;
            }
            App.allDirectories = data.directories;
            App.allFiles = data.files;
            App.updateBreadcrumb(data.breadcrumb); // Update breadcrumbs to show 'Search Results'
            App.applyFilters();
            App.showLoading(false);
        })
        .catch(error => {
            console.error('Error performing search:', error);
            alert('An error occurred while searching.');
            showLoading(false);
        });
}

App.sortFiles = function() {
    const sortType = document.getElementById('sort-dropdown').value;
    App.currentSort = sortType;
    App.applyFilters();
}

App.searchFiles = function() {
    const query = document.getElementById('search-bar').value.trim();
    App.currentSearch = query;
    if (query === '') {
        App.isGlobalSearch = false;
        // Reload the current directory to reset the view and breadcrumbs
        App.loadDirectory(App.currentPath);
        return;
    }

    // Treat any search input as a global search
    App.isGlobalSearch = true;
    App.showLoading(true);
    App.performGlobalSearch(query);
}

App.applyFilters = function() {
    if (App.isGlobalSearch && App.currentSearch.trim() !== '') {
        // Use the global search results directly without performing another search
        App.updateFileList(App.allDirectories, App.allFiles);
        return;
    }

    let filteredDirectories = App.allDirectories.filter(dir => dir.toLowerCase().includes(App.currentSearch.toLowerCase()));
    let filteredFiles = App.allFiles.filter(file => file.name.toLowerCase().includes(App.currentSearch.toLowerCase()));

    // Sort directories and files based on currentSort
    filteredDirectories = App.sortArray(filteredDirectories, App.currentSort, 'directory');
    filteredFiles = App.sortArray(filteredFiles, App.currentSort, 'file');

    App.updateFileList(filteredDirectories, filteredFiles);
}

App.updateFileList = function(directories, files) {
    const fileList = document.getElementById('file-list');
    fileList.innerHTML = ''; // Clear existing list

    // Add "Select All" checkbox
    const selectAllItem = document.createElement('li');
    selectAllItem.className = 'file-list-item select-all-item';

    const selectAllCheckbox = document.createElement('input');
    selectAllCheckbox.type = 'checkbox';
    selectAllCheckbox.id = 'select-all-checkbox';
    selectAllCheckbox.className = 'select-all-checkbox';
    selectAllCheckbox.addEventListener('change', App.toggleSelectAll);

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
        if (App.selectedItems.has(directory)) {
            checkbox.checked = true;
        }

        const link = document.createElement('a');
        link.href = '#';
        link.className = 'file-link';
        link.innerHTML = `<i class="bi bi-folder-fill file-icon"></i> ${App.getDirectoryName(directory)}`; // Display only the directory name
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const newPath = directory; // Use the full path directly
            App.navigationHistory.push(App.currentPath); // Push current path to history before navigating
            App.loadDirectory(newPath);
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
        if (App.selectedItems.has(file.path)) {
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
        details.textContent = `${App.formatSize(file.size)} | ${App.formatDate(file.lastModified)}`;

        listItem.appendChild(checkbox);
        listItem.appendChild(span);
        listItem.appendChild(details);
        fileList.appendChild(listItem);
    });
};
