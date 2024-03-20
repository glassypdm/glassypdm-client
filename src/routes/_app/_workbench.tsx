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


    return (
        <div>
        <Button onClick={() => signOut()}>Sign Out</Button>
        <Outlet />
        </div>
    )
}

export default WorkbenchLayout