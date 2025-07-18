import { useState } from "react"
import { Button } from "../ui/button"
import { Package, CheckCircle, Truck } from "lucide-react"
import LiveStatusBar from "./LiveStatusBar"

// Mock data: all requested parts from all work orders
const mockMissingParts = [
    {
        id: 1,
        workOrder: "WO-001",
        part: "123",
        qty: 10,
        status: "Requested", // Requested | Dispatched | Acknowledged
    },
    {
        id: 2,
        workOrder: "WO-004",
        part: "999",
        qty: 2,
        status: "Dispatched",
    },
    {
        id: 3,
        workOrder: "WO-002",
        part: "555",
        qty: 5,
        status: "Requested",
    },
    {
        id: 4,
        workOrder: "WO-003",
        part: "888",
        qty: 1,
        status: "Acknowledged",
    },
]

const statusColors: Record<string, string> = {
    Requested: "bg-yellow-100 text-yellow-800",
    Dispatched: "bg-blue-100 text-blue-800",
    Acknowledged: "bg-green-100 text-green-800",
}

function getNowString() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function MissingPartsSection() {
    const [parts, setParts] = useState(mockMissingParts)
    const [lastUpdated, setLastUpdated] = useState(getNowString())

    // Simulate user role ("warehouse" or "production")
    const userRole = "warehouse" as "warehouse" | "production" // Change to "production" to test prod view

    function handleDispatch(id: number) {
        setParts(parts => parts.map(p => p.id === id ? { ...p, status: "Dispatched" } : p))
        setLastUpdated(getNowString())
    }
    function handleAcknowledge(id: number) {
        setParts(parts => parts.map(p => p.id === id ? { ...p, status: "Acknowledged" } : p))
        setLastUpdated(getNowString())
    }

    return (
        <div className="overflow-x-auto">
            <LiveStatusBar lastUpdated={lastUpdated} />
            <div className="flex flex-col lg:flex-row gap-6 min-w-[600px]">
                {/* Missing Parts Card */}
                <div className="bg-white rounded-xl shadow-lg p-8 flex-1 min-w-[320px]">
                    <h2 className="text-2xl font-bold mb-6 flex items-center"><Package className="w-6 h-6 mr-3" />Missing Parts Report</h2>
                    <table className="min-w-full text-base">
                        <thead>
                            <tr className="text-left text-gray-700 border-b">
                                <th className="py-3 px-4">Work Order</th>
                                <th className="py-3 px-4">Part #</th>
                                <th className="py-3 px-4">Qty</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {parts.map(part => (
                                <tr key={part.id} className="border-b last:border-0">
                                    <td className="py-3 px-4 font-semibold">{part.workOrder}</td>
                                    <td className="py-3 px-4">{part.part}</td>
                                    <td className="py-3 px-4">{part.qty}</td>
                                    <td className="py-3 px-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[part.status]}`}>{part.status}</span>
                                    </td>
                                    <td className="py-3 px-4">
                                        {userRole === "warehouse" && part.status === "Requested" && (
                                            <Button size="sm" onClick={() => handleDispatch(part.id)} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center"><Truck className="w-5 h-5 mr-2" />Dispatch</Button>
                                        )}
                                        {userRole === "production" && part.status === "Dispatched" && (
                                            <Button size="sm" onClick={() => handleAcknowledge(part.id)} className="bg-green-600 hover:bg-green-700 text-white flex items-center"><CheckCircle className="w-5 h-5 mr-2" />Acknowledge</Button>
                                        )}
                                        {((userRole === "warehouse" && part.status !== "Requested") || (userRole === "production" && part.status !== "Dispatched")) && (
                                            <span className="text-gray-400 text-xs">No action</span>
                                        )}
                                    </td>
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