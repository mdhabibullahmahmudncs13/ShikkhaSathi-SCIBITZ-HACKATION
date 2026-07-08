/**
 * **Feature: shikkhasathi-platform, Property 13: Content Download Functionality**
 * **Validates: Requirements 4.4**
 * 
 * Property-based test for content download system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { contentDownloadService, DownloadableContent, ContentSelection } from '../services/contentDownloadService';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn((key: string) => {
    if (key === 'token') return 'mock-token';
    if (key === 'download-queue') return '{"items":[],"isActive":false}';
    return null;
  }),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock navigator.storage
Object.defineProperty(navigator, 'storage', {
  value: {
    estimate: vi.fn().mockResolvedValue({
      usage: 1024 * 1024 * 10, // 10MB used
      quota: 1024 * 1024 * 100  // 100MB total
    })
  }
});

// Helper to create valid downloadable content
const createValidContent = (overrides: Partial<DownloadableContent> = {}): DownloadableContent => ({
  id: `content-${Math.random().toString(36).substr(2, 9)}`,
  subject: 'Mathematics',
  grade: 8,
  chapter: 1,
  topic: 'Algebra',
  title: 'Introduction to Linear Equations',
  size: 1024 * 50, // 50KB
  language: 'bangla',
  textbookName: 'Mathematics Grade 8',
  pageNumber: 15,
  ...overrides
});

describe('Content Download System Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(async () => {
    await contentDownloadService.clearQueue();
    contentDownloadService.destroy();
  });

  describe('Property 13: Content Download Functionality', () => {
    it('should fetch available content based on selection criteria', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            subject: fc.constantFrom('Mathematics', 'Physics', 'Chemistry', 'Biology'),
            grade: fc.integer({ min: 6, max: 10 }),
            language: fc.constantFrom('bangla', 'english')
          }),
          async (selectionData) => {
            const selection: ContentSelection = selectionData;
            
            // Mock successful API response
            const mockContent = [
              createValidContent({
                subject: selection.subject,
                grade: selection.grade,
                language: selection.language
              })
            ];
            
            mockFetch.mockResolvedValue({
              ok: true,
              status: 200,
              json: async () => ({ content: mockContent })
            });

            // Act: Fetch available content
            const result = await contentDownloadService.getAvailableContent(selection);

            // Assert: Should return content matching selection criteria
            expect(result).toHaveLength(1);
            expect(result[0].subject).toBe(selection.subject);
            expect(result[0].grade).toBe(selection.grade);
            expect(result[0].language).toBe(selection.language);

            // Verify API was called with correct parameters
            expect(mockFetch).toHaveBeenCalledWith(
              expect.stringContaining('/api/v1/content/available'),
              expect.objectContaining({
                headers: expect.objectContaining({
                  'Authorization': 'Bearer mock-token'
                })
              })
            );
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should manage download queue correctly', async () => {
      // Test with valid content items
      const contentItems = [
        createValidContent({ id: 'content-1', title: 'Algebra Basics' }),
        createValidContent({ id: 'content-2', title: 'Linear Equations' }),
        createValidContent({ id: 'content-3', title: 'Quadratic Equations' })
      ];

      // Act: Add content to queue
      await contentDownloadService.addToQueue(contentItems);

      // Assert: Queue should contain all items
      const queue = contentDownloadService.getQueue();
      expect(queue.items).toHaveLength(contentItems.length);
      
      // Verify each item is properly structured
      queue.items.forEach((item, index) => {
        expect(item.content.id).toBe(contentItems[index].id);
        expect(item.status).toBe('pending');
        expect(item.progress).toBe(0);
        expect(item.retryCount).toBe(0);
      });
    });

    it('should check storage quota before downloads', async () => {
      // Test with content that exceeds available storage
      const largeContent = createValidContent({
        id: 'large-content',
        size: 1024 * 1024 * 200 // 200MB (exceeds 100MB quota)
      });

      // Act: Check storage space
      const hasSpace = await contentDownloadService.checkStorageSpace(largeContent.size);

      // Assert: Should return false for insufficient space
      expect(hasSpace).toBe(false);

      // Test with content that fits
      const smallContent = createValidContent({
        id: 'small-content',
        size: 1024 * 1024 * 5 // 5MB (fits in available space)
      });

      const hasSpaceForSmall = await contentDownloadService.checkStorageSpace(smallContent.size);
      expect(hasSpaceForSmall).toBe(true);
    });

    it('should handle download queue operations correctly', async () => {
      const content = createValidContent({ id: 'test-content' });
      
      // Add to queue
      await contentDownloadService.addToQueue([content]);
      let queue = contentDownloadService.getQueue();
      expect(queue.items).toHaveLength(1);

      // Remove from queue
      const itemId = queue.items[0].id;
      await contentDownloadService.removeFromQueue(itemId);
      queue = contentDownloadService.getQueue();
      expect(queue.items).toHaveLength(0);
    });

    it('should prevent duplicate content in queue', async () => {
      const content = createValidContent({ id: 'duplicate-test' });
      
      // Add same content twice
      await contentDownloadService.addToQueue([content]);
      await contentDownloadService.addToQueue([content]);
      
      // Should only have one item
      const queue = contentDownloadService.getQueue();
      expect(queue.items).toHaveLength(1);
    });

    it('should calculate storage quota correctly', async () => {
      const quota = await contentDownloadService.getStorageQuota();
      
      expect(quota.used).toBe(1024 * 1024 * 10); // 10MB
      expect(quota.total).toBe(1024 * 1024 * 100); // 100MB
      expect(quota.available).toBe(1024 * 1024 * 90); // 90MB
      expect(quota.percentage).toBe(10); // 10%
    });
  });

  describe('Content Selection Validation', () => {
    it('should validate content selection parameters', async () => {
      const selection: ContentSelection = {
        subject: 'Mathematics',
        grade: 8,
        language: 'bangla'
      };
      
      // Mock API response
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ content: [] })
      });

      // Should not throw error for valid selection
      await expect(
        contentDownloadService.getAvailableContent(selection)
      ).resolves.not.toThrow();

      // Verify API call includes all parameters
      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      const url = lastCall[0] as string;
      
      expect(url).toContain('/api/v1/content/available');
      expect(url).toContain(`grade=${selection.grade}`);
      expect(url).toContain(`language=${selection.language}`);
      expect(url).toContain('subject=');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const selection: ContentSelection = {
        subject: 'Mathematics',
        grade: 8,
        language: 'bangla'
      };

      // Mock API error
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Should throw error but not crash
      await expect(
        contentDownloadService.getAvailableContent(selection)
      ).rejects.toThrow('Network error');
    });

    it('should handle invalid API responses', async () => {
      const selection: ContentSelection = {
        subject: 'Mathematics',
        grade: 8,
        language: 'bangla'
      };

      // Mock invalid response
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      // Should throw appropriate error
      await expect(
        contentDownloadService.getAvailableContent(selection)
      ).rejects.toThrow('Failed to fetch available content: Not Found');
    });
  });
});