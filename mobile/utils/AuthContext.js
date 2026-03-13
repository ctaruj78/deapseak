import { createContext, useContext } from 'react';

export const AuthContext = createContext({
  token: null,
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);
