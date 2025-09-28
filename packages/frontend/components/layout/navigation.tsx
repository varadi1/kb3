'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useSocket } from '@/components/socket-provider'
import { useTheme } from 'next-themes'
import {
  Database,
  Link as LinkIcon,
  Tags,
  Settings,
  Activity,
  Moon,
  Sun,
  Wifi,
  WifiOff
} from 'lucide-react'

export function Navigation() {
  const pathname = usePathname()
  const { isConnected } = useSocket()
  const { theme, setTheme } = useTheme()

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Database },
    { href: '/urls', label: 'URLs', icon: LinkIcon },
    { href: '/tags', label: 'Tags', icon: Tags },
    { href: '/processing', label: 'Processing', icon: Activity },
    { href: '/config', label: 'Configuration', icon: Settings },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Database className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">
              KB3
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-2 transition-colors hover:text-foreground/80",
                    pathname === item.href
                      ? "text-foreground"
                      : "text-foreground/60"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search could go here */}
          </div>
          <nav className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <div className={cn(
                "flex items-center space-x-1 rounded-md px-2 py-1 text-xs",
                isConnected
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              )}>
                {isConnected ? (
                  <Wifi className="h-3 w-3" />
                ) : (
                  <WifiOff className="h-3 w-3" />
                )}
                <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}