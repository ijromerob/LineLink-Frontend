import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Package, Truck, Loader2 } from "lucide-react";
import LiveStatusBar from "./LiveStatusBar";
import { useApi } from "@/contexts/AuthContext";
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
    requested: "bg-yellow-100 text-yellow-800",
    dispatched: "bg-blue-100 text-blue-800",
    default: "bg-gray-100 text-gray-800"
};

interface MissingPart {
    work_order: string;
    part_number: string;
    description: string;
    quantity_required: number;
    quantity_supplied: number;
    status: 'requested' | 'dispatched';
}

export default function MissingPartsSection() {
    const api = useApi();
    const [parts, setParts] = useState<MissingPart[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
    const [dispatching, setDispatching] = useState<Record<string, boolean>>({});

    const fetchMissingParts = async () => {
        try {
            setLoading(true);
            const response = await api.get('/parts/needed_parts');
            
            // Ensure we have an array to work with
            const partsArray = Array.isArray(response?.data) ? response.data : [];
            
            const partsWithStatus = partsArray.map((part: any) => ({
                work_order: part.work_order || '',
                part_number: part.part_number || '',
                description: part.description || '',
                quantity_required: Number(part.quantity_required) || 0,
                quantity_supplied: Number(part.quantity_supplied) || 0,
                status: part.quantity_supplied >= part.quantity_required ? 'dispatched' : 'requested'
            }));

            setParts(partsWithStatus);
            setLastUpdated(new Date().toLocaleTimeString());
        } catch (err: any) {
            console.error("Failed to load missing parts:", err);
            toast.error(err.message || 'Failed to load missing parts');
            setParts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMissingParts();
        const interval = setInterval(fetchMissingParts, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleDispatch = async (part: MissingPart) => {
        const partKey = `${part.work_order}-${part.part_number}`;
        
        try {
            setDispatching(prev => ({ ...prev, [partKey]: true }));
            
            // Dispatch the full missing quantity
            const quantityToDispatch = part.quantity_required - part.quantity_supplied;
            
            await api.post('/warehouse/dispatch', {
                part_number: part.part_number,
                quantity_supplied: quantityToDispatch,
                station_number: "1",
                work_order_id: part.work_order
            });
            
            // Optimistic update - mark as fully dispatched
            setParts(prev => prev.map(p => 
                p.work_order === part.work_order && p.part_number === part.part_number
                    ? { 
                        ...p, 
                        quantity_supplied: p.quantity_required,
                        status: 'dispatched'
                    }
                    : p
            ));
            
            toast.success(`Dispatched ${quantityToDispatch} ${part.description}`);
        } catch (err: any) {
            console.error('Dispatch failed:', err);
            toast.error(err.response?.data?.error || 'Dispatch failed');
        } finally {
            setDispatching(prev => ({ ...prev, [partKey]: false }));
        }
    };

    return (
        <div className="overflow-x-auto">
            <LiveStatusBar lastUpdated={lastUpdated} />
            <div className="flex flex-col gap-6 min-w-[600px]">
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
                                <div 
                                    key={`${part.work_order}-${part.part_number}`} 
                                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-medium">{part.description}</h3>
                                            <p className="text-sm text-gray-600">
                                                Part #: {part.part_number} • WO: {part.work_order}
                                            </p>
                                            <div className="mt-2 flex gap-4">
                                                <span className="text-sm">
                                                    Needed: <span className="font-medium">{part.quantity_required}</span>
                                                </span>
                                                <span className="text-sm">
                                                    Supplied: <span className="font-medium">{part.quantity_supplied}</span>
                                                </span>
                                                <span className="text-sm">
                                                    Missing: <span className="font-medium text-red-600">
                                                        {part.quantity_required - part.quantity_supplied}
                                                    </span>
                                                </span>
                                            </div>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                            statusColors[part.status] || statusColors.default
                                        }`}>
                                            {part.status}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex justify-end">
                                        {part.status === 'requested' && (
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