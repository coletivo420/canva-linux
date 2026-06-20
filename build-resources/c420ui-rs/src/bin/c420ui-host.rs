use c420ui_rs::{commands, exit_codes};

fn print_usage() {
    eprintln!("Usage: c420ui-host <command> [options]");
    eprintln!("Commands:");
    eprintln!("  host-info --json");
    eprintln!("  doctor --json");
    eprintln!("  check-host-dependencies --json");
    eprintln!("  project-config --json");
    eprintln!("  status-panels --json");
    eprintln!("  clipboard-write --json");
    eprintln!("  action-run --json-lines");
    eprintln!("  run-process --json-lines");
    eprintln!("  sudo-validate --json");
    eprintln!("  remove-paths --json");
    eprintln!("  fix-permissions --json");
    eprintln!("  fs-ops --json");
    eprintln!("  ensure-linux-unpacked --json");
    eprintln!("  artifact-file-ops --json");
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

    if cmd == "project-config" {
        let has_json = args.iter().any(|arg| arg == "--json");
        if !has_json {
            eprintln!("Error: project-config command requires --json");
            std::process::exit(exit_codes::INVALID_USAGE);
        }
        match commands::project_config::execute() {
            Ok(_) => std::process::exit(exit_codes::SUCCESS),
            Err(e) => {
                eprintln!("Error: {}", e);
                std::process::exit(exit_codes::INVALID_USAGE);
            }
        }
    }

    if cmd == "status-panels" {
        let has_json = args.iter().any(|arg| arg == "--json");
        if !has_json {
            eprintln!("Error: status-panels command requires --json");
            std::process::exit(exit_codes::INVALID_USAGE);
        }
        match commands::status_panels::execute() {
            Ok(_) => std::process::exit(exit_codes::SUCCESS),
            Err(e) => {
                eprintln!("Error: {}", e);
                std::process::exit(exit_codes::INVALID_USAGE);
            }
        }
    }

    if cmd == "clipboard-write" {
        let has_json = args.iter().any(|arg| arg == "--json");
        if !has_json {
            eprintln!("Error: clipboard-write command requires --json");
            std::process::exit(exit_codes::INVALID_USAGE);
        }
        match commands::clipboard_write::execute() {
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

    if cmd == "action-run" {
        let has_json_lines = args.iter().any(|arg| arg == "--json-lines");
        if !has_json_lines {
            eprintln!("Error: action-run command requires --json-lines");
            std::process::exit(exit_codes::INVALID_USAGE);
        }
        std::process::exit(commands::action_run::execute());
    }

    if cmd == "sudo-validate" {
        let has_json = args.iter().any(|arg| arg == "--json");
        if !has_json {
            eprintln!("Error: sudo-validate command requires --json");
            std::process::exit(exit_codes::INVALID_USAGE);
        }
        match commands::sudo_validate::execute() {
            Ok(_) => std::process::exit(exit_codes::SUCCESS),
            Err(e) => {
                eprintln!("Error: {}", e);
                std::process::exit(exit_codes::INVALID_USAGE);
            }
        }
    }

    if cmd == "remove-paths" {
        let has_json = args.iter().any(|arg| arg == "--json");
        if !has_json {
            eprintln!("Error: remove-paths command requires --json");
            std::process::exit(exit_codes::INVALID_USAGE);
        }
        match commands::remove_paths::execute() {
            Ok(_) => std::process::exit(exit_codes::SUCCESS),
            Err(e) => {
                eprintln!("Error: {}", e);
                std::process::exit(exit_codes::INVALID_USAGE);
            }
        }
    }

    if cmd == "fix-permissions" {
        let has_json = args.iter().any(|arg| arg == "--json");
        if !has_json {
            eprintln!("Error: fix-permissions command requires --json");
            std::process::exit(exit_codes::INVALID_USAGE);
        }
        match commands::fix_permissions::execute() {
            Ok(_) => std::process::exit(exit_codes::SUCCESS),
            Err(e) => {
                eprintln!("Error: {}", e);
                std::process::exit(exit_codes::INVALID_USAGE);
            }
        }
    }

    if cmd == "fs-ops" {
        let has_json = args.iter().any(|arg| arg == "--json");
        if !has_json {
            eprintln!("Error: fs-ops command requires --json");
            std::process::exit(exit_codes::INVALID_USAGE);
        }
        match commands::fs_ops::execute() {
            Ok(_) => std::process::exit(exit_codes::SUCCESS),
            Err(e) => {
                eprintln!("Error: {}", e);
                std::process::exit(exit_codes::INVALID_USAGE);
            }
        }
    }

    if cmd == "ensure-linux-unpacked" {
        let has_json = args.iter().any(|arg| arg == "--json");
        if !has_json {
            eprintln!("Error: ensure-linux-unpacked command requires --json");
            std::process::exit(exit_codes::INVALID_USAGE);
        }
        match commands::ensure_linux_unpacked::execute() {
            Ok(_) => std::process::exit(exit_codes::SUCCESS),
            Err(e) => {
                eprintln!("Error: {}", e);
                std::process::exit(exit_codes::INVALID_USAGE);
            }
        }
    }

    if cmd == "artifact-file-ops" {
        let has_json = args.iter().any(|arg| arg == "--json");
        if !has_json {
            eprintln!("Error: artifact-file-ops command requires --json");
            std::process::exit(exit_codes::INVALID_USAGE);
        }
        match commands::artifact_file_ops::execute() {
            Ok(_) => std::process::exit(exit_codes::SUCCESS),
            Err(e) => {
                eprintln!("Error: {}", e);
                std::process::exit(exit_codes::INVALID_USAGE);
            }
        }
    }

    eprintln!("Error: unknown command '{}'", cmd);
    print_usage();
    std::process::exit(exit_codes::INVALID_USAGE);
}
