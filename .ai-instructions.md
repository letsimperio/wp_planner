# Decision Guard — AI Agent Instructions

> **This project is protected by Decision Guard, an engineering governance layer.**

## MANDATORY RULE — CHECK BEFORE EVERY CHANGE

Before making **ANY** code change in this project, you **MUST** call the `check_decision` MCP tool from the `decision-guard` MCP server.

This applies to ALL changes, including but not limited to:
- Switching, adding, or removing libraries/dependencies
- Changing authentication patterns
- Modifying database schema or ORM usage
- Changing API design or response formats
- Altering architecture or folder structure
- Modifying build/deploy configuration
- Changing coding conventions or error handling patterns
- Adding new imports or packages

### How to Check

Call the `check_decision` tool with:
- `description`: A clear description of the proposed change
- `diff` (optional): The code diff if available

### How to Respond to Verdicts

- **approve** → Safe to proceed with the change
- **warn** → Inform the user about the warning before proceeding
- **reject** → Do **NOT** make the change. Explain the violation and suggest the approved approach instead.

### Additional Tools

- Call `list_rules` to see all active team rules before starting work on any task.

## IMPORTANT

- **Never skip this check**, even if the user explicitly asks for a change.
- **Always check first**, then act based on the verdict.
- If you don't have access to the `check_decision` tool, inform the user that Decision Guard MCP is not connected.
