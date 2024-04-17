import { createFileRoute } from '@tanstack/react-router'
import Database from "@tauri-apps/plugin-sql";

export const Route = createFileRoute('/_app/_workbench/projects/$pid')({
  component: Project,

  loader: async () => {
      const db = await Database.load("sqlite:glassypdm.db")
      const result = await db.select(
          "SELECT debug_url FROM server WHERE active = 1" // TODO url
      );
      const url = (result as any)[0].debug_url;
      // TODO fetch /project?pid={pid}
      return {
          url: url
      }
  }
})

function Project() {
    const loaderData = Route.useLoaderData();
    const { pid } = Route.useParams();
  return <div>project ID: {pid}</div>
}