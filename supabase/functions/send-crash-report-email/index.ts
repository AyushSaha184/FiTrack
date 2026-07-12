import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const TO_EMAIL = 'ayushsaha184@gmail.com'

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { record } = await req.json()

    if (!record) {
      return new Response('No record provided', { status: 400 })
    }

    const reportData = record.report_data || {}
    const appVersion = record.app_version || 'unknown'
    const osInfo = `${record.os || 'unknown'} ${record.os_version || ''}`
    const timestamp = reportData.timestamp || record.created_at || new Date().toISOString()
    const userName = reportData.user?.name || 'Unknown'
    const userEmail = reportData.user?.email || 'N/A'
    const userId = reportData.user?.id || 'N/A'

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f5;padding:24px">
  <div style="max-width:640px;margin:0 auto;background:white;border-radius:12px;padding:32px">
    <h2 style="margin-top:0">FiTrack Crash Report</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr><td style="padding:8px 12px;background:#f9f9f9;font-weight:600;width:120px">Time</td><td style="padding:8px 12px">${timestamp}</td></tr>
      <tr><td style="padding:8px 12px;background:#f9f9f9;font-weight:600">Version</td><td style="padding:8px 12px">${appVersion}</td></tr>
      <tr><td style="padding:8px 12px;background:#f9f9f9;font-weight:600">OS</td><td style="padding:8px 12px">${osInfo}</td></tr>
      <tr><td style="padding:8px 12px;background:#f9f9f9;font-weight:600">User</td><td style="padding:8px 12px">${userName} (${userEmail})</td></tr>
      <tr><td style="padding:8px 12px;background:#f9f9f9;font-weight:600">User ID</td><td style="padding:8px 12px">${userId}</td></tr>
    </table>
    <pre style="background:#1a1a2e;color:#e0e0e0;padding:16px;border-radius:8px;overflow-x:auto;font-size:13px;line-height:1.5">${JSON.stringify(reportData, null, 2)}</pre>
  </div>
</body>
</html>`

    const textBody = `FiTrack Crash Report\n\nTime: ${timestamp}\nVersion: ${appVersion}\nOS: ${osInfo}\nUser: ${userName} (${userEmail})\nUser ID: ${userId}\n\n${JSON.stringify(reportData, null, 2)}`

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), { status: 500 })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FiTrack <onboarding@resend.dev>',
        to: TO_EMAIL,
        subject: `FiTrack Crash Report - v${appVersion}`,
        html,
        text: textBody,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return new Response(JSON.stringify({ error: data }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
