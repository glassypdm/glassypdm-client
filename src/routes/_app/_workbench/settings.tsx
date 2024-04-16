import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute('/_app/_workbench/settings')({
    component: Settings
})

function Settings() {
    return (
        <div className="flex flex-row">
            <div className="flex flex-col mx-4">
                <h1 className="text-2xl font-semibold mb-4">Settings</h1>
                <Button variant={"ghost"}>Client</Button>
                <Button variant={"ghost"}>Teams</Button>
                <Button variant={"ghost"}>Account</Button>
            </div>
            <div className="flex flex-col grow space-y-4 mx-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Directory</CardTitle>
                        <CardDescription>Where your project files are stored.</CardDescription>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>App Data</CardTitle>
                        <CardDescription>Manage your local app data.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-row space-x-4">
                    <Button>View App Data</Button>
                    <Button>View App Logs</Button>
                    <Button variant={"outline"}>Delete App Data</Button> {/** TODO alert dialog w/ destructive color */}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Developer Settings</CardTitle>
                        <CardDescription>Trick silicon into thinking.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-row space-x-4 items-center">
                            <Label>Use Debug Server</Label>
                            <Switch />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button>Save</Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}