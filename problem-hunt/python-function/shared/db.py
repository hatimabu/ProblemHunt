"""
Shared Azure Cosmos DB module for managing post data.

This module provides a singleton connection to Cosmos DB and utility functions
for creating, reading, and deleting posts (documents) in the container.

Data Model:
    - partition_key: user_id (ensures efficient queries per user)
    - id: A unique identifier for each post (often a UUID)
    - Fields: user_id, title, content, created_at, updated_at, upvotes, etc.
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from azure.cosmos import CosmosClient, PartitionKey, exceptions
import uuid


logger = logging.getLogger(__name__)


class CosmosDBError(Exception):
    """Custom exception for Cosmos DB errors."""
    pass


class CosmosDBClient:
    """Singleton client for Azure Cosmos DB operations."""
    
    _instance = None
    _client = None
    _database = None
    _container = None
    
    def __new__(cls):
        """Ensure singleton pattern - only one instance of the client."""
        if cls._instance is None:
            cls._instance = super(CosmosDBClient, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize Cosmos DB connection (only once)."""
        if self._client is None:
            self._connect()
    
    def _connect(self):
        """Establish connection to Azure Cosmos DB."""
        try:
            endpoint = os.getenv("COSMOS_ENDPOINT")
            key = os.getenv("COSMOS_KEY")
            database_name = os.getenv("COSMOS_DATABASE", "ProblemHuntDB")
            container_name = os.getenv("COSMOS_CONTAINER_PROBLEMS", "Problems")
            
            if not endpoint or not key:
                raise CosmosDBError(
                    "Missing Cosmos DB credentials. "
                    "Set COSMOS_ENDPOINT and COSMOS_KEY environment variables."
                )
            
            # Create client
            self._client = CosmosClient(endpoint, credential=key)
            
            # Get or create database
            self._database = self._client.get_database_client(database_name)
            
            # Get or create container with user_id as partition key
            try:
                self._container = self._database.get_container_client(container_name)
                logger.info(f"Connected to container '{container_name}'")
            except exceptions.CosmosResourceNotFoundError:
                logger.info(f"Container '{container_name}' not found, creating...")
                self._container = self._database.create_container(
                    id=container_name,
                    partition_key=PartitionKey(path="/user_id"),
                    offer_throughput=400  # Minimum RUs
                )
                logger.info(f"Created container '{container_name}'")
        
        except exceptions.CosmosHttpResponseError as e:
            logger.error(f"Cosmos DB connection error: {str(e)}")
            raise CosmosDBError(f"Failed to connect to Cosmos DB: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error connecting to Cosmos DB: {str(e)}")
            raise CosmosDBError(f"Unexpected error: {str(e)}")
    
    def save_post(self, user_id: str, post_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create or update a post in Cosmos DB.
        
        Args:
            user_id: The ID of the user creating the post (partition key)
            post_data: Dictionary containing post fields (title, content, etc.)
                      If 'id' is not provided, a UUID will be generated.
        
        Returns:
            Dict: The created/updated post with all fields including id and timestamps
            
        Raises:
            CosmosDBError: If the operation fails
            
        Example:
            post = client.save_post(
                user_id="user-123",
                post_data={
                    "title": "My Problem",
                    "content": "Description here",
                    "tags": ["bug", "urgent"]
                }
            )
        """
        try:
            # Prepare the document
            doc = {
                "id": post_data.get("id") or str(uuid.uuid4()),
                "user_id": user_id,
                "title": post_data.get("title", ""),
                "content": post_data.get("content", ""),
                "tags": post_data.get("tags", []),
                "upvotes": post_data.get("upvotes", 0),
                "created_at": post_data.get("created_at") or datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                # Include any additional custom fields
                **{k: v for k, v in post_data.items() 
                   if k not in ["id", "user_id", "created_at", "updated_at"]}
            }
            
            # Upsert the document (create if not exists, update if exists)
            response = self._container.upsert_item(doc)
            logger.info(f"Post saved with id: {doc['id']}")
            return response
        
        except exceptions.CosmosHttpResponseError as e:
            logger.error(f"Error saving post: {str(e)}")
            raise CosmosDBError(f"Failed to save post: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error saving post: {str(e)}")
            raise CosmosDBError(f"Unexpected error: {str(e)}")
    
    def get_posts(self, user_id: str, limit: int = 10, offset: int = 0) -> List[Dict[str, Any]]:
        """
        Retrieve posts for a specific user.
        
        Uses partition key for efficient querying within a user's data.
        
        Args:
            user_id: The user ID (partition key) to query
            limit: Maximum number of posts to return (default: 10)
            offset: Number of posts to skip for pagination (default: 0)
        
        Returns:
            List[Dict]: List of post documents
            
        Raises:
            CosmosDBError: If the query fails
            
        Example:
            posts = client.get_posts(user_id="user-123", limit=20)
        """
        try:
            query = "SELECT * FROM c WHERE c.user_id = @user_id ORDER BY c.created_at DESC OFFSET @offset LIMIT @limit"
            parameters = [
                {"name": "@user_id", "value": user_id},
                {"name": "@offset", "value": offset},
                {"name": "@limit", "value": limit}
            ]
            
            items = list(self._container.query_items(
                query=query,
                parameters=parameters
            ))
            
            logger.info(f"Retrieved {len(items)} posts for user {user_id}")
            return items
        
        except exceptions.CosmosHttpResponseError as e:
            logger.error(f"Error retrieving posts: {str(e)}")
            raise CosmosDBError(f"Failed to retrieve posts: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error retrieving posts: {str(e)}")
            raise CosmosDBError(f"Unexpected error: {str(e)}")
    
    def get_post_by_id(self, user_id: str, post_id: str) -> Dict[str, Any]:
        """
        Retrieve a specific post by ID.
        
        Args:
            user_id: The user ID (partition key)
            post_id: The post ID to retrieve
        
        Returns:
            Dict: The post document
            
        Raises:
            CosmosDBError: If the post is not found or query fails
            
        Example:
            post = client.get_post_by_id(user_id="user-123", post_id="post-456")
        """
        try:
            item = self._container.read_item(item=post_id, partition_key=user_id)
            logger.info(f"Retrieved post {post_id}")
            return item
        
        except exceptions.CosmosResourceNotFoundError:
            raise CosmosDBError(f"Post with id {post_id} not found")
        except exceptions.CosmosHttpResponseError as e:
            logger.error(f"Error retrieving post: {str(e)}")
            raise CosmosDBError(f"Failed to retrieve post: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error retrieving post: {str(e)}")
            raise CosmosDBError(f"Unexpected error: {str(e)}")
    
    def delete_post(self, user_id: str, post_id: str) -> bool:
        """
        Delete a post from Cosmos DB.
        
        Args:
            user_id: The user ID (partition key)
            post_id: The post ID to delete
        
        Returns:
            bool: True if deletion was successful
            
        Raises:
            CosmosDBError: If the deletion fails
            
        Example:
            success = client.delete_post(user_id="user-123", post_id="post-456")
        """
        try:
            self._container.delete_item(item=post_id, partition_key=user_id)
            logger.info(f"Post {post_id} deleted successfully")
            return True
        
        except exceptions.CosmosResourceNotFoundError:
            raise CosmosDBError(f"Post with id {post_id} not found")
        except exceptions.CosmosHttpResponseError as e:
            logger.error(f"Error deleting post: {str(e)}")
            raise CosmosDBError(f"Failed to delete post: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error deleting post: {str(e)}")
            raise CosmosDBError(f"Unexpected error: {str(e)}")
    
    def update_post(self, user_id: str, post_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update specific fields of a post.
        
        Args:
            user_id: The user ID (partition key)
            post_id: The post ID to update
            updates: Dictionary of fields to update
        
        Returns:
            Dict: The updated post document
            
        Raises:
            CosmosDBError: If the update fails
            
        Example:
            updated_post = client.update_post(
                user_id="user-123",
                post_id="post-456",
                updates={"title": "New Title", "upvotes": 5}
            )
        """
        try:
            # Get current post
            post = self.get_post_by_id(user_id, post_id)
            
            # Merge updates while preserving required fields
            post.update({
                **updates,
                "updated_at": datetime.utcnow().isoformat(),
                "user_id": user_id,  # Don't change partition key
                "id": post_id  # Don't change id
            })
            
            # Save merged post
            response = self._container.replace_item(item=post_id, body=post)
            logger.info(f"Post {post_id} updated successfully")
            return response
        
        except CosmosDBError:
            raise
        except exceptions.CosmosHttpResponseError as e:
            logger.error(f"Error updating post: {str(e)}")
            raise CosmosDBError(f"Failed to update post: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error updating post: {str(e)}")
            raise CosmosDBError(f"Unexpected error: {str(e)}")


# Singleton instance
db_client = CosmosDBClient()


def get_db_client() -> CosmosDBClient:
    """Get the singleton Cosmos DB client instance."""
    return db_client
