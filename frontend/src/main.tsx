import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from "react-router-dom";
import './index.css'

import Login from './pages/Login'
import Homepage from './pages/Homepage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login/>}/>
        <Route path="/homepage" element={<Homepage/>}/>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
