import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Animated,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../constants/typography';
import { useCalendarData } from '../hooks/useCalendarData';
import { createEvent, updateEvent, deleteEvent, formatEventData } from '../api/events';
import { supabase } from '../lib/supabase';
import EventCreationModal from '../components/EventCreationModal';
import EventDetailsModal from '../components/EventDetailsModal';
import CalendarSkeletonLoader from '../components/CalendarSkeletonLoader';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

const CALENDAR_VIEWS = {
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CalendarScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = Platform.OS === 'ios' ? 88 : 60;
  const adjustedTabBarHeight = tabBarHeight + Math.max(insets.bottom - 10, 0);

  const [currentView, setCurrentView] = useState(CALENDAR_VIEWS.MONTH);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [modalPrefilledData, setModalPrefilledData] = useState({});
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Use the new calendar data hook
  const { 
    teamId, 
    teamColors, 
    events, 
    upcomingEvents, 
    isLoading, 
    isFetching, 
    error, 
    refetch 
  } = useCalendarData(currentView, currentDate);

  // Manual refresh handler
  const handleManualRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Memoized calendar computations to prevent unnecessary re-renders
  const monthDays = useMemo(() => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDay = new Date(startDate);
    
    // Generate 6 weeks (42 days) to fill the calendar grid
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    
    return days;
  }, [currentDate]);

  const dayEvents = useMemo(() => {
    const today = new Date(currentDate);
    return events
      .filter(event => {
        if (!event || !event.startTime) return false;
        const eventDate = new Date(event.startTime);
        return eventDate.toDateString() === today.toDateString();
      })
      .map(event => {
        const startHour = new Date(event.startTime).getHours();
        const endHour = new Date(event.endTime).getHours();
        const duration = Math.max(1, endHour - startHour);
        
        return {
          ...event,
          startTime: startHour,
          duration: duration,
        };
      });
  }, [events, currentDate]);

  const weekEvents = useMemo(() => {
    return events
      .filter(event => event && event.startTime && event.endTime)
      .map(event => {
        const eventDate = new Date(event.startTime);
        const startHour = eventDate.getHours();
        const endHour = new Date(event.endTime).getHours();
        const duration = Math.max(1, endHour - startHour);
        
        return {
          ...event,
          startTime: startHour,
          duration: duration,
          dayOfWeek: eventDate.getDay(),
        };
      });
  }, [events]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const navigateDay = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction);
    setCurrentDate(newDate);
  };

  const handleDatePress = (date) => {
    setSelectedDate(date);
    setModalPrefilledData({
      date: date.toLocaleDateString()
    });
    setShowEventModal(true);
  };

  const handleCreateEvent = useCallback(async (eventData) => {
    try {
      console.log('Creating event:', eventData);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to create events.');
        return;
      }
      
      // Format event data for database
      const formattedData = formatEventData(eventData, teamId, user.id);
      
      // Create event in database
      const { data, error } = await createEvent(formattedData);
      
      if (error) {
        console.error('Error creating event:', error);
        Alert.alert('Error', 'Failed to create event. Please try again.');
        return;
      }
      
      console.log('Event created successfully:', data);
      
      // Refresh events using the hook
      refetch();
      
      // Close modal
      setShowEventModal(false);
      
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
    }
  }, [teamId, refetch]);

  const formatHourTo12Hour = (hour) => {
    if (hour === 0) return '12:00 AM';
    if (hour === 12) return '12:00 PM';
    if (hour < 12) return `${hour}:00 AM`;
    return `${hour - 12}:00 PM`;
  };

  const handleEventPress = (event) => {
    setSelectedEvent(event);
    setShowEventDetailsModal(true);
  };

  const handleEditEvent = (event) => {
    // Pre-fill the creation modal with the event data for editing
    setModalPrefilledData({
      eventType: event.type || event.eventType,
      date: event.date,
      time: event.startTime,
      endTime: event.endTime,
      title: event.title,
      location: event.location,
      recurring: event.recurring,
      notes: event.notes,
      postTo: event.postTo
    });
    setShowEventModal(true);
  };

  const handleDeleteEvent = useCallback(async (event) => {
    try {
      Alert.alert(
        'Delete Event',
        `Are you sure you want to delete "${event.title}"?`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              console.log('Deleting event:', event.title);
              
              const { success, error } = await deleteEvent(event.id);
              
              if (error) {
                console.error('Error deleting event:', error);
                Alert.alert('Error', 'Failed to delete event. Please try again.');
                return;
              }
              
              console.log('Event deleted successfully');
              
              // Refresh events using the hook
              refetch();
              
              // Close details modal
              setShowEventDetailsModal(false);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting event:', error);
      Alert.alert('Error', 'Failed to delete event. Please try again.');
    }
  }, [refetch]);

  const renderHeader = () => {
    const getHeaderTitle = () => {
      switch (currentView) {
        case CALENDAR_VIEWS.MONTH:
          return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        case CALENDAR_VIEWS.WEEK:
          // Show week range with abbreviated months
          const startOfWeek = new Date(currentDate);
          startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          
          if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
            return `${MONTHS_SHORT[startOfWeek.getMonth()]} ${startOfWeek.getDate()}-${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
          } else {
            return `${MONTHS_SHORT[startOfWeek.getMonth()]} ${startOfWeek.getDate()} - ${MONTHS_SHORT[endOfWeek.getMonth()]} ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
          }
        case CALENDAR_VIEWS.DAY:
          return `${MONTHS_SHORT[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
        default:
          return '';
      }
    };

    const handleNavigation = (direction) => {
      switch (currentView) {
        case CALENDAR_VIEWS.MONTH:
          navigateMonth(direction);
          break;
        case CALENDAR_VIEWS.WEEK:
          navigateWeek(direction);
          break;
        case CALENDAR_VIEWS.DAY:
          navigateDay(direction);
          break;
      }
    };

    return (
      <View style={styles.header}>
        <View style={styles.headerNavigation}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={16} color={COLORS.WHITE} />
          </TouchableOpacity>
          
          <View style={styles.monthNavigation}>
            <TouchableOpacity 
              style={styles.navButton}
              onPress={() => handleNavigation(-1)}
            >
              <Ionicons name="chevron-back" size={16} color={COLORS.WHITE} />
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
            
            <TouchableOpacity 
              style={styles.navButton}
              onPress={() => handleNavigation(1)}
            >
              <Ionicons name="chevron-forward" size={16} color={COLORS.WHITE} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => {
              setModalPrefilledData({
                date: currentDate.toLocaleDateString()
              });
              setShowEventModal(true);
            }}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.viewToggle}>
          {Object.values(CALENDAR_VIEWS).map((view) => (
            <TouchableOpacity
              key={view}
              style={[
                styles.viewToggleButton,
                currentView === view && styles.viewToggleButtonActive
              ]}
              onPress={() => setCurrentView(view)}
            >
              <Text style={[
                styles.viewToggleText,
                currentView === view && styles.viewToggleTextActive
              ]}>
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderMonthView = () => {
    return (
      <>
        {/* Days of week header */}
        <View style={styles.daysOfWeekHeader}>
          {DAYS_OF_WEEK.map((day) => (
            <View key={day} style={styles.dayOfWeekCell}>
              <Text style={styles.dayOfWeekText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {monthDays.map((day, index) => {
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = day.toDateString() === new Date().toDateString();
            const isSelected = day.toDateString() === selectedDate.toDateString();

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  !isCurrentMonth && styles.dayCellOtherMonth,
                  isSelected && {
                    backgroundColor: COLORS.BRAND_LUPINE,
                    shadowColor: COLORS.BRAND_LUPINE,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 3,
                  },
                  isToday && !isSelected && {
                    backgroundColor: 'rgba(42, 26, 31, 0.3)',
                    shadowColor: 'transparent',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0,
                    shadowRadius: 0,
                    elevation: 0,
                  },
                ]}
                onPress={() => handleDatePress(day)}
              >
                <Text style={[
                  styles.dayText,
                  !isCurrentMonth && styles.dayTextOtherMonth,
                  isToday && styles.dayTextToday,
                  isSelected && styles.dayTextSelected,
                ]}>
                  {day.getDate()}
                </Text>
                {/* Render event indicators */}
                {(() => {
                  const dayEvents = events.filter(event => {
                    if (!event || !event.startTime) return false;
                    const eventDate = new Date(event.startTime);
                    return eventDate.toDateString() === day.toDateString();
                  });
                  
                  if (dayEvents.length > 0) {
                    return (
                      <View style={styles.eventIndicators}>
                        {dayEvents.slice(0, 3).map((event, eventIndex) => (
                          <View
                            key={eventIndex}
                            style={[
                              styles.eventIndicator,
                              { backgroundColor: COLORS.ERROR }
                            ]}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <Text style={styles.moreEventsText}>+{dayEvents.length - 3}</Text>
                        )}
                      </View>
                    );
                  }
                  return null;
                })()}
              </TouchableOpacity>
            );
          })}
        </View>
      </>
    );
  };

  const renderWeekView = () => {
    // Use memoized values instead of computing inline

    const formatHour = (hour) => {
      if (hour === 0) return '12 AM';
      if (hour === 12) return '12 PM';
      if (hour < 12) return `${hour} AM`;
      return `${hour - 12} PM`;
    };

    const renderEvent = (event) => (
      <TouchableOpacity
        key={event.id}
        style={[
          styles.eventBlock,
          {
            backgroundColor: event.color,
            top: event.startTime * 60, // 60px per hour
            height: event.duration * 60,
          }
        ]}
        onPress={() => {
          // Convert event to proper format for details modal
          const eventData = {
            ...event,
            eventType: event.eventType,
            startTime: formatHourTo12Hour(event.startTime),
            endTime: formatHourTo12Hour(event.startTime + event.duration),
            date: new Date(event.startTime).toLocaleDateString(),
            postTo: event.type === 'personal' ? 'Personal' : 'Team'
          };
          handleEventPress(eventData);
        }}
      >
        <Text style={styles.eventTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.eventTime} numberOfLines={1}>
          {formatHour(event.startTime)}
        </Text>
      </TouchableOpacity>
    );

    return (
      <View style={styles.weekView}>
        {/* Days header */}
        <View style={styles.weekHeader}>
          <View style={styles.timeColumn} />
          {weekDays.map((day, index) => {
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <View key={index} style={styles.dayColumn}>
                <Text style={[
                  styles.weekDayText,
                  isToday && { 
                    color: teamColors.primary,
                    fontWeight: FONT_WEIGHTS.SEMIBOLD
                  }
                ]}>
                  {DAYS_OF_WEEK[index]}
                </Text>
                <Text style={[
                  styles.weekDateText,
                  isToday && { 
                    color: teamColors.primary,
                    fontWeight: FONT_WEIGHTS.BOLD
                  }
                ]}>
                  {day.getDate()}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Time grid */}
        <ScrollView style={styles.weekScrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.weekGrid}>
            {hours.map((hour) => (
              <View key={hour} style={styles.hourRow}>
                <View style={styles.timeColumn}>
                  <Text style={styles.timeText}>{formatHour(hour)}</Text>
                </View>
                {weekDays.map((day, dayIndex) => (
                  <TouchableOpacity
                    key={dayIndex}
                    style={[
                      styles.hourCell,
                      dayIndex === 0 && { backgroundColor: '#2A2A2A' } // Debug: highlight first column
                    ]}
                    onPress={() => {
                      const startTime = formatHourTo12Hour(hour);
                      const endTime = formatHourTo12Hour(hour + 1); // Default 1-hour duration
                      setModalPrefilledData({
                        date: day.toLocaleDateString(),
                        time: startTime,
                        endTime: endTime
                      });
                      setShowEventModal(true);
                      console.log('Time slot pressed:', day, hour, 'dayIndex:', dayIndex, 'Time:', startTime);
                    }}
                  >
                    {/* Render events for this day/hour */}
                    {weekEvents
                      .filter(event => 
                        event.dayIndex === dayIndex && 
                        hour >= event.startTime && 
                        hour < event.startTime + event.duration
                      )
                      .map(event => 
                        hour === event.startTime ? renderEvent(event) : null
                      )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const today = currentDate;
    
    // Team event templates
    const teamEventTemplates = [
      { id: 'practice', title: 'Practice', color: teamColors.primary, icon: 'P' },
      { id: 'game', title: 'Game', color: teamColors.secondary, icon: 'G' },
      { id: 'meeting', title: 'Meeting', color: '#10B981', icon: 'M' },
      { id: 'film', title: 'Film', color: '#8B5CF6', icon: 'F' },
      { id: 'conditioning', title: 'Conditioning', color: '#F59E0B', icon: 'T' },
    ];

    // Get events for the selected day from database
    const dayEvents = events
      .filter(event => {
        if (!event || !event.startTime) return false;
        const eventDate = new Date(event.startTime);
        return eventDate.toDateString() === today.toDateString();
      })
      .map(event => {
        const startHour = new Date(event.startTime).getHours();
        const endHour = new Date(event.endTime).getHours();
        const duration = Math.max(1, endHour - startHour);
        
        return {
          ...event,
          startTime: startHour,
          duration
        };
      })
      .sort((a, b) => a.startTime - b.startTime); // Sort by start time

    const formatHour = (hour) => {
      if (hour === 0) return '12 AM';
      if (hour === 12) return '12 PM';
      if (hour < 12) return `${hour} AM`;
      return `${hour - 12} PM`;
    };

    const renderEvent = (event) => (
      <TouchableOpacity
        key={event.id}
        style={[
          styles.dayEventBlock,
          {
            backgroundColor: event.color,
            top: 0,
            height: event.duration * 60,
          }
        ]}
        onPress={() => {
          // Convert event to proper format for details modal
          const eventData = {
            ...event,
            eventType: event.eventType,
            startTime: formatHour(event.startTime),
            endTime: formatHour(event.startTime + event.duration),
            date: today.toLocaleDateString(),
            postTo: event.type === 'personal' ? 'Personal' : 'Team'
          };
          handleEventPress(eventData);
        }}
      >
        <View style={styles.dayEventContent}>
          <Text style={styles.dayEventTitle}>{event.title}</Text>
          <Text style={styles.dayEventTime}>
            {formatHour(event.startTime)} - {formatHour(event.startTime + event.duration)}
          </Text>
          {event.location && event.location.trim() && (
            <Text style={styles.dayEventLocation}>{event.location}</Text>
          )}
          {event.type === 'team' && typeof event.attending === 'number' && (
            <Text style={styles.dayEventAttending}>
              {event.attending}/{event.total} attending
            </Text>
          )}
          {event.notes && typeof event.notes === 'string' && event.notes.trim() && (
            <Text style={styles.dayEventNotes} numberOfLines={2}>
              {event.notes}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );

    return (
      <View style={styles.dayView}>
        {/* Day Header with Quick Actions */}
        <View style={styles.dayHeader}>
          <View style={styles.dayHeaderLeft}>
            <Text style={styles.dayTitle}>
              {today.toLocaleDateString('en-US', { weekday: 'long' })}
            </Text>
            <Text style={styles.dayDate}>
              {MONTHS_SHORT[today.getMonth()]} {today.getDate()}, {today.getFullYear()}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.addEventButton}
            onPress={() => {
              setModalPrefilledData({
                date: currentDate.toLocaleDateString()
              });
              setShowEventModal(true);
            }}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addEventButtonText}>Add Event</Text>
          </TouchableOpacity>
        </View>

        {/* Team Event Templates */}
        <View style={styles.eventTemplatesSection}>
          <Text style={styles.eventTemplatesTitle}>Quick Add</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.eventTemplatesContainer}
          >
            {teamEventTemplates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={[
                  styles.eventTemplate, 
                  { 
                    backgroundColor: template.id === 'game' 
                      ? '#F3F4F6' // Light gray background for black game button
                      : `${template.color}15` 
                  }
                ]}
                onPress={() => {
                  setModalPrefilledData({
                    eventType: template.id,
                    date: currentDate.toLocaleDateString()
                  });
                  setShowEventModal(true);
                }}
              >
                <View style={[
                  styles.eventTemplateIcon, 
                  { 
                    backgroundColor: template.id === 'game' ? '#1F2937' : template.color // Darker gray for game to show white text
                  }
                ]}>
                  <Text style={styles.eventTemplateIconText}>{template.icon}</Text>
                </View>
                <Text style={styles.eventTemplateText} numberOfLines={2}>
                  {template.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Day Timeline */}
        <ScrollView style={styles.dayScrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.dayTimeline}>
            {hours.map((hour) => {
              const hourEvents = dayEvents.filter(event => 
                hour >= event.startTime && hour < event.startTime + event.duration
              );
              
              return (
                <View key={hour} style={styles.dayHourRow}>
                  <View style={styles.dayTimeColumn}>
                    <Text style={styles.dayTimeText}>{formatHour(hour)}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.dayEventSlot}
                    onPress={() => {
                      const startTime = formatHourTo12Hour(hour);
                      const endTime = formatHourTo12Hour(hour + 1); // Default 1-hour duration
                      setModalPrefilledData({
                        date: today.toLocaleDateString(),
                        time: startTime,
                        endTime: endTime
                      });
                      setShowEventModal(true);
                      console.log('Day time slot pressed:', formatHour(hour), 'Time:', startTime);
                    }}
                  >
                    {hourEvents
                      .filter(event => hour === event.startTime)
                      .map(event => renderEvent(event))}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderUpcomingEvents = () => {
    // Use the upcoming events from the hook
    if (!upcomingEvents || upcomingEvents.length === 0) {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
          </View>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No upcoming events</Text>
          </View>
        </View>
      );
    }
    
    const formatEventDate = (date) => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
      } else {
        const options = { month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
      }
    };

    return (
      <View style={styles.upcomingSection}>
        <View style={styles.upcomingSectionHeader}>
          <Text style={styles.upcomingSectionTitle}>Next 5 Events</Text>
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => setCurrentView(CALENDAR_VIEWS.WEEK)}
          >
            <Text style={styles.viewAllButtonText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.eventsList}>
          {upcomingEvents.map((event, index) => (
            <TouchableOpacity 
              key={event.id} 
              style={[
                styles.eventItem,
                index === upcomingEvents.length - 1 && styles.eventItemLast
              ]}
              onPress={() => {
                console.log('Event pressed:', event.title);
                // TODO: Show event details or edit modal
              }}
            >
              <View style={styles.eventLeft}>
                <View style={[styles.eventTypeBadge, { backgroundColor: event.color }]}>
                  <Text style={styles.eventTypeText}>
                    {event.type === 'practice' ? 'P' : 
                     event.type === 'game' ? 'G' : 
                     event.type === 'meeting' ? 'M' :
                     event.type === 'review' ? 'F' : 'T'}
                  </Text>
                </View>
                <View style={styles.eventDetails}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventMeta}>
                    {formatEventDate(event.date)} • {event.time} • {event.location}
                  </Text>
                </View>
              </View>
              <View style={styles.eventRight}>
                <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderCalendarContent = () => {
    switch (currentView) {
      case CALENDAR_VIEWS.MONTH:
        return renderMonthView();
      case CALENDAR_VIEWS.WEEK:
        return renderWeekView();
      case CALENDAR_VIEWS.DAY:
        return renderDayView();
      default:
        return renderMonthView();
    }
  };

  // Show skeleton only when there's no cached data (first-time load)
  if (isLoading && !events.length) {
    return <CalendarSkeletonLoader />;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.statusBarArea, { height: insets.top }]} />
      <View style={styles.headerContainer}>
        {renderHeader()}
      </View>
      
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight }]}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={handleManualRefresh}
            tintColor={COLORS.TEXT_PRIMARY}
            titleColor={COLORS.TEXT_PRIMARY}
            colors={[COLORS.TEXT_PRIMARY]}
            progressBackgroundColor={COLORS.BACKGROUND_CARD_SECONDARY}
          />
        }
      >
        {renderCalendarContent()}
        {currentView === CALENDAR_VIEWS.MONTH && renderUpcomingEvents()}
      </ScrollView>

      {/* Event Creation Modal - Fully unmount when hidden */}
      {showEventModal && (
        <EventCreationModal
          visible={showEventModal}
          onClose={() => setShowEventModal(false)}
          onCreateEvent={handleCreateEvent}
          prefilledData={modalPrefilledData}
          teamColors={teamColors}
        />
      )}

      {/* Event Details Modal - Fully unmount when hidden */}
      {showEventDetailsModal && (
        <EventDetailsModal
          visible={showEventDetailsModal}
          onClose={() => setShowEventDetailsModal(false)}
          onEdit={handleEditEvent}
          onDelete={handleDeleteEvent}
          event={selectedEvent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  statusBarArea: {
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  headerContainer: {
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  backButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.BACKGROUND_OVERLAY,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
    flexShrink: 0,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.BACKGROUND_OVERLAY,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
    flexShrink: 0,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
    maxWidth: 200,
  },
  headerNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  navButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.BACKGROUND_OVERLAY,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    minWidth: 120,
    maxWidth: 150,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 12,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  viewToggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 9,
    alignItems: 'center',
  },
  viewToggleButtonActive: {
    backgroundColor: COLORS.BACKGROUND_SECONDARY,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  viewToggleText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.TEXT_MUTED,
  },
  viewToggleTextActive: {
    color: COLORS.TEXT_PRIMARY,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  daysOfWeekHeader: {
    flexDirection: 'row',
    marginBottom: 16,
    width: '100%',
    paddingHorizontal: isTablet ? 32 : 24,
  },
  dayOfWeekCell: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dayOfWeekText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.TEXT_MUTED,
    letterSpacing: 0.5,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    paddingHorizontal: isTablet ? 32 : 24,
  },
  dayCell: {
    width: `${100/7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: 'transparent',
    paddingHorizontal: 1,
  },
  dayCellOtherMonth: {
    backgroundColor: 'transparent',
  },
  dayCellToday: {
    backgroundColor: COLORS.BRAND_LUPINE,
    shadowColor: COLORS.BRAND_LUPINE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  dayCellSelected: {
    backgroundColor: COLORS.BRAND_LUPINE,
    shadowColor: COLORS.BRAND_LUPINE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  dayText: {
    ...TYPOGRAPHY.body,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 22,
  },
  dayTextOtherMonth: {
    color: COLORS.TEXT_MUTED,
    fontWeight: FONT_WEIGHTS.REGULAR,
  },
  dayTextToday: {
    color: COLORS.WHITE,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
  dayTextSelected: {
    color: COLORS.TEXT_PRIMARY,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
  weekView: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
    paddingHorizontal: 16,
  },
  weekHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.BACKGROUND_SECONDARY,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.TEXT_TERTIARY,
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  timeColumn: {
    width: 45,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.LIGHT_GRAY,
    flexShrink: 0,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    minWidth: 35,
  },
  weekDayText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.TEXT_MUTED,
    marginBottom: 4,
  },
  weekDayTextToday: {
    color: COLORS.ERROR, // Red for today indicator
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
  weekDateText: {
    ...TYPOGRAPHY.body,
    color: COLORS.TEXT_PRIMARY,
  },
  weekDateTextToday: {
    color: COLORS.ERROR, // Red for today indicator
    fontWeight: FONT_WEIGHTS.BOLD,
  },
  weekScrollView: {
    flex: 1,
  },
  weekGrid: {
    paddingHorizontal: 0,
  },
  hourRow: {
    flexDirection: 'row',
    height: 60,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.TEXT_TERTIARY,
  },
  hourCell: {
    flex: 1,
    borderRightWidth: 0.5,
    borderRightColor: COLORS.TEXT_TERTIARY,
    position: 'relative',
    minWidth: 35,
  },
  timeText: {
    fontSize: scaleFont(FONT_SIZES.XS),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_TERTIARY,
    textAlign: 'center',
  },
  eventBlock: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderRadius: 6,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  eventTitle: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.WHITE,
    marginBottom: 2,
  },
  eventTime: {
    ...TYPOGRAPHY.captionSmall,
    color: COLORS.WHITE,
    opacity: 0.9,
  },
  dayView: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.BACKGROUND_SECONDARY,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.TEXT_TERTIARY,
  },
  dayHeaderLeft: {
    flex: 1,
  },
  dayTitle: {
    fontSize: scaleFont(FONT_SIZES.LG),
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  dayDate: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_TERTIARY,
  },
  addEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY_BLACK,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: COLORS.PRIMARY_BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  addEventButtonText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    marginLeft: 6,
  },
  eventTemplatesSection: {
    paddingVertical: 16,
    backgroundColor: COLORS.BACKGROUND_SECONDARY,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.TEXT_TERTIARY,
  },
  eventTemplatesTitle: {
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_PRIMARY,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  eventTemplatesContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  eventTemplate: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    width: 90, // Fixed width for all buttons
  },
  eventTemplateIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  eventTemplateIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: FONT_WEIGHTS.BOLD,
  },
  eventTemplateText: {
    fontSize: scaleFont(FONT_SIZES.XS),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.PRIMARY_BLACK,
    textAlign: 'center',
    lineHeight: 14,
  },
  dayScrollView: {
    flex: 1,
  },
  dayTimeline: {
    paddingHorizontal: 16,
  },
  dayHourRow: {
    flexDirection: 'row',
    height: 60,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  dayTimeColumn: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  dayTimeText: {
    fontSize: scaleFont(FONT_SIZES.XS),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: '#9CA3AF',
  },
  dayEventSlot: {
    flex: 1,
    marginLeft: 12,
    position: 'relative',
  },
  dayEventBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  dayEventContent: {
    flex: 1,
  },
  dayEventTitle: {
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  dayEventTime: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 4,
  },
  dayEventLocation: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 4,
  },
  dayEventAttending: {
    fontSize: scaleFont(FONT_SIZES.XS),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 4,
  },
  dayEventNotes: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: '#FFFFFF',
    opacity: 0.8,
    fontStyle: 'italic',
  },
  placeholderText: {
    fontSize: scaleFont(FONT_SIZES.BASE),
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  upcomingSection: {
    paddingHorizontal: isTablet ? 32 : 24,
    paddingTop: 0,
    paddingBottom: 16,
  },
  upcomingSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 0,
  },
  upcomingSectionTitle: {
    ...TYPOGRAPHY.eventTitle,
    color: COLORS.TEXT_PRIMARY,
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F3F4',
  },
  viewAllButtonText: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.PRIMARY_BLACK,
  },
  eventsList: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  eventItemLast: {
    borderBottomWidth: 0,
  },
  eventLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eventTypeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.BOLD,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.PRIMARY_BLACK,
    marginBottom: 2,
  },
  eventMeta: {
    fontSize: scaleFont(FONT_SIZES.SM),
    color: '#6B7280',
    fontWeight: FONT_WEIGHTS.REGULAR,
  },
  eventRight: {
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: scaleFont(FONT_SIZES.BASE),
    color: '#3A3A3E',
    textAlign: 'center',
  },
  eventIndicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 2,
    gap: 2,
  },
  eventIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  moreEventsText: {
    fontSize: scaleFont(FONT_SIZES.XS),
    color: '#6B7280',
    fontWeight: FONT_WEIGHTS.MEDIUM,
    marginLeft: 2,
  },
});

export default CalendarScreen;
