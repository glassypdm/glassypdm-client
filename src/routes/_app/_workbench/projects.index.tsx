import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { z } from "zod";

export const Route = createFileRoute('/_app/_workbench/projects/')({
    component: ProjectsIndex,

    loader: async () => {
        const url = await invoke("get_server_url");
        return {
            url: url
        }
    }
})

interface Team {
    name: string
    id: number
}

interface Project {
    title: string
    id: number
}
interface UserProjects {
    userId: string
    managedTeams: Team[]
    projects: Project[]
}

function ProjectsIndex() {
    const { user } = useUser();
    const { getToken } = useAuth();
    const loaderData = Route.useLoaderData();
    const [projectName, setProjectName] = useState("")
    const [selectedTeam, setSelectedTeam] = useState("")
    const [projectMessage, setProjectMessage] = useState("")
    const [disableCreateProject, setDisableCreateProject] = useState(false)
    const { data, isPending, isError, error } = useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const endpoint = (loaderData.url as string) + "/project/user";
            const resp = await fetch(endpoint, {
                headers: { Authorization: `Bearer ${await getToken()}`},
                method: "GET",
                mode: "cors"
            })
            return resp.json();
        }
    })
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: async (teamId: number) => {
            const endpoint = (loaderData.url as string) + "/project"
            return await fetch(endpoint, {
                method: "POST",
                mode: "cors",
                headers: { Authorization: `Bearer ${await getToken()}` },
                body: JSON.stringify({
                    "name": projectName,
                    "teamId": teamId
                })
            })
        },
        onError: (err) => {
            setProjectMessage(err.message)
        },
        onSuccess: async (res) => {
            const data = await res.json();
            if(data.status === "success"){
                setProjectMessage("Project successfully created.")
                queryClient.invalidateQueries({
                    queryKey: ['projects']
                })
                return
            }
            else if(data.status === "project name exists") {
                setProjectMessage("Project name already exists.");
            }
            else if(data.status === "no permission") {
                setProjectMessage("You do not have permission to create a project.")
            }
            else if(data.status === "db error") {
                setProjectMessage("Database error - does your team exist?")
            }
            setDisableCreateProject(false)
        }
    })

    if (!user) {
        return null;
    }

    if(isPending) {
        // TODO proper skeleton
        return (
            <div>
                Projects Loading...
            </div>
        )
    }
    else if(isError) {
        console.log(error)
        return (
            <div>an error occured while fetching data :c</div>
        )
    }

    function createProject() {
        setDisableCreateProject(true)
        if(projectName.length === 0) {
            setProjectMessage("Please input a project name.")
            setDisableCreateProject(false)
            return
        }
        // alphanumeric + whitespace and dashes
        const input = z.string().regex(new RegExp('^[a-zA-Z0-9 -]+$'));
        if(!input.safeParse(projectName).success) {
            setProjectMessage("Project name is not valid.")
            setDisableCreateProject(false)
            return
        }

        const teamId = parseInt(selectedTeam)
        if(Number.isNaN(teamId)) {
            setProjectMessage("Please select a team.")
            setDisableCreateProject(false)
            return
        }

        // do mutate
        mutation.mutate(teamId)
    }

    return (
        <div className="flex flex-row">
            <div className="flex flex-col mr-16 space-y-2 items-center">
            <h1 className="text-2xl font-semibold">Projects</h1>
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant={"outline"} disabled={data.managed_teams.length == 0}>Create Project</Button>
                </DialogTrigger>
                <DialogContent> {/** TODO this can/should be broken into its own component */}
                    <DialogHeader>
                        <DialogTitle>Create a new Project</DialogTitle>
                    </DialogHeader>
                    <Input placeholder="Project Name" onChange={(e) => setProjectName(e.target.value)}/>
                    <Select onValueChange={setSelectedTeam}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a team" />
                        </SelectTrigger>
                        <SelectContent>
                            {
                            data.managed_teams.map((team: any) => {
                                return (
                                    <SelectItem value={team.id} key={team.id}>{team.name}</SelectItem>
                                )
                            })
                            }
                        </SelectContent>
                    </Select>
                    <DialogFooter className="place-items-center">
                        <div>{projectMessage}</div>
                        <Button onClick={createProject} disabled={disableCreateProject}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            </div>
            <div className="flex flex-col grow">
                {
                    data.projects.length == 0 ? 
                    <div>No projects found</div> :
                    data.projects.map((project: any) => {
                        return (
                            <Card className="grid grid-cols-2 items-center mb-2" key={project.id}>
                            <CardHeader className="justify-self-start">
                                <CardTitle>{project.name}</CardTitle>
                                <CardDescription>{project.team}</CardDescription>
                            </CardHeader>
                            <CardContent className="justify-self-end flex flex-row space-x-4 items-center">
                                {/*<p className="text-sm text-muted-foreground">Last updated MM/DD/YYYY, HH:MM:SS</p> */}
                                <Button asChild>
                                    <Link to={"/projects/$pid/sync"} params={{ pid: project.id as string}}>Open</Link>
                                </Button>
                            </CardContent>
                            </Card>
                    )
                    })
                }
            </div>
        </div>
    )
}