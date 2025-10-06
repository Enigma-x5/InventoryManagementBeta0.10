import React, { useState, useEffect } from 'react';
import { X, Package, Share2, Copy, Check, Plus, Minus, CreditCard as Edit, Trash2, Upload, Image } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Item, Shade } from '../../types';

interface ItemModalProps {
  item: Item | null;
  isEditing: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  item,
  isEditing: initialIsEditing,
  onClose,
  onSave,
}) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(initialIsEditing);
  const [loading, setLoading] = useState(false);
  const [selectedShades, setSelectedShades] = useState<string[]>([]);
  const [shareMessage, setShareMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [shades, setShades] = useState<Shade[]>([]);
  const [trackInventory, setTrackInventory] = useState(true);

  const canManageItems = user && user.role === 'Admin';

  useEffect(() => {
    if (item) {
      setName(item.name);
      setDescription(item.description || '');
      setPhotoUrl(item.photo_url || '');
      setPreviewUrl(item.photo_url || '');
      setSelectedFile(null);
      setShades(item.shades || []);
      setTrackInventory(item.track_inventory ?? true);
    } else {
      setName('');
      setDescription('');
      setPhotoUrl('');
      setPreviewUrl('');
      setSelectedFile(null);
      setShades([]);
      setTrackInventory(true);
    }
  }, [item]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setPhotoUrl('');
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      let finalPhotoUrl = photoUrl;
      
      if (selectedFile) {
        try {
          // Generate unique file path
          const fileExt = selectedFile.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `items/${fileName}`;

          // Upload file to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('item-photos')
            .upload(filePath, selectedFile, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(`Failed to upload image: ${uploadError.message}`);
          }

          // Get public URL of uploaded file
          const { data: urlData } = supabase.storage
            .from('item-photos')
            .getPublicUrl(filePath);

          if (urlData?.publicUrl) {
            finalPhotoUrl = urlData.publicUrl;
            
            // If updating an existing item and it had an old photo, optionally delete the old one
            if (item && item.photo_url && item.photo_url !== finalPhotoUrl) {
              // Extract file path from old URL to delete it
              try {
                const oldUrl = new URL(item.photo_url);
                const oldPath = oldUrl.pathname.split('/').slice(-2).join('/'); // Get last two segments
                if (oldPath.startsWith('items/')) {
                  await supabase.storage
                    .from('item-photos')
                    .remove([oldPath]);
                }
              } catch (deleteError) {
                console.warn('Could not delete old image:', deleteError);
                // Don't throw error here, as the main operation succeeded
              }
            }
          } else {
            throw new Error('Failed to get public URL for uploaded image');
          }
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          alert(`Failed to upload image: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
          setLoading(false);
          return;
        }
      }

      if (item) {
        // Update existing item
        const { error: itemError } = await supabase
          .from('items')
          .update({
            name: name.trim(),
            description: description.trim(),
            photo_url: finalPhotoUrl,
            track_inventory: trackInventory,
          })
          .eq('id', item.id);

        if (itemError) throw itemError;

        // Update shades
        for (const shade of shades) {
          if (shade.id && shade.id.startsWith('temp-')) {
            // New shade
            const { error } = await supabase
              .from('shades')
              .insert({
                item_id: item.id,
                shade_number: shade.shade_number,
                shade_name: shade.shade_name || '',
                stock_count: shade.stock_count,
              });
            if (error) throw error;
          } else if (shade.id) {
            // Existing shade
            const { error } = await supabase
              .from('shades')
              .update({
                shade_number: shade.shade_number,
                shade_name: shade.shade_name || '',
                stock_count: shade.stock_count,
              })
              .eq('id', shade.id);
            if (error) throw error;
          }
        }
      } else {
        // Create new item
        const { data: newItem, error: itemError } = await supabase
          .from('items')
          .insert({
            name: name.trim(),
            description: description.trim(),
            photo_url: finalPhotoUrl,
            track_inventory: trackInventory,
          })
          .select()
          .single();

        if (itemError) throw itemError;

        // Add shades
        if (shades.length > 0) {
          const { error: shadesError } = await supabase
            .from('shades')
            .insert(
              shades.map(shade => ({
                item_id: newItem.id,
                shade_number: shade.shade_number,
                shade_name: shade.shade_name || '',
                stock_count: shade.stock_count,
              }))
            );
          if (shadesError) throw shadesError;
        }
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setLoading(false);
    }
  };

  const addShade = () => {
    setShades(prev => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        item_id: item?.id || '',
        shade_number: '',
        shade_name: '',
        stock_count: 0,
        created_at: '',
        updated_at: '',
      }
    ]);
  };

  const removeShade = async (index: number) => {
    const shade = shades[index];
    
    if (shade.id && !shade.id.startsWith('temp-')) {
      // Delete from database
      try {
        const { error } = await supabase
          .from('shades')
          .delete()
          .eq('id', shade.id);
        if (error) throw error;
      } catch (error) {
        console.error('Error deleting shade:', error);
        return;
      }
    }
    
    setShades(prev => prev.filter((_, i) => i !== index));
  };

  const updateShade = (index: number, field: keyof Shade, value: any) => {
    setShades(prev => prev.map((shade, i) => 
      i === index ? { ...shade, [field]: value } : shade
    ));
  };

  const generateShareMessage = () => {
    if (!item || selectedShades.length === 0) return;

    const selectedShadeData = shades.filter(shade => selectedShades.includes(shade.id));
    const shadeList = selectedShadeData
      .map(shade => `${shade.shade_number} (${shade.stock_count} pieces)`)
      .join(', ');

    const message = `We have the following shades ready for ${item.name}: ${shadeList}`;
    setShareMessage(message);
    setShowSharePanel(true);
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

  const toggleShadeSelection = (shadeId: string) => {
    setSelectedShades(prev =>
      prev.includes(shadeId)
        ? prev.filter(id => id !== shadeId)
        : [...prev, shadeId]
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? (item ? 'Edit Item' : 'Add New Item') : item?.name}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
            {isEditing ? (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter item name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Item Photo
                    </label>
                    <div className="space-y-3">
                      {previewUrl ? (
                        <div className="relative">
                          <img
                            src={previewUrl}
                            alt="Item preview"
                            className="w-full h-32 object-cover rounded-lg border border-gray-300"
                          />
                          <button
                            type="button"
                            onClick={removeImage}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <Image className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No image selected</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <label className="flex-1 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          <div className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            <Upload className="h-4 w-4" />
                            <span className="text-sm">
                              {selectedFile ? 'Change Image' : 'Upload Image'}
                            </span>
                          </div>
                        </label>
                        
                        {previewUrl && (
                          <button
                            type="button"
                            onClick={removeImage}
                            className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      {selectedFile && (
                        <p className="text-xs text-gray-500">
                          Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter item description"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="trackInventory"
                      checked={trackInventory}
                      onChange={(e) => setTrackInventory(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="trackInventory" className="text-sm font-medium text-gray-700">
                      Track Inventory
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enable this to track stock counts for this item's shades
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Shades</h3>
                    <button
                      onClick={addShade}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add Shade
                    </button>
                  </div>

                  <div className="space-y-4">
                    {shades.map((shade, index) => (
                      <div key={shade.id || index} className="flex gap-4 items-end p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Shade Number *
                          </label>
                          <input
                            type="text"
                            value={shade.shade_number}
                            onChange={(e) => updateShade(index, 'shade_number', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., RED-001"
                          />
                        </div>

                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Shade Name
                          </label>
                          <input
                            type="text"
                            value={shade.shade_name || ''}
                            onChange={(e) => updateShade(index, 'shade_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., Cherry Red"
                          />
                        </div>

                        <div className="w-32">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Stock Count {!trackInventory && '(Not Tracked)'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={shade.stock_count}
                            onChange={(e) => updateShade(index, 'stock_count', parseInt(e.target.value) || 0)}
                            disabled={!trackInventory}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <button
                          onClick={() => removeShade(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6">
                {item && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        {previewUrl || item.photo_url ? (
                          <img
                            src={previewUrl || item.photo_url}
                            alt={item.name}
                            className="w-full aspect-square object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                            <Package className="h-16 w-16 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.name}</h3>
                        <p className="text-gray-600 mb-4">{item.description || 'No description available'}</p>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total Shades:</span>
                            <span className="font-medium">{shades.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total Stock:</span>
                            <span className="font-medium">
                              {item.track_inventory 
                                ? `${shades.reduce((total, shade) => total + shade.stock_count, 0)} pieces`
                                : 'Not tracked'
                              }
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Inventory Tracking:</span>
                            <span className={`font-medium ${item.track_inventory ? 'text-green-600' : 'text-gray-500'}`}>
                              {item.track_inventory ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-medium text-gray-900">Available Shades</h4>
                        {selectedShades.length > 0 && (
                          <button
                            onClick={generateShareMessage}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <Share2 className="h-4 w-4" />
                            Share Selected ({selectedShades.length})
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {shades.map((shade) => (
                          <div
                            key={shade.id}
                            onClick={() => toggleShadeSelection(shade.id)}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedShades.includes(shade.id)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-900">{shade.shade_number}</h5>
                              <span className={`text-sm px-2 py-1 rounded-full ${
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
                              <p className="text-sm text-gray-600">{shade.shade_name}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <div className="flex gap-2">
              {!isEditing && item && canManageItems && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  Edit Item
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
              {isEditing && (
                <button
                  onClick={handleSave}
                  disabled={loading || !name.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading && <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Save Item
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Share Panel */}
      {showSharePanel && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Share Catalogue</h3>
              <button
                onClick={() => setShowSharePanel(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message to Share:
              </label>
              <textarea
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                readOnly
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