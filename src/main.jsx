import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PlatformGate from './platform/PlatformGate.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PlatformGate>
      <App />
    </PlatformGate>
  </StrictMode>,
)
