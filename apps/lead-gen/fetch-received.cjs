const { Resend } = require("resend");

const r = new Resend(process.env.RESEND_API_KEY);

async function fetchAll() {
  const all = [];
  let hasMore = true;
  let after = undefined;

  while (hasMore) {
    const res = await r.emails.receiving.list({
      limit: 100,
      ...(after ? { after } : {}),
    });
    if (!res.data?.data?.length) break;
    all.push(...res.data.data);
    hasMore = res.data.has_more || false;
    if (hasMore) after = res.data.data[res.data.data.length - 1].id;
    process.stderr.write(`Listed ${all.length} emails...\n`);
  }

  process.stderr.write(`\nTotal listed: ${all.length}. Fetching content...\n`);

  const withContent = [];
  for (const email of all) {
    try {
      const detail = await r.emails.receiving.get(email.id);
      withContent.push({
        ...email,
        html: detail.data?.html || null,
        text: detail.data?.text || null,
      });
    } catch (e) {
      withContent.push({ ...email, html: null, text: null });
    }
    if (withContent.length % 10 === 0) {
      process.stderr.write(`Content: ${withContent.length}/${all.length}\n`);
    }
  }

  process.stdout.write(JSON.stringify(withContent));
}

fetchAll().catch((e) => {
  process.stderr.write(`Fatal: ${e.message}\n`);
  process.exit(1);
});
