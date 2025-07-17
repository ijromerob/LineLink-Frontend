import { Package, ClipboardList, CheckCircle } from "lucide-react"
import LiveStatusBar from "./LiveStatusBar"
import { useState, useEffect } from "react"

const mockHistoricalData = [
    {
        id: "WO-003",
        name: "Package Product C",
        completedAt: "2024-06-01",
        missingParts: [
            { part: "888", qty: 1, status: "Acknowledged" },
        ],
        resolution: "All parts received and order shipped.",
    },
    {
        id: "WO-005",
        name: "Assemble Widget E",
        completedAt: "2024-05-28",
        missingParts: [
            { part: "777", qty: 2, status: "Acknowledged" },
            { part: "555", qty: 1, status: "Acknowledged" },
        ],
        resolution: "Parts delay resolved, production completed.",
    },
]

function getNowString() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function HistoricalDataSection() {
    const [lastUpdated, setLastUpdated] = useState(getNowString())
    useEffect(() => { setLastUpdated(getNowString()) }, [])
    return (
        <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
            <LiveStatusBar lastUpdated={lastUpdated} />
            <h2 className="text-xl font-bold mb-4 flex items-center"><ClipboardList className="w-5 h-5 mr-2" />Historical Work Orders</h2>
            <table className="min-w-full text-sm">
                <thead>
                    <tr className="text-left text-gray-700 border-b">
                        <th className="py-2 px-2">Work Order</th>
                        <th className="py-2 px-2">Completed</th>
                        <th className="py-2 px-2">Missing Parts</th>
                        <th className="py-2 px-2">Resolution</th>
                    </tr>
                </thead>
                <tbody>
                    {mockHistoricalData.map(order => (
                        <tr key={order.id} className="border-b last:border-0">
                            <td className="py-2 px-2 font-medium">{order.id} - {order.name}</td>
                            <td className="py-2 px-2">{order.completedAt}</td>
                            <td className="py-2 px-2">
                                {order.missingParts.map((mp, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-gray-500" />
                                        <span>Part #{mp.part} &times; {mp.qty}</span>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 ml-1">{mp.status}</span>
                                    </div>
                                ))}
                            </td>
                            <td className="py-2 px-2">{order.resolution}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
} 