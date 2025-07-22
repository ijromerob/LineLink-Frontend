import { useState, useRef, useEffect } from "react"
import type React from "react"
import { ClipboardList, MessageCircle, Package, X, CheckCircle } from "lucide-react"
import { Button } from "../ui/button"
import LiveStatusBar from "./LiveStatusBar"

// Types
export type WorkOrder = {
    id: string
    name: string
    status: "In Progress" | "Pending" | "Completed" | "Failed"
    progress: number
    description: string
    comments: { user: string; text: string; time: string }[]
    partsRequested: { part: string; qty: number }[]
}

const mockWorkOrders: WorkOrder[] = [
    {
        id: "WO-001",
        name: "Assemble Widget A",
        status: "In Progress",
        progress: 60,
        description: "Widget A for Client X",
        comments: [
            { user: "Alice", text: "Waiting for part #123.", time: "2h ago" },
            { user: "Bob", text: "Assembly started.", time: "3h ago" },
        ],
        partsRequested: [
            { part: "123", qty: 10 },
        ],
    },
    {
        id: "WO-002",
        name: "Test Device B",
        status: "Pending",
        progress: 0,
        description: "Device B for QA",
        comments: [],
        partsRequested: [],
    },
    {
        id: "WO-003",
        name: "Package Product C",
        status: "Completed",
        progress: 100,
        description: "Product C for shipment",
        comments: [
            { user: "Eve", text: "Packaging done.", time: "1d ago" },
        ],
        partsRequested: [],
    },
    {
        id: "WO-004",
        name: "Repair Machine D",
        status: "Failed",
        progress: 20,
        description: "Machine D failed QA test",
        comments: [
            { user: "Sam", text: "Critical error found.", time: "10m ago" },
        ],
        partsRequested: [
            { part: "999", qty: 2 },
        ],
    },
]

const statusColumns = [
    { key: "Pending", label: "Pending" },
    { key: "In Progress", label: "In Progress" },
    { key: "Completed", label: "Completed" },
    { key: "Failed", label: "Failed" },
]

const statusColors: Record<string, string> = {
    "In Progress": "bg-yellow-100 text-yellow-800",
    "Pending": "bg-gray-100 text-gray-800",
    "Completed": "bg-green-100 text-green-800",
    "Failed": "bg-red-100 text-red-800",
}

