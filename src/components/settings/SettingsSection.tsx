interface SettingSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
}

export function SettingsSection(props: SettingSectionProps) {
  return (
    <div className="space-y-2 my-4">
      <h2 className="text-xl">{props.title}</h2>
      {props.children}
    </div>
  );
}
