import { useEffect } from 'react';
import { Navigate, Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import { SignedIn, SignedOut, useAuth } from "@clerk/clerk-react"
import { Button } from '@/components/ui/button';


export const Route = createFileRoute('/_app/_workbench')({
  component: WorkbenchLayout
})


function WorkbenchLayout() {
    const { userId, isLoaded, isSignedIn, signOut } = useAuth();
    const navigate = useNavigate();

    /*
    useEffect(() => {
        if(!userId) {
            console.log("navigating back to /signin");
            navigate({ to: "/signin" });
        }
    })
    */
    return (
        <div>
            <SignedOut>
                <Navigate to='/signin'/>
            </SignedOut>
            <SignedIn>
                <Button onClick={() => signOut()}>Sign Out</Button>
                <Outlet />
            </SignedIn>
        </div>
    )
}

export default WorkbenchLayout