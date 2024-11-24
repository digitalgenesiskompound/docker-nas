// /home/ngk/docker-nas/static/draganddrop.js

document.addEventListener('DOMContentLoaded', () => {
    const fileList = document.getElementById('file-list');

    // Prevent default behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileList.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        fileList.addEventListener(eventName, () => fileList.classList.add('highlight'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        fileList.addEventListener(eventName, () => fileList.classList.remove('highlight'), false);
    });

    // Handle dropped files
    fileList.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        handleFiles(files);
    }

    function handleFiles(files) {
        // Utilize the existing uploadFiles function
        // Create a temporary input to trigger the uploadFiles function
        const uploadInput = document.createElement('input');
        uploadInput.type = 'file';
        uploadInput.multiple = true;
        uploadInput.style.display = 'none';

        uploadInput.onchange = () => {
            const selectedFiles = uploadInput.files;
            // Manually set the files to the upload input and trigger the upload
            const dataTransfer = new DataTransfer();
            for (let i = 0; i < selectedFiles.length; i++) {
                dataTransfer.items.add(selectedFiles[i]);
            }
            const event = new Event('change');
            const uploadElement = document.getElementById('upload-input');
            uploadElement.files = dataTransfer.files;
            uploadElement.dispatchEvent(event);
        };

        document.body.appendChild(uploadInput);
        uploadInput.files = files;
        uploadInput.dispatchEvent(new Event('change'));
        document.body.removeChild(uploadInput);
    }
});
