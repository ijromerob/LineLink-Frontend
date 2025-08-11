import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, AlertTriangle, X, PlusCircle, Wrench } from 'lucide-react';
import { Button } from '../ui/button';
import { useApi } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface StationStatusUpdateProps {
  stationNumber: string;
  workOrderId?: string;
  unitNumber?: string;
  currentStatus?: 'not_started' | 'in_progress' | 'on_hold' | 'completed' | 'needs_attention';
  onStatusUpdate: () => void;
}

const statusOptions = [
  { value: 'in_progress', label: 'In Progress', icon: Clock, color: 'bg-blue-100 text-blue-700' },
  { value: 'on_hold', label: 'On Hold', icon: AlertCircle, color: 'bg-yellow-100 text-yellow-700' },
  { value: 'needs_attention', label: 'Needs Attention', icon: AlertTriangle, color: 'bg-red-100 text-red-700' },
  { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'bg-green-100 text-green-700' },
];

export default function StationStatusUpdate({ 
  stationNumber, 
  workOrderId, 
  unitNumber, 
  currentStatus = 'not_started',
  onStatusUpdate 
}: StationStatusUpdateProps) {
  const api = useApi();
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [partRequests, setPartRequests] = useState<Array<{partNumber: string, quantity: number}>>([]);
  const [showPartRequest, setShowPartRequest] = useState(false);
  const [newPart, setNewPart] = useState({ partNumber: '', quantity: 1 });

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  const updateStatus = async (newStatus: string) => {
    setLoading(true);
    try {
      await api.put(`/stations/${stationNumber}/status`, {
        status: newStatus,
        workOrderId,
        unitNumber,
        notes: notes || undefined
      });
      
      setStatus(newStatus as any);
      onStatusUpdate();
      toast.success('Status updated successfully');
      setShowForm(false);
      setNotes('');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStatus(status);
  };

  const addPartRequest = () => {
    setPartRequests([...partRequests, newPart]);
    setNewPart({ partNumber: '', quantity: 1 });
    setShowPartRequest(false);
  };

  const submitPartRequest = async () => {
    if (partRequests.length === 0) return;
    
    setLoading(true);
    try {
      await api.post('/parts/request', {
        stationNumber,
        workOrderId,
        unitNumber,
        parts: partRequests
      });
      
      toast.success('Part request submitted');
      setPartRequests([]);
    } catch (error) {
      console.error('Error submitting part request:', error);
      toast.error('Failed to submit part request');
    } finally {
      setLoading(false);
    }
  };

  const StatusIcon = statusOptions.find(s => s.value === status)?.icon || Clock;
  const statusConfig = statusOptions.find(s => s.value === status) || statusOptions[0];

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium">Station {stationNumber}</h3>
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
          <StatusIcon className="w-3.5 h-3.5 mr-1" />
          {statusConfig.label}
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {statusOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => setStatus(option.value as any)}
                disabled={loading}
                className={`flex items-center justify-center p-2 rounded-md border ${
                  status === option.value 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4 mr-1" />
                <span className="text-sm">{option.label}</span>
              </button>
            );
          })}
        </div>

        {status !== 'not_started' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                rows={2}
                className="w-full p-2 border rounded text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this status..."
              />
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium">Part Requests</h4>
                <button
                  type="button"
                  onClick={() => setShowPartRequest(!showPartRequest)}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1" />
                  {showPartRequest ? 'Cancel' : 'Request Part'}
                </button>
              </div>

              {showPartRequest && (
                <div className="flex space-x-2 mb-3">
                  <input
                    type="text"
                    placeholder="Part #"
                    className="flex-1 p-2 border rounded text-sm"
                    value={newPart.partNumber}
                    onChange={(e) => setNewPart({...newPart, partNumber: e.target.value})}
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    className="w-20 p-2 border rounded text-sm"
                    value={newPart.quantity}
                    onChange={(e) => setNewPart({...newPart, quantity: parseInt(e.target.value) || 1})}
                  />
                  <button
                    type="button"
                    onClick={addPartRequest}
                    className="px-3 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                  >
                    Add
                  </button>
                </div>
              )}

              {partRequests.length > 0 && (
                <div className="space-y-2 mb-3">
                  {partRequests.map((part, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                      <span>{part.partNumber} (Qty: {part.quantity})</span>
                      <button
                        type="button"
                        onClick={() => setPartRequests(partRequests.filter((_, i) => i !== index))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    className="w-full mt-2"
                    onClick={submitPartRequest}
                    disabled={loading}
                  >
                    Submit Part Request
                  </Button>
                </div>
              )}
            </div>

            <Button
              type="button"
              onClick={handleSubmit}
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Status'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
