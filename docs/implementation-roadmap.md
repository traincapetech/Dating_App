# Implementation Roadmap

## Frontend Screens (from wireframe)
1. **Auth & Onboarding**
   - Splash / entry with sign in & create account buttons
   - Phone number input + verification
   - Email capture & basic profile info
   - Gender, pronouns, dating preferences
   - Location selection & notification permissions
2. **Lifestyle & Profile Details**
   - Family plans, kids, ethnicity, height, relationship intentions
   - Work, education, religion, politics, lifestyle habits
   - Prompt responses (About me, Self care, Getting personal)
   - Media upload flow (photos & videos)
3. **Core App**
   - Home discovery (cards / feed)
   - Messaging inbox & chat
   - Profile settings & subscription upsell

## Frontend Tech Tasks
- Configure React Navigation stacks & onboarding flow
- Set up global store (Redux Toolkit or Zustand) for user session & profile draft
- Build reusable form & input components with validation states
- Integrate media picker & upload service placeholders
- Implement theme provider + dark/light mode support later

## Backend Milestones
1. **Foundation**
   - Configure Express app structure, environment variables, logging
   - Connect to primary database (PostgreSQL or MongoDB)
   - Auth service (OTP via SMS provider like Twilio, session tokens)
2. **Profile Management**
   - User schema covering demographics, lifestyle, prompts, media assets
   - CRUD APIs for onboarding steps with partial saves
   - Media storage integration (S3 or similar) & processing pipeline
3. **Matching & Messaging**
   - Preference matching engine & recommendations service
   - Swipe/like APIs with rate limiting
   - Real-time messaging (WebSocket service) and notification hooks
4. **Monetization & Operations**
   - Subscription tiers, entitlements, purchase verification
   - Admin/reporting endpoints, content moderation tools
   - Observability (metrics, error tracking)

## Next Actions
- Decide state management library & install required packages
- Define onboarding stack screens skeletons in `src/features/onboarding`
- Choose DB + ORM (e.g., Prisma, Sequelize, Mongoose) and scaffold models
- Integrate `/api` router with versioning (e.g., `/api/v1`)
- Set up linting/formatting configs for new `src` directory
