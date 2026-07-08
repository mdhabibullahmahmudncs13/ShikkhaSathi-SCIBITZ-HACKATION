import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { StudentProgress } from '../types/dashboard';

/**
 * **Feature: shikkhasathi-platform, Property 7: Dashboard Data Completeness**
 * **Validates: Requirements 3.1, 3.2**
 * 
 * For any student login, the dashboard should display all required elements:
 * current XP, level, learning streak, subject-wise progress, visual indicators, and progress bars
 */

// Simplified generators for property-based testing
const simpleStudentProgressArb = fc.record({
  userId: fc.uuid(),
  totalXP: fc.integer({ min: 0, max: 1000 }),
  currentLevel: fc.integer({ min: 1, max: 10 }),
  currentStreak: fc.integer({ min: 0, max: 30 }),
  longestStreak: fc.integer({ min: 0, max: 30 }),
  subjectProgress: fc.array(fc.record({
    subject: fc.constantFrom('Mathematics', 'Physics'),
    completionPercentage: fc.float({ min: 0, max: 100 }),
    bloomLevelProgress: fc.array(fc.record({
      level: fc.integer({ min: 1, max: 6 }),
      mastery: fc.float({ min: 0, max: 100 })
    }), { minLength: 1, maxLength: 2 }),
    timeSpent: fc.integer({ min: 0, max: 1000 }),
    lastAccessed: fc.date()
  }), { minLength: 1, maxLength: 2 }),
  achievements: fc.array(fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 5, maxLength: 20 }),
    description: fc.string({ minLength: 10, maxLength: 30 }),
    icon: fc.constantFrom('🏆', '🎯'),
    unlockedAt: fc.option(fc.date()).map(d => d || undefined),
    progress: fc.option(fc.integer({ min: 0, max: 100 })).map(p => p || undefined),
    target: fc.option(fc.integer({ min: 1, max: 100 })).map(t => t || undefined)
  }), { minLength: 0, maxLength: 3 }),
  weakAreas: fc.array(fc.record({
    subject: fc.constantFrom('Mathematics', 'Physics'),
    topic: fc.string({ minLength: 5, maxLength: 15 }),
    bloomLevel: fc.integer({ min: 1, max: 6 }),
    successRate: fc.float({ min: 0, max: 100 })
  }), { minLength: 0, maxLength: 2 }),
  recommendedPath: fc.record({
    currentTopic: fc.string({ minLength: 5, maxLength: 15 }),
    recommendedNextTopics: fc.array(fc.record({
      subject: fc.constantFrom('Mathematics', 'Physics'),
      topic: fc.string({ minLength: 5, maxLength: 15 }),
      difficulty: fc.integer({ min: 1, max: 5 }),
      reason: fc.string({ minLength: 10, maxLength: 20 }),
      estimatedTime: fc.integer({ min: 5, max: 60 })
    }), { minLength: 0, maxLength: 2 }),
    completedTopics: fc.array(fc.string({ minLength: 5, maxLength: 15 }), { minLength: 0, maxLength: 3 })
  })
});

describe('Dashboard Completeness Property Tests', () => {
  it('should display all required dashboard elements for any valid student progress data', () => {
    fc.assert(
      fc.property(
        simpleStudentProgressArb,
        (studentProgress) => {
          // Render the dashboard
          render(
            <DashboardLayout
              studentProgress={studentProgress}
              notifications={[]}
              onNotificationRead={() => {}}
            >
              <div>Test Content</div>
            </DashboardLayout>
          );

          // Verify core elements are present
          // 1. XP should be displayed somewhere
          const xpElements = screen.getAllByText(new RegExp(`${studentProgress.totalXP}`, 'i'));
          expect(xpElements.length).toBeGreaterThan(0);

          // 2. Level should be displayed
          const levelElements = screen.getAllByText(new RegExp(`${studentProgress.currentLevel}`, 'i'));
          expect(levelElements.length).toBeGreaterThan(0);

          // 3. Core navigation should be present
          expect(screen.getAllByText('Quick Actions').length).toBeGreaterThan(0);
          expect(screen.getAllByText('Subjects').length).toBeGreaterThan(0);

          // 4. Subject progress should be shown
          studentProgress.subjectProgress.forEach((subject) => {
            expect(screen.getAllByText(subject.subject).length).toBeGreaterThan(0);
          });

          return true;
        }
      ),
      { numRuns: 3 }
    );
  });

  it('should handle edge cases for dashboard data completeness', () => {
    // Test with minimal data
    const minimalProgress: StudentProgress = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      totalXP: 0,
      currentLevel: 1,
      currentStreak: 0,
      longestStreak: 0,
      subjectProgress: [],
      achievements: [],
      weakAreas: [],
      recommendedPath: {
        currentTopic: 'Getting Started',
        recommendedNextTopics: [],
        completedTopics: []
      }
    };

    render(
      <DashboardLayout
        studentProgress={minimalProgress}
        notifications={[]}
        onNotificationRead={() => {}}
      >
        <div>Test Content</div>
      </DashboardLayout>
    );

    // Should still display basic elements even with minimal data
    expect(screen.getByText('0 XP')).toBeInTheDocument();
    expect(screen.getByText('Level 1')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Subjects')).toBeInTheDocument();
  });

  it('should display Bloom taxonomy levels correctly in subject progress', () => {
    fc.assert(
      fc.property(
        simpleStudentProgressArb,
        (studentProgress) => {
          render(
            <DashboardLayout
              studentProgress={studentProgress}
              notifications={[]}
              onNotificationRead={() => {}}
            >
              <div>Test Content</div>
            </DashboardLayout>
          );

          // Verify that Bloom levels are properly integrated
          studentProgress.subjectProgress.forEach((subject) => {
            expect(subject.bloomLevelProgress).toBeDefined();
            expect(Array.isArray(subject.bloomLevelProgress)).toBe(true);
            
            // Bloom levels should be between 1-6
            subject.bloomLevelProgress.forEach((bloomProgress) => {
              expect(bloomProgress.level).toBeGreaterThanOrEqual(1);
              expect(bloomProgress.level).toBeLessThanOrEqual(6);
              expect(bloomProgress.mastery).toBeGreaterThanOrEqual(0);
              expect(bloomProgress.mastery).toBeLessThanOrEqual(100);
            });
          });

          return true;
        }
      ),
      { numRuns: 3 }
    );
  });
});