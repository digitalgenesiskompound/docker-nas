// selection.js

App.setupSelectedItemsPanel = function() {
    const selectedItemsList = document.getElementById('selected-items-list');
    const fileListForm = document.getElementById('file-list-form');

    // Listen for changes in file selection
    fileListForm.addEventListener('change', (e) => {
        if (e.target.classList.contains('file-checkbox')) {
            const path = e.target.value;
            if (e.target.checked) {
                App.selectedItems.add(path);
            } else {
                App.selectedItems.delete(path);
            }
            App.updateSelectedItemsPanel();
        }
    });

    // Allow clicking on selected items to deselect them
    selectedItemsList.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
            const path = e.target.getAttribute('data-path');
            App.selectedItems.delete(path);
            // Uncheck the corresponding checkbox
            const checkbox = document.querySelector(`.file-checkbox[value="${path}"]`);
            if (checkbox) {
                checkbox.checked = false;
            }
            App.updateSelectedItemsPanel();
        }
    });
};

App.updateSelectedItemsPanel = function() {
    const selectedItemsList = document.getElementById('selected-items-list');
    selectedItemsList.innerHTML = '';

    App.selectedItems.forEach(path => {
        const listItem = document.createElement('li');
        listItem.textContent = path;
        listItem.setAttribute('data-path', path);
        selectedItemsList.appendChild(listItem);
    });

    // Show or hide the side panel based on selections
    const sidePanel = document.getElementById('selected-items-panel');
    if (App.selectedItems.size > 0) {
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
};

App.closeSelectedItemsPanel = function() {
    App.selectedItems.clear();
    App.updateSelectedItemsPanel();
    // Uncheck all checkboxes
    const checkboxes = document.querySelectorAll('.file-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
};

App.toggleSelectAll = function(event) {
    const isChecked = event.target.checked;
    const checkboxes = document.querySelectorAll('.file-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
        const path = checkbox.value;
        if (isChecked) {
            App.selectedItems.add(path);
        } else {
            App.selectedItems.delete(path);
        }
    });
    App.updateSelectedItemsPanel();
}