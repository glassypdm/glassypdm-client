import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute('/_app/_workbench/settings')({
    component: Settings
})

function Settings() {
    return (
        <div className="flex flex-row">
            <div className="flex flex-col mx-4">
                <h1 className="text-2xl font-semibold">Settings</h1>
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
                </Card>
            </div>
        </div>
    )
}