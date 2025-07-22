import React from "react";

// Mock notifications (should be replaced with real data or props/context)
const mockNotifications = [
    { id: 1, section: "workOrders", message: "Work Order WO-001 failed.", timestamp: "10:00", read: false },
    { id: 2, section: "comments", message: "New comment on WO-002.", timestamp: "10:05", read: false },
    { id: 3, section: "missingParts", message: "Part #555 is missing.", timestamp: "10:10", read: false },
    { id: 4, section: "workOrders", message: "Work Order WO-003 completed.", timestamp: "10:15", read: true },
];

export default function NotificationsPage() {
    return (
        <div className="min-h-screen flex flex-col items-center bg-gray-50 py-10 px-4">
            <div className="w-full max-w-xl bg-white rounded-xl shadow-lg p-8">
                <h1 className="text-2xl font-bold mb-6">All Notifications & Updates</h1>
                <ul className="divide-y divide-gray-200">
                    {mockNotifications.length > 0 ? mockNotifications.map(n => (
                        <li key={n.id} className="py-4 flex flex-col">
                            <span className="text-gray-800 text-base">{n.message}</span>
                            <span className="text-xs text-gray-400 mt-1">{n.timestamp}</span>
                        </li>
                    )) : (
                        <li className="py-4 text-gray-400 text-base">No notifications.</li>
                    )}
                </ul>
            </div>
        </div>
    );
} 