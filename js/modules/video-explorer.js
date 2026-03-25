const VideoExplorer = {
    currentPath: '/mnt/video',
    history: [],
    getServerUrl() {
        return `http://${window.location.hostname}:${window.location.port}`;
    },
    async init() {
        const videoContent = document.getElementById('videoContent');
        if (videoContent) {
            await this.loadDirectory(this.currentPath);
        }
    },
    async loadDirectory(path, addToHistory = true) {
        const videoContent = document.getElementById('videoContent');
        if (!videoContent) {
            console.error('videoContent element not found');
            return;
        }
        console.log('loadDirectory called with path:', path);
        if (addToHistory && this.currentPath && this.currentPath !== path) {
            this.history.push(this.currentPath);
        }
        this.currentPath = path;
        this.updateBreadcrumbs();
        videoContent.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка...</div>';
        const url = `${this.getServerUrl()}/api/list`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: path })
            });
            const data = await response.json();
            if (data.success) {
                this.renderContent(data.items);
            } else {
                videoContent.innerHTML = `<div class="empty"><i class="fas fa-exclamation-triangle"></i> ${data.error || 'Ошибка загрузки'}</div>`;
            }
        } catch (error) {
            console.error('Error loading directory:', error);
            videoContent.innerHTML = '<div class="empty"><i class="fas fa-wifi"></i> Ошибка подключения к серверу: ' + error.message + '</div>';
        }
    },
    renderContent(items) {
        const content = document.getElementById('videoContent');
        if (!content) return;
        const visibleItems = items.filter(item => !Utils.isHiddenFile(item.name));
        if (visibleItems.length === 0) {
            content.innerHTML = '<div class="empty"><i class="fas fa-folder-open"></i> Папка пуста</div>';
            return;
        }
        content.innerHTML = visibleItems.map(item => `
            <div class="item-card" data-path="${item.path}" data-is-dir="${item.isDirectory}">
                <i class="fas ${item.isDirectory ? 'fa-folder folder-icon' : 'fa-file-video video-icon'}"></i>
                <div class="item-name" title="${Utils.escapeHtml(item.name)}">${Utils.escapeHtml(Utils.shortenName(item.name))}</div>
                ${!item.isDirectory ? `<div class="item-size">${item.size || ''}</div>` : ''}
            </div>
        `).join('');
        document.querySelectorAll('.item-card').forEach(card => {
            card.addEventListener('click', () => {
                const path = card.dataset.path;
                const isDir = card.dataset.isDir === 'true';
                if (isDir) {
                    this.loadDirectory(path, true);
                } else {
                    this.playVideo(path);
                }
            });
        });
    },
    async playVideo(path) {
        try {
            if (typeof PlayerManager !== 'undefined') {
                await PlayerManager.playMedia(path);
            } else {
                const response = await fetch(`${this.getServerUrl()}/api/open`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: path })
                });
                const data = await response.json();
                if (data.success) {
                    Utils.showNotification(`Воспроизведение: ${path.split('/').pop()}`, 'success');
                } else {
                    Utils.showNotification(data.error || 'Ошибка воспроизведения', 'error');
                }
            }
        } catch (error) {
            console.error('Error playing video:', error);
            Utils.showNotification('Ошибка подключения к серверу', 'error');
        }
    },
    updateBreadcrumbs() {
        const breadcrumbs = document.getElementById('videoBreadcrumbs');
        if (!breadcrumbs) return;
        breadcrumbs.innerHTML = '';
        const rootPath = '/mnt/video';
        const rootBreadcrumb = document.createElement('div');
        rootBreadcrumb.className = 'breadcrumb-root';
        rootBreadcrumb.innerHTML = '<i class="fas fa-film" title="Корневая папка видео"></i>';
        rootBreadcrumb.addEventListener('click', () => {
            this.loadDirectory(rootPath, true);
        });
        breadcrumbs.appendChild(rootBreadcrumb);
        if (this.currentPath === rootPath) return;
        let relativePath = this.currentPath.substring(rootPath.length);
        if (relativePath.startsWith('/')) relativePath = relativePath.substring(1);
        const pathParts = relativePath.split('/').filter(part => part.length > 0);
        let currentPath = rootPath;
        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            currentPath += '/' + part;
            const crumb = document.createElement('div');
            crumb.className = 'breadcrumb';
            if (i === pathParts.length - 1) {
                crumb.innerHTML = `<i class="fas fa-folder"></i><span class="breadcrumb-text" title="${Utils.escapeHtml(part)}">${Utils.escapeHtml(Utils.shortenName(part))}</span>`;
                crumb.classList.add('active');
            } else {
                crumb.innerHTML = `<i class="fas fa-folder"></i>`;
                crumb.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.loadDirectory(currentPath, true);
                });
            }
            breadcrumbs.appendChild(crumb);
        }
    }
};
