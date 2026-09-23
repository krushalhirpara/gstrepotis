import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header, Footer } from './components/layout/Header';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { ProtectedRoute, PublicOnlyRoute, AdminProtectedRoute } from './components/layout/ProtectedRoute';

import { Home } from './pages/public/Home';
import { BankConverterLanding, EcommerceGstr1Landing } from './pages/public/ProductPages';
import { PricingPage, AboutPage } from './pages/public/CompanyPages';
import { TutorialsPage, TutorialDetailPage, ContactPage, RequestDemoPage } from './pages/public/SupportPages';
import { SignInPage, SignUpPage, ForgotPasswordPage } from './pages/public/AuthPages';
import { CompleteProfilePage } from './pages/public/CompleteProfilePage';
import { TermsPage, PrivacyPage, RefundPolicyPage } from './pages/public/LegalPages';
import { WelcomePage } from './pages/public/WelcomePage';
import { CeoAdminLogin } from './pages/admin/CeoAdminLogin';

import { ClientListPage } from './pages/clients/ClientListPage';
import { ClientDetailPage } from './pages/clients/ClientDetailPage';

import { GstAuditDashboard } from './pages/audit/GstAuditDashboard';
import { GstAuditWorkspace } from './pages/audit/GstAuditWorkspace';

import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardOverview } from './pages/dashboard/DashboardOverview';
import { BankConverterWorkflow } from './pages/dashboard/BankConverterWorkflow';
import { EcommerceGstr1Workflow } from './pages/dashboard/EcommerceGstr1Workflow';
import { FilesManager } from './pages/dashboard/FilesManager';
import { SubscriptionPage } from './pages/dashboard/SubscriptionPage';
import { ReportsPage, ProfilePage, SupportPage } from './pages/dashboard/UserPages';

import { AdminLayout } from './components/layout/AdminLayout';
import {
  AdminDashboard,
  AdminUsers,
  AdminBanks,
  AdminMarketplaces,
  AdminHsn,
  AdminAuditLogs,
} from './pages/admin/AdminPages';

export const App: React.FC = () => {
  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col bg-white text-[#111111] selection:bg-black selection:text-white">
        <Header />

        <main className="flex-1">
          <Routes>
            {/* Public Landing & Content Routes */}
            <Route
              path="/"
              element={
                <PublicOnlyRoute>
                  <Home />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/products/bank-statement-converter"
              element={
                <PublicOnlyRoute>
                  <BankConverterLanding />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/products/ecommerce-gstr1"
              element={
                <PublicOnlyRoute>
                  <EcommerceGstr1Landing />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/pricing"
              element={
                <PublicOnlyRoute>
                  <PricingPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/about"
              element={
                <PublicOnlyRoute>
                  <AboutPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/tutorials"
              element={
                <PublicOnlyRoute>
                  <TutorialsPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/tutorials/:slug"
              element={
                <PublicOnlyRoute>
                  <TutorialDetailPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/contact"
              element={
                <PublicOnlyRoute>
                  <ContactPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/request-demo"
              element={
                <PublicOnlyRoute>
                  <RequestDemoPage />
                </PublicOnlyRoute>
              }
            />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/refund-policy" element={<RefundPolicyPage />} />
            <Route
              path="/forgot-password"
              element={
                <PublicOnlyRoute>
                  <ForgotPasswordPage />
                </PublicOnlyRoute>
              }
            />

            <Route path="/ceoadmin" element={<CeoAdminLogin />} />

            {/* Public Auth Routes (Redirect authenticated users to /welcome) */}
            <Route
              path="/sign-in"
              element={
                <PublicOnlyRoute>
                  <SignInPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/sign-up"
              element={
                <PublicOnlyRoute>
                  <SignUpPage />
                </PublicOnlyRoute>
              }
            />

            {/* Protected Profile Completion Route */}
            <Route
              path="/complete-profile"
              element={
                <ProtectedRoute>
                  <CompleteProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Protected Welcome Product Selection Route */}
            <Route
              path="/welcome"
              element={
                <ProtectedRoute>
                  <WelcomePage />
                </ProtectedRoute>
              }
            />

            {/* Protected Client Management Module Routes */}
            <Route
              path="/clients"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ClientListPage />} />
              <Route path=":id" element={<ClientDetailPage />} />
            </Route>

            {/* Protected GST Audit & Reconciliation Workspace Module Routes */}
            <Route
              path="/gst-audit"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<GstAuditDashboard />} />
              <Route path=":auditId/*" element={<GstAuditWorkspace />} />
            </Route>

            {/* Protected Bank Statement Converter Quick Route */}
            <Route
              path="/pdftotally"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<BankConverterWorkflow />} />
            </Route>

            {/* User Dashboard Workspace Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardOverview />} />
              <Route path="bank-converter" element={<BankConverterWorkflow />} />
              <Route path="ecommerce-gstr1" element={<EcommerceGstr1Workflow />} />
              <Route path="files" element={<FilesManager />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="subscription" element={<SubscriptionPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="support" element={<SupportPage />} />
            </Route>

            {/* Admin Panel Workspace Protected Routes */}
            <Route
              path="/admin"
              element={
                <AdminProtectedRoute>
                  <AdminLayout />
                </AdminProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="banks" element={<AdminBanks />} />
              <Route path="marketplaces" element={<AdminMarketplaces />} />
              <Route path="hsn" element={<AdminHsn />} />
              <Route path="audit-logs" element={<AdminAuditLogs />} />
            </Route>

            {/* Catch-all redirect to Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
};

export default App;
