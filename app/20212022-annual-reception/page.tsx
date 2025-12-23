import Link from 'next/link'

export default function AnnualReception20212022Page() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative pt-32 pb-14 overflow-hidden bg-white">
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-rotaract-pink/10 blur-3xl" />
        <div className="absolute -bottom-56 -left-56 h-[640px] w-[640px] rounded-full bg-rotaract-darkpink/10 blur-3xl" />

        <div className="container mx-auto px-4 relative max-w-5xl">
          <h1 className="text-4xl md:text-5xl font-bold text-rotaract-darkpink tracking-tight">
            2021–2022 Annual Reception
          </h1>
          <p className="mt-4 text-lg text-gray-700 leading-relaxed max-w-3xl">
            A special reception celebrating the year’s work—service, partnerships, and the members who made it possible.
            This page can be updated with exact venue details, honorees, and photos as needed.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/events"
              className="inline-flex justify-center rounded-lg bg-rotaract-pink px-6 py-3 font-semibold text-white hover:bg-rotaract-darkpink transition-colors"
            >
              View Events
            </Link>
            <Link
              href="/contact-us"
              className="inline-flex justify-center rounded-lg border border-rotaract-pink/30 bg-white px-6 py-3 font-semibold text-rotaract-pink hover:bg-rotaract-pink/5 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Details */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-rotaract-darkpink">What to expect</h2>
              <p className="mt-3 text-gray-700 leading-relaxed">
                The reception is designed to be welcoming and celebratory—an opportunity to connect, reflect on impact, and support what’s next.
              </p>

              <div className="mt-8 grid sm:grid-cols-2 gap-6">
                {[
                  { title: 'Community', description: 'Meet members, friends of the club, and partners who collaborate with us.' },
                  { title: 'Impact', description: 'A recap of initiatives and the outcomes the club is proud of.' },
                  { title: 'Recognition', description: 'A moment to recognize supporters and celebrate leadership.' },
                  { title: 'Momentum', description: 'Support the next chapter of service and programming.' },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl bg-gray-50 p-6">
                    <h3 className="text-lg font-bold text-rotaract-darkpink">{item.title}</h3>
                    <p className="mt-2 text-gray-700">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-rotaract-darkpink">Interested in attending?</h2>
              <p className="mt-3 text-gray-700">
                For invitations, sponsorship, or questions, contact us and we’ll respond with the latest details.
              </p>

              <div className="mt-6 space-y-3">
                <a
                  href="mailto:rotaractnewyorkcity@gmail.com?subject=Annual%20Reception%202021%E2%80%932022%20Inquiry"
                  className="inline-flex w-full justify-center rounded-lg bg-rotaract-pink px-6 py-3 font-semibold text-white hover:bg-rotaract-darkpink transition-colors"
                >
                  Email About the Reception
                </a>
                <Link
                  href="/donate-now"
                  className="inline-flex w-full justify-center rounded-lg border border-rotaract-pink/30 bg-white px-6 py-3 font-semibold text-rotaract-pink hover:bg-rotaract-pink/5 transition-colors"
                >
                  Support Our Work
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
