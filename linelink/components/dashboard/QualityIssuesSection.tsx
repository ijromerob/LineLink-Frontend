import React, { useState } from 'react';
import { AlertCircle, CheckCircle, X, Loader2, Filter, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useApi } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface QualityIssue {
  id: string;
  work_order_id: string;
  station_number: string;
  unit_number: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
  created_by: string;
}

export default function QualityIssuesSection() {
  const api = useApi();
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    work_order_id: '',
    station_number: '',
    unit_number: '',
    description: '',
    severity: 'medium' as const,
  });
  const [activeFilter, setActiveFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const response = await api.get('/quality/issues');
      setIssues(response.data || []);
    } catch (error) {
      console.error('Error fetching quality issues:', error);
      toast.error('Failed to load quality issues');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/quality/issues', formData);
      toast.success('Quality issue reported successfully');
      setShowForm(false);
      setFormData({
        work_order_id: '',
        station_number: '',
        unit_number: '',
        description: '',
        severity: 'medium',
      });
      fetchIssues();
    } catch (error) {
      console.error('Error reporting quality issue:', error);
      toast.error('Failed to report quality issue');
    }
  };

  const updateIssueStatus = async (id: string, status: QualityIssue['status']) => {
    try {
      await api.put(`/quality/issues/${id}`, { status });
      toast.success('Issue status updated');
      fetchIssues();
    } catch (error) {
      console.error('Error updating issue status:', error);
      toast.error('Failed to update issue status');
    }
  };

  const filteredIssues = issues.filter(issue => 
    activeFilter === 'all' ? true : issue.status === activeFilter
  );

  const getSeverityBadge = (severity: string) => {
    const severityClasses = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`text-xs px-2 py-1 rounded-full ${severityClasses[severity as keyof typeof severityClasses] || 'bg-gray-100'}`}>
        {severity}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      open: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`text-xs px-2 py-1 rounded-full ${statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center">
          <AlertTriangle className="w-6 h-6 mr-3 text-yellow-500" />
          Quality Issues
        </h2>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Report Issue'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="font-semibold mb-3">Report New Quality Issue</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Work Order ID</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={formData.work_order_id}
                onChange={(e) => setFormData({...formData, work_order_id: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Station Number</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={formData.station_number}
                onChange={(e) => setFormData({...formData, station_number: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit Number</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={formData.unit_number}
                onChange={(e) => setFormData({...formData, unit_number: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Severity</label>
              <select
                className="w-full p-2 border rounded"
                value={formData.severity}
                onChange={(e) => setFormData({...formData, severity: e.target.value as any})}
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
              rows={3}
              placeholder="Describe the quality issue..."
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Submit Issue
            </Button>
          </div>
        </form>
      )}

      <div className="flex items-center space-x-2 mb-4">
        <span className="text-sm font-medium">Filter:</span>
        {(['all', 'open', 'in_progress', 'resolved'] as const).map((filter) => (
          <button
            key={filter}
            className={`px-3 py-1 text-sm rounded-full ${
              activeFilter === filter
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No quality issues found
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIssues.map((issue) => (
            <div key={issue.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold">Issue #{issue.id}</h3>
                    {getSeverityBadge(issue.severity)}
                    {getStatusBadge(issue.status)}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    WO: {issue.work_order_id} • Station: {issue.station_number} • Unit: {issue.unit_number}
                  </p>
                  <p className="mt-2">{issue.description}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Reported by {issue.created_by} • {new Date(issue.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  {issue.status === 'open' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateIssueStatus(issue.id, 'in_progress')}
                    >
                      Start Work
                    </Button>
                  )}
                  {issue.status === 'in_progress' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateIssueStatus(issue.id, 'resolved')}
                    >
                      Mark Resolved
                    </Button>
                  )}
                  {issue.status === 'resolved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateIssueStatus(issue.id, 'closed')}
                    >
                      Close Issue
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
