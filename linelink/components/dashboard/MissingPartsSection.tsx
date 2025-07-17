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
    const userRole = "warehouse" // Change to "production" to test prod view

    function handleDispatch(id: number) {
        setParts(parts => parts.map(p => p.id === id ? { ...p, status: "Dispatched" } : p))
        setLastUpdated(getNowString())
    }
    function handleAcknowledge(id: number) {
        setParts(parts => parts.map(p => p.id === id ? { ...p, status: "Acknowledged" } : p))
        setLastUpdated(getNowString())
    }

    return (
        <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
            <LiveStatusBar lastUpdated={lastUpdated} />
            <h2 className="text-xl font-bold mb-4 flex items-center"><Package className="w-5 h-5 mr-2" />Missing Parts Report</h2>
            <table className="min-w-full text-sm">
                <thead>
                    <tr className="text-left text-gray-700 border-b">
                        <th className="py-2 px-2">Work Order</th>
                        <th className="py-2 px-2">Part #</th>
                        <th className="py-2 px-2">Qty</th>
                        <th className="py-2 px-2">Status</th>
                        <th className="py-2 px-2">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {parts.map(part => (
                        <tr key={part.id} className="border-b last:border-0">
                            <td className="py-2 px-2 font-medium">{part.workOrder}</td>
                            <td className="py-2 px-2">{part.part}</td>
                            <td className="py-2 px-2">{part.qty}</td>
                            <td className="py-2 px-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[part.status]}`}>{part.status}</span>
                            </td>
                            <td className="py-2 px-2">
                                {userRole === "warehouse" && part.status === "Requested" && (
                                    <Button size="sm" onClick={() => handleDispatch(part.id)} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center"><Truck className="w-4 h-4 mr-1" />Dispatch</Button>
                                )}
                                {userRole === "production" && part.status === "Dispatched" && (
                                    <Button size="sm" onClick={() => handleAcknowledge(part.id)} className="bg-green-600 hover:bg-green-700 text-white flex items-center"><CheckCircle className="w-4 h-4 mr-1" />Acknowledge</Button>
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
    )
} 