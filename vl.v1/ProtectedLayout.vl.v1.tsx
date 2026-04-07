import { useAuthContext } from "../context/AuthContext";
import { Navigate, Outlet, useLocation } from "react-router-dom";

const ProtectedLayout = () => {
  const { authStatus } = useAuthContext();
  const location = useLocation();

  if (authStatus === "loading") return <div>{/* empty */}</div>; // Hydrate
  if (authStatus === "unauthenticated")
    return <Navigate to="/signin" state={{ from: location }} replace />;
  if (authStatus === "authenticated") return <Outlet />;
};

export default ProtectedLayout;

/**
 *
 * Usage: router.(ts/tsx)
 *   ....
 *   {
 *      path: "user",
 *      Component: ProtectedLayout,
 *      children: [
 *        {
 *          path: "",
 *          Component: UserLayout,
 *          children: [
 *            { index: true, Component: UserDashboard },
 *            { path: "income", Component: Income },
 *            { path: "transfer", Component: Transfer },
 *            ......
 *
 */
