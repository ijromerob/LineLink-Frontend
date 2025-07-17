import { MessageCircle, Package, CheckCircle } from "lucide-react"
import LiveStatusBar from "./LiveStatusBar"
import { useState, useEffect } from "react"

const mockAuditTrail = [
    {
        time: "2024-06-01 09:15",
        user: "Alice",
        action: "Comment",
        details: "Waiting for part #123.",
    },
    {
        time: "2024-06-01 09:20",
        user: "Bob",
        action: "Part Request",
        details: "Requested part #123 x10 for WO-001.",
    },
    {
        time: "2024-06-01 10:00",
        user: "Sam",
        action: "Status Change",
        details: "WO-004 marked as Failed.",
    },
    {
        time: "2024-06-01 10:30",
        user: "Warehouse",
        action: "Part Dispatched",
        details: "Dispatched part #999 x2 for WO-004.",
    },
    {
        time: "2024-06-01 11:00",
        user: "Production",
        action: "Acknowledged",
        details: "Received part #999 x2 for WO-004.",
    },
]

function getNowString() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function AuditTrailSection() {
  const [lastUpdated, setLastUpdated] = useState(getNowString())
  useEffect(() => { setLastUpdated(getNowString()) }, [])
    return (
        <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
            <LiveStatusBar lastUpdated={lastUpdated} />
            <h2 className="text-xl font-bold mb-4 flex items-center"><MessageCircle className="w-5 h-5 mr-2" />Audit Trail</h2>
            <table className="min-w-full text-sm">
                <thead>
                    <tr className="text-left text-gray-700 border-b">
                        <th className="py-2 px-2">Time</th>
                        <th className="py-2 px-2">User</th>
                        <th className="py-2 px-2">Action</th>
                        <th className="py-2 px-2">Details</th>
                    </tr>
                </thead>
                <tbody>
                    {mockAuditTrail.map((entry, i) => (
                        <tr key={i} className="border-b last:border-0">
                            <td className="py-2 px-2">{entry.time}</td>
                            <td className="py-2 px-2 font-medium">{entry.user}</td>
                            <td className="py-2 px-2">{entry.action}</td>
                            <td className="py-2 px-2">{entry.details}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
} 