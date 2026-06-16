# Claude Code Commands & Skills Reference

Quick reference for useful Claude Code CLI commands and skills when working on fire-meet-gasoline.

## Essential CLI Commands

### Configuration & Help
```bash
# Get help with Claude Code
/help

# Show current settings
/settings

# Open configuration file
/config

# List available skills
/skills
```

### Development Flow
```bash
# Start the app (auto-runs npm run dev)
/run

# Verify changes in running app
/verify

# Type-check and build
npm run build

# Run linter
npm run lint
```

## Available Skills for This Project

### Code Review & Quality
```bash
# Comprehensive code review with bug detection
/code-review --effort high

# Cleanup code duplication and inefficiencies
/simplify

# Security audit of pending changes
/security-review

# Get answers about Claude Code features
/help
```

### Workflow Helpers
```bash
# Run recurring commands (e.g., check build every 5 minutes)
/loop 5m npm run build

# Deep research on topics
/deep-research "query here"

# Update Claude Code settings
/update-config

# Review a pull request
/review

# Verify your changes work in the running app
/verify
```

### Configuration
```bash
# Configure keyboard bindings
/keybindings-help

# Set up session hooks (auto-run commands)
/session-start-hook

# Reduce permission prompts
/fewer-permission-prompts
```

## Common Development Workflows

### 1. Starting New Work
```bash
# 1. Create/switch to feature branch
git checkout -b feature/description

# 2. Start dev server
/run

# 3. Make changes, test in app
/verify

# 4. Review code quality
/code-review

# 5. Commit and push
git add .
git commit -m "message"
git push -u origin feature/description
```

### 2. Before Pushing
```bash
# Check everything is working
npm run build

# Run linter
npm run lint

# Test in running app
/verify

# Review code
/code-review --effort high

# Check for security issues
/security-review

# Git status
git status

# Push
git push
```

### 3. Debugging Issues
```bash
# Check what changed
git diff

# See staged changes
git diff --cached

# View recent commits
git log --oneline -5

# Check git status
git status
```

### 4. Handling Merge Conflicts
```bash
# Update your branch
git fetch origin
git merge origin/main

# Resolve conflicts in editor
# Then:
git add resolved-files
git commit -m "Merge main into feature"
git push
```

## Skill Usage Examples

### Running Code Review
```bash
# High-effort comprehensive review (takes longer, finds more)
/code-review --effort high

# Medium-effort balanced review
/code-review --effort medium

# Low-effort quick review (fast, focuses on obvious issues)
/code-review --effort low

# Post findings as inline PR comments
/code-review --effort high --comment

# Apply findings as code changes
/code-review --effort high --fix
```

### Verifying Changes
```bash
# Test the current feature in running app
/verify

# This will:
# 1. Ensure dev server is running
# 2. Guide you through testing the feature
# 3. Check for visual regressions
```

### Deep Research
```bash
# Research a topic
/deep-research "how to handle JWT tokens in Next.js"

# Results include:
# - Web search results
# - Source verification
# - Synthesized answer with citations
```

### Loop (Recurring Tasks)
```bash
# Run command every 10 minutes (default)
/loop npm run build

# Run command every 5 minutes
/loop 5m npm run build

# Run linter every 2 minutes while working
/loop 2m npm run lint
```

## Keyboard Shortcuts

### Default Shortcuts
```
Ctrl/Cmd + Enter  → Submit message to Claude
Ctrl/Cmd + K      → Open command palette
Ctrl/Cmd + L      → Clear conversation
Ctrl/Cmd + N      → New session
```

### Customize with
```bash
/keybindings-help
```

## Quick Tips

### 💡 Pro Tips
1. **Use `/verify` before pushing** - Catch visual issues early
2. **Use `/code-review` before committing** - Find bugs before they're in history
3. **Use `/simplify` after features** - Keep code maintainable
4. **Use `/loop`** - Monitor long-running processes
5. **Use `/security-review`** - Before merging to main

### ⚡ Speed Tips
1. **Fast mode**: Toggle with `/fast` for faster responses (uses Opus)
2. **Parallel skills**: Run multiple independent searches in parallel
3. **Settings allowlist**: Reduces permission prompts significantly
4. **Saved searches**: Reuse common grep/glob patterns