function getNowString() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function WorkOrdersSection() {
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>(mockWorkOrders)
    const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null)
    const [comment, setComment] = useState("")
    const [partNumber, setPartNumber] = useState("")
    const [partQty, setPartQty] = useState("")
    const [highlighted, setHighlighted] = useState<string | null>(null)
    const [lastUpdated, setLastUpdated] = useState(getNowString())
    const highlightTimeout = useRef<NodeJS.Timeout | null>(null)

    // Simulate real-time update (demo only)
    useEffect(() => {
        // Example: after 10s, update a work order (simulate server push)
        const timer = setTimeout(() => {
            setWorkOrders(prev => prev.map(wo =>
                wo.id === "WO-001"
                    ? { ...wo, progress: wo.progress + 5 > 100 ? 100 : wo.progress + 5 }
                    : wo
            ))
            setHighlighted("WO-001")
            setLastUpdated(getNowString())
            if (highlightTimeout.current) clearTimeout(highlightTimeout.current)
            highlightTimeout.current = setTimeout(() => setHighlighted(null), 1200)
        }, 10000)
        return () => clearTimeout(timer)
    }, [])

    function handleCardClick(wo: WorkOrder) {
        setSelectedWO(wo)
        setComment("")
        setPartNumber("")
        setPartQty("")
    }

    function handleCloseModal() {
        setSelectedWO(null)
    }

    function handleAddComment(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!comment.trim() || !selectedWO) return
        setWorkOrders(prev => prev.map(wo =>
            wo.id === selectedWO.id
                ? { ...wo, comments: [...wo.comments, { user: "You", text: comment, time: "now" }] }
                : wo
        ))
        setHighlighted(selectedWO.id)
        setLastUpdated(getNowString())
        setComment("")
        if (highlightTimeout.current) clearTimeout(highlightTimeout.current)
        highlightTimeout.current = setTimeout(() => setHighlighted(null), 1200)
    }

    function handleRequestPart(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!partNumber.trim() || !partQty.trim() || !selectedWO) return
        setWorkOrders(prev => prev.map(wo =>
            wo.id === selectedWO.id
                ? { ...wo, partsRequested: [...wo.partsRequested, { part: partNumber, qty: Number(partQty) }] }
                : wo
        ))
        setHighlighted(selectedWO.id)
        setLastUpdated(getNowString())
        setPartNumber("")
        setPartQty("")
        if (highlightTimeout.current) clearTimeout(highlightTimeout.current)
        highlightTimeout.current = setTimeout(() => setHighlighted(null), 1200)
    }

    return (
        <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <LiveStatusBar lastUpdated={lastUpdated} />
            <div className="flex gap-6 min-w-[900px]">
                {statusColumns.map(col => (
                    <div key={col.key} className="flex-1 min-w-[280px]">
                        <div className="flex items-center mb-2">
                            <span className="font-semibold text-lg">{col.label}</span>
                        </div>
                        <div className="space-y-4">
                            {workOrders.filter(wo => wo.status === col.key).map(wo => (
                                <div
                                    key={wo.id}
                                    className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition border-2 ${highlighted === wo.id ? 'border-yellow-400 bg-yellow-50 transition' : 'border-transparent'}`}
                                    onClick={() => handleCardClick(wo)}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium">{wo.name}</span>
                                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${statusColors[wo.status]}`}>{wo.status}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mb-2">{wo.description}</div>
                                    <div className="w-full bg-gray-200 rounded h-2">
                                        <div
                                            className={`h-2 rounded ${wo.progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                            style={{ width: `${wo.progress}%` }}
                                        ></div>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">Progress: {wo.progress}%</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            {/* Modal for work order details */}
            {selectedWO && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 relative animate-fade-in">
                        <button
                            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                            onClick={handleCloseModal}
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="flex items-center mb-2">
                            <h3 className="font-semibold text-lg mr-3">{selectedWO.name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[selectedWO.status]}`}>{selectedWO.status}</span>
                        </div>
                        <div className="text-gray-500 mb-2">{selectedWO.description}</div>
                        <div className="mb-4">
                            <div className="w-full bg-gray-200 rounded h-2">
                                <div
                                    className={`h-2 rounded ${selectedWO.progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                    style={{ width: `${selectedWO.progress}%` }}
                                ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Progress: {selectedWO.progress}%</div>
                        </div>
                        {/* Comments */}
                        <div className="mb-6">
                            <h4 className="font-semibold mb-2 flex items-center"><MessageCircle className="w-4 h-4 mr-1" />Comments</h4>
                            <div className="space-y-2 max-h-32 overflow-y-auto mb-2">
                                {selectedWO.comments.length === 0 && <div className="text-gray-400 text-sm">No comments yet.</div>}
                                {selectedWO.comments.map((c, i) => (
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
                                <Button type="submit" size="sm">Send</Button>
                            </form>
                        </div>
                        {/* Request Parts */}
                        <div>
                            <h4 className="font-semibold mb-2 flex items-center"><Package className="w-4 h-4 mr-1" />Request Parts</h4>
                            <div className="space-y-1 mb-2">
                                {selectedWO.partsRequested.length === 0 && <div className="text-gray-400 text-sm">No parts requested yet.</div>}
                                {selectedWO.partsRequested.map((p, i) => (
                                    <div key={i} className="text-sm text-gray-700">Part #{p.part} &times; {p.qty}</div>
                                ))}
                            </div>
                            <form className="flex gap-2" onSubmit={handleRequestPart}>
                                <input
                                    type="text"
                                    className="border rounded px-2 py-1 text-sm w-32"
                                    placeholder="Part #"
                                    value={partNumber}
                                    onChange={e => setPartNumber(e.target.value)}
                                />
                                <input
                                    type="number"
                                    className="border rounded px-2 py-1 text-sm w-20"
                                    placeholder="Qty"
                                    value={partQty}
                                    onChange={e => setPartQty(e.target.value)}
                                    min={1}
                                />
                                <Button type="submit" size="sm">Request</Button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
} 