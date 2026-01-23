# Portal Articles Feature

## Overview
The portal now includes an Articles/Posts section where members can view published articles and news from the club. This is the member-facing view of the content managed in the Admin's "Content" section.

## Features

### Articles List Page (`/portal/posts`)
- Displays all published articles in a card grid layout
- Category filtering to browse articles by topic
- Responsive design with proper mobile support
- Clean, modern UI matching the portal design system
- Direct links to read full articles

### Article Detail Page (`/portal/posts/[slug]`)
- Full article view with proper formatting
- Category badge and metadata (date, author)
- Clean typography with proper spacing
- Back navigation to articles list
- Error handling for non-existent or unpublished articles

## Navigation
- Added "Articles" tab to the portal navigation bar
- Tab is highlighted when viewing articles or individual article pages
- Positioned between "Directory" and "Resources" tabs

## Access Control
- Only displays articles marked as `published: true` in Firestore
- All authenticated portal members can view published articles
- Draft articles remain hidden from members

## Data Structure
Articles are stored in Firestore under the `posts` collection with the following structure:

```typescript
{
  slug: string;          // Unique identifier/URL slug
  title: string;         // Article title
  date: string;          // Publication date (formatted)
  author: string;        // Author name
  category: string;      // Article category
  excerpt: string;       // Short preview text
  content: string[];     // Array of content paragraphs
  published: boolean;    // Visibility flag
}
```

## Usage

### For Members
1. Navigate to "Articles" in the portal navigation
2. Browse articles or filter by category
3. Click "Read more" to view full article
4. Use back button to return to articles list

### For Admins
1. Manage articles in Admin → Content (`/admin/posts`)
2. Create, edit, or publish/unpublish articles
3. Only published articles appear in the portal
4. Members see articles immediately after publishing

## Technical Details

### Files Created
- `/app/portal/posts/page.tsx` - Articles list page
- `/app/portal/posts/[slug]/page.tsx` - Individual article page

### Files Modified
- `/app/portal/_components/PortalNav.tsx` - Added Articles tab

### Dependencies
- Uses Firestore for data fetching
- Leverages existing auth system
- Follows portal design patterns and components

## Future Enhancements
Potential improvements for the articles feature:
- Search functionality within articles
- Related articles suggestions
- Comments or reactions from members
- Pagination for large article counts
- RSS feed for articles
- Email notifications for new articles
