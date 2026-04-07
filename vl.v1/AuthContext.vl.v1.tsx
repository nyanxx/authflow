import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type UserData = {
  username: string | null;
  id: string | null;
};

/* =============================================[AuthContext]============================================= */

/**
 * The AuthContext Provider will return the following values
 */
type AuthContextValues = {
  token: string | null;
  setToken: React.Dispatch<React.SetStateAction<null | string>>;
  userData: UserData;
  setUserData: React.Dispatch<React.SetStateAction<UserData>>;
  authStatus: "loading" | "authenticated" | "unauthenticated";
  setAuthStatus: React.Dispatch<
    React.SetStateAction<"loading" | "authenticated" | "unauthenticated">
  >;
  login: (loginData: object) => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValues | undefined>(undefined);

/* =============================================[useAuthContext Hook]============================================= */

/**
 * @returns token, setToken, userData, setUserData, logout, login, authStatus, setAuthStatus
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("AuthContext must be used inside AuthContextProvider");
  }
  return context;
};

/* =============================================[useAuthFetch Hook]============================================= */

/**
 * === useAuthFetch Custom Hook ===
 *
 * A custom hook that return an axios based async wrapper to send request with token from auth context.
 *
 * Note: Can only be used in React ecosystem as we are using context for getting the token
 * and hook for return the wrapper. You may have to try something differet if you wnat to use this outside
 * of React ecosystem (like if you are using loader functions)
 *
 * @returns Returns an object containing async wrapper function around axios and logout function.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useAuthFetch = () => {
  const { token, setToken, logout } = useAuthContext();
  const authFetch = useCallback(
    async (
      URL: string,
      options: AxiosRequestConfig = {},
      isRetry = false,
    ): Promise<AxiosResponse> => {
      const accesstoken = token;

      try {
        const response = await axios(`${URL}`, {
          ...options,
          withCredentials: true,
          headers: {
            ...(options.headers || {}),
            ...(token && { Authorization: `Bearer ${accesstoken}` }),
            ...(options.data &&
              !(options.data instanceof FormData) && {
                "Content-Type": "application/json",
              }),
          },
        });

        if (response.status === 200) {
          return response;
        }

        throw new Error(
          `Response returned with unexpected status code:${response.status}`,
        );
      } catch (error) {
        if (error instanceof AxiosError) {
          if (!error.response) console.error("Check network connection!");
          if (error.response) {
            if (error.response.status !== 200 && !isRetry) {
              // Get new token - refresh
              try {
                const refreshResponse = await axios.post(
                  `/api/auth/refresh`,
                  {},
                  {
                    withCredentials: true,
                    headers: {
                      "Content-Type": "application/json",
                    },
                  },
                );

                // Add new token
                if (refreshResponse.status === 200) {
                  const newToken = refreshResponse.data.token;
                  setToken(newToken);
                }
              } catch (error) {
                if (error instanceof AxiosError) {
                  if (!error.response) {
                    console.error("Check network connection!");
                  } else {
                    if (error.response.status !== 200) {
                      // This is the final point of rejection where now the issue is with refreshtoken and we need to forcefully logout
                      logout();
                      throw new Error(
                        `${error.response.data.message || "Unauthorized"}: ${error.response.status}`,
                      );
                    }
                  }
                }
              }

              // Retry
              return authFetch(URL, options, true);
            }
          }
        } else {
          console.error("Unexpected Error:", error);
        }
        throw error;
      }
    },
    [setToken, token, logout],
  );

  return { authFetch, logout };
};

/* =============================================[AuthContextProvider + Session Hydrator]============================================= */

/**
 * === AuthContextProvider + Session Hydrator ===
 *
 * AuthContextProvider component to wrap around you application.
 * Provide AuthContextValues throught your app.
 * Session hydration in `useEffect()`so as soon as the app loads auth status will be set to authenticated or unauthenticated.
 * (Session Hydration: Standard practice of restoring auth state on app load or reload.)
 *
 * @param children - React node to be rendered inside the provider
 * @returns A context provider wrapping the application
 */
export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<null | string>(null);
  const [userData, setUserData] = useState<UserData>({
    username: null,
    id: null,
  }); // User data can be retrived from token payload (if available) or some provided api route.
  const [authStatus, setAuthStatus] = useState<
    "loading" | "authenticated" | "unauthenticated"
  >("loading");

  const _set_login = (token: string) => {
    setToken(token);
    setAuthStatus("authenticated");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_header, payload, _signature] = token.split(".");
    try {
      const { id, username } = JSON.parse(atob(payload));
      setUserData({ username, id });
    } catch {
      /* empty */
    }
  };

  const login = async (loginData: object): Promise<boolean> => {
    try {
      const response = await axios.post("/api/auth/login", loginData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status === 200) {
        _set_login(response.data.token);
        return true;
      }
      return false;
    } catch (error) {
      setAuthStatus("unauthenticated");
      console.error(error);
      return false;
    }
  };

  const logout = async () => {
    try {
      const response = await axios.post(
        "/api/auth/logout",
        {},
        {
          withCredentials: true,
        },
      );

      if (response.status === 200) {
        // console.log(response.data);
      }
    } catch (error) {
      // SCOPE: Axio error handling can be added here
      console.error(error);
    } finally {
      setToken(null);
      setUserData({
        username: null,
        id: null,
      });
      setAuthStatus("unauthenticated");
    }
  };

  /* =============================================[Session Hydration]============================================= */

  useEffect(() => {
    /**
     * This run only once per app mount, not per route hit.
     * If you are storing your access token in state with make it not persistant and will get removed on refresh or reload.
     * So if the user have valid refresh token in cookie they will be able to get new access token.
     * If not the auth status will be set to "unauthenticated".
     * Based on this statuses like authenticated, unauthenticated or loading the user can make changes to respective page like protected page, login page or loading page.
     * In short this is the point where it is determined the auth status from "loading" (default) to "authenticated" or "unauthenticated"
     */
    const init = async () => {
      try {
        // TODO: What if the server crashes or is down? the auth status may stucked in loading state (can we use the timeout feature here?)
        const response = await axios.post(
          "/api/auth/refresh",
          {},
          {
            withCredentials: true,
          },
        );

        if (!(response.status === 200)) {
          return setAuthStatus("unauthenticated");
        }

        if (response.status === 200) {
          // Add new token in auth context
          _set_login(response.data.token);
        }
      } catch {
        // console.error("SessionHydrationError:", err);
        // console.error("SH_Err");
        setAuthStatus("unauthenticated");
      }
    };

    init();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        setToken,
        userData,
        setUserData,
        login,
        logout,
        authStatus,
        setAuthStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
