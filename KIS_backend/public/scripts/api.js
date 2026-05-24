// API клиент для работы с бэкендом
const API_URL = 'http://localhost:3000/api';

// Хранилище токена
let authToken = localStorage.getItem('token');

// Сохранение токена
function setToken(token) {
    authToken = token;
    if (token) {
        localStorage.setItem('token', token);
    } else {
        localStorage.removeItem('token');
    }
}

// Базовый запрос с авторизацией
async function request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    try {
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            // Если аккаунт заблокирован
            if (response.status === 403 && data.error && data.error.includes('заблокирована')) {
                setToken(null);
                // Редирект на страницу логина с сообщением
                window.location.href = '/html/login.html?error=blocked';
                return Promise.reject(new Error(data.error));
            }
            
            // Если неавторизован
            if (response.status === 401) {
                setToken(null);
                if (!window.location.pathname.includes('/login.html')) {
                    window.location.href = '/html/login.html?error=unauthorized';
                }
                return Promise.reject(new Error('Сессия истекла'));
            }
            
            throw new Error(data.error || 'Request failed');
        }
        
        return data;
    } catch (error) {
        console.error('Request error:', error);
        throw error;
    }
}

// API методы
const api = {
    auth: {
        register: (userData) => request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        }),
        
        login: async (emailOrUsername, password) => {
            try {
                const result = await request('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ emailOrUsername, password })
                });
                if (result.token) {
                    setToken(result.token);
                }
                return result;
            } catch (error) {
                // Пробрасываем ошибку дальше
                throw error;
            }
        },
        
        logout: () => {
            setToken(null);
            return request('/auth/logout', { method: 'POST' }).catch(() => ({}));
        },
        
        getMe: () => request('/auth/me')
    },
    
    users: {
        getAll: (search = '') => request(`/users${search ? `?search=${search}` : ''}`),
        getById: (id) => request(`/users/${id}`),
        getContacts: () => request('/users/contacts'),
        addContact: (userId) => request(`/users/contacts/${userId}`, { method: 'POST' }),
        removeContact: (userId) => request(`/users/contacts/${userId}`, { method: 'DELETE' })
    },
    
    chats: {
        getAll: () => request('/chats'),
        getById: (chatId) => request(`/chats/${chatId}`),
        create: (userIds, name = null, isGroup = false) => request('/chats', {
            method: 'POST',
            body: JSON.stringify({ userIds, name, isGroup })
        }),
        getMessages: (chatId, limit = 50, offset = 0) => 
            request(`/chats/${chatId}/messages?limit=${limit}&offset=${offset}`),
        sendMessage: (chatId, content) => request(`/chats/${chatId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content })
        })
    }
};

// Проверяем токен при загрузке
if (authToken) {
    api.auth.getMe().catch(() => {
        setToken(null);
    });
}