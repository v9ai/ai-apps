-- Therapeutic games / exercises. One table with a type discriminator, JSON content.
-- Types: CBT_REFRAME, MINDFULNESS, JOURNAL_PROMPT. Source: SEED | USER | AI.
-- Seed content is in Romanian, designed for kids ~6-8. Each seed includes a
-- `parentGuide` object inside `content` with per-step coaching notes for the
-- parent (evidence base: PCIT, Incredible Years, Coping Cat). `parentGuide.stepsGuide[]`
-- length == `content.steps[]` (or `content.prompts[]`) length so the coach pane
-- can advance in sync with the kid's runner.

BEGIN;

CREATE TABLE IF NOT EXISTS games (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  goal_id integer,
  issue_id integer,
  family_member_id integer,
  type text NOT NULL,
  title text NOT NULL,
  description text,
  content text NOT NULL,
  language text,
  estimated_minutes integer,
  source text NOT NULL DEFAULT 'USER',
  created_at text NOT NULL DEFAULT NOW(),
  updated_at text NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_games_user_created ON games (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_type ON games (type);
CREATE INDEX IF NOT EXISTS idx_games_goal_id ON games (goal_id);
CREATE INDEX IF NOT EXISTS idx_games_issue_id ON games (issue_id);

CREATE TABLE IF NOT EXISTS game_completions (
  id serial PRIMARY KEY,
  game_id integer NOT NULL,
  user_id text NOT NULL,
  duration_seconds integer,
  responses text,
  linked_note_id integer,
  completed_at text NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_completions_game ON game_completions (game_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_completions_user ON game_completions (user_id, completed_at DESC);

-- Clear any existing seeds (re-runnable on dev DBs).
DELETE FROM games WHERE user_id = '__seed__';

-- Seed 1: Răsuflarea Dragonului (Dragon Breath — MINDFULNESS, ~2 min)
INSERT INTO games (user_id, type, title, description, content, language, estimated_minutes, source)
VALUES (
  '__seed__',
  'MINDFULNESS',
  $$Răsuflarea Dragonului$$,
  $$Respiră ca un dragon — umple burta cu foc, ține-o puternic, suflă încet.$$,
  $${"steps":[{"durationSeconds":10,"instruction":"Stai drept ca un dragon. Picioarele pe pământ, umerii moi.","cue":"Stai drept"},{"durationSeconds":4,"instruction":"Inspiră pe nas… umple burta cu foc.","cue":"Umple"},{"durationSeconds":4,"instruction":"Ține focul cu putere.","cue":"Ține"},{"durationSeconds":4,"instruction":"Suflă încet — ca un dragon blând.","cue":"Suflă"},{"durationSeconds":4,"instruction":"Odihnește-te. Simte pieptul.","cue":"Odihnă"},{"durationSeconds":4,"instruction":"Umple cu foc.","cue":"Umple"},{"durationSeconds":4,"instruction":"Ține.","cue":"Ține"},{"durationSeconds":4,"instruction":"Suflă încet.","cue":"Suflă"},{"durationSeconds":4,"instruction":"Odihnă.","cue":"Odihnă"},{"durationSeconds":4,"instruction":"Ultima dată — umple.","cue":"Umple"},{"durationSeconds":4,"instruction":"Ține.","cue":"Ține"},{"durationSeconds":4,"instruction":"Suflă tot afară.","cue":"Suflă"},{"durationSeconds":15,"instruction":"Observă — corpul tău e puțin mai moale acum?","cue":"Observă"}],"parentGuide":{"intro":"Așează-te lângă copil, la nivelul ochilor lui. Respiră cu el, nu peste el — ritmul tău îl ghidează. Vorbește cald, cu voce joasă.","stepsGuide":["Pune-ți propriile picioare pe podea. Modelează postura fără să-i spui „stai drept" — arată-i.","Inspiră vizibil. Pune o mână pe burta ta dacă vrei să vadă.","Ține respirația cu el — 4 secunde. Nu-l corecta dacă ține mai puțin.","Suflă lung și audibil. Zâmbește ușor.","Liniște. Nu spune nimic. Doar fii prezent.","A doua rundă. Același ritm.","Dacă e agitat, adu-l blând înapoi cu vocea: „Hai împreună, respirăm."","Suflă cu el din nou.","Pauză. Nu umple tăcerea.","Spune-i: „Ultima dată, ești foarte bine."","Ține. Ochii lui poate se închid — asta e bine.","Suflă tot afară — lung.","Lasă-l să-ți spună el cum se simte. Nu întreba, așteaptă."],"tips":["Dacă râde sau se distrage, nu-l certa. Râsul e și el eliberare.","Dacă vrea să se oprească la jumătate, e perfect. Validează: „Bine, ai făcut destul."","Respirația ta trebuie să fie mai lentă ca a lui — asta co-reglează sistemul lui nervos."],"outro":"Spune-i blând: „Ai fost un dragon minunat." Apoi întreabă: „Ce ai simțit?" Ascultă fără să interpretezi."}}$$,
  'ro',
  2,
  'SEED'
);

-- Seed 2: Căsuța Broaștei Țestoase (Turtle Shell — MINDFULNESS, ~3 min)
INSERT INTO games (user_id, type, title, description, content, language, estimated_minutes, source)
VALUES (
  '__seed__',
  'MINDFULNESS',
  $$Căsuța Broaștei Țestoase$$,
  $$Când emoția e prea mare — ghemuiește-te ca o țestoasă, respiră în căsuța ta, ieși când ești gata.$$,
  $${"steps":[{"durationSeconds":15,"instruction":"Ceva se simte foarte mare acum. E în regulă.","cue":"E în regulă"},{"durationSeconds":15,"instruction":"Fă-te ghemuit ca o țestoasă în căsuța ei. Brațele strânse, bărbia în jos.","cue":"Ghemuit"},{"durationSeconds":8,"instruction":"Respiră încet înăuntrul căsuței.","cue":"Inspiră"},{"durationSeconds":8,"instruction":"Suflă și mai încet.","cue":"Expiră"},{"durationSeconds":8,"instruction":"Respiră.","cue":"Inspiră"},{"durationSeconds":8,"instruction":"Suflă.","cue":"Expiră"},{"durationSeconds":8,"instruction":"Respiră.","cue":"Inspiră"},{"durationSeconds":8,"instruction":"Suflă.","cue":"Expiră"},{"durationSeconds":15,"instruction":"Ce culoare are căsuța ta acum? Imaginează.","cue":"Imaginează"},{"durationSeconds":10,"instruction":"Încet… uită-te afară cu ochii.","cue":"Uită-te"},{"durationSeconds":10,"instruction":"Acum capul, foarte încet.","cue":"Ieși"},{"durationSeconds":15,"instruction":"Scutură ușor corpul. Privește în jur. Ești în siguranță.","cue":"Siguranță"}],"parentGuide":{"intro":"Exercițiul e pentru momentele când emoția e prea mare — frică, furie, rușine. Fă-l împreună. Stai aproape dar lasă-i spațiu corpului lui.","stepsGuide":["Validează ce simte: „Da, e mult. Îți văd sentimentul." Nu minimiza.","Ghemuiește-te și tu. Arată-i că nu e ridicol — e protecție.","Respiră lung alături. Nu-l atinge încă dacă e furios.","Expiră mai lung decât inspiri — asta calmează sistemul nervos.","Liniște. Las-o să fie.","Dacă scâncește, e ok. Nu opri exercițiul.","Respiră cu el al treilea ciclu.","Aproape e gata — continuă.","Întreabă încet despre culoare. Dacă nu răspunde, zâmbește și spune „a mea e verde".","Când iese din căsuță, nu-l încarca cu întrebări.","Lasă-l să se ridice în ritmul lui.","Acum îi poți pune o mână pe spate dacă vrea. Întreabă: „Pot să te țin?""],"tips":["Dacă se furișează înainte de final, e bine. Scopul nu e să-l ții în căsuță — e să-i arăți că are unde să se întoarcă.","Nu-l învăța să-și ceară scuze după exercițiu. Emoțiile nu au nevoie de scuze.","Folosește-l preventiv, nu doar în criză — devine un refugiu familiar."],"outro":"Îl poți întreba: „Vrei o îmbrățișare?" Dacă spune nu, respectă. Spune-i: „Sunt aici. Când ești gata.""}}$$,
  'ro',
  3,
  'SEED'
);

-- Seed 3: Borcanul cu Sclipici (Calm Down Jar — MINDFULNESS, ~2 min)
INSERT INTO games (user_id, type, title, description, content, language, estimated_minutes, source)
VALUES (
  '__seed__',
  'MINDFULNESS',
  $$Borcanul cu Sclipici$$,
  $$Imaginează un borcan cu sclipici. Scutură-l sălbatic, apoi privește cum se așează — mintea ta poate la fel.$$,
  $${"steps":[{"durationSeconds":10,"instruction":"Stai comod. Imaginează un borcan — orice formă, orice culoare îți place.","cue":"Imaginează"},{"durationSeconds":10,"instruction":"Umple-l cu sclipici. Mult, strălucitor, învârtind.","cue":"Umple"},{"durationSeconds":15,"instruction":"Scutură borcanul tare. Vezi cât de sălbatic e sclipiciul — ca gândurile ocupate.","cue":"Scutură"},{"durationSeconds":20,"instruction":"Acum ține-l nemișcat. Doar privește.","cue":"Privește"},{"durationSeconds":25,"instruction":"Sclipiciul încetinește… fulg după fulg.","cue":"Așează-se"},{"durationSeconds":25,"instruction":"Observă bucățile care se așează pe fund.","cue":"Așează-se"},{"durationSeconds":15,"instruction":"Borcanul e clar acum. Poți vedea prin el.","cue":"Clar"},{"durationSeconds":10,"instruction":"Și mintea ta se poate așeza așa. Bravo.","cue":"Odihnă"}],"parentGuide":{"intro":"Exercițiul e vizualizat — nu ai nevoie de nimic fizic. Dar dacă ai un borcan de sticlă cu sclipici acasă, folosește-l real prima dată. Ușurează imaginația data viitoare.","stepsGuide":["Întreabă-l: „Cum e borcanul tău?" fără să insiști. Lasă-l să aleagă.","Poți spune „al meu are sclipici auriu" ca să modelezi.","Scutură-ți mâinile în aer — amuzant, dar ajută.","Pauză. Nu întrerupe tăcerea. Aici se întâmplă calmarea.","Cuvintele să fie lente: „În-ce-ti-nind…"","Dacă se foiește, respiră mai lung tu — el te imită.","Poate sta complet liniștit. Nu-l certa dacă nu.","Zâmbet cald. Oferă o atingere dacă pare că vrea."],"tips":["Dacă nu-i place sclipiciul, lasă-l să aleagă altceva: zăpadă, stele, peștișori.","Funcționează seara înainte de culcare mai bine decât în toiul crizei.","Oferă-l ca „unealtă a lui" — ceva ce poate face singur când îi e greu."],"outro":"Spune: „Asta e a ta. O poți face oricând — la școală, în pat, în mașină." Puterea e că e portabilă."}}$$,
  'ro',
  2,
  'SEED'
);

-- Seed 4: Prinde Gândăcelul Grijii (Catch the Worry Bug — CBT_REFRAME, ~5 min)
INSERT INTO games (user_id, type, title, description, content, language, estimated_minutes, source)
VALUES (
  '__seed__',
  'CBT_REFRAME',
  $$Prinde Gândăcelul Grijii$$,
  $$Numește trucul pe care-l folosește Gândăcelul Grijii — apoi răspunde cu Vocea Curajoasă.$$,
  $${"steps":[{"kind":"situation","prompt":"Ce s-a întâmplat și te-a făcut să te simți îngrijorat? Spune în una-două propoziții."},{"kind":"thought","prompt":"Ce ți-a șoptit Gândăcelul Grijii la ureche?"},{"kind":"distortion","prompt":"Ce truc folosea Gândăcelul?","options":["Mărețul Monstru — face lucrurile mici să pară uriașe","Globul de Cristal — se preface că știe viitorul","Judecătorul Rău — te numește cu cuvinte urâte","Mereu-Niciodată — spune că așa va fi mereu sau niciodată"]},{"kind":"reframe","prompt":"Ce ar spune Vocea Curajoasă în schimb? Vocea Curajoasă spune adevărul și e blândă."}],"parentGuide":{"intro":"Exercițiul ajută copilul să externalizeze gândul anxios — nu e el „rău", e doar un gândăcel care păcălește. Rolul tău: validează simțirea, explorează fără să „corectezi". Nu-i da tu răspunsul final — lasă-l pe el să găsească Vocea Curajoasă.","stepsGuide":["Citește întrebarea cu voce caldă. Dacă nu știe ce să spună, oferă-i o rampă: „A fost ceva la școală? Acasă?" Nu presa.","Aici vulnerabilitatea e mare. Nu contrazice gândul („nu, nu ești prost"). Doar ascultă și notează. Poți spune: „Ok, asta a spus Gândăcelul. L-am prins."","Citește toate 4 opțiuni cu voce ușoară. Dacă nu se hotărăște, spune: „Poți alege două dacă vrei." Nu-i spune tu care e — chiar dacă „știi" răspunsul.","Aici e magia. Așteaptă. Dacă nu vine Vocea Curajoasă, întreabă: „Ce i-ai spune unui prieten care simte asta?" Apoi: „Acum spune-ți ție la fel.""],"tips":["Dacă pare că se reproșează — oprește. Spune: „Gândăcelul nu ești tu. Tu ești cel care îl prinde."","Dacă alege Judecătorul Rău — validează: „Da, e cruntă vocea aia. Dar nu spune adevărul."","La final, scrie reframe-ul și pune-l pe frigider sau în camera lui. Să-l vadă."],"outro":"Spune-i: „Ai prins un Gândăcel azi. Ăsta e un super-erou." Nu adăuga sfaturi — a făcut treaba."}}$$,
  'ro',
  5,
  'SEED'
);

-- Seed 5: Vremea Emoțiilor Mele (My Feelings Weather — JOURNAL_PROMPT, ~6 min)
INSERT INTO games (user_id, type, title, description, content, language, estimated_minutes, source)
VALUES (
  '__seed__',
  'JOURNAL_PROMPT',
  $$Vremea Emoțiilor Mele$$,
  $$Descrie ziua ca vreme — însorită, înnorată, furtunoasă sau calmă — și observă ce ajută vremea să se schimbe.$$,
  $${"prompts":["Cum a fost vremea înăuntrul tău azi? (însorită, înnorată, ploioasă, furtunoasă sau cețoasă?)","Ce a făcut vremea asta să apară?","A fost un moment când vremea s-a însorit? Ce a ajutat?","Ce vreme speri să fie mâine?"],"writeToNote":true,"parentGuide":{"intro":"Jurnal cu imagini, nu cu analiză. Lasă-l să deseneze vremea dacă nu vrea să scrie — merge și așa. Dacă e prea mic să scrie, scrie tu ce dictează el.","stepsGuide":["Dacă ezită, dă-i opțiuni: „A fost mai mult soare sau nori?" Poți desena împreună vremile pe o hârtie separată.","Nu-l corecta dacă spune „pentru că ești rea". Dă-i voie să fie sincer. Spune: „Mulțumesc că-mi spui."","Aici căutăm resursele lui. Dacă răspunde „nimic", întreabă: „Cine era lângă tine când s-a înseninat?"","Speranță concretă. Evită să promiți — doar vezi ce dorește el."],"tips":["Fă-l zilnic la aceeași oră (după-amiază sau seară) — rutina îl face mai ușor.","Nu-l folosi după ceartă. E pentru reflectare, nu pentru probleme.","Păstrează notele — se vor vedea tipare în timp."],"outro":"Spune: „Mersi că mi-ai împărtășit vremea ta." Apoi, opțional: „Vrei să-ți spun a mea?" Dacă da, împărtășește scurt, cu vulnerabilitate."}}$$,
  'ro',
  6,
  'SEED'
);

COMMIT;

-- =============================================================================
-- DOWN (copy into psql to roll back):
-- =============================================================================
-- BEGIN;
-- DROP INDEX IF EXISTS idx_game_completions_user;
-- DROP INDEX IF EXISTS idx_game_completions_game;
-- DROP TABLE IF EXISTS game_completions;
-- DROP INDEX IF EXISTS idx_games_issue_id;
-- DROP INDEX IF EXISTS idx_games_goal_id;
-- DROP INDEX IF EXISTS idx_games_type;
-- DROP INDEX IF EXISTS idx_games_user_created;
-- DROP TABLE IF EXISTS games;
-- COMMIT;
