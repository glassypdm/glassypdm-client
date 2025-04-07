import React from 'react'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Button } from '../ui/button'

function InviteMember() {
  return (
    <div>
        <Dialog>
            <DialogTrigger asChild>
                <Button variant={'outline'}>Invite Member</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Invite Member</DialogTitle>
            </DialogContent>
        </Dialog>
    </div>
  )
}

export default InviteMember