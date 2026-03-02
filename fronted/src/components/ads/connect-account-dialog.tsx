'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Facebook,
  Instagram,
  Link2,
  Loader2,
  Unlink,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getOAuthUrl,
  getSocialAccounts,
  deleteSocialAccount,
  getConfiguredPlatforms,
  type SocialAccount,
  type SocialPlatform,
  type PlatformConfig,
} from '@/app/dashboard/products/ads.api'

const TIKTOK_ICON = (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .54.04.79.1v-3.51a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.28 8.28 0 0 0 3.76.93V6.25c0 .15 0 .3-.01.44Z" />
  </svg>
)

const PLATFORMS: {
  platform: SocialPlatform
  label: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
}[] = [
  {
    platform: 'FACEBOOK',
    label: 'Facebook',
    description: 'Publica en tu página de Facebook',
    icon: <Facebook className="h-5 w-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-600',
  },
  {
    platform: 'INSTAGRAM',
    label: 'Instagram',
    description: 'Publica en tu perfil de negocio',
    icon: <Instagram className="h-5 w-5" />,
    color: 'text-pink-600',
    bgColor: 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600',
  },
  {
    platform: 'TIKTOK',
    label: 'TikTok',
    description: 'Publica contenido en TikTok',
    icon: TIKTOK_ICON,
    color: 'text-foreground',
    bgColor: 'bg-black',
  },
]

interface ConnectAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAccountsChanged?: (accounts: SocialAccount[]) => void
}

export function ConnectAccountDialog({
  open,
  onOpenChange,
  onAccountsChanged,
}: ConnectAccountDialogProps) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null)
  const [connectingPlatform, setConnectingPlatform] = useState<SocialPlatform | null>(null)
  const [disconnectingId, setDisconnectingId] = useState<number | null>(null)

  // Load accounts and platform configuration
  useEffect(() => {
    if (!open) return
    getSocialAccounts().then(setAccounts).catch(() => {})
    getConfiguredPlatforms().then(setPlatformConfig).catch(() => {})
  }, [open])

  // Listen for OAuth popup callback
  useEffect(() => {
    if (!open) return

    const handler = (event: MessageEvent) => {
      if (event.data?.type !== 'oauth-callback') return

      setConnectingPlatform(null)

      if (event.data.success) {
        toast.success(`${event.data.accountName || 'Cuenta'} vinculada correctamente`)
        // Reload accounts
        getSocialAccounts().then((updated) => {
          setAccounts(updated)
          onAccountsChanged?.(updated)
        })
      } else {
        toast.error(event.data.error || 'Error al vincular cuenta')
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [open, onAccountsChanged])

  const handleConnect = useCallback(async (platform: SocialPlatform) => {
    setConnectingPlatform(platform)
    try {
      const { url } = await getOAuthUrl(platform)
      // Open OAuth popup
      const width = 600
      const height = 700
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2
      window.open(
        url,
        `oauth-${platform}`,
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`,
      )
    } catch (err: any) {
      setConnectingPlatform(null)
      toast.error(err.message || 'Error al iniciar conexión')
    }
  }, [])

  const handleDisconnect = useCallback(
    async (account: SocialAccount) => {
      setDisconnectingId(account.id)
      try {
        await deleteSocialAccount(account.id)
        toast.success(`${account.accountName} desvinculada`)
        const updated = accounts.filter((a) => a.id !== account.id)
        setAccounts(updated)
        onAccountsChanged?.(updated)
      } catch {
        toast.error('Error al desvincular cuenta')
      } finally {
        setDisconnectingId(null)
      }
    },
    [accounts, onAccountsChanged],
  )

  const getAccount = (platform: SocialPlatform) =>
    accounts.find((a) => a.platform === platform && a.isActive)

  const isConfigured = (platform: SocialPlatform) =>
    platformConfig ? platformConfig[platform] : true // optimistic while loading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Conectar Redes Sociales
          </DialogTitle>
          <DialogDescription>
            Vincula tus cuentas para publicar directamente desde la plataforma.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {PLATFORMS.map(({ platform, label, description, icon, bgColor }) => {
            const account = getAccount(platform)
            const configured = isConfigured(platform)
            const isConnecting = connectingPlatform === platform
            const isDisconnecting = disconnectingId === account?.id

            return (
              <div
                key={platform}
                className={`rounded-lg border p-3 transition-colors ${
                  account
                    ? 'border-primary/30 bg-primary/5'
                    : configured
                      ? 'hover:border-muted-foreground/30'
                      : 'opacity-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-white ${bgColor}`}
                  >
                    {icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{label}</p>
                      {account && (
                        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                      )}
                    </div>
                    {account ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {account.accountName}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">{description}</p>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {account ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive cursor-pointer"
                        disabled={isDisconnecting}
                        onClick={() => handleDisconnect(account)}
                      >
                        {isDisconnecting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Unlink className="h-3.5 w-3.5" />
                        )}
                        Desvincular
                      </Button>
                    ) : configured ? (
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 text-xs cursor-pointer"
                        disabled={isConnecting}
                        onClick={() => handleConnect(platform)}
                      >
                        {isConnecting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ExternalLink className="h-3.5 w-3.5" />
                        )}
                        {isConnecting ? 'Conectando...' : 'Conectar'}
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        <AlertCircle className="mr-1 h-3 w-3" />
                        No configurado
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Token expiration warning */}
                {account?.tokenExpiresAt && (
                  <TokenExpiryBadge expiresAt={account.tokenExpiresAt} />
                )}
              </div>
            )
          })}
        </div>

        <p className="text-[10px] text-muted-foreground pt-2">
          Los tokens se renuevan automáticamente cuando es posible. Si una cuenta
          deja de funcionar, desvincula y vuelve a conectar.
        </p>
      </DialogContent>
    </Dialog>
  )
}

function TokenExpiryBadge({ expiresAt }: { expiresAt: string }) {
  const expiry = new Date(expiresAt)
  const now = new Date()
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysLeft > 14) return null

  return (
    <div className="mt-2 flex items-center gap-1.5">
      <AlertCircle className="h-3 w-3 flex-shrink-0 text-amber-500" />
      <span className="text-[10px] text-amber-600 dark:text-amber-400">
        {daysLeft <= 0
          ? 'Token expirado — reconecta la cuenta'
          : `Token expira en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`}
      </span>
    </div>
  )
}
