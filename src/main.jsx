import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import App from './App'
import CustomerPage from './CustomerPage'
import './index.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './api/queryClient'

import { GlobalProvider } from './context/GlobalContext'

function Router() {
  const location = useLocation()
  
  return (
    <Routes location={location}>
      <Route path="/*" element={<App />} />
      <Route path="/customer" element={<CustomerPage />} />
    </Routes>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <GlobalProvider>
        <BrowserRouter>
          <Router />
        </BrowserRouter>
      </GlobalProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
