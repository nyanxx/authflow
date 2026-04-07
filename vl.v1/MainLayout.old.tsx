import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useAuthContext, useAuthFetch } from "../context/AuthContext";
import { useEffect } from "react";
import { PROFILE_ENDPOINT } from "../config";

const MainLayout = () => {
  const { authStatus, logout, userData, setUserData } = useAuthContext();
  const navigate = useNavigate();
  const fetchWithAuth = useAuthFetch();

  useEffect(() => {
    if (authStatus === "authenticated") {
      fetchWithAuth(PROFILE_ENDPOINT)
        .then((res) => res.json())
        .then((data) => {
          setUserData({ name: data.username });
        })
        .catch((err) => console.error(err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, setUserData]);

  if (authStatus === "loading") return <div>{/* empty */}</div>; // hydrate

  return (
    <>
      <header className="bg-black text-white py-4 px-13 md:px-25 shadow-md font-semibold flex justify-between">
        <div className="flex gap-5 items-center relative overflow-hidden">
          <Link to={"/"} className="pr-40">
            <h1 className="text-xl absolute inset-0 opacity-0 -translate-y-0.5 animate-fadeup [animation-delay:0s] inline-flex items-center">
              Auth Practice
            </h1>
            <h1 className="text-xl absolute inset-0 opacity-0 -translate-y-0.5 animate-fadeup [animation-delay:3s] inline-flex items-center">
              Kanban
            </h1>
          </Link>
        </div>

        <nav className="flex items-center justify-center gap-5">
          {authStatus === "unauthenticated" && (
            <>
              <NavLink
                to="/login"
                className="h-full text-white text-sm px-2 rounded-lg hover:text-violet-500 cursor-pointer inline-flex items-center "
              >
                Login
              </NavLink>
              {/* <NavLink
                to="/register"
                className="h-full text-white text-sm px-2 rounded-lg hover:text-violet-500 cursor-pointer inline-flex items-center "
              >
                Register
              </NavLink> */}
            </>
          )}

          {authStatus === "authenticated" && (
            <p className="hidden md:inline-flex items-center border-r-violet-900 border-r-5 px-7 text-nowrap">
              Welcome {userData.name || "User"}
            </p>
          )}

          {authStatus === "authenticated" && (
            <NavLink
              to="/dashboard"
              className="h-full text-white text-sm px-2 rounded-lg hover:text-violet-500 cursor-pointer inline-flex items-center "
            >
              Dashboard
            </NavLink>
          )}

          {authStatus === "authenticated" && (
            <button
              type="button"
              onClick={() => {
                logout();
                return navigate("/");
              }}
              className="h-full text-white text-sm px-2 rounded-lg hover:text-violet-500 cursor-pointer inline-flex items-center "
            >
              Logout
            </button>
          )}
        </nav>
      </header>
      <Outlet />
      <footer className="bg-black text-white py-4 px-13 md:px-25 mt-auto">
        <p>&copy; 2026 Auth Practice</p>
      </footer>
    </>
  );
};

export default MainLayout;
