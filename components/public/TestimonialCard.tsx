import Card from '@/components/ui/Card';

interface TestimonialCardProps {
  quote: string;
  name: string;
  title: string;
  photoURL?: string;
}

export default function TestimonialCard({ quote, name, title, photoURL }: TestimonialCardProps) {
  return (
    <Card padding="lg" className="relative">
      {/* Decorative quote mark */}
      <span className="absolute top-4 left-6 text-6xl font-serif text-cranberry-200 dark:text-cranberry-900/40 leading-none select-none">
        &ldquo;
      </span>

      <div className="relative">
        <p className="text-gray-700 dark:text-gray-300 italic leading-relaxed pl-4">
          {quote}
        </p>

        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          {photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoURL}
              alt={name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-gray-800"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-cranberry-100 dark:bg-cranberry-900/40 flex items-center justify-center text-sm font-semibold text-cranberry-700 dark:text-cranberry-300">
              {(name || '')
                .split(' ')
                .map((w) => w[0])
                .filter(Boolean)
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
