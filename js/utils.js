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
    },

    getMediaTypeFromPath(path) {
        const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg'];
        const audioExtensions = ['.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a', '.wma', '.opus'];
        const lowerPath = path.toLowerCase();
        if (lowerPath.includes('/music/') || lowerPath.includes('/музыка/') ||
            lowerPath.includes('/audio/') || lowerPath.startsWith(CONFIG.MUSIC_PATH)) {
            return 'audio';
        }
        const ext = lowerPath.substring(lowerPath.lastIndexOf('.'));
        if (videoExtensions.includes(ext)) return 'video';
        if (audioExtensions.includes(ext)) return 'audio';

        return 'unknown';
    },
    isVideoFile(filename) {
        const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg'];
        const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
        return videoExtensions.includes(ext);
    },
    isAudioFile(filename) {
        const audioExtensions = ['.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a', '.wma', '.opus'];
        const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
        return audioExtensions.includes(ext);
    }
};

const CONFIG = {
    ROOT_PATH: '/mnt/video',
    MUSIC_PATH: '/mnt/music',
    SERVER_PORT: 8083,
    PLAYER_PORT: 8082,
    API_ENDPOINTS: {
        LIST: 'http://' + window.location.hostname + ':8083/api/list',
        OPEN_FILE: 'http://' + window.location.hostname + ':8083/api/openfile',
        PLAY: 'http://' + window.location.hostname + ':8082/api/play',
        PAUSE: 'http://' + window.location.hostname + ':8082/api/pause',
        FULLSCREEN: 'http://' + window.location.hostname + ':8082/api/fullscreen',
        CLOSE: 'http://' + window.location.hostname + ':8082/api/close',
        STATUS: 'http://' + window.location.hostname + ':8082/api/status'
    }
};
