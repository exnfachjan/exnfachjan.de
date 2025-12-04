/**
 * Generic YouTube Data API Proxy
 * Supports /videos, /search, and /channels endpoints
 * 
 * Usage: /api/youtube?endpoint=videos&id=...&part=snippet
 *        /api/youtube?endpoint=search&q=...&type=video&part=snippet&maxResults=10
 *        /api/youtube?endpoint=channels&id=...&part=snippet
 *        /api/youtube?endpoint=channels&forUsername=...&part=snippet
 */

const ALLOWED_ENDPOINTS = ['videos', 'search', 'channels'];
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

/**
 * Handle OPTIONS requests for CORS preflight
 */
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

/**
 * Create error response with CORS headers
 */
function errorResponse(message, status) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: corsHeaders }
  );
}

/**
 * Main request handler
 */
export async function onRequest({ request, env }) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return handleOptions();
  }

  // Only allow GET requests
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  // Check for API key in environment
  const apiKey = env.YOUTUBE_API_KEY || env.YT_API_KEY;
  if (!apiKey) {
    return errorResponse('Server configuration error: API key not set', 500);
  }

  try {
    const url = new URL(request.url);
    const params = url.searchParams;

    // Get and validate endpoint
    const endpoint = params.get('endpoint');
    if (!endpoint) {
      return errorResponse('Missing required parameter: endpoint', 400);
    }

    if (!ALLOWED_ENDPOINTS.includes(endpoint)) {
      return errorResponse(
        `Invalid endpoint. Allowed: ${ALLOWED_ENDPOINTS.join(', ')}`,
        400
      );
    }

    // Validate required parameters based on endpoint
    const validationError = validateParams(endpoint, params);
    if (validationError) {
      return errorResponse(validationError, 400);
    }

    // Build YouTube API URL
    const ytParams = new URLSearchParams();
    ytParams.set('key', apiKey);

    // Copy allowed parameters (exclude 'endpoint')
    for (const [key, value] of params.entries()) {
      if (key !== 'endpoint') {
        ytParams.set(key, value);
      }
    }

    // Default 'part' to 'snippet' if not provided
    if (!ytParams.has('part')) {
      ytParams.set('part', 'snippet');
    }

    const ytUrl = `${YOUTUBE_API_BASE}/${endpoint}?${ytParams.toString()}`;

    // Forward request to YouTube API
    const ytResponse = await fetch(ytUrl);

    if (!ytResponse.ok) {
      const errorData = await ytResponse.text();
      console.error('YouTube API error:', errorData);
      return errorResponse('YouTube API request failed', 502);
    }

    const data = await ytResponse.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Server error:', error);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * Validate required parameters for each endpoint
 */
function validateParams(endpoint, params) {
  switch (endpoint) {
    case 'videos':
      if (!params.get('id')) {
        return 'Missing required parameter for /videos: id';
      }
      break;

    case 'search':
      // search can work without q (e.g., channelId search)
      // but typically needs at least one filter
      break;

    case 'channels':
      if (!params.get('id') && !params.get('forUsername')) {
        return 'Missing required parameter for /channels: id or forUsername';
      }
      break;
  }

  return null;
}
