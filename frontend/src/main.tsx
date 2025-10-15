import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from 'react-hot-toast';
import './index.css'

import Login from './pages/Login'
import AdminHomepage from './pages/AdminHomepage';
import EmployeeHomepage from './pages/EmployeeHomepage';
import ManagerHomepage from './pages/ManagerHomepage';
import Accounts from './pages/Accounts';
import CreateAccount from './pages/CreateAccount';
import Roles from './pages/Roles';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login/>}/>
        <Route path="/admin-homepage" element={<AdminHomepage/>}/>
        <Route path="/employee-homepage" element={<EmployeeHomepage/>}/>
        <Route path="/manager-homepage" element={<ManagerHomepage/>}/>
        <Route path="/accounts" element={<Accounts/>}/>
        <Route path="/create-account" element={<CreateAccount/>}/>
        <Route path="/roles" element={<Roles/>}/>
      </Routes>
      <Toaster position="bottom-right" reverseOrder={true}/>
    </BrowserRouter>
  </StrictMode>
);
