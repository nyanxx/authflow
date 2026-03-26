/* eslint-disable react-refresh/only-export-components */
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode
} from "react";
import { BACKEND_URL } from "../config";

/* =============================================[AuthContext]============================================= */

export type User = {
    name: string | null
    accessToken: string | null
}

type AuthContextValue = {
    user: User,
    setUser: React.Dispatch<React.SetStateAction<User>>,
    logout: () => void,
    authStatus: "loading" | "authenticated" | "unauthenticated",
    setAuthStatus: React.Dispatch<React.SetStateAction<"loading" | "authenticated" | "unauthenticated">>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)


/* =============================================[useAuthContext Hook]============================================= */


export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("AuthContext must be used inside provider")
    }
    return context
}


/* =============================================[useAuthFetch Hook]============================================= */

/**
 * === useAuthFetch Custom Hook ===
 * 
 * We had to wrap the "fetchWithAuth" in a custom hook as it uses the data form authContext,
 * and we cannot use useAuthContext which is neither a React function component nor a custom React Hook function.
 * That's why we used the useAuthContect in the custom hook and that custom hook return a "fetchWithAuth" while utilizes
 * the data of authContext. 
 * 
 * SCOPE: Update the "fetchWithAuth" to use "axios"  
 * 
 * @returns Returns a async wrapper function around fetch which returns response or undefined
 */
export const useAuthFetch = () => {
    const { user, setUser, logout } = useAuthContext()

    const fetchWithAuth = useCallback(async (ROUTE: string, options: RequestInit = {}, isRetry = false): Promise<Response> => {
        const token = user.accessToken
        try {
            const response = await fetch(`${BACKEND_URL}/${ROUTE}`, {
                ...options,
                credentials: "include",
                headers: {
                    ...(options.headers || {}),
                    ...(token && { Authorization: `Bearer ${token}` }),
                    ...(options.body && !(options.body instanceof FormData) && {
                        "Content-Type": "application/json"
                    })
                }
            })

            if (response.ok) {
                return response
            }

            if (!response.ok && !isRetry) {

                const refreshResponse = await fetch(`${BACKEND_URL}/refresh`, {
                    method: "POST",
                    credentials: "include",
                })

                let data = null;
                try {
                    data = await refreshResponse.json();
                } catch { /* empty */ }

                if (!refreshResponse.ok) {
                    logout()
                    throw new Error("Unauthorized")
                }

                if (refreshResponse.ok) {
                    // Add new token in auth context
                    const newToken = data.accessToken
                    setUser(prevState => ({
                        ...prevState,
                        accessToken: newToken
                    }))
                }

                // Retry
                return await fetchWithAuth(ROUTE, options, true);
            }


            if (!response.ok && isRetry) {
                logout()
                throw new Error("Request failed after retry");
            }

            throw new Error(`Request failed with status ${response.status}`)
        } catch (error) {
            console.error(error)
            // logout()  // using logout here will logout even if there is json parse, network error or server crash, this is not intended
            throw error
        }

    }, [logout, setUser, user.accessToken])

    return fetchWithAuth
}

/* =============================================[AuthContextProvider]============================================= */

/**
 * === AuthContextProvider ===
 * 
 * Whole app is encapsulated in this provider so you could assume this as an entry point
 * As soon as the app starts this provider will run and along with it the useEffect in it.
 * As it have empty dependency array it will run on mount only 
 * When you refresh, you restart / reload the app making it run once on mount only 
 * This is the standard practice and known as session hydration - restoring auth state on app load.
 * 
 * @param children - React node to be rendered inside the provider 
 * @returns A context provider wrapping the application
 */
export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User>({
        name: null,
        accessToken: null
    })
    const [authStatus, setAuthStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading") // this is connected to useEffect

    const logout = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/logout`, {
                method: "POST",
                credentials: "include"
            })
            response.json().then(data => console.log(data)).catch()
        } catch (error) {
            console.error(error)
        } finally {
            // This feels wrong to remove the client side login data irrespectively of wheather the backend removes the cookie or not. As the cookie will have it expiry it's fine but still take some feedback!
            setUser({
                name: null,
                accessToken: null
            })
            setAuthStatus("unauthenticated")
        }
    }

    useEffect(() => {
        /**
         * This runs only once per app mount, not per route hit.
         * At this point your access token (access token is not persistant, it get remove on all refresh or reload) will not be there.
         * So if the user have valid refresh token as cookie they will get a new access token added in the memory / state.
         * If not the auth status will be set to "unauthenticated".
         * Based on this statuses like authenticated, unauthenticated or loading the user make to respective page like protected page, login page or loading page.
         * In short this is the point where it is determined the auth status from "loading" (default) to "authenticated" or "unauthenticated"
         */
        const init = async () => {
            try {
                // NOTE: if the server crashes or is down the auth status is stucked in loading state (if using axios may be we can use the timeout feature)
                const response = await fetch(`${BACKEND_URL}/refresh`, {
                    method: "POST",
                    credentials: "include",
                })

                if (!response.ok) {
                    return setAuthStatus("unauthenticated")
                    // throw new Error("Refresh Failed")
                }

                let data = null
                try { data = await response.json() } catch { return setAuthStatus("unauthenticated") }

                if (response.ok) {
                    // Add new token in auth context
                    setUser(prevState => ({
                        ...prevState,
                        accessToken: data.accessToken
                    }))
                    setAuthStatus("authenticated")
                }

            } catch (err) {
                console.error(err);
                setAuthStatus("unauthenticated");

            }

        };

        init();
    }, []);


    return (
        <AuthContext.Provider value={{
            user,
            setUser,
            logout,
            authStatus,
            setAuthStatus
        }}>
            {children}
        </AuthContext.Provider>
    )
}