use futures::future::join_all;

/// Runtime-agnostic concurrent task runner.
/// Uses futures::future::join_all — works in both WASM and native runtimes.
pub struct ConcurrentRunner;

impl ConcurrentRunner {
    /// Fan-out an async function over all items concurrently.
    /// Returns (successes, errors) partitioned from all results.
    pub async fn run_all<I, T, E, Fut>(
        items: Vec<I>,
        f: impl Fn(I) -> Fut,
    ) -> (Vec<T>, Vec<E>)
    where
        Fut: std::future::Future<Output = std::result::Result<T, E>>,
    {
        join_all(items.into_iter().map(f))
            .await
            .into_iter()
            .fold((Vec::new(), Vec::new()), |(mut ok, mut err), r| {
                match r { Ok(v) => ok.push(v), Err(e) => err.push(e) }
                (ok, err)
            })
    }

    /// Run two futures concurrently and return both results.
    pub async fn join_two<A, B>(a: A, b: B) -> (A::Output, B::Output)
    where
        A: std::future::Future,
        B: std::future::Future,
    {
        futures::future::join(a, b).await
    }
}
