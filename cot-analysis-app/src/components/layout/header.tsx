import Link from 'next/link'
import { TrendingUp } from 'lucide-react'

export function Header() {
  return (
    <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-8 w-8 text-blue-600" />
          <Link href="/" className="text-2xl font-bold text-gray-900">
            COT Analysis
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center space-x-6">
          <Link 
            href="/dashboard" 
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Dashboard
          </Link>
          <Link 
            href="/markets" 
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Markets
          </Link>
          <Link 
            href="/about" 
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            About
          </Link>
        </nav>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 hidden sm:inline">
            Last Updated: {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>
    </header>
  )
}