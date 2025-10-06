import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Package } from 'lucide-react';
import type { Item, Shade } from '../../types';

interface ShadeSelection {
  shade: Shade;
  quantity: number;
}

interface ShadeSelectionModalProps {
  item: Item;
  onClose: () => void;
  onConfirm: (selections: ShadeSelection[]) => void;
  initialSelections?: ShadeSelection[];
}

export const ShadeSelectionModal: React.FC<ShadeSelectionModalProps> = ({
  item,
  onClose,
  onConfirm,
  initialSelections = [],
}) => {
  const [selections, setSelections] = useState<Map<string, ShadeSelection>>(new Map());

  useEffect(() => {
    // Initialize with existing selections if provided
    const initialMap = new Map<string, ShadeSelection>();
    initialSelections.forEach(selection => {
      initialMap.set(selection.shade.id, selection);
    });
    setSelections(initialMap);
  }, [initialSelections]);

  const updateSelection = (shade: Shade, quantity: number, rate: number) => {
    setSelections(prev => {
      const newMap = new Map(prev);
      if (quantity > 0) {
        newMap.set(shade.id, { shade, quantity });
      } else {
        newMap.delete(shade.id);
      }
      return newMap;
    });
  };

  const incrementQuantity = (shade: Shade) => {
    const current = selections.get(shade.id);
    const newQuantity = (current?.quantity || 0) + 1;
    updateSelection(shade, newQuantity, 0);
  };

  const decrementQuantity = (shade: Shade) => {
    const current = selections.get(shade.id);
    const newQuantity = Math.max(0, (current?.quantity || 0) - 1);
    updateSelection(shade, newQuantity, 0);
  };

  const handleConfirm = () => {
    const selectedItems = Array.from(selections.values()).filter(
      selection => selection.quantity > 0
    ).map(selection => ({ ...selection, rate: 0 })); // Add rate: 0 for compatibility
    onConfirm(selectedItems);
  };

  const getSelectedCount = () => {
    return Array.from(selections.values()).filter(
      selection => selection.quantity > 0
    ).length;
  };

  const availableShades = item.shades || [];

  return (
    <div className="fixed inset-0 bg-black/50 z-[52] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden transform transition-transform duration-300 ease-out translate-x-0">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Select Shades</h3>
            <p className="text-sm text-gray-600">{item.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="p-6">
            {availableShades.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No shades available for this item</p>
              </div>
            ) : (
              <div className="space-y-4">
                {availableShades.map((shade) => {
                  const selection = selections.get(shade.id);
                  const quantity = selection?.quantity || 0;

                  return (
                    <div
                      key={shade.id}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        quantity > 0
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">
                            {shade.shade_number}
                          </h4>
                          {shade.shade_name && (
                            <p className="text-xs text-gray-600">{shade.shade_name}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            Stock: {item.track_inventory ? `${shade.stock_count} pieces` : 'N/A'}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => decrementQuantity(shade)}
                              className="p-1 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
                              disabled={quantity === 0}
                            >
                              <Minus className="h-3 w-3 text-gray-600" />
                            </button>
                            <span className="w-8 text-center font-medium text-sm">
                              {quantity}
                            </span>
                            <button
                              onClick={() => incrementQuantity(shade)}
                              className="p-1 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
                            >
                              <Plus className="h-3 w-3 text-gray-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {getSelectedCount() > 0 ? (
              <>
                <span className="font-medium">{getSelectedCount()} shade{getSelectedCount() !== 1 ? 's' : ''} selected</span>
              </>
            ) : (
              <span>No shades selected</span>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={getSelectedCount() === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add to Order ({getSelectedCount()})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};