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
        <div className="w-full">
            <LiveStatusBar lastUpdated={lastUpdated} className="mb-4" />
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6">
                        <h2 className="text-xl sm:text-2xl font-bold flex items-center mb-2 sm:mb-0">
                            <Package className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
                            Missing Parts
                        </h2>
                        <div className="text-xs sm:text-sm text-gray-500">
                            Updated: {lastUpdated}
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto -mx-2 sm:mx-0">
                        <div className="min-w-full">
                            {loading ? (
                                <div className="flex justify-center items-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                </div>
                            ) : parts.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Package className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                                    <p className="text-sm sm:text-base">No missing parts at the moment</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {parts.map((part) => (
                                        <div 
                                            key={`${part.work_order}-${part.part_number}`}
                                            className="border rounded-lg p-3 sm:p-4 hover:shadow-sm transition-shadow"
                                        >
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <h3 className="text-sm sm:text-base font-medium text-gray-900 line-clamp-2">
                                                            {part.description}
                                                        </h3>
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                                                            statusColors[part.status] || statusColors.default
                                                        }`}>
                                                            {part.status}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="mt-1 text-xs sm:text-sm text-gray-600">
                                                        <p>Part #: {part.part_number} • WO: {part.work_order}</p>
                                                    </div>
                                                    
                                                    <div className="mt-2 grid grid-cols-2 sm:flex sm:gap-4 text-xs sm:text-sm">
                                                        <div className="flex items-center">
                                                            <span className="text-gray-500 mr-1">Needed:</span>
                                                            <span className="font-medium">{part.quantity_required}</span>
                                                        </div>
                                                        <div className="flex items-center">
                                                            <span className="text-gray-500 mr-1">Supplied:</span>
                                                            <span className="font-medium">{part.quantity_supplied}</span>
                                                        </div>
                                                        <div className="col-span-2 mt-1 sm:mt-0 sm:flex items-center">
                                                            <span className="text-gray-500 mr-1">Missing:</span>
                                                            <span className="font-medium text-red-600">
                                                                {part.quantity_required - part.quantity_supplied}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {part.status === 'requested' && (
                                                    <div className="mt-2 sm:mt-0 sm:pl-4 border-t sm:border-t-0 sm:border-l border-gray-100 pt-3 sm:pt-0 sm:ml-4">
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            className="w-full sm:w-auto"
                                                            onClick={() => handleDispatch(part)}
                                                            disabled={dispatching[`${part.work_order}-${part.part_number}`]}
                                                        >
                                                            {dispatching[`${part.work_order}-${part.part_number}`] ? (
                                                                <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                                            ) : (
                                                                <Truck className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                                            )}
                                                            Dispatch
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}