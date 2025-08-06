import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://linelink-backend.onrender.com/api';

export async function GET() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error from backend:', error);
      return NextResponse.json(
        { error: 'Failed to initiate Google OAuth' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in Google OAuth proxy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}