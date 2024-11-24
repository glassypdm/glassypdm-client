import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/_app/_workbench/teams/$teamid/orders/")({
  component: () => <Orders />,
});

const createOrderSchema = z.object({
  title: z.string(),
  orderDeadline: z.string().date(),
  supplier: z.string(),
  type: z.string(),
})

function Orders() {
  return (
    <div className="flex flex-row space-x-4">
      <div className="flex flex-col space-y-2 p-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant={'outline'}>Create Order</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Order</DialogTitle></DialogHeader>
          </DialogContent>
        </Dialog>
        <Link to='options' from="/teams/$teamid/orders">
        <Button variant={"outline"}>Manage Options</Button>
        </Link>
      </div>
      <div className="flex flex-col grow">
        <Card className="grid grid-cols-2 items-center mb-2">
          <CardHeader className="justify-self-start">
            <CardTitle>asdf</CardTitle>
            <CardDescription>
              <div>supporting text</div>
            </CardDescription>
          </CardHeader>
          <CardContent className="justify-self-end flex flex-row space-x-4 items-center">
            <div className="flex flex-col grow space-y-2 w-full h-full ">
              <Badge>SendCutSend</Badge>
              <Badge>Laser Cut</Badge>
              <Badge>Shipped</Badge>
            </div>
            <Button>Open</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
