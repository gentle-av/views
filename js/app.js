const App = {
    currentPage: 'video',
    loadedScripts: {
        video: false,
        audio: false
    },
    async init() {
        const serverAvailable = await this.checkServerAvailability();
        if (!serverAvailable) {
            const pageContainer = document.getElementById('pageContainer');
            if (pageContainer) {
                pageContainer.innerHTML = `
                    <div class="error">
                        <i class="fas fa-exclamation-triangle"></i>
                        Сервер недоступен. Убедитесь, что бэкенд запущен.
                    </div>
                `;
            }
            return;
        }
        this.setupNavigation();
        this.setupMobileMenu();
        this.showProfileIndicator();
        if (typeof PlayerManager !== 'undefined') {
            PlayerManager.init();
        }
        const pageContainer = document.getElementById('pageContainer');
        if (pageContainer) {
            pageContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка...</div>';
        }
        await this.loadPage('video');
    },
    async checkServerAvailability() {
        try {
            const response = await fetch(`${Utils.getServerUrl()}/api/list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: '/mnt/video' })
            });
            return response.ok;
        } catch (error) {
            console.warn('Server not available:', error);
            return false;
        }
    },
    showProfileIndicator() {
        const indicator = document.getElementById('profileIndicator');
        if (!indicator) return;
        const port = window.location.port;
        const profile = port === '9093' ? 'тестовая' : 'продуктовая';
        const color = port === '9093' ? 'var(--orange)' : 'var(--green)';
        indicator.innerHTML = `
            <div style="font-size: 0.7rem; margin-top: 5px; padding: 2px 8px; background: ${color}20; border-radius: 12px; color: ${color};">
                <i class="fas ${port === '9093' ? 'fa-flask' : 'fa-check-circle'}"></i>
                ${profile} (порт ${port})
            </div>
        `;
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
                const script3 = document.createElement('script');
                script3.src = 'js/modules/playlist-viewer.js';
                script1.onload = () => {
                    script2.onload = () => {
                        script3.onload = () => {
                            if (typeof AlbumLibrary !== 'undefined') {
                                setTimeout(() => AlbumLibrary.init(), 100);
                            }
                            if (typeof AudioPlayer !== 'undefined') {
                                setTimeout(() => AudioPlayer.init(), 150);
                            }
                            if (typeof PlaylistViewer !== 'undefined') {
                                setTimeout(() => PlaylistViewer.init(), 200);
                            }
                        };
                        document.body.appendChild(script3);
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
