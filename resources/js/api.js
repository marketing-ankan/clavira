import axios from 'axios';

// CSRF via Laravel's XSRF-TOKEN cookie: axios reads the cookie on every request
// and sends X-XSRF-TOKEN. Unlike a static meta tag, the cookie rotates with the
// session (e.g. after admin login), so tokens can never go stale.
const api = axios.create({
    baseURL: '/api',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    withCredentials: true,
    withXSRFToken: true,
});

export default api;
