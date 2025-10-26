#[cfg(target_os = "linux")]
fn main() {
    use snips_lib::services::theme;

    let args: Vec<String> = std::env::args().collect();

    match args.as_slice() {
        [_, cmd] if cmd == "list" => match theme::list_omarchy_themes() {
            Ok(themes) => {
                if themes.is_empty() {
                    println!("No Omarchy themes found under ~/.config/omarchy/themes.");
                } else {
                    for theme in themes {
                        println!("{}", theme);
                    }
                }
            }
            Err(err) => {
                eprintln!("Failed to list Omarchy themes: {}", err);
                std::process::exit(1);
            }
        },
        [_, cmd, name] if cmd == "import" => match theme::import_omarchy_theme(name) {
            Ok(palette) => {
                let fragment = std::env::var_os("HOME")
                    .map(std::path::PathBuf::from)
                    .map(|home| home.join(format!(".config/snips/themes/{}.css", palette.name)));
                if let Some(path) = fragment {
                    println!("Imported theme '{}' into {}", palette.name, path.display());
                } else {
                    println!("Imported theme '{}'", palette.name);
                }
            }
            Err(err) => {
                eprintln!("Failed to import Omarchy theme '{}': {}", name, err);
                std::process::exit(1);
            }
        },
        _ => {
            eprintln!("Usage: snips-theme <list|import <theme-name>>");
            std::process::exit(64);
        }
    }
}

#[cfg(not(target_os = "linux"))]
fn main() {
    eprintln!("snips-theme CLI is only available on Linux.");
    std::process::exit(1);
}
