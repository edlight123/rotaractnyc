# Rotaract Club at the United Nations

A modern, full-stack website for the Rotaract Club of New York at the United Nations, featuring a comprehensive admin portal, member portal, and public website.

## 🌟 Features

### Public Website
- **Modern Design**: Responsive, accessibility-focused design with dark mode support
- **SEO Optimized**: Comprehensive meta tags, sitemap, structured data
- **PWA Ready**: Progressive Web App with offline capabilities
- **Performance**: Optimized images, lazy loading, Next.js 14 app router

### Member Portal (`/portal`)
- **Authentication**: Secure Google OAuth with role-based access control
- **Interactive Guided Tours**: Step-by-step onboarding tutorials for members and admins
- **Member Directory**: Search and filter member profiles
- **Events Management**: RSVP system with real-time updates
- **Announcements**: Club updates and pinned announcements
- **Document Library**: Access to meeting minutes and club resources
- **Financial Transparency**: Treasurer+ access to financial reports

### Admin Portal (`/admin`)
- **Content Management**: Posts, events, gallery management
- **Member Management**: User roles, permissions, directory
- **Analytics Dashboard**: Real-time statistics and activity feed
- **Settings**: Site configuration and customization
- **Three View Modes**: Table, Cards, and Kanban views for content

## 🚀 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Firebase Auth with custom claims
- **Database**: Firestore
- **Storage**: Firebase Storage
- **Email**: Resend
- **Analytics**: Vercel Analytics + Custom tracking
- **Icons**: Material Symbols
- **Deployment**: Vercel

## 📁 Project Structure

```
├── app/                    # Next.js app router pages
│   ├── (public pages)/     # Public website pages
│   ├── admin/              # Admin portal
│   ├── portal/             # Member portal
│   └── api/                # API routes
├── components/             # Shared components
│   ├── portal/tutorial/    # Interactive onboarding tutorials
├── lib/                    # Utilities and configurations
│   ├── firebase/           # Firebase setup
│   ├── portal/             # Portal-specific utilities
│   └── admin/              # Admin-specific utilities
├── types/                  # TypeScript type definitions
├── docs/                   # Documentation
│   ├── implementation/     # Implementation guides
│   ├── admin/              # Admin portal docs
│   └── portal/             # Member portal docs
└── public/                 # Static assets
```

## 🔧 Setup & Development

### Prerequisites
- Node.js 18+
- Firebase project with Firestore and Auth enabled
- Resend account (for emails)

### Environment Variables
Create `.env.local`:

```env
# Firebase Client (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (Server-side)
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'

# Email
RESEND_API_KEY=your_resend_key

# Stripe (for online dues payment) - REQUIRED for dues payment feature
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: Analytics
NEXT_PUBLIC_GA_ID=your_ga_id
```

**📘 For detailed Stripe setup:** See [STRIPE_SETUP_GUIDE.md](STRIPE_SETUP_GUIDE.md)

**📘 For all environment variables:** See [docs/VERCEL_ENV.md](docs/VERCEL_ENV.md)

### Installation & Running

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 🎯 Key Features Implementation

### Authentication & Authorization
- **Firebase Auth**: Google OAuth integration
- **Custom Claims**: Role-based permissions (MEMBER, BOARD, TREASURER, ADMIN)
- **Session Management**: HTTP-only cookies with 14-day expiry
- **Middleware Protection**: Auto-redirect for unauthenticated users

### Member Portal Features
- **Interactive Tutorials**: Guided onboarding tours with spotlight overlays for members and admins
- **Real-time Updates**: Firestore real-time subscriptions
- **Mobile Responsive**: Touch-friendly interface
- **Offline Support**: PWA with service worker
- **Search & Filters**: Throughout directory and documents

### Admin Portal Features
- **Multiple View Modes**: Table, Cards, Kanban for different workflows
- **Bulk Operations**: Multi-select actions
- **Image Management**: Firebase Storage integration
- **Rich Text Editor**: React Quill for content creation

### Performance & SEO
- **Image Optimization**: Next.js Image with proper sizing
- **Code Splitting**: Dynamic imports for heavy components
- **Metadata**: Comprehensive Open Graph and Twitter cards
- **Structured Data**: JSON-LD for events and organization

## 📖 Documentation

### Quick Links
- **[Stripe Setup Guide](STRIPE_SETUP_GUIDE.md)** ⭐ **Set up online dues payment**
- [Member Guide](docs/MEMBER_GUIDE.md) — End-to-end guide for new members
- [Admin Guide](docs/ADMIN_GUIDE.md) — Complete admin & board reference
- [Admin Portal Guide](docs/implementation/ADMIN_PORTAL_CURATION.md)
- [Portal Implementation](docs/portal/PORTAL_IMPLEMENTATION_SUMMARY.md)
- [Member Onboarding & Dues Payment](docs/MEMBER_ONBOARDING.md)
- [Annual Dues System](docs/ANNUAL_DUES_IMPLEMENTATION.md)
- [Permission Issues Fix](docs/admin/QUICK_FIX.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Deployment Checklist](docs/portal/PORTAL_DEPLOYMENT_CHECKLIST.md)

### API Documentation
- Authentication: `/api/auth/session`
- Portal: `/api/portal/*`
- Admin: `/api/admin/*`
- Public: `/api/public/*`

## 🔒 Security Features

- **Rate Limiting**: API endpoint protection
- **Input Validation**: TypeScript + runtime validation
- **CORS Configuration**: Proper origin restrictions
- **Session Security**: HTTP-only cookies, CSRF protection
- **Role-based Access**: Hierarchical permission system

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run E2E tests
npm run test:e2e
```

## 📊 Monitoring & Analytics

### Built-in Analytics
- Page views and user journeys
- Conversion tracking (membership, donations)
- Event engagement metrics
- Portal usage statistics

### Error Monitoring
- Client-side error boundaries
- Server-side error logging
- Performance monitoring

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Manual Deployment
```bash
npm run build
npm start
```

### Firebase Setup
1. Deploy Firestore rules: `firebase deploy --only firestore:rules`
2. Deploy storage rules: `firebase deploy --only storage`
3. Set up custom claims sync (see docs/admin/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style
- Use TypeScript for all new code
- Follow existing component patterns
- Add proper error handling
- Include accessibility attributes

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check the `docs/` folder
- **Issues**: GitHub Issues
- **Questions**: Contact the development team

## 🏆 Acknowledgments

- Rotaract International for inspiration and guidelines
- Contributors and community members
- Open source libraries and tools used

---

**Built with ❤️ for the Rotaract Club at the United Nations**