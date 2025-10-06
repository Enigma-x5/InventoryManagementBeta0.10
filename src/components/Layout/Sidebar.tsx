import React from 'react';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  FileText, 
  Share2,
  X 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  currentPage,
  onPageChange,
}) => {
  const { user } = useAuth();

  const menuItems = [
    {
      key: 'orders',
      icon: ShoppingCart,
      label: 'Orders',
      roles: ['Admin', 'MANG', 'CLK', 'FSSALE'],
    },
    {
      key: 'catalogue',
      icon: Share2,
      label: 'Catalogue',
      roles: ['Admin', 'MANG', 'CLK', 'FSSALE'],
    },
    {
      key: 'inventory',
      icon: Package,
      label: 'Inventory',
      roles: ['Admin', 'MANG', 'CLK', 'FSSALE'],
    },
    {
      key: 'clients',
      icon: Users,
      label: 'Clients',
      roles: ['Admin'],
    },
    {
      key: 'users',
      icon: Users,
      label: 'Users',
      roles: ['Admin'],
    },
  ];

  const filteredItems = menuItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden" 
          onClick={onClose} 
        />
      )}
      
      <aside className={`
        fixed left-0 top-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-200 z-50
        lg:translate-x-0 lg:static lg:z-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 lg:hidden">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            {filteredItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = currentPage === item.key;
              
              return (
                <li key={item.key}>
                  <button
                    onClick={() => {
                      onPageChange(item.key);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <IconComponent className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
};