import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Dialog } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

const groups = [
        {
          label: "Acme Inc.",
          value: "acme-inc",
        },
        {
          label: "Monsters Inc.",
          value: "monsters",
        }
  ]
  
type Team = (typeof groups)[number]

export const Route = createFileRoute('/_app/_workbench/teams')({
    component: Teams,

    loader: async () => {
        const url = await invoke("get_server_url");
        return {
            url: url
        }
    }
})

function Teams() {
    const [open, setOpen] = useState(false)
    const [showNewTeamDialog, setShowNewTeamDialog] = useState(false)
    const [selectedTeam, setSelectedTeam] = useState<Team>(
      groups[0]
    )
    const owo = Route.useLoaderData();
    const url = owo.url;

    return (
        <div className="grid grid-flow-row">
            <Dialog open={showNewTeamDialog} onOpenChange={setShowNewTeamDialog}>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                        variant={"outline"}
                        role="combobox"
                        aria-expanded={open}
                        className="w-[200px] justify-between mb-2">
                        {selectedTeam.label}
                        <ChevronsUpDown className="opacity-50"/>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                        <Command>
                            <CommandList>
                                <CommandGroup heading="Teams">
                                <CommandEmpty>No team found.</CommandEmpty>
                                {
                                    groups.map((team) => (
                                        <CommandItem key={team.value} onSelect={() => {
                                            setSelectedTeam(team)
                                            setOpen(false)
                                        }}
                                        className="text-sm">
                                            {team.label}
                                            <CheckIcon className={cn("ml-auto h-4 w-4", selectedTeam.value == team.value ? "opacity-100" : "opacity-0")} />
                                        </CommandItem>
                                    ))
                                }
                                </CommandGroup>
                            </CommandList>
                            <CommandSeparator />
                        </Command>
                    </PopoverContent>
                </Popover>
            </Dialog>
            <p className="mx-8">Your role:</p>
        </div>
    )
}