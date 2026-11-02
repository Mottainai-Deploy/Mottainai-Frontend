import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/global.css'
import '@/styles/accessibility.css'
import Routes from '@/routes'
import { AuthProvider } from '@/context/AuthProvider' 
import { removeLegacyDemoReports } from '@/services/legacyDemoDataCleanupService'

removeLegacyDemoReports()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider> 
      {/* Abre direto no Routes */}
      <Routes />
    </AuthProvider>
  </StrictMode>,
)
