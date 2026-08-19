import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage.jsx";
import SignupPage from "./pages/auth/SignupPage.jsx";
import OtpVerifyPage from "./pages/otp/OtpVerifyPage.jsx";
import OAuthCallbackPage from "./pages/auth/OAuthCallbackPage.jsx";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage.jsx";
import DashboardLayout from "./components/layout/DashboardLayout.jsx";
import RequireAuth from "./pages/auth/RequireAuth.jsx";
import DashboardPage from "./pages/dashboard/DashboardPage.jsx";
import MyLoansPage from "./pages/loans/MyLoansPage.jsx";
import PaymentsPage from "./pages/payments/PaymentsPage.jsx";
import ProfilePage from "./pages/profile/ProfilePage.jsx";
import SupportPage from "./pages/support/SupportPage.jsx";

export default function App() {
    return (
        <>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/verify-otp" element={<OtpVerifyPage />} />
                <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                <Route
                    path="/dashboard"
                    element={
                        <RequireAuth>
                            <DashboardLayout />
                        </RequireAuth>
                    }
                >
                    <Route index element={<DashboardPage />} />
                    <Route path="loans" element={<MyLoansPage />} />
                    <Route path="payments" element={<PaymentsPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="support" element={<SupportPage />} />
                </Route>

                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </>
    );
}