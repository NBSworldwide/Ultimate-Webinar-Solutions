"use client";

import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button className="logout-button" type="submit"><LogOut size={16} /> Sign out</button>
    </form>
  );
}
