import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createFileRoute } from "@tanstack/react-router";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import ServerFolder from "@/components/settings/serverfolder";
import Database from "@tauri-apps/plugin-sql";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute('/_app/_workbench/settings')({
    component: Settings,

    loader: async () => {
        const db = await Database.load("sqlite:glassypdm.db")
        let result = await db.select(
          "SELECT CASE WHEN debug_active = 1 THEN debug_url ELSE url END as url FROM server"
        );

        const url = (result as any)[0].url;

        result = await db.select(
            "SELECT local_dir, debug_active FROM server WHERE active = 1"
        )
        const dir = (result as any)[0].local_dir;
        const debug = (result as any)[0].debug_active;
        return {
            url: url,
            dir: dir,
            debug: debug == 1 ? true : false
        }
    }
})

function Settings() {
    const loaderData = Route.useLoaderData();
    const { theme, setTheme } = useTheme();
    const [ debug, setDebug ] = useState(loaderData.debug)
    const [ server, setServer ] = useState(loaderData.url)

    // TODO have an alert dialog so user can confirm they want to change server setting
    // FIXME when changing to dev server, when you revisit
    // the settings page it will still show prod server, even though dev server is used.
    // when revisiting settings page a second time it will show properly
    // FIXME when changing to prod server, need to hit save twice (?)

    async function saveDevSettings() {
        const db = await Database.load("sqlite:glassypdm.db")

        await db.execute(
            "UPDATE server SET debug_active = ? WHERE active = 1", [(debug ? 1 : 0)]
        )

        const result = await db.select(
            "SELECT CASE WHEN debug_active = 1 THEN debug_url ELSE url END as url FROM server"
        );
        const url = (result as any)[0].url;
        setServer(url);

        await db.close()
        toast(`Server selection set to ${url}.`)
    }

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
                <ServerFolder dir={loaderData.dir as string} />
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
                        <Label>Use Development Server</Label>
                        <Switch defaultChecked={debug} onCheckedChange={(checked) => setDebug(checked)}/>
                        </div>
                        <p>Server used: {server}</p>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={saveDevSettings}>Save</Button>
                    </CardFooter>
                </Card>
            </div>
            </ScrollArea>
        </div>
    )
}