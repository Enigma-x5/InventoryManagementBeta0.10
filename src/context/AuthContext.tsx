import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User, AuthContext as AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const storedUserId = localStorage.getItem('ims_user_id');
      if (storedUserId) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', storedUserId)
          .single();

        if (!error && data) {
          const userData = data as User;
          setUser(userData);
        } else {
          localStorage.removeItem('ims_user_id');
        }
      }
    } catch (error) {
      console.error('Error checking user:', error);
      localStorage.removeItem('ims_user_id');
    } finally {
      setLoading(false);
    }
  };

  const checkUsername = async (username: string): Promise<User | null> => {
    try {
      console.log('Attempting to check username:', username);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('username', username.trim())
        .maybeSingle();

      console.log('Supabase response data:', data);
      console.log('Supabase response error:', error);

      if (error) {
        console.error('Database error during username check:', error);
        return null;
      }

      return data ? (data as User) : null;
    } catch (error) {
      console.error('Username check error:', error);
      return null;
    }
  };

  const login = async (user: User, password: string): Promise<boolean> => {
    try {
      // Compare the provided password with the stored password
      if (user.password !== password) {
        return false;
      }

      // Login successful
      setUser(user);
      localStorage.setItem('ims_user_id', user.id);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ims_user_id');
  };

  const value: AuthContextType = {
    user,
    loading,
    checkUsername,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};