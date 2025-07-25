"use client"

import React, { useState, useEffect } from "react"
import { Monitor, BarChart3, Users, Shield, AlertTriangle, CheckCircle, MessageCircle, Package, Truck, ClipboardList, Key, History, ListChecks, Clock, XCircle, Menu, X, CalendarPlus, Video, Bell } from "lucide-react"
import { Button } from "../../components/ui/button"
import WorkOrdersSection from "../../components/dashboard/WorkOrdersSection"
import DashboardSidebar from "../../components/dashboard/DashboardSidebar"
import MissingPartsSection from "../../components/dashboard/MissingPartsSection"
import HistoricalDataSection from "../../components/dashboard/HistoricalDataSection"
import AuditTrailSection from "../../components/dashboard/AuditTrailSection"
import ReceivingInterfaceSection from "../../components/dashboard/ReceivingInterfaceSection"
import ProductionOverviewSection from "../../components/dashboard/ProductionOverviewSection"
import CommentsSection from "../../components/dashboard/CommentsSection"
import ScheduleMeetingModal from "../../components/ScheduleMeetingModal"
import UserSelectModal from "../../components/UserSelectModal"
import CalendarSidebar from "../../components/dashboard/CalendarSidebar"
import Link from "next/link"

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

// Notification mock data
const mockNotifications = [
    { id: 1, section: "workOrders", message: "Work Order WO-001 failed.", timestamp: "10:00", read: false },
    { id: 2, section: "comments", message: "New comment on WO-002.", timestamp: "10:05", read: false },
    { id: 3, section: "missingParts", message: "Part #555 is missing.", timestamp: "10:10", read: false },
    { id: 4, section: "workOrders", message: "Work Order WO-003 completed.", timestamp: "10:15", read: true },
]

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

// Fetch Google Calendar events created by this app
async function fetchAppMeetings(accessToken: string) {
    const now = new Date().toISOString();
    const maxResults = 20;
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(now)}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!data.items) return [];
    // Filter: Only events with summary starting with 'Scheduled Meeting'
    return data.items
        .filter((event: any) => event.summary && event.summary.startsWith('Scheduled Meeting'))
        .map((event: any) => ({
            title: event.summary,
            start: event.start.dateTime || event.start.date, // dateTime for timed, date for all-day
            end: event.end.dateTime || event.end.date,
        }));
}

// Mock user data
const mockUser = {
    name: "Jane Doe",
    title: "Production Manager",
    avatar: "JD" // Use initials for avatar
};

