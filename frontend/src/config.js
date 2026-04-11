/**
 * Cloud API base URL. Set in Azure Static Web Apps / App Service:
 * REACT_APP_API_URL=https://your-backend.azurewebsites.net
 * (no trailing slash)
 */
export const API_BASE_URL = (
  process.env.REACT_APP_API_URL || 'http://localhost:5000'
).replace(/\/$/, '');
