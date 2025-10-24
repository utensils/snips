use time::OffsetDateTime;

/// Get current Unix timestamp in seconds
#[allow(dead_code)]
pub fn current_timestamp() -> i64 {
    OffsetDateTime::now_utc().unix_timestamp()
}

/// Get current Unix timestamp in milliseconds
#[allow(dead_code)]
pub fn current_timestamp_millis() -> i64 {
    let now = OffsetDateTime::now_utc();
    now.unix_timestamp() * 1000 + i64::from(now.millisecond())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_current_timestamp() {
        let ts = current_timestamp();
        // Should be a reasonable Unix timestamp (after 2020)
        assert!(ts > 1_600_000_000);
    }

    #[test]
    fn test_current_timestamp_millis() {
        let ts = current_timestamp_millis();
        // Should be a reasonable Unix timestamp in milliseconds
        assert!(ts > 1_600_000_000_000);
    }

    #[test]
    fn test_timestamp_ordering() {
        let ts1 = current_timestamp();
        std::thread::sleep(std::time::Duration::from_millis(10));
        let ts2 = current_timestamp();
        assert!(ts2 >= ts1);
    }
}
