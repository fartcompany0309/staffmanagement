import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AttendanceReport from './pages/AttendanceReport';
import CheckoutReport from './pages/CheckoutReport';
import DevReset from './pages/DevReset';
import ShiftSubmit from './pages/ShiftSubmit';
import ShiftForm from './pages/ShiftForm';
import ReportItemsAdmin from './pages/ReportItemsAdmin';
import StoreGroupsAdmin from './pages/StoreGroupsAdmin';
import StoresAdmin from './pages/StoresAdmin';
import AdminMenu from './pages/AdminMenu';
import ReportSummary from './pages/ReportSummary';
import ReportDetail from './pages/ReportDetail';
import AdminShifts from './pages/AdminShifts';
import AttendanceManage from './pages/AttendanceManage';
import CheckoutManage from './pages/CheckoutManage';
import Announcements from './pages/Announcements';
import AnnouncementSend from './pages/AnnouncementSend';
import SystemSettingsAdmin from './pages/SystemSettingsAdmin';
import MyPage from './pages/MyPage';
import AdminScopesManage from './pages/AdminScopesManage';
import ReportAggregate from './pages/ReportAggregate';
import ActivityLogs from './pages/ActivityLogs';
import CarrierLookup from './pages/CarrierLookup';
import CarrierDataAdmin from './pages/CarrierDataAdmin';
import TestAccountsAdmin from './pages/TestAccountsAdmin';
import TestLogin from './pages/TestLogin';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/attendance" element={<AttendanceReport />} />
        <Route path="*" element={<Navigate to="/login" />} />
        <Route path="/checkout" element={<CheckoutReport />} />
        <Route path="/dev-reset" element={<DevReset />} />
        <Route path="/shifts" element={<ShiftSubmit />} />
        <Route path="/shifts/new" element={<ShiftForm />} />
        <Route path="/shifts/:year/:month" element={<ShiftForm />} />
        <Route path="/admin/report-items" element={<ReportItemsAdmin />} />
        <Route path="/admin/store-groups" element={<StoreGroupsAdmin />} />
        <Route path="/admin/stores" element={<StoresAdmin />} />
        <Route path="/admin" element={<AdminMenu />} />
        <Route path="/reports" element={<ReportSummary />} />
        <Route path="/reports/:year/:month" element={<ReportDetail />} />
        <Route path="/admin/shifts" element={<AdminShifts />} />
        <Route path="/admin/attendance" element={<AttendanceManage />} />
        <Route path="/admin/checkout" element={<CheckoutManage />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/admin/announcements" element={<AnnouncementSend />} />
        <Route path="/admin/settings" element={<SystemSettingsAdmin />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/admin/scopes" element={<AdminScopesManage />} />
        <Route path="/admin/report-aggregate" element={<ReportAggregate />} />
        <Route path="/admin/logs" element={<ActivityLogs />} />
        <Route path="/carrier-lookup" element={<CarrierLookup />} />
        <Route path="/admin/carrier-data" element={<CarrierDataAdmin />} />
        <Route path="/admin/test-accounts" element={<TestAccountsAdmin />} />
        <Route path="/test-login" element={<TestLogin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;