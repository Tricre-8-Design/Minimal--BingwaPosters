The maintenance modal implementation has been split into two separate modals - one for Classic Posters and one for Instant Posters.

The key changes needed in app/page.tsx around line 450-536:

1. Replace the single conditional modal with TWO separate modals:

CLASSIC POSTERS MODAL (Orange theme):
- Condition: `activeTab === "classic" && maintenanceStatus.placid.isUnderMaintenance`
- Title: "Classic Poster Studio Under Maintenance"
- Message: `{maintenanceStatus.placid.message}`
- Switch button: "Switch to Instant Posters" (only if AI is available)  
- Colors: Orange (bg-orange-50, border-orange-500, text-orange-900)

INSTANT POSTERS MODAL (Purple theme):
- Condition: `activeTab === "instant" && maintenanceStatus.ai.isUnderMaintenance`
- Title: "Instant AI Posters Under Maintenance"
- Icon: Lightning bolt instead of warning
- Message: `{maintenanceStatus.ai.message}`
- Switch button: "Switch to Classic Posters" (only if Classic is available)
- Colors: Purple (bg-purple-50, border-purple-500, text-purple-900)

This ensures each modal only shows when its specific engine's tab is active AND that engine is under maintenance.
