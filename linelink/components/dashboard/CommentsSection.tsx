import { useState } from "react"
import LiveStatusBar from "./LiveStatusBar"
import { MessageCircle } from "lucide-react"

const mockComments = [
  { user: "Alice", text: "Issue with part #123", time: "2h ago" },
  { user: "Bob", text: "Production line B is slow", time: "1h ago" },
]

function getNowString() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function CommentsSection() {
  const [comments, setComments] = useState(mockComments)
  const [comment, setComment] = useState("")
  const [lastUpdated, setLastUpdated] = useState(getNowString())

  function handleAddComment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!comment.trim()) return
    setComments([...comments, { user: "You", text: comment, time: "now" }])
    setLastUpdated(getNowString())
    setComment("")
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-xl mx-auto">
      <LiveStatusBar lastUpdated={lastUpdated} />
      <h2 className="text-xl font-bold mb-4 flex items-center"><MessageCircle className="w-5 h-5 mr-2" />Comments & Issues</h2>
      <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
        {comments.length === 0 && <div className="text-gray-400 text-sm">No comments yet.</div>}
        {comments.map((c, i) => (
          <div key={i} className="bg-gray-50 rounded px-3 py-2 text-sm flex items-center justify-between">
            <span><span className="font-medium text-gray-700">{c.user}:</span> {c.text}</span>
            <span className="text-xs text-gray-400 ml-2">{c.time}</span>
          </div>
        ))}
      </div>
      <form className="flex gap-2" onSubmit={handleAddComment}>
        <input
          type="text"
          className="flex-1 border rounded px-2 py-1 text-sm"
          placeholder="Add a comment..."
          value={comment}
          onChange={e => setComment(e.target.value)}
        />
        <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Send</button>
      </form>
    </div>
  )
} 