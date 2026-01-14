'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

// Material Symbols Icon Component
const MaterialIcon = ({ icon, className = '', filled = false }: { icon: string; className?: string; filled?: boolean }) => (
  <span className={`material-symbols-outlined ${filled ? 'filled-icon' : ''} ${className}`} style={{ 
    fontVariationSettings: filled ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24"
  }}>
    {icon}
  </span>
)

// Sample sister club data
interface SisterClub {
  id: string
  name: string
  location: string
  country: string
  region: string
  image: string
  latestCollab: string
  collabIcon: string
  isActive?: boolean
  isNew?: boolean
}

const sisterClubs: SisterClub[] = [
  {
    id: '1',
    name: 'Rotaract Club of Berlin',
    location: 'Berlin, Germany',
    country: 'Germany',
    region: 'Europe',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAlVRH59PUAGnaveWQFnVWzj9_9EbUA3S9ELTQREE86jpqzDvYFM5GOiS88MOBMvRmJ5DLH8rfZs9DlicL9gQ2PphDwiVSbWBrCraGCc4DtiRF_AqSSWrL6ycs-WZqA14WYdObzPspiNH-NWG6YS7gla4N7CHBrrXxtvByFTqO28IlT82nByxxQVmR8yxHCtQomEaJuQUKYFswlwVop5Tv7YWKVGROj_xJEl4yMI8_AY32ZZi5ZYW7bE3BPFZqPA7O2aS4th3fwhBY',
    latestCollab: 'Joint Winter Fundraiser 2023',
    collabIcon: 'handshake',
    isActive: true,
  },
  {
    id: '2',
    name: 'Rotaract Club of Tokyo',
    location: 'Tokyo, Japan',
    country: 'Japan',
    region: 'Asia Pacific',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBIS8WZEaGcHIJtvoUHwlrBnNXUUbJhtRYSFoIXdepkyO80qBmchhNPSz22ux3mx8x1XJOVuH-ICFuEij4t4HGJ78vQjW9GbuUZkuTFKIw1fdae2kBxCaaAjaj9Tb2p0WqsPMBkncBVmsqRwCOaepkEeH7ZNm9yo7mswJdsx1GXhl_YCBmfZT1iB6H0Xb4H2-Yy0GeXInLYM2ln5Q9MTtGG1OlDdlZdFopKKzHkSWX9PpEezaIflNDU276ORGd4hgD7XB7DZ5QpV2A',
    latestCollab: 'Sakura Tree Planting Initiative',
    collabIcon: 'forest',
  },
  {
    id: '3',
    name: 'Rotaract Club of São Paulo',
    location: 'São Paulo, Brazil',
    country: 'Brazil',
    region: 'Americas',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqIKGaJFo0B0NjXuI9KAvZpr7Uw_kwKpcWLqfM00osil6GfMV06YuPRt7B1pUDbWdtFvdZ8WfEefBWszXgut9p5C23RWLVAvJvQ_eDPVEDahlsQ9gr6cEzGDemscqErIRMxOmtiBVYaCXuf_bU0qEdzc4qvmXvvW2QBYMDC1UfhSUS8ex7mDZ8QhxIcMYAPAa1_6i8HR4RIdBnz1d7p1C-RbV1SV_zJ3dGvwf4KljVbterOhG_jC8splifnBXvljeVJupX8CNvdUw',
    latestCollab: 'Community Food Drive 2024',
    collabIcon: 'volunteer_activism',
    isNew: true,
  },
  {
    id: '4',
    name: 'Rotaract Club of London',
    location: 'London, United Kingdom',
    country: 'United Kingdom',
    region: 'Europe',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwRlgVj9zZXlRTtXyO856zQn6BJtBunx_eAJKEeI36umdg3gJTZ_NunlHOLBgjsAO3SgLnT9PwypNgrXgTBhkAPLW57Qqx3kmNVkUkh_FB5jHiKXNFP6rf--sVLF-YD4loMGXRHjU9CnIKZ2JD0c_jZ4ufH2IaSk0vK1mCzPDtuRhyZKluk3_ae-rJF1PWY08R8XkWQ4B0kA1-ylYkKaQr2ErRNGT7joNEJioKyzjRItVpnFBwt8PF584yxTn9m-dH7XqpsuLa6BU',
    latestCollab: 'Intl. Peace Conference',
    collabIcon: 'forum',
  },
  {
    id: '5',
    name: 'Rotaract Club of Mumbai',
    location: 'Mumbai, India',
    country: 'India',
    region: 'Asia Pacific',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAvx1sYnBEWjbQLGw48xwK7coj7rT4K3XYv6Ibiv7c252JwG2JD5hezURurJbiHaG8zDGNSgAkIws-c8SHnAOv3pOsmpFYT5Vu5m_eLA2NUfoqo5LRiqI_QvrVeCdyit3SRbclW-2v9SJjiRuFwOftjHaglTnJcwymiOcBv3uGTBH0qbaRaTy1yZbZS7cHel7EgY32CtDk1YGiOwoPKrqQICp35WM6Zv_EWgZP2ZE9hNn_hSEvaLDg9ZtJRzLEbcx2Q_b4PmIRYijY',
    latestCollab: 'Rural Literacy Project',
    collabIcon: 'school',
    isActive: true,
  },
]

