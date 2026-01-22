'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminSession } from '@/lib/admin/useAdminSession'
import LogisticsStep from './_components/LogisticsStep'
import ContentStep from './_components/ContentStep'
import RegistrationStep from './_components/RegistrationStep'
import WizardProgress from './_components/WizardProgress'
import WizardFooter from './_components/WizardFooter'

export type EventFormData = {
  // Logistics
  title: string
  venueType: 'physical' | 'virtual' | 'hybrid'
  location: string
  virtualLink?: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  timezone: string
  
  // Content
  description: string
  imageUrl: string
  category: 'upcoming' | 'past'
  visibility: 'public' | 'member' | 'board'
  
  // Registration
  requiresRegistration: boolean
  capacity?: number
  registrationDeadline?: string
  allowGuests: boolean
  memberPrice?: number
  guestPrice?: number
  
  // Meta
  status: 'published' | 'draft' | 'cancelled'
}

export default function NewEventWizard() {
  const router = useRouter()
  const session = useAdminSession()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    venueType: 'physical',
    location: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    timezone: 'America/New_York',
    description: '',
    imageUrl: '',
    category: 'upcoming',
    visibility: 'member',
    requiresRegistration: true,
    allowGuests: true,
    status: 'draft',
  })

  const updateFormData = (updates: Partial<EventFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSaveDraft = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    
    try {
      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: 'draft',
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to save draft')
      }
      
      const result = await response.json()
      setSuccess('Draft saved successfully!')
      setTimeout(() => router.push('/admin/events'), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft')
    } finally {
      setIsSaving(false)
    }
  }

  const validateForm = () => {
    const errors: string[] = []
    if (!formData.title) errors.push('Event Title')
    if (!formData.description) errors.push('Description')
    if (!formData.startDate) errors.push('Start Date')
    if (!formData.startTime) errors.push('Start Time')
    if (formData.venueType !== 'virtual' && !formData.location) errors.push('Physical Location')
    
    if (errors.length > 0) {
      setError(`Missing required fields: ${errors.join(', ')}`)
      return false
    }
    return true
  }

  const handlePublish = async () => {
    if (!validateForm()) {
      return
    }
    
    setIsSaving(true)
    setError(null)
    
    try {
      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: 'published',
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to publish event')
      }
      
      const result = await response.json()
      router.push('/admin/events')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish event')
    } finally {
      setIsSaving(false)
    }
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Create New Event</h1>
              <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm max-w-2xl">
                Set up a new event with our streamlined wizard. Complete all required fields to publish your event to members.
              </p>
            </div>
            <button
              onClick={() => router.push('/admin/events')}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
              Cancel
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 flex flex-col items-center py-8 px-4">
        {/* Wizard Container */}
        <div className="max-w-4xl w-full bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
          <WizardProgress currentStep={currentStep} />

          {/* Success Display */}
          {success && (
            <div className="mx-10 mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
              <p className="text-green-800 dark:text-green-200 text-sm font-medium">{success}</p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mx-10 mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400">error</span>
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Step Content */}
          <div className="p-10">
            {currentStep === 1 && (
              <LogisticsStep formData={formData} updateFormData={updateFormData} />
            )}
            {currentStep === 2 && (
              <ContentStep formData={formData} updateFormData={updateFormData} />
            )}
            {currentStep === 3 && (
              <RegistrationStep formData={formData} updateFormData={updateFormData} />
            )}
          </div>

          <WizardFooter
            currentStep={currentStep}
            onBack={handleBack}
            onNext={handleNext}
            onSaveDraft={handleSaveDraft}
            onPublish={handlePublish}
            isSaving={isSaving}
          />
        </div>

        {/* Helpful Tips */}
        <div className="max-w-4xl w-full mt-8 mb-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
            <span className="material-symbols-outlined text-primary text-xl">lightbulb</span>
            <div>
              <p className="text-slate-900 dark:text-white font-bold text-sm">Expert Tip</p>
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed mt-1">
                {currentStep === 1 && 'Events with accurate locations get 40% higher RSVP rates. Make sure to provide detailed venue information.'}
                {currentStep === 2 && 'Events with engaging descriptions and quality images receive 60% more registrations.'}
                {currentStep === 3 && 'Consider setting early bird pricing to boost initial registrations.'}
              </p>
            </div>
          </div>
          <div className="flex gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <span className="material-symbols-outlined text-slate-400 text-xl">help</span>
            <div>
              <p className="text-slate-900 dark:text-white font-bold text-sm">Need Help?</p>
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed mt-1">
                Contact the tech team for support with event setups or integrations.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
