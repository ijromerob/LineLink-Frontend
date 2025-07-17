import { useEffect, useState } from "react"

export default function LiveStatusBar({ lastUpdated, className = "" }: { lastUpdated: string, className?: string }) {
  const [online, setOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    function handleOnline() { setOnline(true) }
    function handleOffline() { setOnline(false) }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <div className={`flex items-center gap-2 mb-4 ${className}`}>
      <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
      <span className="text-xs text-gray-500">
        {online ? 'Live' : 'Offline'}
        {lastUpdated && online && <> • Updated {lastUpdated}</>}
      </span>
    </div>
  )
} 