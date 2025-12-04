# exnfachjan.de

Personal website with Twitch, YouTube, and social media integration.

## Features

- Slideshow with Twitch stream, YouTube videos, and YouTube Shorts
- Dark mode toggle
- Cookie consent management
- Server-side YouTube API proxy (no API keys in client code)

## Setup

### Prerequisites

- Cloudflare Pages account
- YouTube Data API v3 key
- YouTube Channel ID

### Environment Secrets

This project requires the following secrets to be configured in Cloudflare:

| Secret Name | Description |
|-------------|-------------|
| `YOUTUBE_API_KEY` | YouTube Data API v3 key |
| `YT_API_KEY` | Alternative name for YouTube API key (backwards compatible) |
| `YT_CHANNEL_ID` | Your YouTube channel ID |

#### Setting Secrets via Wrangler CLI

```bash
# Install wrangler if not already installed
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Set the YouTube API key
wrangler secret put YOUTUBE_API_KEY

# Set the YouTube channel ID
wrangler secret put YT_CHANNEL_ID
```

#### Setting Secrets via Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to Pages > your-project > Settings > Environment variables
3. Add `YOUTUBE_API_KEY` and `YT_CHANNEL_ID` as encrypted secrets

## API Routes

### `/api/youtube` - Generic YouTube API Proxy

A secure server-side proxy for YouTube Data API requests. The API key is never exposed to clients.

**Supported Endpoints:**

| Endpoint | Required Parameters | Description |
|----------|---------------------|-------------|
| `videos` | `id` | Get video details |
| `search` | - | Search for videos (use `q`, `channelId`, etc.) |
| `channels` | `id` or `forUsername` | Get channel details |

**Query Parameters:**

- `endpoint` (required): One of `videos`, `search`, `channels`
- `part` (optional, default: `snippet`): API response parts
- Additional parameters are passed through to the YouTube API

**Example Requests:**

```bash
# Get video details
curl 'https://exnfachjan.de/api/youtube?endpoint=videos&id=VIDEO_ID&part=snippet,contentDetails'

# Search for videos
curl 'https://exnfachjan.de/api/youtube?endpoint=search&q=gaming&type=video&maxResults=10'

# Search channel videos
curl 'https://exnfachjan.de/api/youtube?endpoint=search&channelId=CHANNEL_ID&type=video&order=date&maxResults=25'

# Get channel by ID
curl 'https://exnfachjan.de/api/youtube?endpoint=channels&id=CHANNEL_ID&part=snippet,statistics'

# Get channel by username
curl 'https://exnfachjan.de/api/youtube?endpoint=channels&forUsername=USERNAME&part=snippet'
```

**Response:**

Returns the raw YouTube API JSON response with CORS headers.

**Error Codes:**

| Status | Description |
|--------|-------------|
| 400 | Missing or invalid parameters |
| 405 | Method not allowed (only GET supported) |
| 500 | Server configuration error |
| 502 | YouTube API error |

### `/api/youtube/long` - Latest Long Video

Returns the most recent public video longer than 60 seconds from the configured channel.

**Note:** This endpoint requires `YT_CHANNEL_ID` to be set.

### `/api/youtube/short` - Latest Short

Returns the most recent public video shorter than 60 seconds (YouTube Short) from the configured channel.

**Note:** This endpoint requires `YT_CHANNEL_ID` to be set.

## Frontend Usage

The `fetchYouTube()` utility function makes it easy to call the YouTube API proxy:

```javascript
// Get video details
const videoData = await fetchYouTube('videos', { 
  id: 'VIDEO_ID', 
  part: 'snippet,contentDetails' 
});

// Search for videos
const searchResults = await fetchYouTube('search', { 
  q: 'gaming', 
  type: 'video', 
  maxResults: 10 
});

// Get channel info
const channelData = await fetchYouTube('channels', { 
  id: 'CHANNEL_ID', 
  part: 'snippet,statistics' 
});
```

## Development

### Local Development

```bash
# Install wrangler
npm install -g wrangler

# Create a .dev.vars file with your secrets (not committed)
echo "YOUTUBE_API_KEY=your_api_key_here" > .dev.vars
echo "YT_CHANNEL_ID=your_channel_id_here" >> .dev.vars

# Start local development server
wrangler pages dev .
```

### Deployment

The site is automatically deployed via Cloudflare Pages on push to the main branch.

## License

© exnfachjan 2025
