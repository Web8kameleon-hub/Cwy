// ==========================================
// 🎉 CWY LICENSE CELEBRATIONS
// ==========================================
// Paste this code into CwyAdvancedDashboard.tsx

// 1. ADD TO IMPORTS (top of file)
import { useState, useEffect } from 'react'

// 2. ADD STATE VARIABLES (inside component, after existing states)
const [licenseServerStatus, setLicenseServerStatus] = useState<'healthy' | 'degraded' | 'offline'>('offline')
const [licenseStats, setLicenseStats] = useState({
  total_licenses: 0,
  pro_licenses: 0,
  enterprise_licenses: 0,
  total_revenue: 0,
  recent_activations_24h: 0
})

// 3. ADD TO systemComponents ARRAY
{
  name: 'CWY License Server',
  status: licenseServerStatus,
  port: 8000,
  metrics: {
    total_licenses: licenseStats.total_licenses,
    revenue: `€${licenseStats.total_revenue}`,
    recent: licenseStats.recent_activations_24h
  },
  attribution: ['Alba', 'Lagter', 'Ageim']
}

// 4. ADD LICENSE ACHIEVEMENTS (to achievements array)
{
  id: 'first_customer',
  title: '🎉 First Customer!',
  description: 'First CWY PRO license activated',
  icon: '🎊',
  unlocked: licenseStats.total_licenses >= 1,
  team_members: ['Alba', 'Lagter', 'Ageim']
},
{
  id: 'ten_licenses',
  title: '💰 10 Licenses Sold',
  description: 'Reached 10 paying customers',
  icon: '💎',
  unlocked: licenseStats.total_licenses >= 10,
  team_members: ['Full Team']
},
{
  id: 'first_enterprise',
  title: '🏆 First Enterprise!',
  description: 'First Enterprise license activated',
  icon: '👑',
  unlocked: licenseStats.enterprise_licenses >= 1,
  team_members: ['Alba', 'Albana', 'Sofia']
},
{
  id: 'thousand_euro',
  title: '💰 €1,000 Revenue',
  description: 'Hit €1,000 in total revenue',
  icon: '💸',
  unlocked: licenseStats.total_revenue >= 1000,
  team_members: ['Full Team']
}

// 5. ADD useEffect FOR LICENSE STATS POLLING
useEffect(() => {
  const fetchLicenseStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/stats')
      const data = await response.json()
      
      // Store previous values to detect changes
      const prevTotal = licenseStats.total_licenses
      const prevEnterprise = licenseStats.enterprise_licenses
      const prevRevenue = licenseStats.total_revenue
      
      setLicenseStats(data)
      setLicenseServerStatus(data.status === 'online' ? 'healthy' : 'offline')
      
      // Check for new achievements
      if (data.total_licenses >= 1 && prevTotal === 0) {
        // First customer!
        const achievement = {
          id: 'first_customer',
          title: '🎉 FIRST CUSTOMER!',
          description: 'First CWY PRO license activated!',
          icon: '🎊',
          team_members: ['Alba', 'Lagter', 'Ageim']
        }
        unlockAchievement('first_customer')
        triggerMassiveCelebration(achievement)
      }
      
      if (data.total_licenses >= 10 && prevTotal < 10) {
        // 10 licenses!
        const achievement = {
          id: 'ten_licenses',
          title: '💰 10 LICENSES!',
          description: 'Reached 10 paying customers!',
          icon: '💎',
          team_members: ['Full Team']
        }
        unlockAchievement('ten_licenses')
        triggerMassiveCelebration(achievement)
      }
      
      if (data.enterprise_licenses >= 1 && prevEnterprise === 0) {
        // First Enterprise!
        const achievement = {
          id: 'first_enterprise',
          title: '🏆 FIRST ENTERPRISE!',
          description: 'First Enterprise license activated!',
          icon: '👑',
          team_members: ['Alba', 'Albana', 'Sofia']
        }
        unlockAchievement('first_enterprise')
        triggerMassiveCelebration(achievement)
      }
      
      if (data.total_revenue >= 1000 && prevRevenue < 1000) {
        // €1,000 revenue!
        const achievement = {
          id: 'thousand_euro',
          title: '💰 €1,000 REVENUE!',
          description: 'Hit €1,000 in total revenue!',
          icon: '💸',
          team_members: ['Full Team']
        }
        unlockAchievement('thousand_euro')
        triggerMassiveCelebration(achievement)
      }
      
    } catch (error) {
      console.error('Failed to fetch license stats:', error)
      setLicenseServerStatus('offline')
    }
  }

  // Initial fetch
  fetchLicenseStats()
  
  // Poll every 10 seconds
  const interval = setInterval(fetchLicenseStats, 10000)

  return () => clearInterval(interval)
}, [licenseStats]) // Dependency to detect changes

