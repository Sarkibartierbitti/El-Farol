import { StrictMode } from 'react' //re-run comps for dev mode

import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
