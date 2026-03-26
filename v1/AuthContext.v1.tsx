/* eslint-disable react-refresh/only-export-components */
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode
} from "react";
import { BACKEND_URL } from "../config";

export type User = {
    id: string | null
    name: string | null
    accessToken: string | null
}

type AuthContextValue = {
    user: User,
    // isAuthenticated: boolean,
    setUser: React.Dispatch<React.SetStateAction<User>>,
    logout: () => void,
    authStatus: "loading" | "authenticated" | "unauthenticated",
    setAuthStatus: React.Dispatch<React.SetStateAction<"loading" | "authenticated" | "unauthenticated">>
    // authLoading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("AuthContext must be used inside provider")
    }
    return context
}


/**
 * 
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
                // method: "GET",
                credentials: "include",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            })

            // if access token is valid -> return response
            if (response.ok) {
                // const data = await response.json()
                // const meData: string[] = data.routeStatus.data.data
                // if (meData) setMyData(meData)
                // if (meData) return meData
                return response
            }

            // if access token is invalid and not a retry -> refresh
            if (!response.ok && !isRetry) {

                // try refresh to get new access token 
                const refreshResponse = await fetch(`${BACKEND_URL}/refresh`, {
                    method: "POST",
                    credentials: "include",
                })

                const data = await refreshResponse.json()

                // if refresh token is not valid -> logout and throw error
                if (refreshResponse.status === 401) {
                    // console.log(data) // printing the response form the failed /refresh (if only you have specified it in the backend)
                    // console.log("Session expired")
                    logout()
                    // return navigate("/login")
                    // or may be redirect() form react router dom
                    throw new Error("Unauthorized")
                }

                // if refresh token is not valid -> add newly fetchd token
                if (refreshResponse.status === 200) {
                    // Add new token in auth context
                    token = data.accessToken
                    setUser(prevState => ({
                        ...prevState,
                        accessToken: token
                    }))
                }

                // retry the original fetch after the new access token is being added
                return await fetchWithAuth(ROUTE, options, true);
                // const retryResponse = await fetchWithAuth(ROUTE, options, true);
                // const retryResponse = await fetch(`${BACKEND_URL}/${ROUTE}`, {
                //     ...options,
                //     // method: "GET",
                //     credentials: "include",
                //     headers: {
                //         "Authorization": `Bearer ${token}`,
                //         "Content-Type": "application/json"
                //     }
                // })

                // if access token is valid -> return retried response
                // if (retryResponse.status === 200) {
                // const data = await retryResponse.json()
                // const meData: string[] = data.routeStatus.data.data
                // if (meData) return meData
                //     return retryResponse
                // } else {
                //     throw new Error("Unauthorized")
                // }

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



/**
 * AuthContextProvider
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

    // const [authLoading, setAuthLoading] = useState(true);
    // const isAuthenticated = !!user.accessToken

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
                // if (response.status === 401) {
                if (!response.ok) {
                    // console.log(data) // printing the response form the failed /refresh (if only you have specified it in the backend)
                    setAuthStatus("unauthenticated")
                    // logout()
                    // return navigate("/login")
                    // redirect("/login")
                    // or may be redirect() form react router dom
                    throw new Error("Refresh Failed")
                    // return // even if i return the finally block will run right?
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
            // finally {
            //     // setAuthLoading(false);
            // }
        };

        init();
    }, []);


    return (
        <AuthContext.Provider value={{
            user,
            // isAuthenticated,
            setUser,
            logout,
            authStatus,
            setAuthStatus
            // authLoading,
        }}>
            {children}
        </AuthContext.Provider>
    )
}