export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  PROJECTS: '/projects',
  PROJECT_DETAIL: '/projects/:id',
  SCHEDULE: '/schedule',
  ASSISTANT: '/assistant',
  NOTIFICATIONS: '/notifications',
  SETTINGS: '/settings',
  SETTINGS_PROFILE: '/settings/profile',
  SETTINGS_PREFERENCES: '/settings/preferences',
  SETTINGS_INTEGRATIONS: '/settings/integrations',
  BILLING: '/billing',
  ERROR_404: '/404',
};

export const PROTECTED_ROUTES = [
  ROUTES.DASHBOARD,
  ROUTES.PROJECTS,
  ROUTES.SCHEDULE,
  ROUTES.ASSISTANT,
  ROUTES.NOTIFICATIONS,
  ROUTES.SETTINGS,
  ROUTES.BILLING,
];

export const PUBLIC_ROUTES = [
  ROUTES.HOME,
  ROUTES.LOGIN,
  ROUTES.SIGNUP,
];