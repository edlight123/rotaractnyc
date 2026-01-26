'use client'

type Post = {
  slug: string
  title: string
  date: string
  author: string
  category: string
  excerpt: string
  content: string[]
  published: boolean
}

type KanbanViewProps = {
  posts: Post[]
  onEdit: (slug: string) => void
  onCreate: () => void
}

type Column = 'ideas' | 'in-progress' | 'review' | 'published'

export function KanbanView({ posts, onEdit, onCreate }: KanbanViewProps) {
  // Categorize posts based on their status
  const categorizedPosts = {
    ideas: posts.filter(p => !p.published && !p.content.length),
    'in-progress': posts.filter(p => !p.published && p.content.length > 0),
    review: [], // Could add custom field for this
    published: posts.filter(p => p.published),
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      'Events': { bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-600 dark:text-pink-400' },
      'News': { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-600 dark:text-cyan-400' },
      'Club News': { bg: 'bg-primary/10', text: 'text-primary' },
      'Interview': { bg: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-sky-600 dark:text-sky-400' },
      'Service': { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-600 dark:text-teal-400' },
      'Projects': { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' },
      'Community Service': { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-600 dark:text-teal-400' },
      'Membership': { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400' },
    }
    return colors[category] || { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-300' }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const KanbanCard = ({ post }: { post: Post }) => {
    const colors = getCategoryColor(post.category)
    
    return (
      <div
        onClick={() => onEdit(post.slug)}
        className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-700 hover:border-primary/40 cursor-pointer transition-all group flex flex-col gap-3"
      >
        <div className="flex justify-between items-start">
          <span className={`text-xs font-bold px-2 py-1 rounded ${colors.bg} ${colors.text}`}>
            {post.category}
          </span>
          <button className="text-slate-300 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="material-symbols-outlined text-[18px]">more_horiz</span>
          </button>
        </div>
        
        <h4 className="font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
          {post.title}
        </h4>
        
        {post.excerpt && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
            {post.excerpt}
          </p>
        )}
        
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700 mt-1">
          <div className="flex -space-x-1">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold ring-2 ring-white dark:ring-slate-800">
              {getInitials(post.author)}
            </div>
          </div>
          <div className="text-xs font-medium text-slate-400 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
            {formatDate(post.date)}
          </div>
        </div>
      </div>
    )
  }

  const KanbanColumn = ({
    title,
    count,
    posts,
    color,
    columnKey,
  }: {
    title: string
    count: number
    posts: Post[]
    color: string
    columnKey: Column
  }) => {
    return (
      <div className="w-80 flex flex-col h-full bg-slate-100/50 dark:bg-slate-800/30 rounded-xl">
        <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700 transition-colors group">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${color}`}></div>
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">{title}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              columnKey === 'published' 
                ? 'bg-accent text-white shadow-sm' 
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}>
              {count}
            </span>
          </div>
          {columnKey === 'ideas' && (
            <button
              onClick={onCreate}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-primary transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
          )}
        </div>
        
        <div className="flex-1 p-3 overflow-y-auto space-y-3">
          {posts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No posts in this stage
            </div>
          ) : (
            posts.map((post) => <KanbanCard key={post.slug} post={post} />)
          )}
          
          {columnKey === 'ideas' && (
            <button
              onClick={onCreate}
              className="w-full py-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-400 text-sm font-medium hover:border-primary hover:text-primary hover:bg-white dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Idea
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex gap-6 overflow-x-auto pb-4">
      <KanbanColumn
        title="Ideas"
        count={categorizedPosts.ideas.length}
        posts={categorizedPosts.ideas}
        color="bg-slate-400"
        columnKey="ideas"
      />
      
      <KanbanColumn
        title="In Progress"
        count={categorizedPosts['in-progress'].length}
        posts={categorizedPosts['in-progress']}
        color="bg-primary"
        columnKey="in-progress"
      />
      
      <KanbanColumn
        title="Under Review"
        count={categorizedPosts.review.length}
        posts={categorizedPosts.review}
        color="bg-amber-500"
        columnKey="review"
      />
      
      <KanbanColumn
        title="Published"
        count={categorizedPosts.published.length}
        posts={categorizedPosts.published}
        color="bg-accent"
        columnKey="published"
      />
    </div>
  )
}
