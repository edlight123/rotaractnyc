# Members Portal - Deployment Checklist

## Pre-Deployment Setup

### 1. Environment Variables ✅
Ensure these are set in your deployment environment (Vercel, etc.):

```bash
# Firebase Client (Public - can be exposed)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Firebase Admin (Server - KEEP SECRET)
FIREBASE_SERVICE_ACCOUNT_BASE64=base64-encoded-service-account-json
# OR use split variables:
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 2. Firebase Console Setup ✅

#### Enable Authentication
1. Go to Firebase Console → Authentication
2. Click "Get Started"
3. Enable "Google" sign-in provider
4. Add authorized domains (your production domain)

#### Configure Firestore
1. Go to Firebase Console → Firestore Database
2. Click "Create Database"
3. Choose production mode
4. Select a location (e.g., us-central1)

#### Deploy Security Rules
```bash
firebase login
firebase init firestore  # if not already initialized
firebase deploy --only firestore:rules
```

Verify rules are deployed:
```bash
firebase firestore:rules
```

### 3. Create First Admin User

#### Option A: Using the seed script
```bash
# User must sign in at least once first
npm run seed:portal -- --admin admin@example.com
```

#### Option B: Manual (Firebase Console)
1. Have user sign in once at `/portal/login`
2. Go to Firebase Console → Authentication
3. Copy the user's UID
4. Go to Firestore → users collection → Add document
```json
{
  "uid": "paste-uid-here",
  "name": "Admin Name",
  "email": "admin@example.com",
  "role": "ADMIN",
  "status": "active",
  "phoneOptIn": false,
  "createdAt": "2026-01-15T00:00:00Z",
  "updatedAt": "2026-01-15T00:00:00Z"
}
```
5. Set custom claims using Firebase Admin SDK or Cloud Functions:
```javascript
admin.auth().setCustomUserClaims(uid, { role: 'ADMIN' });
```

#### Option C: Using API route (if you already have an admin)
```bash
curl -X POST https://your-domain.com/api/portal/admin/set-role \
  -H "Content-Type: application/json" \
  -d '{"email":"newadmin@example.com","role":"ADMIN"}'
```

## Testing Checklist

### Authentication Tests ✅
- [ ] Visit `/portal` → redirects to `/portal/login`
- [ ] Click "Sign in with Google"
- [ ] Complete OAuth flow
- [ ] Redirects to `/portal` dashboard
- [ ] User info displays in nav bar
- [ ] Sign out works
- [ ] After sign out, redirects to `/portal/login`

### Dashboard Tests ✅
- [ ] Welcome message shows user name
- [ ] Quick links render
- [ ] Upcoming events section loads
- [ ] Recent announcements section loads
- [ ] Loading states show while fetching data

### Directory Tests ✅
- [ ] All active members display
- [ ] Search by name works
- [ ] Filter by role works
- [ ] Filter by committee works
- [ ] Contact info displays (email, phone, etc.)
- [ ] Profile photos load

### Events Tests ✅
- [ ] Upcoming events list displays
- [ ] Event details show (date, time, location)
- [ ] RSVP buttons work
- [ ] RSVP status updates in real-time
- [ ] Cannot RSVP to past events

### Announcements Tests ✅
- [ ] Announcements feed displays
- [ ] Pinned announcements appear first
- [ ] Timestamp displays correctly
- [ ] Full body text shows

### Documents Tests ✅
- [ ] Documents list displays
- [ ] Filter by category works
- [ ] Download links work
- [ ] External links open in new tab

### Finance Tests (Treasurer+ only) ✅
- [ ] Non-treasurer users see permission error
- [ ] Treasurer can access page
- [ ] Monthly summaries display
- [ ] Balance calculations correct
- [ ] Transactions table loads
- [ ] Filter by month works
- [ ] Filter by category works
- [ ] Receipt download links work

### Mobile Tests ✅
- [ ] Mobile nav hamburger menu works
- [ ] All pages responsive
- [ ] Touch interactions work
- [ ] Forms usable on mobile

### Role Tests ✅
- [ ] MEMBER: Cannot access finance page
- [ ] BOARD: Cannot access finance page
- [ ] TREASURER: Can access all pages
- [ ] ADMIN: Can access all pages + set roles

## Post-Deployment

### 1. Add Initial Content

#### Create Events
```javascript
// Use Firebase Console or Admin SDK
db.collection('events').add({
  title: 'Welcome Mixer',
  description: 'Join us for drinks and networking!',
  startAt: Timestamp.fromDate(new Date('2026-02-01T19:00:00')),
  endAt: Timestamp.fromDate(new Date('2026-02-01T21:00:00')),
  location: 'Bar 123, NYC',
  visibility: 'member',
  createdBy: 'admin-uid',
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now()
});
```

#### Create Announcements
```javascript
db.collection('announcements').add({
  title: 'Portal Launch!',
  body: 'Welcome to our new members portal...',
  pinned: true,
  visibility: 'member',
  createdBy: 'admin-uid',
  createdAt: Timestamp.now()
});
```

#### Add Documents
Upload files to Firebase Storage and add references:
```javascript
db.collection('documents').add({
  title: 'Meeting Minutes - Jan 2026',
  category: 'Minutes',
  url: 'https://firebasestorage.googleapis.com/...',
  visibility: 'member',
  createdBy: 'admin-uid',
  createdAt: Timestamp.now()
});
```

### 2. Onboard Members

1. **Send Welcome Email**
   - Portal URL: `https://your-domain.com/portal`
   - Instructions to sign in with Google
   - What they can access

