import React from "react"

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
}

export default function DashboardSidebar({ sections, selected, setSelected, sidebarOpen, setSidebarOpen }: DashboardSidebarProps) {
    return (
        <nav
            className={`bg-white rounded-lg shadow-md flex-shrink-0 transition-all duration-200 z-10
        ${sidebarOpen ? 'block absolute left-0 top-20 w-64' : 'hidden'}
        lg:block lg:static lg:w-64 lg:mr-8`}
            style={{ maxHeight: 'calc(100vh - 6rem)', overflowY: 'auto' }}
        >
            <ul className="py-4">
                {sections.map((section) => (
                    <li key={section.key}>
                        <button
                            className={`w-full flex items-center px-6 py-3 text-left rounded-lg mb-1 font-medium transition-colors
                ${selected === section.key ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                            onClick={() => {
                                setSelected(section.key)
                                setSidebarOpen(false)
                            }}
                        >
                            {section.icon}
                            <span className="relative flex items-center">
                                {section.label}
                                {typeof section.notificationCount === 'number' && section.notificationCount > 0 && (
                                    <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white min-w-[20px] h-5">
                                        {section.notificationCount > 9 ? '9+' : section.notificationCount}
                                    </span>
                                )}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    )
} 