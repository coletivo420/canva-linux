mod commands;
mod json;

fn print_usage() {
    eprintln!("Usage: c420ui-host <command> [options]");
    eprintln!("Commands:");
    eprintln!("  host-info --json");
    eprintln!("  doctor --json");
    eprintln!("Options:");
    eprintln!("  --version");
}

fn main() {
    let args: Vec<String> = std::env::args().collect();

    if args.len() < 2 {
        print_usage();
        std::process::exit(2);
    }

    let cmd = &args[1];

    if cmd == "--version" {
        println!("c420ui-host 0.1.0");
        std::process::exit(0);
    }

    if cmd == "host-info" {
        let has_json = args.iter().any(|arg| arg == "--json");
        if !has_json {
            eprintln!("Error: host-info command requires --json");
            std::process::exit(2);
        }
        match commands::host_info::execute(true) {
            Ok(_) => std::process::exit(0),
            Err(e) => {
                eprintln!("Error: {}", e);
                std::process::exit(1);
            }
        }
    }

    if cmd == "doctor" {
        let has_json = args.iter().any(|arg| arg == "--json");
        if !has_json {
            eprintln!("Error: doctor command requires --json");
            std::process::exit(2);
        }
        match commands::doctor::execute(true) {
            Ok(_) => std::process::exit(0),
            Err(e) => {
                eprintln!("Error: {}", e);
                std::process::exit(1);
            }
        }
    }

    eprintln!("Error: unknown command '{}'", cmd);
    print_usage();
    std::process::exit(2);
}
