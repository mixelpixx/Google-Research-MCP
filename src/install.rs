use anyhow::{Context, Result};
use std::{fs, path::PathBuf};

use crate::manifest::{AGENTS, SKILLS};

const VERSION: &str = env!("CARGO_PKG_VERSION");

fn data_dir() -> Result<PathBuf> {
    Ok(dirs::home_dir()
        .context("could not locate home directory")?
        .join(".google-research-mcp"))
}

fn claude_skills_dir() -> Result<PathBuf> {
    Ok(dirs::home_dir()
        .context("could not locate home directory")?
        .join(".claude")
        .join("skills"))
}

fn claude_agents_dir() -> Result<PathBuf> {
    Ok(dirs::home_dir()
        .context("could not locate home directory")?
        .join(".claude")
        .join("agents"))
}

pub fn run_install() -> Result<()> {
    let skills_dir = claude_skills_dir()?;
    fs::create_dir_all(&skills_dir)
        .with_context(|| format!("creating {}", skills_dir.display()))?;

    println!("Installing google-research-mcp v{}\n", VERSION);

    for skill in SKILLS {
        let dest_dir = skills_dir.join(skill.name);
        fs::create_dir_all(&dest_dir)
            .with_context(|| format!("creating {}", dest_dir.display()))?;
        let dest = dest_dir.join("SKILL.md");
        fs::write(&dest, skill.content)
            .with_context(|| format!("writing {}", dest.display()))?;
        println!("  skill  → {}", dest.display());
    }

    let agents_dir = claude_agents_dir()?;
    fs::create_dir_all(&agents_dir)
        .with_context(|| format!("creating {}", agents_dir.display()))?;
    for agent in AGENTS {
        let dest = agents_dir.join(agent.filename);
        fs::write(&dest, agent.content)
            .with_context(|| format!("writing {}", dest.display()))?;
        println!("  agent  → {}", dest.display());
    }

    let data = data_dir()?;
    fs::create_dir_all(&data)?;
    fs::write(data.join(".installed"), VERSION)?;

    println!(
        "\n{} skills + {} agent(s) installed.\n",
        SKILLS.len(),
        AGENTS.len()
    );
    println!("Next: add this server to your MCP config (e.g. claude_desktop_config.json):\n");
    let exe = std::env::current_exe()?;
    let exe_str = exe.to_string_lossy();
    println!(r#"  "google-research": {{"#);
    println!(r#"    "command": "{}","#, exe_str.replace('\\', "\\\\"));
    println!(r#"    "env": {{ "SERPAPI_KEY": "your_key_here" }}"#);
    println!(r#"  }}"#);
    println!("\nThen restart Claude Desktop or Claude Code.");
    Ok(())
}

pub fn run_uninstall() -> Result<()> {
    let skills_dir = claude_skills_dir()?;
    let mut removed_skills = 0;
    for skill in SKILLS {
        let dest_dir = skills_dir.join(skill.name);
        if dest_dir.exists() {
            fs::remove_dir_all(&dest_dir)
                .with_context(|| format!("removing {}", dest_dir.display()))?;
            println!("  removed → {}", dest_dir.display());
            removed_skills += 1;
        }
    }

    let agents_dir = claude_agents_dir()?;
    let mut removed_agents = 0;
    for agent in AGENTS {
        let p = agents_dir.join(agent.filename);
        if p.exists() {
            fs::remove_file(&p)
                .with_context(|| format!("removing {}", p.display()))?;
            println!("  removed → {}", p.display());
            removed_agents += 1;
        }
    }

    let data = data_dir()?;
    if data.exists() {
        fs::remove_dir_all(&data)?;
    }

    println!(
        "\nUninstalled {} skills and {} agent(s).",
        removed_skills, removed_agents
    );
    println!("Note: remove the MCP server entry from your Claude config manually.");
    Ok(())
}

/// Returns true if the install marker is missing (i.e., we should auto-init).
pub fn needs_install() -> bool {
    match data_dir() {
        Ok(d) => !d.join(".installed").exists(),
        Err(_) => false,
    }
}

/// Silent install — used as a safety net when the MCP server starts up.
/// Writes everything but suppresses console output so it doesn't pollute the stdio JSON-RPC stream.
pub fn run_install_silent() -> Result<()> {
    let skills_dir = claude_skills_dir()?;
    fs::create_dir_all(&skills_dir)?;
    for skill in SKILLS {
        let dest_dir = skills_dir.join(skill.name);
        fs::create_dir_all(&dest_dir)?;
        fs::write(dest_dir.join("SKILL.md"), skill.content)?;
    }

    let agents_dir = claude_agents_dir()?;
    fs::create_dir_all(&agents_dir)?;
    for agent in AGENTS {
        fs::write(agents_dir.join(agent.filename), agent.content)?;
    }

    let data = data_dir()?;
    fs::create_dir_all(&data)?;
    fs::write(data.join(".installed"), VERSION)?;
    Ok(())
}

pub fn print_status() -> Result<()> {
    let marker = data_dir()?.join(".installed");
    if marker.exists() {
        let ver = fs::read_to_string(&marker).unwrap_or_default();
        println!("Installed (v{})", ver.trim());
    } else {
        println!("Not installed. Run `google-research-mcp init` to install skills.");
    }

    let skills_dir = claude_skills_dir()?;
    println!("\nSkills directory: {}", skills_dir.display());
    for skill in SKILLS {
        let p = skills_dir.join(skill.name).join("SKILL.md");
        let mark = if p.exists() { "+" } else { "-" };
        println!("  [{}] {}", mark, skill.name);
    }

    let agents_dir = claude_agents_dir()?;
    println!("\nAgents directory: {}", agents_dir.display());
    for agent in AGENTS {
        let p = agents_dir.join(agent.filename);
        let mark = if p.exists() { "+" } else { "-" };
        println!("  [{}] {}", mark, agent.filename);
    }
    Ok(())
}

pub fn print_skill_content(name: &str) -> Result<()> {
    match SKILLS.iter().find(|s| s.name == name) {
        Some(skill) => {
            print!("{}", skill.content);
            Ok(())
        }
        None => {
            let names: Vec<&str> = SKILLS.iter().map(|s| s.name).collect();
            anyhow::bail!(
                "unknown skill: {}\navailable: {}",
                name,
                names.join(", ")
            )
        }
    }
}
