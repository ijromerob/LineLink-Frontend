import { NextApiRequest, NextApiResponse } from 'next'
import { google } from 'googleapis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end()
    const { access_token, type, start, end, summary, description, attendees } = req.body
    if (!access_token || !type) return res.status(400).json({ error: 'Missing required fields' })

    // Create OAuth2 client and set credentials
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    let event: any = {
        summary: summary || (type === 'instant' ? 'Instant Meeting' : 'Scheduled Meeting'),
        description: description || '',
        start: { dateTime: '', timeZone: 'UTC' },
        end: { dateTime: '', timeZone: 'UTC' },
        attendees: attendees ? attendees.map((email: string) => ({ email })) : [],
        conferenceData: {
            createRequest: {
                requestId: Math.random().toString(36).substring(2),
                conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
        },
    }

    const now = new Date()
    if (type === 'instant') {
        event.start.dateTime = now.toISOString()
        event.end.dateTime = new Date(now.getTime() + 60 * 60 * 1000).toISOString() // 1 hour
    } else if (type === 'scheduled') {
        if (!start || !end) return res.status(400).json({ error: 'Missing start/end for scheduled meeting' })
        event.start.dateTime = new Date(start).toISOString()
        event.end.dateTime = new Date(end).toISOString()
    }

    try {
        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
            conferenceDataVersion: 1,
        })
        const meetLink = response.data.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri
        res.status(200).json({
            meetLink,
            eventId: response.data.id,
            htmlLink: response.data.htmlLink,
            summary: response.data.summary,
            start: response.data.start,
            end: response.data.end,
        })
    } catch (err) {
        console.error('Google Meet API error:', err)
        res.status(500).json({ error: 'Failed to create meeting', details: err })
    }
} 