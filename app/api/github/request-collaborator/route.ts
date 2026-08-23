import { auth } from "@/lib/auth";
import { getOctokit, getRepoConfig } from "@/lib/github/client";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.githubUsername) {
      return Response.json(
        { ok: false, error: "Necesitás iniciar sesión con GitHub" },
        { status: 401 }
      );
    }

    const octokit = getOctokit();
    const { owner, repo } = getRepoConfig();

    const { data: issue } = await octokit.rest.issues.create({
      owner,
      repo,
      title: `Solicitud de acceso: @${session.githubUsername}`,
      body: [
        `@${session.githubUsername} inició sesión en el dashboard de docs-ai y pidió acceso de colaborador a este repositorio.`,
        "",
        `Para aprobarlo: Settings → Collaborators and teams → Add people → \`${session.githubUsername}\`.`,
        "",
        "Cerrá este issue una vez que lo resuelvas.",
      ].join("\n"),
      assignees: [owner],
    });

    return Response.json({ ok: true, issueUrl: issue.html_url, issueNumber: issue.number });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
