import { STATUS_COLORS, type LeadStatus } from '../../types'

interface StatusBadgeProps {
  status: LeadStatus
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const { bg, text } = STATUS_COLORS[status]
  const padding = size === 'md' ? 'px-2.5 py-1' : 'px-2 py-0.5'

  return (
    <span className={`inline-flex items-center rounded-full text-xs font-medium ${bg} ${text} ${padding}`}>
      {status}
    </span>
  )
}
