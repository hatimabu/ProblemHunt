# ProblemHunt

A platform for problem hunting and collaborative development.

## 📚 Documentation

- [Web3 Wallet Authentication Setup](WEB3_README.md) - Complete guide for Web3 wallet integration
- [Web3 Setup Guide](WEB3_SETUP.md) - Detailed setup instructions for Web3 features

## 🤖 How to Access GitHub Copilot CLI

GitHub Copilot CLI is a command-line interface that brings the power of GitHub Copilot to your terminal, helping you with commands, scripts, and terminal operations.

### Prerequisites

- GitHub account with an active Copilot subscription
- Node.js 18.x or higher installed
- Git installed and configured

### Installation

GitHub Copilot CLI is available as a GitHub CLI extension. You'll need to have GitHub CLI (`gh`) installed first.

#### Step 1: Install GitHub CLI

If you don't have GitHub CLI installed:

**macOS:**
```bash
brew install gh
```

**Windows (using winget):**
```bash
winget install --id GitHub.cli
```

**Linux:**
```bash
# Debian/Ubuntu
sudo apt install gh

# Fedora/RHEL
sudo dnf install gh

# Or use the official script
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

#### Step 2: Install GitHub Copilot Extension

```bash
gh extension install github/gh-copilot
```

### Authentication & Setup

1. **Authenticate GitHub CLI:**
   ```bash
   gh auth login
   ```
   Follow the prompts to authenticate with your GitHub account.

2. **Verify the installation:**
   ```bash
   gh copilot --version
   ```

3. **Start using Copilot:**
   ```bash
   gh copilot suggest "your command description"
   gh copilot explain "command to explain"
   ```

### Setting Up Aliases (Optional but Recommended)

To make Copilot CLI easier to use, you can set up aliases:

#### For Bash/Zsh (Linux/macOS)

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# GitHub Copilot CLI aliases
alias ghcs='gh copilot suggest'
alias ghce='gh copilot explain'
```

Then reload your shell:
```bash
source ~/.bashrc  # or source ~/.zshrc
```

#### For PowerShell (Windows)

Add to your PowerShell profile (`$PROFILE`):

```powershell
# GitHub Copilot CLI aliases
function ghcs { gh copilot suggest $args }
function ghce { gh copilot explain $args }
```

Then reload your profile:
```powershell
. $PROFILE
```

### Usage Examples

#### Getting Command Suggestions

Ask Copilot to suggest commands in natural language:

```bash
# Using gh extension
gh copilot suggest "find all javascript files modified in the last 7 days"

# Using alias (if set up)
ghcs "compress all images in the current directory"
```

**Example interaction:**
```
? What kind of command can I help you with?
> shell command

Welcome to GitHub Copilot in the CLI!

? Which shell are you using?
> bash

? What would you like the shell command to do?
> find all files larger than 100MB

Suggestion:
find . -type f -size +100M

? Select an option
> ✓ Copy command to clipboard
  Execute command
  Revise command
  Rate response
  Exit
```

#### Explaining Commands

Get explanations for commands you don't understand:

```bash
# Using gh extension
gh copilot explain "tar -czf archive.tar.gz /path/to/directory"

# Using alias (if set up)
ghce "grep -r 'pattern' --include='*.js' ."
```

**Example output:**
```
This command searches recursively for the pattern 'pattern' in all .js files:
  • grep - Search for patterns in files
  • -r - Search recursively through directories
  • 'pattern' - The text pattern to search for
  • --include='*.js' - Only search in files matching *.js
  • . - Start searching from the current directory
```

### Common Use Cases

#### 1. Git Operations
```bash
ghcs "create a new branch and push it to remote"
ghcs "undo the last commit but keep changes"
ghcs "squash last 3 commits"
```

#### 2. File Management
```bash
ghcs "find and delete all node_modules folders"
ghcs "count lines of code in all typescript files"
ghcs "backup all .env files to a backup directory"
```

