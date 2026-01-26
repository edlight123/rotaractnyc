import Link from 'next/link'

export default function RotaractDayOfUnityPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-background-dark">
      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary-800"></div>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.4\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }}></div>

        <div className="container mx-auto px-4 relative z-10 max-w-5xl">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-6">
            <span className="material-symbols-outlined text-accent text-sm">diversity_3</span>
            <span className="text-white/90 text-sm font-semibold">Global Service Day</span>
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight">Rotaract Day of Unity</h1>
          <p className="mt-6 text-xl text-white/80 leading-relaxed max-w-3xl">
            A day to show up for community—with service, solidarity, and shared action.
            This page is structured to match the live-site route and can be updated with exact program details.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/events"
              className="inline-flex items-center justify-center gap-2 h-14 px-8 bg-white text-primary font-bold rounded-full transition-all hover:bg-accent hover:text-white hover:scale-105 shadow-xl"
            >
              See Events
            </Link>
            <Link
              href="/donate-now"
              className="inline-flex items-center justify-center gap-2 h-14 px-8 border-2 border-white/30 text-white font-bold rounded-full transition-all hover:bg-white/10"
            >
              Donate
            </Link>
          </div>
        </div>
      </section>

      {/* How to participate */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">How to participate</h2>
            <p className="mt-3 text-lg text-gray-600 dark:text-gray-300 max-w-3xl">
              Join an event, volunteer your time, amplify the message, or support projects directly.
            </p>

            <div className="mt-10 grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: 'handshake',
                  title: 'Volunteer',
                  description:
                    'Attend a service activity with members and make an impact alongside a supportive community.',
                },
                {
                  icon: 'groups',
                  title: 'Partner',
                  description:
                    'Organizations and community groups can collaborate with us on a specific need or initiative.',
                },
                {
                  icon: 'favorite',
                  title: 'Support',
                  description:
                    'Help fund supplies and logistics that turn planning into real-world action.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-gray-100 dark:border-zinc-700 bg-white dark:bg-surface-dark p-7 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-primary text-2xl">{item.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{item.title}</h3>
                  <p className="mt-3 text-gray-600 dark:text-gray-300 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-2xl bg-primary p-8 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.4\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }}></div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-white">Questions or want to get involved?</h3>
                <p className="mt-2 text-white/80">
                  Send us a note and we&apos;ll connect you to the right meeting or upcoming opportunity.
                </p>
                <div className="mt-5 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 h-12 px-6 bg-white text-primary font-bold rounded-full transition-all hover:bg-accent hover:text-white"
                  >
                    Contact Us
                  </Link>
                  <Link
                    href="/mission"
                    className="inline-flex items-center justify-center gap-2 h-12 px-6 border-2 border-white/30 text-white font-bold rounded-full transition-all hover:bg-white/10"
                  >
                    Our Mission
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
