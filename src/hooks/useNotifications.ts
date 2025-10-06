import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Order } from '../types';

interface Notification {
  id: string;
  type: 'new_order';
  message: string;
  data: Order;
  timestamp: string;
  read: boolean;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user || !['Admin', 'MANG', 'CLK'].includes(user.role)) {
      return;
    }

    // Subscribe to new orders
    const channel = supabase
      .channel('order-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        async (payload) => {
          // Fetch complete order data with relations
          const { data: orderData } = await supabase
            .from('orders')
            .select(`
              *,
              client:clients(*),
              creator:users(*)
            `)
            .eq('id', payload.new.id)
            .single();

          if (orderData) {
            const notification: Notification = {
              id: `order-${orderData.id}`,
              type: 'new_order',
              message: `New order ${orderData.order_number} from ${orderData.client?.name}`,
              data: orderData as Order,
              timestamp: new Date().toISOString(),
              read: false,
            };

            setNotifications(prev => [notification, ...prev]);
            setHasUnread(true);

            // Show browser notification if permission granted
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Order Received', {
                body: notification.message,
                icon: '/favicon.ico',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    
    const unreadCount = notifications.filter(n => !n.read && n.id !== notificationId).length;
    setHasUnread(unreadCount > 0);
  };

  const clearAll = () => {
    setNotifications([]);
    setHasUnread(false);
  };

  return {
    notifications,
    hasUnread,
    markAsRead,
    clearAll,
  };
};