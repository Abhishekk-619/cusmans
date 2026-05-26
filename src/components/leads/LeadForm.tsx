import { useForm } from 'react-hook-form'
import { LEAD_STATUSES, LEAD_SOURCES, type Lead, type LeadFormData } from '../../types'
import { useUsers } from '../../firebase/useUsers'
import { useAuth } from '../../firebase/AuthContext'
import { TimePickerAMPM } from '../ui/TimePickerAMPM'

interface LeadFormProps {
  initialValues?: Partial<Lead>
  onSubmit: (data: LeadFormData) => void
  onCancel: () => void
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none transition-colors'

const errorInputClass =
  'w-full rounded-lg border border-red-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none transition-colors'

const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

export function LeadForm({ initialValues, onSubmit, onCancel }: LeadFormProps) {
  const { currentUser } = useAuth()
  const { users } = useUsers()

  // Build assignable employees list based on role
  const assignableUsers = (() => {
    if (currentUser?.role === 'admin') {
      return users.filter((u) => u.role === 'employee' || u.role === 'team_lead')
    }
    if (currentUser?.role === 'team_lead') {
      return users.filter((u) => u.role === 'employee' && u.team_lead_id === currentUser.uid)
    }
    return currentUser ? [currentUser] : []
  })()

  // Wrap onSubmit to inject assigned_to_uid
  const handleFormSubmit = (data: LeadFormData) => {
    const assignedUser = users.find((u) => u.name === data.assigned_to)
    const followupDate = data.followup_date ? String(data.followup_date).slice(0, 10) : ''
    const followupTime = data.followup_time?.trim() ?? ''
    const enriched = {
      ...data,
      followup_date: followupDate ? (followupTime ? `${followupDate}T${followupTime}` : followupDate) : null,
      followup_time: followupTime || undefined,
      assigned_to_uid: assignedUser?.uid ?? currentUser?.uid ?? '',
    }
    onSubmit(enriched)
  }
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LeadFormData>({
    defaultValues: {
      full_name: initialValues?.full_name ?? '',
      phone: initialValues?.phone ?? '',
      email: initialValues?.email ?? '',
      company: initialValues?.company ?? '',
      lead_source: initialValues?.lead_source ?? 'Agent',
      assigned_to: initialValues?.assigned_to ?? currentUser?.name ?? '',
      status: initialValues?.status ?? 'New Lead',
      followup_date: initialValues?.followup_date?.slice(0, 10) ?? null,
      followup_time:
        initialValues?.followup_time ??
        (initialValues?.followup_date && initialValues.followup_date.length > 10
          ? initialValues.followup_date.slice(11, 16)
          : ''),
      notes: initialValues?.notes ?? '',
      website_link: initialValues?.website_link ?? '',
      business_type: initialValues?.business_type ?? '',
    },
  })

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <div className="space-y-4">

        {/* Full Name */}
        <div>
          <label className={labelClass}>
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Jane Smith"
            className={errors.full_name ? errorInputClass : inputClass}
            {...register('full_name', { required: 'Full name is required' })}
          />
          {errors.full_name && (
            <p className="mt-1 text-xs text-red-500">{errors.full_name.message}</p>
          )}
        </div>

        {/* Phone + Email */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Phone</label>
            <input
              type="tel"
              placeholder="10-digit number"
              maxLength={10}
              className={errors.phone ? errorInputClass : inputClass}
              onKeyDown={(e) => {
                // Allow: backspace, delete, tab, escape, enter, arrow keys
                const allowed = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown']
                if (allowed.includes(e.key)) return
                // Allow Ctrl+V / Cmd+V (paste), Ctrl+C (copy), Ctrl+A (select all), Ctrl+X (cut)
                if ((e.ctrlKey || e.metaKey) && ['v','c','a','x'].includes(e.key.toLowerCase())) return
                // Block anything that's not a digit
                if (!/^\d$/.test(e.key)) e.preventDefault()
              }}
              onPaste={(e) => {
                // On paste, strip all non-digit characters and insert only digits
                e.preventDefault()
                const pastedText = e.clipboardData.getData('text')
                const digitsOnly = pastedText.replace(/\D/g, '').slice(0, 10)
                const input = e.target as HTMLInputElement
                // Use execCommand for react-hook-form compatibility (triggers onChange)
                input.focus()
                document.execCommand('insertText', false, digitsOnly)
              }}
              {...register('phone', {
                pattern: {
                  value: /^\d{10}$/,
                  message: 'Phone number must be exactly 10 digits',
                },
              })}
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              placeholder="jane@example.com"
              className={errors.email ? errorInputClass : inputClass}
              {...register('email', {
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Enter a valid email address',
                },
              })}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>
        </div>

        {/* Company + Website Link */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Company</label>
            <input
              type="text"
              placeholder="Acme Corp"
              className={inputClass}
              {...register('company')}
            />
          </div>
          <div>
            <label className={labelClass}>Website Link</label>
            <input
              type="url"
              placeholder="https://example.com"
              className={errors.website_link ? errorInputClass : inputClass}
              {...register('website_link', {
                pattern: {
                  value: /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/,
                  message: 'Enter a valid URL',
                },
              })}
            />
            {errors.website_link && (
              <p className="mt-1 text-xs text-red-500">{errors.website_link.message}</p>
            )}
          </div>
        </div>

        {/* Type of Business + Assigned To */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Type of Business</label>
            <select className={inputClass} {...register('lead_source')}>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Assigned To</label>
            <select className={inputClass} {...register('assigned_to')}>
              <option value="">— Select —</option>
              {assignableUsers.map((u) => (
                <option key={u.uid} value={u.name}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status + Follow-up Date + Follow-up Time */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Status</label>
            <select className={inputClass} {...register('status')}>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Follow-up Date</label>
            <input
              type="date"
              className={inputClass}
              {...register('followup_date')}
            />
          </div>
          <div>
            <label className={labelClass}>Follow-up Time</label>
            <TimePickerAMPM
              value={watch('followup_time') ?? ''}
              onChange={(val) => setValue('followup_time', val)}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className={labelClass}>Notes</label>
          <textarea
            rows={3}
            placeholder="Add any notes about this lead..."
            className={inputClass}
            {...register('notes')}
          />
        </div>

      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
        >
          Save Lead
        </button>
      </div>
    </form>
  )
}
