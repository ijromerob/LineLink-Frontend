import { useState, useEffect } from "react"
import { Button } from "../ui/button"
import { Package, CheckCircle, Truck } from "lucide-react"
import LiveStatusBar from "./LiveStatusBar"
import { useApi } from "@/contexts/AuthContext"

const statusColors: Record<string, string> = {
    Requested: "bg-yellow-100 text-yellow-800",
    Dispatched: "bg-blue-100 text-blue-800",
    Acknowledged: "bg-green-100 text-green-800",
}

function getNowString() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function MissingPartsSection() {
    const api = useApi();
    const [parts, setParts] = useState<any[]>([])
    const [lastUpdated, setLastUpdated] = useState(getNowString())
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    // Simulate user role ("warehouse" or "production")
    const userRole = "warehouse" as "warehouse" | "production"

    // Fetch and aggregate parts from all work orders
    useEffect(() => {
        const fetchParts = async () => {
            setLoading(true)
            setError("")
            try {
                const response = await api.get("/workorders/");
                let workOrders = Array.isArray(response.work_orders) ? response.work_orders : [];
                // Aggregate all partsRequested from all work orders
                let allParts: any[] = [];
                workOrders.forEach((wo: any) => {
                    if (Array.isArray(wo.partsRequested)) {
                        wo.partsRequested.forEach((p: any, idx: number) => {
                            allParts.push({
                                id: `${wo.work_order_id}-${p.part}-${idx}`,
                                workOrder: wo.work_order_id,
                                part: p.part,
                                qty: p.qty,
                                status: p.status || "Requested",
                            });
                        });
                    }
                });
                setParts(allParts);
                setLastUpdated(getNowString());
            } catch (err) {
                setError("Failed to fetch parts requests");
            } finally {
                setLoading(false);
            }
        };
        fetchParts();
    }, [api]);

    async function handleDispatch(id: string) {
        const part = parts.find(p => p.id === id);
        if (!part) return;
        setLoading(true);
        setError("");
        try {
            await api.post("/warehouse/dispatch", {
                part_number: part.part,
                quantity_supplied: part.qty,
                station_number: "1",
                work_order_id: part.workOrder,
            });
            setParts(parts => parts.map(p => p.id === id ? { ...p, status: "Dispatched" } : p));
            setLastUpdated(getNowString());
        } catch (err) {
            setError("Failed to dispatch part");
        } finally {
            setLoading(false);
        }
    }
    function handleAcknowledge(id: string) {
        setParts(parts => parts.map(p => p.id === id ? { ...p, status: "Acknowledged" } : p))
        setLastUpdated(getNowString())
    }

    return (
        <div className="overflow-x-auto">
            <LiveStatusBar lastUpdated={lastUpdated} />
            {error && <div className="text-red-500 mb-2">{error}</div>}
            {loading && <div className="text-gray-500 mb-2">Loading...</div>}
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
            </div>
        </div>
    )
} 