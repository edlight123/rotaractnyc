import Link from 'next/link'

export default function RotaractDayOfUnityPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative pt-32 pb-14 overflow-hidden bg-white">
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-rotaract-pink/10 blur-3xl" />
        <div className="absolute -bottom-56 -left-56 h-[640px] w-[640px] rounded-full bg-rotaract-darkpink/10 blur-3xl" />

        <div className="container mx-auto px-4 relative max-w-5xl">
          <h1 className="text-4xl md:text-5xl font-bold text-rotaract-darkpink tracking-tight">Rotaract Day of Unity</h1>
          <p className="mt-4 text-lg text-gray-700 leading-relaxed max-w-3xl">
            A day to show up for community—with service, solidarity, and shared action.
            This page is structured to match the live-site route and can be updated with exact program details.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/events"
              className="inline-flex justify-center rounded-lg bg-rotaract-pink px-6 py-3 font-semibold text-white hover:bg-rotaract-darkpink transition-colors"
            >
              See Events
            </Link>
            <Link
              href="/donate-now"
              className="inline-flex justify-center rounded-lg border border-rotaract-pink/30 bg-white px-6 py-3 font-semibold text-rotaract-pink hover:bg-rotaract-pink/5 transition-colors"
            >
              Donate
            </Link>
          </div>
        </div>
      </section>

      {/* How to participate */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-rotaract-darkpink">How to participate</h2>
            <p className="mt-3 text-lg text-gray-700 max-w-3xl">
              Join an event, volunteer your time, amplify the message, or support projects directly.
            </p>

            <div className="mt-10 grid md:grid-cols-3 gap-6">
              {[
                {
                  title: 'Volunteer',
                  description:
                    'Attend a service activity with members and make an impact alongside a supportive community.',
                },
                {
                  title: 'Partner',
                  description:
                    'Organizations and community groups can collaborate with us on a specific need or initiative.',
                },
                {
                  title: 'Support',
                  description:
                    'Help fund supplies and logistics that turn planning into real-world action.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-gray-100 bg-white p-7 shadow-lg">
                  <h3 className="text-xl font-bold text-rotaract-darkpink">{item.title}</h3>
                  <p className="mt-3 text-gray-700 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-2xl border border-gray-100 bg-gray-50 p-8">
              <h3 className="text-xl font-bold text-rotaract-darkpink">Questions or want to get involved?</h3>
              <p className="mt-2 text-gray-700">
                Send us a note and we’ll connect you to the right meeting or upcoming opportunity.
              </p>
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/contact-us"
                  className="inline-flex justify-center rounded-lg bg-rotaract-pink px-6 py-3 font-semibold text-white hover:bg-rotaract-darkpink transition-colors"
                >
                  Contact Us
                </Link>
                <Link
                  href="/mission"
                  className="inline-flex justify-center rounded-lg border border-rotaract-pink/30 bg-white px-6 py-3 font-semibold text-rotaract-pink hover:bg-rotaract-pink/5 transition-colors"
                >
                  Our Mission
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
