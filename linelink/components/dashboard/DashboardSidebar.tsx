import React, { useEffect, useRef } from "react"
import { X, ChevronRight } from "lucide-react"

interface Section {
    key: string
    label: string
    icon: React.ReactNode
    notificationCount?: number
}

interface DashboardSidebarProps {
    sections: Section[]
    selected: string
    setSelected: (key: string) => void
    sidebarOpen: boolean
    setSidebarOpen: (open: boolean) => void
    sectionNotifCounts?: Record<string, number>
}

export default function DashboardSidebar({ sections, selected, setSelected, sidebarOpen, setSidebarOpen, sectionNotifCounts = {} }: DashboardSidebarProps) {
    const sidebarRef = useRef<HTMLElement>(null)

    // Close sidebar when clicking outside on mobile
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (window.innerWidth < 1024 && sidebarRef.current && !sidebarRef.current.contains(event.target as Node) && sidebarOpen) {
                setSidebarOpen(false)
            }
        }

        // Add event listeners
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('touchstart', handleClickOutside as any)
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('touchstart', handleClickOutside as any)
        }
    }, [sidebarOpen, setSidebarOpen])

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent, sectionKey: string) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setSelected(sectionKey)
            setSidebarOpen(false)
        } else if (e.key === 'Escape') {
            setSidebarOpen(false)
        }
    }

    // Prevent body scroll when sidebar is open on mobile
    useEffect(() => {
        if (sidebarOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
        } else {
            document.body.style.overflow = 'unset';
            document.body.style.position = 'unset';
            document.body.style.width = 'auto';
        }

        return () => {
            document.body.style.overflow = 'unset';
            document.body.style.position = 'unset';
            document.body.style.width = 'auto';
        };
    }, [sidebarOpen]);
    
    // Close sidebar when route changes on mobile
    useEffect(() => {
        const handleRouteChange = () => {
            if (window.innerWidth < 1024) {
                setSidebarOpen(false);
            }
        };
        
        window.addEventListener('popstate', handleRouteChange);
        return () => window.removeEventListener('popstate', handleRouteChange);
    }, [setSidebarOpen]);

    return (
        <>
        <aside
            ref={sidebarRef}
            className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-white shadow-xl flex-shrink-0 transition-transform duration-300 ease-in-out z-40
                transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:translate-x-0 lg:relative lg:h-[calc(100vh-7.5rem)] lg:top-6 lg:rounded-xl lg:shadow-sm`}
            style={{
                // paddingTop: '4rem', // Space for header
                height: '100vh',
                maxHeight: '100vh',
                WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
            }}
            aria-label="Dashboard navigation"
        >
                {/* Mobile header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-100 lg:hidden">
                    <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
                    <button 
                        onClick={() => setSidebarOpen(false)}
                        className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                        aria-label="Close menu"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>
                
                {/* Navigation items */}
                <nav className="overflow-y-auto h-[calc(100%-4rem)] lg:h-auto lg:max-h-[calc(100vh-6rem)] py-2 lg:py-4">
                    <ul className="space-y-1 px-2">
                        {sections.map((section) => {
                            const notificationCount = sectionNotifCounts[section.key] || 0;
                            const isSelected = selected === section.key;
                            
                            return (
                                <li key={section.key} className="relative">
                                    <button
                                        className={`w-full flex items-center justify-between px-4 py-3 text-left rounded-lg font-medium transition-all duration-200
                                            ${isSelected 
                                                ? 'bg-blue-50 text-blue-700' 
                                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
                                        onClick={() => {
                                            setSelected(section.key);
                                            if (window.innerWidth < 1024) {
                                                setSidebarOpen(false);
                                            }
                                        }}
                                        onKeyDown={(e) => handleKeyDown(e, section.key)}
                                        aria-current={isSelected ? 'page' : undefined}
                                        aria-label={`${section.label}${notificationCount > 0 ? `, ${notificationCount} notifications` : ''}`}
                                    >
                                        <span className="flex items-center">
                                            <span className={`mr-3 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                                                {section.icon}
                                            </span>
                                            <span className="text-sm font-medium">
                                                {section.label}
                                            </span>
                                        </span>
                                        
                                        <span className="flex items-center">
                                            {/* Notification badge */}
                                            {notificationCount > 0 && (
                                                <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 text-xs font-medium text-white bg-red-500 rounded-full ml-2">
                                                    {notificationCount > 9 ? '9+' : notificationCount}
                                                </span>
                                            )}
                                            <ChevronRight className="h-4 w-4 ml-2 text-gray-400" />
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
                
                {/* Footer */}
                <div className="hidden lg:block p-4 border-t border-gray-100">
                    <div className="text-xs text-gray-500 text-center">
                        LineLink v1.0.0
                    </div>
                </div>
            </aside>
        </>
    )
}