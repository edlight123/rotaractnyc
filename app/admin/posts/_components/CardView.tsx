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

type CardViewProps = {
  posts: Post[]
  onEdit: (slug: string) => void
  onDelete: (slug: string) => void
  onCreate: () => void
}

export function CardView({ posts, onEdit, onDelete, onCreate }: CardViewProps) {
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  const getStatusBadge = (published: boolean) => {
    if (published) {
      return (
        <span className="absolute top-4 right-4 bg-green-500/90 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm shadow-sm flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
          Published
        </span>
      )
    }
    return (
      <span className="absolute top-4 right-4 bg-gray-800/80 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm shadow-sm flex items-center gap-1">
        <span className="material-symbols-outlined text-[14px]">edit_note</span>
        Draft
      </span>
    )
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      'Events': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-300' },
      'News': { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-800 dark:text-cyan-300' },
      'Club News': { bg: 'bg-primary/10', text: 'text-primary dark:text-sky-400' },
      'Community Service': { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-600 dark:text-teal-400' },
      'Fundraising': { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400' },
      'Social': { bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-600 dark:text-pink-400' },
      'Professional Development': { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' },
    }
    return colors[category] || { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-700 dark:text-slate-300' }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {posts.map((post) => {
        const colors = getCategoryColor(post.category)
        return (
          <article
            key={post.slug}
            onClick={() => onEdit(post.slug)}
            className="group relative flex flex-col bg-white dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
          >
            {/* Image Container with Placeholder */}
            <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-6xl text-primary/30">article</span>
              </div>
              
              {/* Status Badge */}
              {getStatusBadge(post.published)}
              
              {/* Hover Overlay Actions */}
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(post.slug)
                  }}
                  className="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-primary/80 transition-colors shadow-lg transform hover:scale-110"
                  title="Edit"
                >
                  <span className="material-symbols-outlined text-[20px]">edit</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(post.slug)
                  }}
                  className="bg-red-50 text-red-600 w-10 h-10 rounded-full flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors shadow-lg"
                  title="Delete"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                  {post.category}
                </span>
                <span className="text-xs text-slate-400 font-medium">• {formatDate(post.date)}</span>
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 leading-tight group-hover:text-primary transition-colors line-clamp-2">
                {post.title}
              </h3>
              
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                {post.excerpt}
              </p>

              {/* Footer Meta */}
              <div className="mt-auto flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
                    {getInitials(post.author)}
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                    {post.author}
                  </span>
                </div>
              </div>
            </div>
          </article>
        )
      })}

      {/* New Post Placeholder */}
      <button
        onClick={onCreate}
        className="group flex flex-col items-center justify-center min-h-[380px] rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200"
      >
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
          <span className="material-symbols-outlined text-slate-400 group-hover:text-primary text-[32px] transition-colors">
            add
          </span>
        </div>
        <span className="text-lg font-bold text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors">
          Create New Post
        </span>
        <span className="text-sm text-slate-400 mt-1">Start writing something new</span>
      </button>
    </div>
  )
}
