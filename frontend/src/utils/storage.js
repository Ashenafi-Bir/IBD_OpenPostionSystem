const TOKEN_KEY = 'ibd_token';
const THEME_KEY = 'ibd_theme';
const USER_PREFERENCES = 'ibd_preferences';

export const storage = {
  // Token management
  setToken: (token) => {
    localStorage.setItem(TOKEN_KEY, token);
  },
  
  getToken: () => {
    return localStorage.getItem(TOKEN_KEY);
  },
  
  removeToken: () => {
    localStorage.removeItem(TOKEN_KEY);
  },
  
  // Theme management
  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme);
  },
  
  getTheme: () => {
    return localStorage.getItem(THEME_KEY);
  },
  
  // User preferences
  setPreferences: (preferences) => {
    localStorage.setItem(USER_PREFERENCES, JSON.stringify(preferences));
  },
  
  getPreferences: () => {
    try {
      return JSON.parse(localStorage.getItem(USER_PREFERENCES)) || {};
    } catch {
      return {};
    }
  },
  
  // Clear all storage
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(THEME_KEY);
    localStorage.removeItem(USER_PREFERENCES);
  }
};