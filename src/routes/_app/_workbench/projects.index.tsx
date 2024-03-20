import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute('/_app/_workbench/projects/')({
    component: ProjectsIndex
})

function ProjectsIndex() {
    return (
        <div>project index</div>
    )
}