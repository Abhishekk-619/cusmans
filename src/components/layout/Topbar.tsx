interface TopbarProps {
  onAddLeadClick?: () => void
}

export function Topbar(_props: TopbarProps) {
  return (
    <header className="fixed top-0 left-56 right-0 h-14 bg-white border-b border-gray-100 z-30" />
  )
}
