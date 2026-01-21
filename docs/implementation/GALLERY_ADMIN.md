# Gallery Admin Management System

## Overview

The Gallery Admin Management System is a comprehensive, multi-view photo management interface for the Rotaract NYC website. It provides three distinct viewing modes to efficiently organize, manage, and curate the club's photo collections.

## Features

### 🎨 Three View Modes

#### 1. Masonry Grid View
- **Pinterest-style** responsive layout
- Automatic column adaptation (1-4 columns based on screen size)
- Hover overlays with quick actions
- Beautiful image presentations with varying heights
- Select multiple images with checkboxes
- Inline edit and delete actions

#### 2. Albums View  
- Card-based layout for album management
- Hover effects with image zoom
- Quick preview and metadata display
- Perfect for organizing photos by events
- Clean, modern card design

#### 3. List/Table View
- Compact table layout for bulk management
- Sortable columns
- Thumbnail previews
- Quick checkbox selection
- Efficient for managing large collections

### ✨ Key Capabilities

- **Multi-Select & Bulk Actions**: Select multiple images and perform batch operations
- **Search & Filter**: Real-time search by title or description
- **Drag & Drop Upload**: Easy file upload with visual feedback
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Dark Mode Support**: Full theme compatibility
- **Firebase Integration**: Seamless cloud storage
- **Live Statistics**: Real-time photo count and storage usage

## Usage

### Accessing the Gallery Admin

Navigate to `/admin/gallery` when logged in as an administrator.

### Adding New Photos

1. Click the **Upload Photos** area at the top
2. Fill in the photo details:
   - **Title**: Event or photo name
   - **Alt Text**: Accessibility description
   - **Display Order**: Numerical sorting position
3. Upload an image file (drag & drop or browse)
4. Click **Create Image** to save

### Managing Photos

#### Switching Views
Use the view mode toggle in the toolbar:
- 🔲 **Masonry**: Grid view
- 📘 **Albums**: Card view  
- 📋 **List**: Table view

#### Selecting Multiple Images
1. Click **Select All** or check individual images
2. Use the floating action bar to:
   - Download selected images
   - Delete multiple images at once

#### Editing a Photo
- **Masonry/List View**: Click the edit icon on hover
- **Albums View**: Click the edit button on the card
- Modify details and save changes

#### Deleting Photos
- Single delete: Click the delete icon on any image
- Bulk delete: Select multiple and use the floating action bar

### Search & Filter

Use the search bar to find images by:
- Photo title
- Alt text description

Results update in real-time as you type.

## Technical Details

### File Structure

```
app/admin/gallery/
  └── page.tsx          # Main gallery management component

lib/content/
  └── gallery.ts        # Default gallery items

app/globals.css         # Gallery-specific styles
```

### View Components

The page includes three internal view components:

1. **MasonryView**: Pinterest-style grid with CSS columns
2. **AlbumsView**: Card-based layout with hover effects  
3. **ListView**: Table layout with sortable columns

### State Management

- `viewMode`: Current view (masonry, albums, list)
- `selectedItems`: Set of selected image IDs
- `searchQuery`: Current search filter
- `items`: All gallery items from Firebase
- `filteredItems`: Filtered results based on search

### Styling

Custom CSS includes:
- Responsive masonry grid (1-4 columns)
- Hover animations and transitions
- Shadow utilities (lift, lift-hover)
- Slide-in animations for action bar
- Dark mode color schemes

### Firebase Collections

**Collection**: `gallery`

**Document Structure**:
```typescript
{
  id: string
  title: string
  alt: string
  imageUrl: string
  storagePath?: string
  order: number
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

## Keyboard Shortcuts

- **Escape**: Close bulk selection
- **Ctrl/Cmd + A**: Select all (when focused)

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## Performance Optimizations

- Memoized filtered results
- Optimized re-renders with React hooks
- Lazy image loading
- Efficient bulk operations
- Debounced search

## Accessibility

- ✅ ARIA labels on all interactive elements
- ✅ Keyboard navigation support
- ✅ Screen reader friendly
- ✅ Alt text required for all images
- ✅ Focus indicators on all controls

## Future Enhancements

Potential improvements for future versions:

- [ ] Drag-and-drop reordering
- [ ] Advanced filtering (by date, tags, albums)
- [ ] Image editing tools (crop, rotate, filters)
- [ ] Album creation and organization
- [ ] Batch metadata editing
- [ ] Export selected images as ZIP
- [ ] Image compression options
- [ ] Usage analytics

## Troubleshooting

### Images Not Loading
- Check Firebase Storage configuration
- Verify storage rules allow admin access
- Ensure image URLs are valid

### Upload Failing
- Check file size (may be limited by Firebase)
- Verify file format (jpg, png, gif, webp supported)
- Check Firebase Storage quota

### Slow Performance
- Clear browser cache
- Check network connection
- Optimize image sizes before upload

## Support

For issues or questions, contact the development team or open an issue in the repository.

---

**Version**: 2.0  
**Last Updated**: January 2026  
**Maintainer**: Rotaract NYC Development Team
