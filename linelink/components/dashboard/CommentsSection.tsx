import { useState, useEffect } from "react"
import LiveStatusBar from "./LiveStatusBar"
import { MessageCircle, Loader2 } from "lucide-react"
import { useApi } from "@/contexts/AuthContext"
import toast from 'react-hot-toast';

interface Comment {
  id?: string;
  user: string;
  text: string;
  created_at?: string;
  timestamp?: string;
}

interface CommentsSectionProps {
  workOrderId: string;
  unitNumber: string;
  stationNumber: string;
}

function getNowString() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function CommentsSection({ workOrderId, unitNumber, stationNumber }: CommentsSectionProps) {
  const api = useApi();
  const [comments, setComments] = useState<Comment[]>([])
  const [comment, setComment] = useState("")
  const [lastUpdated, setLastUpdated] = useState(getNowString())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchComments = async () => {
    // Validate required parameters
    if (!workOrderId) {
      setError('No work order selected');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch comments from the work order's comments array first
      const response = await api.get(`/workorders/${workOrderId}`);
      
      if (response && Array.isArray(response.comments)) {
        // Format comments from the API response
        const formattedComments = response.comments.map((comment: any) => ({
          id: comment.id || Date.now().toString(),
          user: comment.user || 'Operator',
          text: comment.text || comment.comment || '',
          created_at: comment.created_at || new Date().toISOString(),
          timestamp: comment.timestamp || comment.created_at || new Date().toISOString()
        }));
        
        setComments(formattedComments);
      } else if (response && response.units) {
        // Fallback to legacy format for backward compatibility
        const unit = response.units.find((u: any) => u.unit_number === unitNumber);
        if (unit) {
          const station = unit.stations.find((s: any) => s.station_number === stationNumber);
          if (station?.station_comments) {
            setComments([{
              id: '1',
              user: 'Operator',
              text: station.station_comments,
              timestamp: station.updated_at || new Date().toISOString()
            }]);
            return;
          }
        }
        setComments([]);
      } else {
        setComments([]);
      }
      
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
    // Only fetch if all required parameters are available
    if (workOrderId && unitNumber && stationNumber) {
      fetchComments();
    }
  }, [workOrderId, unitNumber, stationNumber]);

  const handleAddComment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const commentText = comment.trim();
    if (!commentText) return;
    
    if (!workOrderId) {
      setError('No work order selected');
      toast.error('Please select a work order first');
      return;
    }
    
    try {
      setLoading(true);
      
      // Add the comment via the API
      const newComment: Comment = {
        user: 'You',
        text: commentText,
        timestamp: new Date().toISOString()
      };
      
      // Try the new comments endpoint first
      try {
        await api.post(`/workorders/${workOrderId}/comments`, {
          text: commentText
        });
      } catch (newEndpointError) {
        console.warn('New comments endpoint failed, falling back to legacy endpoint', newEndpointError);
        
        // Fallback to legacy endpoint if the new one fails
        if (unitNumber && stationNumber) {
          await api.put(
            `/workorders/${workOrderId}/units/${unitNumber}/stations/${stationNumber}/comment`,
            { comment: commentText }
          );
        } else {
          throw new Error('Legacy endpoint requires unit and station numbers');
        }
      }
      
      // Add the comment to the local state immediately for better UX
      setComments(prev => [...prev, {
        ...newComment,
        id: Date.now().toString(),
        created_at: newComment.timestamp
      }]);
      
      setComment('');
      toast.success('Comment added successfully');
      
      // Refresh comments to ensure we have the latest data
      await fetchComments();
      
    } catch (err) {
      console.error('Error adding comment:', err);
      const errorMessage = (err as Error).message || 'Failed to add comment';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state if work order ID is missing
  if (!workOrderId) {
    return (
      <div className="overflow-x-auto">
        <div className="flex flex-col lg:flex-row gap-6 min-w-[600px]">
          <div className="bg-white rounded-xl shadow-lg p-8 flex-1 min-w-[320px]">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <MessageCircle className="w-6 h-6 mr-3" />
              Comments & Issues
            </h2>
            <div className="text-amber-600 text-sm p-2 bg-amber-50 rounded">
              Please select a work order to view or add comments
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <LiveStatusBar lastUpdated={lastUpdated} />
      <div className="flex flex-col lg:flex-row gap-6 min-w-[600px]">
        {/* Comments Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 flex-1 min-w-[320px]">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <MessageCircle className="w-6 h-6 mr-3" />
            Comments & Issues
          </h2>
          <div className="space-y-3 max-h-60 overflow-y-auto mb-6">
            {loading && !comments.length ? (
              <div className="flex justify-center items-center h-20">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : error ? (
              <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
                {error}
                <button 
                  onClick={fetchComments}
                  className="ml-2 text-blue-600 hover:text-blue-800 underline"
                  disabled={loading}
                >
                  Retry
                </button>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-gray-400 text-base">No comments yet.</div>
            ) : (
              comments.map((c, index) => (
                <div key={c.id || `comment-${index}`} className="bg-gray-50 rounded px-4 py-3 text-base flex items-center justify-between">
                  <span><span className="font-semibold text-gray-700">{c.user}:</span> {c.text}</span>
                  {c.timestamp && (
                    <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                      {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
          <form className="flex gap-3" onSubmit={handleAddComment}>
            <input
              type="text"
              className="flex-1 border rounded px-3 py-2 text-base disabled:bg-gray-100"
              placeholder="Add a comment..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              disabled={loading}
            />
            <button 
              type="submit" 
              className="flex items-center gap-2 border-2 border-blue-600 bg-transparent hover:bg-blue-600 text-blue-600 hover:text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !comment.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <span className="flex items-center">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Send
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}