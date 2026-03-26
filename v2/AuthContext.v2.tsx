/* eslint-disable react-refresh/only-export-components */
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode
} from "react";
import { BACKEND_URL } from "../config";

/* =============================================[AuthContext]============================================= */

export type User = {
    id: string | null
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
 * @returns Returns a async wrapper function around fetch which returns response or undefined
 */
export const useAuthFetch = () => {
    const { user, setUser, logout } = useAuthContext()

    const fetchWithAuth = async (ROUTE: string, options = {}, isRetry = false): Promise<Response> => {
        let token = user.accessToken
        try {
            const response = await fetch(`${BACKEND_URL}/${ROUTE}`, {
                ...options,
                credentials: "include",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
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

                const data = await refreshResponse.json()

                if (refreshResponse.status === 401) {
                    logout()
                    throw new Error("Unauthorized")
                }

                if (refreshResponse.ok) {
                    // Add new token in auth context
                    token = data.accessToken
                    setUser(prevState => ({
                        ...prevState,
                        accessToken: token
                    }))
                }

                // Retry
                return await fetchWithAuth(ROUTE, options, true);


            }

            throw new Error(`Request failed with status ${response.status}`)
        } catch (error) {
            console.error(error)
            // logout()  // using logout here will logout even if there is json parse, network error or server crash, this is not intended
            // return navigate("/login")
            // throw new Error("Unauthorized")
            throw error
        }

    }

    return fetchWithAuth
}

/* =============================================[AuthContextProvider]============================================= */

/**
 * === AuthContextProvider ===
 * 
 * Whole app is encapsulated in this provider so you could assume this as an entry point
 * As soon as then app starts this provider will run and along with it the useEffect in it.
 * As it don't have and dependency array and an empty array it will run on mount only 
 * When you refresh you restart / reload then app making it run once on mount only 
 * This is the standard practice and known as session hydration - restoring auth state on app load.
 * 
 * @param children - React node to be rendered inside the provider 
 * @returns A context provider wrapping the application
 */
export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User>({
        id: null,
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
            const data = await response.json()
            console.log(data)
        } catch (error) {
            console.error(error)
        } finally {
            setUser({
                id: null,
                name: null,
                accessToken: null
            })
            setAuthStatus("unauthenticated")
        }
    }

    useEffect(() => {
        //  This runs only once per app mount, not per route.
        const init = async () => {
            try {
                // if the server crashes or is down the auth status is stucked in loading state
                const response = await fetch(`${BACKEND_URL}/refresh`, {
                    method: "POST",
                    credentials: "include",
                })

                const data = await response.json()

                // if refresh token is not valid
                if (!response.ok) {
                    setAuthStatus("unauthenticated")
                    throw new Error("Refresh Failed")
                }

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