import { useState, useRef, useEffect } from "react"
import type React from "react"
import { ClipboardList, MessageCircle, Package, X, CheckCircle, Plus } from "lucide-react"
import { Button } from "../ui/button"
import LiveStatusBar from "./LiveStatusBar"
import { useApi } from "@/contexts/AuthContext"
import { useAuth } from "@/contexts/AuthContext"
import toast from 'react-hot-toast';

export type WorkOrder = {
    id: string
    name: string
    status: "In Progress" | "Pending" | "Completed" | "Failed"
    progress: number
    description: string
    comments: { user: string; text: string; time: string }[]
    partsRequested: { part: string; qty: number }[]
}

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

type BackendWorkOrder = {
    work_order_id: string;
    product_number: string;
    is_completed: boolean;
    parts_missing: number;
    parts_supplied: number;
    quantity_to_produce: number;
    total_parts_needed: number;
    partsRequested: { part: string; qty: number }[];
};

export default function WorkOrdersSection() {
    const api = useApi();
    const { user } = useAuth();
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
    const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null)
    const [comment, setComment] = useState("")
    const [partNumber, setPartNumber] = useState("")
    const [partQty, setPartQty] = useState("")
    const [highlighted, setHighlighted] = useState<string | null>(null)
    const [lastUpdated, setLastUpdated] = useState(getNowString())
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string>("")
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [createProductNumber, setCreateProductNumber] = useState("")
    const [createQuantity, setCreateQuantity] = useState("")
    const [creating, setCreating] = useState(false)
    const [partRequestLoading, setPartRequestLoading] = useState(false);
    const highlightTimeout = useRef<NodeJS.Timeout | null>(null)

    // Fetch all work orders on mount
    useEffect(() => {
        const fetchWorkOrders = async () => {
            setLoading(true)
            setError("")
            try {
                const response = await api.get("/workorders/");
                let arr = [];
                if (Array.isArray(response.work_orders)) {
                    arr = response.work_orders.map((wo: BackendWorkOrder) => ({
                        id: wo.work_order_id,
                        name: wo.product_number,
                        status: wo.is_completed ? "Completed" : "In Progress",
                        progress: wo.is_completed
                            ? 100
                            : wo.total_parts_needed > 0
                                ? Math.round((wo.parts_supplied / wo.total_parts_needed) * 100)
                                : 0,
                        description: `Produce ${wo.quantity_to_produce} units`,
                        comments: [],
                        partsRequested: [],
                    }));
                }
                setWorkOrders(arr);
                setLastUpdated(getNowString())
            } catch (err) {
                setError("Failed to fetch work orders")
            } finally {
                setLoading(false)
            }
        }
        fetchWorkOrders()
    }, [api])

    async function markWorkOrderComplete(workOrderId: string) {
        setLoading(true)
        setError("")
        // Optimistically update UI
        setWorkOrders(prev => prev.map(wo =>
            wo.id === workOrderId
                ? { ...wo, status: "Completed", progress: 100 }
                : wo
        ));
        setHighlighted(workOrderId);
        setLastUpdated(getNowString());
        if (highlightTimeout.current) clearTimeout(highlightTimeout.current);
        highlightTimeout.current = setTimeout(() => setHighlighted(null), 1200);
        try {
            await api.post("/workorders/complete", { work_order_id: workOrderId })
            // Optionally, refresh from backend (can be removed if not needed)
            // const response = await api.get("/workorders/");
            // let arr = [];
            // if (Array.isArray(response.work_orders)) {
            //   arr = response.work_orders.map((wo: BackendWorkOrder) => ({ ... }));
            // }
            // setWorkOrders(arr);
            // setLastUpdated(getNowString())
        } catch (err) {
            setError("Failed to mark work order complete")
        } finally {
            setLoading(false)
        }
    }

    async function createWorkOrder(productNumber: string, quantity: number) {
        setLoading(true)
        setError("")
        try {
            await api.post("/workorders/create_workorder", { product_number: productNumber, quantity })
            // Refresh work orders after creation
            const response = await api.get("/workorders/");
            let arr = [];
            if (Array.isArray(response.work_orders)) {
                arr = response.work_orders.map((wo: BackendWorkOrder) => ({
                    id: wo.work_order_id,
                    name: wo.product_number,
                    status: wo.is_completed ? "Completed" : "In Progress",
                    progress: wo.is_completed
                        ? 100
                        : wo.total_parts_needed > 0
                            ? Math.round((wo.parts_supplied / wo.total_parts_needed) * 100)
                            : 0,
                    description: `Produce ${wo.quantity_to_produce} units`,
                    comments: [],
                    partsRequested: [],
                }));
            }
            setWorkOrders(arr);
            setLastUpdated(getNowString())
        } catch (err) {
            setError("Failed to create work order")
        } finally {
            setLoading(false)
        }
    }

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
        // This is still local only; implement API if needed
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

    async function fetchWorkOrdersAndUpdate() {
        setLoading(true);
        setError("");
        try {
            const response = await api.get("/workorders/");
            let arr = [];
            if (Array.isArray(response.work_orders)) {
                arr = response.work_orders.map((wo: BackendWorkOrder) => ({
                    id: wo.work_order_id,
                    name: wo.product_number,
                    status: wo.is_completed ? "Completed" : "In Progress",
                    progress: wo.is_completed
                        ? 100
                        : wo.total_parts_needed > 0
                            ? Math.round((wo.parts_supplied / wo.total_parts_needed) * 100)
                            : 0,
                    description: `Produce ${wo.quantity_to_produce} units`,
                    comments: [],
                    partsRequested: wo.partsRequested || [],
                }));
            }
            setWorkOrders(arr);
            setLastUpdated(getNowString());
        } catch (err) {
            setError("Failed to fetch work orders");
        } finally {
            setLoading(false);
        }
    }

    function handleRequestPart(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!partNumber.trim() || !partQty.trim() || !selectedWO || !user) return;
        setPartRequestLoading(true);
        const part_number = partNumber.trim();
        const quantity_requested = Number(partQty);
        const requested_by = user.user_id;
        const station_number = "1";
        const work_order_id = selectedWO.id;
        api.post("/parts/part_request", {
            part_number,
            quantity_requested,
            requested_by,
            station_number,
            work_order_id,
        }).then(() => {
            toast.success("Part request submitted!");
            setPartNumber("");
            setPartQty("");
            if (highlightTimeout.current) clearTimeout(highlightTimeout.current);
            highlightTimeout.current = setTimeout(() => setHighlighted(null), 1200);
            fetchWorkOrdersAndUpdate(); // Refresh work orders so MissingPartsSection updates
        }).catch(() => {
            toast.error("Failed to request part");
        }).finally(() => {
            setPartRequestLoading(false);
        });
    }

    function markWorkOrderFailed(workOrderId: string) {
        setWorkOrders(prev => prev.map(wo =>
            wo.id === workOrderId
                ? { ...wo, status: "Failed", progress: 0 }
                : wo
        ));
        setHighlighted(workOrderId);
        setLastUpdated(getNowString());
        if (highlightTimeout.current) clearTimeout(highlightTimeout.current);
        highlightTimeout.current = setTimeout(() => setHighlighted(null), 1200);
    }

    // Start Working handler
    function startWorkOrder(workOrderId: string) {
        setWorkOrders(prev => prev.map(wo =>
            wo.id === workOrderId
                ? { ...wo, status: "In Progress" }
                : wo
        ));
        setHighlighted(workOrderId);
        setLastUpdated(getNowString());
        if (highlightTimeout.current) clearTimeout(highlightTimeout.current);
        highlightTimeout.current = setTimeout(() => setHighlighted(null), 1200);
    }

    // Create Work Order handler
    async function handleCreateWorkOrder(e: React.FormEvent) {
        e.preventDefault();
        if (!createProductNumber.trim() || !createQuantity.trim()) return;
        setCreating(true);
        setError("");
        try {
            await createWorkOrder(createProductNumber.trim(), Number(createQuantity));
            setShowCreateModal(false);
            setCreateProductNumber("");
            setCreateQuantity("");
        } catch (err) {
            setError("Failed to create work order");
        } finally {
            setCreating(false);
        }
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <LiveStatusBar lastUpdated={lastUpdated} />
                <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2" size="sm">
                    <Plus className="w-4 h-4" /> Create Work Order
                </Button>
            </div>
            <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
                                        {wo.status === "Pending" && (
                                            <Button size="sm" className="mt-2" onClick={e => { e.stopPropagation(); startWorkOrder(wo.id); }}>
                                                Start Working
                                            </Button>
                                        )}
                                        {wo.status === "In Progress" && (
                                            <div className="mt-2">{/* part request UI will show in modal */}</div>
                                        )}
                                        {wo.status !== "Completed" && wo.status !== "Failed" && (
                                            <div className="flex gap-2 mt-2">
                                                <Button size="sm" onClick={e => { e.stopPropagation(); markWorkOrderComplete(wo.id); }}>
                                                    Mark Complete
                                                </Button>
                                                <Button size="sm" variant="destructive" onClick={e => { e.stopPropagation(); markWorkOrderFailed(wo.id); }}>
                                                    Mark Failed
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {/* Create Work Order Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6 relative animate-fade-in">
                        <button
                            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                            onClick={() => setShowCreateModal(false)}
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h3 className="font-semibold text-lg mb-4">Create Work Order</h3>
                        <form onSubmit={handleCreateWorkOrder} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Product Number</label>
                                <input
                                    type="text"
                                    className="w-full border rounded px-2 py-1 text-sm"
                                    value={createProductNumber}
                                    onChange={e => setCreateProductNumber(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Quantity</label>
                                <input
                                    type="number"
                                    className="w-full border rounded px-2 py-1 text-sm"
                                    value={createQuantity}
                                    onChange={e => setCreateQuantity(e.target.value)}
                                    min={1}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={creating}>
                                {creating ? "Creating..." : "Create"}
                            </Button>
                        </form>
                    </div>
                </div>
            )}
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
                        {selectedWO.status === "In Progress" && (
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
                                        disabled={partRequestLoading}
                                    />
                                    <input
                                        type="number"
                                        className="border rounded px-2 py-1 text-sm w-20"
                                        placeholder="Qty"
                                        value={partQty}
                                        onChange={e => setPartQty(e.target.value)}
                                        min={1}
                                        disabled={partRequestLoading}
                                    />
                                    <Button type="submit" size="sm" disabled={partRequestLoading}>
                                        {partRequestLoading ? "Requesting..." : "Request"}
                                    </Button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
} 