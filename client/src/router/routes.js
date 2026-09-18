import { lazy } from 'react';

export const PATHS = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  ENERGY_INPUT: '/energy/new',
  OPTIMIZE_ENERGY: '/optimize-energy',
  ENERGY_RESULT: '/energy/result/:scenarioId',
  SCENARIOS: '/scenarios',
  HISTORY: '/history',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
  ADMIN: '/admin',
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  NOT_FOUND: '*',
};

const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'));
const EnergyInputPage = lazy(() => import('../features/energy/EnergyInputPage'));
const EnergyResultPage = lazy(() => import('../features/energy/EnergyResultPage'));
const ScenariosPage = lazy(() => import('../features/scenarios/ScenariosPage'));
const HistoryPage = lazy(() => import('../features/history/HistoryPage'));
const AnalyticsPage = lazy(() => import('../features/analytics/AnalyticsPage'));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage'));
const AdminPage = lazy(() => import('../features/admin/AdminPage'));
const LoginPage = lazy(() => import('../features/auth/LoginPage'));
const RegisterPage = lazy(() => import('../features/auth/RegisterPage'));
const NotFoundPage = lazy(() => import('../shared/components/NotFoundPage'));

export const ROUTES = [
  { path: PATHS.HOME, element: DashboardPage },
  { path: PATHS.DASHBOARD, element: DashboardPage },
  { path: PATHS.ENERGY_INPUT, element: EnergyInputPage },
  { path: PATHS.OPTIMIZE_ENERGY, element: EnergyInputPage },
  { path: PATHS.ENERGY_RESULT, element: EnergyResultPage },
  { path: PATHS.SCENARIOS, element: ScenariosPage },
  { path: PATHS.HISTORY, element: HistoryPage },
  { path: PATHS.ANALYTICS, element: AnalyticsPage },
  { path: PATHS.SETTINGS, element: SettingsPage },
  { path: PATHS.ADMIN, element: AdminPage },
  { path: PATHS.LOGIN, element: LoginPage },
  { path: PATHS.REGISTER, element: RegisterPage },
  { path: PATHS.NOT_FOUND, element: NotFoundPage },
];
