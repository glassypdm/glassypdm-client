import { useEffect } from 'react';
import { Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from "@clerk/clerk-react"


export const Route = createFileRoute('/_app')({
  component: WorkbenchLayout
})


function WorkbenchLayout() {
    const { userId, isLoaded } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if(!userId) {
            navigate({ to: "/signin" });
        }
    })
    return (
        <div>
            <Outlet />
        </div>
    )
}

export default WorkbenchLayout