'use client'

import { motion } from 'framer-motion'
import { FaCalendar, FaUser } from 'react-icons/fa'

export default function NewsPage() {
  const newsArticles = [
    {
      title: 'Successful Holiday Charity Drive',
      date: 'December 15, 2023',
      author: 'Rotaract NYC',
      excerpt: 'Our annual holiday charity drive was a tremendous success, collecting donations for over 50 local families in need. Thank you to all our members and supporters who contributed!',
      category: 'Service Projects'
    },
    {
      title: 'New Board Members Elected',
      date: 'November 30, 2023',
      author: 'Rotaract NYC',
      excerpt: 'We are excited to announce our newly elected board members for the upcoming year. Congratulations to all who were elected and thank you for your commitment to leading our club.',
      category: 'Club News'
    },
    {
      title: 'UN Youth Summit Highlights',
      date: 'November 20, 2023',
      author: 'Rotaract NYC',
      excerpt: 'Members of our club had the privilege of attending the UN Youth Summit, where we engaged with global youth leaders on topics of sustainability, peace, and development.',
      category: 'Events'
    },
    {
      title: 'Central Park Environmental Cleanup',
      date: 'October 28, 2023',
      author: 'Rotaract NYC',
      excerpt: 'Over 20 members participated in our Central Park cleanup initiative, removing trash and helping maintain the beauty of this iconic NYC landmark.',
      category: 'Service Projects'
    },
    {
      title: 'Professional Development Workshop Series',
      date: 'October 15, 2023',
      author: 'Rotaract NYC',
      excerpt: 'Launched our new professional development workshop series focusing on leadership skills, public speaking, and career advancement strategies.',
      category: 'Professional Development'
    },
    {
      title: 'Sister Club Partnership Established',
      date: 'September 30, 2023',
      author: 'Rotaract NYC',
      excerpt: 'We are thrilled to announce a new sister club partnership that will enable collaborative projects and cultural exchange opportunities.',
      category: 'Club News'
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-14 overflow-hidden bg-white">
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-rotaract-pink/10 blur-3xl" />
        <div className="absolute -bottom-56 -left-56 h-[640px] w-[640px] rounded-full bg-rotaract-darkpink/10 blur-3xl" />
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="mx-auto mb-5 inline-flex items-center rounded-full border border-rotaract-pink/20 bg-white px-4 py-1 text-sm text-rotaract-darkpink shadow-sm">
              News
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-rotaract-darkpink tracking-tight">News & Updates</h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto text-gray-700">
              Stay informed about our latest activities, events, and achievements
            </p>
          </motion.div>
        </div>
      </section>

      {/* News Articles */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            {newsArticles.map((article, index) => (
              <motion.article
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <span className="bg-rotaract-pink text-white px-4 py-1 rounded-full text-sm font-semibold">
                    {article.category}
                  </span>
                  <div className="flex items-center text-gray-600 text-sm">
                    <FaCalendar className="mr-2" />
                    <span>{article.date}</span>
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-3 text-rotaract-darkpink hover:text-rotaract-pink transition-colors cursor-pointer">
                  {article.title}
                </h2>
                <div className="flex items-center text-gray-600 text-sm mb-4">
                  <FaUser className="mr-2" />
                  <span>{article.author}</span>
                </div>
                <p className="text-gray-700 leading-relaxed">{article.excerpt}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-6 text-rotaract-darkpink">Stay Updated</h2>
              <p className="text-lg text-gray-700 mb-8">
                Subscribe to our newsletter to receive the latest news and updates directly in your inbox
              </p>
              <a
                href="/contact/newsletter"
                className="inline-block bg-white text-rotaract-pink font-semibold px-8 py-3 rounded-full border-2 border-rotaract-pink hover:bg-rotaract-pink hover:text-white transition-all"
              >
                Subscribe to Newsletter
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Media */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-rotaract-darkpink">Follow Us on Social Media</h2>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Get real-time updates and see what we're up to
          </p>
          <a
            href="/contact/follow"
            className="inline-block bg-white text-rotaract-pink font-semibold px-8 py-3 rounded-full border-2 border-rotaract-pink hover:bg-rotaract-pink hover:text-white transition-all"
          >
            View Social Media Links
          </a>
        </div>
      </section>
    </div>
  )
}
