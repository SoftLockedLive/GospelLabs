/** Builds the Journal's place titles from the content registry. Server pages only: it reads all study content. */
import { stepKey } from "@/domain/study/user-data";
import { listAttributes, listConnectSessions, listInvestigations, listPassages } from "@/lib/study-content";
import type { JournalPlacesData } from "./journal-places";

export function journalPlacesData(): JournalPlacesData {
  const investigations = listInvestigations();
  return {
    titles: {
      investigation: Object.fromEntries(investigations.map(({ id, title }) => [id, title])),
      passage: Object.fromEntries(listPassages().map(({ id, title }) => [id, title])),
      attribute: Object.fromEntries(listAttributes().map(({ id, name }) => [id, name])),
      connect: Object.fromEntries(listConnectSessions().map(({ id, title }) => [id, title])),
    },
    steps: Object.fromEntries(
      investigations.map((investigation) => [
        investigation.id,
        Object.fromEntries([
          ...investigation.steps.map((step) => [stepKey(step.id), step.title]),
          ...investigation.branches.flatMap((branch) => branch.steps.map((step) => [stepKey(step.id, branch.id), step.title])),
        ]),
      ]),
    ),
  };
}
