import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
import OtpVerifyPage from "./components/OtpVerifyPage";
import OAuthCallbackPage from "./components/OAuthCallbackPage";
import ForgotPasswordPage from "./components/ForgotPasswordPage";
import ResetPasswordPage from "./components/ResetPasswordPage";
import DashboardLayout from "./components/DashboardLayout";
import RequireAuth from "./components/RequireAuth";
import DashboardPage from "./components/DashboardPage";
import MyLoansPage from "./components/MyLoansPage";
import PaymentsPage from "./components/PaymentsPage";
import ProfilePage from "./components/ProfilePage";
import SupportPage from "./components/SupportPage";

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