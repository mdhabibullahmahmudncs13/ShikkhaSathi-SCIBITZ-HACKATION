#!/usr/bin/env python3
"""
WebSocket Signaling Server for Real-time Video Conferencing
Handles WebRTC signaling for ShikkhaSathi live classes
"""

import asyncio
import json
import logging
import ssl
import os
from datetime import datetime
from typing import Dict, Set
import websockets
from websockets.legacy.server import WebSocketServerProtocol

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Room:
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.participants: Dict[str, dict] = {}
        self.created_at = datetime.now()
        
    def add_participant(self, user_id: str, websocket: WebSocketServerProtocol, user_data: dict):
        self.participants[user_id] = {
            'websocket': websocket,
            'user_data': user_data,
            'joined_at': datetime.now()
        }
        
    def remove_participant(self, user_id: str):
        if user_id in self.participants:
            del self.participants[user_id]
            
    def get_participant_count(self) -> int:
        return len(self.participants)
        
    def get_other_participants(self, user_id: str) -> list:
        return [
            {
                'userId': uid,
                'userName': data['user_data']['userName'],
                'isTeacher': data['user_data']['isTeacher']
            }
            for uid, data in self.participants.items() 
            if uid != user_id
        ]

class SignalingServer:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}
        self.user_to_room: Dict[str, str] = {}
        
    async def handle_client(self, websocket: WebSocketServerProtocol, path: str):
        """Handle new WebSocket connection"""
        user_id = None
        room_id = None
        
        try:
            logger.info(f"New WebSocket connection from {websocket.remote_address}")
            
            async for message in websocket:
                try:
                    data = json.loads(message)
                    message_type = data.get('type')
                    
                    if message_type == 'join-room':
                        user_id = data['userId']
                        room_id = data['roomId']
                        user_name = data['userName']
                        is_teacher = data['isTeacher']
                        
                        # Create room if it doesn't exist
                        if room_id not in self.rooms:
                            self.rooms[room_id] = Room(room_id)
                            logger.info(f"Created new room: {room_id}")
                        
                        room = self.rooms[room_id]
                        
                        # Add participant to room
                        room.add_participant(user_id, websocket, {
                            'userName': user_name,
                            'isTeacher': is_teacher
                        })
                        self.user_to_room[user_id] = room_id
                        
                        logger.info(f"User {user_name} ({user_id}) joined room {room_id}")
                        
                        # Notify existing participants about new user
                        await self.broadcast_to_room(room_id, {
                            'type': 'user-joined',
                            'userId': user_id,
                            'userName': user_name,
                            'isTeacher': is_teacher
                        }, exclude_user=user_id)
                        
                        # Send existing participants to new user
                        other_participants = room.get_other_participants(user_id)
                        for participant in other_participants:
                            await self.send_to_user(user_id, {
                                'type': 'user-joined',
                                **participant
                            })
                            
                    elif message_type in ['offer', 'answer', 'ice-candidate']:
                        # Forward WebRTC signaling messages
                        target_user_id = data['targetUserId']
                        await self.send_to_user(target_user_id, {
                            **data,
                            'fromUserId': user_id
                        })
                        
                    elif message_type == 'chat-message':
                        # Broadcast chat message to all room participants
                        if user_id and room_id:
                            await self.broadcast_to_room(room_id, {
                                'type': 'chat-message',
                                'fromUserId': user_id,
                                'senderName': data['senderName'],
                                'message': data['message'],
                                'isTeacher': data['isTeacher'],
                                'timestamp': data['timestamp']
                            })
                            
                    elif message_type == 'media-toggle':
                        # Broadcast media toggle to all room participants
                        if user_id and room_id:
                            await self.broadcast_to_room(room_id, {
                                'type': 'media-toggle',
                                'fromUserId': user_id,
                                'mediaType': data['mediaType'],
                                'enabled': data['enabled']
                            }, exclude_user=user_id)
                            
                    elif message_type == 'hand-raise':
                        # Broadcast hand raise to all room participants
                        if user_id and room_id:
                            await self.broadcast_to_room(room_id, {
                                'type': 'hand-raise',
                                'fromUserId': user_id,
                                'isRaised': data['isRaised']
                            }, exclude_user=user_id)
                            
                    else:
                        logger.warning(f"Unknown message type: {message_type}")
                        
                except json.JSONDecodeError:
                    logger.error("Invalid JSON received")
                except Exception as e:
                    logger.error(f"Error processing message: {e}")
                    
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"WebSocket connection closed for user {user_id}")
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
        finally:
            # Clean up when user disconnects
            if user_id and room_id:
                await self.handle_user_disconnect(user_id, room_id)
                
    async def handle_user_disconnect(self, user_id: str, room_id: str):
        """Handle user disconnection"""
        if room_id in self.rooms:
            room = self.rooms[room_id]
            room.remove_participant(user_id)
            
            # Notify other participants
            await self.broadcast_to_room(room_id, {
                'type': 'user-left',
                'userId': user_id
            })
            
            # Remove empty rooms
            if room.get_participant_count() == 0:
                del self.rooms[room_id]
                logger.info(f"Removed empty room: {room_id}")
                
        # Remove user from mapping
        if user_id in self.user_to_room:
            del self.user_to_room[user_id]
            
        logger.info(f"User {user_id} disconnected from room {room_id}")
        
    async def send_to_user(self, user_id: str, message: dict):
        """Send message to specific user"""
        room_id = self.user_to_room.get(user_id)
        if room_id and room_id in self.rooms:
            room = self.rooms[room_id]
            if user_id in room.participants:
                websocket = room.participants[user_id]['websocket']
                try:
                    await websocket.send(json.dumps(message))
                except websockets.exceptions.ConnectionClosed:
                    logger.warning(f"Failed to send message to {user_id}: connection closed")
                except Exception as e:
                    logger.error(f"Failed to send message to {user_id}: {e}")
                    
    async def broadcast_to_room(self, room_id: str, message: dict, exclude_user: str = None):
        """Broadcast message to all participants in a room"""
        if room_id in self.rooms:
            room = self.rooms[room_id]
            disconnected_users = []
            
            for user_id, participant in room.participants.items():
                if exclude_user and user_id == exclude_user:
                    continue
                    
                websocket = participant['websocket']
                try:
                    await websocket.send(json.dumps(message))
                except websockets.exceptions.ConnectionClosed:
                    disconnected_users.append(user_id)
                except Exception as e:
                    logger.error(f"Failed to broadcast to {user_id}: {e}")
                    disconnected_users.append(user_id)
            
            # Clean up disconnected users
            for user_id in disconnected_users:
                await self.handle_user_disconnect(user_id, room_id)
                
    def get_room_stats(self) -> dict:
        """Get statistics about active rooms"""
        return {
            'total_rooms': len(self.rooms),
            'total_participants': sum(room.get_participant_count() for room in self.rooms.values()),
            'rooms': {
                room_id: {
                    'participant_count': room.get_participant_count(),
                    'created_at': room.created_at.isoformat()
                }
                for room_id, room in self.rooms.items()
            }
        }

