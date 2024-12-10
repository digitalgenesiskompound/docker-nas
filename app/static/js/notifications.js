window.App = window.App || {};

App.showToast = function(message, type = 'info', duration = 5000) {
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

    document.getElementById('toast-container').appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, { delay: duration });
    bsToast.show();
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
};

App.confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'), {
    keyboard: false,
    backdrop: 'static'
});