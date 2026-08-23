import { auth, signIn, signOut } from "@/lib/auth";

export default async function AuthStatus() {
  const session = await auth();

  if (!session?.user) {
    return (
      <form
        action={async () => {
          "use server";
          await signIn("github");
        }}
      >
        <button
          type="submit"
          className="rounded bg-fuchsia-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-fuchsia-700"
        >
          Iniciar sesión con GitHub
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {session.user.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={session.user.image} alt="" className="h-6 w-6 rounded-full" />
      )}
      <span className="text-sm text-zinc-700 dark:text-zinc-300">
        {session.user.name ?? session.user.email}
      </span>
      <form
        action={async () => {
          "use server";
          await signOut();
        }}
      >
        <button
          type="submit"
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
