const App = {
    currentPage: 'video',
    loadedScripts: {
        video: false,
        audio: false
    },
    async init() {
        this.setupNavigation();
        this.setupMobileMenu();
        const pageContainer = document.getElementById('pageContainer');
        if (pageContainer) {
            pageContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка...</div>';
        }
        await this.loadPage('video');
    },
    setupNavigation() {
        const navVideo = document.getElementById('navVideo');
        const navAudio = document.getElementById('navAudio');
        if (navVideo) navVideo.addEventListener('click', () => this.loadPage('video'));
        if (navAudio) navAudio.addEventListener('click', () => this.loadPage('audio'));
    },
    async loadPage(page) {
        const pageContainer = document.getElementById('pageContainer');
        if (!pageContainer) return;
        const navVideo = document.getElementById('navVideo');
        const navAudio = document.getElementById('navAudio');
        if (navVideo) navVideo.classList.toggle('active', page === 'video');
        if (navAudio) navAudio.classList.toggle('active', page === 'audio');
        const audioPlayerBar = document.getElementById('audioPlayerBar');
        if (audioPlayerBar && page === 'video') {
            audioPlayerBar.style.display = 'none';
        }
        try {
            const response = await fetch(`pages/${page}.html`);
            if (!response.ok) throw new Error('Page not found');
            const html = await response.text();
            pageContainer.innerHTML = html;
            if (page === 'video') {
                const script = document.createElement('script');
                script.src = 'js/modules/video-explorer.js';
                script.onload = () => {
                    if (typeof VideoExplorer !== 'undefined') {
                        setTimeout(() => VideoExplorer.init(), 100);
                    }
                };
                document.body.appendChild(script);
            } else if (page === 'audio') {
                const script1 = document.createElement('script');
                script1.src = 'js/modules/album-library.js';
                const script2 = document.createElement('script');
                script2.src = 'js/modules/audio-player.js';
                script1.onload = () => {
                    script2.onload = () => {
                        if (typeof AlbumLibrary !== 'undefined') {
                            setTimeout(() => AlbumLibrary.init(), 100);
                        }
                        if (typeof AudioPlayer !== 'undefined') {
                            setTimeout(() => AudioPlayer.init(), 150);
                        }
                    };
                    document.body.appendChild(script2);
                };
                document.body.appendChild(script1);
            }
        } catch (error) {
            console.error('Error loading page:', error);
            pageContainer.innerHTML = '<div class="error">Ошибка загрузки страницы</div>';
        }
    },
    setupMobileMenu() {
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        const toggleMenu = () => {
            if (sidebar) sidebar.classList.toggle('open');
            if (sidebarOverlay) sidebarOverlay.classList.toggle('open');
        };
        if (menuToggle) menuToggle.addEventListener('click', toggleMenu);
        if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleMenu);
        document.querySelectorAll('.sidebar-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    toggleMenu();
                }
            });
        });
    },
    loadDirectory(path, mediaType) {
        if (mediaType === 'video' && typeof VideoExplorer !== 'undefined') {
            VideoExplorer.loadDirectory(path, true);
        }
    }
};
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
