import Link from 'next/link'
import Image from 'next/image'
import { generatePageMetadata } from '@/lib/metadata'
import type { Metadata } from 'next'

export const metadata: Metadata = generatePageMetadata({
  title: 'Member Benefits',
  description: 'Discover exclusive benefits and resources available to Rotaract NYC members through our member portal.',
  path: '/member-benefits',
})

export default function MemberBenefitsPage() {
  const benefits = [
    {
      icon: 'groups',
      title: 'Exclusive Member Directory',
      description: 'Connect with fellow Rotaractors, find mentors, and build your professional network.',
      features: ['Contact information', 'Professional profiles', 'Committee assignments', 'LinkedIn connections'],
    },
    {
      icon: 'event',
      title: 'Priority Event Access',
      description: 'Get early access to events, workshops, and exclusive member-only gatherings.',
      features: ['RSVP system', 'Calendar integration', 'Event reminders', 'Special member events'],
    },
    {
      icon: 'campaign',
      title: 'Member Announcements',
      description: 'Stay informed with important club updates, opportunities, and achievements.',
      features: ['Real-time notifications', 'Pinned announcements', 'Member spotlights', 'Committee updates'],
    },
    {
      icon: 'folder_open',
      title: 'Resource Library',
      description: 'Access meeting minutes, documents, service guidelines, and club resources.',
      features: ['Meeting minutes', 'Service project guides', 'Templates & forms', 'Historical documents'],
    },
    {
      icon: 'account_balance',
      title: 'Financial Transparency',
      description: 'Board and treasurer members can view detailed financial reports and transactions.',
      features: ['Monthly summaries', 'Transaction history', 'Budget tracking', 'Expense reports'],
    },
    {
      icon: 'workspace_premium',
      title: 'Leadership Opportunities',
      description: 'Access exclusive leadership roles, committee positions, and skill-building workshops.',
      features: ['Committee leadership', 'Project management', 'Public speaking', 'Event planning'],
    },
  ]

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Service Committee Chair',
      quote: 'The member portal has transformed how we collaborate. Having all our resources and member directory in one place makes organizing service projects so much easier.',
      image: 'https://images.unsplash.com/photo-1494790108755-2616b612b789?w=100&h=100&fit=crop&crop=face',
    },
    {
      name: 'Marcus Johnson',
      role: 'Treasurer',
      quote: 'The financial transparency features help me keep our members informed about our impact. The automated reports save hours of work each month.',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    },
    {
      name: 'Elena Rodriguez',
      role: 'Membership Chair',
      quote: 'New members love how easy it is to connect with others through the directory. It really helps build that sense of community from day one.',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    },
  ]

  return (
    <div className="bg-background-light dark:bg-background-dark">
      {/* Hero Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/20">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 mb-6">
            <span className="material-symbols-outlined text-primary text-lg">workspace_premium</span>
            <span className="text-primary text-sm font-bold uppercase tracking-widest">Member Exclusive</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-black text-text-main dark:text-white mb-6 tracking-tight">
            Unlock Your
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Member Benefits
            </span>
          </h1>
          
          <p className="text-xl text-text-muted dark:text-gray-300 max-w-3xl mx-auto mb-8 leading-relaxed">
            Access exclusive resources, connect with fellow Rotaractors, and make the most of your membership through our comprehensive member portal.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/portal/login"
              className="px-8 py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">login</span>
              Access Member Portal
            </Link>
            <Link
              href="/membership-requirements"
              className="px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 text-text-main dark:text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">person_add</span>
              Become a Member
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-text-main dark:text-white mb-4">
              Everything You Need as a Member
            </h2>
            <p className="text-lg text-text-muted dark:text-gray-400 max-w-2xl mx-auto">
              Our member portal provides comprehensive tools and resources to enhance your Rotaract experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 group"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <span className="material-symbols-outlined text-primary text-3xl">{benefit.icon}</span>
                </div>
                
                <h3 className="text-xl font-bold text-text-main dark:text-white mb-3">
                  {benefit.title}
                </h3>
                
                <p className="text-text-muted dark:text-gray-400 mb-4 leading-relaxed">
                  {benefit.description}
                </p>
                
                <ul className="space-y-2">
                  {benefit.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-text-muted dark:text-gray-400">
                      <span className="material-symbols-outlined text-accent text-lg">check_circle</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="py-24 px-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-text-main dark:text-white mb-6">
                Built for Modern Rotaractors
              </h2>
              <p className="text-lg text-text-muted dark:text-gray-400 mb-8 leading-relaxed">
                Our member portal is designed with busy young professionals in mind. Access everything you need on any device, anywhere, anytime.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-accent">mobile_friendly</span>
                  <span className="font-medium text-text-main dark:text-white">Mobile-optimized design</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-accent">notifications</span>
                  <span className="font-medium text-text-main dark:text-white">Real-time notifications</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-accent">security</span>
                  <span className="font-medium text-text-main dark:text-white">Secure Google sign-in</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-accent">sync</span>
                  <span className="font-medium text-text-main dark:text-white">Always up-to-date information</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl transform rotate-3"></div>
              <Image
                src="/portal-screenshot.jpg"
                alt="Rotaract NYC Member Portal Interface"
                width={600}
                height={400}
                className="relative rounded-xl shadow-2xl w-full"
                style={{ objectFit: 'cover' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-text-main dark:text-white mb-4">
              What Our Members Say
            </h2>
            <p className="text-lg text-text-muted dark:text-gray-400">
              Hear from active members about how the portal enhances their Rotaract experience.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-4 mb-6">
                  <Image
                    src={testimonial.image}
                    alt={testimonial.name}
                    width={60}
                    height={60}
                    className="rounded-full"
                  />
                  <div>
                    <h4 className="font-bold text-text-main dark:text-white">{testimonial.name}</h4>
                    <p className="text-sm text-accent">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-text-muted dark:text-gray-400 italic">
                  "{testimonial.quote}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-r from-primary to-primary-hover">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Experience the Benefits?
          </h2>
          <p className="text-xl text-white/90 mb-8 leading-relaxed">
            Join Rotaract NYC today and unlock access to our exclusive member portal and community.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/membership-requirements"
              className="px-8 py-4 bg-white text-primary hover:bg-gray-100 font-bold rounded-lg transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">how_to_reg</span>
              Start Your Application
            </Link>
            <Link
              href="/portal/login"
              className="px-8 py-4 bg-transparent border-2 border-white text-white hover:bg-white/10 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">login</span>
              Member Login
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}