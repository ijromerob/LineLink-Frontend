"use client"

import { useState } from "react"
import { Button } from "../components/ui/button"
import { Monitor, BarChart3, Users, Shield, ArrowRight, Play, CheckCircle, AlertTriangle, Menu, X, Video, Mic, MicOff, VideoOff } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header - Meet Style */}
      <header className="sticky top-0 z-20 bg-white bg-opacity-90 backdrop-blur h-16 flex-shrink-0 shadow-sm flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <Monitor className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-medium text-gray-900">LineLink</span>
            </div>

            <div className="hidden md:flex items-center space-x-3">
              <Link href="/signin">
                <Button variant="ghost" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-blue-600 hover:bg-blue-700 rounded-full px-6">Get started</Button>
              </Link>
            </div>


            <button className="md:hidden p-2 rounded-full hover:bg-gray-100" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-4 py-4 space-y-2">
              <Link href="#features" className="block py-2 text-gray-700 hover:text-blue-600">
                Features
              </Link>
              <Link href="#solutions" className="block py-2 text-gray-700 hover:text-blue-600">
                Solutions
              </Link>
              <Link href="#pricing" className="block py-2 text-gray-700 hover:text-blue-600">
                Pricing
              </Link>
              <div className="pt-4 space-y-2">
                <Link href="/signin">
                  <Button variant="ghost" className="w-full justify-start">
                    Sign in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 rounded-full">Get started</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 flex items-center justify-center">
        <section className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-4">
            <h1 className="text-4xl sm:text-5xl font-normal text-gray-900 mb-2">
              Monitor your production line
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Real-time tracking and analytics for manufacturing teams
            </p>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="col-span-2 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg shadow-sm overflow-hidden relative group">
              <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
                <div className="w-full max-w-md">
                  <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">Production Line A</h3>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <div className="w-8 h-8 bg-green-500 rounded-full mx-auto mb-1"></div>
                        <span className="text-xs text-gray-600">Unit 1</span>
                      </div>
                      <div className="text-center">
                        <div className="w-8 h-8 bg-yellow-500 rounded-full mx-auto mb-1"></div>
                        <span className="text-xs text-gray-600">Unit 2</span>
                      </div>
                      <div className="text-center">
                        <div className="w-8 h-8 bg-red-500 rounded-full mx-auto mb-1"></div>
                        <span className="text-xs text-gray-600">Unit 3</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-4 left-4 flex items-center space-x-2">
                <div className="bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm hidden group-hover:block">
                  Main Dashboard
                </div>
              </div>
            </div>

            <div className="col-span-2 grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden relative group">
                <div className="aspect-video bg-gradient-to-br from-green-50 to-emerald-100 p-4 flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-green-600 mx-auto mb-2" />
                    <h3 className="font-medium text-gray-900">Analytics</h3>
                    <p className="text-sm text-gray-600 mt-1">Real-time insights</p>
                  </div>
                </div>
                <div className="absolute bottom-4 left-4">
                  <div className="bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm hidden group-hover:block">
                    Analytics View
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm overflow-hidden relative group">
                <div className="aspect-video bg-gradient-to-br from-purple-50 to-violet-100 p-4 flex items-center justify-center">
                  <div className="text-center">
                    <Users className="w-12 h-12 text-purple-600 mx-auto mb-2" />
                    <h3 className="font-medium text-gray-900">Team View</h3>
                    <p className="text-sm text-gray-600 mt-1">Collaborate seamlessly</p>
                  </div>
                </div>
                <div className="absolute bottom-4 left-4">
                  <div className="bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm hidden group-hover:block">
                    Team Dashboard
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm overflow-hidden relative group">
                <div className="aspect-video bg-gradient-to-br from-orange-50 to-red-100 p-4 flex items-center justify-center">
                  <div className="text-center">
                    <AlertTriangle className="w-12 h-12 text-orange-600 mx-auto mb-2" />
                    <h3 className="font-medium text-gray-900">Alerts</h3>
                    <p className="text-sm text-gray-600 mt-1">Missing parts detected</p>
                  </div>
                </div>
                <div className="absolute bottom-4 left-4">
                  <div className="bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm hidden group-hover:block">
                    Alert Center
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm overflow-hidden relative group">
                <div className="aspect-video bg-gradient-to-br from-blue-50 to-cyan-100 p-4 flex items-center justify-center">
                  <div className="text-center">
                    <Monitor className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                    <h3 className="font-medium text-gray-900">Monitor</h3>
                    <p className="text-sm text-gray-600 mt-1">Live status tracking</p>
                  </div>
                </div>
                <div className="absolute bottom-4 left-4">
                  <div className="bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm hidden group-hover:block">
                    Live Monitor
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-full shadow-lg px-6 py-3 flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="rounded-full p-2">
                <Video className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" className="rounded-full p-2">
                <Mic className="w-5 h-5" />
              </Button>
              <Link href="/signup">
                <Button className="bg-blue-600 hover:bg-blue-700 rounded-full px-6">
                  Start monitoring
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="rounded-full p-2">
                <Shield className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex justify-center items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Free 30-day trial</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-blue-500" />
              <span>Enterprise security</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="h-12 flex-shrink-0 bg-white border-t border-gray-200 flex items-center justify-center text-center text-sm text-gray-600">
        <p className="w-full">&copy; 2025 LineLink. All rights reserved.</p>
      </footer>
    </div>
  )
}