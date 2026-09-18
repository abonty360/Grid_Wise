/**
 * energy.api.js — Complete API service for GridWise
 */

import apiClient from './client';

export async function checkHealth() {
  return apiClient.get('/health');
}

export async function optimizeEnergy(payload) {
  return apiClient.post('/optimize-energy', payload);
}

export async function getScenarios() {
  return apiClient.get('/scenarios');
}

export async function getScenarioById(id) {
  return apiClient.get(`/scenarios/${id}`);
}

export async function saveScenario(payload) {
  return apiClient.post('/scenarios', payload);
}

export async function deleteScenario(id) {
  return apiClient.delete(`/scenarios/${id}`);
}

export async function getHistory() {
  return apiClient.get('/history');
}

export async function getAnalytics() {
  return apiClient.get('/analytics');
}
