import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { connectionKey } from "@/domain/study/cards/common";
import { buildDiscoveryGraph } from "@/domain/study/graph";
import { discoveryCardSchema, personalConnectionSchema } from "@/domain/study/user-data";
import type { NodeRef } from "@/domain/study/vocabulary";
import { MapCanvas } from "./map-canvas";
import { MapListView } from "./map-list-view";
import { computeMapLayout } from "./map-layout";
import { NodePanel } from "./node-panel";
import { ConnectionDialog } from "./connection-dialog";
import { DiscoveryCardItem } from "../notebook/discovery-card-item";
import { ResearchDiscoveries } from "../notebook/research-discoveries";

const card = discoveryCardSchema.parse({
  id: "card-1", createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z",
  origin: { kind: "investigation", contentId: "he-knows-how", primaryQuestion: "christ" },
  title: "He knows how to help", question: "Why?",
  sources: [{ id: "alma-7-11-12", label: "Alma 7:11–12", kind: "scripture", url: "https://www.churchofjesuschrist.org/x" }],
  concepts: [{ ref: "concept:atonement", label: "Atonement", demonstrated: true }, { ref: "vocabulary:succor", label: "Succor", demonstrated: false }],
  connections: [{ id: connectionKey("scripture:alma-7-11-12", "teaches", "concept:atonement"), from: { ref: "scripture:alma-7-11-12", label: "Alma 7:11–12" }, to: { ref: "concept:atonement", label: "Atonement" }, relation: "teaches", sourceIds: ["alma-7-11-12"], note: "Alma describes it.", provenance: "demonstrated" }],
});
const passage = discoveryCardSchema.parse({
  id: "card-2", createdAt: "2026-10-03T00:00:00.000Z", updatedAt: "2026-10-03T00:00:00.000Z",
  origin: { kind: "passage", contentId: "he-will-take" }, title: "He will take upon him",
  sources: [{ id: "alma-7-11-12", label: "Alma 7:11–12", kind: "scripture", url: "https://www.churchofjesuschrist.org/x" }],
  concepts: [{ ref: "concept:mercy", label: "Mercy", demonstrated: false }],
});
const mine = personalConnectionSchema.parse({ id: "pc-1", createdAt: "2026-10-02T00:00:00.000Z", updatedAt: "2026-10-02T00:00:00.000Z", from: { ref: "concept:atonement", label: "Atonement" }, to: { ref: "concept:mercy", label: "Mercy" }, relation: "leads-to", note: "Mine." });

/** Renders the Map and Notebook components on the server with sample data, to catch runtime errors. */
describe("map and notebook components render", () => {
  const graph = buildDiscoveryGraph([card, passage], [mine]);
  const layout = computeMapLayout(graph);
  const visible = new Set(graph.nodes.map((n) => n.ref));
  it("renders the canvas, list, panels, dialogs, and cards", () => {
    const canvas = renderToStaticMarkup(h(MapCanvas, { graph, layout, visible, selected: "concept:atonement", newRefs: new Set(["concept:mercy" as const]), initialFocus: null, onSelect: () => {}, onDeselect: () => {} }));
    expect(canvas).toContain("data-node");
    expect(canvas).toContain('aria-label="Question: Is Jesus Christ the Son of God, the Savior of the world? 1 connection."');
    const list = renderToStaticMarkup(h(MapListView, { graph, visible, newRefs: new Set<NodeRef>(), selected: null, onSelect: () => {} }));
    expect(list).toContain("Alma 7:11–12 teaches Atonement");
    for (const node of graph.nodes) {
      const panel = renderToStaticMarkup(h(NodePanel, { graph, node, cardsById: new Map([[card.id, card], [passage.id, passage]]), isNew: true, onClose() {}, onNavigate() {}, onConnect() {}, onEditConnection() {}, onDeleteConnection() {} }));
      expect(panel).toContain(node.label.replace("&", "&amp;"));
    }
    renderToStaticMarkup(h(ConnectionDialog, { graph, editor: { mode: "create", from: "concept:atonement" }, onClose() {}, onSaved() {} }));
    renderToStaticMarkup(h(ConnectionDialog, { graph, editor: { mode: "edit", connection: mine }, onClose() {}, onSaved() {} }));
    expect(renderToStaticMarkup(h(DiscoveryCardItem, { card }))).toContain("He knows how to help");
    renderToStaticMarkup(h(ResearchDiscoveries, { entries: [], searching: false }));
  });
});
