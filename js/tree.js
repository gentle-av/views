const TreeManager = {
    treeContainer: null,
    currentPath: CONFIG.ROOT_PATH,
    currentMediaType: 'video', // 'video' или 'audio'

    init() {
        this.treeContainer = document.getElementById('treeContainer');
    },

    async loadTreeData(mediaType = null) {
        if (!this.treeContainer) return;
        if (mediaType) {
            this.currentMediaType = mediaType;
            this.currentPath = mediaType === 'video' ? CONFIG.ROOT_PATH : CONFIG.MUSIC_PATH;
        }
        this.treeContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--fg3);">Загрузка дерева папок...</div>';
        try {
            const videoResponse = await fetch(CONFIG.API_ENDPOINTS.LIST, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: CONFIG.ROOT_PATH })
            });
            const musicResponse = await fetch(CONFIG.API_ENDPOINTS.LIST, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: CONFIG.MUSIC_PATH })
            });
            const videoData = await videoResponse.json();
            const musicData = await musicResponse.json();
            if (videoData.success && musicData.success) {
                this.buildTree(videoData.items, musicData.items);
            } else {
                this.showError('Ошибка загрузки дерева');
            }
        } catch (error) {
            this.showError(`Ошибка: ${error.message}`);
        }
    },

    buildTree(videoItems, musicItems) {
        if (!this.treeContainer) return;
        const videoFolders = videoItems.filter(item => item.isDirectory && !Utils.isHiddenFile(item.name));
        const musicFolders = musicItems.filter(item => item.isDirectory && !Utils.isHiddenFile(item.name));
        let html = '<div class="tree-root">';
        html += `
            <div class="tree-group">
                <div class="tree-group-header ${this.currentMediaType === 'video' ? 'active' : ''}"
                     onclick="TreeManager.switchMediaType('video')">
                    <i class="fas fa-video"></i>
                    <span>Видео</span>
                    <span class="group-count">${videoFolders.length}</span>
                </div>
                <div class="tree-children ${this.currentMediaType === 'video' ? 'expanded' : ''}">
        `;
        html += `
            <div class="tree-item" data-path="${CONFIG.ROOT_PATH}" data-type="video">
                <div class="tree-item-content ${this.currentPath === CONFIG.ROOT_PATH && this.currentMediaType === 'video' ? 'active' : ''}"
                     onclick="TreeManager.navigateFromTree('${CONFIG.ROOT_PATH}', 'video')">
                    <i class="fas fa-folder-open"></i>
                    <span>video</span>
                </div>
            </div>
        `;
        videoFolders.forEach(folder => {
            html += `
                <div class="tree-item" data-path="${folder.path}" data-type="video">
                    <div class="tree-item-content ${this.currentPath === folder.path && this.currentMediaType === 'video' ? 'active' : ''}"
                         onclick="TreeManager.navigateFromTree('${folder.path}', 'video')">
                        <i class="fas fa-folder"></i>
                        <span title="${folder.path}">${folder.name}</span>
                    </div>
                </div>
            `;
        });
        html += '</div></div>'; // Закрываем группу видео
        html += `
            <div class="tree-group">
                <div class="tree-group-header ${this.currentMediaType === 'audio' ? 'active' : ''}"
                     onclick="TreeManager.switchMediaType('audio')">
                    <i class="fas fa-music"></i>
                    <span>Музыка</span>
                    <span class="group-count">${musicFolders.length}</span>
                </div>
                <div class="tree-children ${this.currentMediaType === 'audio' ? 'expanded' : ''}">
        `;
        html += `
            <div class="tree-item" data-path="${CONFIG.MUSIC_PATH}" data-type="audio">
                <div class="tree-item-content ${this.currentPath === CONFIG.MUSIC_PATH && this.currentMediaType === 'audio' ? 'active' : ''}"
                     onclick="TreeManager.navigateFromTree('${CONFIG.MUSIC_PATH}', 'audio')">
                    <i class="fas fa-folder-music"></i>
                    <span>music</span>
                </div>
            </div>
        `;
        musicFolders.forEach(folder => {
            html += `
                <div class="tree-item" data-path="${folder.path}" data-type="audio">
                    <div class="tree-item-content ${this.currentPath === folder.path && this.currentMediaType === 'audio' ? 'active' : ''}"
                         onclick="TreeManager.navigateFromTree('${folder.path}', 'audio')">
                        <i class="fas fa-folder"></i>
                        <span title="${folder.path}">${folder.name}</span>
                    </div>
                </div>
            `;
        });
        html += '</div></div></div>'; // Закрываем все
        this.treeContainer.innerHTML = html;
    },

    switchMediaType(type) {
        this.currentMediaType = type;
        this.currentPath = type === 'video' ? CONFIG.ROOT_PATH : CONFIG.MUSIC_PATH;
        App.loadDirectory(this.currentPath, type);
        this.updateActiveItem(this.currentPath);
    },

    navigateFromTree(path, type) {
        this.currentPath = path;
        this.currentMediaType = type;
        App.loadDirectory(path, type);
        this.updateActiveItem(path);
        if (window.innerWidth <= 768) {
            document.getElementById('leftPanel').classList.remove('visible');
        }
    },

    updateActiveItem(path) {
        this.currentPath = path;
        if (document.getElementById('leftPanel').classList.contains('visible')) {
            document.querySelectorAll('.tree-item-content').forEach(el => {
                el.classList.remove('active');
            });
            const activeItem = document.querySelector(`.tree-item[data-path="${path}"] .tree-item-content`);
            if (activeItem) {
                activeItem.classList.add('active');
            }
            document.querySelectorAll('.tree-group-header').forEach(header => {
                header.classList.remove('active');
            });
            const activeGroup = document.querySelector(`.tree-group-header[onclick*="'${this.currentMediaType}'"]`);
            if (activeGroup) {
                activeGroup.classList.add('active');
            }
        }
    },

    showError(message) {
        if (this.treeContainer) {
            this.treeContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--red);">${message}</div>`;
        }
    }
};