2. **Set User Roles**
   ```bash
   # For each board member
   curl -X POST https://your-domain.com/api/portal/admin/set-role \
     -H "Content-Type: application/json" \
     -d '{"email":"board@example.com","role":"BOARD"}'
   ```

3. **Update User Profiles**
   - Add committee assignments
   - Set phone opt-in preferences
   - Add contact information

### 3. Financial Setup (Treasurer)

1. **Add Historical Transactions**
   ```javascript
   db.collection('transactions').add({
     date: Timestamp.fromDate(new Date('2026-01-15')),
     vendor: 'Venue Co',
     category: 'Events',
     amount: -500,
     noteForMembers: 'Venue rental for mixer',
     visibility: 'member',
     createdBy: 'treasurer-uid',
     createdAt: Timestamp.now()
   });
   ```

2. **Generate Monthly Summary**
   ```bash
   curl -X POST https://your-domain.com/api/portal/finance/recompute-summary \
     -H "Content-Type: application/json" \
     -d '{"month":"2026-01"}'
   ```

### 4. Monitor & Maintain

- **Check Firestore Usage**: Monitor reads/writes in Firebase Console
- **Review Errors**: Check logs in Vercel/deployment platform
- **User Feedback**: Gather feedback from members
- **Security**: Regularly review security rules and permissions

## Common Issues & Solutions

### Issue: "Firebase not configured"
**Solution**: Check environment variables are set correctly

### Issue: User can't sign in
**Solution**: 
- Verify Google OAuth is enabled in Firebase Console
- Check authorized domains include your production domain
- Ensure user's email domain is allowed (if restricted)

### Issue: User sees "Unauthorized" after login
**Solution**:
- Create user document in Firestore
- Set status to 'active'
- Set custom claims with role

### Issue: Finance page shows "insufficient permissions"
**Solution**:
- User needs TREASURER or ADMIN role
- Call `/api/portal/admin/set-role` to update
- User must sign out and back in for claims to refresh

### Issue: RSVP not saving
**Solution**:
- Check Firestore rules are deployed
- Verify user has MEMBER+ role
- Check browser console for errors

## Monitoring

### Key Metrics to Track
- Daily active users
- Sign-in success rate
- RSVP participation rate
- Page load times
- Error rates

### Firestore Quotas
- Free tier: 50K reads, 20K writes per day
- Monitor usage in Firebase Console
- Consider upgrading if needed

## Security Best Practices

✅ **Implemented**:
- HTTP-only session cookies
- Server-side session verification
- Role-based Firestore rules
- Admin SDK for privileged operations
- No sensitive data in client code

🔒 **Additional Recommendations**:
- Enable Firebase App Check (prevent abuse)
- Set up email verification (optional)
- Regular security audits
- Monitor suspicious activity
- Rate limiting on API routes (consider implementing)

## Backup & Recovery

### Automated Backups
Set up daily Firestore exports:
```bash
gcloud firestore export gs://your-bucket/backups/$(date +%Y%m%d)
```

### Manual Export
```bash
firebase firestore:export backups/
```

## Support

- **Technical Issues**: Create GitHub issue or contact tech team
- **User Questions**: Create FAQ document
- **Feature Requests**: Gather and prioritize

---

✅ **Portal is ready for production use!**

Last updated: January 15, 2026
