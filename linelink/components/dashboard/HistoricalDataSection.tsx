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
        <div className="w-full">
            <LiveStatusBar lastUpdated={lastUpdated} className="mb-4" />
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 sm:p-6">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center">
                        <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
                        Historical Work Orders
                    </h2>
                    
                    <div className="overflow-x-auto -mx-2 sm:mx-0">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Work Order
                                    </th>
                                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                                        Status
                                    </th>
                                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Parts
                                    </th>
                                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                                        Resolution
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-3 py-4 text-center">
                                            <div className="flex flex-col items-center justify-center py-6">
                                                <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-gray-500 mb-2" />
                                                <span className="text-sm sm:text-base text-gray-600">Loading work orders...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={4} className="px-3 py-4 text-center">
                                            <div className="py-4">
                                                <p className="text-red-500 text-sm sm:text-base mb-3">{error}</p>
                                                <button 
                                                    onClick={fetchWorkOrders}
                                                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                                >
                                                    Retry
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : workOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-3 py-8 text-center">
                                            <p className="text-gray-500 text-sm sm:text-base">No completed work orders found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    workOrders.map((order) => (
                                        <tr key={order.work_order_id} className="hover:bg-gray-50">
                                            <td className="px-3 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {order.work_order_id}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {order.product_number} • Qty: {order.quantity_to_produce}
                                                </div>
                                                <div className="sm:hidden mt-1">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        order.is_completed 
                                                            ? 'bg-green-100 text-green-800' 
                                                            : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {order.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 whitespace-nowrap hidden sm:table-cell">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    order.is_completed 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <Package className="flex-shrink-0 h-5 w-5 text-gray-500 mr-2" />
                                                    <div className="text-sm text-gray-900">
                                                        <div className="flex items-center">
                                                            <span className="font-medium">Missing:</span>
                                                            <span className="ml-1">{order.parts_missing}</span>
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            Supplied: {order.parts_supplied}/{order.total_parts_needed}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                                                <div className="flex items-center">
                                                    {order.resolution}
                                                    {order.is_completed && (
                                                        <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                                                    )}
                                                </div>
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
    )
} 