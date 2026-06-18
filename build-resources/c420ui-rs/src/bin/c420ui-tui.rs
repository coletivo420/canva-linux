use c420ui_rs::exit_codes;
use c420ui_rs::tui::contracts::TuiRenderInput;
use c420ui_rs::tui::render_smoke;
use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TuiDoctorCheck {
    id: &'static str,
    ok: bool,
    message: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TuiDoctorOutput {
    ok: bool,
    command: &'static str,
    version: &'static str,
    binary: &'static str,
    checks: Vec<TuiDoctorCheck>,
}

fn print_usage() {
    eprintln!("Usage: c420ui-tui <command> [options]");
    eprintln!("Commands:");
    eprintln!("  doctor --json");
    eprintln!("  render --json");
    eprintln!("Options:");
    eprintln!("  --version");
}

fn require_json(args: &[String], command: &str) -> bool {
    if args.iter().any(|arg| arg == "--json") {
        true
    } else {
        eprintln!("Error: {} command requires --json", command);
        false
    }
}

fn print_doctor() -> Result<(), String> {
    let output = TuiDoctorOutput {
        ok: true,
        command: "doctor",
        version: "0.1.0",
        binary: "c420ui-tui",
        checks: vec![TuiDoctorCheck {
            id: "tui-contracts",
            ok: true,
            message: "c420ui Rust TUI contracts are available",
        }],
    };
    println!(
        "{}",
        serde_json::to_string_pretty(&output).map_err(|e| e.to_string())?
    );
    Ok(())
}

fn render() -> Result<(), String> {
    let input: TuiRenderInput = serde_json::from_reader(std::io::stdin())
        .map_err(|e| format!("Invalid JSON input: {}", e))?;
    let output = render_smoke::render(input);
    println!(
        "{}",
        serde_json::to_string_pretty(&output).map_err(|e| e.to_string())?
    );
    Ok(())
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 2 {
        print_usage();
        std::process::exit(exit_codes::INVALID_USAGE);
    }

    let command = &args[1];
    if command == "--version" {
        println!("c420ui-tui 0.1.0");
        std::process::exit(exit_codes::SUCCESS);
    }

    let result = match command.as_str() {
        "doctor" => {
            if !require_json(&args, "doctor") {
                std::process::exit(exit_codes::INVALID_USAGE);
            }
            print_doctor()
        }
        "render" => {
            if !require_json(&args, "render") {
                std::process::exit(exit_codes::INVALID_USAGE);
            }
            render()
        }
        _ => {
            eprintln!("Error: unknown command '{}'", command);
            print_usage();
            std::process::exit(exit_codes::INVALID_USAGE);
        }
    };

    match result {
        Ok(()) => std::process::exit(exit_codes::SUCCESS),
        Err(error) => {
            eprintln!("Error: {}", error);
            std::process::exit(exit_codes::INVALID_USAGE);
        }
    }
}
