import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@clerk/clerk-react";
import { createFileRoute } from "@tanstack/react-router";
import Database from "@tauri-apps/plugin-sql";
import { useEffect, useState } from "react";

export const Route = createFileRoute('/_app/_workbench/projects/')({
    component: ProjectsIndex,

    loader: async () => {
        const db = await Database.load("sqlite:testing.db")
        const result = await db.select(
            "SELECT debug_url FROM server WHERE active = 1" // TODO url
        );
        const url = (result as any)[0].debug_url;
        //const projects = await fetch(url + "/projects");
        //console.log(projects)
        return {
            url: url
        }
    }
})

function ProjectsIndex() {
    const [projects, setProjects] = useState([])
    const { user } = useUser();
    const owo = Route.useLoaderData();
    console.log(owo)

    if (!user) {
        return null;
    }

    // FIXME dont use useEffect for fetching, lmao
    useEffect(() => {
        fetch(owo.url + "/projects?user=" + user.id)
            .then((res: Response) => res.json())
            .then((boop: any) => {
                setProjects(boop.projects)
                console.log(boop.projects)
            })
    }, [])


    return (
        <div className="flex flex-row">
            <div className="flex flex-col mr-16 space-y-2 items-center">
            <h1 className="text-2xl font-semibold">Projects</h1>
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant={"outline"}>Create Project</Button>
                </DialogTrigger>
                <DialogContent> {/** TODO this can/should be broken into its own component */}
                    <DialogHeader>
                        <DialogTitle>Create a new Project</DialogTitle>
                    </DialogHeader>
                    <Input placeholder="Project Name" />
                    <Select>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a team" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Sun Devil Motorsports">Sun Devil Motorsports</SelectItem>
                            <SelectItem value="Acme Inc">Acme Inc</SelectItem>
                        </SelectContent>
                    </Select>
                    <DialogFooter>
                        <Button>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            </div>
            <div className="flex flex-col grow">
                {
                    projects.length == 0 ? 
                    <div>
                        <Skeleton className="mb-2 h-24" />
                        <Skeleton className="mb-2 h-24" />
                        <Skeleton className="mb-2 h-24" />
                    </div> :
                    projects.map((project: any) => {
                        return (
                            <Card className="grid grid-cols-2 items-center mb-2" key={project.id}>
                            <CardHeader className="justify-self-start">
                                <CardTitle>{project.name}</CardTitle>
                                <CardDescription>{project.team}</CardDescription>
                            </CardHeader>
                            <CardContent className="justify-self-end flex flex-row space-x-4 items-center">
                                <p className="text-sm text-muted-foreground">Last updated 04/09/2024, 11:49:36 AM</p>
                                <Button onClick={() => {console.log(project.id)}}>View</Button>
                            </CardContent>
                            </Card>
                    )
                    })
                }
                <Card className="grid grid-cols-2 items-center mb-2">
                    <CardHeader className="justify-self-start">
                        <CardTitle>Hardware Design Project</CardTitle>
                        <CardDescription>Acme Inc</CardDescription>
                    </CardHeader>
                    <CardContent className="justify-self-end flex flex-row space-x-4 items-center">
                        <p className="text-sm text-muted-foreground">Last updated 04/09/2024, 11:49:36 AM</p>
                        <Button>View</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}