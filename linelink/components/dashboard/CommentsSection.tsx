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
    <div className="overflow-x-auto">
      <LiveStatusBar lastUpdated={lastUpdated} />
      <div className="flex flex-col lg:flex-row gap-6 min-w-[600px]">
        {/* Comments Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 flex-1 min-w-[320px]">
          <h2 className="text-2xl font-bold mb-6 flex items-center"><MessageCircle className="w-6 h-6 mr-3" />Comments & Issues</h2>
          <div className="space-y-3 max-h-60 overflow-y-auto mb-6">
            {comments.length === 0 && <div className="text-gray-400 text-base">No comments yet.</div>}
            {comments.map((c, i) => (
              <div key={i} className="bg-gray-50 rounded px-4 py-3 text-base flex items-center justify-between">
                <span><span className="font-semibold text-gray-700">{c.user}:</span> {c.text}</span>
                <span className="text-xs text-gray-400 ml-2">{c.time}</span>
              </div>
            ))}
          </div>
          <form className="flex gap-3" onSubmit={handleAddComment}>
            <input
              type="text"
              className="flex-1 border rounded px-3 py-2 text-base"
              placeholder="Add a comment..."
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-base">Send</button>
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