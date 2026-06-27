/// A skill embedded into the binary at compile time.
/// Installed to `~/.claude/skills/<name>/SKILL.md` by the `init` subcommand.
pub struct SkillManifest {
    pub name: &'static str,
    pub content: &'static str,
}

/// An agent embedded into the binary at compile time.
/// Installed to `~/.claude/agents/<filename>` by the `init` subcommand.
pub struct AgentManifest {
    pub filename: &'static str,
    pub content: &'static str,
}

pub const AGENTS: &[AgentManifest] = &[AgentManifest {
    filename: "deep-research-agent.md",
    content: include_str!("../assets/agents/deep-research-agent.md"),
}];

pub const SKILLS: &[SkillManifest] = &[
    SkillManifest {
        name: "cite-sources",
        content: include_str!("../assets/skills/cite-sources.md"),
    },
    SkillManifest {
        name: "competitive-analysis",
        content: include_str!("../assets/skills/competitive-analysis.md"),
    },
    SkillManifest {
        name: "deep-research",
        content: include_str!("../assets/skills/deep-research.md"),
    },
    SkillManifest {
        name: "fact-check",
        content: include_str!("../assets/skills/fact-check.md"),
    },
    SkillManifest {
        name: "find-docs",
        content: include_str!("../assets/skills/find-docs.md"),
    },
    SkillManifest {
        name: "news-monitor",
        content: include_str!("../assets/skills/news-monitor.md"),
    },
];
