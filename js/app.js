const App = {
    currentPath: CONFIG.ROOT_PATH,
    currentMediaType: 'video',
    sliderWrapper: null,
    isDragging: false,
    startY: 0,
    scrollTop: 0,
    pathHistory: [],
    init() {
        this.sliderWrapper = document.getElementById('sliderWrapper');
        PlayerManager.init();
        this.setupEventListeners();
        this.loadDirectory(CONFIG.ROOT_PATH, 'video');
        this.updateBackButton();
        this.updateBreadcrumbs();
    },
    setupEventListeners() {
        this.setupDragScroll();
        this.sliderWrapper.addEventListener('scroll', () => this.updateScrollIndicator());
        document.getElementById('backBtn').addEventListener('click', () => this.goBack());
    },
    goBack() {
        if (this.pathHistory.length > 0) {
            const previousPath = this.pathHistory.pop();
            this.loadDirectory(previousPath, this.currentMediaType);
        }
        this.updateBackButton();
    },
    updateBackButton() {
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.disabled = this.pathHistory.length === 0;
        }
    },
    updateBreadcrumbs() {
        const breadcrumbsContainer = document.getElementById('breadcrumbs');
        if (!breadcrumbsContainer) return;
        breadcrumbsContainer.innerHTML = '';
        const rootPath = this.currentMediaType === 'audio' ? CONFIG.MUSIC_PATH : CONFIG.ROOT_PATH;
        const rootIcon = this.currentMediaType === 'audio' ? 'fa-music' : 'fa-video';
        const rootTitle = this.currentMediaType === 'audio' ? 'Музыка' : 'Видео';
        const rootCrumbs = document.createElement('div');
        rootCrumbs.className = 'breadcrumb-item root-breadcrumb';
        rootCrumbs.innerHTML = `<i class="fas ${rootIcon}" title="${rootTitle}"></i>`;
        rootCrumbs.addEventListener('click', (e) => {
            e.stopPropagation();
            this.loadDirectory(rootPath, this.currentMediaType);
        });
        breadcrumbsContainer.appendChild(rootCrumbs);
        if (this.currentPath === rootPath) return;
        let relativePath = this.currentPath.substring(rootPath.length);
        if (relativePath.startsWith('/')) relativePath = relativePath.substring(1);
        const pathParts = relativePath.split('/').filter(part => part.length > 0);
        let currentFullPath = rootPath;
        pathParts.forEach((part, index) => {
            currentFullPath += '/' + part;
            const crumb = document.createElement('div');
            crumb.className = 'breadcrumb-item';
            crumb.innerHTML = `<i class="fas fa-folder" title="${part}"></i>`;
            if (index === pathParts.length - 1) {
                crumb.classList.add('active');
            } else {
                crumb.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.loadDirectory(currentFullPath, this.currentMediaType);
                });
            }
            breadcrumbsContainer.appendChild(crumb);
        });
    },
     setupDragScroll() {
          this.sliderWrapper.addEventListener('mousedown', (e) => {
              this.isDragging = true;
              this.startY = e.pageY - this.sliderWrapper.offsetTop;
              this.scrollTop = this.sliderWrapper.scrollTop;
              this.sliderWrapper.style.cursor = 'grabbing';
          });
          this.sliderWrapper.addEventListener('mouseleave', () => {
              this.isDragging = false;
              this.sliderWrapper.style.cursor = 'grab';
          });
          this.sliderWrapper.addEventListener('mouseup', () => {
              this.isDragging = false;
              this.sliderWrapper.style.cursor = 'grab';
          });
          this.sliderWrapper.addEventListener('mousemove', (e) => {
              if (!this.isDragging) return;
              e.preventDefault();
              const y = e.pageY - this.sliderWrapper.offsetTop;
              const walk = (y - this.startY) * 2;
              this.sliderWrapper.scrollTop = this.scrollTop - walk;
              this.updateScrollIndicator();
          });
          this.sliderWrapper.addEventListener('dragstart', (e) => {
              e.preventDefault();
          });
    },
    async loadDirectory(path, mediaType = 'video') {
        if (this.currentPath !== path) {
            this.pathHistory.push(this.currentPath);
        }
        this.currentPath = path;
        this.currentMediaType = mediaType;
        this.updateBreadcrumbs();
        const sliderContent = document.getElementById('sliderContent');
        sliderContent.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin" style="margin-right: 10px;"></i>Загрузка...</div>';
        if (!Utils.isOnline()) {
            console.log('Offline mode: loading cached data');
            const cached = Utils.getCachedState(path);
            if (cached && cached.items) {
                this.displayItems(cached.items, mediaType);
                Utils.showNotification('Работа в офлайн-режиме (загружено из кэша)', 'info');
            } else {
                sliderContent.innerHTML = '<div class="error"><i class="fas fa-wifi-slash"></i> Нет подключения к интернету и нет кэшированных данных</div>';
            }
            this.updateBackButton();
            return;
        }
        try {
            console.log('Loading path:', path);
            const response = await fetch(CONFIG.API_ENDPOINTS.LIST, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: path })
            });
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            const data = await response.json();
            console.log('Received data:', data);
            if (data.success) {
                const visibleItems = data.items.filter(item => !Utils.isHiddenFile(item.name));
                console.log('Visible items:', visibleItems);
                Utils.cacheCurrentState(path, visibleItems);
                this.displayItems(visibleItems, mediaType);
            } else {
                const cached = Utils.getCachedState(path);
                if (cached && cached.items) {
                    this.displayItems(cached.items, mediaType);
                    Utils.showNotification('Загружено из кэша (сервер недоступен)', 'info');
                } else {
                    sliderContent.innerHTML = `<div class="error"><i class="fas fa-exclamation-triangle" style="margin-right: 10px;"></i>Ошибка: ${data.error}</div>`;
                }
            }
        } catch (error) {
            console.error('Load error:', error);
            const cached = Utils.getCachedState(path);
            if (cached && cached.items) {
                this.displayItems(cached.items, mediaType);
                Utils.showNotification('Загружено из кэша (ошибка сети)', 'info');
            } else {
                sliderContent.innerHTML = `<div class="error"><i class="fas fa-exclamation-circle" style="margin-right: 10px;"></i>Ошибка загрузки: ${error.message}</div>`;
                const retryBtn = document.createElement('button');
                retryBtn.className = 'retry-btn';
                retryBtn.innerHTML = '<i class="fas fa-redo-alt"></i> Повторить';
                retryBtn.onclick = () => this.loadDirectory(path, mediaType);
                sliderContent.querySelector('.error')?.appendChild(retryBtn);
            }
        }
        this.updateBackButton();
    },
    displayItems(items, mediaType = 'video') {
        const sliderContent = document.getElementById('sliderContent');
        sliderContent.innerHTML = '';
        if (items.length === 0) {
            sliderContent.innerHTML = '<div class="empty-message"><i class="fas fa-folder-open" style="margin-right: 10px;"></i>📁 Папка пуста</div>';
            return;
        }
        let displayItems = items;
        if (mediaType === 'audio') {
            displayItems = items.filter(item =>
                item.isDirectory || Utils.isAudioFile(item.name)
            );
        } else {
            displayItems = items.filter(item =>
                item.isDirectory || Utils.isVideoFile(item.name)
            );
        }
        displayItems.forEach(item => {
            const card = this.createItemCard(item, mediaType);
            sliderContent.appendChild(card);
        });
        this.sliderWrapper.scrollTop = 0;
        this.updateScrollIndicator();
    },
    createItemCard(item, mediaType) {
        const card = document.createElement('div');
        card.className = 'item-card';
        let icon = 'fa-file';
        let iconClass = 'file-icon';
        if (item.isDirectory) {
            icon = 'fa-folder';
            iconClass = 'folder-icon';
        } else {
            if (Utils.isVideoFile(item.name)) {
                icon = 'fa-file-video';
                iconClass = 'video-icon';
            } else if (Utils.isAudioFile(item.name)) {
                icon = 'fa-file-audio';
                iconClass = 'audio-icon';
            } else {
                icon = 'fa-file';
                iconClass = 'file-icon';
            }
        }
        card.innerHTML = `
            <i class="fas ${icon} ${iconClass}"></i>
            <div class="item-info">
                <div class="item-name" title="${item.name}">${item.name}</div>
                <div class="item-path" title="${item.path}">${item.path}</div>
            </div>
        `;
        if (item.isDirectory) {
            card.onclick = () => this.loadDirectory(item.path, mediaType);
        } else {
            card.onclick = () => PlayerManager.playMedia(item.path);
        }
        return card;
    },
    updateScrollIndicator() {
        const scrollPercent = (this.sliderWrapper.scrollTop /
            (this.sliderWrapper.scrollHeight - this.sliderWrapper.clientHeight)) * 100;
        const indicatorBar = document.getElementById('scrollIndicatorBar');
        if (indicatorBar) {
            indicatorBar.style.height = scrollPercent + '%';
        }
    }
};
document.addEventListener('DOMContentLoaded', () => App.init());
