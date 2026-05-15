import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/auditoria')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/auditoria"!</div>
}
