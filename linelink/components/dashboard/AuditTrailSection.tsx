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
        <div className="overflow-x-auto">
            <LiveStatusBar lastUpdated={lastUpdated} />
            <div className="flex flex-col lg:flex-row gap-6 min-w-[600px]">
                {/* Audit Trail Card */}
                <div className="bg-white rounded-xl shadow-lg p-8 flex-1 min-w-[320px]">
                    <h2 className="text-2xl font-bold mb-6 flex items-center"><MessageCircle className="w-6 h-6 mr-3" />Audit Trail</h2>
                    <table className="min-w-full text-base">
                        <thead>
                            <tr className="text-left text-gray-700 border-b">
                                <th className="py-3 px-4">Time</th>
                                <th className="py-3 px-4">User</th>
                                <th className="py-3 px-4">Action</th>
                                <th className="py-3 px-4">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockAuditTrail.map((entry, i) => (
                                <tr key={i} className="border-b last:border-0">
                                    <td className="py-3 px-4">{entry.time}</td>
                                    <td className="py-3 px-4 font-semibold">{entry.user}</td>
                                    <td className="py-3 px-4">{entry.action}</td>
                                    <td className="py-3 px-4">{entry.details}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Placeholder for side-by-side content if needed */}
                {/* <div className="bg-white rounded-xl shadow-lg p-8 flex-1 min-w-[320px]">
                    ...
                </div> */}
            </div>
        </div>
    )
} 