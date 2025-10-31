# Default Directory Fix - Start in Workshop Folder

## Problem

Participants login to Workshop Studio and start at `/workshop` root directory, requiring them to manually navigate:

```bash
$ pwd
/workshop

$ cd sample-dat406-build-agentic-ai-powered-search-apg
```

This adds friction to the workshop experience.

## Solution

Updated both Code Editor and terminal to start directly in the workshop repository folder.

## Changes Made

### 1. Code Editor Default Workspace

**File**: `scripts/bootstrap-environment.sh` (line 210)

**Before**:
```bash
ExecStart=$CODE_EDITOR_CMD ... --default-workspace $HOME_FOLDER --default-folder $HOME_FOLDER ...
```

**After**:
```bash
ExecStart=$CODE_EDITOR_CMD ... --default-workspace $HOME_FOLDER/$REPO_NAME --default-folder $HOME_FOLDER/$REPO_NAME ...
```

**Result**: Code Editor opens directly in `/workshop/sample-dat406-build-agentic-ai-powered-search-apg`

### 2. Terminal Default Directory

**File**: `scripts/bootstrap-labs.sh` (added to .bashrc)

**Added**:
```bash
# Auto-navigate to workshop directory on terminal open
if [ "$PWD" = "$HOME" ] || [ "$PWD" = "/workshop" ]; then
    cd /workshop/sample-dat406-build-agentic-ai-powered-search-apg 2>/dev/null || true
fi
```

**Result**: New terminal sessions automatically cd to workshop folder

## Behavior

### Before Fix

**Code Editor**:
- Opens with `/workshop` as root
- File explorer shows all of `/workshop`
- Participants must navigate to `sample-dat406-build-agentic-ai-powered-search-apg`

**Terminal**:
```bash
$ pwd
/workshop

$ # Must manually cd
$ cd sample-dat406-build-agentic-ai-powered-search-apg
```

### After Fix

**Code Editor**:
- Opens with `/workshop/sample-dat406-build-agentic-ai-powered-search-apg` as root
- File explorer shows workshop files directly
- Immediate access to notebooks, scripts, blaize-bazaar

**Terminal**:
```bash
$ pwd
/workshop/sample-dat406-build-agentic-ai-powered-search-apg

$ # Already in the right place!
$ ls
blaize-bazaar/  notebooks/  scripts/  README.md  ...
```

## Aliases Still Work

All navigation aliases remain functional:

```bash
# Quick navigation
workshop        # cd to workshop root
notebooks       # cd to notebooks/
blaize-bazaar   # cd to blaize-bazaar/
backend         # cd to blaize-bazaar/backend/
frontend        # cd to blaize-bazaar/frontend/

# Service shortcuts
start-backend   # Launch FastAPI backend
start-frontend  # Launch React frontend
```

## Edge Cases Handled

### 1. Terminal Already in Workshop
```bash
# If already in /workshop/sample-dat406-build-agentic-ai-powered-search-apg
# Auto-cd doesn't trigger (checks if PWD is /workshop or $HOME)
```

### 2. Terminal in Subdirectory
```bash
# If in /workshop/sample-dat406-build-agentic-ai-powered-search-apg/notebooks
# Auto-cd doesn't trigger (not at root)
```

### 3. Repository Doesn't Exist Yet
```bash
# 2>/dev/null || true prevents errors during bootstrap
# Terminal stays at /workshop if repo not cloned yet
```

## Testing

After deploying CloudFormation:

1. **Test Code Editor**:
   - Open Code Editor via CloudFront URL
   - Verify file explorer shows workshop files directly
   - Verify terminal in Code Editor starts in workshop folder

2. **Test Terminal**:
   ```bash
   # Open new terminal
   $ pwd
   /workshop/sample-dat406-build-agentic-ai-powered-search-apg
   
   # Verify aliases work
   $ notebooks
   $ pwd
   /workshop/sample-dat406-build-agentic-ai-powered-search-apg/notebooks
   ```

3. **Test Navigation**:
   ```bash
   # Can still navigate up
   $ cd /workshop
   $ pwd
   /workshop
   
   # New terminal auto-navigates back
   $ bash
   $ pwd
   /workshop/sample-dat406-build-agentic-ai-powered-search-apg
   ```

## Benefits

1. ✅ **Immediate Productivity** - Participants start in the right place
2. ✅ **Less Confusion** - No need to explain directory navigation
3. ✅ **Better UX** - Code Editor shows relevant files immediately
4. ✅ **Consistent** - Both Code Editor and terminal start in same location
5. ✅ **Non-Breaking** - Aliases and manual navigation still work

## Variables Used

```bash
HOME_FOLDER="/workshop"                                    # Workshop Studio root
REPO_NAME="sample-dat406-build-agentic-ai-powered-search-apg"  # GitHub repo name
REPO_PATH="$HOME_FOLDER/$REPO_NAME"                       # Full path
```

These are defined in:
- `bootstrap-environment.sh` (HOME_FOLDER)
- `bootstrap-labs.sh` (REPO_NAME, REPO_PATH)

## Rollback

If needed, revert to original behavior:

```bash
# In bootstrap-environment.sh
ExecStart=$CODE_EDITOR_CMD ... --default-workspace $HOME_FOLDER --default-folder $HOME_FOLDER ...

# In bootstrap-labs.sh
# Remove the auto-cd section from .bashrc
```

## Summary

**Files Modified**:
1. ✅ `scripts/bootstrap-environment.sh` - Code Editor workspace
2. ✅ `scripts/bootstrap-labs.sh` - Terminal auto-cd

**Result**: Participants start directly in workshop folder, eliminating manual navigation step.
