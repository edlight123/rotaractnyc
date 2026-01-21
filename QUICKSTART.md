# 🎯 Annual Dues System - Quick Start

## ✅ Implementation Complete

All code has been written and integrated. Follow these steps to deploy and activate the system.

---

## 📋 Step-by-Step Setup

### 1️⃣ Generate API Key

Generate a secure API key for automation:

```bash
openssl rand -base64 32
```

Copy the output for the next step.

### 2️⃣ Add Environment Variable

Add to your `.env.local`:

```bash
AUTOMATION_API_KEY=<paste-the-key-from-step-1>
```

### 3️⃣ Deploy Firestore Rules & Indexes

Run the deployment script:

```bash
./scripts/deploy-dues-system.sh
```

Or manually:

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 4️⃣ Deploy to Production

```bash
git add .
git commit -m "Add annual dues system with Rotary year cycles"
git push origin main
```

### 5️⃣ Configure Vercel Environment Variables

In your Vercel dashboard, add:

- `AUTOMATION_API_KEY` = (the key you generated in step 1)

### 6️⃣ Setup GitHub Actions (for automation)

In your GitHub repository settings, add these secrets:

- `NEXT_PUBLIC_BASE_URL` = https://your-domain.com
- `AUTOMATION_API_KEY` = (the key you generated in step 1)

The workflow is already configured at `.github/workflows/dues-automation.yml`

### 7️⃣ Create Your First Dues Cycle

1. Navigate to `https://your-domain.com/admin/finance/dues`
2. Enter ending year (e.g., 2026 for RY-2026)
3. Set amount (default: $85)
4. Click "Create Cycle"
5. Click "Activate" to make it the active cycle

---

## 🧪 Testing

### Test the Banner

1. Login to portal as a member
2. You should see the dues banner at the top
3. Click "Pay Now" to test checkout flow
4. Use Stripe test card: `4242 4242 4242 4242`

### Test Admin Functions

1. Go to `/admin/finance/dues`
2. Test "Mark Paid Offline" with notes
3. Test "Waive" with a reason
4. Verify statuses update correctly

### Test Automation (Manual)

```bash
# Test reminders
curl -X POST http://localhost:3000/api/admin/dues/automation \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"send-reminders"}'

# Test overdue notices
curl -X POST http://localhost:3000/api/admin/dues/automation \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"send-overdue"}'

# Test grace enforcement
curl -X POST http://localhost:3000/api/admin/dues/automation \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"enforce-grace"}'
```

---

## 📊 What's Included

### New Pages
- ✅ `/admin/finance/dues` - Admin management UI
- ✅ Portal banner - Member dues notification

### New API Endpoints
- ✅ `POST /api/stripe/checkout/dues` - Create checkout session
- ✅ `POST /api/webhooks/stripe` - Updated to handle dues payments
- ✅ `POST /api/admin/dues/automation` - Automation endpoint (3 actions)

### New Collections (Firestore)
- ✅ `dues_cycles/{cycleId}` - Rotary year cycles
- ✅ `member_dues/{memberId}/cycles/{cycleId}` - Per-member dues status
- ✅ `dues_payments/{paymentId}` - Annual dues payment records

### Documentation
- ✅ `docs/ANNUAL_DUES_GUIDE.md` - Complete guide (~600 lines)
- ✅ `docs/ANNUAL_DUES_IMPLEMENTATION.md` - Implementation summary
- ✅ `.env.annual-dues.template` - Environment variable template
- ✅ `QUICKSTART.md` - This file

### Infrastructure
- ✅ Updated Firestore security rules
- ✅ Added Firestore indexes
- ✅ Deployment script: `scripts/deploy-dues-system.sh`
- ✅ GitHub Actions workflow: `.github/workflows/dues-automation.yml`

---

## 🔗 Key URLs

After deployment:

- **Admin Dashboard**: `https://your-domain.com/admin/finance/dues`
- **Member Portal**: `https://your-domain.com/portal` (banner auto-shows)
- **Automation Endpoint**: `https://your-domain.com/api/admin/dues/automation`

---

## 📖 Documentation

- **Full Guide**: [docs/ANNUAL_DUES_GUIDE.md](docs/ANNUAL_DUES_GUIDE.md)
- **Implementation Details**: [docs/ANNUAL_DUES_IMPLEMENTATION.md](docs/ANNUAL_DUES_IMPLEMENTATION.md)

---

## 🆘 Troubleshooting

### Banner Not Showing
- Check if a cycle is active at `/admin/finance/dues`
- Verify member status is ACTIVE
- Check browser console for errors

### Payment Not Processing
- Check Stripe webhook configuration
- Verify webhook secret matches environment variable
- Check Vercel logs for errors

### Automation Not Running
- Verify GitHub secrets are set correctly
- Check Actions tab in GitHub for workflow runs
- Test manually with curl commands above

---

## ✨ Next Steps

1. Complete the 7-step setup above
2. Test thoroughly in development
3. Deploy to production
4. Create your first cycle for current Rotary year
5. Announce to members

---

**Questions?** See the full guide at [docs/ANNUAL_DUES_GUIDE.md](docs/ANNUAL_DUES_GUIDE.md)
