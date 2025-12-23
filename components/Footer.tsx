import Link from 'next/link'
import { FaFacebook, FaLinkedin, FaInstagram } from 'react-icons/fa'

const Footer = () => {
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
              <li>216 East 45th Street</li>
              <li>New York, NY 10017</li>
              <li>United States</li>
              <li>
                <a href="mailto:rotaractnewyorkcity@gmail.com" className="hover:text-rotaract-pink transition-colors">
                  rotaractnewyorkcity@gmail.com
                </a>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-rotaract-darkpink">Follow Us</h3>
            <div className="flex space-x-4">
              <a
                href="https://www.facebook.com/rotaractnewyorkcity/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 text-2xl text-gray-700 hover:border-rotaract-pink/30 hover:text-rotaract-pink transition-colors"
              >
                <FaFacebook />
              </a>
              <a
                href="https://www.linkedin.com/company/rotaract-at-the-un-nyc/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 text-2xl text-gray-700 hover:border-rotaract-pink/30 hover:text-rotaract-pink transition-colors"
              >
                <FaLinkedin />
              </a>
              <a
                href="http://instagram.com/rotaractnyc"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 text-2xl text-gray-700 hover:border-rotaract-pink/30 hover:text-rotaract-pink transition-colors"
              >
                <FaInstagram />
              </a>
            </div>
            <div className="mt-6">
              <p className="text-sm text-gray-600">
                Weekly Meetings:<br />
                <span className="text-rotaract-darkpink font-semibold">Thursday 7PM - 8PM</span>
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 mt-10 pt-8 text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} Rotaract Club at the United Nations. All rights reserved.</p>
          <p className="mt-2 text-gray-500">Sponsored by The Rotary Club of New York</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
