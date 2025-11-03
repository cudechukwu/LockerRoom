// Example of how ChannelsListScreen could be further improved with AppText component
// This shows the potential for even cleaner code using the AppText wrapper

import { AppText, Heading1, Heading2, Title, Body, Caption } from '../components/AppText';

// Instead of:
<Text style={styles.headerTitle}>Team Chat</Text>

// Could be:
<AppText variant="title" style={{ textAlign: 'center' }}>Team Chat</AppText>
// or even cleaner:
<Title style={{ textAlign: 'center' }}>Team Chat</Title>

// Instead of:
<Text style={styles.channelName}>#{item.name}</Text>

// Could be:
<AppText variant="title" style={{ fontSize: 15 }}>#{item.name}</AppText>

// Instead of:
<Text style={styles.channelDescription}>{item.description}</Text>

// Could be:
<Caption>{item.description}</Caption>

// Instead of:
<Text style={styles.emptyTitle}>No Messages Yet</Text>

// Could be:
<Heading2 style={{ color: '#CCCCCC', marginBottom: 8 }}>No Messages Yet</Heading2>

// Benefits of using AppText component:
// 1. Cleaner imports - no need to import TYPOGRAPHY
// 2. Type safety - variant prop is typed
// 3. Better refactoring - easier to find and update text styles
// 4. Consistent usage patterns across the app
// 5. Built-in validation and error handling
