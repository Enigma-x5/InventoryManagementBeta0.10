import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, User, Calendar, Package, Save, CreditCard as Edit, CheckCircle, Circle, Lock, AlertCircle, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Order, Client, Item, Shade, OrderItem } from '../../types';
import { ShadeSelectionModal } from './ShadeSelectionModal';

interface OrderModalProps {
  order: Order | null;
  isCreating: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  order,
  isCreating,
  onClose,
  onSave,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  
  // Form states
  const [selectedClientId, setSelectedClientId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const pendingOrdersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchClients();
    fetchItems();
    
    if (order) {
      setSelectedClientId(order.client_id);
      setOrderDate(order.order_date);
      setNotes(order.notes || '');
      
      // Enhanced order items with fulfillment data
      const enhancedOrderItems = (order.order_items || []).map(item => ({
        ...item,
        // Ensure fulfillment fields are properly set
        is_fulfilled: item.is_fulfilled || false,
        fulfilled_by: item.fulfilled_by || null,
        fulfilled_at: item.fulfilled_at || null,
      }));
      setOrderItems(enhancedOrderItems);
      
      // Fetch pending orders for this client
      fetchPendingOrders(order.client_id, order.id);
    }
  }, [order]);

  useEffect(() => {
    if (selectedClientId) {
      const client = clients.find(c => c.id === selectedClientId);
      setSelectedClient(client || null);
    } else {
      setSelectedClient(null);
    }
  }, [selectedClientId, clients]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          shades (
            id,
            shade_number,
            shade_name,
            stock_count,
            created_at,
            updated_at
          )
        `)
        .order('name');
      
      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchPendingOrders = async (clientId: string, excludeOrderId?: string) => {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          client:clients(*),
          creator:users!orders_created_by_fkey(full_name),
          order_items(
            *,
            item:items(name),
            shade:shades(shade_number, shade_name)
          )
        `)
        .eq('client_id', clientId)
        .in('status', ['open', 'pending'])
        .order('created_at', { ascending: false });

      if (excludeOrderId) {
        query = query.neq('id', excludeOrderId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setPendingOrders(data || []);
    } catch (error) {
      console.error('Error fetching pending orders:', error);
      setPendingOrders([]);
    }
  };

  const addOrderItems = (item: Item, shadeSelections: Array<{shade: Shade, quantity: number, rate: number}>) => {
    console.log('addOrderItems called with:', item.name, shadeSelections.length, 'selections');
    
    setOrderItems(prev => {
      // Remove existing items for this item to replace them
      const filteredItems = prev.filter(orderItem => orderItem.item_id !== item.id);
      
      // Add new selections
      const newItems = shadeSelections.map((selection) => ({
        id: `temp-${Date.now()}-${Math.random()}`,
        order_id: '',
        item_id: item.id,
        shade_id: selection.shade.id,
        quantity: selection.quantity,
        rate: selection.rate,
        amount: selection.quantity * selection.rate,
        created_at: new Date().toISOString(),
        item,
        shade: selection.shade,
      }));
      
      return [...filteredItems, ...newItems];
    });
    
    setShowItemModal(false);
    console.log('Order items updated, modal closed');
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const getTotalAmount = () => {
    return orderItems.reduce((total, item) => total + item.amount, 0);
  };

  const handleSave = async () => {
    if (!selectedClientId || orderItems.length === 0 || !user) return;

    setLoading(true);
    try {
      if (isCreating) {
        // Create new order
        const { data: newOrder, error: orderError } = await supabase
          .from('orders')
          .insert({
            client_id: selectedClientId,
            created_by: user.id,
            order_date: orderDate,
            total_amount: getTotalAmount(),
            notes: notes.trim(),
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Add order items
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(
            orderItems.map(item => ({
              order_id: newOrder.id,
              item_id: item.item_id,
              shade_id: item.shade_id,
              quantity: item.quantity,
              rate: item.rate,
            }))
          );

        if (itemsError) throw itemsError;
      } else {
        // Update existing order (if allowed)
        console.log('Update order functionality not implemented for this demo');
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPendingOrder = (pendingOrder: Order) => {
    // Close current modal and open new one with the pending order
    onClose();
    // Small delay to ensure the current modal closes before opening the new one
    setTimeout(() => {
      // This will trigger the parent component to open a new modal with the pending order
      // We'll pass this through a callback or use a different approach
      window.dispatchEvent(new CustomEvent('openOrderModal', { 
        detail: { order: pendingOrder, isCreating: false } 
      }));
    }, 100);
  };

  const canEdit = isCreating || (user?.role === 'FSSALE' && order?.created_by === user.id);
  const canAdminClose = user?.role === 'Admin';
  
  // Permission logic for fulfillment buttons:
  // - Admin, MANG, CLK: Can fulfill items on any order
  // - FSSALE: Can only fulfill items on orders they created themselves
  const canFulfill = user && (
    user.role === 'Admin' || 
    user.role === 'MANG' || 
    user.role === 'CLK' || 
    (user.role === 'FSSALE' && order?.created_by === user.id)
  );

  const handleToggleFulfillment = async (item: OrderItem) => {
    if (!user || !order) return;

    setLoading(true);
    try {
      const newFulfilledStatus = !item.is_fulfilled;
      const updateData: any = {
        is_fulfilled: newFulfilledStatus,
      };

      if (newFulfilledStatus) {
        // Mark as fulfilled
        updateData.fulfilled_by = user.id;
        updateData.fulfilled_at = new Date().toISOString();
      } else {
        // Mark as pending
        updateData.fulfilled_by = null;
        updateData.fulfilled_at = null;
      }

      const { error } = await supabase
        .from('order_items')
        .update(updateData)
        .eq('id', item.id);

      if (error) throw error;

      // Update local state
      setOrderItems(prev => prev.map(orderItem => 
        orderItem.id === item.id 
          ? { 
              ...orderItem, 
              is_fulfilled: newFulfilledStatus,
              fulfilled_by: newFulfilledStatus ? user.id : null,
              fulfilled_at: newFulfilledStatus ? new Date().toISOString() : null,
            }
          : orderItem
      ));

      // Update order status based on fulfillment
      const updatedItems = orderItems.map(orderItem => 
        orderItem.id === item.id 
          ? { ...orderItem, is_fulfilled: newFulfilledStatus }
          : orderItem
      );

      const allFulfilled = updatedItems.every(item => item.is_fulfilled);
      const anyFulfilled = updatedItems.some(item => item.is_fulfilled);
      
      let newOrderStatus = 'open';
      if (allFulfilled) {
        newOrderStatus = 'closed';
      } else if (anyFulfilled) {
        newOrderStatus = 'pending';
      }

      // Update order status if it has changed
      if (order.status !== newOrderStatus) {
        const { error: orderError } = await supabase
          .from('orders')
          .update({ status: newOrderStatus })
          .eq('id', order.id);

        if (orderError) throw orderError;
      }

      onSave(); // Refresh the orders list
    } catch (error) {
      console.error('Error toggling fulfillment:', error);
      alert('Failed to update fulfillment status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminCloseOrder = async () => {
    if (!order || !user) return;

    const confirmed = window.confirm(
      `Are you sure you want to manually close order ${order.order_number}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'closed',
          closed_by: user.id,
          closed_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (error) throw error;

      onSave();
      onClose();
    } catch (error) {
      console.error('Error closing order:', error);
      alert('Failed to close order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const scrollToPendingOrders = () => {
    if (pendingOrdersRef.current) {
      pendingOrdersRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-xl font-semibold text-gray-900">
              {isCreating ? 'Create New Order' : `Order ${order?.order_number}`}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Pending Orders Alert */}
              {pendingOrders.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium text-yellow-800 mb-2">
                        Open/Pending Orders Available
                      </h4>
                      <p className="text-sm text-yellow-700 mb-3">
                        This client has {pendingOrders.length} open/pending order{pendingOrders.length !== 1 ? 's' : ''}.
                      </p>
                      <button
                        onClick={scrollToPendingOrders}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        Take me There
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Client Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="inline h-4 w-4 mr-1" />
                    Client *
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    disabled={!canEdit}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  >
                    <option value="">Select a client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Order Date
                  </label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    disabled={!canEdit}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  />
                </div>
              </div>

              {/* Client Details */}
              {selectedClient && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Client Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Address:</span>
                      <p className="font-medium">{selectedClient.address || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Phone:</span>
                      <p className="font-medium">{selectedClient.phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">
                    <Package className="inline h-5 w-5 mr-2" />
                    Order Items
                  </h4>
                  {canEdit && (
                    <button
                      onClick={() => setShowItemModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add Item
                    </button>
                  )}
                </div>

                {orderItems.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No items added yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">S.No</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shade</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                          {!isCreating && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>}
                          {canEdit && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {orderItems.map((item, index) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.item?.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {item.shade?.shade_number}
                              {item.shade?.shade_name && (
                                <div className="text-xs text-gray-500">{item.shade.shade_name}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.quantity}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">₹{item.rate.toFixed(2)}</td>
                            {!isCreating && (
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {/* Fulfillment Toggle Button - visible to Admin/MANG/CLK or FSSALE who created the order */}
                                  {canFulfill && (
                                    <button
                                      onClick={() => handleToggleFulfillment(item)}
                                      disabled={loading}
                                      className={`p-1 rounded-full transition-colors ${
                                        item.is_fulfilled
                                          ? 'text-green-600 hover:bg-green-100'
                                          : 'text-gray-400 hover:bg-gray-100'
                                      }`}
                                      title={item.is_fulfilled ? 'Mark as pending' : 'Mark as fulfilled'}
                                    >
                                      {item.is_fulfilled ? (
                                        <CheckCircle className="h-5 w-5" />
                                      ) : (
                                        <Circle className="h-5 w-5" />
                                      )}
                                    </button>
                                  )}
                                  
                                  {/* Status Badge */}
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    item.is_fulfilled 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {item.is_fulfilled ? 'Fulfilled' : 'Pending'}
                                  </span>
                                  
                                  {/* Fulfiller Info - only shown to Admin users */}
                                  {item.is_fulfilled && item.fulfilled_by && user?.role === 'Admin' && (
                                    <div className="text-xs text-gray-500">
                                      <div>By: {item.fulfiller?.full_name || 'Unknown'}</div>
                                      {item.fulfilled_at && (
                                        <div>At: {new Date(item.fulfilled_at).toLocaleDateString()}</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            )}
                            {canEdit && (
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => removeOrderItem(index)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!canEdit}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  placeholder="Any additional notes..."
                />
              </div>

              {/* Order Status and Admin Info */}
              {!isCreating && order && (
                <div className="mt-6 p-6 bg-gray-50 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Order Status:</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'open' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'closed' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    
                    {order.closed_by && order.closed_at && (
                      <div>
                        <span className="text-gray-600">Manually Closed:</span>
                        <div className="text-xs text-gray-500 mt-1">
                          <div>By: {order.closer?.full_name || 'Unknown Admin'}</div>
                          <div>At: {new Date(order.closed_at).toLocaleString()}</div>
                        </div>
                      </div>
                    )}
                    
                    {order.status === 'pending' && (
                      <div>
                        <span className="text-gray-600">Pending Items:</span>
                        <span className="ml-2 font-medium text-yellow-600">
                          {orderItems.filter(item => !item.is_fulfilled).length} of {orderItems.length}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Detailed Pending Orders Section */}
              {pendingOrders.length > 0 && (
                <div ref={pendingOrdersRef} className="mt-6 border-t border-gray-200 pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <h4 className="text-lg font-medium text-gray-900">
                      Other Open/Pending Orders for {selectedClient?.name}
                    </h4>
                  </div>
                  
                  <div className="space-y-4">
                    {pendingOrders.map((pendingOrder) => {
                      const unfulfilled = pendingOrder.order_items?.filter(item => !item.is_fulfilled).length || 0;
                      const total = pendingOrder.order_items?.length || 0;
                      const statusColor = pendingOrder.status === 'open' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800';
                      
                      return (
                        <div
                          key={pendingOrder.id}
                          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <h5 className="font-semibold text-gray-900">
                                {pendingOrder.order_number}
                              </h5>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                                {pendingOrder.status}
                              </span>
                              {pendingOrder.status === 'pending' && (
                                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                                  {unfulfilled} of {total} pending
                                </span>
                              )}
                              {pendingOrder.is_authorized && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                                  Authorized
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleViewPendingOrder(pendingOrder)}
                              className="flex items-center gap-2 px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                              View Order
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Date:</span>
                              <p className="font-medium">{new Date(pendingOrder.order_date).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Amount:</span>
                              <p className="font-medium text-green-600">₹{pendingOrder.total_amount.toFixed(2)}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Items:</span>
                              <p className="font-medium">{total} item{total !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          
                          {pendingOrder.notes && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <span className="text-gray-600 text-sm">Notes:</span>
                              <p className="text-sm text-gray-800 mt-1">{pendingOrder.notes}</p>
                            </div>
                          )}
                          
                          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                            {pendingOrder.creator && (
                              <span>Created by: {pendingOrder.creator.full_name}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0">
            {/* Admin Close Order Button */}
            {!isCreating && order && canAdminClose && order.status !== 'closed' && (
              <button
                onClick={handleAdminCloseOrder}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading && <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <Lock className="h-4 w-4" />
                Close Order
              </button>
            )}
            
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            {canEdit && (
              <button
                onClick={handleSave}
                disabled={loading || !selectedClientId || orderItems.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading && <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <Save className="h-4 w-4" />
                Save Order
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add Item Modal */}
      {showItemModal && (
        <AddItemModal
          items={items}
          orderItems={orderItems}
          onClose={() => setShowItemModal(false)}
          onAdd={addOrderItems}
        />
      )}
    </>
  );
};

// Add Item Modal Component
interface AddItemModalProps {
  items: Item[];
  orderItems: OrderItem[];
  onClose: () => void;
  onAdd: (item: Item, shadeSelections: Array<{shade: Shade, quantity: number, rate: number}>) => void;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ items, orderItems, onClose, onAdd }) => {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showShadeModal, setShowShadeModal] = useState(false);
  const [shadeSelections, setShadeSelections] = useState<Array<{shade: Shade, quantity: number, rate: number}>>([]);
  const [itemRate, setItemRate] = useState<number>(0);
  const [showRateInput, setShowRateInput] = useState(false);

  console.log('AddItemModal rendered with', items.length, 'items');

  const getExistingSelections = (item: Item): Array<{shade: Shade, quantity: number, rate: number}> => {
    const existingItems = orderItems.filter(orderItem => orderItem.item_id === item.id);
    return existingItems.map(orderItem => ({
      shade: orderItem.shade!,
      quantity: orderItem.quantity,
      rate: orderItem.rate,
    }));
  };

  const handleItemSelect = (item: Item) => {
    console.log('Item selected:', item.name);
    setSelectedItem(item);
    
    // Check if item already has selections
    const existingSelections = getExistingSelections(item);
    if (existingSelections.length > 0) {
      setShadeSelections(existingSelections.map(sel => ({ ...sel, rate: 0 })));
      setItemRate(existingSelections[0].rate); // Use rate from first existing selection
      setShowRateInput(true);
    } else {
      setShadeSelections([]);
      setItemRate(0);
      setShowRateInput(false);
    }
    
    setShowShadeModal(true);
  };

  const handleSelectShades = () => {
    console.log('handleSelectShades called for item:', selectedItem?.name);
    if (selectedItem) {
      setShowShadeModal(true);
    }
  };

  const handleShadeSelectionConfirm = (selections: Array<{shade: Shade, quantity: number, rate: number}>) => {
    console.log('handleShadeSelectionConfirm called with', selections.length, 'selections');
    setShadeSelections(selections.map(sel => ({ ...sel, rate: 0 })));
    setShowShadeModal(false);
    setShowRateInput(true);
  };

  const handleAdd = () => {
    console.log('handleAdd called for item:', selectedItem?.name, 'with', shadeSelections.length, 'shade selections');
    if (!selectedItem || shadeSelections.length === 0) return;

    // Apply the single item rate to all shade selections
    const selectionsWithRate = shadeSelections.map(selection => ({
      ...selection,
      rate: itemRate
    }));

    onAdd(selectedItem, selectionsWithRate);
    
    // Reset form
    onClose();
  };

  const getTotalQuantity = () => {
    return shadeSelections.reduce((total, selection) => total + selection.quantity, 0);
  };

  const getTotalAmount = () => {
    return shadeSelections.reduce((total, selection) => total + (selection.quantity * itemRate), 0);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[51] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedItem ? `Configure ${selectedItem.name}` : 'Select Item'}
              </h3>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
              {!selectedItem ? (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Available Items</h4>
                  <div className="space-y-3">
                    {items.map(item => {
                      const hasExistingSelections = orderItems.some(orderItem => orderItem.item_id === item.id);
                      const totalStock = item.shades?.reduce((total, shade) => total + shade.stock_count, 0) || 0;
                      
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleItemSelect(item)}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300 hover:bg-blue-50 ${
                            hasExistingSelections ? 'border-green-500 bg-green-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                              {item.photo_url ? (
                                <img
                                  src={item.photo_url}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="h-8 w-8 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h5 className="font-medium text-gray-900">{item.name}</h5>
                                {hasExistingSelections && (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                    In Cart
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {item.description || 'No description'}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <span>{item.shades?.length || 0} shades</span>
                                <span>•</span>
                                <span>{totalStock} pieces</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : showRateInput ? (
                <div className="space-y-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Selected Item: {selectedItem.name}</h4>
                    <div className="text-sm text-gray-600">
                      <p>Total Quantity: {getTotalQuantity()} pieces</p>
                      <p>Shades: {shadeSelections.length}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rate per piece (₹) *
                    </label>
                    <input
                      type="number"
                      value={itemRate}
                      onChange={(e) => setItemRate(Number(e.target.value))}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter rate per piece"
                    />
                  </div>

                  {itemRate > 0 && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h5 className="font-medium text-blue-900 mb-2">Order Summary</h5>
                      <div className="text-sm text-blue-800">
                        <p>Total Quantity: {getTotalQuantity()} pieces</p>
                        <p>Rate per piece: ₹{itemRate.toFixed(2)}</p>
                        <p className="font-semibold">Total Amount: ₹{getTotalAmount().toFixed(2)}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowRateInput(false)}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Back to Shades
                    </button>
                    <button
                      onClick={handleAdd}
                      disabled={itemRate <= 0}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      Add to Order
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Selected Item: {selectedItem.name}</h4>
                    <p className="text-sm text-gray-600">{selectedItem.description || 'No description'}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedItem(null)}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Back to Items
                    </button>
                    <button
                      onClick={handleSelectShades}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Select Shades
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shade Selection Modal */}
      {showShadeModal && selectedItem && (
        <ShadeSelectionModal
          item={selectedItem}
          existingSelections={shadeSelections}
          onClose={() => setShowShadeModal(false)}
          onConfirm={handleShadeSelectionConfirm}
        />
      )}
    </>
  );
};