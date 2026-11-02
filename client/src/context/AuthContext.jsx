import { createContext, useContext, useState } from 'react';
import { api, tokenStore } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(tokenStore.get());

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    tokenStore.set(res.token);
    setToken(res.token);
  };
  const logout = () => {
    tokenStore.clear();
    setToken(null);
  };
  return <AuthContext.Provider value={{ isAdmin: !!token, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
