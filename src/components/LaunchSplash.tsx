import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'

const LOGO_SRC = '/logo-completa-alugapro.png'
const DISPLAY_MS = 2200

export function LaunchSplash({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(() => Capacitor.isNativePlatform())

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let cancelled = false
    void SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {})

    const timer = window.setTimeout(() => {
      if (!cancelled) setVisible(false)
    }, DISPLAY_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <>
      {children}
      <AnimatePresence>
        {visible ? (
          <motion.div
            key="launch-splash"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            aria-hidden
          >
            <motion.img
              src={LOGO_SRC}
              alt=""
              className="h-auto w-[68%] max-w-[280px] select-none"
              draggable={false}
              initial={{ opacity: 0, scale: 0.82, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.div
              className="absolute bottom-[18%] h-1 w-16 overflow-hidden rounded-full bg-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.3 }}
            >
              <motion.div
                className="h-full w-1/2 rounded-full bg-primary"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{
                  duration: 1.1,
                  ease: 'easeInOut',
                  repeat: Infinity,
                }}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
