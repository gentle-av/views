// Утилиты и общие функции
const Utils = {
    isHiddenFile(filename) {
        return filename.startsWith('.');
    },

    getHiddenWord(count) {
        if (count % 10 === 1 && count % 100 !== 11) return 'элемент';
        if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'элемента';
        return 'элементов';
    },

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    },

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    addToHistory(path, status) {
        if (!this.history) this.history = [];
        const fileName = path.split('/').pop();
        const time = new Date().toLocaleTimeString();

        this.history.unshift({
            path: path,
            name: fileName,
            time: time,
            status: status,
            timestamp: Date.now()
        });

        if (this.history.length > 10) {
            this.history.pop();
        }
    },
    getBaseUrl() {
        const host = window.location.hostname;
        return `http://${host}`;
    },
    getServerUrl() {
        return `${this.getBaseUrl()}:${CONFIG.SERVER_PORT}`;
    },
    getPlayerUrl() {
        return `${this.getBaseUrl()}:${CONFIG.PLAYER_PORT}`;
    }
};

const CONFIG = {
    ROOT_PATH: '/mnt/video',
    SERVER_PORT: 8083,  // Порт веб-интерфейса
    PLAYER_PORT: 8082,  // Порт плеера
    API_ENDPOINTS: {
        LIST: '/api/list',
        OPEN_FILE: '/api/openfile',
        PLAY: '/api/play',
        PAUSE: '/api/pause',
        FULLSCREEN: '/api/fullscreen',
        CLOSE: '/api/close',
        STATUS: '/api/status'
    }
};
