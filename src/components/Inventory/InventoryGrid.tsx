import React, { useState, useEffect } from 'react';
import { Search, Package, Plus, CreditCard as Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Item } from '../../types';
import { ItemModal } from './ItemModal';

export const InventoryGrid: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const canManageItems = user && user.role === 'Admin';

  useEffect(() => {
    fetchItems();
  }, []);

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
            stock_count
          )
        `)
        .order('name');

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item: Item) => {
    setSelectedItem(item);
    setShowModal(true);
    setIsEditing(false);
  };

  const handleAddItem = () => {
    setSelectedItem(null);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleEditItem = (item: Item, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItem(item);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeleteItem = async (item: Item, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      await fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.shades?.some(shade => 
      shade.shade_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shade.shade_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const getTotalStock = (item: Item) => {
    return item.shades?.reduce((total, shade) => total + shade.stock_count, 0) || 0;
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
              placeholder="Search items or shades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {canManageItems && (
            <button
              onClick={handleAddItem}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Item
            </button>
          )}
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm ? 'No items match your search' : 'No items found'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer overflow-hidden group"
              >
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  {item.photo_url ? (
                    <img
                      src={item.photo_url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {item.name}
                    </h3>
                    {canManageItems && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleEditItem(item, e)}
                          className="p-1 rounded hover:bg-blue-100 hover:text-blue-600"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteItem(item, e)}
                          className="p-1 rounded hover:bg-red-100 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {item.description || 'No description'}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {item.shades?.length || 0} shade{(item.shades?.length || 0) !== 1 ? 's' : ''}
                    </span>
                    <span className="font-medium text-blue-600">
                     {item.track_inventory ? `${getTotalStock(item)} pieces` : 'Not tracked'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <ItemModal
          item={selectedItem}
          isEditing={isEditing}
          onClose={() => setShowModal(false)}
          onSave={fetchItems}
        />
      )}
    </>
  );
};