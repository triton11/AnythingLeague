# AnythingLeague

AnythingLeague is a dynamic web application that lets users create and participate in themed competition leagues. Each league consists of multiple rounds where members can submit entries and vote on others' submissions.

## Features

- **User Authentication**: Secure email/password authentication using Supabase Auth
- **League Management**:
  - Create leagues with customizable settings
  - Set number of rounds, start dates, and voting limits
  - Join/leave leagues
  - Track league membership and progress
- **Round System**:
  - Sequential rounds with themes
  - Submission and voting phases
  - Configurable deadlines
- **Voting System**:
  - Customizable upvotes/downvotes per user
  - Comment system for feedback
  - Vote tracking and tallying
  - Prevention of self-voting
- **Real-time Updates**: Live state management for submissions and votes
- **Mobile Responsive**: Fully responsive design that works on all device sizes

## Tech Stack

### Frontend
- **Framework**: Next.js 13+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **Components**: Custom React components with responsive design

### Backend
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **API**: Supabase Client & Server Components
- **Hosting**: Vercel

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Deployment

The application is designed to be deployed on Vercel:

1. Connect your repository to Vercel
2. Configure environment variables
3. Deploy!

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - feel free to use this project for your own purposes.
