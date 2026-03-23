import { getAllPersonalities } from "./index";

const personalities = getAllPersonalities();
let failures = 0;

function fail(msg: string) {
  console.error(`FAIL: ${msg}`);
  failures++;
}

// Duplicate slugs
const slugs = personalities.map((p) => p.slug);
slugs.forEach((slug, i) => {
  if (slugs.indexOf(slug) !== i) fail(`Duplicate slug: "${slug}"`);
});

// Duplicate github handles
const githubHandles = personalities.filter((p) => p.github).map((p) => p.github!);
githubHandles.forEach((handle, i) => {
  if (githubHandles.indexOf(handle) !== i) {
    const owners = personalities.filter((p) => p.github === handle).map((p) => p.slug);
    fail(`Duplicate github handle "${handle}" on: ${owners.join(", ")}`);
  }
});

// Duplicate linkedinImage URLs
const linkedinImages = personalities.filter((p) => p.linkedinImage).map((p) => p.linkedinImage!);
linkedinImages.forEach((url, i) => {
  if (linkedinImages.indexOf(url) !== i) {
    const owners = personalities.filter((p) => p.linkedinImage === url).map((p) => p.slug);
    fail(`Duplicate linkedinImage on: ${owners.join(", ")}`);
  }
});

if (failures > 0) {
  console.error(`\n${failures} validation error(s) found.`);
  process.exit(1);
} else {
  console.log(`Validated ${personalities.length} personalities — OK`);
}
