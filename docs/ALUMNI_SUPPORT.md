# Alumni Support - Member Directory

## Overview
The member directory now supports past members (alumni) with proper filtering, visual distinction, and appropriate contact restrictions.

## Features

### 1. Status Types
Updated `UserStatus` type in `types/portal.ts`:
```typescript
export type UserStatus = 'pending' | 'active' | 'inactive' | 'alumni';
```

### 2. Data Model Enhancement
Added `rotaryYears` field to User interface:
```typescript
rotaryYears?: string[]; // e.g., ["2023-2024", "2024-2025"]
```

## Directory Page Features

### Status Tabs
- **Active Members Tab** (Default)
  - Shows only members with `status === 'active'`
  - Displays count badge
  - Full contact features available

- **Alumni Tab**
  - Shows only members with `status === 'alumni'`
  - Displays count badge
  - Limited contact features

### Visual Distinction for Alumni

**Member Cards:**
- Muted border colors (slate instead of primary)
- Semi-grayscale photos (30% desaturation)
- "Alumni" badge in top-left corner with school icon
- Muted text colors throughout
- Shows Rotary years instead of current committee info

**Profile Pages:**
- "Alumni" status badge instead of "Active"
- "Was Member Since" instead of "Member Since"
- Rotary Years card showing their years of service
- No "Send Message" button
- LinkedIn only contact method (if available)
- Informational text: "Alumni members can only be contacted via LinkedIn"

### Search & Filtering
- Search respects selected tab (Active vs Alumni)
- Role and committee filters work within selected tab
- Member count updates based on active tab

### Empty States
Different empty state messages for:
- No active members
- No alumni yet
- No search results

## Contact Restrictions

### Active Members
✅ Can send messages to other active members  
✅ Can view email addresses  
✅ Can access phone/WhatsApp (if shared)  
✅ Can view LinkedIn profiles  

### Alumni Members
❌ Cannot receive messages via portal  
❌ Email addresses not shown  
❌ Phone/WhatsApp not accessible  
✅ LinkedIn profile accessible (if provided)  

### Messaging Logic
- Active → Active: Full messaging enabled
- Active → Alumni: Only LinkedIn contact
- Alumni → Anyone: No messaging (alumni don't have portal access by default)

## UI Components Updated

### Directory Page (`app/portal/directory/page.tsx`)
- Added status tabs with toggle
- Updated member filtering logic
- Enhanced MemberCard with alumni styling
- Updated empty states

### Profile Page (`app/portal/directory/[uid]/page.tsx`)
- Conditional status badge
- Conditional contact actions
- Added Rotary Years display for alumni
- Updated "Member Since" label for alumni

### Types (`types/portal.ts`)
- Added 'alumni' to UserStatus type
- Added rotaryYears field to User interface

## Implementation Details

### Firestore Queries
The directory fetches both active and alumni members in parallel:
```typescript
const activeQuery = query(usersRef, where('status', '==', 'active'));
const alumniQuery = query(usersRef, where('status', '==', 'alumni'));
```

### Filtering Logic
```typescript
// Status filter - respect active vs alumni tab
filtered = filtered.filter(m => m.status === statusFilter);
```

### Visual Styling
Alumni cards use:
- `opacity-90` on card container
- `grayscale-[30%]` on photos
- Slate color scheme instead of primary colors
- Muted text colors throughout

## Admin Tasks

### Converting Member to Alumni
When a member becomes alumni, admins should:
1. Update `status` field to `'alumni'`
2. Add their service years to `rotaryYears` array:
   ```javascript
   rotaryYears: ["2023-2024", "2024-2025"]
   ```
3. Optionally preserve their bio and profile for historical purposes

### Data Migration
For existing members becoming alumni:
```javascript
// Example Firestore update
await db.collection('users').doc(memberId).update({
  status: 'alumni',
  rotaryYears: ['2023-2024', '2024-2025']
});
```

## Future Enhancements
- Alumni-only events or gatherings
- Alumni newsletter sign-up
- "Where are they now?" stories
- Mentorship connections between alumni and active members
- Alumni directory page (public-facing)
- Graduation year grouping
- Alumni achievements showcase

## Testing Checklist
- [ ] Active members tab shows only active members
- [ ] Alumni tab shows only alumni members
- [ ] Tab counts are accurate
- [ ] Search works within selected tab
- [ ] Alumni cards have visual distinction (badge, muted colors)
- [ ] Alumni profiles show status correctly
- [ ] Send Message hidden for alumni
- [ ] Rotary years display for alumni
- [ ] LinkedIn button works for alumni
- [ ] Empty states show correctly
- [ ] Filters respect selected tab
