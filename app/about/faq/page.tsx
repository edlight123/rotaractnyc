'use client'

import { motion } from 'framer-motion'
import { FaQuestionCircle } from 'react-icons/fa'

export default function FAQPage() {
  const faqs = [
    {
      question: 'What is Rotaract?',
      answer: 'Rotaract is a Rotary-sponsored service club for young men and women ages 18 to 30. Rotaract clubs are either community or university based, and they\'re sponsored by a local Rotary club. This makes them true partners in service and creates a special mentoring relationship.'
    },
    {
      question: 'How much does membership cost?',
      answer: 'Membership dues vary by year. Please contact us for current membership fee information. Dues help cover meeting costs, materials, and club activities.'
    },
    {
      question: 'When and where do you meet?',
      answer: 'We typically meet twice a month in Manhattan. Meeting locations and times are posted on our events page. Members receive email notifications about all meetings and events.'
    },
    {
      question: 'Do I need to attend every meeting?',
      answer: 'While regular attendance is encouraged, we understand members have busy schedules. We ask that members make an effort to attend meetings when possible and participate in at least one service project per year.'
    },
    {
      question: 'What kind of service projects does the club do?',
      answer: 'Our projects range from local community service to international initiatives. Past projects have included food drives, environmental cleanups, fundraising for global causes, and educational programs.'
    },
    {
      question: 'Can I join if I don\'t live in New York City?',
      answer: 'While we prefer members who can regularly attend in-person meetings in NYC, we may accommodate members from nearby areas. Contact us to discuss your situation.'
    },
    {
      question: 'What is the connection to the United Nations?',
      answer: 'Our club has special access to UN events and programs through our sponsoring Rotary club\'s relationship with the United Nations. This provides unique opportunities for members to engage with international issues.'
    },
    {
      question: 'How can I get involved in leadership?',
      answer: 'We encourage all members to take on leadership roles. Board positions are elected annually, and there are many committee chair positions available throughout the year. Express your interest to current board members.'
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
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-rotaract-darkpink tracking-tight">Frequently Asked Questions</h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto text-gray-700">
              Find answers to common questions about our club
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ List */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start space-x-4">
                  <FaQuestionCircle className="text-rotaract-pink text-2xl flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold mb-3 text-rotaract-darkpink">{faq.question}</h3>
                    <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Still Have Questions */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-rotaract-darkpink">Still Have Questions?</h2>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            We're here to help! Reach out to us and we'll be happy to answer any other questions you may have.
          </p>
          <a
            href="/contact"
            className="inline-block bg-white text-rotaract-pink font-semibold px-8 py-3 rounded-full border-2 border-rotaract-pink hover:bg-rotaract-pink hover:text-white transition-all"
          >
            Contact Us
          </a>
        </div>
      </section>
    </div>
  )
}
