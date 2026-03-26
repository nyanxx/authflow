import { type ReactNode } from "react"
import { useAuthContext } from "../context/AuthContext"
import { Navigate, useLocation } from "react-router"

// the protected route is what make the redirection 
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
    const {
        // isAuthenticated,
        // authLoading
        authStatus
    } = useAuthContext()
    const location = useLocation()

    // if (authLoading) return <div>Loading...</div>;
    // if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />

    if (authStatus === "loading") return <div></div>; // hydrate
    if (authStatus === "unauthenticated") return <Navigate to="/login" state={{ from: location }} replace />
    if (authStatus === "authenticated") return children
}

export default ProtectedRoute   