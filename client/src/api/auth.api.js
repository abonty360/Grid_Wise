import apiClient from './client';

export async function loginApi(email, password) {
  return apiClient.post('/auth/login', { email, password });
}

export async function registerApi(name, email, password) {
  return apiClient.post('/auth/register', { name, email, password });
}

export async function getMeApi() {
  return apiClient.get('/auth/me');
}

export async function listUsersApi() {
  return apiClient.get('/auth/admin/users');
}

export async function updateUserRoleApi(userId, role) {
  return apiClient.put(`/auth/admin/users/${userId}/role`, { role });
}
