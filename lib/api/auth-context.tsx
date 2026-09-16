"use client";

/**
 * Bisheshoggo AI - Auth Context
 * Provides authentication state management for the app
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi, getAuthToken, setAuthToken, User } from './client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    role?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const token = getAuthToken();
      if (token) {
        const user = await authApi.getCurrentUser();
        setUser(user);
      }
    } catch (error) {
      // An invalid/expired token is expected (e.g. after a backend restart
      // or DB reseed) — clear it quietly instead of surfacing a console error.
      setAuthToken(null);
      setUser(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      await refreshUser();
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    setUser(result.user);
  };

  const register = async (data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    role?: string;
  }) => {
    const result = await authApi.register(data);
    setUser(result.user);
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
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


