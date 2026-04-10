const { Resend } = require("resend");

const r = new Resend(process.env.RESEND_API_KEY);

async function listAll() {
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
    process.stderr.write(`${all.length} emails...\n`);
  }

  process.stderr.write(`Done: ${all.length} total\n`);
  process.stdout.write(JSON.stringify(all));
}

listAll().catch((e) => {
  process.stderr.write(`Fatal: ${e.message}\n`);
  process.exit(1);
});
