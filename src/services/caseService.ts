import { demoCases } from "../data/cases";
import type { WorkCase, CaseStatus } from "../types/case";
import { reconcileGaps } from "./discoveryService";

/** In-memory prototype adapter; replace this boundary in later stages. */
export const caseService = {
  async list(signal?: AbortSignal): Promise<WorkCase[]> {
    signal?.throwIfAborted();
    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }, 250);
      signal?.addEventListener("abort", onAbort, { once: true });
    });
    signal?.throwIfAborted();
    return demoCases.map((item) => {
      const copy = structuredClone(item);
      copy.discovery.gaps = reconcileGaps(copy);
      return copy;
    });
  },
};

export function filterCases(
  cases: readonly WorkCase[],
  search: string,
  status: CaseStatus | "all",
) {
  const query = search.trim().toLocaleLowerCase();
  return cases.filter(
    (item) =>
      (status === "all" || item.status === status) &&
      `${item.id} ${item.name} ${item.summary}`
        .toLocaleLowerCase()
        .includes(query),
  );
}
