import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header, Footer } from './components/layout/Header';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { ProtectedRoute, PublicOnlyRoute, AdminProtectedRoute } from './components/layout/ProtectedRoute';

// Public Pages
import { Home } from './pages/public/Home';
import {
  GstSoftwarePage,
  GstSoftwareForCaPage,
  GstSoftwareForAccountantsPage,
  GstSoftwareForBusinessPage,
  GstComplianceSoftwarePage,
  GstReconciliationPage,
  Gstr1SoftwarePage,
  Gstr3bSoftwarePage,
  Gstr2bReconciliationPage,
  GstAuditSoftwarePage,
  BankStatementToTallyPage,
  TallyIntegrationPage,
} from './pages/public/SeoLandingPages';
import { BlogIndexPage, BlogDetailPage } from './pages/public/BlogPages';
import { PricingPage, AboutPage } from './pages/public/CompanyPages';
import { TutorialsPage, TutorialDetailPage, ContactPage, RequestDemoPage } from './pages/public/SupportPages';
import { TermsPage, PrivacyPage, RefundPolicyPage, DisclaimerPage } from './pages/public/LegalPages';
import { NotFoundPage } from './pages/public/NotFoundPage';
import { SignInPage } from './pages/public/AuthPages';
import { CeoAdminLogin } from './pages/admin/CeoAdminLogin';
import { WelcomePage } from './pages/public/WelcomePage';

// Client Management Module
import { ClientListPage } from './pages/clients/ClientListPage';
import { ClientDetailPage } from './pages/clients/ClientDetailPage';

// GST Audit Workspace Module
import { GstAuditDashboard } from './pages/audit/GstAuditDashboard';
import { GstAuditWorkspace } from './pages/audit/GstAuditWorkspace';

// Dashboard Module
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardOverview } from './pages/dashboard/DashboardOverview';
import { BankConverterWorkflow } from './pages/dashboard/BankConverterWorkflow';
import { EcommerceGstr1Workflow } from './pages/dashboard/EcommerceGstr1Workflow';
import { FilesManager } from './pages/dashboard/FilesManager';
import { SubscriptionPage } from './pages/dashboard/SubscriptionPage';
import { ReportsPage, ProfilePage, SupportPage } from './pages/dashboard/UserPages';

// Admin Module
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
            {/* Primary Landing Page */}
            <Route path="/" element={<Home />} />

            {/* Core SEO Landing Pages */}
            <Route path="/gst-software" element={<GstSoftwarePage />} />
            <Route path="/gst-software-for-ca" element={<GstSoftwareForCaPage />} />
            <Route path="/gst-software-for-accountants" element={<GstSoftwareForAccountantsPage />} />
            <Route path="/gst-software-for-business" element={<GstSoftwareForBusinessPage />} />
            <Route path="/gst-compliance-software" element={<GstComplianceSoftwarePage />} />
            <Route path="/gst-reconciliation" element={<GstReconciliationPage />} />
            <Route path="/gstr-1-software" element={<Gstr1SoftwarePage />} />
            <Route path="/gstr-3b-software" element={<Gstr3bSoftwarePage />} />
            <Route path="/gstr-2b-reconciliation" element={<Gstr2bReconciliationPage />} />
            <Route path="/gst-audit-software" element={<GstAuditSoftwarePage />} />
            <Route path="/bank-statement-to-tally" element={<BankStatementToTallyPage />} />
            <Route path="/tally-integration" element={<TallyIntegrationPage />} />

            {/* Legacy Product Page Redirects to new Canonical SEO URLs */}
            <Route path="/products/bank-statement-converter" element={<Navigate to="/bank-statement-to-tally" replace />} />
            <Route path="/products/ecommerce-gstr1" element={<Navigate to="/gstr-1-software" replace />} />

            {/* Topic-Clustered SEO Blog */}
            <Route path="/blog" element={<BlogIndexPage />} />
            <Route path="/blog/:slug" element={<BlogDetailPage />} />

            {/* Company & Support Public Routes */}
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/request-demo" element={<RequestDemoPage />} />
            <Route path="/tutorials" element={<TutorialsPage />} />
            <Route path="/tutorials/:slug" element={<TutorialDetailPage />} />

            {/* Legal & Trust Public Routes */}
            <Route path="/terms-and-conditions" element={<TermsPage />} />
            <Route path="/terms" element={<Navigate to="/terms-and-conditions" replace />} />
            <Route path="/privacy-policy" element={<PrivacyPage />} />
            <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
            <Route path="/refund-policy" element={<RefundPolicyPage />} />
            <Route path="/disclaimer" element={<DisclaimerPage />} />

            {/* CEO Admin Secret Login */}
            <Route path="/ceoadmin" element={<CeoAdminLogin />} />

            {/* Public Auth Route (Only for non-logged in users) */}
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <SignInPage />
                </PublicOnlyRoute>
              }
            />
            <Route path="/sign-in" element={<Navigate to="/login" replace />} />
            <Route path="/sign-up" element={<Navigate to="/login" replace />} />
            <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
            <Route path="/complete-profile" element={<Navigate to="/dashboard" replace />} />

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

            {/* Custom 404 Catch-All Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
};

export default App;
