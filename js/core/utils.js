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
        return `http://${window.location.hostname}:8083`;
    },

    getPlayerUrl() {
        return `http://${window.location.hostname}:8082`;
    },

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    parseAlbumFromPath(path) {
        const parts = path.split('/');
        const albumFolder = parts[parts.length - 2];
        const artist = parts[parts.length - 3];
        const match = albumFolder.match(/^(\d{4}) - (.+)$/);
        if (match) {
            return {
                year: match[1],
                title: match[2],
                artist: artist
            };
        }
        return {
            year: '',
            title: albumFolder,
            artist: artist
        };
    },

    shortenName(name, maxLength = 35) {
        if (name.length > maxLength) {
            return name.substring(0, maxLength - 3) + '...';
        }
        return name;
    }
};
