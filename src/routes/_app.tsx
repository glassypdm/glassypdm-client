import { Navigate, Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-react"
import SignIn from './_app/signin';
import { invoke } from '@tauri-apps/api/core';
export const Route = createFileRoute('/_app')({
  component: AppLayout,

  loader: async () => {
    const result: string = await invoke("get_server_clerk");
    if(result.length == 0) {
      throw redirect({
        to: "/serversetup"
      })
    }
    else {
      console.log(result)
      return {
        publickey: result as string
      }
    }
  }
})


function AppLayout() {
  const { publickey } = Route.useLoaderData();

  return (
    <div>
      <ClerkProvider publishableKey={publickey}>
        <SignedOut>
          <Navigate to='/signin' />
          <Outlet />
          </SignedOut>
        <SignedIn>
          <Outlet />
        </SignedIn>
      </ClerkProvider>
    </div>
  )
}

export default AppLayout