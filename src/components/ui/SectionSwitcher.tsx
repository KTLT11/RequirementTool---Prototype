import { Button } from "./primitives";
export function SectionSwitcher({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: { value: string; label: string }[];
}) {
  return (
    <nav className="section-switcher" aria-label={label}>
      {items.map((item) => (
        <Button
          key={item.value}
          variant={value === item.value ? "secondary" : "ghost"}
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </Button>
      ))}
    </nav>
  );
}
