import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loadTheme } from '../features/themeSlice'
import { Loader2Icon } from 'lucide-react'
import { useUser, SignIn, CreateOrganization, useAuth, useOrganizationList } from '@clerk/clerk-react'
import { fetchWorkspaces } from '../features/workspaceSlice'

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const { loading, workspaces } = useSelector((state) => state.workspace)
    const dispatch = useDispatch()
    const { user, isLoaded } = useUser()
    const { getToken } = useAuth()

    // Fetch the list of organizations directly from Clerk to know the true state
    const { userMemberships, isLoaded: isOrgListLoaded } = useOrganizationList({
        userMemberships: {
            infinite: true,
        },
    });

    // Initial load of theme
    useEffect(() => {
        dispatch(loadTheme())
    }, [])


    // Fetch workspaces from our backend
    useEffect(() => {
        if (isLoaded && user) {
            dispatch(fetchWorkspaces({ getToken }))
        }
    }, [user, isLoaded, userMemberships?.count]) // Re-fetch if membership count changes

    if (!user) {
        return (
            <div className='flex justify-center items-center h-screen bg-white dark:bg-zinc-950'>
                <SignIn />
            </div>
        )
    }

    // Wait for both Auth and Org List to load
    if (loading || !isOrgListLoaded) return (
        <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
            <Loader2Icon className="size-7 text-blue-500 animate-spin" />
        </div>
    )

    // LOGIC FIX: 
    // Only show the Create Form if Clerk confirms the user has NO memberships.
    // If userMemberships.count > 0, it means they created one, even if our DB hasn't synced yet.
    if (user && userMemberships?.count === 0) {
        return (
            <div className='min-h-screen flex justify-center items-center'>
                <CreateOrganization afterCreateOrganizationUrl="/" />
            </div>
        )
    }

    // If Clerk has orgs but our Redux state is empty, we are syncing.
    // Show a loading state instead of the Form.
    if (user && workspaces.length === 0) {
        return (
            <div className='flex flex-col items-center justify-center h-screen bg-white dark:bg-zinc-950 gap-4'>
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />
                <p className="text-zinc-500 text-sm">Setting up your workspace...</p>
            </div>
        )
    }

    return (
        <div className="flex bg-white dark:bg-zinc-950 text-gray-900 dark:text-slate-100">
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col h-screen">
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="flex-1 h-full p-6 xl:p-10 xl:px-16 overflow-y-scroll">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}

export default Layout