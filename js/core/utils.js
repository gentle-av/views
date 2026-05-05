const Utils = {
    isHiddenFile(name) {
        return name.startsWith('.');
    },

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) return;
        notification.className = `notification ${type}`;
        notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i> ${message}`;
        notification.style.display = 'flex';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    },

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    getServerUrl() {
        return `http://${window.location.hostname}:${window.location.port}`;
    },

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
};
