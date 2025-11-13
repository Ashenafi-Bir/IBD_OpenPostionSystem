import axios from 'axios';

const LDAP_BASE_URL = 'http://192.168.6.63:2000/api/Ldap';

class LdapService {
  async searchUsers(searchTerm) {
    try {
      const response = await axios.get(`${LDAP_BASE_URL}/users/search`, {
        params: { searchTerm }
      });
      return response.data;
    } catch (error) {
      console.error('LDAP search error:', error);
      throw new Error('Failed to search LDAP users');
    }
  }

  async getUserByUsername(username) {
    try {
      const response = await axios.get(`${LDAP_BASE_URL}/users/by-username/${username}`);
      return response.data;
    } catch (error) {
      console.error('LDAP get user error:', error);
      throw new Error('Failed to get LDAP user');
    }
  }

  async validateCredentials(username, password) {
    try {
      const response = await axios.post(`${LDAP_BASE_URL}/users/validate`, {
        username,
        password
      });
      return response.data;
    } catch (error) {
      console.error('LDAP validation error:', error);
      return { isValid: false };
    }
  }

  async getUserInfo(username) {
    try {
      const response = await axios.get(`${LDAP_BASE_URL}/users/${username}/info`);
      return response.data;
    } catch (error) {
      console.error('LDAP get user info error:', error);
      throw new Error('Failed to get LDAP user info');
    }
  }
}

export default new LdapService();