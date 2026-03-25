use anyhow::Result;
use tantivy::{collector::TopDocs, query::QueryParser, schema::*, Index, IndexWriter, ReloadPolicy};

pub fn build_schema() -> Schema {
    let mut b = Schema::builder();
    b.add_text_field("company_id", STRING | STORED);
    b.add_text_field("company_name", TEXT | STORED);
    b.add_text_field("domain", STRING | STORED);
    b.add_text_field("industry", TEXT | STORED);
    b.add_text_field("location", TEXT | STORED);
    b.add_text_field("tech_stack", TEXT | STORED);
    b.add_text_field("description", TEXT);
    b.add_text_field("page_text", TEXT);
    b.build()
}

pub fn create_index(path: &str) -> Result<Index> {
    std::fs::create_dir_all(path)?;
    let dir = tantivy::directory::MmapDirectory::open(path)?;
    Ok(Index::open_or_create(dir, build_schema())?)
}

pub fn create_writer(index: &Index) -> Result<IndexWriter> { Ok(index.writer(15_000_000)?) }

pub fn index_company(writer: &mut IndexWriter, company: &crate::Company, page_text: &str) -> Result<()> {
    let s = writer.index().schema();
    if let Some(ref d) = company.domain {
        writer.delete_term(tantivy::Term::from_field_text(s.get_field("domain").unwrap(), d));
    }
    let mut doc = tantivy::TantivyDocument::new();
    doc.add_text(s.get_field("company_id").unwrap(), &company.id);
    doc.add_text(s.get_field("company_name").unwrap(), &company.name);
    if let Some(ref v) = company.domain { doc.add_text(s.get_field("domain").unwrap(), v); }
    if let Some(ref v) = company.industry { doc.add_text(s.get_field("industry").unwrap(), v); }
    if let Some(ref v) = company.location { doc.add_text(s.get_field("location").unwrap(), v); }
    if let Some(ref v) = company.tech_stack { doc.add_text(s.get_field("tech_stack").unwrap(), v); }
    if let Some(ref v) = company.description { doc.add_text(s.get_field("description").unwrap(), v); }
    doc.add_text(s.get_field("page_text").unwrap(), page_text);
    writer.add_document(doc)?;
    Ok(())
}

pub fn commit(writer: &mut IndexWriter) -> Result<()> { writer.commit()?; Ok(()) }

#[derive(Debug, serde::Serialize)]
pub struct SearchResult { pub company_id: String, pub company_name: String, pub domain: String, pub industry: String, pub location: String, pub score: f32 }

pub fn search(index: &Index, query_str: &str, limit: usize) -> Result<Vec<SearchResult>> {
    let reader = index.reader_builder().reload_policy(ReloadPolicy::OnCommitWithDelay).try_into()?;
    let searcher = reader.searcher();
    let s = index.schema();
    let fields = vec![s.get_field("company_name").unwrap(), s.get_field("industry").unwrap(),
                      s.get_field("description").unwrap(), s.get_field("page_text").unwrap()];
    let qp = QueryParser::for_index(index, fields);
    let query = qp.parse_query(query_str)?;
    let top = searcher.search(&query, &TopDocs::with_limit(limit))?;

    let get = |doc: &tantivy::TantivyDocument, f: &str| doc.get_first(s.get_field(f).unwrap())
        .and_then(|v| v.as_str()).unwrap_or("").to_string();

    Ok(top.into_iter().map(|(score, addr)| {
        let doc: tantivy::TantivyDocument = searcher.doc(addr).unwrap();
        SearchResult { company_id: get(&doc,"company_id"), company_name: get(&doc,"company_name"),
            domain: get(&doc,"domain"), industry: get(&doc,"industry"), location: get(&doc,"location"), score }
    }).collect())
}
