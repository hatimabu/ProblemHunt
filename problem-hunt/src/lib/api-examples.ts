/**
 * TypeScript Examples for Frontend API Integration
 *
 * Copy these examples into your React/Vue components to interact
 * with the Azure Functions API authenticated with Supabase JWT.
 */

import { authenticatedFetch, handleResponse } from '../lib/auth-helper';

/**
 * EXAMPLE 1: Create a New Post
 */
export async function createNewPost(title: string, content: string, tags: string[]): Promise<any> {
  try {
    const response = await authenticatedFetch('/api/create-post', {
      method: 'POST',
      body: { title, content, tags }
    });

    const post = await handleResponse(response);
    console.log('Post created successfully:', post.id);
    return post;
  } catch (error: any) {
    console.error('Failed to create post:', error.message);
    throw error;
  }
}

/**
 * EXAMPLE 2: Fetch User's Posts with Pagination
 */
export async function fetchUserPosts(page: number = 1, pageSize: number = 10): Promise<any[]> {
  try {
    const offset = (page - 1) * pageSize;
    const response = await authenticatedFetch(
      `/api/get-posts?limit=${pageSize}&offset=${offset}`,
      { method: 'GET' }
    );

    const posts = await handleResponse(response);
    console.log(`Retrieved page ${page}:`, posts.length, 'posts');
    return posts;
  } catch (error: any) {
    console.error('Failed to fetch posts:', error.message);
    return [];
  }
}

/**
 * EXAMPLE 3: Delete a Post
 */
export async function removePost(postId: string): Promise<boolean> {
  try {
    const response = await authenticatedFetch(`/api/delete-post/${postId}`, {
      method: 'DELETE'
    });

    await handleResponse(response);
    console.log('Post deleted successfully');
    return true;
  } catch (error: any) {
    console.error('Failed to delete post:', error.message);
    return false;
  }
}

/**
 * EXAMPLE 4: React Component - Create Post Form
 */
import React, { useState } from 'react';

export function CreatePostForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      await createNewPost(title, content, tags);
      setSuccess(true);

      // Reset form
      setTitle('');
      setContent('');
      setTags([]);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create post');
    } finally {
      setIsLoading(false);
    }
  };

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="create-post-form">
      <h2>Create a New Post</h2>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">Post created successfully!</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter post title"
            required
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="content">Content *</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter post content"
            rows={6}
            required
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="tags">Tags</label>
          <div className="tags-input">
            <input
              type="text"
              id="tags"
              placeholder="Type a tag and press Enter"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
              disabled={isLoading}
            />
            <div className="tags-list">
              {tags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(index)}
                    disabled={isLoading}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <button type="submit" disabled={isLoading || !title || !content}>
          {isLoading ? 'Creating...' : 'Create Post'}
        </button>
      </form>
    </div>
  );
}

/**
 * EXAMPLE 5: React Component - Display Posts List
 */
export function PostsList() {
  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    loadPosts();
  }, [page]);

  const loadPosts = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const data = await fetchUserPosts(page, 10);
      setPosts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const success = await removePost(postId);
      if (success) {
        setPosts(posts.filter((p) => p.id !== postId));
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (isLoading) return <div>Loading posts...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (posts.length === 0) return <div>No posts yet. Create one to get started!</div>;

  return (
    <div className="posts-list">
      <h2>Your Posts</h2>

      <div className="posts">
        {posts.map((post) => (
          <div key={post.id} className="post-card">
            <h3>{post.title}</h3>
            <p>{post.content}</p>
            {post.tags && post.tags.length > 0 && (
              <div className="tags">
                {post.tags.map((tag: string, idx: number) => (
                  <span key={idx} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="post-meta">
              <span className="upvotes">👍 {post.upvotes}</span>
              <span className="created">
                {new Date(post.created_at).toLocaleDateString()}
              </span>
              <button onClick={() => handleDelete(post.id)} className="delete-btn">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="pagination">
        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
          Previous
        </button>
        <span>Page {page}</span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={posts.length < 10}
        >
          Next
        </button>
      </div>
    </div>
  );
}

/**
 * EXAMPLE 6: Error Handling Pattern
 */
export async function robustAPICall<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;

      // Don't retry on 4xx errors (client errors)
      if (error.status && error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Retry on 5xx errors (server errors) with exponential backoff
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        await new Promise((resolve) => setTimeout(resolve, delay));
        console.log(`Retrying (attempt ${attempt + 1}/${maxRetries})...`);
      }
    }
  }

  throw lastError;
}

/**
 * EXAMPLE 7: Using the Retry Pattern
 */
export async function createPostWithRetry(
  title: string,
  content: string,
  tags: string[]
): Promise<any> {
  return robustAPICall(() => createNewPost(title, content, tags), 3);
}
