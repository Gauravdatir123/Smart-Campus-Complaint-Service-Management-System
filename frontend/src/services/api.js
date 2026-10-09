import axios from "axios";

const TOKEN_KEY = "smartcampus_token";

export const tokenStore = {
    get: () => localStorage.getItem(TOKEN_KEY),
    set: (t) => localStorage.setItem(TOKEN_KEY, t),
    clear: () => localStorage.removeItem(TOKEN_KEY)
};

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api",
    timeout: 30000
});

// Attach the JWT to every request
api.interceptors.request.use((config) => {
    const token = tokenStore.get();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// If the token is rejected (expired / user removed) log the user out
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

api.interceptors.response.use(
    (res) => res,
    (error) => {
        const url = error.config?.url || "";
        const isAuthCall = url.startsWith("/auth/login") || url.startsWith("/auth/register");
        if (error.response?.status === 401 && !isAuthCall) onUnauthorized();
        return Promise.reject(error);
    }
);

// Build multipart form data, skipping empty values
const toFormData = (fields, file, fileField = "image") => {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") fd.append(k, v);
    });
    if (file) fd.append(fileField, file);
    return fd;
};

const data = (res) => res.data;

export const authApi = {
    register: (body) => api.post("/auth/register", body).then(data),
    login: (body) => api.post("/auth/login", body).then(data),
    me: () => api.get("/auth/me").then(data),
    updateMe: (body) => api.put("/auth/me", body).then(data)
};

export const complaintApi = {
    list: (params) => api.get("/complaints", { params }).then(data),
    stats: () => api.get("/complaints/stats").then(data),
    get: (id) => api.get(`/complaints/${id}`).then(data),
    create: (fields, file) => api.post("/complaints", toFormData(fields, file)).then(data),
    update: (id, fields, file) => api.put(`/complaints/${id}`, toFormData(fields, file)).then(data),
    remove: (id) => api.delete(`/complaints/${id}`).then(data),
    setStatus: (id, fields, file) => api.put(`/complaints/${id}/status`, toFormData(fields, file)).then(data)
};

export const adminApi = {
    dashboard: () => api.get("/admin/dashboard").then(data),
    assign: (id, body) => api.put(`/admin/complaints/${id}/assign`, body).then(data),
    users: (params) => api.get("/admin/users", { params }).then(data),
    createUser: (body) => api.post("/admin/users", body).then(data),
    updateUser: (id, body) => api.put(`/admin/users/${id}`, body).then(data),
    deleteUser: (id) => api.delete(`/admin/users/${id}`).then(data)
};

export const departmentApi = {
    list: () => api.get("/departments").then(data),
    create: (body) => api.post("/departments", body).then(data),
    update: (id, body) => api.put(`/departments/${id}`, body).then(data),
    remove: (id) => api.delete(`/departments/${id}`).then(data)
};

export const feedbackApi = {
    create: (body) => api.post("/feedback", body).then(data),
    get: (complaintId) => api.get(`/feedback/${complaintId}`).then(data)
};

export const notificationApi = {
    list: () => api.get("/notifications").then(data),
    markRead: (id) => api.put(`/notifications/${id}/read`).then(data),
    markAllRead: () => api.put("/notifications/read-all").then(data)
};

export default api;
