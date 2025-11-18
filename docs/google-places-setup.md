# Google Places API Setup

## Getting Your API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Places API** and **Places API (New)**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Restrict the API key to only **Places API** for security

## Adding API Key to App

### Option 1: Environment Variable (Recommended)
Create a `.env` file in the root directory:
```
GOOGLE_PLACES_API_KEY=your_api_key_here
```

Then update `BasicInfoScreen.jsx` to use:
```javascript
query={{
  key: process.env.GOOGLE_PLACES_API_KEY,
  language: 'en',
}}
```

### Option 2: Direct Configuration
Update `BasicInfoScreen.jsx` line 283:
```javascript
key: 'YOUR_GOOGLE_PLACES_API_KEY', // Replace with your actual API key
```

## Important Notes

- **Never commit your API key to version control**
- Use environment variables or secure storage
- Restrict your API key to specific APIs and platforms
- Monitor usage in Google Cloud Console to prevent unexpected charges

