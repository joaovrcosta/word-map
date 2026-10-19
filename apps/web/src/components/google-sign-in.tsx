"use client";

import { useEffect, useRef } from "react";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

type GoogleCredentialResponse = { credential: string };

type GoogleAccounts = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: Record<string, string | number>
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleAccounts;
  }
}

export function GoogleSignIn({
  disabled,
  text = "continue_with",
  onCredential,
}: {
  disabled?: boolean;
  text?: string;
  onCredential: (credential: string) => void;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    if (!googleClientId || !buttonRef.current) return;
    let cancelled = false;

    const render = () => {
      const parent = buttonRef.current;
      const google = window.google;
      if (cancelled || !parent || !google) return;
      parent.replaceChildren();
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => onCredentialRef.current(response.credential),
      });
      google.accounts.id.renderButton(parent, {
        theme: "outline",
        size: "large",
        width: Math.max(parent.offsetWidth, 280),
        text,
        shape: "rectangular",
      });
    };

    if (window.google) {
      render();
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client?hl=pt-BR";
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!googleClientId) return null;

  return (
    <div
      ref={buttonRef}
      className={`flex justify-center ${disabled ? "pointer-events-none opacity-60" : ""}`}
    />
  );
}

export function UsernameStep({
  email,
  value,
  onChange,
  pending,
  error,
  onSubmit,
}: {
  email: string;
  value: string;
  onChange: (value: string) => void;
  pending: boolean;
  error: string;
  onSubmit: () => void;
}) {
  return (
    <form
      className="mt-8 space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="rounded-md border border-[#8ee0b4] bg-[#e7f8ee] p-4 text-sm text-[#14804a] dark:border-[#1eaf68] dark:bg-[#143022] dark:text-[#7ddea8]">
        A conta do Google de {email} ainda precisa de um nome de usuário. Ele
        aparece com @ e é assim que as outras pessoas te identificam na
        plataforma.
      </div>
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      <UsernameField value={value} onChange={onChange} disabled={pending} />
      <button
        type="submit"
        disabled={pending}
        className="flex w-full justify-center rounded-md bg-[#24c875] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Concluir cadastro"}
      </button>
    </form>
  );
}

export function UsernameField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor="username"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Nome de usuário
      </label>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Use letras, números ou _. De 3 a 20 caracteres. É o seu @ na plataforma.
      </p>
      <div className="relative mt-2">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-extrabold text-[#14804a]">
          @
        </span>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          minLength={3}
          maxLength={20}
          value={value}
          onChange={(event) =>
            onChange(event.target.value.replace(/^@+/, "").replace(/\s/g, ""))
          }
          className="w-full rounded-md border border-gray-300 bg-white py-2 pl-8 pr-3 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
          placeholder="seuusuario"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
