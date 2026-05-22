import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { SessionProvider } from './context/SessionContext'
import { CaseProvider } from './context/CaseContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <CaseProvider>
          <App />
        </CaseProvider>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
)
