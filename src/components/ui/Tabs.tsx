import { NavLink } from "react-router-dom";
export function Tabs({
  items,
  label,
}: {
  label: string;
  items: { path: string; label: string }[];
}) {
  // Route navigation uses links rather than ARIA tabs; native keyboard behavior
  // and browser back/forward are preserved for independent pages.
  return (
    <nav className="route-tabs" aria-label={label}>
      {items.map((item) => (
        <NavLink key={item.path} to={item.path}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
