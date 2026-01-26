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

type TableViewProps = {
  posts: Post[]
  onEdit: (slug: string) => void
  onDelete: (slug: string) => void
}

export function TableView({ posts, onEdit, onDelete }: TableViewProps) {
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
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Published</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
        <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Draft</span>
      </div>
    )
  }

  const getCategoryBadge = (category: string) => {
    const categoryColors: Record<string, { bg: string; text: string }> = {
      'Events': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-300' },
      'News': { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-800 dark:text-cyan-300' },
      'Updates': { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-800 dark:text-slate-300' },
      'Club News': { bg: 'bg-primary/10', text: 'text-primary dark:text-primary' },
      'Community Service': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' },
    }
    const colors = categoryColors[category] || { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300' }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
        {category}
      </span>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20">
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[40%]">
              Post Title
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[15%]">
              Author
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[15%]">
              Category
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[15%]">
              Publish Date
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[10%]">
              Status
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[5%] text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {posts.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                No posts found. Create your first post to get started.
              </td>
            </tr>
          ) : (
            posts.map((post) => (
              <tr 
                key={post.slug} 
                onClick={() => onEdit(post.slug)}
                className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors cursor-pointer">
                      {post.title}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {post.excerpt}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {post.author}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {getCategoryBadge(post.category)}
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {formatDate(post.date)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(post.published)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(post.slug)
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Edit"
                    >
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(post.slug)
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      
      {/* Pagination Footer */}
      {posts.length > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing <span className="font-medium text-slate-900 dark:text-slate-100">1-{posts.length}</span> of{' '}
            <span className="font-medium text-slate-900 dark:text-slate-100">{posts.length}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled
            >
              Previous
            </button>
            <button
              className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm hover:bg-white dark:hover:bg-slate-700 transition-colors"
              disabled
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
