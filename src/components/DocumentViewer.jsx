/**
 * DocumentViewer Component
 * In-app viewer for PDFs, images, and other documents
 * Similar to WhatsApp's in-app document viewer
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  ScrollView,
  BackHandler,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Pdf from 'react-native-pdf';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../constants/typography';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Convert file URI to properly encoded PDF URI
 * Handles special characters: #, ?, +, %, Unicode, etc.
 */
const toPdfUri = (uri) => {
  if (!uri) return '';
  if (!uri.startsWith('file://') && !uri.startsWith('http') && !uri.startsWith('content://')) {
    uri = `file://${uri}`;
  }
  return encodeURI(uri);
};

/**
 * Convert file URI to properly encoded image URI
 * Handles spaces and special characters in image paths
 */
const toImageUri = (uri) => {
  if (!uri) return '';
  return encodeURI(uri);
};

const DocumentViewer = ({ 
  visible, 
  fileUri, 
  filename,
  mimeType,
  onClose,
  onShare
}) => {
  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [textContent, setTextContent] = useState(null);

  // Memoize file type checks to prevent re-renders
  const isImage = useMemo(() => {
    return mimeType?.startsWith('image/') || 
      /\.(jpg|jpeg|png|gif|webp|bmp|heic|heif)$/i.test(filename || '');
  }, [mimeType, filename]);

  // Bulletproof PDF detection - checks both mimeType and filename extension
  const isPDF = useMemo(() => {
    return /\.pdf$/i.test(filename || '') || mimeType === 'application/pdf';
  }, [filename, mimeType]);

  const isText = useMemo(() => {
    return mimeType?.startsWith('text/') || 
      /\.(txt|md|json|xml|html|css|js)$/i.test(filename || '');
  }, [mimeType, filename]);

  // Memoize file extension
  const fileExtension = useMemo(() => {
    if (!filename) return 'File';
    const ext = filename.split('.').pop()?.toUpperCase();
    return ext || 'File';
  }, [filename]);

  // Memoize PDF source - react-native-pdf needs properly encoded URIs
  const pdfSource = useMemo(() => {
    if (!fileUri) return { uri: '' };
    const sanitizedUri = toPdfUri(fileUri);
    if (sanitizedUri) {
      console.log('📄 Loading PDF from URI:', sanitizedUri);
    }
    return { uri: sanitizedUri, cache: true };
  }, [fileUri]);

  // Memoize generic source for WebView fallback (non-PDF files)
  const genericSource = useMemo(() => {
    if (!fileUri) return { uri: '' };
    return { uri: toImageUri(fileUri) };
  }, [fileUri]);

  // Memoize image source with proper encoding
  const imageSource = useMemo(() => {
    if (!fileUri) return { uri: '' };
    return { uri: toImageUri(fileUri) };
  }, [fileUri]);

  // Handle WebView load (for non-PDF files)
  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    console.error('Failed to load file URI:', fileUri);
    
    // More specific error message
    let errorMessage = 'Failed to load document';
    if (nativeEvent?.description) {
      errorMessage = nativeEvent.description;
    } else if (nativeEvent?.message) {
      errorMessage = nativeEvent.message;
    }
    
    setError(errorMessage);
    setLoading(false);
  };

  // Handle PDF load events
  const handlePDFLoadComplete = (numberOfPages, filePath) => {
    console.log(`✅ PDF loaded: ${numberOfPages} pages`);
    setLoading(false);
    setError(null);
  };

  const handlePDFError = (error) => {
    console.error('PDF error:', error);
    setError(`Failed to load PDF: ${error.message || 'Unknown error'}`);
    setLoading(false);
  };
  
  // Always call useEffect (hooks must be called in same order)
  useEffect(() => {
    // Reset state when modal closes or file changes
    if (!visible || !fileUri) {
      setTextContent(null);
      setLoading(true);
      setError(null);
      return;
    }

    // Only read text files
    if (isText) {
      const FileSystem = require('expo-file-system/legacy');
      FileSystem.readAsStringAsync(fileUri)
        .then(content => {
          setTextContent(content);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error reading text file:', err);
          setError('Failed to read file');
          setLoading(false);
        });
    } else if (isPDF) {
      // PDF loading: Keep loading true for overlay, but PDF component also shows its own loader
      // This prevents remount cost (200-500ms on large PDFs) while still showing loading state
      setTextContent(null);
      setLoading(true); // Keep true for overlay, PDF component handles its own loader
    } else if (isImage) {
      // Image loading is handled by Image component
      setLoading(true);
      setTextContent(null);
    } else {
      // For other files, loading will be handled by WebView
      setTextContent(null);
    }
  }, [isText, isPDF, isImage, fileUri, visible]);

  // Android hardware back button handling
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (visible) {
        onClose();
        return true; // Prevent default back behavior
      }
      return false;
    });

    return () => backHandler.remove();
  }, [visible, onClose]);

  // Early return AFTER all hooks
  if (!visible || !fileUri) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {filename || 'Document'}
            </Text>
            <Text style={styles.headerSubtitle}>{fileExtension}</Text>
          </View>
          {onShare && (
            <TouchableOpacity onPress={() => onShare(fileUri)} style={styles.shareButton}>
              <Ionicons name="share-outline" size={24} color={COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Global loading overlay - only show for non-PDF files */}
          {loading && !isPDF && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.loadingText}>Loading document...</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.errorText}>{error}</Text>
              <Text style={styles.errorSubtext}>
                The file may not be supported for in-app viewing.
              </Text>
            </View>
          )}

          {/* Image Viewer */}
          {isImage && !error && (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.imageScrollContent}
              maximumZoomScale={5}
              minimumZoomScale={1}
              bounces={false}
            >
              <Image
                source={imageSource}
                style={styles.image}
                resizeMode="contain"
                onLoadEnd={handleLoadEnd}
                onError={() => {
                  setError('Failed to load image');
                  setLoading(false);
                }}
              />
            </ScrollView>
          )}

          {/* PDF Viewer - Using react-native-pdf for native rendering */}
          {/* Render PDF even when loading to avoid remount cost (200-500ms on large PDFs) */}
          {isPDF && !error && (
            <>
              <Pdf
                source={pdfSource}
                style={styles.pdfViewer}
                onLoadComplete={handlePDFLoadComplete}
                onPageChanged={(page, numberOfPages) => {
                  // Optional: track page changes
                }}
                onError={handlePDFError}
                onPressLink={(uri) => {
                  // Optional: handle PDF links
                  console.log('PDF link pressed:', uri);
                }}
                enablePaging={true}
                horizontal={false}
                spacing={10}
                enableRTL={false}
                enableAnnotationRendering={false}
                fitPolicy={0} // 0 = width, 1 = height, 2 = both
                singlePage={false}
                page={1}
                scale={1.0}
                minScale={0.5}
                maxScale={4.0}
                renderActivityIndicator={() => (
                  <View style={styles.pdfLoadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.TEXT_SECONDARY} />
                    <Text style={styles.loadingText}>Loading PDF...</Text>
                  </View>
                )}
              />
              {/* Overlay loading screen for smooth fade-in (WhatsApp-level UX) */}
              {loading && (
                <View style={styles.overlayLoader}>
                  <ActivityIndicator size="large" color={COLORS.TEXT_SECONDARY} />
                  <Text style={styles.loadingText}>Loading PDF...</Text>
                </View>
              )}
            </>
          )}

          {/* Text Viewer */}
          {isText && !error && textContent !== null && (
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.textContent}>
              <Text style={styles.textContentText} selectable>
                {textContent}
              </Text>
            </ScrollView>
          )}

          {/* Generic Document Viewer (WebView fallback) - Only for non-PDF files */}
          {!isImage && !isPDF && !isText && !error && (
            <WebView
              source={genericSource}
              style={styles.webView}
              onLoadEnd={handleLoadEnd}
              onError={handleError}
              startInLoadingState={true}
              scalesPageToFit={true}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_CARD,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: COLORS.BACKGROUND_CARD,
  },
  closeButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    ...TYPOGRAPHY.title,
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    fontSize: scaleFont(FONT_SIZES.XS),
    color: COLORS.TEXT_TERTIARY,
    marginTop: 2,
  },
  shareButton: {
    padding: 8,
    marginRight: -8,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_SECONDARY,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    ...TYPOGRAPHY.title,
    fontSize: scaleFont(FONT_SIZES.BASE),
    color: COLORS.TEXT_PRIMARY,
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_SECONDARY,
    marginTop: 8,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  imageScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  image: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_HEIGHT * 0.7,
    maxWidth: '100%',
  },
  webView: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  pdfViewer: {
    flex: 1,
    width: SCREEN_WIDTH,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  pdfLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  textContent: {
    padding: 20,
  },
  textContentText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.BASE),
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

export default DocumentViewer;

