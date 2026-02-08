import os
import json
from azure.cosmos import CosmosClient, PartitionKey, exceptions


def get_env(name: str) -> str:
    """Get environment variable"""
    value = os.getenv(name)
    if not value:
        raise ValueError(f"Missing required env var: {name}")
    return value


class CosmosDBClient:
    """Cosmos DB client for managing database operations"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        try:
            endpoint = get_env("COSMOS_ENDPOINT")
            key = get_env("COSMOS_KEY")
            
            # Check for mock/placeholder values
            if (not endpoint or not key or 
                endpoint.endswith('your-account') or 
                key.startswith('PASTE_YOUR') or 
                key == 'placeholder-key' or
                len(key) < 20):
                print("⚠️  Using MOCK in-memory database (local development mode)")
                print("   To use real Cosmos DB, set COSMOS_ENDPOINT and COSMOS_KEY in local.settings.json")
                self.use_mock = True
                self.containers = self._create_mock_containers()
            else:
                self.use_mock = False
                self.client = CosmosClient(endpoint, credential=key)
                database_id = os.getenv("COSMOS_DATABASE", "ProblemHuntDB")
                self.database = self.client.get_database_client(database_id)
                self.containers = self._create_containers()
                print("✅ Connected to Cosmos DB")
                
        except Exception as e:
            print(f"⚠️  Cosmos DB connection error: {e}. Using mock mode.")
            self.use_mock = True
            self.containers = self._create_mock_containers()
        
        self._initialized = True
    
    def _create_containers(self):
        """Create references to actual Cosmos DB containers"""
        return {
            'problems': self.database.get_container_client(os.getenv("COSMOS_CONTAINER_PROBLEMS", "Problems")),
            'proposals': self.database.get_container_client(os.getenv("COSMOS_CONTAINER_PROPOSALS", "Proposals")),
            'upvotes': self.database.get_container_client(os.getenv("COSMOS_CONTAINER_UPVOTES", "Upvotes")),
            'tips': self.database.get_container_client(os.getenv("COSMOS_CONTAINER_TIPS", "Tips"))
        }
    
    def _create_mock_containers(self):
        """Create mock containers for local development"""
        return {
            'problems': MockContainer(),
            'proposals': MockContainer(),
            'upvotes': MockContainer(),
            'tips': MockContainer()
        }


class MockContainer:
    """Mock Cosmos DB container for local testing"""
    
    def __init__(self):
        self.items = {}
    
    def create_item(self, body):
        """Create an item"""
        item_id = body.get('id')
        if not item_id:
            raise ValueError("Item must have 'id' field")
        self.items[item_id] = body
        return body
    
    def get_item(self, item_id, partition_key):
        """Get an item by ID"""
        if item_id in self.items:
            return self.items[item_id]
        raise exceptions.CosmosResourceNotFoundError("Item not found")
    
    def query_items(self, query, parameters=None, enable_cross_partition_query=False):
        """Query items"""
        # Simple mock query implementation
        results = list(self.items.values())
        
        # Basic filtering for common queries
        if parameters:
            filtered = []
            for item in results:
                match = True
                for param in parameters:
                    param_name = param.get('name', '').replace('@', '')
                    param_value = param.get('value')
                    
                    # Simple parameter matching
                    if param_name in item and item[param_name] != param_value:
                        match = False
                        break
                
                if match:
                    filtered.append(item)
            results = filtered
        
        return results
    
    def replace_item(self, item_id, body):
        """Replace an item"""
        if item_id in self.items:
            self.items[item_id] = body
            return body
        raise exceptions.CosmosResourceNotFoundError("Item not found")
    
    def delete_item(self, item_id, partition_key):
        """Delete an item"""
        if item_id in self.items:
            del self.items[item_id]
            return True
        raise exceptions.CosmosResourceNotFoundError("Item not found")


# Get singleton instance
cosmos_client = CosmosDBClient()
containers = cosmos_client.containers
