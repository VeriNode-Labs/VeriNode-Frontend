'use client'

import { useState, useEffect, useCallback } from 'react'
import { offlineStorage } from '@/src/services/localCache'
import { syncManager } from '@/src/services/syncManager'
import { useNetworkStatus } from '@/src/hooks/useNetworkStatus'

interface InspectionField {
  label: string
  key: string
  type: 'text' | 'select' | 'number' | 'textarea'
  required?: boolean
  options?: string[]
}

interface InspectionFormProps {
  draftId?: string
  fields: InspectionField[]
  onSubmit?: (data: Record<string, string>) => Promise<void>
}

export function InspectionForm({ draftId: existingDraftId, fields, onSubmit }: InspectionFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [draftId] = useState(() => existingDraftId || crypto.randomUUID())
  const [saved, setSaved] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { isOnline } = useNetworkStatus()

  useEffect(() => {
    if (existingDraftId) {
      offlineStorage.loadDraft(existingDraftId).then((draft) => {
        if (draft) {
          setFormData(draft.data as Record<string, string>)
        }
      })
    }
  }, [existingDraftId])

  useEffect(() => {
    if (!isDirty) return
    const timer = setTimeout(() => {
      offlineStorage.saveDraft({
        draftId,
        data: formData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      })
      setSaved(true)
    }, 1000)
    return () => clearTimeout(timer)
  }, [formData, isDirty, draftId])

  const handleChange = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
    setSaved(false)
  }, [])

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    const payload = { draftId, data: formData, submittedAt: Date.now() }

    if (!isOnline) {
      await syncManager.submitOffline(payload)
      setIsSubmitting(false)
      return
    }

    try {
      if (onSubmit) {
        await onSubmit(formData)
      } else {
        const response = await fetch('/api/v1/inspections/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!response.ok) throw new Error(`Submission failed: ${response.status}`)
      }
      await offlineStorage.deleteDraft(draftId)
      setFormData({})
      setIsDirty(false)
    } catch {
      await syncManager.submitOffline(payload)
      setSubmitError('Submission queued for sync when online')
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, draftId, isOnline, onSubmit])

  return (
    <div className="space-y-6">
      {fields.map((field) => (
        <div key={field.key}>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {field.label}
            {field.required && <span className="ml-1 text-red-500">*</span>}
          </label>
          {field.type === 'select' && field.options ? (
            <select
              value={formData[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            >
              <option value="">Select...</option>
              {field.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : field.type === 'textarea' ? (
            <textarea
              value={formData[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              rows={4}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            />
          ) : (
            <input
              type={field.type === 'number' ? 'number' : 'text'}
              value={formData[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            />
          )}
        </div>
      ))}

      <div className="flex items-center gap-4">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : isOnline ? 'Submit' : 'Queue for Sync'}
        </button>

        {saved && (
          <span className="text-xs text-green-600 dark:text-green-400">Draft saved locally</span>
        )}

        {!isOnline && (
          <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            Offline - submission will queue
          </span>
        )}
      </div>

      {submitError && (
        <p className="text-sm text-amber-600 dark:text-amber-400">{submitError}</p>
      )}
    </div>
  )
}
