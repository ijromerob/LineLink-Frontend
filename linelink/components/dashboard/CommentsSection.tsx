import { useState, useEffect } from "react"
import LiveStatusBar from "./LiveStatusBar"
import { MessageCircle, Loader2 } from "lucide-react"
import { useApi } from "@/contexts/AuthContext"

interface Comment {
  id: string;
  user: string;
  text: string;
  created_at: string;
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
    try {
      setLoading(true);
      const response = await api.get<{ comments: Comment[] }>(
        `/workorders/${workOrderId}/units/${unitNumber}/stations/${stationNumber}/comments`
      );
      setComments(response.comments || []);
      setLastUpdated(getNowString());
      setError(null);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [workOrderId, unitNumber, stationNumber]);

  const handleAddComment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    try {
      setLoading(true);
      await api.put(
        `/workorders/${workOrderId}/units/${unitNumber}/stations/${stationNumber}/comment`,
        { text: comment }
      );
      
      // Refresh comments after successful submission
      await fetchComments();
      setComment("");
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overflow-x-auto">
      <LiveStatusBar lastUpdated={lastUpdated} />
      <div className="flex flex-col lg:flex-row gap-6 min-w-[600px]">
        {/* Comments Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 flex-1 min-w-[320px]">
          <h2 className="text-2xl font-bold mb-6 flex items-center"><MessageCircle className="w-6 h-6 mr-3" />Comments & Issues</h2>
          <div className="space-y-3 max-h-60 overflow-y-auto mb-6">
            {loading && !comments.length ? (
              <div className="flex justify-center items-center h-20">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : error ? (
              <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
                {error}
              </div>
            ) : comments.length === 0 ? (
              <div className="text-gray-400 text-base">No comments yet.</div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="bg-gray-50 rounded px-4 py-3 text-base flex items-center justify-between">
                  <span><span className="font-semibold text-gray-700">{c.user}:</span> {c.text}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
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
              className="bg-blue-600 text-white px-4 py-2 rounded text-base flex items-center gap-2 disabled:bg-blue-400"
              disabled={loading || !comment.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : 'Send'}
            </button>
          </form>
        </div>
        {/* Placeholder for Issues or other side-by-side content */}
        {/* <div className="bg-white rounded-xl shadow-lg p-8 flex-1 min-w-[320px]">
          <h2 className="text-2xl font-bold mb-6 flex items-center">Issues</h2>
          ...
        </div> */}
      </div>
    </div>
  )
} 