#!/usr/bin/env python3
"""
Test WebSocket connection to verify the signaling server is working
"""

import asyncio
import websockets
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_websocket_connection():
    """Test WebSocket connection to signaling server"""
    uri = "ws://localhost:8001"
    
    try:
        logger.info(f"Connecting to {uri}...")
        
        async with websockets.connect(uri) as websocket:
            logger.info("✅ WebSocket connection established!")
            
            # Test joining a room
            join_message = {
                "type": "join-room",
                "roomId": "test-room-123",
                "userId": "test-user-456",
                "userName": "Test User",
                "isTeacher": True
            }
            
            logger.info("Sending join-room message...")
            await websocket.send(json.dumps(join_message))
            
            # Wait for any response or confirmation
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                logger.info(f"Received response: {response}")
            except asyncio.TimeoutError:
                logger.info("No immediate response (this is normal for join-room)")
            
            # Test chat message
            chat_message = {
                "type": "chat-message",
                "senderName": "Test User",
                "message": "Hello, this is a test message!",
                "isTeacher": True,
                "timestamp": "2026-01-15T21:20:00Z"
            }
            
            logger.info("Sending chat message...")
            await websocket.send(json.dumps(chat_message))
            
            logger.info("✅ WebSocket communication test successful!")
            
    except Exception as e:
        logger.error(f"❌ WebSocket connection failed: {e}")
        return False
    
    return True

async def test_health_endpoint():
    """Test the health check endpoint"""
    uri = "ws://localhost:8001/health"
    
    try:
        logger.info(f"Testing health endpoint at {uri}...")
        
        async with websockets.connect(uri) as websocket:
            # Health endpoint should send stats and close
            response = await websocket.recv()
            health_data = json.loads(response)
            
            logger.info("✅ Health endpoint working!")
            logger.info(f"Health data: {health_data}")
            
            return True
            
    except Exception as e:
        logger.error(f"❌ Health endpoint test failed: {e}")
        return False

async def main():
    """Run all WebSocket tests"""
    logger.info("🧪 Starting WebSocket Connection Tests")
    logger.info("=" * 50)
    
    # Test 1: Basic WebSocket connection and room joining
    logger.info("\n1. Testing basic WebSocket connection...")
    connection_success = await test_websocket_connection()
    
    # Test 2: Health endpoint
    logger.info("\n2. Testing health endpoint...")
    health_success = await test_health_endpoint()
    
    # Summary
    logger.info("\n" + "=" * 50)
    logger.info("🏁 Test Results Summary:")
    logger.info(f"   WebSocket Connection: {'✅ PASS' if connection_success else '❌ FAIL'}")
    logger.info(f"   Health Endpoint: {'✅ PASS' if health_success else '❌ FAIL'}")
    
    if connection_success and health_success:
        logger.info("\n🎉 All tests passed! WebSocket server is working correctly.")
        return True
    else:
        logger.info("\n⚠️  Some tests failed. Check the server status.")
        return False

if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("Test interrupted by user")
        exit(1)
    except Exception as e:
        logger.error(f"Test error: {e}")
        exit(1)