// 6. ADD useEffect FOR WEBSOCKET (real-time notifications)
useEffect(() => {
  let ws: WebSocket | null = null
  
  try {
    ws = new WebSocket('ws://localhost:8000/ws')
    
    ws.onopen = () => {
      console.log('📡 Connected to CWY License Server WebSocket')
    }
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      
      if (message.type === 'license_activated') {
        const { tier, email, license_key } = message.data
        
        console.log(`🎉 NEW LICENSE ACTIVATED: ${tier} - ${email}`)
        
        // Show immediate celebration (before stats update)
        const achievement = {
          id: 'instant_activation',
          title: `🎊 NEW ${tier} LICENSE!`,
          description: `Just activated by ${email.substring(0, 20)}...`,
          icon: tier === 'ENTERPRISE' ? '👑' : '💎',
          team_members: ['Alba', 'Lagter']
        }
        
        triggerMassiveCelebration(achievement)
        
        // Refresh stats immediately
        setTimeout(async () => {
          const response = await fetch('http://localhost:8000/api/stats')
          const data = await response.json()
          setLicenseStats(data)
        }, 1000)
      }
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
    
    ws.onclose = () => {
      console.log('WebSocket closed - attempting reconnect in 5s...')
      setTimeout(() => {
        // Reconnect logic handled by component re-mount
      }, 5000)
    }
    
  } catch (error) {
    console.error('Failed to connect WebSocket:', error)
  }

  return () => {
    if (ws) {
      ws.close()
    }
  }
}, [])

// 7. ADD REVENUE PANEL (optional - paste in JSX)
/*
<div className="col-span-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-6 text-white shadow-xl">
  <h3 className="text-2xl font-bold mb-4 flex items-center">
    <span className="mr-2">💰</span>
    CWY License Revenue
  </h3>
  
  <div className="grid grid-cols-2 gap-4">
    <div className="bg-white/10 rounded p-4">
      <div className="text-4xl font-bold">€{licenseStats.total_revenue}</div>
      <div className="text-green-100 mt-1">Total Revenue</div>
    </div>
    
    <div className="bg-white/10 rounded p-4">
      <div className="text-4xl font-bold">{licenseStats.total_licenses}</div>
      <div className="text-green-100 mt-1">Total Licenses</div>
    </div>
    
    <div className="bg-white/10 rounded p-3">
      <div className="text-2xl font-bold">{licenseStats.pro_licenses}</div>
      <div className="text-green-100 text-sm">PRO (€29)</div>
    </div>
    
    <div className="bg-white/10 rounded p-3">
      <div className="text-2xl font-bold">{licenseStats.enterprise_licenses}</div>
      <div className="text-green-100 text-sm">Enterprise (€99)</div>
    </div>
  </div>
  
  <div className="mt-4 pt-4 border-t border-green-400">
    <div className="flex items-center justify-between">
      <span className="text-green-100">Activations (24h)</span>
      <span className="text-2xl font-bold">{licenseStats.recent_activations_24h}</span>
    </div>
  </div>
  
  <div className="mt-4 flex items-center text-sm text-green-100">
    <div className={`w-3 h-3 rounded-full mr-2 ${licenseServerStatus === 'healthy' ? 'bg-green-300' : 'bg-red-400'}`}></div>
    License Server {licenseServerStatus === 'healthy' ? 'Online' : 'Offline'}
  </div>
</div>
*/

// 8. ADD LICENSE SERVER NODE TO MESH NETWORK
// In the mesh network visualization, add this node:
/*
{
  id: 'license-server',
  label: 'License\nServer',
  x: 650, // Position on canvas
  y: 400,
  status: licenseServerStatus,
  type: 'service',
  metrics: `€${licenseStats.total_revenue}`,
  connections: ['orchestrator', 'web-dashboard']
}
*/

// ==========================================
// 🎉 THAT'S IT! NOW TEST:
// ==========================================
// 1. Start backend: python backend/stripe_webhook.py
// 2. Start dashboard: npm run dev
// 3. Trigger test: stripe trigger checkout.session.completed
// 4. WATCH THE CELEBRATION! 🎊
