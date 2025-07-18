import { useState } from "react"
import { Users, Plus, Trash2, X, User, Key } from "lucide-react"
import LiveStatusBar from "./LiveStatusBar"

const mockUsers = [
    { id: 1, name: "Alice", email: "alice@company.com" },
    { id: 2, name: "Bob", email: "bob@company.com" },
    { id: 3, name: "Charlie", email: "charlie@company.com" },
    { id: 4, name: "Diana", email: "diana@company.com" },
]

const mockTeamsInit = [
    {
        id: 1,
        name: "Production Line A",
        members: [
            { userId: 1, role: "Production" },
            { userId: 2, role: "Supervisor" },
        ],
    },
    {
        id: 2,
        name: "Warehouse Night Shift",
        members: [
            { userId: 3, role: "Warehouse" },
            { userId: 4, role: "Warehouse" },
        ],
    },
]

const roles = ["Production", "Warehouse", "Supervisor", "Manager", "Admin"]

function getNowString() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function TeamManagementSection() {
    const [teams, setTeams] = useState(mockTeamsInit)
    const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id || null)
    const [showCreate, setShowCreate] = useState(false)
    const [newTeamName, setNewTeamName] = useState("")
    const [addUserId, setAddUserId] = useState("")
    const [addUserRole, setAddUserRole] = useState(roles[0])
    const [lastUpdated, setLastUpdated] = useState(getNowString())

    const selectedTeam = teams.find(t => t.id === selectedTeamId)

    function handleCreateTeam(e: React.FormEvent) {
        e.preventDefault()
        if (!newTeamName.trim()) return
        setTeams(ts => [...ts, { id: Date.now(), name: newTeamName, members: [] }])
        setShowCreate(false)
        setNewTeamName("")
        setLastUpdated(getNowString())
    }

    function handleDeleteTeam(id: number) {
        setTeams(ts => ts.filter(t => t.id !== id))
        setSelectedTeamId(teams[0]?.id || null)
        setLastUpdated(getNowString())
    }

    function handleAddMember(e: React.FormEvent) {
        e.preventDefault()
        if (!addUserId) return
        setTeams(ts => ts.map(t =>
            t.id === selectedTeamId
                ? { ...t, members: [...t.members, { userId: Number(addUserId), role: addUserRole }] }
                : t
        ))
        setAddUserId("")
        setAddUserRole(roles[0])
        setLastUpdated(getNowString())
    }

    function handleRemoveMember(userId: number) {
        setTeams(ts => ts.map(t =>
            t.id === selectedTeamId
                ? { ...t, members: t.members.filter(m => m.userId !== userId) }
                : t
        ))
        setLastUpdated(getNowString())
    }

    function handleRoleChange(userId: number, newRole: string) {
        setTeams(ts => ts.map(t =>
            t.id === selectedTeamId
                ? { ...t, members: t.members.map(m => m.userId === userId ? { ...m, role: newRole } : m) }
                : t
        ))
        setLastUpdated(getNowString())
    }

    return (
        <div className="flex bg-white rounded-xl shadow-lg p-8 min-h-[500px] gap-10">
            {/* Sidebar: Teams List */}
            <div className="w-72 pr-8 border-r border-gray-200">
                <LiveStatusBar lastUpdated={lastUpdated} />
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-3"><Users className="w-6 h-6" />Teams</h2>
                    <button className="bg-blue-600 text-white rounded p-2" onClick={() => setShowCreate(true)} title="Create Team"><Plus className="w-5 h-5" /></button>
                </div>
                <ul className="space-y-2">
                    {teams.map(team => (
                        <li key={team.id}>
                            <button
                                className={`w-full text-left px-4 py-3 rounded flex items-center gap-3 text-base font-semibold ${selectedTeamId === team.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-50'}`}
                                onClick={() => setSelectedTeamId(team.id)}
                            >
                                <span className="font-medium">{team.name}</span>
                                <span className="ml-auto text-xs text-gray-500">{team.members.length} members</span>
                                <button className="ml-3 text-red-500 hover:text-red-700" onClick={e => { e.stopPropagation(); handleDeleteTeam(team.id) }} title="Delete Team"><Trash2 className="w-5 h-5" /></button>
                            </button>
                        </li>
                    ))}
                </ul>
                {/* Create Team Modal */}
                {showCreate && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 relative animate-fade-in">
                            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" onClick={() => setShowCreate(false)} aria-label="Close"><X className="w-6 h-6" /></button>
                            <h3 className="font-bold text-2xl mb-4">Create Team</h3>
                            <form onSubmit={handleCreateTeam} className="flex flex-col gap-4">
                                <input
                                    type="text"
                                    className="border rounded px-3 py-2 text-base"
                                    placeholder="Team name"
                                    value={newTeamName}
                                    onChange={e => setNewTeamName(e.target.value)}
                                    required
                                />
                                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-base">Create</button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
            {/* Main Panel: Team Details */}
            <div className="flex-1 pl-8">
                {selectedTeam ? (
                    <div>
                        <h3 className="text-2xl font-bold mb-4">{selectedTeam.name}</h3>
                        <div className="mb-6">
                            <h4 className="font-semibold mb-3 flex items-center text-lg"><User className="w-5 h-5 mr-2" />Members</h4>
                            <ul className="mb-3">
                                {selectedTeam.members.map((m, i) => {
                                    const user = mockUsers.find(u => u.id === m.userId)
                                    return (
                                        <li key={m.userId} className="flex items-center gap-3 mb-2">
                                            <span className="font-semibold text-gray-700">{user?.name}</span>
                                            <span className="text-xs text-gray-500">({user?.email})</span>
                                            <select
                                                className="ml-3 border rounded px-2 py-1 text-sm"
                                                value={m.role}
                                                onChange={e => handleRoleChange(m.userId, e.target.value)}
                                            >
                                                {roles.map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                            <button className="ml-3 text-red-500 hover:text-red-700" onClick={() => handleRemoveMember(m.userId)} title="Remove"><X className="w-5 h-5" /></button>
                                        </li>
                                    )
                                })}
                            </ul>
                            <form className="flex gap-3 items-center" onSubmit={handleAddMember}>
                                <select
                                    className="border rounded px-3 py-2 text-base"
                                    value={addUserId}
                                    onChange={e => setAddUserId(e.target.value)}
                                    required
                                >
                                    <option value="">Add user...</option>
                                    {mockUsers.filter(u => !selectedTeam.members.some(m => m.userId === u.id)).map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                    ))}
                                </select>
                                <select
                                    className="border rounded px-3 py-2 text-base"
                                    value={addUserRole}
                                    onChange={e => setAddUserRole(e.target.value)}
                                >
                                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-base">Add</button>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="text-gray-500 text-base">Select a team to view details.</div>
                )}
            </div>
        </div>
    )
} 