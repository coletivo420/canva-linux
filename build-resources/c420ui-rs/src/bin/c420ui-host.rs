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
    eprintln!("  bootstrap --json");
    eprintln!("  bootstrap-check --json");
    eprintln!("  bootstrap-manifest --json");
    eprintln!("  source-hash --json");
    eprintln!("  build-metadata --json");
    eprintln!("  settings-get --json");
    eprintln!("  settings-set --json");
    eprintln!("  session-log-read --json");
    eprintln!("  session-log-write --json");
    eprintln!("  session-log-clear --json");
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

    if cmd == "bootstrap" {
        require_json(&args, "bootstrap");
        exit_result(commands::bootstrap::execute());
    }
    if cmd == "bootstrap-check" {
        require_json(&args, "bootstrap-check");
        exit_result(commands::bootstrap_check::execute());
    }
    if cmd == "bootstrap-manifest" {
        require_json(&args, "bootstrap-manifest");
        exit_result(commands::bootstrap_manifest::execute());
    }
    if cmd == "source-hash" {
        require_json(&args, "source-hash");
        exit_result(commands::source_hash::execute());
    }
    if cmd == "build-metadata" {
        require_json(&args, "build-metadata");
        exit_result(commands::build_metadata::execute());
    }
    if cmd == "settings-get" {
        require_json(&args, "settings-get");
        exit_result(commands::settings_get::execute());
    }
    if cmd == "settings-set" {
        require_json(&args, "settings-set");
        exit_result(commands::settings_set::execute());
    }
    if cmd == "session-log-read" {
        require_json(&args, "session-log-read");
        exit_result(commands::session_log_read::execute());
    }
    if cmd == "session-log-write" {
        require_json(&args, "session-log-write");
        exit_result(commands::session_log_write::execute());
    }
    if cmd == "session-log-clear" {
        require_json(&args, "session-log-clear");
        exit_result(commands::session_log_clear::execute());
    }

    eprintln!("Error: unknown command '{}'", cmd);
    print_usage();
    std::process::exit(exit_codes::INVALID_USAGE);
}

fn require_json(args: &[String], command: &str) {
    if !args.iter().any(|arg| arg == "--json") {
        eprintln!("Error: {} command requires --json", command);
        std::process::exit(exit_codes::INVALID_USAGE);
    }
}

fn exit_result(result: Result<(), String>) -> ! {
    match result {
        Ok(_) => std::process::exit(exit_codes::SUCCESS),
        Err(error) => {
            eprintln!("Error: {}", error);
            std::process::exit(exit_codes::INVALID_USAGE);
        }
    }
}
