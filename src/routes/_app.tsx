import { Outlet, createFileRoute } from '@tanstack/react-router'
import Database from "@tauri-apps/plugin-sql";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-react"
import SignIn from './_app/signin';
export const Route = createFileRoute('/_app')({
  component: AppLayout,

  beforeLoad: async ({ location }) => {
    // TODO grab the public key from active server
    // SELECT key FROM server WHERE active = 1
    // if it fails, redirect to /serversetup
  }
})

const db = new Database("sqlite:test.db");

function AppLayout() {
  return (
    <div>
      <ClerkProvider publishableKey={""}>
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