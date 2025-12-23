import Link from 'next/link'

export default function Archive20212022Page() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative pt-32 pb-14 overflow-hidden bg-white">
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-rotaract-pink/10 blur-3xl" />
        <div className="absolute -bottom-56 -left-56 h-[640px] w-[640px] rounded-full bg-rotaract-darkpink/10 blur-3xl" />

        <div className="container mx-auto px-4 relative max-w-5xl">
          <h1 className="text-4xl md:text-5xl font-bold text-rotaract-darkpink tracking-tight">2021–2022</h1>
          <p className="mt-4 text-lg text-gray-700 leading-relaxed max-w-3xl">
            A year-in-review snapshot of our service, fellowship, and leadership development.
            This archive is designed to match the live-site structure and can be expanded with photos and detailed recaps.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/20212022-annual-reception"
              className="inline-flex justify-center rounded-lg bg-rotaract-pink px-6 py-3 font-semibold text-white hover:bg-rotaract-darkpink transition-colors"
            >
              View Annual Reception
            </Link>
            <Link
              href="/gallery"
              className="inline-flex justify-center rounded-lg border border-rotaract-pink/30 bg-white px-6 py-3 font-semibold text-rotaract-pink hover:bg-rotaract-pink/5 transition-colors"
            >
              Browse Gallery
            </Link>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-rotaract-darkpink">Highlights</h2>
              <p className="mt-3 text-gray-700 leading-relaxed">
                This section summarizes the year. If you share the exact items from the original archive page, we’ll mirror them here.
              </p>

              <div className="mt-8 grid sm:grid-cols-2 gap-6">
                {[
                  {
                    title: 'Service & Impact',
                    description: 'Community initiatives and partnerships that translate ideas into measurable help.',
                  },
                  {
                    title: 'Member Engagement',
                    description: 'Fellowship, recruitment, and consistent participation that keeps the club vibrant.',
                  },
                  {
                    title: 'Leadership Growth',
                    description: 'Opportunities to lead projects, coordinate teams, and build professional skills.',
                  },
                  {
                    title: 'Global Perspective',
                    description: 'Programming that connects local action with global awareness and collaboration.',
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl bg-gray-50 p-6">
                    <h3 className="text-lg font-bold text-rotaract-darkpink">{item.title}</h3>
                    <p className="mt-2 text-gray-700">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-rotaract-darkpink">Related</h2>
              <p className="mt-3 text-gray-700">
                Looking for a specific highlight or photo set? We can expand this archive with exact captions and images.
              </p>

              <div className="mt-6 space-y-3">
                <Link
                  href="/20212022-annual-reception"
                  className="inline-flex w-full justify-center rounded-lg bg-rotaract-pink px-6 py-3 font-semibold text-white hover:bg-rotaract-darkpink transition-colors"
                >
                  Annual Reception
                </Link>
                <Link
                  href="/contact-us"
                  className="inline-flex w-full justify-center rounded-lg border border-rotaract-pink/30 bg-white px-6 py-3 font-semibold text-rotaract-pink hover:bg-rotaract-pink/5 transition-colors"
                >
                  Request a Specific Update
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
