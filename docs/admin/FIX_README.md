# URGENT: Permission Issues Fix

## Problem
Users are getting "Missing or insufficient permissions" errors when trying to access portal content.

## Quick Fix

### Option 1: Via API (Easiest)

1. Sign in to the portal as an admin
2. Open browser console (F12)
3. Run this command:

```javascript
fetch('/api/portal/admin/sync-claims', {
  method: 'POST',
  credentials: 'include'
}).then(r => r.json()).then(console.log)
```

4. Ask affected users to sign out and sign back in

### Option 2: Via Script (Requires Environment Variables)

1. Set up Firebase credentials:
   ```bash
   export FIREBASE_SERVICE_ACCOUNT='<your-service-account-json>'
   # OR
   export FIREBASE_ADMIN_PROJECT_ID="rotaractnyc-ac453"
   export FIREBASE_ADMIN_CLIENT_EMAIL="<service-account-email>"
   export FIREBASE_ADMIN_PRIVATE_KEY="<private-key>"
   ```

2. Run the sync script:
   ```bash
   node scripts/sync-custom-claims.js
   ```

3. Ask affected users to sign out and sign back in

## What Was Fixed

1. ✅ **Storage Rules Updated**
   - Changed from blocking all client access to allowing members to read files
   - Deployed to Firebase Storage

2. ✅ **Created Sync Scripts**
   - Node.js script: `scripts/sync-custom-claims.js`
   - API endpoint: `/api/portal/admin/sync-claims`
   - Both sync Firestore roles to Firebase Auth custom claims

3. ✅ **Documentation Created**
   - Full guide: `docs/PERMISSION_ISSUES_FIX.md`
   - Explains root cause and prevention

## Why This Happened

The Firestore security rules check `request.auth.token.role` (custom claims), not the role in the Firestore document. When users were created or roles were updated, the custom claims weren't synced, causing permission denials.

## After Running the Sync

Affected users must:
- **Sign out and sign back in** (easiest)
- OR refresh their token: `await firebase.auth().currentUser.getIdToken(true)`

## Prevention

When creating or updating users, always sync both:

```typescript
// ✓ Correct
await auth.setCustomUserClaims(uid, { role: 'TREASURER' });
await db.collection('users').doc(uid).set({ role: 'TREASURER' }, { merge: true });

// ✗ Wrong - only updates Firestore
await db.collection('users').doc(uid).update({ role: 'TREASURER' });
```

Use the `/api/portal/admin/set-role` endpoint which handles both automatically.

## Files Changed

- ✅ `storage.rules` - Deployed to Firebase
- ✅ `scripts/sync-custom-claims.js` - Created
- ✅ `app/api/portal/admin/sync-claims/route.ts` - Created
- ✅ `docs/PERMISSION_ISSUES_FIX.md` - Created
- ✅ `FIX_README.md` - This file

## Next Steps

1. Run the sync (via API or script)
2. Test with the treasurer account (treasurerrcun@gmail.com)
3. Verify no more permission errors
4. Read `docs/PERMISSION_ISSUES_FIX.md` for full details
