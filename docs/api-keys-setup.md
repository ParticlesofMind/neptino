# API Keys Setup Guide

This guide will help you obtain and configure all the necessary API keys for your Neptino application.

## Required API Keys

Your `.env` file now contains placeholders for the following services:

### 1. Unsplash (Free stock photos)
- **What it's for**: Free high-quality stock photos and images
- **How to get it**:
  1. Go to [Unsplash Developers](https://unsplash.com/developers)
  2. Create a free account or sign in
  3. Click "New Application"
  4. Fill out the application form (describe your educational platform)
  5. Accept their API terms
  6. Copy your "Access Key" 
  7. Replace `your_unsplash_access_key_here` in `.env` with your actual key

**Usage Limits**: 50 requests/hour for demo apps, 5000/hour for production

### 2. Pixabay (Free stock photos, videos, music)
- **What it's for**: Free stock images, videos, and music
- **How to get it**:
  1. Go to [Pixabay API](https://pixabay.com/api/docs/)
  2. Create a free Pixabay account
  3. Your API key is automatically generated and shown on the API docs page
  4. Copy the API key
  5. Replace `your_pixabay_api_key_here` in `.env` with your actual key

**Usage Limits**: 5000 requests/hour

### 3. Pexels (Free stock photos and videos)
- **What it's for**: High-quality free stock photos and videos
- **How to get it**:
  1. Go to [Pexels API](https://www.pexels.com/api/)
  2. Create a free account
  3. Click "Get Started" and describe your use case
  4. Generate your API key
  5. Replace `your_pexels_api_key_here` in `.env` with your actual key

**Usage Limits**: 200 requests/hour

### 4. Freesound (Free audio clips and sound effects)
- **What it's for**: Community-driven database of free audio files
- **How to get it**:
  1. Go to [Freesound API](https://freesound.org/help/developers/)
  2. Create a free Freesound account
  3. Go to your profile → "API Keys"
  4. Create a new API key application
  5. Describe your educational platform use case
  6. Once approved, copy your API key
  7. Replace `your_freesound_api_key_here` in `.env` with your actual key

**Usage Limits**: 2000 requests/day for free accounts

**Authentication**: Freesound uses API tokens passed as URL parameters, not headers.

### 5. Google Drive API (Cloud storage integration)
- **What it's for**: Allow users to import files from Google Drive
- **How to get it**:
  1. Go to [Google Cloud Console](https://console.cloud.google.com/)
  2. Create a new project or select an existing one
  3. Enable the Google Drive API:
     - Go to "APIs & Services" → "Library"
     - Search for "Google Drive API" and enable it
  4. Create credentials:
     - Go to "APIs & Services" → "Credentials"
     - Click "Create Credentials" → "API Key"
     - Copy the API key and replace `your_google_drive_api_key_here`
  5. For OAuth (file access):
     - Click "Create Credentials" → "OAuth 2.0 Client IDs"
     - Set application type to "Web application"
     - Add your domain to authorized origins
     - Copy the Client ID and replace `your_google_drive_client_id_here`

**Note**: Google Drive integration requires OAuth setup for file access.

### 6. Dropbox API (Cloud storage integration)
- **What it's for**: Allow users to import files from Dropbox
- **How to get it**:
  1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
  2. Click "Create app"
  3. Choose "Scoped access" and "Full Dropbox" access
  4. Name your app (e.g., "Neptino Education Platform")
  5. In the app settings:
     - Copy the "App key" and replace `your_dropbox_api_key_here`
     - Copy the "App secret" and replace `your_dropbox_client_id_here`
     - Add your redirect URI to "Redirect URIs"

## Quick Start (Recommended Order)

For development, I recommend getting these APIs in this order:

1. **Start with Pixabay** (easiest, instant approval)
2. **Then Unsplash** (usually instant approval)
3. **Then Pexels** (may take a few hours)
4. **Then Freesound** (may take 1-2 days for approval)
5. **Google Drive and Dropbox** (only if you need cloud storage features)

## Testing Your Setup

After adding any API key, restart your development server:

```bash
npm run dev
```

Then test the media search functionality in your coursebuilder to see if the APIs are working.

## Troubleshooting

### Common Issues:

1. **"API key missing" errors**: Make sure you've saved the `.env` file and restarted your server
2. **"Invalid API key" errors**: Double-check that you copied the key correctly (no extra spaces)
3. **Rate limit errors**: Most APIs have generous free tiers, but you may hit limits during heavy testing

### Rate Limits Summary:
- Pixabay: 5000/hour (most generous)
- Pexels: 200/hour 
- Unsplash: 50/hour (demo), 5000/hour (production)
- Freesound: 2000/day

## Free Alternatives

If you don't want to set up all APIs immediately, you can:

1. Start with just **Pixabay** (easiest to get)
2. Use placeholder images for development
3. Add other APIs as needed

## Security Notes

- Never commit your `.env` file to version control
- The `.env` file should already be in your `.gitignore`
- For production, use environment variables on your hosting platform
- Consider using different API keys for development and production

## Need Help?

If you run into issues:
1. Check the specific API's documentation
2. Verify your API key in their web interface
3. Test the API directly with tools like Postman
4. Check browser console for specific error messages
