# Email Setup Guide (Hostinger)

## Configuration

The email service is configured to use Hostinger SMTP with the email `sales@traincapetech.in`.

## Setup Steps

1. **Get your Hostinger email password:**
   - Log in to your Hostinger control panel
   - Go to Email → Email Accounts
   - Find `sales@traincapetech.in` and get the password
   - If you don't have the password, you can reset it from the control panel

2. **Set environment variables:**
   
   Create or update your `.env` file in the `server` directory:
   ```env
   EMAIL_HOST=smtp.hostinger.com
   EMAIL_PORT=465
   EMAIL_SECURE=true
   EMAIL_USER=sales@traincapetech.in
   EMAIL_PASSWORD=your_actual_password_here
   EMAIL_FROM=Pryvo <sales@traincapetech.in>
   ```

3. **For Render deployment:**
   - Add these environment variables in your Render dashboard
   - Go to your service → Environment → Add Environment Variable
   - Add each variable (EMAIL_HOST, EMAIL_PORT, etc.)

## SMTP Settings

- **Host:** smtp.hostinger.com
- **Port:** 465 (SSL) or 587 (TLS)
- **Security:** SSL/TLS
- **Authentication:** Required (email and password)

## Testing

When you start the server, it will automatically verify the email connection. You should see:
```
Email server connection verified successfully
```

If you see an error, check:
1. Email password is correct
2. Email account is active in Hostinger
3. SMTP is enabled for the email account
4. Firewall/network allows SMTP connections

## Email Template

The OTP email includes:
- Professional HTML template with Pryvo branding
- Large, easy-to-read OTP code
- Expiration time (10 minutes)
- Plain text fallback

## Troubleshooting

### Connection Failed
- Verify password is correct
- Check if SMTP is enabled in Hostinger
- Try port 587 with EMAIL_SECURE=false

### Emails Not Sending
- Check server logs for error messages
- Verify email account is not suspended
- Check spam folder for test emails

