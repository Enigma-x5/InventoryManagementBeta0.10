import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, User, Package, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Order } from '../../types';
import { OrderModal } from './OrderModal';

export const OrdersList: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const canCreateOrders = user && ['FSSALE', 'MANG'].includes(user.role);
  const canViewAllOrders = user && ['Admin', 'MANG', 'CLK'].includes(user.role);
  const canAuthorizeOrders = user && user.role === 'Admin';

  useEffect(() => {
    fetchOrders();
  }, [user]);

  // Listen for custom event to open order modal (for pending order navigation)
  useEffect(() => {
    const handleOpenOrderModal = (event: CustomEvent) => {
      const { order, isCreating } = event.detail;
      setSelectedOrder(order);
      setIsCreating(isCreating);
      setShowModal(true);
    };

    window.addEventListener('openOrderModal', handleOpenOrderModal as EventListener);
    return () => window.removeEventListener('openOrderModal', handleOpenOrderModal as EventListener);
  }, []);

  const fetchOrders = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          client:clients(*),
          creator:users!orders_created_by_fkey(full_name),
          closer:users!orders_closed_by_fkey(full_name),
          order_items(
            *,
            item:items(name),
            shade:shades(shade_number, shade_name),
            fulfiller:users!order_items_fulfilled_by_fkey(full_name)
          )
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = () => {
    setSelectedOrder(null);
    setIsCreating(true);
    setShowModal(true);
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsCreating(false);
    setShowModal(true);
  };

  const handleToggleAuthorization = async (order: Order) => {
    if (!canAuthorizeOrders) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ is_authorized: !order.is_authorized })
        .eq('id', order.id);

      if (error) throw error;
      await fetchOrders();
    } catch (error) {
      console.error('Error updating order authorization:', error);
    }
  };

  const filteredOrders = orders.filter(order =>
    order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.notes.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {canCreateOrders && (
            <button
              onClick={handleCreateOrder}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Order
            </button>
          )}
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm ? 'No orders match your search' : 'No orders found'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-200"
              >
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {order.order_number}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                      {order.is_authorized && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                          Authorized
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {canAuthorizeOrders && (
                        <button
                          onClick={() => handleToggleAuthorization(order)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                            order.is_authorized
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {order.is_authorized ? 'Revoke' : 'Authorize'}
                        </button>
                      )}
                      <button
                        onClick={() => handleViewOrder(order)}
                        className="flex items-center gap-2 px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Client:</span>
                      <span className="font-medium">{order.client?.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">
                        {new Date(order.order_date).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Items:</span>
                      <span className="font-medium">{order.order_items?.length || 0}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium text-green-600">
                        ₹{order.total_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                    {order.creator && (
                      <div>Created by: {order.creator.full_name}</div>
                    )}
                    {order.closer && order.closed_at && (
                      <div>
                        Closed by: {order.closer.full_name} on{' '}
                        {new Date(order.closed_at).toLocaleDateString()}
                      </div>
                    )}
                    {order.status === 'pending' && (
                      <div className="text-yellow-600 font-medium">
                        {order.order_items?.filter(item => !item.is_fulfilled).length || 0} items pending fulfillment
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <OrderModal
          order={selectedOrder}
          isCreating={isCreating}
          onClose={() => setShowModal(false)}
          onSave={fetchOrders}
        />
      )}
    </>
  );
};