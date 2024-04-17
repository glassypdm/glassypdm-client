import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createFileRoute } from "@tanstack/react-router";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Route = createFileRoute('/_app/_workbench/settings')({
    component: Settings
})

function Settings() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="flex flex-row">
            <div className="flex flex-col mx-4">
                <h1 className="text-2xl font-semibold mb-4">Settings</h1>
                <Button variant={"ghost"}>Client</Button>
                <Button variant={"ghost"}>Teams</Button>
                <Button variant={"ghost"}>Account</Button>
            </div>
            <ScrollArea className="rounded-lg border bg-card p-2">
            <div className="flex flex-col space-y-4 mx-4 max-h-[480px] w-[560px]">
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
                        <CardTitle>Appearance</CardTitle>
                        <CardDescription>Prettify your PDM experience.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup defaultValue={theme}>
                            <div className="items-center space-x-4">
                                <RadioGroupItem value="light" id="light" onClick={() => setTheme("light")} />
                                <Label htmlFor="light">Light Mode</Label>
                            </div>
                            <div className="items-center space-x-4">
                                <RadioGroupItem value="dark" id="dark" onClick={() => setTheme("dark")} />
                                <Label htmlFor="dark">Dark Mode</Label>
                            </div>
                            <div className="items-center space-x-4">
                                <RadioGroupItem value="system" id="system" onClick={() => setTheme("system")} />
                                <Label htmlFor="system">System</Label>
                            </div>
                        </RadioGroup>
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
            </ScrollArea>
        </div>
    )
}