### 🔍 Finding Things
```bash
# Search codebase for patterns
Grep: pattern matching in files

# Find files by name
Glob: file pattern matching

# Read file contents
Read: check specific files

# Explore entire folders
Agent with Explore subagent
```

## Common Patterns

### Testing a Feature
```bash
1. /run                    # Start dev server
2. Make code changes       # Edit files
3. /verify                 # Test in app
4. git add .               # Stage changes
5. git commit -m "..."     # Commit
6. git push                # Push
```

### Code Quality Pass
```bash
1. /code-review --effort high
2. Review suggestions
3. /simplify               # Or manually fix duplications
4. /security-review        # Final check
5. git push                # Push when done
```

### Debugging Broken Code
```bash
1. git status              # See what changed
2. git diff                # View changes
3. /verify                 # Test in app to see error
4. Read error files        # Check logs
5. Make fixes
6. /verify                 # Test again
```

### Learning Project Code
```bash
1. /help                   # Understand Claude Code
2. Read CLAUDE.md          # Project overview
3. Read .claude/README.md  # Navigation
4. Read relevant guide     # For area you're working on
5. Use Grep/Glob           # Find specific patterns
```

## Troubleshooting

### "Permission Denied" on Commands
- Check allowlist in `.claude/settings.json`
- Use `/update-config` to add permissions
- Or explicitly approve when prompted

### Slow Code Review
- Use lower effort level: `/code-review --effort low`
- Review smaller files at a time
- Use `/simplify` instead for just cleanup

### Dev Server Won't Start
```bash
# Kill any existing processes
pkill -f "node.*next"

# Clear build cache
rm -rf .next

# Start fresh
/run
```

### Git Push Fails
```bash
# Fetch latest from remote
git fetch origin

# Pull changes
git pull origin main

# Resolve conflicts if any
# Then push again
git push
```

## Advanced Usage

### Batch Processing
Run multiple independent tasks in parallel:
```bash
1. Start `/code-review` in one session
2. Open another session for research
3. Results don't block each other
```

### Custom Hooks
Configure auto-execution in `.claude/settings.json`:
```json
{
  "hooks": {
    "sessionStart": "npm run lint",
    "beforeCommit": "npm run build"
  }
}
```

### Monitoring Long Operations
```bash
# Watch build status every 1 minute
/loop 1m "npm run build"

# Watch test status every 10 seconds
/loop 10s "npm test"

# Watch file changes
/loop 5s "git status"
```

## Integration with Git Workflow

### Before Commit
```bash
1. /code-review              # Find issues
2. /simplify                 # Clean up
3. npm run lint              # Fix linting
4. npm run build             # Type check
5. /verify                   # Test feature
6. git add .
7. git commit -m "message"
```

### Before Push
```bash
1. npm run build             # Full type check
2. npm run lint              # All linting
3. /security-review          # Security audit
4. git log --oneline -3      # Review commits
5. git push
```

### PR Review
```bash
1. git log main..HEAD        # View commits in PR
2. /code-review --comment    # Comment on code
3. /security-review          # Security check
4. Make requested changes
5. git push                  # Update PR
```

## Resources

- **Claude Code Docs**: Type `/help`
- **Project Guides**: Read `.claude/*.md` files
- **CLAUDE.md**: Project overview
- **GitHub Docs**: https://docs.github.com/en/pull-requests

## Getting More Help

```bash
# In Claude Code
/help                        # Get help with CLI features

# In conversation
Ask about specific commands:
- How do I use /verify?
- What does /code-review do?
- How do I set up hooks?

# Read documentation
- CLAUDE.md              → Project overview
- .claude/README.md      → This folder contents
- .claude/WORKFLOW.md    → Dev workflow
```

## Quick Reference Card

| Goal | Command |
|------|---------|
| Start app | `/run` |
| Test changes | `/verify` |
| Code quality | `/code-review --effort high` |
| Clean code | `/simplify` |
| Security check | `/security-review` |
| Get help | `/help` |
| Configure | `/update-config` |
| Recurring task | `/loop 5m command` |
| Research topic | `/deep-research "topic"` |

---

**Tip**: Bookmark this file for quick reference! 🚀
