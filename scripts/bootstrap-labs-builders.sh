#!/bin/bash
# Builders Session bootstrap - thin wrapper around bootstrap-labs.sh.
#
# All builders-specific logic (pre-completing challenges 3-9 with solution
# files) lives inside bootstrap-labs.sh, guarded by WORKSHOP_FORMAT=builders.
# This keeps both formats on one identical bootstrap path.
export WORKSHOP_FORMAT=builders
exec "$(dirname "$0")/bootstrap-labs.sh" "$@"
