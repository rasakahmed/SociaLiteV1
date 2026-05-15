import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Posts
export const postsAPI = {
  getFeed: (page = 1, limit = 10) => api.get(`/posts/feed?page=${page}&limit=${limit}`),
  create: (formData) => api.post('/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getById: (id) => api.get(`/posts/${id}`),
  delete: (id) => api.delete(`/posts/${id}`),
  getByUser: (userId, page = 1) => api.get(`/posts/user/${userId}?page=${page}`),
  edit: (id, content) => api.put(`/posts/${id}`, { content }),
  report: (id, reason, description) => api.post(`/posts/${id}/report`, { reason, description }),
};

// Comments
export const commentsAPI = {
  getByPost: (postId) => api.get(`/posts/${postId}/comments`),
  create: (postId, content, parent_id = null) => api.post(`/posts/${postId}/comments`, { content, parent_id }),
  delete: (id) => api.delete(`/comments/${id}`),
  like: (id) => api.post(`/comments/${id}/like`),
};

// Likes
export const likesAPI = {
  toggle: (postId) => api.post(`/posts/${postId}/like`),
};

// Friends
export const friendsAPI = {
  sendRequest: (userId) => api.post(`/friends/request/${userId}`),
  accept: (requestId) => api.put(`/friends/accept/${requestId}`),
  reject: (requestId) => api.put(`/friends/reject/${requestId}`),
  getList: () => api.get('/friends'),
  getRequests: () => api.get('/friends/requests'),
  getStatus: (userId) => api.get(`/friends/status/${userId}`),
  getSuggestions: () => api.get('/friends/suggestions'),
  getMutual: (userId) => api.get(`/friends/mutual/${userId}`),
  removeFriend: (userId) => api.delete(`/friends/${userId}`),
};

// Notifications
export const notificationsAPI = {
  getAll: (page = 1) => api.get(`/notifications?page=${page}`),
  markAllRead: () => api.put('/notifications/read'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};

// Users
export const usersAPI = {
  search: (query) => api.get(`/users/search?q=${encodeURIComponent(query)}`),
  getProfile: (id) => api.get(`/users/${id}`),
  updateProfile: (data) => api.put('/users/profile', data),
  uploadAvatar: (formData) => api.post('/users/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  block: (id) => api.post(`/users/block/${id}`),
  unblock: (id) => api.delete(`/users/block/${id}`),
  getBlocked: () => api.get('/users/blocked'),
};

export default api;
