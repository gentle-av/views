const VideoExplorer = {
    currentPath: '/mnt/video',
    history: [],

    getServerUrl() {
        return `http://${window.location.hostname}:${window.location.port}`;
    },

    async init() {
        const videoContent = document.getElementById('videoContent');
        if (videoContent) {
            if (typeof PlayerManager !== 'undefined' && PlayerManager.init) {
                PlayerManager.init();
            }
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
            <div class="item-card" data-path="${item.path}" data-is-dir="${item.isDirectory}" data-name="${Utils.escapeHtml(item.name)}">
                <i class="fas ${item.isDirectory ? 'fa-folder folder-icon' : 'fa-file-video video-icon'}"></i>
                <div class="item-name" title="${Utils.escapeHtml(item.name)}">${Utils.escapeHtml(Utils.shortenName(item.name))}</div>
                ${!item.isDirectory ? `<div class="item-size">${item.size || ''}</div>` : ''}
            </div>
        `).join('');
        document.querySelectorAll('.item-card').forEach(card => {
            card.addEventListener('click', async (e) => {
                e.stopPropagation();
                const path = card.dataset.path;
                const isDir = card.dataset.isDir === 'true';
                const fileName = card.dataset.name || path.split('/').pop();
                console.log('Card clicked:', { path, isDir, fileName });
                if (isDir) {
                    await this.loadDirectory(path, true);
                } else {
                    console.log('Calling playVideo with path:', path);
                    await this.playVideo(path, fileName);
                }
            });
        });
    },

    async playVideo(path, fileName = null) {
        console.log('playVideo called with path:', path);
        const displayName = fileName || path.split('/').pop();

        try {
            if (typeof PlayerManager === 'undefined') {
                console.error('PlayerManager is not defined');
                Utils.showNotification('Плеер недоступен', 'error');
                return;
            }

            console.log('PlayerManager exists, calling playMedia');
            await PlayerManager.playMedia(path);
            console.log('playMedia completed successfully');

        } catch (error) {
            console.error('Error playing video:', error);
            Utils.showNotification(`Ошибка воспроизведения: ${error.message || 'неизвестная ошибка'}`, 'error');

            try {
                console.log('Trying fallback via /api/open...');
                const response = await fetch(`${this.getServerUrl()}/api/open`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: path })
                });
                const data = await response.json();
                console.log('Fallback response:', data);
                if (data.success) {
                    Utils.showNotification(`Воспроизведение: ${displayName}`, 'success');
                } else {
                    Utils.showNotification(data.error || 'Ошибка воспроизведения', 'error');
                }
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                Utils.showNotification('Ошибка подключения к серверу', 'error');
            }
        }
    },

    updateBreadcrumbs() {
        const breadcrumbs = document.getElementById('videoBreadcrumbs');
        if (!breadcrumbs) return;
        breadcrumbs.innerHTML = '';
        const rootPath = '/mnt/video';
        const rootBreadcrumb = document.createElement('div');
        rootBreadcrumb.className = 'breadcrumb-root';
        rootBreadcrumb.innerHTML = '<i class="fas fa-film"></i><span>Главная</span>';
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
            crumb.innerHTML = `<i class="fas fa-folder"></i><span class="breadcrumb-text" title="${Utils.escapeHtml(part)}">${Utils.escapeHtml(part)}</span>`;
            if (i === pathParts.length - 1) {
                crumb.classList.add('active');
            } else {
                crumb.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.loadDirectory(currentPath, true);
                });
            }
            breadcrumbs.appendChild(crumb);
        }
    }
};
