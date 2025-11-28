# EventCreationModal Refactoring Plan

## Current State
- File size: ~1389 lines
- Uses 20+ individual useState calls
- Duplicate logic for time parsing, validation, payload building
- Complex useEffect chains for data loading

## Target State
- File size: ~400-500 lines (70% reduction)
- Uses consolidated hooks
- All logic extracted to utilities and hooks
- Clean, maintainable code

## Refactoring Steps

### ✅ Completed
1. Created all custom hooks
2. Created utility files
3. Created UI components (EventHeader, EventRecurringSection, EventAttachmentsSection)

### 🔄 In Progress
1. Refactor EventCreationModal to use hooks

### 📋 Remaining
1. Extract remaining UI components
2. Move styles to separate file
3. Final cleanup and testing

## Hook Integration Map

### Old Pattern → New Hook
- `useState` for form fields → `useEventFormState`
- `useState` for times → `useEventTimes` 
- `useState` for groups → `useEventGroups`
- `useState` for visibility → `useEventVisibility`
- `useState` for attachments → `useEventAttachments`
- `useState` for recurring → `useEventRecurring`
- `handleCreateEvent` → `useEventSubmit`
- Prefill/edit logic → `useEventFormData`

