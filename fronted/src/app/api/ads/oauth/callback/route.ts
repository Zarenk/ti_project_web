import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

/**
 * OAuth callback handler.
 * The social platform (Facebook/TikTok) redirects here after authorization.
 * Exchanges the code via backend, then returns HTML that closes the popup
 * and notifies the opener window via postMessage.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const error = request.nextUrl.searchParams.get('error')
  const errorDescription = request.nextUrl.searchParams.get('error_description')

  // Handle OAuth denial
  if (error) {
    return closePopup({
      success: false,
      error: errorDescription || error || 'Authorization denied',
    })
  }

  if (!code || !state) {
    return closePopup({
      success: false,
      error: 'Missing code or state parameter',
    })
  }

  // Decode state to extract platform
  let platform = ''
  try {
    // State is a JWT - decode payload without verification (backend will verify)
    const payload = JSON.parse(
      Buffer.from(state.split('.')[1], 'base64').toString(),
    )
    platform = payload.platform || ''
  } catch {
    return closePopup({
      success: false,
      error: 'Invalid state token',
    })
  }

  // Exchange code via backend
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value

    if (!token) {
      return closePopup({
        success: false,
        error: 'Session expired. Please log in again.',
      })
    }

    const res = await fetch(`${BACKEND_URL}/api/ads/oauth/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ platform, code, state }),
    })

    const data = await res.json()

    if (!res.ok) {
      return closePopup({
        success: false,
        error: data.message || 'Failed to link account',
      })
    }

    return closePopup({
      success: true,
      platform: data.platform,
      accountName: data.accountName,
    })
  } catch {
    return closePopup({
      success: false,
      error: 'Network error during authentication',
    })
  }
}

/**
 * Returns an HTML page that sends a postMessage to the opener window
 * and closes itself.
 */
function closePopup(result: {
  success: boolean
  platform?: string
  accountName?: string
  error?: string
}) {
  const message = JSON.stringify({
    type: 'oauth-callback',
    ...result,
  })

  const html = `<!DOCTYPE html>
<html>
<head><title>Connecting...</title></head>
<body>
<p style="font-family:sans-serif;text-align:center;margin-top:40px">
  ${result.success ? 'Account connected! This window will close...' : `Error: ${result.error}`}
</p>
<script>
  if (window.opener) {
    window.opener.postMessage(${message}, '*');
  }
  setTimeout(function() { window.close(); }, 1500);
</script>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
