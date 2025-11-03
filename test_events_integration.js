#!/usr/bin/env node

/**
 * Test script for Events Integration
 * This script tests the database connection and events functionality
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

if (supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseKey === 'YOUR_SUPABASE_ANON_KEY') {
  console.error('❌ Please set your Supabase environment variables in .env file');
  console.error('   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url');
  console.error('   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('id, name')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    console.log(`   Found ${data?.length || 0} teams`);
    return true;
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    return false;
  }
}

async function testEventsTable() {
  console.log('\n🔍 Testing events table...');
  
  try {
    // Check if events table exists
    const { data, error } = await supabase
      .from('events')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Events table not found or accessible:', error.message);
      console.log('   Please run the events_schema.sql script in your Supabase SQL editor');
      return false;
    }
    
    console.log('✅ Events table exists and is accessible');
    return true;
  } catch (err) {
    console.error('❌ Events table error:', err.message);
    return false;
  }
}

async function testCreateEvent() {
  console.log('\n🔍 Testing event creation...');
  
  try {
    // First, get a team ID to use for testing
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id')
      .limit(1);
    
    if (teamsError || !teams || teams.length === 0) {
      console.error('❌ No teams found to test with');
      return false;
    }
    
    const teamId = teams[0].id;
    
    // Create a test event
    const testEvent = {
      team_id: teamId,
      title: 'Test Event',
      description: 'This is a test event created by the integration test',
      event_type: 'practice',
      start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      end_time: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
      location: 'Test Location',
      color: '#FF4444',
      visibility: 'team',
      created_by: '00000000-0000-0000-0000-000000000000' // Dummy user ID for testing
    };
    
    const { data, error } = await supabase
      .from('events')
      .insert([testEvent])
      .select();
    
    if (error) {
      console.error('❌ Failed to create test event:', error.message);
      return false;
    }
    
    console.log('✅ Test event created successfully');
    console.log(`   Event ID: ${data[0].id}`);
    
    // Clean up - delete the test event
    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', data[0].id);
    
    if (deleteError) {
      console.warn('⚠️  Could not clean up test event:', deleteError.message);
    } else {
      console.log('✅ Test event cleaned up');
    }
    
    return true;
  } catch (err) {
    console.error('❌ Event creation test error:', err.message);
    return false;
  }
}

async function testEventFunctions() {
  console.log('\n🔍 Testing event helper functions...');
  
  try {
    // Test get_upcoming_events function
    const { data: teams } = await supabase
      .from('teams')
      .select('id')
      .limit(1);
    
    if (!teams || teams.length === 0) {
      console.error('❌ No teams found to test functions');
      return false;
    }
    
    const { data, error } = await supabase
      .rpc('get_upcoming_events', {
        p_team_id: teams[0].id,
        p_limit: 5
      });
    
    if (error) {
      console.error('❌ get_upcoming_events function failed:', error.message);
      console.log('   Make sure you have run the events_schema.sql script');
      return false;
    }
    
    console.log('✅ Event helper functions are working');
    console.log(`   Found ${data?.length || 0} upcoming events`);
    return true;
  } catch (err) {
    console.error('❌ Event functions test error:', err.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Events Integration Tests\n');
  
  const tests = [
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'Events Table', fn: testEventsTable },
    { name: 'Event Creation', fn: testCreateEvent },
    { name: 'Event Functions', fn: testEventFunctions }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error(`❌ ${test.name} test failed with error:`, err.message);
      failed++;
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Your events integration is ready to use.');
    console.log('\n📝 Next steps:');
    console.log('   1. Run your React Native app');
    console.log('   2. Navigate to the Calendar screen');
    console.log('   3. Try creating, editing, and deleting events');
    console.log('   4. Check that events appear on the Home screen');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
    console.log('\n🔧 Common fixes:');
    console.log('   1. Make sure your Supabase environment variables are set');
    console.log('   2. Run the events_schema.sql script in your Supabase SQL editor');
    console.log('   3. Check that your database has the required tables');
  }
}

// Run the tests
runAllTests().catch(console.error);

