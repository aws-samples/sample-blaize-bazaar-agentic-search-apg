#!/usr/bin/env python3
"""
Test Session ID Reuse

Verifies that the same session_id is reused across multiple requests
and not creating a new session for each question.
"""

import os
import sys
from uuid import uuid4

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.aurora_session_manager import AuroraSessionManager
from config import settings
import psycopg

def test_session_reuse():
    """Test that session_id is reused correctly"""
    
    print("🧪 Testing Session ID Reuse\n")
    print("=" * 70)
    
    # Build connection string
    conn_string = f"postgresql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
    
    # Use a consistent test session ID
    test_session_id = f"test-reuse-{uuid4()}"
    print(f"\n📋 Test Session ID: {test_session_id}\n")
    
    # Simulate 3 requests with SAME session_id (like frontend does)
    print("=" * 70)
    print("Simulating 3 requests with SAME session_id")
    print("=" * 70)
    
    for i in range(1, 4):
        print(f"\n🔄 Request {i}:")
        print("-" * 70)
        
        # Create new manager instance (like chat.py does per request)
        # But with SAME session_id
        session_manager = AuroraSessionManager(
            session_id=test_session_id,  # SAME ID
            conn_string=conn_string,
            agent_name="test_agent"
        )
        
        # Add a message
        session_manager.add_message("user", f"Test message {i}")
        session_manager.add_message("assistant", f"Response {i}")
        
        print(f"✅ Request {i} completed")
    
    # Verify results
    print("\n" + "=" * 70)
    print("📊 Verification Results")
    print("=" * 70)
    
    with psycopg.connect(conn_string) as conn:
        with conn.cursor() as cur:
            # Count sessions with this ID
            cur.execute("""
                SELECT COUNT(*) FROM bedrock_integration.conversations
                WHERE session_id = %s
            """, (test_session_id,))
            session_count = cur.fetchone()[0]
            
            # Count messages
            cur.execute("""
                SELECT COUNT(*) FROM bedrock_integration.messages
                WHERE session_id = %s
            """, (test_session_id,))
            message_count = cur.fetchone()[0]
            
            print(f"\n📈 Sessions created: {session_count}")
            print(f"📨 Messages stored: {message_count}")
            
            if session_count == 1:
                print("\n✅ PASS: Only 1 session created (correct behavior)")
            else:
                print(f"\n❌ FAIL: {session_count} sessions created (should be 1)")
            
            if message_count == 6:  # 3 user + 3 assistant
                print("✅ PASS: All 6 messages stored correctly")
            else:
                print(f"❌ FAIL: {message_count} messages stored (should be 6)")
            
            # Show session details
            cur.execute("""
                SELECT session_id, agent_name, created_at, updated_at
                FROM bedrock_integration.conversations
                WHERE session_id = %s
            """, (test_session_id,))
            session = cur.fetchone()
            
            if session:
                print(f"\n📋 Session Details:")
                print(f"   Session ID: {session[0]}")
                print(f"   Agent: {session[1]}")
                print(f"   Created: {session[2]}")
                print(f"   Updated: {session[3]}")
            
            # Show messages
            cur.execute("""
                SELECT role, content, timestamp
                FROM bedrock_integration.messages
                WHERE session_id = %s
                ORDER BY timestamp
            """, (test_session_id,))
            messages = cur.fetchall()
            
            print(f"\n💬 Messages:")
            for msg in messages:
                print(f"   [{msg[2]}] {msg[0]}: {msg[1]}")
    
    # Cleanup
    print("\n" + "=" * 70)
    print("🧹 Cleaning up test data")
    print("=" * 70)
    
    session_manager.clear()
    
    with psycopg.connect(conn_string) as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM bedrock_integration.conversations WHERE session_id = %s", (test_session_id,))
            conn.commit()
    
    print("✅ Test data cleaned up")
    
    print("\n" + "=" * 70)
    print("🎯 Test Complete")
    print("=" * 70)
    
    return session_count == 1 and message_count == 6

if __name__ == "__main__":
    try:
        success = test_session_reuse()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
