"use client";

import React, { useState, useEffect } from "react";
import {
  Monitor,
  MessageCircle,
  Package,
  ClipboardList,
  History,
  XCircle,
  Menu,
  X,
  CalendarPlus,
  Video,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import WorkOrdersSection from "../../components/dashboard/WorkOrdersSection";
import DashboardSidebar from "../../components/dashboard/DashboardSidebar";
import MissingPartsSection from "../../components/dashboard/MissingPartsSection";
import HistoricalDataSection from "../../components/dashboard/HistoricalDataSection";
import ProductionOverviewSection from "../../components/dashboard/ProductionOverviewSection";
import CommentsSection from "../../components/dashboard/CommentsSection";
import ScheduleMeetingModal from "../../components/ScheduleMeetingModal";
import UserSelectModal from "../../components/UserSelectModal";
import CalendarSidebar from "../../components/dashboard/CalendarSidebar";
import { useAuth } from "@/contexts/AuthContext";
import StationStatusUpdate from "@/components/dashboard/StationStatusUpdate";

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
];
const missingPartsNotificationCount = mockMissingParts.filter(
  (p) => p.status === "Requested"
).length;

// Restore other notification counts for other sections
const failedWorkOrdersCount = 1; // e.g., number of failed work orders
const newCommentsCount = 2; // e.g., number of new/unread comments

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
    key: "station",
    label: "Station Status",
    icon: <Package className="w-5 h-5 mr-2" />,
    content: (
      <StationStatusUpdate stationNumber={""} onStatusUpdate={() => {}} />
    ),
    notificationCount: 0,
  },
  {
    key: "missingParts",
    label: "Missing Parts",
    icon: <XCircle className="w-5 h-5 mr-2" />,
    content: <MissingPartsSection />,
    notificationCount: missingPartsNotificationCount,
  },
  {
    key: "historicalData",
    label: "Historical Data",
    icon: <History className="w-5 h-5 mr-2" />,
    content: <HistoricalDataSection />,
    notificationCount: 0,
  },
];

// Fetch Google Calendar events created by this app
async function fetchAppMeetings(accessToken: string) {
  const now = new Date().toISOString();
  const maxResults = 20;
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
      now
    )}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const data = await res.json();
  if (!data.items) return [];
  // Filter: Only events with summary starting with 'Scheduled Meeting'
  return data.items
    .filter(
      (event: any) =>
        event.summary && event.summary.startsWith("Scheduled Meeting")
    )
    .map((event: any) => ({
      title: event.summary,
      start: event.start.dateTime || event.start.date, // dateTime for timed, date for all-day
      end: event.end.dateTime || event.end.date,
    }));
}

