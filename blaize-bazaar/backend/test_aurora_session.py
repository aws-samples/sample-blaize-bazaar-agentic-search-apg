#!/usr/bin/env python3
"""
Quick test script for Aurora Session Manager

Verifies that session management tables exist and AuroraSessionManager works correctly.
"""

import os
import sys
from uuid import uuid4

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.aurora_session_manager import AuroraSessionManager
from config import settings

def test_aurora_session_manager():
    """Test Aurora session manager functionality"""
    
    print("🧪 Testing Aurora Session Manager\n")
    print("=" * 60)
    
    # Build connection string
    conn_string = f"postgresql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
    
    # Create test session
    test_session_id = f"test-{uuid4()}"
    print(f"\n1️⃣ Creating session: {test_session_id}")
    
    try:
        session_manager = AuroraSessionManager(
            session_id=test_session_id,
            conn_string=conn_string,
            agent_name="test_agent"
        )
        print("   ✅ Session created successfully")
    except Exception as e:
        print(f"   ❌ Failed to create session: {e}")
        return False
    
    # Test adding messages
    print("\n2️⃣ Adding messages to conversation")
    try:
        session_manager.add_message("user", "Hello, I need help finding a laptop")
        session_manager.add_message("assistant", "I'd be happy to help you find a laptop!")
        print("   ✅ Messages added successfully")
    except Exception as e:
        print(f"   ❌ Failed to add messages: {e}")
        return False
    
    # Test adding tool use
    print("\n3️⃣ Recording tool invocation")
    try:
        session_manager.add_tool_use(
            tool_name="semantic_product_search",
            tool_input={"query": "laptop", "limit": 5},
            tool_output={"products_found": 5}
        )
        print("   ✅ Tool use recorded successfully")
    except Exception as e:
        print(f"   ❌ Failed to record tool use: {e}")
        return False
    
    # Test retrieving messages
    print("\n4️⃣ Retrieving conversation history")
    try:
        messages = session_manager.get_messages()
        print(f"   ✅ Retrieved {len(messages)} messages")
        for msg in messages:
            print(f"      - {msg['role']}: {msg['content'][:50]}...")
    except Exception as e:
        print(f"   ❌ Failed to retrieve messages: {e}")
        return False
    
    # Test context management
    print("\n5️⃣ Testing context management")
    try:
        session_manager.update_context({"user_preference": "gaming laptops", "budget": 1500})
        context = session_manager.get_context()
        print(f"   ✅ Context updated and retrieved: {context}")
    except Exception as e:
        print(f"   ❌ Failed to manage context: {e}")
        return False
    
    # Clean up
    print("\n6️⃣ Cleaning up test session")
    try:
        session_manager.clear()
        print("   ✅ Session cleared successfully")
    except Exception as e:
        print(f"   ❌ Failed to clear session: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("✅ All tests passed! Aurora Session Manager is working correctly.\n")
    return True

if __name__ == "__main__":
    success = test_aurora_session_manager()
    sys.exit(0 if success else 1)
