// Example of how PlaybookScreen could be further improved with AppText component
// This shows the potential for even cleaner code using the AppText wrapper

import { AppText, Heading1, Heading2, Title, Body, Caption, ButtonText } from '../components/AppText';

// Instead of:
<Text style={styles.headerTitle}>Playbook</Text>

// Could be:
<AppText variant="h1">Playbook</AppText>
// or even cleaner:
<Heading1>Playbook</Heading1>

// Instead of:
<Text style={styles.sectionTitle}>My Playbooks</Text>

// Could be:
<AppText variant="h2" style={{ marginBottom: 16, paddingHorizontal: 20 }}>My Playbooks</AppText>
// or:
<Heading2 style={{ marginBottom: 16, paddingHorizontal: 20 }}>My Playbooks</Heading2>

// Instead of:
<Text style={styles.playbookName}>{playbook.name}</Text>

// Could be:
<AppText variant="title">{playbook.name}</AppText>
// or:
<Title>{playbook.name}</Title>

// Instead of:
<Text style={styles.playbookCount}>{playbook.count} plays</Text>

// Could be:
<Caption>{playbook.count} plays</Caption>

// Instead of:
<Text style={styles.floatingButtonText}>New Play</Text>

// Could be:
<AppText variant="button">New Play</AppText>
// or:
<ButtonText>New Play</ButtonText>

// Benefits of using AppText component:
// 1. Cleaner imports - no need to import TYPOGRAPHY
// 2. Type safety - variant prop is typed
// 3. Better refactoring - easier to find and update text styles
// 4. Consistent usage patterns across the app
// 5. Built-in validation and error handling
