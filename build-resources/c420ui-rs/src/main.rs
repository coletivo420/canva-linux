mod commands;
mod exit_codes;
mod host;
mod input;
mod json;

fn print_usage() {
    eprintln!("Usage: c420ui-host <command> [options]");
    eprintln!("Commands:");
    eprintln!("  host-info --json");
    eprintln!("  doctor --json");
    eprintln!("  check-host-dependencies --json");
    eprintln!("  run-process --json-lines");
    eprintln!("Options:");
    eprintln!("  --version");
}

fn main() {
    let args: Vec<String> = std::env::args().collect();

    if args.len() < 2 {
        print_usage();
        std::process::exit(exit_codes::INVALID_USAGE);
    }

    let cmd = &args[1];

    if cmd == "--version" {
        println!("c420ui-host 0.1.0");
        std::process::exit(exit_codes::SUCCESS);
    }

    if cmd == "host-info" {
        let has_json = args.iter().any(|arg| arg == "--json");
        if !has_json {
            eprintln!("Error: host-info command requires --json");
            std::process::exit(exit_codes::INVALID_USAGE);
        }
        match commands::host_info::execute(true) {
            Ok(_) => std::process::exit(exit_codes::SUCCESS),
            Err(e) => {
                eprintln!("Error: {}", e);
                std::process::exit(exit_codes::OPERATIONAL_ERROR);
            }
        }
    }

    if cmd == "doctor" {
        let has_json = args.iter().any(|arg| arg == "--json");
        if !has_json {
            eprintln!("Error: doctor command requires --json");
            std::process::exit(exit_codes::INVALID_USAGE);
        }
        match commands::doctor::execute(true) {
            Ok(_) => std::process::exit(exit_codes::SUCCESS),
            Err(e) => {
                eprintln!("Error: {}", e);
                std::process::exit(exit_codes::OPERATIONAL_ERROR);
            }
        }
    }

    if cmd == "check-host-dependencies" {
        let has_json = args.iter().any(|arg| arg == "--json");
        if !has_json {
            eprintln!("Error: check-host-dependencies command requires --json");
            std::process::exit(exit_codes::INVALID_USAGE);
        }
        match commands::check_host_dependencies::execute() {
            Ok(_) => std::process::exit(exit_codes::SUCCESS),
            Err(e) => {
                eprintln!("Error: {}", e);
                std::process::exit(exit_codes::INVALID_USAGE);
            }
        }
    }

    if cmd == "run-process" {
        let has_json_lines = args.iter().any(|arg| arg == "--json-lines");
        if !has_json_lines {
            eprintln!("Error: run-process command requires --json-lines");
            std::process::exit(exit_codes::INVALID_USAGE);
        }
        std::process::exit(commands::run_process::execute());
    }

    eprintln!("Error: unknown command '{}'", cmd);
    print_usage();
    std::process::exit(exit_codes::INVALID_USAGE);
}
