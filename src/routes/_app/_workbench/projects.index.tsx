import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute('/_app/_workbench/projects/')({
    component: ProjectsIndex
})

function ProjectsIndex() {
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
                            <SelectValue placeholder="Select an organization" />
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
                <Card className="grid grid-cols-2 items-center mb-2">
                    <CardHeader className="justify-self-start">
                        <CardTitle>SDM-25</CardTitle>
                        <CardDescription>Sun Devil Motorsports</CardDescription>
                    </CardHeader>
                    <CardContent className="justify-self-end flex flex-row space-x-4 items-center">
                        <p className="text-sm text-muted-foreground">Last updated 11/10/2023, 11:49:36 AM</p>
                        <Button>View</Button>
                    </CardContent>
                </Card>
                
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