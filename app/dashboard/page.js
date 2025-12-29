// app/dashboard/page.js

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [chartLoaded, setChartLoaded] = useState(false);

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    preReading: '',
    postReading: '',
    date: today,
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch readings
  const fetchReadings = useCallback(async () => {
    try {
      const res = await fetch('/api/readings');
      const data = await res.json();

      if (res.ok) {
        setReadings(data.readings);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch readings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchReadings();
    }
  }, [session, fetchReadings]);

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Draw chart when data changes
  const drawChart = useCallback(() => {
    if (!chartLoaded || readings.length === 0 || !window.google) return;

    const data = new window.google.visualization.DataTable();
    
    data.addColumn('string', 'Date');
    data.addColumn('number', 'Pre-Reading (Before Eating)');
    data.addColumn('number', 'Post-Reading (After Eating)');

    const rows = readings.map((reading) => [
      formatDate(reading.reading_date),
      reading.pre_reading ? parseFloat(reading.pre_reading) : null,
      reading.post_reading ? parseFloat(reading.post_reading) : null,
    ]);

    data.addRows(rows);

    const options = {
      title: 'Diabetes Readings - Last 3 Months',
      curveType: 'function',
      legend: { position: 'bottom' },
      hAxis: {
        title: 'Date',
        slantedText: false,
        textStyle: {
          fontSize: 12,
        },
      },
      vAxis: {
        title: 'Blood Sugar Level (mg/dL)',
        minValue: 0,
      },
      colors: ['#4285F4', '#EA4335'],
      interpolateNulls: true,
      pointSize: 7,
      lineWidth: 3,
      chartArea: { width: '80%', height: '65%' },
    };

    const chart = new window.google.visualization.LineChart(
      document.getElementById('chart_div')
    );
    chart.draw(data, options);
  }, [chartLoaded, readings]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  // Redraw chart on window resize
  useEffect(() => {
    const handleResize = () => {
      if (chartLoaded && readings.length > 0) {
        drawChart();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [chartLoaded, readings, drawChart]);

  // Initialize Google Charts
  const handleGoogleChartsLoad = () => {
    window.google.charts.load('current', { packages: ['corechart'] });
    window.google.charts.setOnLoadCallback(() => {
      setChartLoaded(true);
    });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    // Extra validation to prevent future dates
    if (formData.date > today) {
      setError('Future dates are not allowed');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('Reading saved successfully!');
        setFormData({
          preReading: '',
          postReading: '',
          date: today,
        });
        fetchReadings();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to save reading');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="container text-center" style={{ marginTop: '100px' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <>
      <Script
        src="https://www.gstatic.com/charts/loader.js"
        onLoad={handleGoogleChartsLoad}
      />

      <header className="header">
        <h1>🩸 Diabetes Tracker</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span className='identifier'>Welcome, {session.user.name || session.user.email}</span>
          <button onClick={handleLogout} className="btn btn-danger">
            Logout
          </button>
        </div>
      </header>

      <div className="container">
        {/* Input Form */}
        <div className="card">
          <h2 style={{ marginBottom: '16px' }}>Add Reading</h2>

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="preReading">Pre-Reading (Before Eating)</label>
                <input
                  type="number"
                  id="preReading"
                  name="preReading"
                  value={formData.preReading}
                  onChange={handleChange}
                  placeholder="e.g., 100"
                  step="0.01"
                  min="0"
                  max="600"
                />
              </div>

              <div className="form-group">
                <label htmlFor="postReading">Post-Reading (After Eating)</label>
                <input
                  type="number"
                  id="postReading"
                  name="postReading"
                  value={formData.postReading}
                  onChange={handleChange}
                  placeholder="e.g., 140"
                  step="0.01"
                  min="0"
                  max="600"
                />
              </div>

              <div className="form-group">
                <label htmlFor="date">Date</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  max={today}  // This disables future dates
                />
              </div>
            </div>

            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}

            <button
              type="submit"
              className="btn btn-primary"
              style={{marginTop: "20px"}}
              disabled={saving || (!formData.preReading && !formData.postReading)}
            >
              {saving ? 'Saving...' : 'Save Reading'}
            </button>
          </form>
        </div>

        {/* Chart */}
        <div className="card">
          <h2 style={{ marginBottom: '16px' }}>Reading History (Last 3 Months)</h2>
          {readings.length === 0 ? (
            <p className="text-center" style={{ padding: '40px', color: '#666' }}>
              No readings yet. Add your first reading above!
            </p>
          ) : (
            <div id="chart_div" className="chart-container"></div>
          )}
        </div>

        {/* Recent Readings Table */}
        {readings.length > 0 && (
          <div className="card">
            <h2 style={{ marginBottom: '16px' }}>Recent Readings</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Pre-Reading</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Post-Reading</th>
                </tr>
              </thead>
              <tbody>
                {[...readings].reverse().slice(0, 10).map((reading) => (
                  <tr key={reading.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>
                      {new Date(reading.reading_date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {reading.pre_reading ? `${reading.pre_reading} mg/dL` : '-'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {reading.post_reading ? `${reading.post_reading} mg/dL` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}