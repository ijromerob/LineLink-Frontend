import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

interface CalendarSidebarProps {
    events: Array<{
        title: string;
        start: string;
        end: string;
        description?: string;
    }>;
}

function MeetingDetailsModal({ meetings, date, onClose }: { meetings: CalendarSidebarProps['events'], date: string, onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 relative animate-fade-in">
                <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" onClick={onClose} aria-label="Close">✕</button>
                <h3 className="font-bold text-2xl mb-4">Meetings for {date}</h3>
                {meetings.length === 0 ? (
                    <div className="text-gray-500">No meetings for this day.</div>
                ) : (
                    <ul className="space-y-4">
                        {meetings.map((m, i) => (
                            <li key={i} className="border rounded p-3">
                                <div className="font-semibold text-gray-900">{m.title}</div>
                                <div className="text-xs text-gray-500 mb-1">
                                    {new Date(m.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(m.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                {m.description && <div className="text-sm text-gray-700">{m.description}</div>}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default function CalendarSidebar({ events }: CalendarSidebarProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [meetingsForDay, setMeetingsForDay] = useState<CalendarSidebarProps['events']>([]);

    function handleDateClick(arg: { dateStr: string }) {
        // Find all meetings for this date
        const meetings = events.filter(e => e.start.slice(0, 10) === arg.dateStr);
        setMeetingsForDay(meetings);
        setSelectedDate(arg.dateStr);
        setModalOpen(true);
    }

    // Only show dots/indicators, not event titles
    function renderEventContent() {
        return <span className="block w-2 h-2 bg-blue-500 rounded-full mx-auto my-1" />;
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h3 className="font-bold text-lg mb-2">Upcoming Meetings</h3>
            <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={false}
                height="auto"
                events={events}
                eventContent={renderEventContent}
                eventDisplay="list-item"
                dayMaxEventRows={1}
                dateClick={handleDateClick}
                displayEventTime={false}
                displayEventEnd={false}
            />
            {modalOpen && selectedDate && (
                <MeetingDetailsModal
                    meetings={meetingsForDay}
                    date={selectedDate}
                    onClose={() => setModalOpen(false)}
                />
            )}
        </div>
    );
} 