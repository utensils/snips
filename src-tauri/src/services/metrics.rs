use once_cell::sync::Lazy;
use prometheus::{Encoder, IntCounterVec, Opts, Registry, TextEncoder};

static REGISTRY: Lazy<Registry> = Lazy::new(Registry::new);
static FOCUS_COUNTER: Lazy<IntCounterVec> = Lazy::new(|| {
    let opts = Opts::new(
        "snips_window_focus_attempts_total",
        "Window focus attempts grouped by compositor and result",
    );
    let counter = IntCounterVec::new(opts, &["compositor", "result"])
        .expect("failed to create focus attempt counter");
    REGISTRY
        .register(Box::new(counter.clone()))
        .expect("failed to register focus attempt counter");
    counter
});

/// Record a window focus attempt in the Prometheus counter set.
pub fn record_window_focus(compositor: &str, success: bool) {
    let label = if success { "success" } else { "failure" };
    FOCUS_COUNTER.with_label_values(&[compositor, label]).inc();
}

/// Return the current value for a particular focus counter label set.
pub fn focus_counter_value(compositor: &str, result: &str) -> Option<u64> {
    let counter = Lazy::get(&FOCUS_COUNTER)?;
    counter
        .get_metric_with_label_values(&[compositor, result])
        .ok()
        .map(|metric| metric.get())
}

/// Gather the registered Prometheus metrics into a textual exposition format.
pub fn gather_metrics() -> Option<String> {
    // If the counter has never been touched, avoid emitting empty metrics output.
    _ = Lazy::get(&FOCUS_COUNTER)?;

    let metric_families = REGISTRY.gather();
    if metric_families.is_empty() {
        return None;
    }

    let encoder = TextEncoder::new();
    let mut buffer = Vec::new();
    if encoder.encode(&metric_families, &mut buffer).is_err() {
        return None;
    }

    String::from_utf8(buffer).ok()
}

#[cfg(test)]
pub fn reset_for_tests() {
    if let Some(counter) = Lazy::get(&FOCUS_COUNTER) {
        counter.reset();
    }
}