export default function SisterClubsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('All Regions')

  const filteredClubs = sisterClubs.filter((club) => {
    const matchesSearch =
      club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      club.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      club.country.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRegion = selectedRegion === 'All Regions' || club.region === selectedRegion
    return matchesSearch && matchesRegion
  })

  const regions = ['All Regions', 'Europe', 'Asia Pacific', 'Americas', 'Africa']

  return (
    <main className="flex-grow">
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />
      
      {/* Hero Section */}
      <div className="relative bg-background-light dark:bg-background-dark pb-12 pt-12 md:pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between mb-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
                <MaterialIcon icon="public" className="text-sm" />
                Global Network
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4">
                Sister Clubs & Partners
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-xl">
                Collaborating across borders to create lasting change. Explore our active relationships and connect with our global family.
              </p>
            </div>
            
            {/* Stats Card */}
            <div className="hidden lg:block relative w-64 h-32 opacity-80">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent rounded-2xl blur-2xl"></div>
              <div className="relative z-10 p-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark rounded-xl shadow-sm flex items-center gap-4">
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full text-primary">
                  <MaterialIcon icon="travel_explore" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">42</div>
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Active Partners</div>
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar: Search & Filter */}
          <div className="sticky top-20 z-40 mt-8 p-1">
            <div className="bg-white dark:bg-surface-dark rounded-xl shadow-soft p-2 md:p-3 flex flex-col md:flex-row gap-3 items-center border border-gray-100 dark:border-gray-700">
              {/* Search */}
              <div className="relative w-full md:w-96 group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MaterialIcon icon="search" className="text-gray-400 group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  className="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary/50 text-sm transition-all"
                  placeholder="Search by club name, city, or project..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Divider */}
              <div className="hidden md:block w-px h-8 bg-gray-200 dark:bg-gray-700 mx-2"></div>

              {/* Filters */}
              <div className="flex flex-1 w-full overflow-x-auto gap-2 pb-1 md:pb-0 scrollbar-hide">
                {regions.map((region) => (
                  <button
                    key={region}
                    onClick={() => setSelectedRegion(region)}
                    className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      selectedRegion === region
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                    }`}
                  >
                    {region}
                  </button>
                ))}
              </div>

              {/* View Toggle */}
              <div className="hidden md:flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button className="p-1.5 rounded-md bg-white dark:bg-gray-600 text-primary shadow-sm">
                  <MaterialIcon icon="grid_view" className="text-[20px]" />
                </button>
                <button className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <MaterialIcon icon="list" className="text-[20px]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {filteredClubs.map((club) => (
            <article
              key={club.id}
              className="group relative flex flex-col bg-surface-light dark:bg-surface-dark rounded-xl overflow-hidden shadow-soft hover:shadow-soft-hover border border-gray-100 dark:border-gray-800 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="relative h-48 overflow-hidden">
                <Image
                  alt={`${club.name} - Group photo`}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  src={club.image}
                  width={800}
                  height={600}
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                
                {/* Active Badge */}
                {club.isActive && (
                  <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/80 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Active</span>
                  </div>
                )}
                
                {/* New Partner Badge */}
                {club.isNew && (
                  <div className="absolute top-4 left-4 bg-[#FFB3A7] text-white px-3 py-1 rounded-full shadow-lg transform -rotate-2">
                    <span className="text-xs font-bold uppercase tracking-wide">New Partner</span>
                  </div>
                )}
              </div>

              <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-1 group-hover:text-primary transition-colors">
                      {club.name}
                    </h3>
                    <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm font-medium">
                      <MaterialIcon icon="location_on" className="text-[18px] text-primary/70" filled />
                      {club.location}
                    </div>
                  </div>
                </div>

                <div className="mt-4 mb-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700/50">
                  <div className="flex items-start gap-2">
                    <MaterialIcon icon={club.collabIcon} className="text-primary text-sm mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-primary uppercase tracking-wide mb-0.5">Latest Collab</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{club.latestCollab}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                  <button className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 group/btn">
                    <MaterialIcon icon="mail" className="text-[20px]" />
                    <span>Message Club</span>
                  </button>
                  <button
                    aria-label="View Profile"
                    className="aspect-square bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <MaterialIcon icon="arrow_forward" />
                  </button>
                </div>
              </div>
            </article>
          ))}

          {/* Call to Action Card: Become a Partner */}
          <article className="group relative flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-800/50 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-primary dark:hover:border-primary transition-all duration-300 cursor-pointer min-h-[420px]">
            <div className="text-center p-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                <MaterialIcon icon="add_link" className="text-3xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Become a Partner</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-[200px] mx-auto">
                Is your club looking to collaborate with Rotaract NYC? Let&apos;s connect.
              </p>
              <Link
                href="/contact"
                className="inline-block px-6 py-2.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-primary font-bold text-sm shadow-sm group-hover:shadow-md transition-all"
              >
                Initiate Connection
              </Link>
            </div>
          </article>
        </div>
      </div>
    </main>
  )
}
