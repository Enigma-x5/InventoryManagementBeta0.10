import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginForm } from './components/Auth/LoginForm';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { InventoryGrid } from './components/Inventory/InventoryGrid';
import { OrdersList } from './components/Orders/OrdersList';
import { ClientsList } from './components/Clients/ClientsList';
import { CatalogueView } from './components/Catalogue/CatalogueView';
import { UsersList } from './components/Users/UsersList';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState(() => {
    // Set default page based on user role
    if (user && ['FSSALE', 'CLK', 'MANG'].includes(user.role)) {
      return 'orders';
    }
    return 'inventory';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Update current page when user changes (e.g., after login)
  useEffect(() => {
    if (user && ['FSSALE', 'CLK', 'MANG'].includes(user.role)) {
      setCurrentPage('orders');
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  const getPageTitle = () => {
    switch (currentPage) {
      case 'inventory': return 'Inventory Management';
      case 'orders': return 'Order Management';
      case 'clients': return 'Client Management';
      case 'catalogue': return 'Catalogue Sharing';
      case 'users': return 'User Management';
      default: return 'IMS Pro';
    }
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'inventory':
        return <InventoryGrid />;
      case 'orders':
        return <OrdersList />;
      case 'clients':
        return <ClientsList />;
      case 'catalogue':
        return <CatalogueView />;
      case 'users':
        return <UsersList />;
      default:
        return <InventoryGrid />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
        
        <div className="flex-1 lg:ml-64">
          <Header 
            title={getPageTitle()}
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          />
          
          <main className="p-6">
            {renderCurrentPage()}
          </main>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;