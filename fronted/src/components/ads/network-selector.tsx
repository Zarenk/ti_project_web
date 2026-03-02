'use client'

import { Facebook, Instagram, Settings2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { SocialAccount, SocialPlatform } from '@/app/dashboard/products/ads.api'

const NETWORKS: {
  platform: SocialPlatform
  label: string
  icon: React.ReactNode
  color: string
}[] = [
  {
    platform: 'FACEBOOK',
    label: 'Facebook',
    icon: <Facebook className="h-4 w-4" />,
    color: 'bg-blue-600',
  },
  {
    platform: 'INSTAGRAM',
    label: 'Instagram',
    icon: <Instagram className="h-4 w-4" />,
    color: 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600',
  },
  {
    platform: 'TIKTOK',
    label: 'TikTok',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .54.04.79.1v-3.51a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.28 8.28 0 0 0 3.76.93V6.25c0 .15 0 .3-.01.44Z" />
      </svg>
    ),
    color: 'bg-black',
  },
]

interface NetworkSelectorProps {
  selectedNetworks: SocialPlatform[]
  onToggle: (platform: SocialPlatform) => void
  socialAccounts: SocialAccount[]
  onManageAccounts?: () => void
}

export function NetworkSelector({
  selectedNetworks,
  onToggle,
  socialAccounts,
  onManageAccounts,
}: NetworkSelectorProps) {
  const getAccount = (platform: SocialPlatform) =>
    socialAccounts.find((a) => a.platform === platform && a.isActive)

  const hasUnlinked = NETWORKS.some(({ platform }) => !getAccount(platform))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Publicar en:</p>
        {onManageAccounts && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 text-[10px] cursor-pointer"
            onClick={onManageAccounts}
          >
            <Settings2 className="h-3 w-3" />
            Conectar cuentas
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {NETWORKS.map(({ platform, label, icon, color }) => {
          const account = getAccount(platform)
          const isLinked = !!account
          const isSelected = selectedNetworks.includes(platform)

          return (
            <label
              key={platform}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : isLinked
                    ? 'hover:border-primary/50'
                    : 'cursor-not-allowed opacity-50'
              }`}
            >
              <Checkbox
                checked={isSelected}
                disabled={!isLinked}
                onCheckedChange={() => onToggle(platform)}
                className="cursor-pointer"
              />
              <div className={`flex h-6 w-6 items-center justify-center rounded text-white ${color}`}>
                {icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium">{label}</p>
                {isLinked ? (
                  <p className="truncate text-[10px] text-muted-foreground">
                    {account.accountName}
                  </p>
                ) : (
                  <Badge variant="outline" className="h-4 text-[9px]">
                    No vinculada
                  </Badge>
                )}
              </div>
            </label>
          )
        })}
      </div>
      {hasUnlinked && onManageAccounts && (
        <p className="text-[10px] text-muted-foreground">
          Vincula tus cuentas para poder publicar directamente.
        </p>
      )}
    </div>
  )
}
