
import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import JobMatching from "./pages/JobMatching";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./components/dashboard/Dashboard";
import ResumeAnalysis from "./pages/ResumeAnalysis";
import FeaturePlaceholder from "./pages/FeaturePlaceholder";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { authApi } from "./services/authApi";
import LearningRoadmap from "./pages/LearningRoadmap";
import UserProfile from "./pages/UserProfile"
import InterviewPrep from "./pages/InterviewPrep";

import "./App.css";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AuthenticatedApp() {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState("dashboard");

  function handleLogout() {
    authApi.logout();
    navigate("/login", { replace: true });
  }

  function renderPage() {
    switch (activePage) {
      case "dashboard":
        return <Dashboard onNavigate={setActivePage} />;

      case "resume":
        return <ResumeAnalysis />;

      case "jobs":
        return <JobMatching onNavigate={setActivePage}/>;
      
      case "learning":
        return <LearningRoadmap />;
      case "interviews":
        return <InterviewPrep />;
        case "profile":
          return <UserProfile />;

      default:
        return <Dashboard onNavigate={setActivePage} />;
    }
  }

  return (
    <AppLayout
      activePage={activePage}
      onNavigate={setActivePage}
      onLogout={handleLogout}
    >
      {renderPage()}
    </AppLayout>
  );
}

function AppRoutes() {
  const isAuthenticated = Boolean(
    localStorage.getItem("accessToken")
  );

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated
            ? <Navigate to="/dashboard" replace />
            : <Login />
        }
      />

      <Route
        path="/register"
        element={
          isAuthenticated
            ? <Navigate to="/dashboard" replace />
            : <Register />
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AuthenticatedApp />
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={
          <Navigate
            to={isAuthenticated ? "/dashboard" : "/login"}
            replace
          />
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to={isAuthenticated ? "/dashboard" : "/login"}
            replace
          />
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}