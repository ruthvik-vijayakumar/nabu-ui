# Supabase Authentication Setup

This extension now uses Supabase for user authentication. Follow these steps to set it up:

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Fill in your project details (name, database password, region)
4. Wait for the project to be created

## 2. Enable Email Authentication

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Make sure **Email** is enabled (it should be by default)
3. You can customize the email templates under **Authentication** → **Email Templates**

## 3. Get Your API Credentials

1. Go to **Project Settings** → **API**
2. You'll need two values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (the `anon public` key)

## 4. Configure the Extension

Create a `.env` file in the root of the project:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace the values with your actual Supabase credentials.

## 5. Rebuild the Extension

```bash
npm run build
```

## 6. Test the Authentication

1. Load the extension in Chrome
2. Click the extension icon
3. You should see the login screen
4. Create a new account or sign in with existing credentials

## Features

- **Sign Up**: Users can create a new account with email and password
- **Sign In**: Existing users can log in
- **Session Management**: User sessions are persisted across browser restarts
- **Protected Routes**: The main app is only accessible when logged in

## Security Notes

- Passwords must be at least 6 characters long
- By default, Supabase requires email confirmation for new signups
- You can disable email confirmation in **Authentication** → **Settings** → **Email Auth** → Uncheck "Enable email confirmations"
- The Anon key is safe to use in the client-side code as it only allows authenticated operations

## Next Steps

You can extend the authentication with:
- Password reset functionality
- Social OAuth providers (Google, GitHub, etc.)
- User profiles stored in Supabase
- Role-based access control

