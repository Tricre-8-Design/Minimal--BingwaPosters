# Engine Maintenance Mode - User Guide

## Overview
The Engine Maintenance Mode system allows administrators to independently control the availability of the **Placid** and **AI** poster generation engines. This feature is designed to prevent users from experiencing failed poster attempts when either engine is experiencing issues or undergoing maintenance.

## Features

### 🎛️ Independent Engine Control
- **Placid Engine**: Template-based poster generation
- **AI Engine**: AI-powered poster generation
- Each engine can be enabled/disabled independently

### 📝 Customizable Messages
- Set custom maintenance messages for each engine
- Messages are displayed to users when trying to access the disabled engine
- Default messages provided for quick setup

### 🔄 Real-Time Updates
- User interfaces check maintenance status every 30 seconds
- Changes take effect immediately across the system
- No cache clearing or page refresh required

## Admin Usage

### Accessing System Settings
1. Log in to the Admin Dashboard
2. Navigate to the **Settings** tab (gear icon)
3. You'll see two cards: **Placid Engine** and **AI Engine**

### Enabling Maintenance Mode

#### For Placid Engine:
1. Toggle the **Maintenance ON/OFF** switch
2. Edit the maintenance message (optional)
3. Click **Save Settings**
4. Users will now see the maintenance message when trying to use Placid templates

#### For AI Engine:
1. Toggle the **Maintenance ON/OFF** switch
2. Edit the maintenance message (optional)
3. Click **Save Settings**
4. Users will now see the maintenance message when trying to use AI generation

### Disabling Maintenance Mode
1. Simply toggle the switch back to OFF
2. Click **Save Settings**
3. The engine becomes available to users immediately

## Technical Details

### Database Migration
Before using this feature, ensure the database migration has been run:

```bash
# The migration file is located at:
supabase/migrations/002_system_maintenance.sql

# Run it in your Supabase SQL Editor
# OR use the provided script:
scripts/run-maintenance-migration.sql
```

### API Endpoints

#### Admin Endpoints (Protected)
- `GET /api/admin/system-settings` - Fetch all system settings
- `POST /api/admin/system-settings` - Update a system setting

#### Public Endpoint
- `GET /api/maintenance-status` - Check maintenance status for all engines

### How It Works

1. **Admin Action**: Admin toggles maintenance mode in Settings tab
2. **Database Update**: Settings are stored in `system_settings` table
3. **API Check**: Generation APIs check maintenance status before processing
4. **User Feedback**: Users see maintenance message if engine is disabled

### Backend Integration

The generation APIs now check maintenance status:

```typescript
// Placid generation: /api/generate
const maintenanceStatus = await checkMaintenanceStatus("placid")
if (maintenanceStatus.isUnderMaintenance) {
  return 503 with maintenance message
}

// AI generation: /api/generate-ai
const maintenanceStatus = await checkMaintenanceStatus("ai")
if (maintenanceStatus.isUnderMaintenance) {
  return 503 with maintenance message
}
```

## Use Cases

### 1. Planned Maintenance
- Enable maintenance mode before scheduled updates
- Inform users with a clear message about expected downtime
- Disable after maintenance is complete

### 2. Emergency Issues
- Quickly disable a malfunctioning engine
- Prevent user frustration from failed attempts
- Restore service once issue is resolved

### 3. Rate Limiting
- Temporarily disable expensive AI generation during high traffic
- Switch users to Placid templates instead
- Re-enable when resources are available

### 4. Testing
- Disable production engines during testing
- Prevent accidental poster generation
- Enable when testing is complete

## Default Messages

### Placid Engine
> "Placid poster generation is temporarily unavailable for maintenance. Please try again later."

### AI Engine
> "AI poster generation is temporarily unavailable for maintenance. Please try again later."

You can customize these messages to provide more specific information to your users.

## Troubleshooting

### Changes Not Taking Effect
- Check that you clicked "Save Settings"
- Verify the success message appears
- Wait up to 30 seconds for user interfaces to refresh

### Database Errors
- Ensure migration has been run
- Check Supabase logs for SQL errors
- Verify admin authentication is working

### Users Still Seeing Disabled Engines
- Maintenance checks fail-open for reliability
- If database is unreachable, generation proceeds
- Check network connectivity to Supabase

## Best Practices

1. **Clear Communication**: Update maintenance messages to reflect the situation
2. **Short Duration**: Keep maintenance windows as brief as possible
3. **Monitoring**: Watch for failed poster attempts during maintenance
4. **Testing**: Test both engines after re-enabling
5. **Documentation**: Keep a log of maintenance periods for analysis

## Security

- Only authenticated admins can modify settings
- All changes are logged with timestamp and admin identifier
- Settings are protected by Supabase RLS policies
- Public endpoint only provides read-access to maintenance status

## Future Enhancements

Potential improvements to this system:
- Scheduled maintenance windows
- Automatic notifications to admins
- Maintenance history/analytics
- Custom maintenance pages per engine
- Integration with monitoring tools
