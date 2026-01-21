# Permission Issues - Resolution Summary

## Issues Identified

### 1. Firestore Permission Errors
**Error**: `FirebaseError: Missing or insufficient permissions`

**Collections affected**:
- events
- portalEvents  
- communityPosts
- members (users)
- documents
- transactions
- monthlySummaries
- announcements

**Root cause**: User has role in Firestore but missing Firebase Auth custom claims

### 2. Storage CORS Errors
**Error**: `Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' has been blocked by CORS policy`

**Files affected**: Community post images in `community-posts/{userId}/` paths

**Root cause**: Storage rules blocked all client-side access

## Solutions Implemented

### ✅ Storage Rules Fixed
**File**: `storage.rules`  
**Status**: **Deployed to Firebase**

Updated from denying all access to:
- Members can read community posts, documents, profile photos, event images
- Users can write their own community posts and profile photos
- Board members can manage documents and event images
- Admins have full control

### ✅ Custom Claims Sync Tool Created

**Script**: `scripts/sync-custom-claims.js`
- Syncs Firestore user roles to Auth custom claims
- Provides detailed success/failure reporting
- Requires Firebase Admin credentials

**API Endpoint**: `/api/portal/admin/sync-claims`
- Same functionality as script
- Accessible via authenticated admin session
- Returns detailed results JSON

### ✅ Documentation
- **FIX_README.md**: Quick start guide
- **docs/PERMISSION_ISSUES_FIX.md**: Complete technical documentation
  - Root cause analysis
  - Step-by-step fix instructions
  - Prevention guidelines
  - Architecture notes

## Action Required

### Immediate (Now)
Run the custom claims sync using **one** of these methods:

**Method 1: Browser Console (Easiest)**
1. Sign in as admin at `/portal`
2. Open DevTools console (F12)
3. Run:
   ```javascript
   fetch('/api/portal/admin/sync-claims', {
     method: 'POST',
     credentials: 'include'
   }).then(r => r.json()).then(console.log)
   ```

**Method 2: Node.js Script**
```bash
# Set Firebase credentials first
export FIREBASE_SERVICE_ACCOUNT='{"project_id":"...","private_key":"...","client_email":"..."}'

# Run sync
node scripts/sync-custom-claims.js
```

### After Sync
All affected users must:
- Sign out and sign back in
- OR force token refresh in browser console:
  ```javascript
  firebase.auth().currentUser.getIdToken(true)
  ```

### Verify Fix
1. Sign in as `treasurerrcun@gmail.com`
2. Navigate to portal dashboard
3. Check browser console for errors
4. Verify:
   - ✅ No "Missing or insufficient permissions" errors
   - ✅ No CORS errors on storage files
   - ✅ Community posts load with images
   - ✅ Events, members, documents all accessible

## How to Prevent This

### When Creating Users
Always set both Firestore document AND custom claims:
```typescript
await auth.setCustomUserClaims(uid, { role: 'BOARD' });
await db.collection('users').doc(uid).set({ 
  role: 'BOARD',
  status: 'active',
  // ... other fields
}, { merge: true });
```

### When Updating Roles
**Use the built-in API** (recommended):
```typescript
await fetch('/api/portal/admin/set-role', {
  method: 'POST',
  body: JSON.stringify({ email, role }),
});
```

**Manual update** (must do both):
```typescript
await auth.setCustomUserClaims(uid, { role: newRole });
await db.collection('users').doc(uid).update({ role: newRole });
```

### In Scripts
Any script modifying user roles must call `setCustomUserClaims`:
```javascript
const admin = require('firebase-admin');

// Both required!
await admin.auth().setCustomUserClaims(uid, { role: 'TREASURER' });
await admin.firestore().collection('users').doc(uid).set({ 
  role: 'TREASURER' 
}, { merge: true });
```

## Technical Details

### Why Custom Claims?
Firestore security rules check `request.auth.token.role`, which comes from JWT custom claims embedded in the auth token. This is faster than reading from Firestore and works offline.

### Claim Flow
```
1. Server:  auth.setCustomUserClaims(uid, { role: 'X' })
2. Client:  await user.getIdToken(true)  // refresh
3. Request: Authorization: Bearer <token-with-claims>
4. Rules:   request.auth.token.role == 'X'  ✓
```

### Current Architecture
```
Firebase Auth (Custom Claims)
    ↓
    ├─→ Security Rules check custom claims
    └─→ Must match Firestore user.role
            ↑
    Firestore users collection
```

## Files Modified

| File | Action | Status |
|------|--------|--------|
| `storage.rules` | Updated and deployed | ✅ Complete |
| `scripts/sync-custom-claims.js` | Created | ✅ Complete |
| `app/api/portal/admin/sync-claims/route.ts` | Created | ✅ Complete |
| `docs/PERMISSION_ISSUES_FIX.md` | Created | ✅ Complete |
| `FIX_README.md` | Created | ✅ Complete |
| `PERMISSION_FIX_SUMMARY.md` | Created | ✅ Complete |

## Deployment Checklist

- [x] Update storage.rules with member access
- [x] Deploy storage rules to Firebase
- [x] Create sync-custom-claims.js script
- [x] Create /api/portal/admin/sync-claims endpoint
- [x] Create documentation
- [ ] **Run custom claims sync** (action required)
- [ ] **Test with treasurer account** (after sync)
- [ ] **Verify all permissions work** (after sync)

## Support Resources

- Full documentation: `docs/PERMISSION_ISSUES_FIX.md`
- Quick start: `FIX_README.md`
- Portal architecture: `docs/PORTAL_ARCHITECTURE.md`
- Deployment guide: `PORTAL_DEPLOYMENT_CHECKLIST.md`

---

**Status**: Ready to sync claims and test  
**Priority**: High - Blocks portal functionality  
**Estimated fix time**: 5-10 minutes (after running sync)
