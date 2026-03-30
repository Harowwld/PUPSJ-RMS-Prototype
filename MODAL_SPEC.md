# Standard Modal System Specification

| Feature | Information (Info) | Form Entry (Edit/Create) | High-Stakes Action (Delete/Destructive) |
| :--- | :--- | :--- | :--- |
| **Header Icon** | `ph-duotone ph-info` / `ph-seal-check` | `ph-duotone ph-pencil-line` | `ph-duotone ph-warning-circle` |
| **Icon Style** | Blue/Neutral (bg-blue-50 text-blue-700) | Brand (bg-red-50 text-pup-maroon) | Danger (bg-red-50 text-red-700 border-red-100) |
| **Header Title** | Action-oriented (e.g., "Export Complete") | Task-oriented (e.g., "Edit Profile") | Result-oriented (e.g., "Delete 12 Files") |
| **Description** | Context + Consequence (< 120 chars) | Purpose + Location (< 120 chars) | Loss + Reversibility (< 120 chars) |
| **Visual Hierarchy** | Single Primary (Right) | Secondary + Primary (Right) | Secondary + Destructive (Right) |
| **Primary Action** | Brand / Neutral | Brand (PUP Maroon) | Destructive (Red #D32F2F) |
| **A11y** | ARIA-describedby, Focus Trap | ARIA-labelledby, First-field Focus | ARIA-describedby, Focus Trap |

## Design Guidelines

1. **Context + Consequence Rule**: Descriptions must explicitly state what the user is doing and what will happen as a result.
2. **Action-Oriented Titles**: Titles should reflect the specific action (e.g., "Confirm Deletion" is worse than "Delete Record").
3. **Destructive Cues**: High-stakes actions must use Red #D32F2F for the primary button and accompanying warning icons.
4. **Constraints**: All modal descriptions MUST be under 120 characters to maintain legibility and focus.
5. **Consistency**: Maintain the established `rounded-brand` (10px) border radius across all containers and buttons.
