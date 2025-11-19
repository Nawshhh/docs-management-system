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
import Logs from './pages/Logs';
import Documents from './pages/Documents';
import ForgotPassword from './pages/ForgotPassword';
import ViewEmployeePage from './pages/ViewEmployeePage';
import AssignScope from './pages/AssignScope';
import ViewDocuments from './pages/ViewDocuments';
import ApproveDocuments from './pages/ApproveDocuments';
import DeleteDocuments from './pages/DeleteDocuments';
import RejectDocuments from './pages/RejectDocuments';

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
        <Route path="/system-logs" element={<Logs/>}/>
        <Route path="/documents" element={<Documents/>}/>
        <Route path="/forgot-password" element={<ForgotPassword/>}></Route>
        <Route path="/view-scope" element={<ViewEmployeePage/>}></Route>
        <Route path="/assign-scope" element={<AssignScope/>}></Route>
        <Route path="/view-documents" element={<ViewDocuments/>}></Route>
        <Route path="/approve-documents" element={<ApproveDocuments/>}></Route> 
        <Route path="/delete-documents" element={<DeleteDocuments/>}></Route>      
        <Route path="/reject-documents" element={<RejectDocuments/>}></Route>      

      </Routes>
      <Toaster position="bottom-right" reverseOrder={true}/>
    </BrowserRouter>
  </StrictMode>
);
