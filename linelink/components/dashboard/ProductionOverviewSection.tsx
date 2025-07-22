"use client"

import { Monitor, BarChart3, Users, AlertTriangle, CheckCircle } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import LiveStatusBar from "./LiveStatusBar"
import { useState, useEffect } from "react"

const metrics = {
    totalOrders: 24,
    completed: 12,
    atRisk: 3,
    delayed: 2,
    missingParts: 5,
}

const completionsOverTime = [
    { date: 'Mon', completed: 2 },
    { date: 'Tue', completed: 3 },
    { date: 'Wed', completed: 1 },
    { date: 'Thu', completed: 4 },
    { date: 'Fri', completed: 2 },
    { date: 'Sat', completed: 0 },
    { date: 'Sun', completed: 0 },
]

const statusBreakdown = [
    { name: 'Completed', value: 12 },
    { name: 'At Risk', value: 3 },
    { name: 'Delayed', value: 2 },
    { name: 'Active', value: 7 },
]

const COLORS = ['#22c55e', '#facc15', '#ef4444', '#3b82f6']

const metricTrends = {
    totalOrders: { trend: "up" as "up", change: 2 },
    completed: { trend: "up" as "up", change: 1 },
    atRisk: { trend: "down" as "down", change: -1 },
    delayed: { trend: "up" as "up", change: 1 },
    missingParts: { trend: "down" as "down", change: -2 },
};

const metricSub = {
    totalOrders: "+2 today",
    completed: "Avg. Time: 2.5h",
    atRisk: "1 resolved",
    delayed: "2 overdue",
    missingParts: "3 resolved",
};

const recentActivity = [
    { time: "09:15", user: "Alice", action: "Completed WO-003" },
    { time: "09:20", user: "Bob", action: "Delayed WO-005" },
    { time: "10:00", user: "Sam", action: "At Risk: WO-002" },
    { time: "10:30", user: "Warehouse", action: "Parts Dispatched for WO-004" },
    { time: "11:00", user: "Production", action: "Completed WO-001" },
];

function getNowString() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function ProductionOverviewSection() {
    const [lastUpdated, setLastUpdated] = useState(getNowString())
    useEffect(() => {
        setLastUpdated(getNowString())
    }, [])
    return (
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <LiveStatusBar lastUpdated={lastUpdated} />
            {/* Metric Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-10">
                <MetricCard label="Total Orders" value={metrics.totalOrders} icon={<ClipboardIcon />} color="bg-blue-100 text-blue-800" trend={metricTrends.totalOrders.trend} change={metricTrends.totalOrders.change} subMetric={metricSub.totalOrders} />
                <MetricCard label="Completed" value={metrics.completed} icon={<CheckCircle className="w-5 h-5" />} color="bg-green-100 text-green-800" trend={metricTrends.completed.trend} change={metricTrends.completed.change} subMetric={metricSub.completed} />
                <MetricCard label="At Risk" value={metrics.atRisk} icon={<AlertTriangle className="w-5 h-5" />} color="bg-yellow-100 text-yellow-800" trend={metricTrends.atRisk.trend} change={metricTrends.atRisk.change} subMetric={metricSub.atRisk} />
                <MetricCard label="Delayed" value={metrics.delayed} icon={<AlertTriangle className="w-5 h-5" />} color="bg-red-100 text-red-800" trend={metricTrends.delayed.trend} change={metricTrends.delayed.change} subMetric={metricSub.delayed} />
                <MetricCard label="Missing Parts" value={metrics.missingParts} icon={<BarChart3 className="w-5 h-5" />} color="bg-orange-100 text-orange-800" trend={metricTrends.missingParts.trend} change={metricTrends.missingParts.change} subMetric={metricSub.missingParts} />
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
                <ul className="divide-y divide-gray-200">
                    {recentActivity.map((item, i) => (
                        <li key={i} className="flex items-center justify-between py-2">
                            <span className="text-sm text-gray-700"><span className="font-semibold text-blue-700">{item.user}</span> — {item.action}</span>
                            <span className="text-xs text-gray-400 ml-4">{item.time}</span>
                        </li>
                    ))}
                </ul>
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