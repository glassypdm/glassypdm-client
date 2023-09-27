import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useRef } from "react"

// TODO move ChangeType, LocalCADFile into some types.tsx thing
enum ChangeType {
  CREATE,
  UPDATE,
  DELETE,
  UNIDENTIFIED
}

interface LocalCADFile {
  path: string,
  size: number,
  hash: string
  change?: ChangeType
}

export interface PendingFileProps {
  path: string,
  change: ChangeType
  checked: boolean
  handleCheck: any
}

export function PendingFile(props: PendingFileProps) {

  let text: string = "";
  let color: string = "";
  switch(props.change) {
    case ChangeType.CREATE:
      color = "text-green-400";
      text = "new";
      break;
    case ChangeType.UPDATE:
      color = "text-blue-300";
      text = "updated";
      break;
      case ChangeType.DELETE:
      color = "text-red-400";
      text = "deleted"
      break;
  }

  return (
    <div>
      <div className="flex items-center space-x-2">
        <Checkbox name={props.path} value={props.path} key={props.path} id={props.path} onCheckedChange={props.handleCheck} defaultChecked={true}/>
        <Label htmlFor={props.path}>{props.path}</Label>
        <Label className={color} htmlFor={props.path}>{text}</Label>
      </div>
    </div>
  )
}
