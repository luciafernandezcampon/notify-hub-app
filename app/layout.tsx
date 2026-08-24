import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthStatus from "@/app/components/AuthStatus";
import RequestCollaboratorButton from "@/app/components/RequestCollaboratorButton";
import { auth } from "@/lib/auth";
import { isCollaborator } from "@/lib/github/collaborators";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Notify",
  description: "Asistente de IA que analiza Pull Requests y mantiene la documentación al día.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();

  let showRequestButton = Boolean(session?.githubUsername);
  if (session?.githubUsername) {
    try {
      showRequestButton = !(await isCollaborator(session.githubUsername));
    } catch (error) {
      console.error("Failed to check collaborator status", error);
    }
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-6 py-2 dark:border-zinc-800 dark:bg-black">
          <div className="flex items-center gap-3">
            <RequestCollaboratorButton
              username={showRequestButton ? (session?.githubUsername ?? null) : null}
            />
            <a
              href="/presentacion.html"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-violet-300 px-3 py-1.5 text-sm text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950"
            >
              Presentación
            </a>
          </div>
          <AuthStatus />
        </div>
        {children}
      </body>
    </html>
  );
}
