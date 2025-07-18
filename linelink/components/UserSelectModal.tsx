import React, { useState } from 'react'

const mockUsers = [
    { id: 1, name: "Alice", email: "laurels.echichinwo@stu.cu.edu.ng" },
    { id: 2, name: "Bob", email: "bob@company.com" },
    { id: 3, name: "Charlie", email: "charlie@company.com" },
    { id: 4, name: "Diana", email: "diana@company.com" },
]

interface UserSelectModalProps {
    onSelect: (email: string) => void
    onClose: () => void
    loading?: boolean
}

export default function UserSelectModal({ onSelect, onClose, loading }: UserSelectModalProps) {
    const [search, setSearch] = useState('')
    const filtered = mockUsers.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 relative animate-fade-in">
                <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" onClick={onClose} aria-label="Close">✕</button>
                <h3 className="font-bold text-2xl mb-4">Select User to Call</h3>
                <input
                    type="text"
                    className="border rounded px-3 py-2 w-full mb-4"
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <ul className="space-y-2 max-h-60 overflow-y-auto mb-4">
                    {filtered.length === 0 && <li className="text-gray-400">No users found.</li>}
                    {filtered.map(u => (
                        <li key={u.id}>
                            <button
                                className="w-full text-left px-4 py-2 rounded hover:bg-blue-50 flex flex-col"
                                onClick={() => onSelect(u.email)}
                                disabled={loading}
                            >
                                <span className="font-semibold text-gray-900">{u.name}</span>
                                <span className="text-xs text-gray-500">{u.email}</span>
                            </button>
                        </li>
                    ))}
                </ul>
                <button className="w-full bg-gray-200 text-gray-700 rounded px-4 py-2" onClick={onClose} disabled={loading}>Cancel</button>
            </div>
        </div>
    )
} 