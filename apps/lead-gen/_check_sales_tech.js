     1|require('dotenv').config({path: '/Users/vadimnicolai/Public/ai-apps/apps/lead-gen/.env.local'});
     2|const { neon } = require('@neondatabase/serverless');
     3|const sql = neon(process.env.NEON_DATABASE_URL);
     4|
     5|async function main() {
     6|  // Count total sales-tech companies
     7|  const [count] = await sql`
     8|    SELECT COUNT(*) as total 
     9|    FROM companies 
    10|    WHERE service_taxonomy::jsonb ?| array['Sales Engagement Platform', 'Lead Generation Software', 'CRM Software']
    11|  `;
    12|  console.log("Total sales-tech (incl blocked):", count.total);
    13|
    14|  // Count unblocked (visible in UI)
    15|  const [visible] = await sql`
    16|    SELECT COUNT(*) as total 
    17|    FROM companies 
    18|    WHERE service_taxonomy::jsonb ?| array['Sales Engagement Platform', 'Lead Generation Software', 'CRM Software']
    19|    AND (blocked IS NULL OR blocked = false)
    20|  `;
    21|  console.log("Visible (unblocked):", visible.total);
    22|
    23|  // Breakdown by taxonomy category
    24|  const byCat = await sql`
    25|    SELECT 
    26|      CASE 
    27|        WHEN service_taxonomy::jsonb ? 'Sales Engagement Platform' THEN 'Sales Engagement Platform'
    28|        WHEN service_taxonomy::jsonb ? 'Lead Generation Software' THEN 'Lead Generation Software'
    29|        WHEN service_taxonomy::jsonb ? 'CRM Software' THEN 'CRM Software'
    30|      END as category,
    31|      COUNT(*) as cnt
    32|    FROM companies
    33|    WHERE service_taxonomy::jsonb ?| array['Sales Engagement Platform', 'Lead Generation Software', 'CRM Software']
    34|    AND (blocked IS NULL OR blocked = false)
    35|    GROUP BY 1
    36|    ORDER BY cnt DESC
    37|  `;
    38|  console.log("\nBy category:");
    39|  for (const row of byCat) console.log(`  ${row.category}: ${row.cnt}`);
    40|
    41|  // Top 10 by score
    42|  const top10 = await sql`
    43|    SELECT name, key, score, service_taxonomy, country, description
    44|    FROM companies
    45|    WHERE service_taxonomy::jsonb ?| array['Sales Engagement Platform', 'Lead Generation Software', 'CRM Software']
    46|    AND (blocked IS NULL OR blocked = false)
    47|    ORDER BY score DESC NULLS LAST
    48|    LIMIT 10
    49|  `;
    50|  console.log("\nTop 10 by score:");
    51|  for (const row of top10) console.log(`  ${row.score?.toFixed(1)} | ${row.name} (${row.key}) | ${row.country || 'no country'}`);
    52|
    53|  // Companies with no country
    54|  const [noCountry] = await sql`
    55|    SELECT COUNT(*) as total
    56|    FROM companies
    57|    WHERE service_taxonomy::jsonb ?| array['Sales Engagement Platform', 'Lead Generation Software', 'CRM Software']
    58|    AND (blocked IS NULL OR blocked = false)
    59|    AND (country IS NULL OR country = '')
    60|  `;
    61|  console.log("\nNo country:", noCountry.total);
    62|
    63|  // Companies that have ai_tier
    64|  const aiTiers = await sql`
    65|    SELECT ai_tier, COUNT(*) as cnt
    66|    FROM companies
    67|    WHERE service_taxonomy::jsonb ?| array['Sales Engagement Platform', 'Lead Generation Software', 'CRM Software']
    68|    AND (blocked IS NULL OR blocked = false)
    69|    GROUP BY ai_tier
    70|    ORDER BY cnt DESC
    71|  `;
    72|  console.log("\nBy AI tier:");
    73|  for (const row of aiTiers) console.log(`  ${row.ai_tier || 'NULL'}: ${row.cnt}`);
    74|
    75|  // Average score
    76|  const [avgScore] = await sql`
    77|    SELECT 
    78|      ROUND(AVG(score)::numeric, 2) as avg,
    79|      MIN(score) as min,
    80|      MAX(score) as max,
    81|      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY score) as median
    82|    FROM companies
    83|    WHERE service_taxonomy::jsonb ?| array['Sales Engagement Platform', 'Lead Generation Software', 'CRM Software']
    84|    AND (blocked IS NULL OR blocked = false)
    85|    AND score IS NOT NULL
    86|  `;
    87|  console.log("\nScore stats:", JSON.stringify(avgScore));
    88|}
    89|
    90|main().catch(console.error);
    91|