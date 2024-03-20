import { Outlet, createFileRoute } from '@tanstack/react-router'
import Database from "@tauri-apps/plugin-sql";
import { ClerkProvider } from "@clerk/clerk-react"
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
        AppLayout
        <Outlet />
        </ClerkProvider>
    </div>
  )
}

export default AppLayout