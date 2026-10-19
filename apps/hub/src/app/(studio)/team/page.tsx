"use client";

import { useEffect, useState } from "react";
import { api, roleLabel, type Role, type StaffMember } from "@/lib/api";
import { useSession } from "@/lib/session";

const roles: Role[] = ["USER", "MODERATOR", "ADMIN"];

export default function TeamPage() {
  const session = useSession();
  const [people, setPeople] = useState<StaffMember[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (session.role !== "ADMIN") return;
    api<StaffMember[]>("GET", "/hub/staff")
      .then(setPeople)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Não foi possível carregar a equipe.")
      );
  }, [session.role]);

  async function changeRole(person: StaffMember, role: Role) {
    setError("");
    setNotice("");
    try {
      const updated = await api<StaffMember>("PATCH", `/hub/staff/${person.id}`, {
        role,
      });
      setPeople((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setNotice(`${updated.name} agora é ${roleLabel(updated.role).toLowerCase()}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível alterar o papel.");
    }
  }

  if (session.role !== "ADMIN") {
    return (
      <p className="text-sm text-[#667085]">
        Só administradores gerenciam os papéis da equipe.
      </p>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Equipe</h1>
      <p className="mt-2 max-w-2xl text-sm text-[#667085]">
        Moderadores publicam livros e textos. Administradores também definem quem entra na equipe.
      </p>
      {error && <p className="mt-4 text-sm text-[#b42318]">{error}</p>}
      {notice && <p className="mt-4 text-sm font-bold text-[#14804a]">{notice}</p>}
      <ul className="mt-6 space-y-3">
        {people.map((person) => {
          const locked = person.id === session.id;
          return (
            <li
              key={person.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-5 shadow-sm"
            >
              <div>
                <p className="font-extrabold">{person.name}</p>
                <p className="text-sm text-[#667085]">{person.email}</p>
              </div>
              <label className="text-sm font-bold" htmlFor={`role-${person.id}`}>
                <span className="sr-only">Papel de {person.name}</span>
                <select
                  id={`role-${person.id}`}
                  value={person.role}
                  disabled={locked}
                  onChange={(event) => changeRole(person, event.target.value as Role)}
                  className="rounded-xl border border-[#d7dde5] px-3 py-2 disabled:bg-[#f3f5f7]"
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabel(role)}
                    </option>
                  ))}
                </select>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
