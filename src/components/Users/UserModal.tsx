import React, { useState, useEffect } from 'react';
import { X, User, Shield, Eye, EyeOff, Save, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { User as UserType } from '../../types';

interface UserModalProps {
  user: UserType | null;
  isEditing: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const UserModal: React.FC<UserModalProps> = ({
  user,
  isEditing: initialIsEditing,
  onClose,
  onSave,
}) => {
  const { user: currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(initialIsEditing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Admin' | 'MANG' | 'CLK' | 'FSSALE'>('CLK');

  const canManageUsers = currentUser && currentUser.role === 'Admin';
  const isCreating = !user;

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setUsername(user.username);
      setPassword(''); // Don't populate password for security
      setRole(user.role);
    } else {
      setFullName('');
      setUsername('');
      setPassword('');
      setRole('CLK');
    }
    setError('');
  }, [user]);

  const validateForm = () => {
    if (!fullName.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!username.trim()) {
      setError('Username is required');
      return false;
    }
    if (isCreating && !password.trim()) {
      setError('Password is required for new users');
      return false;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters long');
      return false;
    }
    if (password && password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !canManageUsers) return;

    setLoading(true);
    setError('');

    try {
      const userData = {
        full_name: fullName.trim(),
        username: username.trim().toLowerCase(),
        role,
      };

      if (isCreating) {
        // Create new user
        const { error } = await supabase
          .from('users')
          .insert({
            ...userData,
            password: password.trim(), // Note: This will be hashed in Phase 1
          });

        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            setError('Username already exists');
          } else {
            throw error;
          }
          return;
        }
      } else {
        // Update existing user
        const updateData: any = userData;
        
        // Only update password if a new one is provided
        if (password.trim()) {
          updateData.password = password.trim(); // Note: This will be hashed in Phase 1
        }

        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', user!.id);

        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            setError('Username already exists');
          } else {
            throw error;
          }
          return;
        }
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving user:', error);
      setError('Failed to save user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (roleValue: string) => {
    switch (roleValue) {
      case 'Admin':
        return 'Administrator';
      case 'MANG':
        return 'Manager';
      case 'CLK':
        return 'Clerk';
      case 'FSSALE':
        return 'Sales';
      default:
        return roleValue;
    }
  };

  const getRoleDescription = (roleValue: string) => {
    switch (roleValue) {
      case 'Admin':
        return 'Full system access, can manage users, inventory, orders, and clients';
      case 'MANG':
        return 'Can manage orders, inventory, and view all data';
      case 'CLK':
        return 'Can manage orders and view inventory';
      case 'FSSALE':
        return 'Can create and manage their own orders';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? (isCreating ? 'Add New User' : 'Edit User') : user?.full_name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          {isEditing ? (
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="inline h-4 w-4 mr-1" />
                  Full Name *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Shield className="inline h-4 w-4 mr-1" />
                  Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'Admin' | 'MANG' | 'CLK' | 'FSSALE')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="CLK">Clerk</option>
                  <option value="FSSALE">Sales</option>
                  <option value="MANG">Manager</option>
                  <option value="Admin">Administrator</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {getRoleDescription(role)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Lock className="inline h-4 w-4 mr-1" />
                  Password {isCreating ? '*' : '(leave blank to keep current)'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={isCreating ? "Enter password" : "Enter new password"}
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
          ) : (
            user && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{user.full_name}</h3>
                    <p className="text-gray-600">@{user.username}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Role</h4>
                        <p className="text-sm text-gray-600">{getRoleLabel(user.role)}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.role === 'Admin' ? 'bg-red-100 text-red-800' :
                        user.role === 'MANG' ? 'bg-blue-100 text-blue-800' :
                        user.role === 'CLK' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {getRoleDescription(user.role)}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 text-sm text-gray-500">
                  <p>Created: {new Date(user.created_at).toLocaleDateString()}</p>
                  {user.updated_at !== user.created_at && (
                    <p>Updated: {new Date(user.updated_at).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            )
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div>
            {!isEditing && user && canManageUsers && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <User className="h-4 w-4" />
                Edit User
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            {isEditing && canManageUsers && (
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading && <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <Save className="h-4 w-4" />
                Save User
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};