export default function Dashboard() {
    const [selected, setSelected] = useState(sections[0].key)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [callModalOpen, setCallModalOpen] = useState(false)
    const [meetLink, setMeetLink] = useState<string | null>(null)
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    // TODO: Store and retrieve Google access token securely (localStorage, cookie, or backend session)
    const [accessToken, setAccessToken] = useState<string | null>(null)
    const [callDropdownOpen, setCallDropdownOpen] = useState(false)
    const [userSelectOpen, setUserSelectOpen] = useState(false)
    const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null)
    const [meetingType, setMeetingType] = useState<'instant' | 'scheduled' | null>(null)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [meetings, setMeetings] = useState<Array<{ title: string; start: string; end: string }>>([])
    const [notifications, setNotifications] = useState(mockNotifications)
    const [notifModalOpen, setNotifModalOpen] = useState(false)
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)

    // Handle OAuth callback (if code in URL)
    useEffect(() => {
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        // Only POST if code exists and accessToken is not set
        if (code && !accessToken && !loading) {
            setLoading(true)
            fetch('/api/google/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            })
                .then(res => res.json())
                .then(data => {
                    if (data.access_token) {
                        setAccessToken(data.access_token)
                        // Remove code from URL immediately after successful exchange
                        window.history.replaceState({}, document.title, url.pathname)
                    }
                })
                .finally(() => setLoading(false))
        }
    }, [accessToken, loading])

    // On mount, load access token from localStorage if present
    useEffect(() => {
        const storedToken = window.localStorage.getItem('google_access_token');
        if (storedToken) {
            setAccessToken(storedToken);
        }
    }, []);

    // Add event listener to close dropdown when clicking outside
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            const dropdown = document.getElementById('call-dropdown')
            if (dropdown && !dropdown.contains(e.target as Node)) {
                setCallDropdownOpen(false)
            }
        }
        if (callDropdownOpen) {
            document.addEventListener('mousedown', handleClick)
        } else {
            document.removeEventListener('mousedown', handleClick)
        }
        return () => document.removeEventListener('mousedown', handleClick)
    }, [callDropdownOpen])

    // For instant/scheduled meeting: after selecting user, create the meeting or open schedule modal
    useEffect(() => {
        if (selectedUserEmail && userSelectOpen === false && meetingType) {
            if (!accessToken && !loading) {
                // Trigger OAuth flow and preserve state
                window.sessionStorage.setItem('pendingMeetingType', meetingType)
                window.sessionStorage.setItem('pendingUserEmail', selectedUserEmail)
                window.location.href = '/api/google/auth'
                return
            }
            if (accessToken) {
                if (meetingType === 'instant') {
                    handleStartInstantMeetingWithAttendee(selectedUserEmail)
                    setSelectedUserEmail(null)
                    setMeetingType(null)
                } else if (meetingType === 'scheduled') {
                    setScheduleAttendee(selectedUserEmail)
                    setScheduleModalOpen(true)
                    setSelectedUserEmail(null)
                    setMeetingType(null)
                }
            }
        }
        // eslint-disable-next-line
    }, [selectedUserEmail, userSelectOpen, meetingType, accessToken, loading])

    // On mount, check for pending meeting after OAuth
    useEffect(() => {
        const pendingType = window.sessionStorage.getItem('pendingMeetingType') as 'instant' | 'scheduled' | null
        const pendingEmail = window.sessionStorage.getItem('pendingUserEmail')
        if (accessToken && pendingType && pendingEmail) {
            setMeetingType(pendingType)
            setSelectedUserEmail(pendingEmail)
            window.sessionStorage.removeItem('pendingMeetingType')
            window.sessionStorage.removeItem('pendingUserEmail')
        }
    }, [accessToken])

    // Fetch meetings after authentication
    useEffect(() => {
        if (accessToken) {
            fetchAppMeetings(accessToken).then(setMeetings);
        }
    }, [accessToken]);

    const handleStartInstantMeetingWithAttendee = async (otherUserEmail: string) => {
        setLoading(true)
        // TODO: Replace with real current user email if available
        const currentUserEmail = "you@company.com"
        if (!accessToken) {
            window.location.href = '/api/google/auth'
            return
        }
        const res = await fetch('/api/google/meet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: accessToken, type: 'instant', attendees: [currentUserEmail, otherUserEmail] }),
        })
        const data = await res.json()
        setMeetLink(data.meetLink)
        setCallModalOpen(true)
        setLoading(false)
    }

    // For scheduled meeting: pass selected email to schedule modal
    const [scheduleAttendee, setScheduleAttendee] = useState<string | null>(null)
    const handleScheduleMeeting = async (start: string, end: string, summary: string, description: string) => {
        console.log('Scheduling meeting with:', { start, end, summary, description, scheduleAttendee });
        setLoading(true)
        const currentUserEmail = "you@company.com"
        if (!accessToken) {
            window.location.href = '/api/google/auth'
            return
        }
        const attendees = [currentUserEmail]
        if (scheduleAttendee) attendees.push(scheduleAttendee)
        const res = await fetch('/api/google/meet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: accessToken, type: 'scheduled', start, end, summary, description, attendees }),
        })
        const data = await res.json()
        console.log('Google Meet API response:', data)
        setMeetLink(data.meetLink)
        setCallModalOpen(true)
        setLoading(false)
        setScheduleAttendee(null)
        // Refetch meetings from Google Calendar after scheduling
        if (accessToken) {
            fetchAppMeetings(accessToken).then(setMeetings);
        }
        // Show success modal after scheduling
        setShowSuccessModal(true)
        setTimeout(() => {
            setShowSuccessModal(false)
            setScheduleModalOpen(false)
            setCallModalOpen(false)
            setMeetLink(null)
        }, 2000)
    }

    // Calculate total unread notifications
    const totalUnread = notifications.filter(n => !n.read).length
    // Calculate per-section notification counts
    const sectionNotifCounts = sections.reduce((acc, s) => {
        acc[s.key] = notifications.filter(n => n.section === s.key && !n.read).length
        return acc
    }, {} as Record<string, number>)

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
                            {/* Notification Icon */}
                            {/* In the header, wrap the notification icon in a relative div for dropdown positioning */}
                            <div className="relative">
                                <button className="relative" onClick={() => setNotifModalOpen(v => !v)} aria-label="Notifications">
                                    <Bell className="w-6 h-6 text-gray-700" />
                                    {notifications.length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">{notifications.length}</span>
                                    )}
                                </button>
                                {/* Notification Dropdown Modal */}
                                {notifModalOpen && (
                                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl z-50 border animate-fade-in">
                                        <div className="p-4">
                                            <h3 className="font-bold text-lg mb-2">Notifications</h3>
                                            <ul className="divide-y divide-gray-200 max-h-64 overflow-y-auto mb-4">
                                                {notifications.length > 0 ? notifications.map(n => (
                                                    <li key={n.id} className="py-2 flex flex-col">
                                                        <span className="text-gray-800 text-sm">{n.message}</span>
                                                        <span className="text-xs text-gray-400 mt-1">{n.timestamp}</span>
                                                    </li>
                                                )) : (
                                                    <li className="py-2 text-gray-400 text-sm">No notifications.</li>
                                                )}
                                            </ul>
                                            <Link href="/notifications">
                                                <button className="w-full bg-blue-600 text-white rounded px-4 py-2">See more</button>
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Start Call Dropdown */}
                            <div className="relative">
                                <Button variant="outline" className="flex items-center gap-2" disabled={loading} onClick={() => setCallDropdownOpen(v => !v)}>
                                    <Video className="w-5 h-5" />
                                    Start Call
                                    <span className="ml-1">▼</span>
                                </Button>
                                {callDropdownOpen && (
                                    <div id="call-dropdown" className="absolute right-0 mt-2 w-48 bg-white rounded shadow-lg z-50 border">
                                        <button
                                            className="w-full flex items-center px-4 py-2 hover:bg-gray-100 text-left"
                                            onClick={() => { setCallDropdownOpen(false); setUserSelectOpen(true); setMeetingType('instant'); }}
                                            disabled={loading}
                                        >
                                            <Video className="w-4 h-4 mr-2" />Instant Meeting
                                        </button>
                                        <button
                                            className="w-full flex items-center px-4 py-2 hover:bg-gray-100 text-left"
                                            onClick={() => { setCallDropdownOpen(false); setUserSelectOpen(true); setMeetingType('scheduled'); }}
                                            disabled={loading}
                                        >
                                            <CalendarPlus className="w-4 h-4 mr-2" />Schedule Meeting
                                        </button>
                                    </div>
                                )}
                            </div>
                            {/* Profile Avatar, Name, and Title directly in header */}
                            <div className="relative">
                                <button
                                    className="flex items-center space-x-2 focus:outline-none"
                                    onClick={() => setProfileDropdownOpen(v => !v)}
                                    aria-label="Profile"
                                    type="button"
                                >
                                    <div className="flex flex-col text-right">
                                        <span className="font-bold text-gray-900 leading-tight">{mockUser.name}</span>
                                        <span className="text-xs text-gray-500 leading-tight">{mockUser.title}</span>
                                    </div>
                                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-blue-700 border-2 border-white shadow-sm">
                                        {mockUser.avatar}
                                    </div>
                                </button>
                                {profileDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-2xl z-50 border animate-fade-in p-2 flex flex-col items-center">
                                        <button className="w-full bg-red-100 text-red-700 rounded px-4 py-2 font-semibold hover:bg-red-200" onClick={() => {/* sign out logic here */ }}>Sign out</button>
                                    </div>
                                )}
                            </div>
                            <button className="lg:hidden ml-2 p-2 rounded hover:bg-gray-100" onClick={() => setSidebarOpen(!sidebarOpen)}>
                                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>
            </header>
            {/* User Select Modal for both meeting types */}
            {userSelectOpen && (
                <UserSelectModal
                    onSelect={email => {
                        setUserSelectOpen(false)
                        setSelectedUserEmail(email)
                    }}
                    onClose={() => setUserSelectOpen(false)}
                    loading={loading}
                />
            )}
            {/* Call Modal */}
            {callModalOpen && meetLink && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 relative animate-fade-in">
                        <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" onClick={() => setCallModalOpen(false)} aria-label="Close"><X className="w-6 h-6" /></button>
                        <h3 className="font-bold text-2xl mb-4">Google Meet Link</h3>
                        <a href={meetLink} target="_blank" rel="noopener noreferrer" className="block text-blue-600 underline text-lg mb-4 break-all">{meetLink}</a>
                        <a href={meetLink} target="_blank" rel="noopener noreferrer" className="block w-full">
                            <Button className="w-full mt-2" onClick={() => setCallModalOpen(false)}>
                                Join Meeting
                            </Button>
                        </a>
                    </div>
                </div>
            )}
            {/* Schedule Modal */}
            {scheduleModalOpen && (
                <>
                    {console.log('Rendering ScheduleMeetingModal')}
                    <ScheduleMeetingModal
                        onClose={() => setScheduleModalOpen(false)}
                        onSchedule={(...args) => { console.log('onSchedule called', args); handleScheduleMeeting(...args); }}
                        loading={loading}
                    />
                </>
            )}
            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 relative animate-fade-in flex flex-col items-center">
                        <span className="text-green-500 text-5xl mb-4">✔️</span>
                        <h3 className="font-bold text-2xl mb-2">Meeting Scheduled!</h3>
                        <p className="text-gray-600 mb-4 text-center">Your meeting has been added to your calendar.</p>
                    </div>
                </div>
            )}
            {/* Notification Modal */}
            {/* This block is now redundant as notifications are in a dropdown */}
            {/* <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 relative animate-fade-in">
                    <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" onClick={() => setNotifModalOpen(false)} aria-label="Close">✕</button>
                    <h3 className="font-bold text-2xl mb-4">Notifications</h3>
                    <ul className="divide-y divide-gray-200 mb-4">
                        {notifications.filter(n => !n.read).slice(0, 3).map(n => (
                            <li key={n.id} className="py-2 flex flex-col">
                                <span className="text-gray-800 text-sm">{n.message}</span>
                                <span className="text-xs text-gray-400 mt-1">{n.timestamp}</span>
                            </li>
                        ))}
                        {notifications.filter(n => !n.read).length === 0 && (
                            <li className="py-2 text-gray-400 text-sm">No new notifications.</li>
                        )}
                    </ul>
                    <Link href="/notifications">
                        <button className="w-full bg-blue-600 text-white rounded px-4 py-2">See more</button>
                    </Link>
                </div>
            </div> */}
            <div className="flex flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Sidebar */}
                <div className="flex flex-col w-64 mr-8" style={{ overflowY: 'auto' }}>
                    <DashboardSidebar
                        sections={sections}
                        selected={selected}
                        setSelected={setSelected}
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                        sectionNotifCounts={sectionNotifCounts}
                    />
                    {meetings.length > 0 && <div className="mt-4"><CalendarSidebar events={meetings} /></div>}
                </div>
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