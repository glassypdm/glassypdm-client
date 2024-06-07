import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/download')({
  component: () => <div>Hello /_app/download!</div>
})