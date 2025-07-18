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
        <div className="overflow-x-auto">
            <LiveStatusBar lastUpdated={lastUpdated} />
            <div className="flex flex-col lg:flex-row gap-6 min-w-[600px]">
                {/* Historical Data Card */}
                <div className="bg-white rounded-xl shadow-lg p-8 flex-1 min-w-[320px]">
                    <h2 className="text-2xl font-bold mb-6 flex items-center"><ClipboardList className="w-6 h-6 mr-3" />Historical Work Orders</h2>
                    <table className="min-w-full text-base">
                        <thead>
                            <tr className="text-left text-gray-700 border-b">
                                <th className="py-3 px-4">Work Order</th>
                                <th className="py-3 px-4">Completed</th>
                                <th className="py-3 px-4">Missing Parts</th>
                                <th className="py-3 px-4">Resolution</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockHistoricalData.map(order => (
                                <tr key={order.id} className="border-b last:border-0">
                                    <td className="py-3 px-4 font-semibold">{order.id} - {order.name}</td>
                                    <td className="py-3 px-4">{order.completedAt}</td>
                                    <td className="py-3 px-4">
                                        {order.missingParts.map((mp, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <Package className="w-5 h-5 text-gray-500" />
                                                <span>Part #{mp.part} &times; {mp.qty}</span>
                                                <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-800 ml-2">{mp.status}</span>
                                            </div>
                                        ))}
                                    </td>
                                    <td className="py-3 px-4">{order.resolution}</td>
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