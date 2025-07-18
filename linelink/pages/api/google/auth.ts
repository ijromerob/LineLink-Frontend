import { NextApiRequest, NextApiResponse } from 'next'
import { google } from 'googleapis'

const client_id = process.env.GOOGLE_CLIENT_ID!
const client_secret = process.env.GOOGLE_CLIENT_SECRET!
const redirect_uri = process.env.GOOGLE_REDIRECT_URI!

const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uri
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        // Step 1: Redirect to Google consent screen
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: [
                'https://www.googleapis.com/auth/calendar.events',
                'https://www.googleapis.com/auth/calendar',
                'openid',
                'email',
                'profile',
            ],
            prompt: 'consent',
        })
        res.redirect(url)
        return
    }

    if (req.method === 'POST') {
        // Step 2: Exchange code for tokens
        const { code } = req.body
        if (!code) return res.status(400).json({ error: 'Missing code' })
        try {
            const { tokens } = await oauth2Client.getToken(code)
            res.status(200).json(tokens)
        } catch (err) {
            res.status(500).json({ error: 'Failed to exchange code', details: err })
        }
        return
    }

    res.status(405).end()
} 