import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App'
import { ConfirmProvider } from './components/ui/confirm-dialog'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfirmProvider>
      <App />
    </ConfirmProvider>
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        className: '!bg-card !text-card-foreground !border !border-border !shadow-lg !text-sm',
      }}
    />
  </StrictMode>,
)
