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
