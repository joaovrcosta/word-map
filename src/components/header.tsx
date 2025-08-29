import LogoutButton from "./logout-button";

export function Header() {
  return (
    <header className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="ml-auto flex items-center space-x-4">
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
