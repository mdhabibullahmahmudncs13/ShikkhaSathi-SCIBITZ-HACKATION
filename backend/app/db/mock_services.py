"""
Mock services for MongoDB and Redis to enable development without external databases
"""
import json
import os
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta


class MockMongoDB:
    """Mock MongoDB service using file-based storage"""
    
    def __init__(self, db_name: str = "shikkhasathi_dev"):
        self.db_name = db_name
        self.data_dir = os.path.join(os.path.dirname(__file__), "..", "..", "mock_data")
        os.makedirs(self.data_dir, exist_ok=True)
        self.collections = {}
    
    def get_collection(self, collection_name: str):
        if collection_name not in self.collections:
            self.collections[collection_name] = MockCollection(
                os.path.join(self.data_dir, f"{collection_name}.json")
            )
        return self.collections[collection_name]


class MockCollection:
    """Mock MongoDB collection"""
    
    def __init__(self, file_path: str):
        self.file_path = file_path
        self._load_data()
    
    def _load_data(self):
        if os.path.exists(self.file_path):
            with open(self.file_path, 'r') as f:
                self.data = json.load(f)
        else:
            self.data = []
    
    def _save_data(self):
        with open(self.file_path, 'w') as f:
            json.dump(self.data, f, indent=2, default=str)
    
    def insert_one(self, document: Dict[str, Any]):
        document['_id'] = len(self.data) + 1
        document['created_at'] = datetime.now().isoformat()
        self.data.append(document)
        self._save_data()
        return MockInsertResult(document['_id'])
    
    def find_one(self, filter_dict: Dict[str, Any] = None):
        if not filter_dict:
            return self.data[0] if self.data else None
        
        for doc in self.data:
            if all(doc.get(k) == v for k, v in filter_dict.items()):
                return doc
        return None
    
    def find(self, filter_dict: Dict[str, Any] = None):
        if not filter_dict:
            return self.data
        
        result = []
        for doc in self.data:
            if all(doc.get(k) == v for k, v in filter_dict.items()):
                result.append(doc)
        return result
    
    def update_one(self, filter_dict: Dict[str, Any], update_dict: Dict[str, Any]):
        for doc in self.data:
            if all(doc.get(k) == v for k, v in filter_dict.items()):
                if '$set' in update_dict:
                    doc.update(update_dict['$set'])
                doc['updated_at'] = datetime.now().isoformat()
                self._save_data()
                return MockUpdateResult(1)
        return MockUpdateResult(0)
    
    def delete_one(self, filter_dict: Dict[str, Any]):
        for i, doc in enumerate(self.data):
            if all(doc.get(k) == v for k, v in filter_dict.items()):
                del self.data[i]
                self._save_data()
                return MockDeleteResult(1)
        return MockDeleteResult(0)


class MockInsertResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id


class MockUpdateResult:
    def __init__(self, modified_count):
        self.modified_count = modified_count


class MockDeleteResult:
    def __init__(self, deleted_count):
        self.deleted_count = deleted_count


class MockRedis:
    """Mock Redis service using in-memory storage"""
    
    def __init__(self):
        self.data = {}
        self.expiry = {}
    
    def set(self, key: str, value: str, ex: Optional[int] = None):
        self.data[key] = value
        if ex:
            self.expiry[key] = datetime.now() + timedelta(seconds=ex)
        return True
    
    def get(self, key: str) -> Optional[str]:
        if key in self.expiry and datetime.now() > self.expiry[key]:
            del self.data[key]
            del self.expiry[key]
            return None
        return self.data.get(key)
    
    def delete(self, key: str) -> int:
        if key in self.data:
            del self.data[key]
            if key in self.expiry:
                del self.expiry[key]
            return 1
        return 0
    
    def exists(self, key: str) -> bool:
        if key in self.expiry and datetime.now() > self.expiry[key]:
            del self.data[key]
            del self.expiry[key]
            return False
        return key in self.data
    
    def keys(self, pattern: str = "*") -> List[str]:
        # Simple pattern matching for development
        if pattern == "*":
            return list(self.data.keys())
        # Add more pattern matching if needed
        return [k for k in self.data.keys() if pattern.replace("*", "") in k]


# Global instances
mock_mongodb = MockMongoDB()
mock_redis = MockRedis()