async def main():
    """Start the WebSocket signaling server"""
    signaling_server = SignalingServer()
    
    # Main handler function
    async def websocket_handler(websocket):
        # Get path from the websocket request
        path = getattr(websocket, 'path', '/')
        
        if path == '/health':
            stats = signaling_server.get_room_stats()
            await websocket.send(json.dumps({
                'status': 'healthy',
                'timestamp': datetime.now().isoformat(),
                'stats': stats
            }))
            await websocket.close()
        else:
            # Handle all other connections as signaling clients
            await signaling_server.handle_client(websocket, path)
    
    # SSL Configuration
    ssl_context = None
    cert_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "certs", "cert.pem")
    key_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "certs", "key.pem")
    
    # Check if SSL certificates exist
    if os.path.exists(cert_path) and os.path.exists(key_path):
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ssl_context.load_cert_chain(cert_path, key_path)
        logger.info(f"SSL certificates found, enabling WSS on port 8001")
        protocol = "wss"
    else:
        logger.info("SSL certificates not found, using WS on port 8001")
        protocol = "ws"
    
    # Start server
    server = await websockets.serve(
        websocket_handler,
        "0.0.0.0",  # Allow connections from all network interfaces
        8001,
        ssl=ssl_context,
        ping_interval=20,
        ping_timeout=10,
        close_timeout=10
    )
    
    logger.info(f"WebSocket signaling server started on {protocol}://0.0.0.0:8001")
    logger.info(f"Health check available at {protocol}://0.0.0.0:8001/health")
    
    # Keep server running
    await server.wait_closed()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")