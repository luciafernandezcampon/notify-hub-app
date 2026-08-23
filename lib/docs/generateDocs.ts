import { getRepoConfig } from "@/lib/github/client";
import { getRepoTree, getFileContent } from "@/lib/github/repository";
import { generateManifest } from "@/lib/docs/generateManifest";
import { saveDraft } from "@/lib/db/drafts";
import {
  selectRelevantFiles,
  groupIntoModules,
  isModuleDocumented,
} from "./relevantFiles";
import { draftDocumentation } from "./draftDocumentation";

const MAX_MODULES = 5;
const MAX_FILES_PER_MODULE = 5;
const MAX_CHARS_PER_FILE = 3000;

export async function generateDocs() {
  const { owner, repo } = getRepoConfig();
  const repoSlug = `${owner}/${repo}`;

  const [tree, documentationManifest] = await Promise.all([
    getRepoTree(),
    generateManifest(repoSlug),
  ]);

  const relevantPaths = selectRelevantFiles(tree);
  const modules = groupIntoModules(relevantPaths);

  const undocumentedModules = modules
    .filter((codeModule) => !isModuleDocumented(codeModule, documentationManifest))
    .slice(0, MAX_MODULES);

  const drafts = [];

  for (const codeModule of undocumentedModules) {
    const filesToRead = codeModule.files.slice(0, MAX_FILES_PER_MODULE);

    const files = await Promise.all(
      filesToRead.map(async (path) => ({
        path,
        content: (await getFileContent(path)).slice(0, MAX_CHARS_PER_FILE),
      }))
    );

    const suggestion = await draftDocumentation({
      moduleKey: codeModule.key,
      files,
    });

    const draft = await saveDraft(repoSlug, suggestion);
    drafts.push(draft);
  }

  return drafts;
}
