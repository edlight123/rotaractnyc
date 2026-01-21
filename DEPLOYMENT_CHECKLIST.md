# 🚀 Annual Dues System - Deployment Checklist

Use this checklist to track your deployment progress.

## Pre-Deployment

- [ ] Read [QUICKSTART.md](QUICKSTART.md)
- [ ] Review [docs/ANNUAL_DUES_GUIDE.md](docs/ANNUAL_DUES_GUIDE.md)

## Development Setup

- [ ] Generate API key: `openssl rand -base64 32`
- [ ] Add `AUTOMATION_API_KEY` to `.env.local`
- [ ] Test locally: `npm run dev`
- [ ] Verify DuesBanner appears in portal (create test cycle first)

## Firestore Deployment

- [ ] Run `./scripts/deploy-dues-system.sh` OR
- [ ] Run `firebase deploy --only firestore:rules`
- [ ] Run `firebase deploy --only firestore:indexes`
- [ ] Verify rules deployed successfully
- [ ] Verify indexes are building (check Firebase Console)

## Production Deployment

- [ ] Commit changes: `git add . && git commit -m "Add annual dues system"`
- [ ] Push to GitHub: `git push origin main`
- [ ] Verify Vercel deployment succeeded
- [ ] Check Vercel logs for any errors

## Vercel Configuration

- [ ] Add `AUTOMATION_API_KEY` to Vercel environment variables
- [ ] Redeploy if needed after adding variable

## GitHub Actions Setup

- [ ] Go to GitHub repository Settings → Secrets
- [ ] Add `NEXT_PUBLIC_BASE_URL` secret
- [ ] Add `AUTOMATION_API_KEY` secret
- [ ] Verify workflow file exists at `.github/workflows/dues-automation.yml`
- [ ] Test manual trigger: Actions tab → Dues Automation → Run workflow

## First Cycle Creation

- [ ] Login as admin
- [ ] Navigate to `/admin/finance/dues`
- [ ] Create cycle for current Rotary year
- [ ] Set correct amount (e.g., $85.00)
- [ ] Activate the cycle
- [ ] Verify banner shows in member portal

## Testing

### Member Experience
- [ ] Login as test member
- [ ] Verify banner displays correctly
- [ ] Click "Pay Now"
- [ ] Complete checkout with test card: `4242 4242 4242 4242`
- [ ] Verify banner disappears after payment
- [ ] Check payment appears in admin dashboard

### Admin Functions
- [ ] Test "Mark Paid Offline" with notes
- [ ] Test "Waive" with reason
- [ ] Verify status changes reflect immediately
- [ ] Check member dues table shows correct statuses

### Automation (Manual Test)
- [ ] Test send-reminders endpoint
- [ ] Test send-overdue endpoint
- [ ] Test enforce-grace endpoint
- [ ] Check console logs for results
- [ ] Verify emails sent (if applicable)

## Production Verification

- [ ] Create actual cycle for current Rotary year
- [ ] Announce to board members
- [ ] Monitor first few payments
- [ ] Check automation runs daily (check GitHub Actions)
- [ ] Monitor Vercel logs for any errors

## Post-Deployment

- [ ] Update any internal documentation
- [ ] Train board members on admin UI
- [ ] Communicate to members about new dues system
- [ ] Set calendar reminders to check automation

---

## Quick Reference

**Admin Dashboard**: `/admin/finance/dues`

**Automation Test**:
```bash
curl -X POST https://your-domain.com/api/admin/dues/automation \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"send-reminders"}'
```

**Stripe Test Card**: `4242 4242 4242 4242`

---

✅ = Completed | ⏳ = In Progress | ❌ = Failed

**Status**: ___________

**Deployed By**: ___________

**Date**: ___________
