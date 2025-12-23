import Link from 'next/link'

export default function DonateNowPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative pt-32 pb-14 overflow-hidden bg-white">
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-rotaract-pink/10 blur-3xl" />
        <div className="absolute -bottom-56 -left-56 h-[640px] w-[640px] rounded-full bg-rotaract-darkpink/10 blur-3xl" />

        <div className="container mx-auto px-4 relative max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-rotaract-darkpink tracking-tight">
            Donate Now
          </h1>
          <p className="mt-4 text-lg text-gray-700 leading-relaxed max-w-3xl">
            Donations help fund service projects, community initiatives, and member programming.
            To keep giving simple and secure, we coordinate donations directly—email us and we’ll share the best way to contribute.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <a
              href="mailto:rotaractnewyorkcity@gmail.com?subject=Donation%20Inquiry"
              className="inline-flex justify-center rounded-lg bg-rotaract-pink px-6 py-3 font-semibold text-white hover:bg-rotaract-darkpink transition-colors"
            >
              Email Us About Donating
            </a>
            <Link
              href="/contact-us"
              className="inline-flex justify-center rounded-lg border border-rotaract-pink/30 bg-white px-6 py-3 font-semibold text-rotaract-pink hover:bg-rotaract-pink/5 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Why donate */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-rotaract-darkpink">Where your support goes</h2>
            <p className="mt-3 text-lg text-gray-700 max-w-3xl">
              We focus on practical community impact, member development, and collaboration—locally and globally.
            </p>

            <div className="mt-10 grid md:grid-cols-3 gap-6">
              {[
                {
                  title: 'Service Projects',
                  description:
                    'Supplies, logistics, and partnerships that help us show up consistently for community needs.',
                },
                {
                  title: 'Events & Programming',
                  description:
                    'Meeting support, speakers, and materials that keep our member experience high quality and welcoming.',
                },
                {
                  title: 'Club Operations',
                  description:
                    'Tools and basics that help us coordinate projects, communicate effectively, and stay organized.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-gray-100 bg-white p-7 shadow-lg">
                  <h3 className="text-xl font-bold text-rotaract-darkpink">{item.title}</h3>
                  <p className="mt-3 text-gray-700 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-2xl border border-rotaract-pink/15 bg-rotaract-pink/5 p-7">
              <h3 className="text-xl font-bold text-rotaract-darkpink">Prefer to donate in-kind?</h3>
              <p className="mt-2 text-gray-700">
                We can often accept specific items for drives and projects. Email us what you’d like to contribute and we’ll confirm what’s most helpful right now.
              </p>
              <div className="mt-5">
                <a
                  href="mailto:rotaractnewyorkcity@gmail.com?subject=In-kind%20Donation%20Inquiry"
                  className="inline-flex rounded-lg bg-white px-5 py-2.5 font-semibold text-rotaract-pink border border-rotaract-pink/30 hover:bg-rotaract-pink/5 transition-colors"
                >
                  Email About In-kind Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
