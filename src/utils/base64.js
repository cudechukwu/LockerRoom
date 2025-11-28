/**
 * Base64 encoding/decoding utilities for React Native compatibility
 * Works on both web and React Native (including Android Hermes)
 */

/**
 * Encode string to base64 (React Native compatible)
 * @param {string} str - String to encode
 * @returns {string} Base64 encoded string
 */
export function base64Encode(str) {
  if (typeof btoa !== 'undefined') {
    // Web environment - use native btoa
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
      // Fallback if btoa fails
    }
  }
  
  // React Native fallback - manual base64 encoding
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let result = '';
  let i = 0;
  
  str = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  });
  
  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : 0;
    const c = i < str.length ? str.charCodeAt(i++) : 0;
    
    const bitmap = (a << 16) | (b << 8) | c;
    
    result += chars.charAt((bitmap >> 18) & 63);
    result += chars.charAt((bitmap >> 12) & 63);
    result += i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : '=';
    result += i - 1 < str.length ? chars.charAt(bitmap & 63) : '=';
  }
  
  return result;
}

/**
 * Decode base64 string (React Native compatible)
 * @param {string} str - Base64 encoded string
 * @returns {string} Decoded string
 */
export function base64Decode(str) {
  if (typeof atob !== 'undefined') {
    // Web environment - use native atob
    try {
      return decodeURIComponent(escape(atob(str)));
    } catch (e) {
      // Fallback if atob fails
    }
  }
  
  // React Native fallback - manual base64 decoding
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  str = str.replace(/[^A-Za-z0-9\+\/\=]/g, '');
  let result = '';
  let i = 0;
  
  while (i < str.length) {
    const enc1 = chars.indexOf(str.charAt(i++));
    const enc2 = chars.indexOf(str.charAt(i++));
    const enc3 = chars.indexOf(str.charAt(i++));
    const enc4 = chars.indexOf(str.charAt(i++));
    
    const bitmap = (enc1 << 18) | (enc2 << 12) | (enc3 << 6) | enc4;
    
    if (enc3 !== 64) result += String.fromCharCode((bitmap >> 16) & 255);
    if (enc4 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
  }
  
  try {
    return decodeURIComponent(escape(result));
  } catch (e) {
    return result;
  }
}

