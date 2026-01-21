# Member-to-Member Messaging Feature

## Overview
Allows active members to contact each other through the portal without exposing email addresses directly.

## Features
- ✅ Privacy-focused: Email addresses not exposed in UI
- ✅ Active member validation
- ✅ Professional email templates
- ✅ Reply-to functionality for direct responses
- ✅ Message metadata logging (without storing content)
- ✅ Success/error handling with user feedback

## How It Works

### User Experience
1. Member visits another member's profile at `/portal/directory/[memberId]`
2. Clicks "Send Message" button (only visible to active members)
3. Modal opens with subject and message fields
4. Privacy notice informs: "Your email will only be shared if the recipient replies."
5. On submit, email is sent via Resend
6. Success confirmation shown, modal closes automatically

### Email Flow
- **From**: Rotaract Portal <no-reply@rotaractnyc.org>
- **To**: Recipient's email
- **Reply-To**: Sender's email
- **Subject**: "Rotaract NYC: [User's Subject]"
- **Body**: Professional HTML template with sender's name and message

### Backend Logic
1. **Authentication**: Verifies session cookie via Firebase Admin
2. **Authorization**: Checks sender has `status === 'active'`
3. **Validation**: Ensures subject and message are non-empty
4. **Data Fetching**: Retrieves sender and recipient data from Firestore
5. **Email Sending**: Uses Resend API with reply-to header
6. **Logging**: Stores metadata in `memberMessages` collection:
   - senderId, senderName, senderEmail
   - recipientId, recipientName, recipientEmail
   - subject, sentAt, status
   - **Does NOT store message content** (privacy)

## Files Created/Modified

### New Files
- `components/portal/MessageModal.tsx` - Reusable modal component
- `lib/portal/sendMemberMessage.ts` - Server action for sending messages

### Modified Files
- `lib/resend.ts` - Added `sendMemberToMemberMessage()` function and type
- `app/portal/directory/[uid]/page.tsx` - Integrated modal, replaced mailto links

## Security & Privacy

### Privacy Protections
- No email addresses displayed in "Send Message" UI
- Removed mailto links from contact section
- Email only shared via reply-to header (recipient must reply)
- Message content not stored in database

### Access Control
- Only authenticated users can access profiles
- Only active members can send messages
- Server-side validation of member status
- Session cookie verification on every request

### Rate Limiting
Consider adding rate limiting to prevent abuse:
```typescript
// Example: Limit to 10 messages per hour per user
await db.collection('memberMessages')
  .where('senderId', '==', senderId)
  .where('sentAt', '>=', oneHourAgo)
  .get();
```

## Firestore Collection Schema

### `memberMessages` Collection
```typescript
{
  senderId: string;
  senderName: string;
  senderEmail: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  sentAt: Timestamp;
  status: 'sent' | 'failed';
}
```

## Environment Variables Required
- `RESEND_API_KEY` - Resend API key
- `RESEND_FROM` - From email address (e.g., `no-reply@rotaractnyc.org`)

## Future Enhancements
- Rate limiting per user
- Message read receipts (optional)
- In-app notification when message sent
- Admin dashboard for message analytics
- Block/report functionality
- Message templates for common inquiries

## Testing Checklist
- [ ] Modal opens when clicking "Send Message"
- [ ] Modal validates required fields
- [ ] Modal shows privacy notice
- [ ] Email sends successfully via Resend
- [ ] Recipient receives email with proper formatting
- [ ] Reply-to works (recipient can reply directly)
- [ ] Message metadata logged to Firestore
- [ ] Error handling works for failed sends
- [ ] Only active members can send messages
- [ ] Unauthenticated users see appropriate message
