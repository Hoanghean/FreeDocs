const apiKey = 'AIzaSyDIVYrmRkMY41_nkrlkoxoa8aYhsvgDjA0';
let folderId = new URLSearchParams(window.location.search).get('folderId') || '1RjJ6VZN58xETAIWJ-7uDOfHjoWzNB7Fs';
let searchQuery = new URLSearchParams(window.location.search).get('q') || '';
let pageToken = new URLSearchParams(window.location.search).get('pageToken') || '';

function buildSearchQuery(searchQuery, folderId) {
    try {
        const trimmedQuery = searchQuery.trim();
        if (!trimmedQuery) {
            return `'${folderId}' in parents and trashed=false`;
        }
        return `'${folderId}' in parents and name contains '${trimmedQuery.replace(/'/g, "\\'")}' and trashed=false`;
    } catch (e) {
        console.error('Lỗi trong buildSearchQuery:', e);
        return `'${folderId}' in parents and trashed=false`;
    }
}

function removeFileExtension(fileName) {
    try {
        if (!fileName.includes('.')) {
            return fileName;
        }
        return fileName.split('.').slice(0, -1).join('.');
    } catch (e) {
        console.error('Lỗi trong removeFileExtension:', e);
        return fileName;
    }
}

async function getFiles(apiKey, folderId, searchQuery = '', pageToken = '') {
    try {
        const query = buildSearchQuery(searchQuery, folderId);
        let url = `https://www.googleapis.com/drive/v3/files?key=${apiKey}&q=${encodeURIComponent(query)}&fields=nextPageToken,files(id,name,mimeType,thumbnailLink,webContentLink)&pageSize=12`;
        if (pageToken) {
            url += `&pageToken=${pageToken}`;
        }
        console.log('API URL:', url);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Gọi API thất bại: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (e) {
        console.error('Lỗi trong getFiles:', e);
        document.getElementById('errorMessage').textContent = 'Lỗi khi tải tài liệu, vui lòng thử lại.';
        return { files: [], nextPageToken: '' };
    }
}

function showDownloadSpinner(button) {
    const icon = button.querySelector('i');
    icon.classList.remove('fa-download');
    icon.classList.add('fa-spinner', 'fa-spin');
    button.classList.add('disabled');
}

function hideDownloadSpinner(button) {
    const icon = button.querySelector('i');
    icon.classList.remove('fa-spinner', 'fa-spin');
    icon.classList.add('fa-download');
    button.classList.remove('disabled');
}

function renderFiles(files, searchQuery, folderId, pageToken, nextPageToken) {
    const fileGrid = document.getElementById('fileGrid');
    const errorMessage = document.getElementById('errorMessage');
    fileGrid.innerHTML = '';
    errorMessage.textContent = '';

    if (!files || files.length === 0) {
        fileGrid.innerHTML = '<p class="text-gray-600">Không tìm thấy tài liệu nào.</p>';
        return;
    }

    files.forEach(file => {
        const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
        const div = document.createElement('div');
        div.className = 'bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition';
        div.innerHTML = `
            ${isFolder ? 
                `<div class="w-full h-32 bg-gray-200 rounded-md mb-2 flex items-center justify-center text-gray-500"><i class="fas fa-folder fa-2x"></i></div>` : 
                file.thumbnailLink ? 
                    `<img src="${file.thumbnailLink}" alt="Thumbnail" class="w-full h-32 object-cover rounded-md mb-2">` : 
                    `<div class="w-full h-32 bg-gray-200 rounded-md mb-2 flex items-center justify-center text-gray-500">No Thumbnail</div>`}
            <h3 class="text-sm font-medium text-gray-800 truncate">${removeFileExtension(file.name)}</h3>
            <div class="mt-2 flex space-x-2">
                ${isFolder ? 
                    `<a href="?folderId=${file.id}&q=${encodeURIComponent(searchQuery)}" class="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700 flex items-center"><i class="fas fa-folder-open mr-1"></i> Mở Folder</a>` : 
                    `<a href="${file.webContentLink}" class="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 flex items-center download-button" data-file-id="${file.id}">
                        <i class="fas fa-download mr-1"></i> Tải xuống
                    </a>
                    <button onclick="copyLink('${file.webContentLink}')" class="bg-gray-600 text-white px-3 py-1 rounded-md text-sm hover:bg-gray-700 flex items-center"><i class="fas fa-link mr-1"></i> Copy Link</button>`}
            </div>`;
        fileGrid.appendChild(div);
    });

    // Thêm sự kiện cho các nút tải xuống
    document.querySelectorAll('.download-button').forEach(button => {
        button.addEventListener('click', (e) => {
            showDownloadSpinner(button);
            setTimeout(() => {
                hideDownloadSpinner(button);
            }, 5555);
        });
    });

    const pagination = document.getElementById('pagination');
    pagination.innerHTML = `
        <a href="?q=${encodeURIComponent(searchQuery)}&folderId=${folderId}&pageToken=" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${pageToken ? '' : 'opacity-50 cursor-not-allowed'}" ${pageToken ? '' : 'disabled'}>Trang trước</a>
        <a href="?q=${encodeURIComponent(searchQuery)}&folderId=${folderId}&pageToken=${nextPageToken}" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${nextPageToken ? '' : 'opacity-50 cursor-not-allowed'}" ${nextPageToken ? '' : 'disabled'}>Trang sau</a>
    `;
}

function copyLink(link) {
    navigator.clipboard.writeText(link).then(() => {
        const toast = document.getElementById('toast');
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 2000);
    }).catch(err => console.error('Lỗi sao chép link:', err));
}

async function loadFiles() {
    const resultHeader = document.getElementById('resultHeader');
    resultHeader.textContent = searchQuery ? `Kết quả tìm kiếm cho "${searchQuery}"` : 'Tài liệu công khai';
    const data = await getFiles(apiKey, folderId, searchQuery, pageToken);
    renderFiles(data.files, searchQuery, folderId, pageToken, data.nextPageToken || '');
}

document.getElementById('searchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    searchQuery = document.getElementById('searchInput').value.trim();
    pageToken = '';
    const newUrl = `?q=${encodeURIComponent(searchQuery)}&folderId=${folderId}`;
    window.history.pushState({}, '', newUrl);
    await loadFiles();
});

let debounceTimer;
document.getElementById('searchInput').addEventListener('input', async function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
        searchQuery = this.value.trim();
        pageToken = '';
        const newUrl = `?q=${encodeURIComponent(searchQuery)}&folderId=${folderId}`;
        window.history.pushState({}, '', newUrl);
        await loadFiles();
    }, 1111); // Debounce 3 giây
});

window.addEventListener('popstate', async () => {
    const params = new URLSearchParams(window.location.search);
    folderId = params.get('folderId') || '1RjJ6VZN58xETAIWJ-7uDOfHjoWzNB7Fs';
    searchQuery = params.get('q') || '';
    pageToken = params.get('pageToken') || '';
    document.getElementById('searchInput').value = searchQuery;
    await loadFiles();
});

// Tải ban đầu
document.getElementById('searchInput').value = searchQuery;
loadFiles();
