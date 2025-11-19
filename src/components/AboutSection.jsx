import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';

const AboutSection = ({ profile, userRole, isEditing = false, onFieldEdit }) => {
  const isPlayer = userRole === 'player';
  const isStaff = ['coach', 'trainer', 'assistant'].includes(userRole);

  const renderPlayerFields = () => (
    <>
      <EditableField
        label="Position"
        value={profile.position || '--'}
        isEditing={isEditing}
        onEdit={onFieldEdit}
        fieldKey="position"
      />
      <EditableField
        label="Year"
        value={profile.class_year || '--'}
        isEditing={isEditing}
        onEdit={onFieldEdit}
        fieldKey="class_year"
      />
      <EditableField
        label="Major"
        value={profile.major || '--'}
        isEditing={isEditing}
        onEdit={onFieldEdit}
        fieldKey="major"
      />
      <EditableField
        label="Height"
        value={profile.height_cm ? 
          `${Math.floor(profile.height_cm / 30.48)}'${Math.floor((profile.height_cm % 30.48) / 2.54)}"` : 
          '--'
        }
        isEditing={isEditing}
        onEdit={onFieldEdit}
        fieldKey="height_cm"
        isHeight={true}
      />
      <EditableField
        label="Weight"
        value={profile.weight_kg ? `${Math.round(profile.weight_kg * 2.205)} lbs` : '--'}
        isEditing={isEditing}
        onEdit={onFieldEdit}
        fieldKey="weight_kg"
        isWeight={true}
      />
      <EditableField
        label="Hometown"
        value={profile.hometown || '--'}
        isEditing={isEditing}
        onEdit={onFieldEdit}
        fieldKey="hometown"
      />
      <EditableField
        label="High School"
        value={profile.high_school || '--'}
        isEditing={isEditing}
        onEdit={onFieldEdit}
        fieldKey="high_school"
      />
      <EditableField
        label="Contact Email"
        value={profile.contact_email || '--'}
        isEditing={isEditing}
        onEdit={onFieldEdit}
        fieldKey="contact_email"
      />
      <EditableField
        label="Phone Number"
        value={profile.contact_phone || '--'}
        isEditing={isEditing}
        onEdit={onFieldEdit}
        fieldKey="contact_phone"
      />
    </>
  );

  const renderStaffFields = () => (
    <>
      <EditableField
        label="Full name"
        value={profile.user_profiles?.display_name || '--'}
        isEditing={isEditing}
        onEdit={onFieldEdit}
        fieldKey="display_name"
      />
      <EditableField
        label="Title"
        value={profile.staff_title || '--'}
        isEditing={isEditing}
        onEdit={onFieldEdit}
        fieldKey="staff_title"
      />
      <EditableField
        label="Department"
        value={profile.department || '--'}
        isEditing={isEditing}
        onEdit={onFieldEdit}
        fieldKey="department"
      />
      <EditableField
        label="Experience"
        value={profile.years_experience ? `${profile.years_experience} years` : '--'}
        isEditing={isEditing}
        onEdit={onFieldEdit}
        fieldKey="years_experience"
      />
      <EditableField
        label="Specialties"
        value={profile.specialties?.join(', ') || '--'}
        isEditing={isEditing}
        onEdit={onFieldEdit}
        fieldKey="specialties"
        isArray={true}
      />
      <EditableField
        label="Contact Email"
        value={profile.contact_email || '--'}
        isEditing={isEditing}
        onEdit={onFieldEdit}
        fieldKey="contact_email"
      />
      <EditableField
        label="Phone Number"
        value={profile.contact_phone || '--'}
        isEditing={isEditing}
        onEdit={onFieldEdit}
        fieldKey="contact_phone"
      />
    </>
  );

  return (
    <View style={styles.aboutSection}>
      <Text style={styles.aboutTitle}>About</Text>
      {isPlayer ? renderPlayerFields() : renderStaffFields()}
    </View>
  );
};

const EditableField = ({ label, value, isEditing, onEdit, fieldKey, isArray = false, isHeight = false, isWeight = false }) => {
  const [isEditingField, setIsEditingField] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handlePress = () => {
    if (isEditing && !isEditingField) {
      setIsEditingField(true);
      // For height/weight, show the raw number for editing
      if (isHeight && fieldKey === 'height_cm') {
        // Convert back to cm for editing
        const match = value.match(/(\d+)'(\d+)"/);
        if (match) {
          const feet = parseInt(match[1]);
          const inches = parseInt(match[2]);
          const totalCm = Math.round((feet * 30.48) + (inches * 2.54));
          setEditValue(totalCm.toString());
        } else {
          setEditValue('');
        }
      } else if (isWeight && fieldKey === 'weight_kg') {
        // Convert back to kg for editing
        const match = value.match(/(\d+)\s*lbs/);
        if (match) {
          const lbs = parseInt(match[1]);
          const kg = Math.round(lbs / 2.205);
          setEditValue(kg.toString());
        } else {
          setEditValue('');
        }
      } else {
        setEditValue(value);
      }
    }
  };

  const handleSave = () => {
    if (onEdit && editValue !== value) {
      let processedValue = editValue;
      
      // Handle array fields - convert comma-separated string back to array
      if (isArray) {
        processedValue = editValue
          .split(',')
          .map(item => item.trim())
          .filter(item => item.length > 0);
      }
      
      // Handle height/weight - convert to numbers
      if (isHeight || isWeight) {
        processedValue = parseInt(editValue) || null;
      }
      
      onEdit(fieldKey, processedValue);
    }
    setIsEditingField(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditingField(false);
  };

  return (
    <TouchableOpacity 
      style={styles.aboutField} 
      onPress={handlePress}
      disabled={!isEditing || isEditingField}
    >
      <Text style={styles.aboutLabel}>{label}</Text>
      <View style={styles.aboutValueContainer}>
        {isEditingField ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.textInput}
              value={editValue}
              onChangeText={setEditValue}
              autoFocus={true}
              onSubmitEditing={handleSave}
              onBlur={handleSave}
              placeholder={
                isHeight ? "(e.g., 180)" :
                isWeight ? "(e.g., 75)" :
                "Enter value"
              }
              keyboardType={isHeight || isWeight ? "numeric" : "default"}
            />
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Ionicons name="checkmark" size={16} color="#10B981" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
              <Ionicons name="close" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.aboutValue}>{value}</Text>
            {isEditing && (
              <Ionicons 
                name="create-outline" 
                size={16} 
                color="#6B7280" 
                style={styles.editIcon}
              />
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  aboutSection: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    padding: 24,
    marginBottom: 12,
    borderRadius: 16,
    alignSelf: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 10,
  },
  aboutTitle: {
    ...TYPOGRAPHY.eventTitle, // Match HomeScreen card primary text
    marginBottom: 15,
  },
  aboutField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.07)',
  },
  aboutLabel: {
    ...TYPOGRAPHY.eventTime, // Match HomeScreen card secondary text
  },
  aboutValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  aboutValue: {
    ...TYPOGRAPHY.bodyMedium, // Smaller than eventTitle (14px vs 16px)
    textAlign: 'right',
  },
  editIcon: {
    marginLeft: 8,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textInput: {
    flex: 1,
    ...TYPOGRAPHY.bodyMedium, // Smaller than eventTitle (14px vs 16px)
    textAlign: 'right',
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B',
    paddingVertical: 2,
    marginRight: 8,
  },
  saveButton: {
    padding: 4,
    marginLeft: 4,
  },
  cancelButton: {
    padding: 4,
    marginLeft: 4,
  },
});

export default AboutSection;
