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
import ViewEmployeeDocuments from './pages/ViewEmployeeDocuments';
import AddDocument from './pages/AddDocument';
import EditDocument from './pages/EditDocument';
import DeleteDocumentsEmployee from './pages/DeleteDocumentsEmployee';
import ErrorPage from './pages/ErrorPage';

import { RequireRole } from "./auth/RequireRole";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Login />} />
      <Route path="/create-account" element={<CreateAccount />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/error-page" element={<ErrorPage />} />

      {/* Admin Pages */}
      <Route
        path="/admin-homepage"
        element={
          <RequireRole allowedRoles={["ADMIN"]} pageLabel="ADMIN">
            <AdminHomepage />
          </RequireRole>
        }
      />
      <Route
        path="/accounts"
        element={
          <RequireRole allowedRoles={["ADMIN"]} pageLabel="ADMIN">
            <Accounts />
          </RequireRole>
        }
      />
      <Route
        path="/roles"
        element={
          <RequireRole allowedRoles={["ADMIN"]} pageLabel="ADMIN">
            <Roles />
          </RequireRole>
        }
      />
      <Route
        path="/system-logs"
        element={
          <RequireRole allowedRoles={["ADMIN"]} pageLabel="ADMIN">
            <Logs />
          </RequireRole>
        }
      />
      <Route
        path="/assign-scope"
        element={
          <RequireRole allowedRoles={["ADMIN"]} pageLabel="ADMIN">
            <AssignScope />
          </RequireRole>
        }
      />

      {/* Manager Pages */}
      <Route
        path="/manager-homepage"
        element={
          <RequireRole allowedRoles={["MANAGER"]} pageLabel="MANAGER">
            <ManagerHomepage />
          </RequireRole>
        }
      />
      <Route
        path="/documents"
        element={
          <RequireRole allowedRoles={["MANAGER"]} pageLabel="MANAGER">
            <Documents />
          </RequireRole>
        }
      />
      <Route
        path="/view-scope"
        element={
          <RequireRole allowedRoles={["MANAGER"]} pageLabel="MANAGER">
            <ViewEmployeePage />
          </RequireRole>
        }
      />
      <Route
        path="/view-documents"
        element={
          <RequireRole allowedRoles={["MANAGER"]} pageLabel="MANAGER">
            <ViewDocuments />
          </RequireRole>
        }
      />
      <Route
        path="/approve-documents"
        element={
          <RequireRole allowedRoles={["MANAGER"]} pageLabel="MANAGER">
            <ApproveDocuments />
          </RequireRole>
        }
      />
      <Route
        path="/delete-documents"
        element={
          <RequireRole allowedRoles={["MANAGER"]} pageLabel="MANAGER">
            <DeleteDocuments />
          </RequireRole>
        }
      />
      <Route
        path="/reject-documents"
        element={
          <RequireRole allowedRoles={["MANAGER"]} pageLabel="MANAGER">
            <RejectDocuments />
          </RequireRole>
        }
      />

      {/* Employee Pages */}
      <Route
        path="/employee-homepage"
        element={
          <RequireRole
            allowedRoles={["EMPLOYEE"]}
            pageLabel="EMPLOYEE"
          >
            <EmployeeHomepage />
          </RequireRole>
        }
      />
      <Route
        path="/view-my-documents"
        element={
          <RequireRole
            allowedRoles={["EMPLOYEE"]}
            pageLabel="EMPLOYEE"
          >
            <ViewEmployeeDocuments />
          </RequireRole>
        }
      />
      <Route
        path="/add-document"
        element={
          <RequireRole
            allowedRoles={["EMPLOYEE"]}
            pageLabel="EMPLOYEE"
          >
            <AddDocument />
          </RequireRole>
        }
      />
      <Route
        path="/edit-document"
        element={
          <RequireRole
            allowedRoles={["EMPLOYEE"]}
            pageLabel="EMPLOYEE"
          >
            <EditDocument />
          </RequireRole>
        }
      />
      <Route
        path="/delete-document"
        element={
          <RequireRole
            allowedRoles={["EMPLOYEE"]}
            pageLabel="EMPLOYEE"
          >
            <DeleteDocumentsEmployee />
          </RequireRole>
        }
      />
    </Routes>

    <Toaster position="bottom-right" reverseOrder={true} />
  </BrowserRouter>
);
