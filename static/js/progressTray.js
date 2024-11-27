// progressTray.js

App.setupProgressTray = function() {
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
};

App.addProgressBar = function(id, type, name) {
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
    cancelButton.onclick = () => App.cancelOperation(id, type);

    progressItem.appendChild(label);
    progressItem.appendChild(progressContainer);
    progressItem.appendChild(cancelButton);

    progressList.appendChild(progressItem);
};

App.removeProgressBar = function(id) {
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
};