import { useEffect } from 'react'

type WizardFooterProps = {
  currentStep: number
  onBack: () => void
  onNext: () => void
  onSaveDraft: () => void
  onPublish: () => void
  isSaving: boolean
}

export default function WizardFooter({
  currentStep,
  onBack,
  onNext,
  onSaveDraft,
  onPublish,
  isSaving,
}: WizardFooterProps) {
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault()
          onSaveDraft()
        } else if (e.key === 'Enter' && currentStep < 3) {
          e.preventDefault()
          onNext()
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentStep, onSaveDraft, onNext])

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 gap-4">
      <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
        <button
          onClick={onSaveDraft}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Save draft (Ctrl/Cmd + S)"
        >
          <span className="material-symbols-outlined text-lg\">save</span>
          {isSaving ? 'Saving...' : 'Save Draft'}
        </button>
        <span className="hidden sm:inline text-xs text-slate-400\">⌘S</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          disabled={currentStep === 1 || isSaving}
          className="flex items-center gap-1 px-6 py-3 rounded-lg font-semibold text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed\"
        >
          <span className=\"material-symbols-outlined text-lg\">arrow_back</span>
          Back
        </button>

        {currentStep < 3 ? (
          <button
            onClick={onNext}
            disabled={isSaving}
            className=\"flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-bold text-sm shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed\"
          >
            {currentStep === 1 ? 'Content' : 'Registration'}
            <span className=\"material-symbols-outlined text-lg\">arrow_forward</span>
          </button>
        ) : (
          <button
            onClick={onPublish}
            disabled={isSaving}
            className=\"flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold text-sm shadow-lg shadow-green-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed\"
          >
            {isSaving ? (
              <>
                <span className=\"material-symbols-outlined text-lg animate-spin\">progress_activity</span>
                Publishing...
              </>
            ) : (
              <>
                <span className=\"material-symbols-outlined text-lg\">rocket_launch</span>
                Publish Event
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
