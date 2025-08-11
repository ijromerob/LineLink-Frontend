import { useEffect, useState } from "react"
import { Button } from "../ui/button"
import { Package, CheckCircle, Truck, Loader2 } from "lucide-react"
import LiveStatusBar from "./LiveStatusBar"
import { useApi } from "@/contexts/AuthContext"
import toast from 'react-hot-toast';
import { useAuth } from "@/contexts/AuthContext";

const statusColors: Record<string, string> = {
    requested: "bg-yellow-100 text-yellow-800",
    dispatched: "bg-blue-100 text-blue-800",
    acknowledged: "bg-green-100 text-green-800",
    default: "bg-gray-100 text-gray-800"
};

function getNowString() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

interface MissingPart {
    work_order: string;
    part_number: string;
    description: string;
    quantity_required: number;
    quantity_supplied: number;
    status: 'requested' | 'dispatched' | 'acknowledged';
}

export default function MissingPartsSection() {
    const api = useApi();
    const { user } = useAuth();
    
    const [parts, setParts] = useState<MissingPart[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(getNowString());
    const [error, setError] = useState<string | null>(null);
    const [dispatching, setDispatching] = useState<Record<string, boolean>>({});

    // const userRole = user?.role === 'warehouse' ? 'warehouse' : 'production';

    // Fetch missing parts from the API
    const fetchMissingParts = async () => {
        try {
            setLoading(true);
            const response = await api.get('/parts/needed_parts');
            setParts(response.data || []);
            setError(null);
            setLastUpdated(getNowString());
        } catch (err: any) {
            console.error("Failed to load missing parts:", err);
            setError(err.response?.data?.error || 'Failed to load missing parts');
            toast.error('Failed to load missing parts. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMissingParts();
        // Set up polling every 30 seconds
        const interval = setInterval(fetchMissingParts, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleDispatch = async (part: MissingPart) => {
        const partKey = `${part.work_order}-${part.part_number}`;
        
        try {
            setDispatching(prev => ({ ...prev, [partKey]: true }));
            
            // Make the API call to dispatch parts
            await api.post('/parts/dispatch', {
                work_order_id: part.work_order,
                station_number: 1, // This should come from the station context if available
                part_number: part.part_number,
                quantity_supplied: part.quantity_required - part.quantity_supplied
            });
            
            // Update local state optimistically
            setParts(prev => prev.map(p => 
                p.work_order === part.work_order && p.part_number === part.part_number
                    ? { ...p, status: 'dispatched', quantity_supplied: p.quantity_required }
                    : p
            ));
            
            toast.success('Parts dispatched successfully!');
            
        } catch (err: any) {
            console.error('Failed to dispatch part:', err);
            toast.error(err.response?.data?.error || 'Failed to dispatch parts');
        } finally {
            setDispatching(prev => ({ ...prev, [partKey]: false }));
        }
    };

    const handleAcknowledge = async (part: MissingPart) => {
        try {
            // Update local state optimistically
            setParts(prev => prev.map(p => 
                p.work_order === part.work_order && p.part_number === part.part_number
                    ? { ...p, status: 'acknowledged' }
                    : p
            ));
            
            // In a real app, you would make an API call here to update the status
            toast.success('Parts acknowledged!');
            
        } catch (err) {
            console.error('Failed to acknowledge parts:', err);
            toast.error('Failed to acknowledge parts');
        }
    };

    return (
        <div className="overflow-x-auto">
            <LiveStatusBar lastUpdated={lastUpdated} />
            {error && <div className="text-red-500 mb-2">{error}</div>}
            <div className="flex flex-col gap-6 min-w-[600px]">
                {/* Missing Parts Card */}
                <div className="bg-white rounded-xl shadow-lg p-8 flex-1">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold flex items-center">
                            <Package className="w-6 h-6 mr-3" />
                            Missing Parts
                        </h2>
                        <div className="text-sm text-gray-500">
                            Last updated: {lastUpdated}
                        </div>
                    </div>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {loading ? (
                            <div className="flex justify-center items-center h-20">
                                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                            </div>
                        ) : parts.length === 0 ? (
                            <div className="text-gray-500 text-center py-4">
                                No missing parts at the moment
                            </div>
                        ) : (
                            parts.map((part) => (
                                <div key={`${part.work_order}-${part.part_number}`} className="border rounded-lg p-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-medium">{part.description}</h3>
                                            <p className="text-sm text-gray-600">
                                                {part.part_number} • WO: {part.work_order}
                                            </p>
                                            <div className="mt-2">
                                                <span className="text-sm">
                                                    Needed: {part.quantity_required} • 
                                                    Supplied: {part.quantity_supplied} • 
                                                    Missing: {part.quantity_required - part.quantity_supplied}
                                                </span>
                                            </div>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full ${statusColors[part.status] || statusColors.default}`}>
                                            {part.status}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex justify-end gap-2">
                                        {part.quantity_supplied < part.quantity_required && (
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => handleDispatch(part)}
                                                disabled={dispatching[`${part.work_order}-${part.part_number}`]}
                                            >
                                                {dispatching[`${part.work_order}-${part.part_number}`] ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Truck className="mr-2 h-4 w-4" />
                                                )}
                                                Dispatch
                                            </Button>
                                        )}
                                        {part.status === 'dispatched' && (
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => handleAcknowledge(part)}
                                            >
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                Acknowledge
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}