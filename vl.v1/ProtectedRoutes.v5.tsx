import { type ReactNode } from "react"
import { useAuthContext } from "../context/AuthContext"
import { Navigate, useLocation } from "react-router"

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
    const { authStatus } = useAuthContext()
    const location = useLocation()

    if (authStatus === "loading") return <div>{/* empty */}</div>; // Hydrate
    if (authStatus === "unauthenticated") return <Navigate to="/login" state={{ from: location }} replace />
    if (authStatus === "authenticated") return children
}

export default ProtectedRoute   