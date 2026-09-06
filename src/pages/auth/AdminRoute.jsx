import { Navigate, Outlet } from "react-router-dom";

export default function AdminRoute() {
    const userString = localStorage.getItem("user");
    const user = userString ? JSON.parse(userString) : null;

    if (!user || !user.is_admin) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}