/**
 * Simple test script for n8n API
 * Run with: node test-api.js
 * 
 * Make sure to set your webhook URL in the script below
 */

const GET_SONGS_URL = process.env.VITE_N8N_GET_SONGS_URL || 'YOUR_WEBHOOK_URL_HERE';

async function testGetSongs() {
  console.log('Testing get-songs endpoint...');
  console.log('URL:', GET_SONGS_URL);
  
  if (GET_SONGS_URL === 'YOUR_WEBHOOK_URL_HERE') {
    console.error('❌ Please set VITE_N8N_GET_SONGS_URL in your .env file or update this script');
    return;
  }

  try {
    const response = await fetch(GET_SONGS_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ Success! Response data:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.songs) {
      console.log(`\n✅ Found ${data.songs.length} songs`);
      if (data.songs.length > 0) {
        console.log('First song:', data.songs[0]);
      }
    } else {
      console.warn('⚠️  Response does not have "songs" property. Expected format: { songs: [...] }');
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testGetSongs();

