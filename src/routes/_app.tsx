import { Navigate, Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-react"
import { invoke } from '@tauri-apps/api/core';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { listen } from '@tauri-apps/api/event';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
export const Route = createFileRoute('/_app')({
  component: AppLayout,

  loader: async () => {
    await invoke("check_update");
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
  const [ updateAvailable, setUpdateAvailable] = useState(false)
  const [ updateFinish, setUpdateFinish] = useState(false)

  listen('update', (event) => {
    console.log(event)
    setUpdateAvailable(true)
  })

  listen('update-finish', (event) => {
    console.log(event)
    setUpdateFinish(true)
  })

  async function restart() {
    await invoke("restart");
  }

  return (
    <div>
      <ClerkProvider publishableKey={publickey}>
        <SignedOut>
          <Navigate to='/signin' />
          <Outlet />
          </SignedOut>
        <SignedIn>
          <Outlet />
          <AlertDialog defaultOpen={updateAvailable} open={updateAvailable}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className='flex flex-row items-center space-x-4'> <Loader2 className='span animate-spin'/>Installing updates...</AlertDialogTitle>
              </AlertDialogHeader>
              <Progress value={40}/>
              <Button disabled={!updateFinish} onClick={restart}>Restart glassyPDM</Button>
            </AlertDialogContent>
          </AlertDialog>
        </SignedIn>
      </ClerkProvider>
    </div>
  )
}

export default AppLayout