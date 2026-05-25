import Link from 'next/link'

export type AdminTab = 'photos' | 'tiers' | 'faq' | 'requests' | 'settings'

const TABS: { id: AdminTab, label: string }[] = [
  { id: 'photos', label: 'Фото' },
  { id: 'tiers', label: 'Тарифы' },
  { id: 'faq', label: 'Вопросы' },
  { id: 'requests', label: 'Заявки' },
  { id: 'settings', label: 'Настройки' },
]

export function AdminTabs({ active }: { active: AdminTab }) {
  return (
    <nav className="border-b border-border mb-6">
      <ul className="flex gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = tab.id === active
          const href = tab.id === 'photos' ? '/admin' : `/admin?tab=${tab.id}`
          return (
            <li key={tab.id}>
              <Link
                href={href}
                className={
                  'inline-block px-4 py-2 text-sm border-b-2 -mb-px transition-colors ' +
                  (isActive
                    ? 'border-foreground text-foreground font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground')
                }
              >
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
