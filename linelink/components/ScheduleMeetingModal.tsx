import React, { useState } from 'react'

interface ScheduleMeetingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSchedule: (start: string, end: string, summary: string, description: string) => void;
    loading: boolean;
}

export default function ScheduleMeetingModal({ isOpen, onClose, onSchedule, loading }: ScheduleMeetingModalProps) {
    if (!isOpen) return null;
    const [date, setDate] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [summary, setSummary] = useState('Scheduled Meeting')
    const [description, setDescription] = useState('')
    const [error, setError] = useState('')

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        console.log('ScheduleMeetingModal handleSubmit called')
        if (!date || !startTime || !endTime) {
            setError('Please fill in all fields')
            return
        }
        const start = new Date(`${date}T${startTime}`)
        const end = new Date(`${date}T${endTime}`)
        if (end <= start) {
            setError('End time must be after start time')
            return
        }
        setError('')
        onSchedule(start.toISOString(), end.toISOString(), summary, description)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 relative animate-fade-in">
                <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" onClick={onClose} aria-label="Close">✕</button>
                <h3 className="font-bold text-2xl mb-4">Schedule Meeting</h3>
                <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-medium mb-1">Date</label>
                        <input type="date" className="border rounded px-3 py-2 w-full" value={date} onChange={e => setDate(e.target.value)} required />
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Start Time</label>
                            <input type="time" className="border rounded px-3 py-2 w-full" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">End Time</label>
                            <input type="time" className="border rounded px-3 py-2 w-full" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Title</label>
                        <input type="text" className="border rounded px-3 py-2 w-full" value={summary} onChange={e => setSummary(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea className="border rounded px-3 py-2 w-full" value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                    {error && <div className="text-red-500 text-sm">{error}</div>}
                    <div className="flex gap-2 mt-2">
                        <button type="button" className="flex-1 bg-gray-200 text-gray-700 rounded px-4 py-2" onClick={onClose} disabled={loading}>Cancel</button>
                        <button type="submit" className="flex-1 bg-blue-600 text-white rounded px-4 py-2" disabled={loading} onClick={() => console.log('Schedule button clicked')}>
                            {loading ? 'Scheduling...' : 'Schedule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
} 