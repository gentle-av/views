const App = {
    currentPage: 'video',

    init() {
        this.setupNavigation();

        // Initialize modules
        VideoExplorer.init();
        AlbumLibrary.init();
        AudioPlayer.init();
        PlayerManager.init();

        this.showPage('video');

        // Setup mobile menu
        this.setupMobileMenu();
    },

    setupNavigation() {
        const navVideo = document.getElementById('navVideo');
        const navAudio = document.getElementById('navAudio');

        if (navVideo) navVideo.addEventListener('click', () => this.showPage('video'));
        if (navAudio) navAudio.addEventListener('click', () => this.showPage('audio'));
    },

    showPage(page) {
        this.currentPage = page;

        const pageVideo = document.getElementById('pageVideo');
        const pageAudio = document.getElementById('pageAudio');
        const navVideo = document.getElementById('navVideo');
        const navAudio = document.getElementById('navAudio');

        if (pageVideo) pageVideo.classList.toggle('hidden', page !== 'video');
        if (pageAudio) pageAudio.classList.toggle('hidden', page !== 'audio');
        if (navVideo) navVideo.classList.toggle('active', page === 'video');
        if (navAudio) navAudio.classList.toggle('active', page === 'audio');

        if (page === 'audio' && typeof AlbumLibrary !== 'undefined') {
            AlbumLibrary.renderAlbums();
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
        } else if (mediaType === 'audio' && typeof AlbumLibrary !== 'undefined') {
            // Handle audio directory navigation if needed
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
