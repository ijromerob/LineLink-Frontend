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
      <div className="w-full">
        <div className="bg-white rounded-lg sm:rounded-xl shadow p-4 sm:p-6 w-full">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center">
            <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
            Comments & Issues
          </h2>
          <div className="text-amber-600 text-sm p-3 bg-amber-50 rounded-lg">
            Please select a work order to view or add comments
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <LiveStatusBar lastUpdated={lastUpdated} className="mb-4" />
      <div className="bg-white rounded-lg sm:rounded-xl shadow p-4 sm:p-6 w-full">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center">
          <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
          Comments & Issues
        </h2>
        <div className="space-y-3 max-h-80 sm:max-h-96 overflow-y-auto mb-4 sm:mb-6 pr-2 -mr-2">
            {loading && !comments.length ? (
              <div className="flex justify-center items-center h-20">
                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-blue-600" />
              </div>
            ) : error ? (
              <div className="text-red-500 text-sm p-3 bg-red-50 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span>{error}</span>
                  <button 
                    onClick={fetchComments}
                    className="text-blue-600 hover:text-blue-800 underline text-left sm:ml-2"
                    disabled={loading}
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-gray-400 text-sm sm:text-base text-center py-4">No comments yet. Be the first to add one!</div>
            ) : (
              <div className="space-y-3">
                {comments.map((c, index) => (
                  <div 
                    key={c.id || `comment-${index}`} 
                    className="bg-gray-50 rounded-lg p-3 text-sm sm:text-base flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="break-words flex-1">
                      <span className="font-semibold text-gray-700">{c.user}:</span>{' '}
                      <span className="text-gray-800">{c.text}</span>
                    </div>
                    {c.timestamp && (
                      <span className="text-xs text-gray-400 whitespace-nowrap self-end sm:self-auto">
                        {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <form className="flex flex-col sm:flex-row gap-3 mt-4" onSubmit={handleAddComment}>
            <div className="flex-1 relative">
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 sm:py-2.5 text-sm sm:text-base disabled:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                placeholder="Type your comment here..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                disabled={loading}
                aria-label="Add a comment"
              />
            </div>
            <button 
              type="submit" 
              className="flex items-center justify-center gap-2 border-2 border-blue-600 bg-transparent hover:bg-blue-600 text-blue-600 hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              disabled={loading || !comment.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Sending...</span>
                  <span className="sm:hidden">Send</span>
                </>
              ) : (
                <span className="flex items-center">
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  <span>Send</span>
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
  )
}