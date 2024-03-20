import { createFileRoute } from '@tanstack/react-router'
import React from 'react'

export const Route = createFileRoute('/_app/_workbench/workbench')({
    component: Workbench,
})

function Workbench() {
  return (
    <div>Workbench</div>
  )
}

export default Workbench