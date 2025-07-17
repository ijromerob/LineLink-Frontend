"use client"

import { useState } from "react"
import type React from "react"
import { Monitor, BarChart3, Users, Shield, AlertTriangle, CheckCircle, MessageCircle, Package, Truck, ClipboardList, Key, History, ListChecks, Clock, XCircle, Menu, X } from "lucide-react"
import { Button } from "../../components/ui/button"
import WorkOrdersSection from "../../components/dashboard/WorkOrdersSection"
import DashboardSidebar from "../../components/dashboard/DashboardSidebar"
import MissingPartsSection from "../../components/dashboard/MissingPartsSection"
import HistoricalDataSection from "../../components/dashboard/HistoricalDataSection"
import AuditTrailSection from "../../components/dashboard/AuditTrailSection"
import ReceivingInterfaceSection from "../../components/dashboard/ReceivingInterfaceSection"
import ProductionOverviewSection from "../../components/dashboard/ProductionOverviewSection"
import CommentsSection from "../../components/dashboard/CommentsSection"

// Mock data for missing parts (should match MissingPartsSection)
const mockMissingParts = [
    {
        id: 1,
        workOrder: "WO-001",
        part: "123",
        qty: 10,
        status: "Requested",
    },
    {
        id: 2,
        workOrder: "WO-004",
        part: "999",
        qty: 2,
        status: "Dispatched",
    },
    {
        id: 3,
        workOrder: "WO-002",
        part: "555",
        qty: 5,
        status: "Requested",
    },
    {
        id: 4,
        workOrder: "WO-003",
        part: "888",
        qty: 1,
        status: "Acknowledged",
    },
]
const missingPartsNotificationCount = mockMissingParts.filter(p => p.status === "Requested").length

// Restore other notification counts for other sections
const failedWorkOrdersCount = 1 // e.g., number of failed work orders
const newCommentsCount = 2 // e.g., number of new/unread comments

const sections = [
    {
        key: "productionOverview",
        label: "Production Overview",
        icon: <Monitor className="w-5 h-5 mr-2" />,
        content: <ProductionOverviewSection />,
        notificationCount: 0,
    },
    {
        key: "workOrders",
        label: "Work Orders",
        icon: <ClipboardList className="w-5 h-5 mr-2" />,
        content: <WorkOrdersSection />,
        notificationCount: failedWorkOrdersCount,
    },
    {
        key: "comments",
        label: "Comments & Issues",
        icon: <MessageCircle className="w-5 h-5 mr-2" />,
        content: <CommentsSection />,
        notificationCount: newCommentsCount,
    },
    {
        key: "partsRequests",
        label: "Parts Requests",
        icon: <Package className="w-5 h-5 mr-2" />,
        content: <ReceivingInterfaceSection />,
        notificationCount: 0,
    },
    {
        key: "missingParts",
        label: "Missing Parts",
        icon: <XCircle className="w-5 h-5 mr-2" />,
        content: <MissingPartsSection />,
        notificationCount: missingPartsNotificationCount,
    },

    // {
    //     key: "permissions",
    //     label: "Permissions",
    //     icon: <Key className="w-5 h-5 mr-2" />,
    //     content: (
    //         <div>
    //             <h2 className="text-xl font-bold mb-2">Permissions</h2>
    //             <p className="text-gray-600 mb-4">Delegate permissions to team members.</p>
    //             <div className="bg-white rounded-lg shadow p-4">[Permissions Placeholder]</div>
    //         </div>
    //     ),
    //     notificationCount: 0,
    // },
    {
        key: "historicalData",
        label: "Historical Data",
        icon: <History className="w-5 h-5 mr-2" />,
        content: <HistoricalDataSection />,
        notificationCount: 0,
    },
    {
        key: "auditTrail",
        label: "Audit Trail",
        icon: <ListChecks className="w-5 h-5 mr-2" />,
        content: <AuditTrailSection />,
        notificationCount: 0,
    },



]

export default function Dashboard() {
    const [selected, setSelected] = useState(sections[0].key)
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const selectedSection = sections.find((s) => s.key === selected)

    return (
        <div className="min-h-screen flex flex-col bg-gray-100">
            <header className="sticky top-0 z-20 bg-white bg-opacity-90 backdrop-blur h-16 flex-shrink-0 shadow-sm flex items-center">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                <Monitor className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-medium text-gray-900">LineLink</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <Button variant="ghost" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50">Sign out</Button>
                            <button className="lg:hidden ml-2 p-2 rounded hover:bg-gray-100" onClick={() => setSidebarOpen(!sidebarOpen)}>
                                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>
            </header>
            <div className="flex flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ height: 'calc(100vh - 6rem)' }}>
                {/* Sidebar */}
                <DashboardSidebar
                    sections={sections}
                    selected={selected}
                    setSelected={setSelected}
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                />
                {/* Main Content */}
                <main className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 6rem)' }}>
                    {selectedSection ? selectedSection.content : null}
                </main>
            </div>
            <footer className="h-12 flex-shrink-0 bg-white border-t border-gray-200 flex items-center justify-center text-center text-sm text-gray-600">
                <p className="w-full">&copy; 2025 LineLink. All rights reserved.</p>
            </footer>
        </div>
    )
} 