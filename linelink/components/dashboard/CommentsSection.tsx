import { useState, useEffect } from "react";
import LiveStatusBar from "./LiveStatusBar";
import { MessageCircle, Loader2 } from "lucide-react";
import { useApi } from "@/contexts/AuthContext";
import toast from 'react-hot-toast';

interface Comment {
  id?: string;
  user: string;
  text: string;
  created_at?: string;
  timestamp?: string;
  station_number?: string;
  unit_number?: string;
  work_order_id?: string;
}

export default function CommentsSection() {
  const api = useApi();
  const [comments, setComments] = useState<Comment[]>([]);
  const [comment, setComment] = useState("");
  const [lastUpdated, setLastUpdated] = useState(getNowString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getNowString() {
    return new Date().toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }

  const fetchAllComments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First fetch all work orders
      const workOrdersResponse = await api.get('/workorders/');
      const allWorkOrders = workOrdersResponse.work_orders || [];
      
      // Then fetch comments for each work order
      const allComments: Comment[] = [];
      
      for (const workOrder of allWorkOrders) {
        try {
          const response = await api.get(`/workorders/${workOrder.work_order_id}`);
          
          // Main work order comments
          if (Array.isArray(response.comments)) {
            allComments.push(...response.comments.map((c: any) => ({
              ...c,
              work_order_id: workOrder.work_order_id,
              id: c.id || `${workOrder.work_order_id}-${Date.now()}`,
              user: c.user || 'Operator',
              text: c.text || c.comment || '',
              timestamp: c.timestamp || c.created_at || new Date().toISOString()
            })));
          }

          // Unit and station comments
          if (response?.units) {
            response.units.forEach((unit: any) => {
              unit.stations.forEach((station: any) => {
                if (station.station_comments) {
                  allComments.push({
                    id: `${workOrder.work_order_id}-unit-${unit.unit_number}-station-${station.station_number}`,
                    user: 'Operator',
                    text: station.station_comments,
                    timestamp: station.updated_at || new Date().toISOString(),
                    station_number: station.station_number,
                    unit_number: unit.unit_number.toString(),
                    work_order_id: workOrder.work_order_id
                  });
                }
              });
            });
          }
        } catch (err) {
          console.error(`Error fetching comments for work order ${workOrder.work_order_id}:`, err);
        }
      }

      // Sort comments by timestamp (newest first)
      allComments.sort((a, b) => 
        new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
      );

      setComments(allComments);
      setLastUpdated(getNowString());
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Failed to load comments. Please check your connection.');
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllComments();
  }, []);

  const handleAddComment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const commentText = comment.trim();
    if (!commentText) return;
    
    try {
      setLoading(true);
      
      const newComment: Comment = {
        user: 'You',
        text: commentText,
        timestamp: new Date().toISOString()
      };
      
      // Add to global comments (you'll need to implement this endpoint)
      await api.post(`/comments`, {
        text: commentText
      });
      
      // Optimistically update UI
      setComments(prev => [{
        ...newComment,
        id: Date.now().toString(),
        created_at: newComment.timestamp
      }, ...prev]);
      
      setComment('');
      toast.success('Comment added successfully');
      
      // Refresh comments to ensure consistency
      await fetchAllComments();
      
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment');
      toast.error('Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <LiveStatusBar lastUpdated={lastUpdated} className="mb-4" />
      <div className="bg-white rounded-lg shadow p-6 w-full">
        <h2 className="text-xl font-bold mb-6 flex items-center">
          <MessageCircle className="w-5 h-5 mr-2" />
          All Comments
        </h2>
        
        <div className="space-y-3 max-h-96 overflow-y-auto mb-6 pr-2 -mr-2">
          {loading && !comments.length ? (
            <div className="flex justify-center items-center h-20">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="text-red-500 text-sm p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span>{error}</span>
                <button 
                  onClick={fetchAllComments}
                  className="text-blue-600 hover:text-blue-800 underline"
                  disabled={loading}
                >
                  Retry
                </button>
              </div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-gray-400 text-sm text-center py-4">
              No comments found
            </div>
          ) : (
            comments.map((c) => (
              <div 
                key={c.id || `comment-${c.timestamp}`} 
                className="bg-gray-50 rounded-lg p-3 text-sm"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-gray-700">
                    {c.user}
                    {c.work_order_id && (
                      <span className="text-xs text-gray-500 ml-2">
                        (WO: {c.work_order_id})
                      </span>
                    )}
                    {(c.unit_number || c.station_number) && (
                      <span className="text-xs text-gray-500 ml-2">
                        {c.unit_number && `Unit ${c.unit_number}`}
                        {c.station_number && `, Station ${c.station_number}`}
                      </span>
                    )}
                  </span>
                  {c.timestamp && (
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(c.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  )}
                </div>
                <p className="text-gray-800">{c.text}</p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAddComment} className="flex gap-3">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Type your comment here..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            disabled={loading || !comment.trim()}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Send'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}