#### 3. System Administration
```bash
ghcs "check which process is using port 3000"
ghcs "monitor system resources in real-time"
ghcs "create a systemd service for my app"
```

#### 4. Development Tasks
```bash
ghcs "install dependencies and start dev server"
ghcs "run tests with coverage report"
ghcs "build docker image and push to registry"
```

### Troubleshooting

#### Issue: Command not found

**Solution:**
```bash
# Verify npm global bin directory is in PATH
npm config get prefix

# Add to PATH if needed (replace /path/to/npm with actual path)
export PATH="$PATH:/path/to/npm/bin"
```

#### Issue: Authentication failed

**Solution:**
1. Make sure you have an active GitHub Copilot subscription
2. Re-authenticate:
   ```bash
   gh auth login
   # Or refresh your authentication
   gh auth refresh
   ```

#### Issue: Rate limiting

**Solution:**
- GitHub Copilot CLI has rate limits based on your subscription
- Wait a few minutes before making more requests
- Check your subscription status at https://github.com/settings/copilot

#### Issue: Old version installed

**Solution:**
```bash
# Update gh CLI extension
gh extension upgrade gh-copilot

# Or update all extensions
gh extension upgrade --all
```

### Tips for Best Results

1. **Be Specific:** The more specific your request, the better the suggestion
   - ❌ "find files"
   - ✅ "find all .log files modified in the last 24 hours"

2. **Specify Your Context:** Include relevant details about your environment
   - "find files on Linux"
   - "compress images using ImageMagick"

3. **Review Before Executing:** Always review commands before running them, especially if they modify files or system settings

4. **Use Natural Language:** You don't need to know the exact command syntax
   - "show me disk usage sorted by size"
   - "delete all files older than 30 days in the temp folder"

5. **Iterate:** If the first suggestion isn't perfect, ask Copilot to revise it

### Advanced Features

#### Interactive Mode

GitHub Copilot CLI supports interactive sessions where you can refine commands:

```bash
gh copilot suggest -t shell
```

This opens an interactive session where you can:
- Describe what you want to do
- Review the suggestion
- Copy, execute, or revise the command
- Rate the response

#### Git-Specific Commands

```bash
gh copilot suggest -t git "undo last commit"
```

This specifically targets Git operations for more accurate suggestions.

### Resources

- **Official Documentation:** [GitHub Copilot CLI Docs](https://docs.github.com/en/copilot/github-copilot-in-the-cli)
- **GitHub Copilot:** [Get Copilot Access](https://github.com/features/copilot)
- **GitHub CLI:** [GitHub CLI Documentation](https://cli.github.com/)
- **Copilot Plans:** [Pricing and Features](https://github.com/features/copilot/plans)

### Getting Help

```bash
# Get help for gh copilot
gh copilot --help

# Get help for specific commands
gh copilot suggest --help
gh copilot explain --help
```

### Uninstallation

If you need to remove GitHub Copilot CLI:

```bash
# Remove gh copilot extension
gh extension remove gh-copilot
```

## 🚀 Getting Started with ProblemHunt

### Installation

```bash
# Install all dependencies
npm run install:all

# Or install manually
cd problem-hunt
npm install
```

### Development

```bash
# Start development server
npm run dev

# Or from root
npm run dev
```

### Building

```bash
# Build the application
npm run build
```

### Running Production Server

```bash
# Build and start server
npm start
```

## 📝 Project Structure

```
ProblemHunt/
├── problem-hunt/          # Main application directory
│   ├── src/              # Source code
│   ├── supabase/         # Supabase configuration and functions
│   └── package.json      # Application dependencies
├── WEB3_README.md        # Web3 integration documentation
├── WEB3_SETUP.md         # Web3 setup guide
└── package.json          # Root package.json with scripts
```

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Questions or Issues?** Please create an issue in the repository or check the documentation in the links above.
