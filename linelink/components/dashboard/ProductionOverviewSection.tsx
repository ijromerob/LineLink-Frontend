"use client"

import { BarChart3, AlertTriangle, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import LiveStatusBar from "./LiveStatusBar"
import { useState, useEffect } from "react"
import { useApi } from "@/contexts/AuthContext"

interface WorkOrder {
    is_completed: boolean;
    parts_missing: number;
    parts_supplied: number;
    product_number: string;
    quantity_to_produce: number;
    total_parts_needed: number;
    work_order_id: string;
}

interface WorkOrdersResponse {
    work_orders: WorkOrder[];
}

const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6']

const getRecentActivity = (workOrders: WorkOrder[]) => {
    return workOrders
        .sort((a, b) => b.work_order_id.localeCompare(a.work_order_id))
        .slice(0, 5)
        .map(wo => ({
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            user: 'System',
            action: wo.is_completed 
                ? `Completed ${wo.work_order_id}` 
                : wo.parts_missing > 0 
                    ? `Parts missing for ${wo.work_order_id}`
                    : `In progress: ${wo.work_order_id}`
        }));
};

function getNowString() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function ProductionOverviewSection() {
    const api = useApi();
    const [lastUpdated, setLastUpdated] = useState(getNowString());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [metrics, setMetrics] = useState({
        totalOrders: 0,
        completed: 0,
        atRisk: 0,
        pending: 0,
        missingParts: 0,
    });

    const fetchWorkOrders = async () => {
        try {
            setLoading(true);
            const data = await api.get<WorkOrdersResponse>('/workorders/');
            setWorkOrders(data.work_orders);
            
            // Calculate metrics
            const totalOrders = data.work_orders?.length || 0;
            const completed = data.work_orders?.filter(wo => wo.is_completed).length || 0;
            const pending = data.work_orders?.filter(wo => !wo.is_completed).length || 0;
            const atRisk = data.work_orders?.filter(wo => !wo.is_completed && wo.parts_missing > 0).length || 0;
            const missingParts = data.work_orders?.filter(wo => wo.parts_missing > 0).length || 0;
            
            setMetrics({
                totalOrders,
                completed,
                atRisk,
                pending,
                missingParts,
            });
            setLastUpdated(getNowString());
            setError(null);
        } catch (err) {
            console.error('Error fetching work orders:', err);
            setError('Failed to load work orders. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchWorkOrders();

        // Set up auto-refresh
        const interval = setInterval(fetchWorkOrders, 30000);

        // Clean up interval on component unmount
        return () => clearInterval(interval);
    }, [api]);
    
    // Generate completion data for the last 7 days
    const getCompletionsOverTime = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days.map(day => ({
            date: day,
            completed: Math.floor(Math.random() * 5), // Replace with actual data when available
        }));
    };
    
    const completionsOverTime = getCompletionsOverTime();
    
    const statusBreakdown = [
        { name: 'Completed', value: metrics.completed },
        { name: 'At Risk', value: metrics.atRisk },
        { name: 'Pending', value: metrics.pending - metrics.atRisk },
    ];
    
    const metricTrends = {
        totalOrders: { trend: "up" as const, change: 0 },
        completed: { trend: "up" as const, change: 0 },
        atRisk: { trend: "down" as const, change: 0 },
        pending: { trend: "up" as const, change: 0 },
        missingParts: { trend: "down" as const, change: 0 },
    };
    
    const metricSub = {
        totalOrders: `${metrics.totalOrders} total`,
        completed: metrics.totalOrders > 0 ? `${Math.round((metrics.completed / metrics.totalOrders) * 100)}% of total` : 'No data',
        atRisk: metrics.atRisk > 0 ? `${metrics.atRisk} need attention` : 'All good',
        pending: `${metrics.pending} in progress`,
        missingParts: metrics.missingParts > 0 
            ? `${metrics.missingParts} orders affected` 
            : 'No missing parts',
    };
    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-8 flex justify-center items-center">
                <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                    <p className="text-gray-600">Loading work orders...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-8">
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <LiveStatusBar lastUpdated={lastUpdated} />
            {/* Metric Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-10">
                <MetricCard 
                    label="Total Orders" 
                    value={metrics.totalOrders} 
                    icon={<ClipboardIcon />} 
                    color="bg-blue-100 text-blue-800" 
                    trend={metricTrends.totalOrders.trend} 
                    change={metricTrends.totalOrders.change} 
                    subMetric={metricSub.totalOrders} 
                />
                <MetricCard 
                    label="Completed" 
                    value={metrics.completed} 
                    icon={<CheckCircle className="w-5 h-5" />} 
                    color="bg-green-100 text-green-800" 
                    trend={metricTrends.completed.trend} 
                    change={metricTrends.completed.change} 
                    subMetric={metricSub.completed} 
                />
                <MetricCard 
                    label="At Risk" 
                    value={metrics.atRisk} 
                    icon={<AlertTriangle className="w-5 h-5" />} 
                    color="bg-yellow-100 text-yellow-800" 
                    trend={metricTrends.atRisk.trend} 
                    change={metricTrends.atRisk.change} 
                    subMetric={metricSub.atRisk} 
                />
                <MetricCard 
                    label="Pending" 
                    value={metrics.pending} 
                    icon={<BarChart3 className="w-5 h-5" />} 
                    color="bg-purple-100 text-purple-800" 
                    trend={metricTrends.pending.trend} 
                    change={metricTrends.pending.change} 
                    subMetric={metricSub.pending} 
                />
                <MetricCard 
                    label="Missing Parts" 
                    value={metrics.missingParts} 
                    icon={<AlertTriangle className="w-5 h-5" />} 
                    color="bg-orange-100 text-orange-800" 
                    trend={metricTrends.missingParts.trend} 
                    change={metricTrends.missingParts.change} 
                    subMetric={metricSub.missingParts} 
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <h4 className="font-semibold text-lg mb-4">Completions Over Time</h4>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={completionsOverTime}>
                            <XAxis dataKey="date" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="completed" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <h4 className="font-semibold text-lg mb-4">Work Order Status Breakdown</h4>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie
                                data={statusBreakdown}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                // label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}
                                labelLine={false}
                                stroke="#fff"
                            >
                                {statusBreakdown.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Legend />
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            {/* Recent Activity Feed */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <h4 className="font-semibold text-lg mb-4">Recent Activity</h4>
                {workOrders.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                        {getRecentActivity(workOrders).map((item, i) => (
                            <li key={i} className="flex items-center justify-between py-2">
                                <span className="text-sm text-gray-700">
                                    <span className="font-semibold text-blue-700">{item.user}</span> — {item.action}
                                </span>
                                <span className="text-xs text-gray-400 ml-4">{item.time}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-gray-500">No recent activity to display</p>
                )}
            </div>
            {/* Main Grid (as on landing page) */}

        </div>

    )
}

function MetricCard({ label, value, icon, color, trend, change, subMetric }: { label: string, value: number, icon: React.ReactNode, color: string, trend?: "up" | "down", change?: number, subMetric?: string }) {
    return (
        <div className={`rounded-lg shadow-sm p-4 flex items-center gap-3 ${color}`}>
            <div className="w-8 h-8 flex items-center justify-center bg-white bg-opacity-80 rounded-full">
                {icon}
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold">{value}</div>
                    {trend === "up" && <span className="text-green-600 text-lg">▲</span>}
                    {trend === "down" && <span className="text-red-600 text-lg">▼</span>}
                    {typeof change === "number" && <span className="text-xs text-gray-500 ml-1">({change > 0 ? "+" : ""}{change})</span>}
                </div>
                <div className="text-xs font-medium uppercase tracking-wide">{label}</div>
                {subMetric && <div className="text-xs text-gray-500">{subMetric}</div>}
            </div>
        </div>
    )
}

function ClipboardIcon() {
    return (
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="8" y="2" width="8" height="4" rx="1" />
            <rect x="4" y="6" width="16" height="16" rx="2" />
        </svg>
    )
} 