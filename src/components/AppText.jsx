import React from 'react';
import { Text, TextProps } from 'react-native';
import { TYPOGRAPHY, TypographyValidator } from '../constants/typography';

/**
 * AppText Component - Typography wrapper for consistent text styling
 * 
 * This component provides a clean, type-safe way to use typography tokens
 * throughout the app. It eliminates the need to import TYPOGRAPHY in every file
 * and provides better refactoring safety.
 * 
 * @param {string} variant - Typography variant to use (e.g., 'h1', 'body', 'caption')
 * @param {object} style - Additional styles to apply
 * @param {React.ReactNode} children - Text content
 * @param {object} props - Additional Text props
 */
export const AppText = ({ 
  variant = 'body', 
  style, 
  children, 
  ...props 
}: {
  variant?: keyof typeof TYPOGRAPHY;
  style?: any;
  children: React.ReactNode;
} & TextProps) => {
  // Get the base typography style
  const typographyStyle = TYPOGRAPHY[variant];
  
  // Validate variant exists
  if (!typographyStyle) {
    console.warn(`Typography variant "${variant}" not found. Using "body" instead.`);
    return (
      <Text style={[TYPOGRAPHY.body, style]} {...props}>
        {children}
      </Text>
    );
  }

  return (
    <Text style={[typographyStyle, style]} {...props}>
      {children}
    </Text>
  );
};

/**
 * Typography-aware Text components for common use cases
 * These provide even more semantic meaning and reduce boilerplate
 */
export const Heading1 = ({ style, children, ...props }) => (
  <AppText variant="h1" style={style} {...props}>
    {children}
  </AppText>
);

export const Heading2 = ({ style, children, ...props }) => (
  <AppText variant="h2" style={style} {...props}>
    {children}
  </AppText>
);

export const Title = ({ style, children, ...props }) => (
  <AppText variant="title" style={style} {...props}>
    {children}
  </AppText>
);

export const Subtitle = ({ style, children, ...props }) => (
  <AppText variant="subtitle" style={style} {...props}>
    {children}
  </AppText>
);

export const Body = ({ style, children, ...props }) => (
  <AppText variant="body" style={style} {...props}>
    {children}
  </AppText>
);

export const Caption = ({ style, children, ...props }) => (
  <AppText variant="caption" style={style} {...props}>
    {children}
  </AppText>
);

export const ButtonText = ({ style, children, ...props }) => (
  <AppText variant="button" style={style} {...props}>
    {children}
  </AppText>
);

/**
 * Hook for validating typography usage in components
 * Useful for development and testing
 */
export const useTypographyValidation = (variants, context) => {
  return TypographyValidator.validateContext(variants, context);
};

/**
 * Debug component to show all available typography variants
 * Useful for development and design system documentation
 */
export const TypographyDebugger = () => {
  const variants = Object.keys(TYPOGRAPHY);
  
  return (
    <div style={{ padding: 20, backgroundColor: '#0A0A0F' }}>
      <h2 style={{ color: '#FFFFFF', marginBottom: 20 }}>Typography Variants</h2>
      {variants.map(variant => (
        <div key={variant} style={{ marginBottom: 10 }}>
          <AppText variant={variant}>
            {variant}: Sample text for {variant}
          </AppText>
        </div>
      ))}
    </div>
  );
};

export default AppText;
