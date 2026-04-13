const chatsToggleBtn = document.querySelector('.chats-toggle-btn');
const chatDropdownMenu = document.querySelector('.chat-dropdown-menu');

chatsToggleBtn.addEventListener('click', function() {
    chatDropdownMenu.classList.add('active');
    document.body.style.overflow = 'hidden'; 
});


function closeChatsMenu() {
    chatDropdownMenu.classList.remove('active');
    document.body.style.overflow = '';
}

chatDropdownMenu.addEventListener('click', function(e) {
    if (e.target === chatDropdownMenu) {
        closeChatsMenu();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && chatDropdownMenu.classList.contains('active')) {
        closeChatsMenu();
    }
});

document.querySelectorAll('.chat-dropdown-group-element').forEach(chatElement => {
    chatElement.addEventListener('click', function() {
        const chatName = this.querySelector('.chat-dropdown-group-element-name h4').textContent;
        console.log('Выбран чат:', chatName);
        closeChatsMenu();
    });
});

document.addEventListener('DOMContentLoaded', function() {
            const mediaButtons = document.querySelectorAll('.sidebar-media-group-btn');
            const mediaGroups = document.querySelectorAll('.media-group');
            
            mediaButtons.forEach(btn => {
                btn.addEventListener('click', function() {
                    // Убираем активный класс у всех кнопок
                    mediaButtons.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    
                    // Получаем тип медиа
                    const mediaType = this.dataset.media;
                    
                    // Скрываем все группы
                    mediaGroups.forEach(group => group.classList.remove('active'));
                    
                    // Показываем нужную группу
                    if (mediaType === 'files') {
                        document.querySelector('.sidebar-media-group-files').classList.add('active');
                    } else if (mediaType === 'images') {
                        document.querySelector('.sidebar-media-group-images').classList.add('active');
                    } else if (mediaType === 'links') {
                        document.querySelector('.sidebar-media-group-links').classList.add('active');
                    }
                });
            });

            // Клик по изображению
            document.querySelectorAll('.grid-image-item').forEach(item => {
                item.addEventListener('click', function() {
                    console.log('Открыть изображение');
                    // Здесь будет открытие просмотрщика
                });
            });

            // Клик по файлу
            document.querySelectorAll('.media-files-element').forEach(item => {
                item.addEventListener('click', function() {
                    console.log('Скачать файл:', this.querySelector('.media-files-element-name')?.textContent);
                });
            });
        });