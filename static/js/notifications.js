// notifications.js

// Ensure the App namespace exists
window.App = window.App || {};

// Existing showToast function
App.showToast = function(message, type = 'info', duration = 5000) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    // Append toast to the container
    document.getElementById('toast-container').appendChild(toast);

    // Initialize and show the toast
    const bsToast = new bootstrap.Toast(toast, { delay: duration });
    bsToast.show();

    // Remove the toast from DOM after hidden
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
};

// Initialize Bootstrap Confirmation Modal
App.confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'), {
    keyboard: false,
    backdrop: 'static' // Prevent closing by clicking outside
});