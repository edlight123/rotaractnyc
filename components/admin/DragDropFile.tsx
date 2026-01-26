'use client'

import { useEffect, useMemo, useState } from 'react'

type Props = {
  label: string
  accept?: string
  file: File | null
  onFile: (file: File | null) => void
  uploadedUrl?: string
  hint?: string
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let v = bytes
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i += 1
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export default function DragDropFile({ label, accept, file, onFile, uploadedUrl, hint }: Props) {
  const [isDragging, setIsDragging] = useState(false)

  const previewUrl = useMemo(() => {
    if (!file) return null
    if (!file.type.startsWith('image/')) return null
    return URL.createObjectURL(file)
  }, [file])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700">{label}</div>

      {uploadedUrl ? (
        <div className="border border-gray-100 rounded-lg p-3 bg-white">
          <div className="text-xs text-gray-600 mb-2">Uploaded</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={uploadedUrl}
            alt="Uploaded preview"
            className="w-full max-w-sm rounded-md border border-gray-100"
          />
          <a
            href={uploadedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-primary hover:underline break-all"
          >
            {uploadedUrl}
          </a>
        </div>
      ) : null}

      <div
        className={
          'border-2 border-dashed rounded-lg p-4 bg-white transition-colors ' +
          (isDragging ? 'border-primary bg-primary/5' : 'border-gray-200')
        }
        onDragEnter={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsDragging(false)
          const f = e.dataTransfer.files?.[0]
          if (f) onFile(f)
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-sm text-gray-700">
              Drag & drop a file here, or <span className="font-semibold">browse</span>
            </div>
            {hint ? <div className="text-xs text-gray-500 mt-1">{hint}</div> : null}
          </div>
          <label className="inline-flex items-center justify-center px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] || null
                onFile(f)
              }}
            />
            Choose file
          </label>
        </div>

        {file ? (
          <div className="mt-3 border border-gray-100 rounded-lg p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{file.name}</div>
                <div className="text-xs text-gray-500">
                  {file.type || 'File'} {file.size ? `· ${formatBytes(file.size)}` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onFile(null)}
                className="px-3 py-2 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100"
              >
                Clear
              </button>
            </div>

            {previewUrl ? (
              <div className="mt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Selected preview"
                  className="w-full max-w-sm rounded-md border border-gray-100"
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
