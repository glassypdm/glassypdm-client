import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createFileRoute } from "@tanstack/react-router";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import ServerFolder from "@/components/settings/serverfolder";
import { useState } from "react";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserProfile } from "@clerk/clerk-react";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute('/_app/_workbench/settings')({
    component: Settings,

    loader: async () => {
        const url: string = await invoke("get_server_url");
        const result = await invoke("init_settings_options");
        const cache = await invoke("get_cache_size");
        const cacheSetting = await invoke("cmd_get_cache_setting");
        const dir = (result as any).local_dir;
        const debug = (result as any).debug_active;
        return {
            cache: cache,
            url: url,
            dir: dir,
            cacheSetting: cacheSetting,
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

    async function saveDevSettings() {
        await invoke("set_debug", { debug: debug ? 1 : 0 });
        const url: string = await invoke("get_server_url");
        setServer(url);
        toast(`Server selection set to ${url}.`)
    }

    async function openAppData() {
        await invoke("open_app_data_dir")
    }

    async function openLogs() {
        await invoke("open_log_dir")
    }

    async function getMemory() {
        await invoke("get_mem")
    }

    return (
        <Tabs className="flex flex-row space-x-4" defaultValue="folder">
            <TabsList className="flex flex-col justify-start">
                <h1 className="text-2xl font-semibold p-4">Settings</h1>
                <TabsTrigger value="folder">Server Folder</TabsTrigger>
                <TabsTrigger value="appdata">App Data</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="dev">Developer Settings</TabsTrigger>
            </TabsList>
            <div className="w-full">
                <TabsContent value="folder">
                    <ServerFolder dir={loaderData.dir as string} cache={loaderData.cache as number} saveCache={loaderData.cacheSetting as boolean}/>
                </TabsContent>
                <TabsContent value="appdata">
                    <Card>
                        <CardHeader>
                            <CardTitle>App Data</CardTitle>
                            <CardDescription>Manage your local app data.</CardDescription>
                        </CardHeader>
                        <CardContent>
                        <div>
                            {/** TODO configure delete cache post downloads */}
                        </div>
                        <div className="grid-cols-3 space-x-4 space-y-2">
                            <Button onClick={openAppData}>View App Data</Button>
                            <Button onClick={openLogs}>View App Logs</Button>
                            {/* POSTPONED 
                            <Dialog>
                                <DialogTrigger>
                                    <Button variant={"outline"}>Delete App Data</Button>               
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                    <DialogTitle>Are you sure you want to delete the app's data?</DialogTitle>
                                    <DialogDescription>You will need to go through server setup again.</DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                        <Button variant={'destructive'}>Delete App Data</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                            */}
                        </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="appearance">
                    <Card>
                        <CardHeader>
                            <CardTitle>Appearance</CardTitle>
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
                </TabsContent>
                <TabsContent value="account">
                                <UserProfile />
                </TabsContent>
                <TabsContent value="dev">
                    <Card>
                        <CardHeader>
                            <CardTitle>Developer Settings</CardTitle>
                            <CardDescription>Trick silicon into thinking.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={getMemory}>memory</Button>
                            <Separator className="my-2"/>
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
                </TabsContent>
            </div>
        </Tabs>
    )
}