import { useState, useRef, useEffect } from "react"
import type React from "react"
import { ClipboardList, MessageCircle, Package, X, CheckCircle, Plus, AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "../ui/button"
import LiveStatusBar from "./LiveStatusBar"
import { useApi } from "@/contexts/AuthContext"
import { useAuth } from "@/contexts/AuthContext"
import toast from 'react-hot-toast';

// Custom hook for API calls with retry logic
const useApiWithRetry = () => {
    const api = useApi();
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second

    const callWithRetry = async <T,>(
        method: keyof typeof api,
        endpoint: string,
        data?: any,
        retries = MAX_RETRIES
    ): Promise<{ data?: T; error?: string }> => {
        try {
            // @ts-ignore - Dynamic method access
            const response = await api[method](endpoint, data);
            return { data: response };
        } catch (error: any) {
            console.error(`API Error (${endpoint}):`, error);
            
            if (retries > 0 && error?.response?.status >= 500) {
                // Only retry on server errors (5xx)
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                return callWithRetry(method, endpoint, data, retries - 1);
            }

            return {
                error: error.response?.data?.error || error.message || 'An unknown error occurred'
            };
        }
    };

    return { callWithRetry };
};

export type WorkOrderStatus = "In Progress" | "Pending" | "Completed" | "Failed";

export type WorkOrder = {
    id: string
    work_order_id: string
    product_number: string
    quantity_to_produce: number
    total_parts_needed: number
    parts_supplied: number
    parts_missing: number
    is_completed: boolean
    status: WorkOrderStatus
    progress: number
    description: string
    comments: { user: string; text: string; time: string }[]
    partsRequested: { part: string; qty: number }[]
}

const statusColumns = [
    { key: "Pending", label: "Pending" },
    { key: "In Progress", label: "In Progress" },
    { key: "Completed", label: "Completed" },
]

const statusColors: Record<string, string> = {
    "In Progress": "bg-yellow-100 text-yellow-800",
    "Pending": "bg-gray-100 text-gray-800",
    "Completed": "bg-green-100 text-green-800",
}

function getNowString() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// Validates work order ID format (WO followed by 7 digits)
function isValidWorkOrderId(id: string): boolean {
    return /^WO\d{7}$/.test(id);
}

// Extracts numeric ID from formatted work order ID
function extractWorkOrderId(formattedId: string): number | null {
    const match = formattedId.match(/^WO(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
}

type BackendWorkOrder = {
    work_order_id: string;
    product_number: string;
    is_completed: boolean;
    parts_missing: number;
    parts_supplied: number;
    quantity_to_produce: number;
    total_parts_needed: number;
    status?: 'Pending' | 'In Progress' | 'Completed';
    partsRequested: { part: string; qty: number }[];
}

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
    // State for part requests
    const [partRequest, setPartRequest] = useState({
        part_number: "",
        quantity_requested: "",
        station_number: "1" // Default station number
    });
    const [showPartRequestModal, setShowPartRequestModal] = useState(false);
    const [currentWorkOrderId, setCurrentWorkOrderId] = useState<string | null>(null);
    const [partRequestLoading, setPartRequestLoading] = useState(false);
    const highlightTimeout = useRef<NodeJS.Timeout | null>(null)

    // Fetch all work orders on mount
    useEffect(() => {
        const fetchWorkOrders = async () => {
            setLoading(true);
            setError("");
            try {
                const response = await api.get("/workorders/");
                if (response && Array.isArray(response.work_orders)) {
                    const processedOrders = response.work_orders.map((wo: BackendWorkOrder) => {
                        // Determine status based on backend data
                        const status = wo.is_completed 
                            ? "Completed" 
                            : wo.parts_supplied > 0 
                                ? "In Progress" 
                                : "Pending";
                        
                        // Calculate progress
                        const progress = wo.is_completed
                            ? 100
                            : wo.total_parts_needed > 0
                                ? Math.round((wo.parts_supplied / wo.total_parts_needed) * 100)
                                : 0;

                        return {
                            id: wo.work_order_id.replace('WO', ''), // Store numeric ID for API calls
                            work_order_id: wo.work_order_id, // Full ID with WO prefix
                            product_number: wo.product_number,
                            quantity_to_produce: wo.quantity_to_produce,
                            total_parts_needed: wo.total_parts_needed,
                            parts_supplied: wo.parts_supplied,
                            parts_missing: wo.parts_missing,
                            is_completed: wo.is_completed,
                            status,
                            progress,
                            description: `Produce ${wo.quantity_to_produce} units`,
                            comments: [],
                            partsRequested: [],
                        };
                    });
                    
                    setWorkOrders(processedOrders);
                    setLastUpdated(getNowString());
                }
            } catch (err) {
                console.error('Error fetching work orders:', err);
                setError("Failed to fetch work orders. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        
        fetchWorkOrders();
        
        // Set up auto-refresh every 30 seconds
        const interval = setInterval(fetchWorkOrders, 30000);
        return () => clearInterval(interval);
    }, [api])

    const { callWithRetry } = useApiWithRetry();

    const markWorkOrderComplete = async (workOrderId: string) => {
        if (!isValidWorkOrderId(workOrderId)) {
            toast.error("Invalid work order ID format");
            return;
        }
        
        try {
            setLoading(true);
            const { error } = await callWithRetry(
                'post',
                '/workorders/complete',
                { work_order_id: workOrderId }
            );

            if (error) {
                throw new Error(error);
            }
            
            // Refresh the work orders to ensure consistency
            await fetchWorkOrdersAndUpdate();
            toast.success("Work order marked as complete!");
        } catch (error: any) {
            console.error("Error completing work order:", error);
            setError(error?.message || "Failed to mark work order as complete");
            toast.error(error?.message || "Failed to complete work order");
        } finally {
            setLoading(false);
        }
    }

    async function createWorkOrder(productNumber: string, quantity: number) {
        setLoading(true);
        setError("");
        try {
            console.log("Creating work order with:", { productNumber, quantity });
            
            // Call the backend API to create a new work order
            const response = await api.post("/workorders/create_workorder", { 
                product_number: productNumber, 
                quantity: Number(quantity) 
            });

            console.log("Create work order response:", response);

            if (response && response.work_order_id) {
                // Fetch the updated list of work orders
                await fetchWorkOrdersAndUpdate();
                const workOrderId = response.work_order_id;
                toast.success(`Work order ${workOrderId} created successfully!`);
                return workOrderId;
            } else {
                throw new Error("Invalid response format from server");
            }
        } catch (error: any) {
            console.error("Error creating work order:", error);
            let errorMessage = "Failed to create work order";
            
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error("Response data:", error.response.data);
                console.error("Response status:", error.response.status);
                console.error("Response headers:", error.response.headers);
                errorMessage = error.response.data?.message || error.response.statusText || errorMessage;
            } else if (error.request) {
                // The request was made but no response was received
                console.error("No response received:", error.request);
                errorMessage = "No response received from server. Please check your connection.";
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error('Error setting up request:', error.message);
                errorMessage = error.message || errorMessage;
            }
            
            setError(errorMessage);
            toast.error(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
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

    const fetchWorkOrdersAndUpdate = async () => {
        try {
            setLoading(true);
            const { data, error } = await callWithRetry<{ work_orders: BackendWorkOrder[] }>('get', '/workorders/');
            
            if (error) {
                throw new Error(error);
            }

            if (!data) {
                throw new Error('No data received from server');
            }
            
            // Transform the data to match our WorkOrder type
            const transformedData: WorkOrder[] = data.work_orders.map(wo => {
                if (!isValidWorkOrderId(wo.work_order_id)) {
                    console.warn(`Invalid work order ID format: ${wo.work_order_id}`);
                }
                
                // Extract numeric ID for internal use, keep full ID for display
                const numericId = wo.work_order_id.replace('WO', '');
                return {
                    id: numericId, // Use numeric ID for API calls
                    work_order_id: wo.work_order_id, // Keep full ID for display
                    product_number: wo.product_number,
                    quantity_to_produce: wo.quantity_to_produce,
                    total_parts_needed: wo.total_parts_needed,
                    parts_supplied: wo.parts_supplied,
                    parts_missing: wo.parts_missing,
                    is_completed: wo.is_completed,
                    // Use the status from backend if available, otherwise determine based on other fields
                    status: wo.status || (wo.is_completed 
                        ? 'Completed' 
                        : wo.parts_supplied > 0 
                            ? 'In Progress' 
                            : 'Pending'),
                    progress: wo.total_parts_needed > 0 
                        ? Math.round((wo.parts_supplied / wo.total_parts_needed) * 100) 
                        : 0,
                    description: `Order #${wo.work_order_id} - ${wo.quantity_to_produce} units`,
                    comments: [],
                    partsRequested: []
                };
            });

            setWorkOrders(transformedData);
            setLastUpdated(getNowString());
        } catch (error: any) {
            console.error('Error fetching work orders:', error);
            toast.error(`Failed to fetch work orders: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

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
        setWorkOrders(prev => prev.map(wo => {
            if (wo.id === workOrderId) {
                return {
                    ...wo,
                    status: "Failed" as WorkOrderStatus,
                    progress: 0,
                    is_completed: false // Ensure is_completed is false for failed orders
                };
            }
            return wo;
        }));
        setHighlighted(workOrderId);
        setLastUpdated(getNowString());
        if (highlightTimeout.current) clearTimeout(highlightTimeout.current);
        highlightTimeout.current = setTimeout(() => setHighlighted(null), 1200);
    }

    // Open part request modal for starting work
    function handleStartWork(workOrderId: string) {
        setCurrentWorkOrderId(workOrderId);
        setPartRequest({
            part_number: "",
            quantity_requested: "",
            station_number: "1"
        });
        setShowPartRequestModal(true);
    }

    // Handle part request submission
    async function handlePartRequestSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!currentWorkOrderId || !partRequest.part_number || !partRequest.quantity_requested) {
            toast.error("Please fill in all required fields");
            return;
        }

        setPartRequestLoading(true);

        try {
            if (!user?.user_id) {
                throw new Error("User not authenticated");
            }

            // Submit part request to the backend
            const response = await api.post("/parts/part_request", {
                work_order_id: `WO${currentWorkOrderId.padStart(7, '0')}`, // Ensure proper format
                part_number: partRequest.part_number,
                quantity_requested: parseInt(partRequest.quantity_requested, 10),
                station_number: partRequest.station_number,
                requested_by: user.user_id // Use the authenticated user's ID
            });

            console.log('Part request response:', response);
            if (response && response.message === "Part request created" && response.request) {
                // Update the local state immediately for better UX
                setWorkOrders(prevOrders => {
                    console.log('Updating local state for work order', currentWorkOrderId);
                    return prevOrders.map(wo => {
                        if (wo.id === currentWorkOrderId) {
                            console.log('Updating work order status to In Progress', wo);
                            return { 
                                ...wo, 
                                status: "In Progress" as const,
                                // Ensure parts_supplied is at least 1 to maintain status on refresh
                                parts_supplied: Math.max(wo.parts_supplied, 1)
                            };
                        }
                        return wo;
                    });
                });

                // Try to update the status on the backend, but don't block on it
                // The next automatic refresh will sync the status
                try {
                    console.log(`Attempting to update status for work order ${currentWorkOrderId} on backend...`);
                    await api.post(`/workorders/${currentWorkOrderId}/status`, {
                        data: { status: "In Progress" },
                        // Don't throw on error, we'll sync on next refresh
                        throwOnError: false 
                    });
                } catch (statusError) {
                    console.warn("Non-critical: Could not update status on backend, will sync on next refresh:", statusError);
                }

                // Force refresh the work orders list with a small delay to ensure backend has processed the update
                setTimeout(async () => {
                    try {
                        await fetchWorkOrdersAndUpdate();
                        console.log("Work orders refreshed after status update");
                    } catch (refreshError) {
                        console.error("Error refreshing work orders:", refreshError);
                    }
                }, 500);
                
                // Close the modal and show success message
                setShowPartRequestModal(false);
                setPartRequest({
                    part_number: "",
                    quantity_requested: "",
                    station_number: "1"
                });
                toast.success("Part requested successfully! Work order is now In Progress.");
                
                // Log the successful request for debugging
                console.log("Part request created:", response.request);
            } else {
                throw new Error("Failed to process part request");
            }
        } catch (error: any) {
            console.error("Error requesting part:", error);
            const errorMessage = error?.response?.data?.error || error?.message || "Failed to request part";
            toast.error(errorMessage);
        } finally {
            setPartRequestLoading(false);
        }
    }

    // Create Work Order handler
    async function handleCreateWorkOrder(e: React.FormEvent) {
        e.preventDefault();
        if (!createProductNumber.trim() || !createQuantity.trim()) {
            setError("Please fill in all required fields");
            return;
        }
        
        const quantity = Number(createQuantity);
        if (isNaN(quantity) || quantity <= 0) {
            setError("Please enter a valid quantity");
            return;
        }

        setCreating(true);
        setError("");
        
        try {
            await createWorkOrder(createProductNumber.trim(), quantity);
            // Reset form on success
            setCreateProductNumber("");
            setCreateQuantity("");
            setShowCreateModal(false);
        } catch (error) {
            // Error handling is done in createWorkOrder
            console.error("Error in handleCreateWorkOrder:", error);
        } finally {
            setCreating(false);
        }
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <LiveStatusBar lastUpdated={lastUpdated} />
                <Button 
                    onClick={() => setShowCreateModal(true)} 
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                    size="sm"
                >
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
                                            <span className="font-medium">{wo.product_number}</span>
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
                                        <div className="flex gap-2 mt-2">
                                            {wo.status === "Pending" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="flex-1 border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors duration-200"
                                                    onClick={e => { e.stopPropagation(); handleStartWork(wo.id); }}
                                                >
                                                    Start Working
                                                </Button>
                                            )}
                                            {wo.status === "In Progress" && (
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    className="flex-1 border-2 border-blue-600 bg-white text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors duration-200 font-medium text-sm"
                                                    onClick={e => { e.stopPropagation(); markWorkOrderComplete(wo.id); }}
                                                >
                                                    Mark Complete
                                                </Button>
                                            )}
                                            {wo.status === "In Progress" && (
                                                <div className="flex-1">{/* part request UI will show in modal */}</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {/* Part Request Modal */}
            {showPartRequestModal && currentWorkOrderId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Request Parts to Start Work</h3>
                            <button 
                                onClick={() => setShowPartRequestModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handlePartRequestSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Part Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={partRequest.part_number}
                                    onChange={(e) => setPartRequest({...partRequest, part_number: e.target.value})}
                                    placeholder="Enter part number"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Quantity <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={partRequest.quantity_requested}
                                    onChange={(e) => setPartRequest({...partRequest, quantity_requested: e.target.value})}
                                    placeholder="Enter quantity"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Station Number <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={partRequest.station_number}
                                    onChange={(e) => setPartRequest({...partRequest, station_number: e.target.value})}
                                >
                                    <option value="1">Station 1</option>
                                    <option value="2">Station 2</option>
                                    <option value="3">Station 3</option>
                                </select>
                            </div>
                            
                            <div className="flex justify-end space-x-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowPartRequestModal(false)}
                                    disabled={partRequestLoading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                    disabled={partRequestLoading || !partRequest.part_number || !partRequest.quantity_requested}
                                >
                                    {partRequestLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : 'Request & Start Working'}
                                </Button>
                            </div>
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
                            <h3 className="font-semibold text-lg mr-3">{selectedWO.product_number}</h3>
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
                                <Button 
                                    type="submit" 
                                    size="sm"
                                    className="border-2 border-blue-600 bg-white text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 shadow-sm hover:shadow-md transition-all duration-200"
                                >
                                    Send
                                </Button>
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
                                    <Button 
                                        type="submit" 
                                        size="sm" 
                                        className="border-2 border-blue-600 bg-transparent hover:bg-blue-50 text-blue-600 hover:text-blue-700 shadow-sm hover:shadow-md transition-all duration-200"
                                        disabled={partRequestLoading}
                                    >
                                        {partRequestLoading ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Requesting...
                                            </>
                                        ) : 'Request'}
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