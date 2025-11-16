import { useEffect, useState } from 'react'
import { CheckCircle, X } from 'lucide-react'

interface ToastProps {
  message: string
  show: boolean
  onClose: () => void
  duration?: number
}

const Toast = ({ message, show, onClose, duration = 3000 }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onClose, 300)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [show, duration, onClose])

  if (!show) return null

  return (
    <div className={`fixed top-24 right-8 z-[1002] transition-all duration-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border border-green-500/30 backdrop-blur-xl"
           style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%)' }}>
        <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
        <span className="text-white text-sm font-medium">{message}</span>
        <button onClick={() => { setIsVisible(false); setTimeout(onClose, 300) }} className="ml-2 text-gray-400 hover:text-white transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default Toast
