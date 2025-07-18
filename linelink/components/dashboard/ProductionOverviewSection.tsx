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

function getNowString() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function ProductionOverviewSection() {
    const [lastUpdated, setLastUpdated] = useState(getNowString())
    useEffect(() => {
        setLastUpdated(getNowString())
    }, [])
    return (
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2">
            <LiveStatusBar lastUpdated={lastUpdated} />
            {/* Metric Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-10">
                <MetricCard label="Total Orders" value={metrics.totalOrders} icon={<ClipboardIcon />} color="bg-blue-100 text-blue-800" />
                <MetricCard label="Completed" value={metrics.completed} icon={<CheckCircle className="w-5 h-5" />} color="bg-green-100 text-green-800" />
                <MetricCard label="At Risk" value={metrics.atRisk} icon={<AlertTriangle className="w-5 h-5" />} color="bg-yellow-100 text-yellow-800" />
                <MetricCard label="Delayed" value={metrics.delayed} icon={<AlertTriangle className="w-5 h-5" />} color="bg-red-100 text-red-800" />
                <MetricCard label="Missing Parts" value={metrics.missingParts} icon={<BarChart3 className="w-5 h-5" />} color="bg-orange-100 text-orange-800" />
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
                                label
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

            {/* Main Grid (as on landing page) */}

        </div>

    )
}

function MetricCard({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color: string }) {
    return (
        <div className={`rounded-lg shadow-sm p-4 flex items-center gap-3 ${color}`}>
            <div className="w-8 h-8 flex items-center justify-center bg-white bg-opacity-80 rounded-full">
                {icon}
            </div>
            <div>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs font-medium uppercase tracking-wide">{label}</div>
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