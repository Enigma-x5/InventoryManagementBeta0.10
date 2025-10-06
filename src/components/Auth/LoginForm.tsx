import React, { useState, useRef, useEffect } from 'react';
import { Package, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { User } from '../../types';

export const LoginForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifiedUser, setVerifiedUser] = useState<User | null>(null);
  const { checkUsername, login } = useAuth();
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (verifiedUser && passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, [verifiedUser]);

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const user = await checkUsername(username);
      if (user) {
        setVerifiedUser(user);
      } else {
        setError('Username not found');
      }
    } catch (err) {
      setError('Failed to verify username. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedUser) return;
    
    setError('');
    setIsLoading(true);

    try {
      const success = await login(verifiedUser, password);
      if (!success) {
        setError('Incorrect password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToUsername = () => {
    setVerifiedUser(null);
    setPassword('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">IMS Pro</h1>
            <p className="text-gray-600">Inventory & Order Management</p>
          </div>

          <form onSubmit={verifiedUser ? handlePasswordSubmit : handleUsernameSubmit} className="space-y-6">
            {!verifiedUser ? (
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your username"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Package className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-900">{verifiedUser.full_name}</p>
                      <p className="text-sm text-green-600">@{verifiedUser.username}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleBackToUsername}
                    className="text-sm text-green-600 hover:text-green-800 transition-colors"
                  >
                    Not you?
                  </button>
                </div>
                
                <div className="transition-all duration-300 ease-in-out">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      ref={passwordInputRef}
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (!verifiedUser && !username.trim()) || (verifiedUser && !password.trim())}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  {verifiedUser ? 'Sign In' : 'Continue'}
                </>
              )}
            </button>
          </form>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-3 font-medium">Demo Credentials:</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="font-medium text-gray-700">Admin:</p>
                <p className="text-gray-500">admin / admin123</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Manager:</p>
                <p className="text-gray-500">manager / manager123</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Clerk:</p>
                <p className="text-gray-500">clerk / clerk123</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Sales:</p>
                <p className="text-gray-500">sales / sales123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};