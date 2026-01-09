import Link from 'next/link'
import { FaFacebook, FaLinkedin, FaInstagram } from 'react-icons/fa'
import { DEFAULT_SETTINGS } from '@/lib/content/settings'
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin'

async function getSettings() {
  if (!isFirebaseAdminConfigured()) return DEFAULT_SETTINGS

  try {
    const doc = await getFirebaseAdminDb().collection('settings').doc('site').get()
    if (!doc.exists) return DEFAULT_SETTINGS

    const data: unknown = doc.data()
    const obj = typeof data === 'object' && data ? (data as Record<string, unknown>) : {}

    const addressLinesRaw = obj.addressLines
    const addressLines = Array.isArray(addressLinesRaw)
      ? addressLinesRaw.map((x) => String(x)).filter(Boolean)
      : DEFAULT_SETTINGS.addressLines

    return {
      contactEmail: String(obj.contactEmail ?? DEFAULT_SETTINGS.contactEmail),
      addressLines,
      facebookUrl: String(obj.facebookUrl ?? DEFAULT_SETTINGS.facebookUrl),
      instagramUrl: String(obj.instagramUrl ?? DEFAULT_SETTINGS.instagramUrl),
      linkedinUrl: String(obj.linkedinUrl ?? DEFAULT_SETTINGS.linkedinUrl),
      meetingLabel: String(obj.meetingLabel ?? DEFAULT_SETTINGS.meetingLabel),
      meetingTime: String(obj.meetingTime ?? DEFAULT_SETTINGS.meetingTime),
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

const Footer = async () => {
  const settings = await getSettings()

  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-rotaract-darkpink">About Us</h3>
            <p className="text-gray-700 leading-relaxed">
              Rotaract Club of New York at the United Nations - Building leadership
              through service and fellowship.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-rotaract-darkpink">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/mission" className="text-gray-700 hover:text-rotaract-pink transition-colors">
                  Mission
                </Link>
              </li>
              <li>
                <Link href="/membership-requirements" className="text-gray-700 hover:text-rotaract-pink transition-colors">
                  Membership
                </Link>
              </li>
              <li>
                <Link href="/events" className="text-gray-700 hover:text-rotaract-pink transition-colors">
                  Events
                </Link>
              </li>
              <li>
                <Link href="/contact-us" className="text-gray-700 hover:text-rotaract-pink transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-rotaract-darkpink">Contact</h3>
            <ul className="space-y-2 text-gray-700">
              {settings.addressLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
              <li>
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="hover:text-rotaract-pink transition-colors"
                >
                  {settings.contactEmail}
                </a>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-rotaract-darkpink">Follow Us</h3>
            <div className="flex space-x-4">
              <a
                href={settings.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 text-2xl text-gray-700 hover:border-rotaract-pink/30 hover:text-rotaract-pink transition-colors"
              >
                <FaFacebook />
              </a>
              <a
                href={settings.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 text-2xl text-gray-700 hover:border-rotaract-pink/30 hover:text-rotaract-pink transition-colors"
              >
                <FaLinkedin />
              </a>
              <a
                href={settings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 text-2xl text-gray-700 hover:border-rotaract-pink/30 hover:text-rotaract-pink transition-colors"
              >
                <FaInstagram />
              </a>
            </div>
            <div className="mt-6">
              <p className="text-sm text-gray-600">
                {settings.meetingLabel}<br />
                <span className="text-rotaract-darkpink font-semibold">{settings.meetingTime}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 mt-10 pt-8 text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} Rotaract Club at the United Nations. All rights reserved.</p>
          <p className="mt-2 text-gray-500">
            Sponsored by{' '}
            <a
              href="https://www.nyrotary.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gray-700 hover:text-rotaract-pink transition-colors"
            >
              The Rotary Club of New York
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
