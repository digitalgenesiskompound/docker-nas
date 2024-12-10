var App = App || {};

App.setupProgressTray = function() {
    const toggleButton = document.getElementById('toggle-progress-tray');
    const progressList = document.getElementById('progress-list');
    const progressTray = document.getElementById('progress-tray');

    toggleButton.addEventListener('click', () => {
        if (progressTray.classList.contains('show')) {
            progressTray.classList.remove('show');
            progressTray.classList.add('hide');
            toggleButton.innerHTML = '<i class="bi bi-chevron-up"></i> Show Progress';
        } else {
            progressTray.classList.remove('hide');
            progressTray.classList.add('show');
            toggleButton.innerHTML = '<i class="bi bi-chevron-down"></i> Hide Progress';
        }
    });
};

App.addProgressBar = function(id, type, name, indeterminate = false) {
    const progressTray = document.getElementById('progress-tray');
    const progressList = document.getElementById('progress-list');
    const toggleButton = document.getElementById('toggle-progress-tray');

    if (!progressTray.classList.contains('show')) {
        progressTray.classList.remove('hide');
        progressTray.classList.add('show');
        toggleButton.innerHTML = '<i class="bi bi-chevron-down"></i> Hide Progress';
    }

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
    if (indeterminate) {
        progressBar.classList.add('indeterminate');
    }

    const progressText = document.createElement('span');
    progressText.className = 'progress-text';
    progressText.id = `progress-text-${id}`;
    progressText.textContent = indeterminate ? 'Loading...' : '0%';

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

App.updateProgressBar = function(id, value, indeterminate = false) {
    const progressItem = document.getElementById(`progress-${id}`);
    if (progressItem) {
        const progressBar = progressItem.querySelector('.progress-bar');
        const progressText = progressItem.querySelector('.progress-text');
        if (indeterminate) {
            progressBar.classList.add('indeterminate');
            progressText.textContent = 'Loading...';
        } else {
            progressBar.classList.remove('indeterminate');
            progressBar.style.width = `${value}%`;
            progressText.textContent = `${value}%`;
        }
    }
};

App.removeProgressBar = function(id) {
    const progressItem = document.getElementById(`progress-${id}`);
    if (progressItem) {
        progressItem.remove();
    }

    const progressList = document.getElementById('progress-list');
    if (progressList.children.length === 0) {
        const progressTray = document.getElementById('progress-tray');
        progressTray.classList.remove('show');
        progressTray.classList.add('hide');
        const toggleButton = document.getElementById('toggle-progress-tray');
        toggleButton.innerHTML = '<i class="bi bi-chevron-up"></i> Show Progress';
    }
};
