# Fix Google Places Autocomplete Not Showing Suggestions

## Problem
The autocomplete dropdown is not showing suggestions even though the API key is configured.

## Root Cause
The **Places API (Legacy)** is not enabled in your Google Cloud Console project.

## Solution

### Step 1: Enable Places API (Legacy)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: **pryvo-cb521**
3. Go to **APIs & Services** → **Library**
4. Search for **"Places API"**
5. You'll see two options:
   - **Places API (New)** - This is the new version
   - **Places API** - This is the legacy version (REQUIRED)
6. Click on **"Places API"** (the legacy one)
7. Click **"Enable"**

### Step 2: Verify API Key

1. Go to **APIs & Services** → **Credentials**
2. Find your API key: `AIzaSyDD9uRgqIVB8roh8-ob-AZiiXoFocAExvY`
3. Make sure it has **Places API** enabled (not just Places API New)

### Step 3: Test

After enabling, wait 1-2 minutes for the changes to propagate, then:
1. Reload your app
2. Type at least 2 characters in the location field
3. You should see autocomplete suggestions appear

## Alternative: Use Places API (New)

If you want to use the new API instead, you'll need to:
1. Enable **Places API (New)** in Google Cloud Console
2. Update the component to use the new API endpoint (requires code changes)

## Current Configuration

The app is configured to use:
- API Key: `AIzaSyDD9uRgqIVB8roh8-ob-AZiiXoFocAExvY`
- API: Places API (Legacy) - Autocomplete endpoint

## Verification

Test the API key directly:
```bash
curl "https://maps.googleapis.com/maps/api/place/autocomplete/json?input=delhi&key=AIzaSyDD9uRgqIVB8roh8-ob-AZiiXoFocAExvY"
```

If you see `"status": "OK"` with predictions, it's working!

