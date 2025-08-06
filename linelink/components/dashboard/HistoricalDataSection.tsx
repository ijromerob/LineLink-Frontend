import { Package, ClipboardList, CheckCircle, Loader2 } from "lucide-react"
import LiveStatusBar from "./LiveStatusBar"
import { useState, useEffect } from "react"
import { useApi } from "@/contexts/AuthContext"

interface WorkOrder {
    work_order_id: string;
    is_completed: boolean;
    product_number: string;
    quantity_to_produce: number;
    parts_missing: number;
    parts_supplied: number;
    total_parts_needed: number;
    // Added for UI display
    status?: string;
    resolution?: string;
}

function getNowString() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function HistoricalDataSection() {
    const api = useApi();
    const [lastUpdated, setLastUpdated] = useState(getNowString())
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchWorkOrders = async () => {
        try {
            setLoading(true);
            console.log('Starting to fetch work orders...');
            
            // Log the start of the API call
            const startTime = Date.now();
            console.log(`[${new Date().toISOString()}] Calling API: /workorders/`);
            
            try {
                const response = await api.get<{ work_orders: WorkOrder[] }>('/workorders/');
                const endTime = Date.now();
                
                console.log(`[${new Date().toISOString()}] API call completed in ${endTime - startTime}ms`);
                console.log('Raw API Response:', JSON.stringify(response, null, 2));
                
                if (!response) {
                    throw new Error('No response received from server');
                }
                
                if (!response.work_orders) {
                    console.warn('Response does not contain work_orders property. Full response:', response);
                    throw new Error('Invalid response format: missing work_orders');
                }
                
                if (!Array.isArray(response.work_orders)) {
                    console.error('work_orders is not an array:', response.work_orders);
                    throw new Error('Invalid response format: work_orders is not an array');
                }
                
                console.log(`Received ${response.work_orders.length} work orders`);
                
                // Map the API response to our WorkOrder interface
                const workOrdersData: WorkOrder[] = response.work_orders.map(order => {
                    if (!order.work_order_id) {
                        console.warn('Work order missing work_order_id:', order);
                    }
                    return {
                        ...order,
                        status: order.is_completed ? 'Completed' : 'In Progress',
                        resolution: order.is_completed ? 'Production completed' : 'In production'
                    };
                });
                
                console.log('Mapped work orders:', workOrdersData);
                
                // Filter for completed work orders
                const completedOrders = workOrdersData.filter(order => order.is_completed);
                console.log(`Found ${completedOrders.length} completed work orders`);
                
                setWorkOrders(completedOrders);
                setLastUpdated(getNowString());
                setError(null);
                
            } catch (apiError) {
                const errorTime = Date.now();
                const errorDuration = errorTime - startTime;
                console.error(`[${new Date().toISOString()}] API call failed after ${errorDuration}ms`, apiError);
                throw apiError; // Re-throw to be caught by the outer catch
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Error in fetchWorkOrders:', {
                error: errorMessage,
                timestamp: new Date().toISOString(),
                stack: error instanceof Error ? error.stack : 'No stack trace',
                errorObject: error
            });
            
            setError(`Failed to load work orders: ${errorMessage}`);
            setWorkOrders([]); // Clear existing work orders on error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkOrders();
        // Refresh data every 30 seconds
        const interval = setInterval(fetchWorkOrders, 30000);
        return () => clearInterval(interval);
    }, [])

    return (
        <div className="overflow-x-auto">
            <LiveStatusBar lastUpdated={lastUpdated} />
            <div className="flex flex-col lg:flex-row gap-6 min-w-[600px]">
                {/* Historical Data Card */}
                <div className="bg-white rounded-xl shadow-lg p-8 flex-1 min-w-[320px]">
                    <h2 className="text-2xl font-bold mb-6 flex items-center"><ClipboardList className="w-6 h-6 mr-3" />Historical Work Orders</h2>
                    <table className="min-w-full text-base">
                        <thead>
                            <tr className="text-left text-gray-700 border-b">
                                <th className="py-3 px-4">Work Order</th>
                                <th className="py-3 px-4">Completed</th>
                                <th className="py-3 px-4">Missing Parts</th>
                                <th className="py-3 px-4">Resolution</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-gray-500 mb-2" />
                                            <span>Loading work orders...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-red-500">
                                        {error}
                                        <button 
                                            onClick={fetchWorkOrders}
                                            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                        >
                                            Retry
                                        </button>
                                    </td>
                                </tr>
                            ) : workOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-gray-500">
                                        No completed work orders found
                                    </td>
                                </tr>
                            ) : (
                                workOrders.map(order => (
                                    <tr key={order.work_order_id} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="py-3 px-4 font-semibold">
                                            {order.work_order_id} - {order.product_number}
                                            <div className="text-sm text-gray-500">Qty: {order.quantity_to_produce}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                order.is_completed 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <Package className="w-5 h-5 text-gray-500" />
                                                <div>
                                                    <div>Missing: {order.parts_missing}</div>
                                                    <div className="text-sm text-gray-500">Supplied: {order.parts_supplied} / {order.total_parts_needed}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            {order.resolution}
                                            {order.is_completed && (
                                                <div className="text-sm text-green-600 mt-1">✓ Completed</div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
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