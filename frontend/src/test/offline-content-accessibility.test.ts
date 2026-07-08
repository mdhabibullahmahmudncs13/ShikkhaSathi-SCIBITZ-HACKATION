import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { offlineStorage, OfflineLessonContent } from '../services/offlineStorage';

/**
 * **Feature: shikkhasathi-platform, Property 10: Offline Content Accessibility**
 * **Validates: Requirements 4.1**
 * 
 * For any previously downloaded content, the PWA should provide full access when internet connectivity is unavailable
 */

describe('Offline Content Accessibility Properties', () => {
  beforeEach(async () => {
    // Clear database before each test
    await offlineStorage.clearAllData();
    // Add a small delay to ensure database is fully cleared
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  afterEach(async () => {
    // Clean up after each test
    await offlineStorage.clearAllData();
  });

  it('should provide access to any previously downloaded lesson content when offline', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary lesson content
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 50 }),
          subject: fc.constantFrom('Physics', 'Chemistry', 'Mathematics', 'Biology', 'Bangla', 'English'),
          grade: fc.integer({ min: 6, max: 12 }),
          chapter: fc.integer({ min: 1, max: 20 }),
          topic: fc.string({ minLength: 1, maxLength: 100 }),
          title: fc.string({ minLength: 1, maxLength: 200 }),
          content: fc.string({ minLength: 10, maxLength: 5000 }),
          metadata: fc.record({
            language: fc.constantFrom('bangla', 'english'),
            pageNumber: fc.option(fc.integer({ min: 1, max: 500 })),
            textbookName: fc.option(fc.string({ minLength: 1, maxLength: 100 }))
          }),
          downloadedAt: fc.date(),
          lastAccessed: fc.option(fc.date())
        }),
        async (lessonData) => {
          // Arrange: Save lesson content as if it was downloaded
          const lesson: OfflineLessonContent = {
            ...lessonData,
            metadata: {
              language: lessonData.metadata.language as 'bangla' | 'english',
              pageNumber: lessonData.metadata.pageNumber || undefined,
              textbookName: lessonData.metadata.textbookName || undefined
            }
          };
          
          await offlineStorage.saveLessonContent(lesson);

          // Act: Retrieve the content (simulating offline access)
          const retrievedLesson = await offlineStorage.getLessonContent(lesson.id);

          // Assert: Content should be fully accessible
          expect(retrievedLesson).toBeDefined();
          expect(retrievedLesson!.id).toBe(lesson.id);
          expect(retrievedLesson!.subject).toBe(lesson.subject);
          expect(retrievedLesson!.grade).toBe(lesson.grade);
          expect(retrievedLesson!.chapter).toBe(lesson.chapter);
          expect(retrievedLesson!.topic).toBe(lesson.topic);
          expect(retrievedLesson!.title).toBe(lesson.title);
          expect(retrievedLesson!.content).toBe(lesson.content);
          expect(retrievedLesson!.metadata.language).toBe(lesson.metadata.language);
          
          // Content should be complete and usable
          expect(retrievedLesson!.content.length).toBeGreaterThan(0);
          expect(retrievedLesson!.title.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow searching through downloaded content when offline', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate multiple lesson contents
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 50 }),
            subject: fc.constantFrom('Physics', 'Chemistry', 'Mathematics'),
            grade: fc.integer({ min: 6, max: 12 }),
            chapter: fc.integer({ min: 1, max: 20 }),
            topic: fc.string({ minLength: 1, maxLength: 100 }),
            title: fc.string({ minLength: 1, maxLength: 200 }),
            content: fc.string({ minLength: 10, maxLength: 1000 }),
            metadata: fc.record({
              language: fc.constantFrom('bangla', 'english'),
              pageNumber: fc.option(fc.integer({ min: 1, max: 500 })),
              textbookName: fc.option(fc.string({ minLength: 1, maxLength: 100 }))
            }),
            downloadedAt: fc.date(),
            lastAccessed: fc.option(fc.date())
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.string({ minLength: 1, maxLength: 20 }), // search query
        async (lessonsData, searchQuery) => {
          // Arrange: Save multiple lessons
          const lessons: OfflineLessonContent[] = lessonsData.map(data => ({
            ...data,
            metadata: {
              language: data.metadata.language as 'bangla' | 'english',
              pageNumber: data.metadata.pageNumber || undefined,
              textbookName: data.metadata.textbookName || undefined
            }
          }));

          for (const lesson of lessons) {
            await offlineStorage.saveLessonContent(lesson);
          }

          // Act: Search through content
          const searchResults = await offlineStorage.searchLessons(searchQuery);

          // Assert: Search should work offline and return relevant results
          expect(Array.isArray(searchResults)).toBe(true);
          
          // All returned results should contain the search query in title, content, or topic
          for (const result of searchResults) {
            const queryLower = searchQuery.toLowerCase();
            const matchesTitle = result.title.toLowerCase().includes(queryLower);
            const matchesContent = result.content.toLowerCase().includes(queryLower);
            const matchesTopic = result.topic.toLowerCase().includes(queryLower);
            
            expect(matchesTitle || matchesContent || matchesTopic).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should provide subject-filtered access to downloaded content when offline', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('Physics', 'Chemistry', 'Mathematics', 'Biology'),
        fc.integer({ min: 6, max: 12 }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            subject: fc.constantFrom('Physics', 'Chemistry', 'Mathematics', 'Biology'),
            grade: fc.integer({ min: 6, max: 12 }),
            chapter: fc.integer({ min: 1, max: 20 }),
            topic: fc.string({ minLength: 1, maxLength: 100 }),
            title: fc.string({ minLength: 1, maxLength: 200 }),
            content: fc.string({ minLength: 10, maxLength: 1000 }),
            metadata: fc.record({
              language: fc.constantFrom('bangla', 'english'),
              pageNumber: fc.option(fc.integer({ min: 1, max: 500 })),
              textbookName: fc.option(fc.string({ minLength: 1, maxLength: 100 }))
            }),
            downloadedAt: fc.date(),
            lastAccessed: fc.option(fc.date())
          }),
          { minLength: 1, maxLength: 15 }
        ),
        async (targetSubject, targetGrade, lessonsData) => {
          // Ensure clean state for this iteration
          await offlineStorage.clearAllData();
          
          // Arrange: Save lessons with various subjects and grades
          const lessons: OfflineLessonContent[] = lessonsData.map(data => ({
            ...data,
            metadata: {
              language: data.metadata.language as 'bangla' | 'english',
              pageNumber: data.metadata.pageNumber || undefined,
              textbookName: data.metadata.textbookName || undefined
            }
          }));

          for (const lesson of lessons) {
            await offlineStorage.saveLessonContent(lesson);
          }

          // Act: Get lessons by subject and grade
          const filteredLessons = await offlineStorage.getLessonsBySubject(targetSubject, targetGrade);

          // Assert: All returned lessons should match the filter criteria
          expect(Array.isArray(filteredLessons)).toBe(true);
          
          for (const lesson of filteredLessons) {
            expect(lesson.subject).toBe(targetSubject);
            expect(lesson.grade).toBe(targetGrade);
          }

          // Should only return lessons that actually match the criteria from saved data
          const expectedCount = lessons.filter(l => l.subject === targetSubject && l.grade === targetGrade).length;
          expect(filteredLessons.length).toBe(expectedCount);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should track and update last accessed time for offline content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 50 }),
          subject: fc.constantFrom('Physics', 'Chemistry', 'Mathematics'),
          grade: fc.integer({ min: 6, max: 12 }),
          chapter: fc.integer({ min: 1, max: 20 }),
          topic: fc.string({ minLength: 1, maxLength: 100 }),
          title: fc.string({ minLength: 1, maxLength: 200 }),
          content: fc.string({ minLength: 10, maxLength: 1000 }),
          metadata: fc.record({
            language: fc.constantFrom('bangla', 'english'),
            pageNumber: fc.option(fc.integer({ min: 1, max: 500 })),
            textbookName: fc.option(fc.string({ minLength: 1, maxLength: 100 }))
          }),
          downloadedAt: fc.date(),
          lastAccessed: fc.option(fc.date())
        }),
        async (lessonData) => {
          // Arrange: Save lesson content
          const lesson: OfflineLessonContent = {
            ...lessonData,
            metadata: {
              language: lessonData.metadata.language as 'bangla' | 'english',
              pageNumber: lessonData.metadata.pageNumber || undefined,
              textbookName: lessonData.metadata.textbookName || undefined
            }
          };
          
          await offlineStorage.saveLessonContent(lesson);
          const beforeUpdate = new Date();

          // Act: Update last accessed time (simulating content access)
          await offlineStorage.updateLastAccessed(lesson.id);

          // Assert: Last accessed time should be updated
          const updatedLesson = await offlineStorage.getLessonContent(lesson.id);
          expect(updatedLesson).toBeDefined();
          expect(updatedLesson!.lastAccessed).toBeDefined();
          expect(updatedLesson!.lastAccessed!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });
});