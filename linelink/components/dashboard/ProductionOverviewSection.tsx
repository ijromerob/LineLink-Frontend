"use client"

import { AlertTriangle, CheckCircle, AlertCircle, Loader2, Calendar, Download as DownloadIcon, BarChart2, LineChart as LineChartIcon, RefreshCw, FileDown } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts'
import { DateRange } from 'react-day-picker'
import { subDays, format, differenceInDays, addDays, isSameDay } from 'date-fns';
import { toast } from 'react-hot-toast'
import { Button } from "../ui/button"
import { useApi } from "@/contexts/AuthContext"
import LiveStatusBar from "./LiveStatusBar"
import { useState, useEffect } from "react"

interface WorkOrder {
    id: string;
    work_order_id: string;
    product_number: string;
    quantity_to_produce: number;
    is_completed: boolean;
    parts_missing: number;
    parts_supplied: number;
    total_parts_needed: number;
    partsRequested?: Array<{ part: string; qty: number }>;
    created_at?: string;
    updated_at?: string;
    completed_at?: string;
}

interface WorkOrdersResponse {
    work_orders: WorkOrder[];
}

interface ReportData {
    date: string;
    completed: number;
    inProgress: number;
    defects: number;
    efficiency: number;
}

const COLORS = {
    completed: '#22c55e',
    inProgress: '#3b82f6',
    defects: '#ef4444',
    efficiency: '#8b5cf6'
}

function MetricCard({ 
    label, 
    value, 
    icon, 
    color, 
    trend, 
    change, 
    subMetric 
}: { 
    label: string; 
    value: string | number; 
    icon: React.ReactNode; 
    color: string; 
    trend?: "up" | "down"; 
    change?: number; 
    subMetric?: string; 
}) {
    return (
        <div className="flex items-center gap-2 p-3 bg-white rounded-lg shadow">
            <div className={`p-2 rounded-full ${color} bg-opacity-20`}>
                {icon}
            </div>
            <div>
                <div className="text-sm text-gray-500">{label}</div>
                <div className="flex items-center gap-2">
                    <div className="text-lg font-semibold">{value}</div>
                    {trend && change !== undefined && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                            {trend === 'up' ? '↑' : '↓'} {change}%
                        </span>
                    )}
                </div>
                {subMetric && (
                    <div className="text-xs text-gray-500">{subMetric}</div>
                )}
            </div>
        </div>
    );
}

function ClipboardIcon() {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="w-5 h-5"
        >
            <rect x="8" y="4" width="12" height="16" rx="2" ry="2" />
            <path d="M16 2v2a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V2z" />
        </svg>
    );
}

const getNowString = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const getRecentActivity = (workOrders: WorkOrder[]) => {
    if (!workOrders || !Array.isArray(workOrders)) return [];
    
    return workOrders
        .sort((a, b) => b.work_order_id.localeCompare(a.work_order_id))
        .slice(0, 5)
        .map(wo => {
            let action = '';
            if (wo.is_completed) {
                action = `Completed ${wo.work_order_id}`;
            } else if (wo.parts_missing > 0) {
                action = `Parts missing for ${wo.work_order_id} (${wo.parts_missing} parts)`;
            } else {
                action = `In progress: ${wo.work_order_id}`;
            }
            
            return {
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                user: 'System',
                action
            };
        });
};

