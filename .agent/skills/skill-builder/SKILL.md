---
name: Skill Builder
description: Facilitates the creation of new skills for the PCA Plot Assistant project.
---

# Skill Builder

This skill provides a structured way to create and manage other skills within the project. Skills are used to encapsulate specific domain knowledge, workflows, or tool-assisted tasks.

## Skill Folder Structure

Each skill must be located in `.agent/skills/<skill-name>/` and contain at least:
- `SKILL.md`: The main instruction file and YAML frontmatter.

Optional components:
- `scripts/`: Python or Bash scripts to extend capabilities.
- `resources/`: Templates, static data, or other assets.
- `examples/`: Reference implementations.

## Creating a New Skill

To create a new skill, follow these steps:

### 1. Planning
Define the skill's purpose, name, and the specific tools or workflows it will support.

### 2. Directory Initialization
Create the directory structure:
```bash
mkdir -p .agent/skills/<new-skill-name>/{scripts,resources,examples}
```

### 3. Writing SKILL.md
Create a `SKILL.md` file in the root of the new skill directory. Use the following template:

```markdown
---
name: <Display Name>
description: <Short description of what the skill does>
---

# <Display Name>

## Overview
<Describe the skill's purpose and when to use it.>

## Instructions
<Provide detailed markdown instructions for the agent on how to use this skill.>

## Workflows (Optional)
<Define specific steps or sequences of actions.>
```

## Guidelines
- **Be Specific**: Instructions should be actionable and clear.
- **Use Absolute Paths**: When referencing project files in scripts or commands, always use absolute paths.
- **Incremental Progress**: Start with a basic version and add scripts/resources as the skill matures.
