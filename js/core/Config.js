const CONFIG = {
    CURRENT_PORT: window.location.port || (window.location.protocol === 'https:' ? 443 : 80),
    CURRENT_HOST: window.location.hostname,
    ROOT_PATH: '/mnt/video',
    MUSIC_PATH: '/mnt/media/music',
    get SERVER_URL() {
        return `http://${this.CURRENT_HOST}:${this.CURRENT_PORT}`;
    },
    get PLAYER_URL() {
        return `http://${this.CURRENT_HOST}:8082`;
    },
    API_ENDPOINTS: {
        get LIST() { return `${this.SERVER_URL}/api/list`; },
        get OPEN_FILE() { return `${this.SERVER_URL}/api/openfile`; },
        get PLAY() { return `${this.PLAYER_URL}/api/play`; },
        get PAUSE() { return `${this.PLAYER_URL}/api/pause`; },
        get FULLSCREEN() { return `${this.PLAYER_URL}/api/fullscreen`; },
        get CLOSE() { return `${this.PLAYER_URL}/api/close`; },
        get STATUS() { return `${this.PLAYER_URL}/api/status`; }
    }
};
