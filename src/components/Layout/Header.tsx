import React, { useState } from 'react';
import { LogOut, Bell, Package, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationPanel } from './NotificationPanel';

interface HeaderProps {
  title: string;
  onMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onMenuToggle }) => {
  const { user, logout } = useAuth();
  const { notifications, hasUnread, markAsRead, clearAll } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);

  const canSeeNotifications = user && ['Admin', 'MANG', 'CLK'].includes(user.role);

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {onMenuToggle && (
                <button
                  onClick={onMenuToggle}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
                >
                  <Menu className="h-5 w-5 text-gray-600" />
                </button>
              )}
              <div className="flex items-center gap-2">
                <Package className="h-6 w-6 text-blue-600" />
                <h1 className="text-lg font-semibold text-gray-900 hidden sm:block">
                  {title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {canSeeNotifications && (
                <button
                  onClick={() => setShowNotifications(true)}
                  className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Bell className="h-5 w-5 text-gray-600" />
                  {hasUnread && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                  )}
                </button>
              )}

              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                  <p className="text-xs text-gray-500">{user?.role}</p>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {canSeeNotifications && (
        <NotificationPanel
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onClearAll={clearAll}
        />
      )}
    </>
  );
};