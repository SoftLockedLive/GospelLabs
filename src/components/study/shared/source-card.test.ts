import { describe, expect, it } from "vitest";
import { sourceDetails } from "./source-card";

describe("sourceDetails", () => {
  it("leaves out the title and author when the label already names them", () => {
    expect(
      sourceDetails({
        label: "David A. Bednar, “The Spirit of Revelation”",
        title: "The Spirit of Revelation",
        author: "Elder David A. Bednar",
        publication: "General Conference, April 2011",
      }),
    ).toBe("General Conference, April 2011");
  });

  it("keeps what the label doesn't say", () => {
    expect(sourceDetails({ label: "“Agency and Control”", title: "Agency and Control", author: "Elder D. Todd Christofferson", publication: "Ensign" })).toBe(
      "Elder D. Todd Christofferson · Ensign",
    );
    expect(sourceDetails({ label: "Alma 7:11–13", title: undefined, author: undefined, publication: undefined })).toBe("");
  });
});