export default function Dashboard() {
  const { user, logout, isAuthenticated } = useAuth();
  const [selected, setSelected] = useState(sections[0].key);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [meetLink, setMeetLink] = useState<string | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // TODO: Store and retrieve Google access token securely (localStorage, cookie, or backend session)
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [callDropdownOpen, setCallDropdownOpen] = useState(false);
  const [userSelectOpen, setUserSelectOpen] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(
    null
  );
  const [meetingType, setMeetingType] = useState<
    "instant" | "scheduled" | null
  >(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [meetings, setMeetings] = useState<
    Array<{ title: string; start: string; end: string }>
  >([]);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Handle OAuth callback (if code in URL)
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    // Only POST if code exists and accessToken is not set
    if (code && !accessToken && !loading) {
      setLoading(true);
      fetch("/api/google/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.access_token) {
            setAccessToken(data.access_token);
            // Remove code from URL immediately after successful exchange
            window.history.replaceState({}, document.title, url.pathname);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [accessToken, loading]);

  // On mount, load access token from localStorage if present
  useEffect(() => {
    const storedToken = window.localStorage.getItem("google_access_token");
    if (storedToken) {
      setAccessToken(storedToken);
    }
  }, []);

  // Add event listener to close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const dropdown = document.getElementById("call-dropdown");
      if (dropdown && !dropdown.contains(e.target as Node)) {
        setCallDropdownOpen(false);
      }
    }
    if (callDropdownOpen) {
      document.addEventListener("mousedown", handleClick);
    } else {
      document.removeEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [callDropdownOpen]);

  // For instant/scheduled meeting: after selecting user, create the meeting or open schedule modal
  useEffect(() => {
    if (selectedUserEmail && userSelectOpen === false && meetingType) {
      if (!accessToken && !loading) {
        // Trigger OAuth flow and preserve state
        window.sessionStorage.setItem("pendingMeetingType", meetingType);
        window.sessionStorage.setItem("pendingUserEmail", selectedUserEmail);
        window.location.href = "/api/google/auth";
        return;
      }
      if (accessToken) {
        if (meetingType === "instant") {
          handleStartInstantMeetingWithAttendee(selectedUserEmail);
          setSelectedUserEmail(null);
          setMeetingType(null);
        } else if (meetingType === "scheduled") {
          setScheduleAttendee(selectedUserEmail);
          setScheduleModalOpen(true);
          setSelectedUserEmail(null);
          setMeetingType(null);
        }
      }
    }
    // eslint-disable-next-line
  }, [selectedUserEmail, userSelectOpen, meetingType, accessToken, loading]);

  // On mount, check for pending meeting after OAuth
  useEffect(() => {
    const pendingType = window.sessionStorage.getItem("pendingMeetingType") as
      | "instant"
      | "scheduled"
      | null;
    const pendingEmail = window.sessionStorage.getItem("pendingUserEmail");
    if (accessToken && pendingType && pendingEmail) {
      setMeetingType(pendingType);
      setSelectedUserEmail(pendingEmail);
      window.sessionStorage.removeItem("pendingMeetingType");
      window.sessionStorage.removeItem("pendingUserEmail");
    }
  }, [accessToken]);

  // Fetch meetings after authentication
  useEffect(() => {
    if (accessToken) {
      fetchAppMeetings(accessToken).then(setMeetings);
    }
  }, [accessToken]);

  const handleStartInstantMeetingWithAttendee = async (
    otherUserEmail: string
  ) => {
    setLoading(true);
    // TODO: Replace with real current user email if available
    const currentUserEmail = "you@company.com";
    if (!accessToken) {
      window.location.href = "/api/google/auth";
      return;
    }
    const res = await fetch("/api/google/meet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: accessToken,
        type: "instant",
        attendees: [currentUserEmail, otherUserEmail],
      }),
    });
    const data = await res.json();
    setMeetLink(data.meetLink);
    setCallModalOpen(true);
    setLoading(false);
  };

  // For scheduled meeting: pass selected email to schedule modal
  const [scheduleAttendee, setScheduleAttendee] = useState<string | null>(null);
  const handleScheduleMeeting = async (
    start: string,
    end: string,
    summary: string,
    description: string
  ) => {
    console.log("Scheduling meeting with:", {
      start,
      end,
      summary,
      description,
      scheduleAttendee,
    });
    setLoading(true);
    const currentUserEmail = "you@company.com";
    if (!accessToken) {
      window.location.href = "/api/google/auth";
      return;
    }
    const attendees = [currentUserEmail];
    if (scheduleAttendee) attendees.push(scheduleAttendee);
    const res = await fetch("/api/google/meet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: accessToken,
        type: "scheduled",
        start,
        end,
        summary,
        description,
        attendees,
      }),
    });
    const data = await res.json();
    console.log("Google Meet API response:", data);
    setMeetLink(data.meetLink);
    setCallModalOpen(true);
    setLoading(false);
    setScheduleAttendee(null);
    // Refetch meetings from Google Calendar after scheduling
    if (accessToken) {
      fetchAppMeetings(accessToken).then(setMeetings);
    }
    // Show success modal after scheduling
    setShowSuccessModal(true);
    setTimeout(() => {
      setShowSuccessModal(false);
      setScheduleModalOpen(false);
      setCallModalOpen(false);
      setMeetLink(null);
    }, 2000);
  };

  const selectedSection = sections.find((s) => s.key === selected);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm h-16 flex-shrink-0 shadow-sm flex items-center border-b border-gray-100">
        <div className="w-full px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button 
                className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
              >
                {sidebarOpen ? (
                  <X className="w-5 h-5 text-gray-600" />
                ) : (
                  <Menu className="w-5 h-5 text-gray-600" />
                )}
              </button>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                <Monitor className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg sm:text-xl font-medium text-gray-900 whitespace-nowrap">
                LineLink
              </span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Start Call Dropdown */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 h-9"
                  disabled={loading}
                  onClick={() => setCallDropdownOpen((v) => !v)}
                >
                  <Video className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="hidden sm:inline">Start Call</span>
                  <span className="ml-0.5 text-xs">▼</span>
                </Button>
                {callDropdownOpen && (
                  <div
                    id="call-dropdown"
                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-50 border border-gray-100 overflow-hidden py-1"
                  >
                    <button
                      className="w-full flex items-center px-4 py-2.5 text-sm hover:bg-gray-50 text-left transition-colors"
                      onClick={() => {
                        setCallDropdownOpen(false);
                        setUserSelectOpen(true);
                        setMeetingType("instant");
                      }}
                      disabled={loading}
                    >
                      <Video className="w-4 h-4 mr-2.5 flex-shrink-0" />
                      Instant Meeting
                    </button>
                    <button
                      className="w-full flex items-center px-4 py-2.5 text-sm hover:bg-gray-50 text-left transition-colors"
                      onClick={() => {
                        setCallDropdownOpen(false);
                        setUserSelectOpen(true);
                        setMeetingType("scheduled");
                      }}
                      disabled={loading}
                    >
                      <CalendarPlus className="w-4 h-4 mr-2.5 flex-shrink-0" />
                      Schedule Meeting
                    </button>
                  </div>
                )}
              </div>
              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  className="flex items-center space-x-1.5 sm:space-x-2 focus:outline-none group"
                  onClick={() => setProfileDropdownOpen((v) => !v)}
                  aria-label="Profile menu"
                  type="button"
                >
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-sm font-medium text-gray-900 leading-tight truncate max-w-[120px]">
                      {user
                        ? `${user.first_name} ${user.last_name}`
                        : "Loading..."}
                    </span>
                    <span className="text-xs text-gray-500 leading-tight truncate max-w-[120px]">
                      {user?.company || "Loading..."}
                    </span>
                  </div>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm sm:text-base font-bold text-blue-700 border-2 border-white shadow-sm group-hover:ring-2 group-hover:ring-blue-100 transition-all">
                    {`${user?.first_name?.[0]?.toUpperCase() || ""}${
                      user?.last_name?.[0]?.toUpperCase() || ""
                    }`}
                  </div>
                </button>
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl z-50 border border-gray-100 overflow-hidden animate-fade-in">
                    <div className="p-2">
                      <div className="px-3 py-2.5 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user ? `${user.first_name} ${user.last_name}` : 'User'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user?.email || 'No email'}
                        </p>
                      </div>
                      <div className="py-1">
                        <button
                          className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors flex items-center"
                          onClick={logout}
                        >
                          <svg
                            className="w-4 h-4 mr-2.5 text-red-500 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                          </svg>
                          Sign out
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </header>
      {/* User Select Modal for both meeting types */}
      {userSelectOpen && (
        <UserSelectModal
          isOpen={userSelectOpen}
          onSelect={(email) => {
            setUserSelectOpen(false);
            setSelectedUserEmail(email);
          }}
          onClose={() => setUserSelectOpen(false)}
          loading={loading}
        />
      )}
      {/* Call Modal */}
      {callModalOpen && meetLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 relative animate-fade-in">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={() => setCallModalOpen(false)}
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="font-bold text-2xl mb-4">Google Meet Link</h3>
            <a
              href={meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 underline text-lg mb-4 break-all"
            >
              {meetLink}
            </a>
            <a
              href={meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full"
            >
              <Button
                className="w-full mt-2"
                onClick={() => setCallModalOpen(false)}
              >
                Join Meeting
              </Button>
            </a>
          </div>
        </div>
      )}
      {/* Schedule Modal */}
      {scheduleModalOpen && (
        <>
          {console.log("Rendering ScheduleMeetingModal")}
          <ScheduleMeetingModal
            isOpen={scheduleModalOpen}
            onClose={() => setScheduleModalOpen(false)}
            onSchedule={(...args) => {
              console.log("onSchedule called", args);
              handleScheduleMeeting(...args);
            }}
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
            <p className="text-gray-600 mb-4 text-center">
              Your meeting has been added to your calendar.
            </p>
          </div>
        </div>
      )}
      <div className="flex flex-1 flex-col lg:flex-row w-full max-w-7xl mx-auto px-0 sm:px-2 lg:px-6 py-0 lg:py-6 gap-0 lg:gap-6 h-[calc(100vh-4rem)]">
        {/* Sidebar - Mobile Overlay */}
        <div 
          className={`fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity duration-300 ease-in-out ${
            sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
        
        {/* Sidebar */}
        <div 
          className={`fixed lg:sticky top-16 lg:top-6 left-0 h-[calc(100vh-4rem)] lg:h-[calc(100vh-3rem)] w-72 bg-white lg:bg-transparent z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="h-full flex flex-col p-4 lg:p-0">
            <DashboardSidebar
              sections={sections}
              selected={selected}
              setSelected={setSelected}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
            />
            {meetings.length > 0 && (
              <div className="mt-4 lg:mt-6">
                <CalendarSidebar events={meetings} />
              </div>
            )}
          </div>
        </div>
        
        {/* Main Content */}
        <main
          className="flex-1 w-full bg-white lg:rounded-xl shadow-sm p-4 sm:p-6 overflow-y-auto transition-all duration-300"
          style={{ 
            maxHeight: 'calc(100vh - 4rem - 1.5rem)', // Account for top padding
            minHeight: '100%',
            scrollbarWidth: 'thin',
            scrollbarGutter: 'stable'
          } as React.CSSProperties}
        >
          <div className="max-w-full">
            {selectedSection ? selectedSection.content : null}
          </div>
        </main>
      </div>
      <footer className="h-12 flex-shrink-0 bg-white border-t border-gray-100 flex items-center justify-center text-center text-xs sm:text-sm text-gray-500 px-4">
        <p className="w-full max-w-7xl mx-auto">
          &copy; {new Date().getFullYear()} LineLink. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
