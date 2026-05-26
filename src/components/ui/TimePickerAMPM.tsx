import { useState, useEffect } from 'react'

interface TimePickerAMPMProps {
  value: string          // 24h format "HH:MM" or ""
  onChange: (value: string) => void
  className?: string
}

/**
 * Converts 24h "HH:MM" → { hour12, minute, period }
 */
function parse24h(val: string): { hour: string; minute: string; period: 'AM' | 'PM' } {
  if (!val || !val.includes(':')) return { hour: '', minute: '', period: 'AM' }
  const [hStr, mStr] = val.split(':')
  let h = parseInt(hStr, 10)
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return { hour: String(h), minute: mStr ?? '00', period }
}

/**
 * Converts { hour12, minute, period } → 24h "HH:MM"
 */
function to24h(hour: string, minute: string, period: 'AM' | 'PM'): string {
  if (!hour || !minute) return ''
  let h = parseInt(hour, 10)
  if (period === 'AM' && h === 12) h = 0
  else if (period === 'PM' && h !== 12) h += 12
  return `${String(h).padStart(2, '0')}:${minute}`
}

const HOURS = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

/**
 * AM/PM time picker that stores value in 24h HH:MM format internally
 * but displays user-friendly hour / minute / AM|PM dropdowns.
 */
export function TimePickerAMPM({ value, onChange, className = '' }: TimePickerAMPMProps) {
  const parsed = parse24h(value)
  const [hour, setHour] = useState(parsed.hour)
  const [minute, setMinute] = useState(parsed.minute)
  const [period, setPeriod] = useState<'AM' | 'PM'>(parsed.period)

  // Sync internal state when value changes externally
  useEffect(() => {
    const p = parse24h(value)
    setHour(p.hour)
    setMinute(p.minute)
    setPeriod(p.period)
  }, [value])

  const handleChange = (newHour: string, newMinute: string, newPeriod: 'AM' | 'PM') => {
    if (newHour && newMinute) {
      onChange(to24h(newHour, newMinute, newPeriod))
    } else {
      onChange('')
    }
  }

  const selectClass = `rounded-lg border border-gray-200 px-2 py-2 text-sm text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none transition-colors bg-white ${className}`

  return (
    <div className="flex items-center gap-1.5">
      {/* Hour */}
      <select
        value={hour}
        onChange={(e) => {
          setHour(e.target.value)
          handleChange(e.target.value, minute || '00', period)
          if (!minute) setMinute('00')
        }}
        className={selectClass}
        style={{ minWidth: '60px' }}
      >
        <option value="">HH</option>
        {HOURS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>

      <span className="text-gray-400 font-medium">:</span>

      {/* Minute */}
      <select
        value={minute}
        onChange={(e) => {
          setMinute(e.target.value)
          handleChange(hour || '12', e.target.value, period)
          if (!hour) setHour('12')
        }}
        className={selectClass}
        style={{ minWidth: '60px' }}
      >
        <option value="">MM</option>
        {MINUTES.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      {/* AM/PM */}
      <select
        value={period}
        onChange={(e) => {
          const newPeriod = e.target.value as 'AM' | 'PM'
          setPeriod(newPeriod)
          if (hour && minute) {
            handleChange(hour, minute, newPeriod)
          }
        }}
        className={selectClass}
        style={{ minWidth: '60px' }}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  )
}
