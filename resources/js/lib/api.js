import axios from 'axios';

export const TOKEN_KEY = 'booksales_access_token';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    headers: {
        Accept: 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
            localStorage.removeItem(TOKEN_KEY);
            window.dispatchEvent(new Event('booksales:unauthorized'));
        }

        return Promise.reject(error);
    },
);

export function getErrorMessage(error) {
    const response = error.response?.data;
    const validationMessage = response?.errors
        ? Object.values(response.errors).flat()[0]
        : null;

    if (validationMessage) {
        return validationMessage;
    }

    if (response?.message) {
        return response.message;
    }

    if (!error.response) {
        return 'Tidak dapat terhubung ke server. Periksa koneksi dan coba lagi.';
    }

    return 'Permintaan gagal. Silakan coba kembali.';
}
