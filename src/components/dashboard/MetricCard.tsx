interface MetricCardProps {
  label: string
  value: number
  accent?: boolean
}

export function MetricCard({ label, value, accent = false }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent ? 'text-green-600' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  )
}
