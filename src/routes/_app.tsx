import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-react"
import SignIn from './_app/signin';
import { invoke } from '@tauri-apps/api/core';
export const Route = createFileRoute('/_app')({
  component: AppLayout,

  loader: async () => {
    const result = await invoke("get_server_clerk");
    const name: string = await invoke("get_server_name");
    if((result as any).length == 0) {
      throw redirect({
        to: "/serversetup"
      })
    }
    else {
      console.log(result)
      return {
        publickey: result as any,
        name: name
      }
    }
  }
})


function AppLayout() {
  const a = Route.useLoaderData();

  return (
    <div>
      <ClerkProvider publishableKey={a.publickey}>
        <SignedOut>
          <SignIn />
        </SignedOut>
        <SignedIn>
          <Outlet />
        </SignedIn>
      </ClerkProvider>
    </div>
  )
}

export default AppLayout