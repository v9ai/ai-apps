import { describe, it, expect } from "vitest";
import { extractLinkedInUsername, deriveContactSlug } from "./contact-slug";

describe("extractLinkedInUsername", () => {
  it("strips hex suffix from LinkedIn URL", () => {
    expect(extractLinkedInUsername("https://www.linkedin.com/in/taylor-keenan-b8b630375")).toBe("taylor-keenan");
  });

  it("strips hex suffix with trailing slash", () => {
    expect(extractLinkedInUsername("https://www.linkedin.com/in/taylor-keenan-b8b630375/")).toBe("taylor-keenan");
  });

  it("strips longer hex suffix", () => {
    expect(extractLinkedInUsername("https://www.linkedin.com/in/zinnia-everatt-81678a340")).toBe("zinnia-everatt");
  });

  it("keeps username without hex suffix", () => {
    expect(extractLinkedInUsername("https://www.linkedin.com/in/johndoe")).toBe("johndoe");
  });

  it("keeps username with short numeric suffix (not hex)", () => {
    expect(extractLinkedInUsername("https://www.linkedin.com/in/jane-doe-123")).toBe("jane-doe-123");
  });

  it("strips query params before extracting", () => {
    expect(extractLinkedInUsername("https://www.linkedin.com/in/taylor-keenan-b8b630375?utm=test")).toBe("taylor-keenan");
  });

  it("returns null for non-LinkedIn URL", () => {
    expect(extractLinkedInUsername("https://github.com/johndoe")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractLinkedInUsername("")).toBeNull();
  });
});

describe("deriveContactSlug", () => {
  it("prefers github_handle over LinkedIn", () => {
    expect(deriveContactSlug({
      github_handle: "octocat",
      linkedin_url: "https://www.linkedin.com/in/someone-abc1234567",
      first_name: "John",
      last_name: "Doe",
    })).toBe("octocat");
  });

  it("uses LinkedIn username when no github_handle", () => {
    expect(deriveContactSlug({
      linkedin_url: "https://www.linkedin.com/in/taylor-keenan-b8b630375/",
      first_name: "Taylor",
      last_name: "Keenan",
    })).toBe("taylor-keenan");
  });

  it("falls back to first-last name", () => {
    expect(deriveContactSlug({
      first_name: "Taylor",
      last_name: "Keenan",
    })).toBe("taylor-keenan");
  });

  it("handles empty last name", () => {
    expect(deriveContactSlug({
      first_name: "Taylor",
      last_name: "",
    })).toBe("taylor");
  });

  it("slugifies github handle with special chars", () => {
    expect(deriveContactSlug({
      github_handle: "My_User.Name",
      first_name: "A",
      last_name: "B",
    })).toBe("my-user-name");
  });
});
