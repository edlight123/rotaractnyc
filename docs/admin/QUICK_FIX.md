# ✅ FIXED: Portal Permission Issues

## What Was Wrong

**Firestore Errors**: "Missing or insufficient permissions"  
**Storage Errors**: CORS policy blocked image loading  

**Root Cause**: Users had roles in Firestore but missing Firebase Auth custom claims. Security rules check custom claims, not Firestore.

## What Was Fixed

### 1. ✅ Storage Rules Deployed
- File: `storage.rules`
- Changed from blocking all access to allowing member access
- **Status**: Deployed to Firebase

### 2. ✅ Custom Claims Sync Tools Created

**Option A: Admin UI (Easiest)**
- Added "Sync Custom Claims" button in Portal Settings
- Visible only to admins
- Location: `/portal/settings`

**Option B: API Endpoint**
- Endpoint: `POST /api/portal/admin/sync-claims`
- Admin-only access
- Returns detailed sync results

**Option C: Node.js Script**
- File: `scripts/sync-custom-claims.js`
- Requires Firebase credentials
- Run: `node scripts/sync-custom-claims.js`

### 3. ✅ Documentation Created
- `FIX_README.md` - Quick start
- `PERMISSION_FIX_SUMMARY.md` - Detailed summary
- `docs/PERMISSION_ISSUES_FIX.md` - Full technical docs

## How to Fix Right Now

### Step 1: Run Sync (Choose One Method)

**Method 1: Portal Settings UI (Recommended)**
1. Go to https://rotaractnyc-henna.vercel.app/portal/settings
2. Scroll to "Admin Tools" section
3. Click "Sync Custom Claims" button
4. Confirm and wait for completion

**Method 2: Browser Console**
```javascript
fetch('/api/portal/admin/sync-claims', {
  method: 'POST',
  credentials: 'include'
}).then(r => r.json()).then(console.log)
```

### Step 2: Users Refresh Token
Affected users must sign out and sign back in, or refresh token:
```javascript
await firebase.auth().currentUser.getIdToken(true)
```

### Step 3: Verify
- No more "Missing or insufficient permissions" errors
- Images load without CORS errors
- All portal features accessible

## Files Changed

| File | Purpose | Status |
|------|---------|--------|
| `storage.rules` | Allow member access to storage | ✅ Deployed |
| `scripts/sync-custom-claims.js` | CLI sync tool | ✅ Created |
| `app/api/portal/admin/sync-claims/route.ts` | API endpoint | ✅ Created |
| `app/portal/_components/SyncCustomClaimsButton.tsx` | UI component | ✅ Created |
| `app/portal/settings/page.tsx` | Added admin tools section | ✅ Updated |
| `docs/PERMISSION_ISSUES_FIX.md` | Full documentation | ✅ Created |
| `FIX_README.md` | Quick guide | ✅ Created |
| `PERMISSION_FIX_SUMMARY.md` | Technical summary | ✅ Created |

## Prevention

Always sync both when changing roles:
```typescript
// ✅ Use the API (handles both automatically)
await fetch('/api/portal/admin/set-role', {
  method: 'POST',
  body: JSON.stringify({ email, role })
});

// ✅ Or manually do both
await auth.setCustomUserClaims(uid, { role });
await db.collection('users').doc(uid).set({ role }, { merge: true });
```

## Next Steps

1. **Run the sync** using any method above
2. **Test with treasurerrcun@gmail.com** after sync
3. **Verify all portal features work**
4. **Read docs/PERMISSION_ISSUES_FIX.md** for details

---

**Summary**: Storage rules deployed ✅ | Sync tools ready ✅ | Just need to run sync once ✅
