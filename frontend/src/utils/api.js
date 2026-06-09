const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const fetchAPI = async (endpoint, options = {}) => {
  const token = localStorage.getItem('yashada_admin_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('yashada_admin_token');
    localStorage.removeItem('yashada_admin_info');
    window.dispatchEvent(new Event('yashada_logout'));
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
};
