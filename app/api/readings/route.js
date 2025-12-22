// app/api/readings/route.js

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

// GET - Fetch readings for last 3 months
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      `SELECT id, pre_reading, post_reading, reading_date, created_at
       FROM readings 
       WHERE user_id = $1 
       AND reading_date >= CURRENT_DATE - INTERVAL '3 months'
       ORDER BY reading_date ASC`,
      [session.user.id]
    );

    return NextResponse.json({ readings: result.rows });
  } catch (error) {
    console.error('Error fetching readings:', error);
    return NextResponse.json({ error: 'Failed to fetch readings' }, { status: 500 });
  }
}

// POST - Add new reading
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { preReading, postReading, date } = await request.json();

    if (!preReading && !postReading) {
      return NextResponse.json(
        { error: 'At least one reading is required' },
        { status: 400 }
      );
    }

    const readingDate = date || new Date().toISOString().split('T')[0];

    // Check if reading exists for this date
    const existing = await query(
      'SELECT id FROM readings WHERE user_id = $1 AND reading_date = $2',
      [session.user.id, readingDate]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update existing reading
      result = await query(
        `UPDATE readings 
         SET pre_reading = COALESCE($1, pre_reading), 
             post_reading = COALESCE($2, post_reading)
         WHERE user_id = $3 AND reading_date = $4
         RETURNING *`,
        [preReading || null, postReading || null, session.user.id, readingDate]
      );
    } else {
      // Insert new reading
      result = await query(
        `INSERT INTO readings (user_id, pre_reading, post_reading, reading_date)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [session.user.id, preReading || null, postReading || null, readingDate]
      );
    }

    return NextResponse.json({ reading: result.rows[0] });
  } catch (error) {
    console.error('Error saving reading:', error);
    return NextResponse.json({ error: 'Failed to save reading' }, { status: 500 });
  }
}