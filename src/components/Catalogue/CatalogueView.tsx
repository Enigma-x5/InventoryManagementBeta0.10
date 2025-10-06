import React, { useState, useEffect } from 'react';
import { Search, Share2, Copy, Check, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Item, Shade } from '../../types';

const SHADE_DISPLAY_LIMIT = 8;
export const CatalogueView: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Map<string, string[]>>(new Map());
  const [expandedItems, setExpandedItems] = useState<Map<string, boolean>>(new Map());
  const [shareMessage, setShareMessage] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          shades (*)
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

  const toggleShadeSelection = (itemId: string, shadeId: string) => {
    setSelectedItems(prev => {
      const newMap = new Map(prev);
      const currentShades = newMap.get(itemId) || [];
      
      if (currentShades.includes(shadeId)) {
        const updatedShades = currentShades.filter(id => id !== shadeId);
        if (updatedShades.length === 0) {
          newMap.delete(itemId);
        } else {
          newMap.set(itemId, updatedShades);
        }
      } else {
        newMap.set(itemId, [...currentShades, shadeId]);
      }
      
      return newMap;
    });
  };

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => {
      const newMap = new Map(prev);
      newMap.set(itemId, !newMap.get(itemId));
      return newMap;
    });
  };
  const generateShareMessage = () => {
    let message = '';
    
    selectedItems.forEach((shadeIds, itemId) => {
      const item = items.find(i => i.id === itemId);
      if (!item) return;
      
      const selectedShades = item.shades?.filter(shade => shadeIds.includes(shade.id)) || [];
      if (selectedShades.length === 0) return;
      
      const shadeList = selectedShades
        .map(shade => `${shade.shade_number} (${shade.stock_count} pieces)`)
        .join(', ');
      
      message += `We have the following shades ready for ${item.name}: ${shadeList}\n\n`;
    });
    
    setShareMessage(message.trim());
    setShowShareModal(true);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShareAllShadesForItem = (item: Item) => {
    const availableShades = item.shades || [];
    
    if (availableShades.length === 0) {
      setShareMessage(`${item.name}\n\nNo shades available for this item.`);
    } else {
      const shadeList = availableShades
        .map(shade => {
          const stockInfo = item.track_inventory 
            ? `${shade.stock_count} pieces`
            : 'Stock not tracked';
          return `${shade.shade_number}${shade.shade_name ? ` (${shade.shade_name})` : ''} - ${stockInfo}`;
        })
        .join('\n');
      
      const totalStock = item.track_inventory 
        ? `Total stock: ${availableShades.reduce((total, shade) => total + shade.stock_count, 0)} pieces`
        : 'Inventory tracking: Disabled';
      
      let message = `${item.name}\n`;
      if (item.description) {
        message += `${item.description}\n`;
      }
      message += `\nAvailable Shades (${availableShades.length}):\n${shadeList}\n\n${totalStock}`;
      
      setShareMessage(message);
    }
    
    setShowShareModal(true);
  };
  const getTotalSelectedShades = () => {
    return Array.from(selectedItems.values()).reduce((total, shades) => total + shades.length, 0);
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.shades?.some(shade => 
      shade.shade_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shade.shade_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

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
          
          {getTotalSelectedShades() > 0 && (
            <button
              onClick={generateShareMessage}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Share2 className="h-5 w-5" />
              Share Selected ({getTotalSelectedShades()})
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
          <div className="space-y-6">
            {filteredItems.map((item) => {
              const selectedShadeIds = selectedItems.get(item.id) || [];
              const availableShades = item.shades || [];
              const isExpanded = expandedItems.get(item.id) || false;
              const shouldShowToggle = availableShades.length > SHADE_DISPLAY_LIMIT;
              const shadesToDisplay = shouldShowToggle && !isExpanded 
                ? availableShades.slice(0, SHADE_DISPLAY_LIMIT)
                : availableShades;
              
              return (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                      <div className="md:col-span-1">
                        {item.photo_url ? (
                          <img
                            src={item.photo_url}
                            alt={item.name}
                            className="w-full aspect-square object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                            <Package className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="md:col-span-3">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-semibold text-gray-900">{item.name}</h3>
                          <div className="flex items-center gap-3">
                            {selectedShadeIds.length > 0 && (
                              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                {selectedShadeIds.length} selected
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareAllShadesForItem(item);
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                              title="Share all shades for this item"
                            >
                              <Share2 className="h-4 w-4" />
                              <span className="hidden sm:inline">Share Item</span>
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 mb-4">{item.description || 'No description available'}</p>
                        
                        <div className="text-sm text-gray-500">
                          <span>Total shades: {availableShades.length}</span>
                          <span className="mx-2">•</span>
                          <span>Total stock: {
                            item.track_inventory 
                              ? `${availableShades.reduce((total, shade) => total + shade.stock_count, 0)} pieces`
                              : 'Not tracked'
                          }</span>
                        </div>
                      </div>
                    </div>

                    {availableShades.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-medium text-gray-900">Available Shades</h4>
                          {shouldShowToggle && (
                            <span className="text-sm text-gray-500">
                              {isExpanded ? `Showing all ${availableShades.length}` : `Showing ${SHADE_DISPLAY_LIMIT} of ${availableShades.length}`}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {shadesToDisplay.map((shade) => {
                            const isSelected = selectedShadeIds.includes(shade.id);
                            
                            return (
                              <button
                                key={shade.id}
                                onClick={() => toggleShadeSelection(item.id, shade.id)}
                                className={`p-4 rounded-lg border-2 text-left transition-all ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-medium text-gray-900 text-sm">
                                    {shade.shade_number}
                                  </h5>
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    !item.track_inventory
                                      ? 'bg-gray-100 text-gray-600'
                                      : shade.stock_count > 0 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                  }`}>
                                    {!item.track_inventory ? 'N/A' : `${shade.stock_count} pcs`}
                                  </span>
                                </div>
                                {shade.shade_name && (
                                  <p className="text-xs text-gray-600">{shade.shade_name}</p>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        
                        {shouldShowToggle && (
                          <div className="mt-4 text-center">
                            <button
                              onClick={() => toggleItemExpansion(item.id)}
                              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-4 w-4" />
                                  Show Less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4" />
                                  Show More ({availableShades.length - SHADE_DISPLAY_LIMIT} more)
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Share Catalogue</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="h-5 w-5 text-gray-600">✕</div>
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message to Share:
              </label>
              <textarea
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              onClick={copyToClipboard}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                copied 
                  ? 'bg-green-600 text-white' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy to Clipboard
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
};