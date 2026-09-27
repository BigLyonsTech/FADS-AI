import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "next-themes"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import FadsRobotLoader from '@/components/FadsRobotLoader';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import React, { useEffect, useRef, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import AppLayout from '@/components/AppLayout';
import Onboarding from '@/pages/Onboarding';
import HomeRouter from '@/components/HomeRouter';
import PlatformAdmin from '@/pages/PlatformAdmin';
import Team from '@/pages/Team';
import Settings from '@/pages/Settings';
import Account from '@/pages/Account';
import Permissions from '@/pages/Permissions';
import AcceptInvite from '@/pages/AcceptInvite';
import ReviewerAccess from '@/pages/ReviewerAccess';
import Privacy from '@/pages/Privacy';
import Terms from '@/pages/Terms';
import Support from '@/pages/Support';
import Finance from '@/pages/Finance';
import TaxCentre from '@/pages/TaxCentre';
import Sales from '@/pages/Sales';
import FinanceTransactions from '@/pages/FinanceTransactions';
import FinanceAccounts from '@/pages/FinanceAccounts';
import FinanceContacts from '@/pages/FinanceContacts';
import FinanceCategories from '@/pages/FinanceCategories';
import MoneyIn from '@/pages/MoneyIn';
import MoneyOut from '@/pages/MoneyOut';
import TransactionDetail from '@/pages/TransactionDetail';
import Invoices from '@/pages/Invoices';
import InvoiceDetail from '@/pages/InvoiceDetail';
import InvoiceEdit from '@/pages/InvoiceEdit';
import Quotations from '@/pages/Quotations';
import QuotationDetail from '@/pages/QuotationDetail';
import QuotationEdit from '@/pages/QuotationEdit';
import MoneyOwed from '@/pages/MoneyOwed';
import Receipts from '@/pages/Receipts';
import ReceiptDetail from '@/pages/ReceiptDetail';
import ReceiptNew from '@/pages/ReceiptNew';
import Reconciliations from '@/pages/Reconciliations';
import ReconciliationNew from '@/pages/ReconciliationNew';
import ReconciliationDetail from '@/pages/ReconciliationDetail';
import AffiliateCentre from '@/pages/AffiliateCentre';
import AffiliateResourceCentre from '@/pages/AffiliateResourceCentre';
import AffiliateAdmin from '@/pages/AffiliateAdmin';
import AffiliateTerms from '@/pages/AffiliateTerms';
import SubscriptionPlans from '@/pages/SubscriptionPlans';
import SubscriptionCheckout from '@/pages/SubscriptionCheckout';
import SubscriptionSuccess from '@/pages/SubscriptionSuccess';
import SubscriptionManage from '@/pages/SubscriptionManage';
import SubscriptionAdmin from '@/pages/SubscriptionAdmin';
import Reports from '@/pages/Reports';
import FinanceOfficer from '@/pages/FinanceOfficer';
import FinanceOfficerAdmin from '@/pages/FinanceOfficerAdmin';
import HRHome from '@/pages/HRHome';
import Employees from '@/pages/Employees';
import EmployeeProfile from '@/pages/EmployeeProfile';
import EmployeeEdit from '@/pages/EmployeeEdit';
import EmployeeDocuments from '@/pages/EmployeeDocuments';
import OnboardingChecklist from '@/pages/OnboardingChecklist';
import OffboardingChecklist from '@/pages/OffboardingChecklist';
import HrSettings from '@/pages/HrSettings';
import LeaveHome from '@/pages/LeaveHome';
import LeaveSettings from '@/pages/LeaveSettings';
import AttendanceHome from '@/pages/AttendanceHome';
import AttendanceSettings from '@/pages/AttendanceSettings';
import ComplianceHome from '@/pages/ComplianceHome';
import HrOfficer from '@/pages/HrOfficer';
import TranscribeHome from '@/pages/TranscribeHome';
import TranscribeStudio from '@/pages/TranscribeStudio';
import TranscriptDetail from '@/pages/TranscriptDetail';
import TranscribeOfficer from '@/pages/TranscribeOfficer';
import BetaReadiness from '@/pages/BetaReadiness';
import BetaPackaging from '@/pages/BetaPackaging';
import CRMHome from '@/pages/CRMHome';
import CRMContacts from '@/pages/CRMContacts';
import CRMContactDetail from '@/pages/CRMContactDetail';
import CRMAmelieImport from '@/pages/CRMAmelieImport';
import CRMHBAImport from '@/pages/CRMHBAImport';
import CRMFADSFinderImport from '@/pages/CRMFADSFinderImport';
import CRMLeads from '@/pages/CRMLeads';
import CRMTasks from '@/pages/CRMTasks';
import CRMOffers from '@/pages/CRMOffers';
import CRMSettings from '@/pages/CRMSettings';
import CRMAutomations from '@/pages/CRMAutomations';
import AssistantHome from '@/pages/AssistantHome';
import AiTeam from '@/pages/AiTeam';
import SchoolReports from '@/pages/SchoolReports';
import SchoolReportCardEdit from '@/pages/SchoolReportCardEdit';
import SchoolReportCardDetail from '@/pages/SchoolReportCardDetail';
import ChurchReports from '@/pages/ChurchReports';
import ChurchGiving from '@/pages/ChurchGiving';
import GettingStarted from '@/pages/GettingStarted';
import HelpCentre from '@/pages/HelpCentre';
import PayrollHome from '@/pages/PayrollHome';
import PayrollRunEdit from '@/pages/PayrollRunEdit';
import PayrollRunDetail from '@/pages/PayrollRunDetail';
import Payslip from '@/pages/Payslip';
import InventoryHome from '@/pages/InventoryHome';
import InventoryItemEdit from '@/pages/InventoryItemEdit';
import InventoryItemDetail from '@/pages/InventoryItemDetail';
import Messages from '@/pages/Messages';
import ManageOrganisations from '@/pages/ManageOrganisations';
import AdminCustomerSubscriptions from '@/pages/AdminCustomerSubscriptions';
import Intelligence from '@/pages/Intelligence';
import WorkflowTemplates from '@/pages/WorkflowTemplates';
import ContentCentre from '@/pages/ContentCentre';
import TemplateCentre from '@/pages/TemplateCentre';
import FeatureGate from "@/components/subscription/FeatureGate";
// Add page imports here

// Preserves the deep-link path (e.g. /accept-invite?m=...) across the login
// redirect so the user returns to the target page after authenticating.
const LoginRedirect = () => {
  const loc = useLocation();
  const target = `/login?returnTo=${encodeURIComponent(loc.pathname + loc.search)}`;
  return <Navigate to={target} replace />;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const startedAt = useRef(Date.now());
  const [entranceReady, setEntranceReady] = useState(false);
  const authLoading = isLoadingPublicSettings || isLoadingAuth;

  // Keep the branded entrance visible for a minimum of 2 seconds, while never
  // delaying real loading that takes longer than that.
  useEffect(() => {
    if (authLoading) return;
    const remaining = Math.max(0, 2000 - (Date.now() - startedAt.current));
    const timer = window.setTimeout(() => setEntranceReady(true), remaining);
    return () => window.clearTimeout(timer);
  }, [authLoading]);

  // Show the FADS AI robot while checking app public settings/auth and for the
  // short branded entrance window.
  if (authLoading || !entranceReady) {
    return <FadsRobotLoader fullScreen message="FADS AI IS GETTING THINGS READY..." />;
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/support" element={<Support />} />
      <Route path="/affiliate/terms" element={<AffiliateTerms />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<LoginRedirect />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomeRouter />} />
          <Route path="/intelligence" element={<FeatureGate feature="intelligence"><Intelligence /></FeatureGate>} />
          <Route path="/workflows" element={<WorkflowTemplates />} />
          <Route path="/content" element={<ContentCentre />} />
          <Route path="/templates" element={<TemplateCentre />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/finance/business-tax-centre" element={<TaxCentre />} />
          <Route path="/finance/sales" element={<Sales />} />
          <Route path="/finance/transactions" element={<FinanceTransactions />} />
          <Route path="/finance/transactions/:id" element={<TransactionDetail />} />
          <Route path="/finance/money-in" element={<MoneyIn />} />
          <Route path="/finance/money-out" element={<MoneyOut />} />
          <Route path="/finance/accounts" element={<FinanceAccounts />} />
          <Route path="/finance/contacts" element={<FinanceContacts />} />
          <Route
            path="/finance/categories"
            element={
              <ErrorBoundary backTo="/finance" backLabel="Back to Finance">
                <FinanceCategories />
              </ErrorBoundary>
            }
          />
          <Route path="/finance/money-owed" element={<MoneyOwed />} />
          <Route path="/finance/invoices" element={<Invoices />} />
          <Route path="/finance/invoices/new" element={<InvoiceEdit />} />
          <Route path="/finance/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/finance/invoices/:id/edit" element={<InvoiceEdit />} />
          <Route path="/finance/quotations" element={<Quotations />} />
          <Route path="/finance/quotations/new" element={<QuotationEdit />} />
          <Route path="/finance/quotations/:id" element={<QuotationDetail />} />
          <Route path="/finance/quotations/:id/edit" element={<QuotationEdit />} />
          <Route path="/finance/receipts" element={<Receipts />} />
          <Route path="/finance/receipts/new" element={<ReceiptNew />} />
          <Route path="/finance/receipts/:id" element={<ReceiptDetail />} />
          <Route path="/finance/reconciliation" element={<FeatureGate feature="reconciliation"><Reconciliations /></FeatureGate>} />
          <Route path="/finance/reconciliation/new" element={<ReconciliationNew />} />
          <Route path="/finance/reconciliation/:id" element={<ReconciliationDetail />} />
          <Route path="/finance/reports" element={<Reports />} />
          <Route path="/finance-officer" element={<FinanceOfficer />} />
          <Route path="/finance-officer/admin" element={<FinanceOfficerAdmin />} />
          <Route path="/hr" element={<FeatureGate feature="hr"><HRHome /></FeatureGate>} />
          <Route path="/hr/employees" element={<Employees />} />
          <Route path="/hr/employees/new" element={<EmployeeEdit />} />
          <Route path="/hr/employees/:id" element={<EmployeeProfile />} />
          <Route path="/hr/employees/:id/edit" element={<EmployeeEdit />} />
          <Route path="/hr/employees/:id/documents" element={<EmployeeDocuments />} />
          <Route path="/hr/employees/:id/onboarding" element={<OnboardingChecklist />} />
          <Route path="/hr/employees/:id/offboarding" element={<OffboardingChecklist />} />
          <Route path="/hr/settings" element={<HrSettings />} />
          <Route path="/hr/leave" element={<LeaveHome />} />
          <Route path="/hr/leave/settings" element={<LeaveSettings />} />
          <Route path="/hr/attendance" element={<AttendanceHome />} />
          <Route path="/hr/attendance/settings" element={<AttendanceSettings />} />
          <Route path="/hr/compliance" element={<ComplianceHome />} />
          <Route path="/hr/officer" element={<HrOfficer />} />
          <Route path="/transcribe" element={<TranscribeHome />} />
          <Route path="/transcribe/studio" element={<TranscribeStudio />} />
          <Route path="/transcribe/officer" element={<TranscribeOfficer />} />
          <Route path="/transcribe/:id" element={<TranscriptDetail />} />
          <Route element={<ErrorBoundary><Outlet/></ErrorBoundary>}>
            <Route path="/crm" element={<CRMHome />} />
            <Route path="/crm/contacts" element={<CRMContacts />} />
            <Route path="/crm/contacts/:id" element={<CRMContactDetail />} />
            <Route path="/crm/import-amelie" element={<CRMAmelieImport />} />
            <Route path="/crm/import-hba" element={<CRMHBAImport />} />
            <Route path="/crm/import-friend-finder" element={<CRMFADSFinderImport />} />
            <Route path="/crm/leads" element={<CRMLeads />} />
            <Route path="/crm/automations" element={<CRMAutomations />} />
            <Route path="/crm/tasks" element={<CRMTasks />} />
            <Route path="/crm/offers" element={<CRMOffers />} />
            <Route path="/crm/settings" element={<CRMSettings />} />
          </Route>
          <Route path="/assistant" element={<AssistantHome />} />
          <Route path="/ai-team" element={<AiTeam />} />
          <Route path="/school/reports" element={<SchoolReports />} />
          <Route path="/school/reports/new" element={<SchoolReportCardEdit />} />
          <Route path="/school/reports/:id" element={<SchoolReportCardDetail />} />
          <Route path="/school/reports/:id/edit" element={<SchoolReportCardEdit />} />
          <Route path="/church/reports" element={<ChurchReports />} />
          <Route path="/church/giving" element={<ChurchGiving />} />
          <Route path="/getting-started" element={<GettingStarted />} />
          <Route path="/help" element={<HelpCentre />} />
          <Route path="/payroll" element={<PayrollHome />} />
          <Route path="/payroll/new" element={<PayrollRunEdit />} />
          <Route path="/payroll/:id/edit" element={<PayrollRunEdit />} />
          <Route path="/payroll/:id" element={<PayrollRunDetail />} />
          <Route path="/payroll/:id/payslip/:employeeId" element={<Payslip />} />
          <Route path="/inventory" element={<FeatureGate feature="inventory"><InventoryHome /></FeatureGate>} />
          <Route path="/inventory/new" element={<InventoryItemEdit />} />
          <Route path="/inventory/:id" element={<InventoryItemDetail />} />
          <Route path="/inventory/:id/edit" element={<InventoryItemEdit />} />
          <Route path="/affiliate" element={<AffiliateCentre />} />
          <Route path="/affiliate/resources" element={<AffiliateResourceCentre />} />
          <Route path="/affiliate/admin" element={<AffiliateAdmin />} />
          <Route path="/subscription" element={<SubscriptionPlans />} />
          <Route path="/subscription/checkout" element={<SubscriptionCheckout />} />
          <Route path="/subscription/success" element={<SubscriptionSuccess />} />
          <Route path="/subscription/manage" element={<SubscriptionManage />} />
          <Route path="/subscription/admin" element={<SubscriptionAdmin />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/platform-admin" element={<PlatformAdmin />} />
          <Route path="/beta-readiness" element={<BetaReadiness />} />
          <Route path="/beta-packaging" element={<BetaPackaging />} />
          <Route path="/team" element={<Team />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/manage-organisations" element={<ManageOrganisations />} />
          <Route path="/admin/customer-subscriptions" element={<AdminCustomerSubscriptions />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/account" element={<Account />} />
          <Route path="/permissions" element={<Permissions />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="/reviewer-access" element={<ReviewerAccess />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <ThemeProvider attribute="class" defaultTheme="system">
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App