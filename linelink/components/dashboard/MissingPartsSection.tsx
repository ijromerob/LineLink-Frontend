import { useEffect } from "react"
import { Button } from "../ui/button"
import { Package, CheckCircle, Truck } from "lucide-react"
import LiveStatusBar from "./LiveStatusBar"
import { useAppDispatch, useAppSelector } from "@/store"
import { fetchMissingParts, dispatchPart, updatePartStatus } from "@/store/missingPartsThunks"
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
    Requested: "bg-yellow-100 text-yellow-800",
    Dispatched: "bg-blue-100 text-blue-800",
    Acknowledged: "bg-green-100 text-green-800",
}

function getNowString() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

interface MissingPart {
    id: string;
    work_order: string;
    part_number: string;
    description: string;
    quantity_required: string;
    quantity_supplied: string;
    status: string;
}

export default function MissingPartsSection() {
    const dispatch = useAppDispatch();
    const { 
        parts, 
        loading, 
        lastUpdated, 
        error 
    } = useAppSelector((state) => state.missingParts);
    
    const userRole = "warehouse" as "warehouse" | "production";

    // Fetch missing parts from the API
    useEffect(() => {
        const loadData = async () => {
            try {
                await dispatch(fetchMissingParts()).unwrap();
            } catch (error) {
                console.error("Failed to load missing parts:", error);
                toast("Failed to load missing parts. Please try again later.");
            }
        };
        
        loadData();
        // Set up polling every 30 seconds
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, [dispatch, toast]);

    async function handleDispatch(id: string) {
        const part = parts.find(p => p.id === id);
        if (!part) return;
        
        try {
            // Optimistic update
            dispatch(updatePartStatus(id, "Dispatched"));
            
            // Make the API call
            await dispatch(dispatchPart({
                id: part.id,
                part_number: part.part_number,
                quantity_required: part.quantity_required,
                work_order: part.work_order
            })).unwrap();
            
            // Show success message
            toast("Part dispatched successfully!");
            
            // Refresh the data
            await dispatch(fetchMissingParts()).unwrap();
            
        } catch (error) {
            console.error("Failed to dispatch part:", error);
            // Revert optimistic update on error
            dispatch(updatePartStatus(id, "Requested"));
            
            toast("Failed to dispatch part. Please try again.");
        }
    }

    function handleAcknowledge(id: string) {
        dispatch(updatePartStatus(id, "Acknowledged"));
    }

    return (
        <div className="overflow-x-auto">
            <LiveStatusBar lastUpdated={lastUpdated} />
            {error && <div className="text-red-500 mb-2">{error}</div>}
            {loading && <div className="text-gray-500 mb-2">Loading...</div>}
            <div className="flex flex-col lg:flex-row gap-6 min-w-[600px]">
                {/* Missing Parts Card */}
                <div className="bg-white rounded-xl shadow-lg p-8 flex-1 min-w-[320px]">
                    <h2 className="text-2xl font-bold mb-6 flex items-center">
                        <Package className="w-6 h-6 mr-3" />Missing Parts Report
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-base">
                            <thead>
                                <tr className="text-left text-gray-700 border-b">
                                    <th className="py-3 px-4">Work Order</th>
                                    <th className="py-3 px-4">Part #</th>
                                    <th className="py-3 px-4">Description</th>
                                    <th className="py-3 px-4">Required</th>
                                    <th className="py-3 px-4">Supplied</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parts.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-4 text-center text-gray-500">
                                            No missing parts reported
                                        </td>
                                    </tr>
                                ) : (
                                    parts.map((part) => (
                                        <tr key={part.id} className="border-b hover:bg-gray-50">
                                            <td className="py-3 px-4 font-mono">{part.work_order}</td>
                                            <td className="py-3 px-4 font-mono">{part.part_number}</td>
                                            <td className="py-3 px-4">{part.description}</td>
                                            <td className="py-3 px-4 text-right">{part.quantity_required}</td>
                                            <td className="py-3 px-4 text-right">{part.quantity_supplied}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[part.status] || 'bg-gray-100 text-gray-800'}`}>
                                                    {part.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                {userRole === 'warehouse' ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={loading || part.status === 'Dispatched'}
                                                        onClick={() => handleDispatch(part.id)}
                                                        className="text-xs"
                                                    >
                                                        <Truck className="w-4 h-4 mr-1" />
                                                        {part.status === 'Dispatched' ? 'Dispatched' : 'Mark as Dispatched'}
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={part.status === 'Acknowledged'}
                                                        onClick={() => handleAcknowledge(part.id)}
                                                        className="text-xs"
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                        {part.status === 'Acknowledged' ? 'Acknowledged' : 'Acknowledge'}
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}