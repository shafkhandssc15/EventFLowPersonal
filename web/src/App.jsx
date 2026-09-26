import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Sidebar from "./components/Sidebar.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import EventsList from "./pages/EventsList.jsx";
import EventDetail from "./pages/EventDetail.jsx";
import OrganizerDashboard from "./pages/OrganizerDashboard.jsx";
import AttendeeDashboard from "./pages/AttendeeDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AgentWorkflowRunner from "./pages/AgentWorkflowRunner.jsx";
import ApprovalQueue from "./pages/ApprovalQueue.jsx";
import VendorDashboard from "./pages/VendorDashboard.jsx";

function ProtectedLayout() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("ef_sidebar_collapsed") === "true";
  });

  const handleSetCollapsed = (val) => {
    setCollapsed(val);
    localStorage.setItem("ef_sidebar_collapsed", String(val));
  };

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className={`layout ${collapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar collapsed={collapsed} setCollapsed={handleSetCollapsed} />
      <main className={`main ${collapsed ? "main-expanded" : ""}`}>
        <Routes>
          <Route path="/" element={<EventsList />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/attendee" element={<AttendeeDashboard />} />
          <Route path="/organizer" element={<OrganizerDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/vendor" element={<VendorDashboard />} />
          <Route path="/agent" element={<AgentWorkflowRunner />} />
          <Route path="/approvals" element={user?.role === "Admin" ? <ApprovalQueue /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