// Function to convert data to CSV format
const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    
    // Get headers from the first object's keys
    const headers = Object.keys(data[0]);
    
    // Create CSV header row
    let csvContent = headers.join(',') + '\n';
    
    // Add data rows
    data.forEach(item => {
        const row = headers.map(header => {
            const value = item[header];
            // Handle values that might contain commas or quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csvContent += row.join(',') + '\n';
    });
    
    return csvContent;
};

// Function to trigger download
export default function ProductionOverviewSection() {
    const api = useApi();
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
    const [lastUpdated, setLastUpdated] = useState(getNowString());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [reportData, setReportData] = useState<ReportData[]>([]);
    const [dateRange, setDateRange] = useState<DateRange>({
        from: subDays(new Date(), 30),
        to: new Date(),
    });
    const [activeChart, setActiveChart] = useState<'production' | 'defects' | 'efficiency'>('production');
    
    // Key metrics state
    const [metrics, setMetrics] = useState({
        totalOrders: 0,
        completed: 0,
        inProgress: 0,
        defectRate: '0',
        avgEfficiency: '0'
    });

    // Update metrics when workOrders or reportData changes
    useEffect(() => {
        setMetrics({
            totalOrders: workOrders.length,
            completed: workOrders.filter(wo => wo.is_completed).length,
            inProgress: workOrders.filter(wo => !wo.is_completed).length,
            defectRate: reportData.length > 0 
                ? (reportData.reduce((sum, day) => sum + day.defects, 0) / 
                   (reportData.reduce((sum, day) => sum + day.completed + day.inProgress, 0) || 1) * 100).toFixed(1)
                : '0',
            avgEfficiency: reportData.length > 0 
                ? (reportData.reduce((sum, day) => sum + day.efficiency, 0) / reportData.length).toFixed(1)
                : '0'
        });
    }, [workOrders, reportData]);

    const fetchWorkOrders = async () => {
        try {
            setLoading(true);
            const response = await api.get<WorkOrdersResponse>('/workorders/');
            
            // Handle array of arrays structure
            let workOrdersData: WorkOrder[] = [];
            
            if (Array.isArray(response?.work_orders)) {
                // Flatten the array of arrays into a single array of work orders
                workOrdersData = response.work_orders.flat();
                
                // If it wasn't an array of arrays, try to use it directly
                if (workOrdersData.length === 0 && response.work_orders.length > 0) {
                    workOrdersData = response.work_orders as unknown as WorkOrder[];
                }
            }
            
            // Filter out any null/undefined values that might have been in the arrays
            workOrdersData = workOrdersData.filter(Boolean);
            
            setWorkOrders(workOrdersData);
            
            // Group by work_order_id to get unique work orders
            const workOrdersMap = new Map();
            workOrdersData.forEach(wo => {
                if (!workOrdersMap.has(wo.work_order_id)) {
                    workOrdersMap.set(wo.work_order_id, {
                        ...wo,
                        // If any item in the work order is not completed, mark the whole work order as not completed
                        is_completed: workOrdersData.every(item => 
                            item.work_order_id === wo.work_order_id ? item.is_completed : true
                        )
                    });
                }
            });
            
            const uniqueWorkOrders = Array.from(workOrdersMap.values());
            setWorkOrders(uniqueWorkOrders);
            
            setLastUpdated(getNowString());
            setError(null);
        } catch (err) {
            console.error('Error fetching work orders:', err);
            setError('Failed to load work orders. Please try again later.');
            // Reset metrics on error
            setMetrics({
                totalOrders: 0,
                completed: 0,
                inProgress: 0,
                defectRate: '0',
                avgEfficiency: '0'
            });
            setWorkOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const generateMockData = (): ReportData[] => {
        const data: ReportData[] = [];
        const today = new Date();
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        
        for (let i = days - 1; i >= 0; i--) {
            const date = subDays(today, i);
            const completed = Math.floor(Math.random() * 20) + 5;
            const inProgress = Math.floor(Math.random() * 15) + 3;
            const defects = Math.floor(Math.random() * 5);
            
            data.push({
                date: format(date, 'MMM dd'),
                completed,
                inProgress,
                defects,
                efficiency: Math.min(100, Math.floor((completed / (completed + inProgress + defects)) * 100))
            });
        }
        
        return data;
    };

    const handleExportData = () => {
        try {
            // Prepare data for export based on active chart
            let dataToExport: any[] = [];
            
            if (activeChart === 'production') {
                dataToExport = reportData.map(item => ({
                    date: item.date,
                    completed: item.completed,
                    inProgress: item.inProgress,
                    total: item.completed + item.inProgress
                }));
            } else if (activeChart === 'defects') {
                dataToExport = reportData.map(item => ({
                    date: item.date,
                    defects: item.defects,
                    totalProduction: item.completed + item.inProgress,
                    defectRate: ((item.defects / (item.completed + item.inProgress || 1)) * 100).toFixed(1) + '%'
                }));
            } else if (activeChart === 'efficiency') {
                dataToExport = reportData.map(item => ({
                    date: item.date,
                    efficiency: item.efficiency.toFixed(1) + '%',
                    completed: item.completed,
                    inProgress: item.inProgress
                }));
            }
            
            if (dataToExport.length === 0) {
                toast.error('No data available to export');
                return;
            }
            
            // Convert to CSV
            const csvContent = convertToCSV(dataToExport);
            
            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            // Set filename based on active chart
            const chartType = activeChart.charAt(0).toUpperCase() + activeChart.slice(1);
            const dateStr = new Date().toISOString().split('T')[0];
            link.download = `LineLink_${chartType}_Report_${dateStr}.csv`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            URL.revokeObjectURL(url);
            
            toast.success('Export completed successfully');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export data');
        }
    };

    // Update date range when timeRange changes
    useEffect(() => {
        if (timeRange !== 'custom') {
            const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
            setDateRange({
                from: subDays(new Date(), days - 1),
                to: new Date()
            });
        }
    }, [timeRange]);

    // Fetch data when date range or any other dependency changes
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                await Promise.all([
                    loadMetrics(),
                    fetchWorkOrders()
                ]);
                
                // Generate report data based on the selected time range
                if (dateRange.from && dateRange.to) {
                    const days = differenceInDays(dateRange.to, dateRange.from) + 1;
                    const reportData = [];
                    
                    for (let i = 0; i < days; i++) {
                        const currentDate = addDays(dateRange.from, i);
                        const dateKey = format(currentDate, 'MMM dd');
                        
                        // Filter work orders for this date
                        const dailyWorkOrders = workOrders.filter(wo => {
                            // If no timestamps are available, include all work orders
                            if (!wo.created_at && !wo.updated_at) {
                                return true;
                            }
                            
                            // Use the most recent timestamp available
                            const timestamp = wo.updated_at || wo.created_at || '';
                            const woDate = new Date(timestamp);
                            
                            // If date is invalid, include it (this handles cases where timestamps might be missing)
                            if (isNaN(woDate.getTime())) {
                                return true;
                            }
                            
                            return isSameDay(woDate, currentDate);
                        });
                        
                        const completed = dailyWorkOrders.filter(wo => wo.is_completed).length;
                        const inProgress = dailyWorkOrders.filter(wo => !wo.is_completed).length;
                        const defects = dailyWorkOrders.filter(wo => wo.parts_missing > 0).length;
                        
                        reportData.push({
                            date: dateKey,
                            completed,
                            inProgress,
                            defects,
                            efficiency: dailyWorkOrders.length > 0 
                                ? Math.round((completed / dailyWorkOrders.length) * 100) 
                                : 0
                        });
                    }
                    
                    setReportData(reportData);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                setError('Failed to load production data. Please try again.');
            } finally {
                setLoading(false);
                setLastUpdated(getNowString());
            }
        };

        fetchData();
        
        const interval = setInterval(() => {
            fetchData();
        }, 30000);

        return () => clearInterval(interval);
    }, [JSON.stringify(dateRange)]); // Use JSON.stringify to avoid unnecessary re-renders

    const loadMetrics = async () => {
        try {
            setLoading(true);
            
        } catch (error) {
            console.error('Error fetching metrics:', error);
            setError('Failed to load metrics. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const renderChart = () => {
        if (loading) {
            return (
                <div className="flex justify-center items-center h-80">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
            );
        }

        if (reportData.length === 0) {
            return (
                <div className="flex justify-center items-center h-80 text-gray-500">
                    No data available for the selected period
                </div>
            );
        }

        return (
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    {activeChart === 'production' ? (
                        <BarChart data={reportData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="completed" name="Completed" fill={COLORS.completed} />
                            <Bar dataKey="inProgress" name="In Progress" fill={COLORS.inProgress} />
                            <Bar dataKey="defects" name="Defects" fill={COLORS.defects} />
                        </BarChart>
                    ) : activeChart === 'defects' ? (
                        <LineChart data={reportData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line 
                                type="monotone" 
                                dataKey="defects" 
                                name="Defects" 
                                stroke={COLORS.defects} 
                                activeDot={{ r: 8 }} 
                            />
                        </LineChart>
                    ) : (
                        <LineChart data={reportData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip formatter={(value: number) => [`${value}%`, 'Efficiency']} />
                            <Legend />
                            <Line 
                                type="monotone" 
                                dataKey="efficiency" 
                                name="Efficiency" 
                                stroke={COLORS.efficiency}
                                strokeWidth={2}
                            />
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </div>
        );
    };

    // Get recent activities
    const recentActivities = getRecentActivity(workOrders);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2">Loading production data...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 md:space-y-6 px-2 sm:px-0">
            <div className="flex flex-col space-y-3 sm:space-y-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold">Production Analytics</h2>
                        <p className="text-xs sm:text-sm text-gray-500">Comprehensive overview of production metrics</p>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                        Updated: {lastUpdated}
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-wrap items-center gap-1 bg-gray-100 rounded-md p-1 text-xs sm:text-sm">
                        {['7d', '30d', '90d'].map((range) => (
                            <button
                                key={range}
                                onClick={() => {
                                    setTimeRange(range as any);
                                    setDateRange({
                                        from: subDays(new Date(), parseInt(range)),
                                        to: new Date(),
                                    });
                                }}
                                className={`px-2 py-1 sm:px-3 sm:py-1 rounded-md whitespace-nowrap ${
                                    timeRange === range ? 'bg-white shadow' : 'hover:bg-gray-200'
                                }`}
                            >
                                {range.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        {/* <Button variant="outline" size="sm" className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Custom</span>
                        </Button> */}
                        <Button variant="outline" size="sm" onClick={handleExportData} className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9">
                            <DownloadIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Export</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                <MetricCard 
                    label="Total Orders" 
                    value={metrics.totalOrders} 
                    icon={<ClipboardIcon />} 
                    color="bg-blue-100 text-blue-700"
                />
                <MetricCard 
                    label="Completed" 
                    value={metrics.completed} 
                    icon={<CheckCircle className="w-5 h-5" />} 
                    color="bg-green-100 text-green-700"
                    trend={metrics.completed > 0 ? "up" : undefined}
                    change={5}
                />
                <MetricCard 
                    label="In Progress" 
                    value={metrics.inProgress} 
                    icon={<AlertTriangle className="w-5 h-5" />} 
                    color="bg-yellow-100 text-yellow-700"
                />
                <MetricCard 
                    label="Avg. Efficiency" 
                    value={`${metrics.avgEfficiency}%`} 
                    icon={<BarChart2 className="w-5 h-5" />} 
                    color="bg-purple-100 text-purple-700"
                    subMetric={`${metrics.defectRate}% defect rate`}
                />
            </div>

            {/* Main Chart */}
            <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-medium whitespace-nowrap">
                        {activeChart === 'production' ? 'Production Overview' : 
                         activeChart === 'defects' ? 'Defect Trends' : 'Production Efficiency'}
                    </h3>
                    <div className="w-full sm:w-auto">
                        <div className="flex flex-wrap items-center gap-1 bg-gray-100 rounded-md p-1 text-xs sm:text-sm">
                            <button
                                onClick={() => setActiveChart('production')}
                                className={`px-2 py-1 sm:px-3 sm:py-1 rounded-md flex items-center gap-1 whitespace-nowrap ${
                                    activeChart === 'production' ? 'bg-white shadow' : 'hover:bg-gray-200'
                                }`}
                            >
                                <BarChart2 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span className="truncate">Production</span>
                            </button>
                            <button
                                onClick={() => setActiveChart('defects')}
                                className={`px-2 py-1 sm:px-3 sm:py-1 rounded-md flex items-center gap-1 whitespace-nowrap ${
                                    activeChart === 'defects' ? 'bg-white shadow' : 'hover:bg-gray-200'
                                }`}
                            >
                                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span className="truncate">Defects</span>
                            </button>
                            <button
                                onClick={() => setActiveChart('efficiency')}
                                className={`px-2 py-1 sm:px-3 sm:py-1 rounded-md flex items-center gap-1 whitespace-nowrap ${
                                    activeChart === 'efficiency' ? 'bg-white shadow' : 'hover:bg-gray-200'
                                }`}
                            >
                                <LineChartIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span className="truncate">Efficiency</span>
                            </button>
                        </div>
                    </div>
                </div>
                {renderChart()}
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <h3 className="text-base sm:text-lg font-medium">Recent Activity</h3>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={fetchWorkOrders}
                            className="h-9 text-xs sm:text-sm"
                        >
                            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            Refresh
                        </Button>
                        
                    </div>
                </div>
                <div className="space-y-3 sm:space-y-4">
                    {recentActivities.length > 0 ? (
                        recentActivities.map((activity, index) => (
                            <div key={index} className="flex items-start pb-3 sm:pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                                <div className="bg-gray-100 p-1.5 sm:p-2 rounded-full mr-2 sm:mr-3 flex-shrink-0">
                                    {activity.action.includes('Completed') ? (
                                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                                    ) : activity.action.includes('missing') ? (
                                        <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                                    ) : (
                                        <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                                        <p className="text-xs sm:text-sm font-medium truncate">{activity.action}</p>
                                        <span className="text-xs text-gray-500 whitespace-nowrap">{activity.time}</span>
                                    </div>
                                    <p className="text-xs text-gray-500">by {activity.user}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            No recent activity to display
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}