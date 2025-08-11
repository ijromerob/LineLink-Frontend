import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, RefreshCw, Search, Filter, Download } from 'lucide-react';
import { useApi } from '@/contexts/AuthContext';
import { Button } from '../ui/button';
import { toast } from 'react-hot-toast';

interface InventoryItem {
  partNumber: string;
  description: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  location: string;
  lastUpdated: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

const statusColors = {
  in_stock: 'bg-green-100 text-green-800',
  low_stock: 'bg-yellow-100 text-yellow-800',
  out_of_stock: 'bg-red-100 text-red-800'
};

const statusLabels = {
  in_stock: 'In Stock',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock'
};

export default function InventoryTracking() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'low_stock' | 'out_of_stock'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof InventoryItem; direction: 'asc' | 'desc' }>(
    { key: 'partNumber', direction: 'asc' }
  );
  const api = useApi();

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await api.get('/inventory');
      setInventory(response.data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory data');
      // Fallback to mock data if API fails
      setInventory([
        {
          partNumber: 'P-1001',
          description: 'Main Circuit Board',
          currentStock: 15,
          minStock: 10,
          maxStock: 50,
          location: 'A1-02',
          lastUpdated: new Date().toISOString(),
          status: 'in_stock'
        },
        {
          partNumber: 'P-1002',
          description: 'Power Supply Unit',
          currentStock: 5,
          minStock: 8,
          maxStock: 30,
          location: 'B2-05',
          lastUpdated: new Date().toISOString(),
          status: 'low_stock'
        },
        {
          partNumber: 'P-1003',
          description: 'Touch Screen Display',
          currentStock: 0,
          minStock: 5,
          maxStock: 20,
          location: 'C3-01',
          lastUpdated: new Date().toISOString(),
          status: 'out_of_stock'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    
    // Set up polling every 5 minutes
    const interval = setInterval(fetchInventory, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSort = (key: keyof InventoryItem) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedInventory = [...inventory].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const filteredInventory = sortedInventory.filter(item => {
    const matchesSearch = 
      item.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'low_stock' && item.status === 'low_stock') ||
      (filter === 'out_of_stock' && item.status === 'out_of_stock');
    
    return matchesSearch && matchesFilter;
  });

  const exportToCSV = () => {
    const headers = ['Part Number', 'Description', 'Current Stock', 'Min Stock', 'Max Stock', 'Location', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredInventory.map(item => [
        `"${item.partNumber}"`,
        `"${item.description}"`,
        item.currentStock,
        item.minStock,
        item.maxStock,
        `"${item.location}"`,
        `"${statusLabels[item.status]}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inventory-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStockPercentage = (item: InventoryItem) => {
    if (item.currentStock >= item.maxStock) return 100;
    return Math.round((item.currentStock / item.maxStock) * 100);
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <Package className="w-5 h-5 mr-2 text-blue-600" />
            Inventory Management
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchInventory}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search parts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="block w-full sm:w-48 pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all">All Items</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('partNumber')}
              >
                <div className="flex items-center">
                  Part Number
                  {sortConfig.key === 'partNumber' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Description
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('currentStock')}
              >
                <div className="flex items-center">
                  Stock Level
                  {sortConfig.key === 'currentStock' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Location
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('lastUpdated')}
              >
                <div className="flex items-center">
                  Last Updated
                  {sortConfig.key === 'lastUpdated' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  Loading inventory data...
                </td>
              </tr>
            ) : filteredInventory.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No inventory items found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredInventory.map((item) => (
                <tr key={item.partNumber} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{item.partNumber}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{item.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-24 mr-2">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${
                              item.status === 'out_of_stock' ? 'bg-red-500' : 
                              item.status === 'low_stock' ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${getStockPercentage(item)}%` }}
                          />
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusColors[item.status]}`}>
                        {item.currentStock} / {item.maxStock}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Min: {item.minStock}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.lastUpdated).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredInventory.length > 0 && (
        <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium">{filteredInventory.length}</span> of{' '}
            <span className="font-medium">{inventory.length}</span> items
          </div>
          <div className="flex space-x-2">
            {filter === 'all' && (
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                <span className="mr-3">In Stock: {inventory.filter(i => i.status === 'in_stock').length}</span>
                <span className="w-2 h-2 rounded-full bg-yellow-500 mr-1"></span>
                <span className="mr-3">Low: {inventory.filter(i => i.status === 'low_stock').length}</span>
                <span className="w-2 h-2 rounded-full bg-red-500 mr-1"></span>
                <span>Out: {inventory.filter(i => i.status === 'out_of_stock').length}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
