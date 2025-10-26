use std::process;

fn main() {
    let mut args = std::env::args();
    // Skip program name
    args.next();

    match args.next().as_deref() {
        Some("capture") => {
            if let Err(err) = capture_quick_add() {
                eprintln!("Error: {}", err);
                process::exit(1);
            }
        }
        Some("--help") | Some("-h") => {
            print_usage();
        }
        Some(other) => {
            eprintln!("Unknown command: {}", other);
            print_usage();
            process::exit(1);
        }
        None => {
            print_usage();
        }
    }
}

fn print_usage() {
    println!(
        "snips-cli - helper tooling for Snips automation

USAGE:
    snips-cli capture    Trigger the Quick Add flow via D-Bus (Linux/Hyprland)
    snips-cli --help     Show this message
"
    );
}

#[cfg(target_os = "linux")]
fn capture_quick_add() -> Result<(), String> {
    let runtime = tokio::runtime::Runtime::new()
        .map_err(|err| format!("Failed to initialize Tokio runtime: {}", err))?;

    runtime.block_on(async {
        use zbus::{proxy::Proxy, Connection};

        let connection = Connection::session()
            .await
            .map_err(|err| format!("Failed to connect to session bus: {}", err))?;

        let proxy = Proxy::new(
            &connection,
            "io.utensils.snips",
            "/io/utensils/snips",
            "io.utensils.snips",
        )
        .await
        .map_err(|err| format!("Failed to build proxy: {}", err))?;

        proxy
            .call_method::<_, ()>("ShowQuickAdd", &())
            .await
            .map_err(|err| format!("D-Bus invocation failed: {}", err))?;

        println!("Quick Add triggered via D-Bus. Check Snips for the capture dialog.");
        Ok(())
    })
}

#[cfg(not(target_os = "linux"))]
fn capture_quick_add() -> Result<(), String> {
    Err("snips-cli capture is only available on Linux builds.".into())
}
