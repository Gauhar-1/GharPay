import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import * as Sentry from "@sentry/react";
import React, { useEffect } from "react";

const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes);

const queryClient = new QueryClient();
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Pipeline from "./pages/Pipeline";
import Visits from "./pages/Visits";
import Conversations from "./pages/Conversations";
import Analytics from "./pages/Analytics";
import Historical from "./pages/Historical";
import SettingsPage from "./pages/SettingsPage";
import LeadCapture from "./pages/LeadCapture";
import Owners from "./pages/Owners";
import Inventory from "./pages/Inventory";
import EffortDashboard from "./pages/EffortDashboard";
import Availability from "./pages/Availability";
import Matching from "./pages/Matching";
import Bookings from "./pages/Bookings";
import ZoneManagement from "./pages/ZoneManagement";
import Explore from "./pages/Explore";
import PropertyDetail from "./pages/PropertyDetail";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import OwnerPortal from "./pages/OwnerPortal";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import TenantPortal from "./pages/TenantPortal";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <GlobalErrorBoundary>
            <BrowserRouter>
              <SentryRoutes>
               <Route path="/" element={<LandingPage />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/property/:propertyId" element={<PropertyDetail />} />
                <Route path="/capture" element={<LeadCapture />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'agent', 'owner', 'tenant', 'customer']}>
                      <Profile />
                    </ProtectedRoute>
                  } 
                />


                <Route path="/owner-portal" element={<ProtectedRoute allowedRoles={['owner','admin']}><OwnerPortal /></ProtectedRoute>} />

                <Route 
                  path="/tenant-portal" 
                  element={
                    <ProtectedRoute allowedRoles={['tenant', 'customer', 'admin']}>
                      <TenantPortal />
                    </ProtectedRoute>
                  } 
    />

                <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'agent']}><Dashboard /></ProtectedRoute>} />
                <Route path="/leads" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'agent']}><Leads /></ProtectedRoute>} />
                <Route path="/pipeline" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'agent']}><Pipeline /></ProtectedRoute>} />
                <Route path="/visits" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'agent']}><Visits /></ProtectedRoute>} />
                <Route path="/conversations" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'agent']}><Conversations /></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'agent']}><Analytics /></ProtectedRoute>} />
                <Route path="/historical" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'agent']}><Historical /></ProtectedRoute>} />
                <Route path="/owners" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'agent']}><Owners /></ProtectedRoute>} />
                <Route path="/effort" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'agent']}><EffortDashboard /></ProtectedRoute>} />
                <Route path="/availability" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'agent']}><Availability /></ProtectedRoute>} />
                <Route path="/matching" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'agent']}><Matching /></ProtectedRoute>} />
                <Route path="/bookings" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'agent']}><Bookings /></ProtectedRoute>} />

                <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><SettingsPage /></ProtectedRoute>} />
                <Route path="/inventory" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Inventory /></ProtectedRoute>} />
                <Route path="/zones" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><ZoneManagement /></ProtectedRoute>} />
                
                <Route path="*" element={<NotFound />} />
              </SentryRoutes>
            </BrowserRouter>
        </GlobalErrorBoundary>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
