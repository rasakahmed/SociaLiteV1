import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const ensureKeys = async (userObj) => {
    try {
      const { generateKeyPair } = await import('../utils/crypto');
      const { messagesAPI } = await import('../services/api');
      let priv = localStorage.getItem(`priv_${userObj.id}`);
      let pub = localStorage.getItem(`pub_${userObj.id}`);

      if (!priv || !pub) {
        const keys = await generateKeyPair();
        priv = keys.privateKeyBase64;
        pub = keys.publicKeyBase64;
        localStorage.setItem(`priv_${userObj.id}`, priv);
        localStorage.setItem(`pub_${userObj.id}`, pub);
      }
      
      // Update the server if it doesn't have our pubkey (or just force update it on login)
      if (!userObj.public_key || userObj.public_key !== pub) {
        await messagesAPI.updatePublicKey(pub);
        userObj.public_key = pub;
        localStorage.setItem('user', JSON.stringify(userObj));
        setUser({ ...userObj });
      }
    } catch (err) {
      console.error('Key sync error', err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      // Verify token is still valid
      authAPI.getMe()
        .then((res) => {
          setUser(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user));
          ensureKeys(res.data.user);
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (loginData) => {
    const res = await authAPI.login(loginData);
    const { token, user: userData } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    await ensureKeys(userData);
    return userData;
  }, []);

  const register = useCallback(async (registerData) => {
    const res = await authAPI.register(registerData);
    const { token, user: userData } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    await ensureKeys(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const updateUser = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}