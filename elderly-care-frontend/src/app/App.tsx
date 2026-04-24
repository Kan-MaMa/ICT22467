// src/app/App.tsx
import { Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import DashboardPage from "../pages/Dashboard/DashboardPage"
import VitalsPage from "../pages/Vitals/VitalsPage"
import ElderlyPage from "../pages/Eldery/ElderlyPage"
import EmergencyPage from "../pages/Emergency/EmergencyPage"
import ElderlyDetail from "../pages/Eldery/ElderlyDetail"
import MainLayout from "../components/layout/MainLayout"
import GlobalEmergencyAlert from "../unit/EmergencyAlert"
import { useMqttAlerts } from "../services/mqttAlert"
import ElderlyDataTable from "../Table/ElderlyTable"
import CaregiverTablePage from "../Table/CargiverTable"
import LoginPage from "../pages/Login/LoginPage"
import RegisterPage from "../pages/Login/RegisterPage"
import EmergencyTablePage from "../Table/EmergencyTable"
import ProtectedRoute from "./ProtectedRoute"; 

export default function App() {
  useMqttAlerts();
  
  return (
    <>
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            padding: '16px',
            borderRadius: '16px',
            fontWeight: 'bold',
          },
          success: {
            duration: 3000,
          },
          error: {
            duration: 4000,
          }
        }}
      />
      <GlobalEmergencyAlert />

      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        <Route element={<ProtectedRoute />}>
          
          {/* ให้ MainLayout เป็นตัวคลุมหน้าเว็บที่มี Sidebar อีกที */}
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/vitals" element={<VitalsPage />} />
            <Route path="/elderly" element={<ElderlyPage />} />
            <Route path="/emergency" element={<EmergencyPage />} />
            <Route path="/elderly/:id" element={<ElderlyDetail />} />
            <Route path="/elderly-table" element={<ElderlyDataTable />} />
            <Route path="/caregiver-table" element={<CaregiverTablePage />} />
            <Route path="/emergency-table" element={<EmergencyTablePage />} />
          </Route>

        </Route>
      </Routes>
    </>
  )
}