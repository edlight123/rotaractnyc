'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { FaEnvelope, FaInstagram, FaLinkedin, FaMapMarkerAlt, FaFacebook, FaArrowRight, FaClock } from 'react-icons/fa'
import { useState, useRef } from 'react'

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export default function ContactPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  })
  
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  
  // Newsletter state
  const [newsletterLoading, setNewsletterLoading] = useState(false)
  const [newsletterSuccess, setNewsletterSuccess] = useState(false)

  // Social links data
  const socialLinks = [
    {
      name: 'Instagram',
      icon: FaInstagram,
      url: 'http://instagram.com/rotaractnyc',
      handle: '@rotaractnyc',
      color: 'hover:text-pink-500',
      bgColor: 'hover:bg-pink-500/10'
    },
    {
      name: 'LinkedIn',
      icon: FaLinkedin,
      url: 'https://www.linkedin.com/company/rotaract-at-the-un-nyc/',
      handle: 'Rotaract at the UN',
      color: 'hover:text-blue-600',
      bgColor: 'hover:bg-blue-600/10'
    },
    {
      name: 'Facebook',
      icon: FaFacebook,
      url: 'https://www.facebook.com/rotaractnewyorkcity/',
      handle: 'Rotaract NYC',
      color: 'hover:text-blue-500',
      bgColor: 'hover:bg-blue-500/10'
    },
  ]

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const form = new FormData(e.currentTarget)
    const topic = String(form.get('topic') || '')
    const subject = String(form.get('subject') || '')

    const payload = {
      name: String(form.get('name') || ''),
      email: String(form.get('email') || ''),
      subject: subject || topic || 'Contact Form',
      message: String(form.get('message') || ''),
    }

    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        setError('Unable to send your message. Please try again.')
        return
      }

      e.currentTarget.reset()
      setSuccess(true)
    } catch {
      setError('Unable to send your message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleNewsletterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setNewsletterLoading(true)
    
    // Simulate newsletter signup - in production, this would call an API
    await new Promise(resolve => setTimeout(resolve, 1000))
    setNewsletterSuccess(true)
    setNewsletterLoading(false)
  }

  return (
    <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 min-h-screen">
      {/* Premium Hero Section */}
      <section ref={heroRef} className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
          <motion.div 
            className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-1/4 left-1/4 w-80 h-80 rounded-full bg-amber-500/5 blur-3xl"
            animate={{ 
              scale: [1.2, 1, 1.2],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          />
        </div>

        {/* Decorative grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:64px_64px]" />
        
        <motion.div 
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="container mx-auto px-4 relative z-10 text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 text-primary dark:text-primary-300 text-sm font-medium mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            We&apos;d love to hear from you
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
          >
            <span className="bg-gradient-to-r from-gray-900 via-primary to-gray-900 dark:from-white dark:via-primary-300 dark:to-white bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              Get in Touch
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed"
          >
            Reach out about membership, volunteering, partnerships, or upcoming events. 
            We&apos;re here to help you make a difference.
          </motion.p>

          {/* Small Social Icons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-6 flex items-center justify-center gap-3"
          >
            {socialLinks.map((social) => {
              const IconComponent = social.icon
              return (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group flex items-center justify-center w-11 h-11 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 transition-all duration-300 hover:scale-110 hover:shadow-lg ${social.color} ${social.bgColor}`}
                  title={social.name}
                >
                  <IconComponent className="text-lg" />
                </a>
              )
            })}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            <a 
              href="#contact-form" 
              className="group inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-600 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5"
            >
              Send a Message
              <FaArrowRight className="group-hover:translate-x-1 transition-transform text-sm" />
            </a>
            <a 
              href="#location" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:-translate-y-0.5"
            >
              <FaMapMarkerAlt className="text-primary" />
              Visit Us
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* Quick Contact Cards */}
      <section className="py-12 relative">
        <div className="container mx-auto px-4">
          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Email Card */}
            <motion.a
              href="mailto:rotaractnewyorkcity@gmail.com"
              variants={fadeInUp}
              whileHover={{ y: -4, transition: { duration: 0.3 } }}
              className="group relative overflow-hidden rounded-2xl p-6 bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 shadow-md hover:shadow-xl transition-all duration-500"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center mb-4 shadow-md shadow-primary/25">
                  <FaEnvelope className="text-xl text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Email Us</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">Send us an email anytime</p>
                <span className="inline-flex items-center gap-2 text-primary font-medium text-sm group-hover:gap-3 transition-all">
                  rotaractnewyorkcity@gmail.com
                  <FaArrowRight className="text-xs" />
                </span>
              </div>
            </motion.a>

            {/* Location Card */}
            <motion.a
              href="#location"
              variants={fadeInUp}
              whileHover={{ y: -4, transition: { duration: 0.3 } }}
              className="group relative overflow-hidden rounded-2xl p-6 bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 shadow-md hover:shadow-xl transition-all duration-500"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mb-4 shadow-md shadow-amber-500/25">
                  <FaMapMarkerAlt className="text-xl text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Visit Us</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">Join our weekly meetings</p>
                <span className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-500 font-medium text-sm group-hover:gap-3 transition-all">
                  216 E 45th St, NYC
                  <FaArrowRight className="text-xs" />
                </span>
              </div>
            </motion.a>

            {/* Meeting Times Card */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -4, transition: { duration: 0.3 } }}
              className="group relative overflow-hidden rounded-2xl p-6 bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 shadow-md hover:shadow-xl transition-all duration-500"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-4 shadow-md shadow-emerald-500/25">
                  <FaClock className="text-xl text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Meeting Times</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">Every 2nd & 4th Thursday</p>
                <span className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-500 font-medium text-sm">
                  7:00 – 9:00 PM EST
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact-form" className="py-16 relative">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Left Column - Info */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:sticky lg:top-24"
            >
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-300 text-sm font-semibold mb-4">
                Send a Message
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                Have a Question?<br />
                <span className="text-primary">We&apos;re Here to Help</span>
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                Whether you&apos;re interested in joining, have questions about volunteering, 
                or want to explore partnerships, we&apos;d love to hear from you.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                    <FaClock className="text-lg text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Quick Response</h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">We respond within 24-48 hours</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                    <FaEnvelope className="text-lg text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Direct Support</h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">rotaractnewyorkcity@gmail.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                    <FaMapMarkerAlt className="text-lg text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">In-Person Meetings</h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Every 2nd & 4th Thursday, 7-9 PM</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <form 
                className="relative bg-white dark:bg-gray-800/50 rounded-2xl p-6 md:p-8 shadow-lg border border-gray-100 dark:border-gray-700/50"
                onSubmit={handleSubmit}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center gap-2 text-sm"
                  >
                    <span className="material-symbols-outlined text-base">error</span>
                    {error}
                  </motion.div>
                )}

                {success && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-xl flex items-center gap-2 text-sm"
                  >
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    Message sent successfully! We&apos;ll be in touch soon.
                  </motion.div>
                )}

                <div className="space-y-4 relative">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="name" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        placeholder="Jane Doe"
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField(null)}
                        className={`w-full bg-gray-50 dark:bg-gray-900/50 border-2 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none transition-all duration-300 ${
                          focusedField === 'name' 
                            ? 'border-primary ring-2 ring-primary/10' 
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        placeholder="jane@example.com"
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        className={`w-full bg-gray-50 dark:bg-gray-900/50 border-2 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none transition-all duration-300 ${
                          focusedField === 'email' 
                            ? 'border-primary ring-2 ring-primary/10' 
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="topic" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      How can we help?
                    </label>
                    <select
                      id="topic"
                      name="topic"
                      onFocus={() => setFocusedField('topic')}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full bg-gray-50 dark:bg-gray-900/50 border-2 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none transition-all duration-300 ${
                        focusedField === 'topic' 
                          ? 'border-primary ring-2 ring-primary/10' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      defaultValue="Membership Inquiry"
                    >
                      <option>Membership Inquiry</option>
                      <option>Volunteering Opportunities</option>
                      <option>Guest Speaker Proposal</option>
                      <option>Partnerships & Sponsorships</option>
                      <option>Press & Media</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <input type="hidden" name="subject" value="" />

                  <div className="space-y-1.5">
                    <label htmlFor="message" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Your Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={4}
                      placeholder="Tell us more about how we can help you..."
                      onFocus={() => setFocusedField('message')}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full bg-gray-50 dark:bg-gray-900/50 border-2 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none transition-all duration-300 resize-none ${
                        focusedField === 'message' 
                          ? 'border-primary ring-2 ring-primary/10' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-lg py-3 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-primary/25 hover:shadow-lg hover:-translate-y-0.5"
                  >
                    {loading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg">send</span>
                        Send Message
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary-600 to-primary-800" />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <motion.div 
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-white/10 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div 
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-white/10 blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, delay: 4 }}
        />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium mb-6">
                <FaEnvelope className="text-sm" />
                Stay in the Loop
              </div>

              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Subscribe to Our Newsletter
              </h2>
              <p className="text-lg text-white/80">
                Get monthly updates about events, service projects, and club news.
              </p>
            </div>

            {newsletterSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20"
              >
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-emerald-300 text-3xl">check_circle</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">You&apos;re Subscribed!</h3>
                <p className="text-white/70">
                  Thank you for subscribing. Check your inbox for a confirmation email.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-white/20">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="text-sm font-semibold text-white/90">
                      First Name <span className="text-red-300">*</span>
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      required
                      placeholder="John"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/10 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="text-sm font-semibold text-white/90">
                      Last Name <span className="text-red-300">*</span>
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      required
                      placeholder="Doe"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/10 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <label htmlFor="newsletterEmail" className="text-sm font-semibold text-white/90">
                    Email Address <span className="text-red-300">*</span>
                  </label>
                  <input
                    type="email"
                    id="newsletterEmail"
                    name="newsletterEmail"
                    required
                    placeholder="your.email@example.com"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/10 transition-all"
                  />
                </div>

                <div className="flex items-start gap-3 mb-6">
                  <input
                    type="checkbox"
                    id="consent"
                    name="consent"
                    required
                    className="mt-1 w-5 h-5 rounded border-white/30 bg-white/10 text-primary focus:ring-white/20"
                  />
                  <label htmlFor="consent" className="text-sm text-white/70">
                    I agree to receive email communications from Rotaract NYC. I can unsubscribe at any time.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={newsletterLoading}
                  className="w-full bg-white text-primary font-semibold rounded-xl py-4 transition-all duration-300 hover:bg-gray-100 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  {newsletterLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                      Subscribing...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">mail</span>
                      Subscribe Now
                    </>
                  )}
                </button>

                <p className="text-white/50 text-xs text-center mt-4">
                  Note: Please email <a href="mailto:rotaractnewyorkcity@gmail.com" className="text-white/70 underline hover:text-white">rotaractnewyorkcity@gmail.com</a> to be added to our mailing list.
                </p>
              </form>
            )}

            {/* What you'll get */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: 'event', text: 'Event updates' },
                { icon: 'volunteer_activism', text: 'Service projects' },
                { icon: 'groups', text: 'Member spotlights' },
                { icon: 'auto_awesome', text: 'Exclusive content' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2 text-sm text-white/70 bg-white/5 rounded-lg px-3 py-2">
                  <span className="material-symbols-outlined text-white/80 text-lg">{item.icon}</span>
                  {item.text}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Location Section */}
      <section id="location" className="py-16 relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-300 text-sm font-semibold mb-4">
              Our Location
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Visit Us in Person
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Join us at our weekly meetings in the heart of Manhattan
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Map Background */}
            <div className="relative h-[400px] w-full">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: "url('/ce9ea973f79cb6988ad3e2945e3a87ae.jpg')" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/50 to-gray-900/30" />
              
              {/* Location Card */}
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-2xl max-w-lg w-full border border-white/50"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center shadow-lg shadow-primary/25">
                      <FaMapMarkerAlt className="text-2xl text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Weekly Meetings</h3>
                      <p className="text-primary font-semibold">Every 2nd & 4th Thursday</p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-3">
                      <FaMapMarkerAlt className="text-primary mt-1 shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">Address</p>
                        <p className="text-gray-600 dark:text-gray-400">216 East 45th Street<br />New York, NY 10017</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <FaClock className="text-primary mt-1 shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">Time</p>
                        <p className="text-gray-600 dark:text-gray-400">7:00 PM – 9:00 PM EST</p>
                      </div>
                    </div>
                  </div>

                  <a
                    href="https://www.google.com/maps/search/?api=1&query=216+East+45th+Street,+New+York,+NY+10017"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-primary to-primary-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
                  >
                    <FaMapMarkerAlt />
                    Get Directions
                    <FaArrowRight className="text-sm" />
                  </a>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
