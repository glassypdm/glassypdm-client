import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import Database from "@tauri-apps/plugin-sql";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-react"
import SignIn from './_app/signin';
export const Route = createFileRoute('/_app')({
  component: AppLayout,

  loader: async () => {
    const db = await Database.load("sqlite:testing.db")
    const result = await db.select(
      "SELECT clerk_publickey FROM server WHERE active = 1"
    );
    console.log(result)
    if((result as any).length == 0) {
      throw redirect({
        to: "/serversetup"
      })
    }
    else {
      console.log(result)
      return {
        publickey: (result as any)[0].clerk_publickey
      }
    }
  }
})


function AppLayout() {
  const a = Route.useLoaderData();
  console.log(a)

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