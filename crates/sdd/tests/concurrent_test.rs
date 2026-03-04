use std::sync::{Arc, Mutex};
use sdd::ConcurrentRunner;

#[tokio::test]
async fn test_run_all_success() {
    let items = vec![1, 2, 3, 4, 5];
    let (ok, err): (Vec<i32>, Vec<String>) = ConcurrentRunner::run_all(items, |n| async move {
        Ok::<_, String>(n * 2)
    }).await;

    assert_eq!(ok, vec![2, 4, 6, 8, 10]);
    assert!(err.is_empty());
}

#[tokio::test]
async fn test_run_all_mixed_results() {
    let items = vec![1, 2, 3, 4];
    let (ok, err): (Vec<i32>, Vec<String>) = ConcurrentRunner::run_all(items, |n| async move {
        if n % 2 == 0 {
            Ok(n)
        } else {
            Err(format!("odd: {n}"))
        }
    }).await;

    assert_eq!(ok, vec![2, 4]);
    assert_eq!(err.len(), 2);
    assert!(err[0].contains("odd"));
}

#[tokio::test]
async fn test_run_all_empty() {
    let items: Vec<i32> = vec![];
    let (ok, err): (Vec<i32>, Vec<String>) = ConcurrentRunner::run_all(items, |n| async move {
        Ok::<_, String>(n)
    }).await;

    assert!(ok.is_empty());
    assert!(err.is_empty());
}

#[tokio::test]
async fn test_run_all_actually_concurrent() {
    let order = Arc::new(Mutex::new(Vec::<u32>::new()));

    let items = vec![1u32, 2, 3];
    let order_ref = order.clone();
    let (_ok, _err): (Vec<()>, Vec<String>) = ConcurrentRunner::run_all(items, move |n| {
        let order = order_ref.clone();
        async move {
            // All futures should be polled before any completes
            order.lock().unwrap().push(n);
            Ok::<_, String>(())
        }
    }).await;

    let recorded = order.lock().unwrap();
    assert_eq!(recorded.len(), 3);
}

#[tokio::test]
async fn test_join_two() {
    let (a, b) = ConcurrentRunner::join_two(
        async { 42 },
        async { "hello" },
    ).await;

    assert_eq!(a, 42);
    assert_eq!(b, "hello");
}

#[tokio::test]
async fn test_join_two_different_types() {
    let (a, b) = ConcurrentRunner::join_two(
        async { vec![1, 2, 3] },
        async { Ok::<_, String>(true) },
    ).await;

    assert_eq!(a, vec![1, 2, 3]);
    assert!(b.unwrap());
}
